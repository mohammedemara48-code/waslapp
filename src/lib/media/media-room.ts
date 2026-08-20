import { defaultIceServers, type PeerInfo, type RtcPollResponse, type SignalKind } from "@/lib/multiplayer";

export type RemoteMedia = {
  peerId: string;
  name: string;
  stream: MediaStream;
};

export type MediaRoomOptions = {
  room: string;
  selfId: string;
  name?: string;
  onPeersChanged?: (peers: PeerInfo[]) => void;
  onRemoteStreams?: (streams: RemoteMedia[]) => void;
  onConnected?: () => void;
};

type Slot = {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingCandidates: RTCIceCandidateInit[];
  info: PeerInfo;
};

/**
 * Full-mesh WebRTC audio/video. Signaling reuses /api/rtc.
 * Local tracks are added after join; renegotiation is automatic.
 */
export class MediaRoom {
  private readonly opts: MediaRoomOptions;
  private readonly peers = new Map<string, Slot>();
  private readonly remotes = new Map<string, RemoteMedia>();
  private readonly signalQueues = new Map<string, Promise<void>>();
  private localStream: MediaStream | null = null;
  private cursor = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private everPolled = false;

  constructor(opts: MediaRoomOptions) {
    this.opts = opts;
  }

  async join(): Promise<void> {
    try {
      await this.pollOnce();
    } catch {
      /* retry via loop */
    }
    if (this.closed) return;
    this.schedulePoll(400);
  }

  close(): void {
    this.closed = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    for (const slot of this.peers.values()) slot.pc.close();
    this.peers.clear();
    this.remotes.clear();
    void fetch("/api/rtc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "leave", room: this.opts.room, peer: this.opts.selfId }),
      keepalive: true,
    }).catch(() => {});
  }

  async setLocalStream(stream: MediaStream | null): Promise<void> {
    this.localStream = stream;
    for (const slot of this.peers.values()) {
      await this.syncTracks(slot);
    }
  }

  private async syncTracks(slot: Slot): Promise<void> {
    const stream = this.localStream;
    const senders = slot.pc.getSenders();
    const kinds: Array<"audio" | "video"> = ["audio", "video"];
    for (const kind of kinds) {
      const track = stream?.getTracks().find((t) => t.kind === kind) ?? null;
      const existing = senders.find((s) => s.track?.kind === kind);
      if (existing) {
        try {
          await existing.replaceTrack(track);
        } catch {
          /* ignore */
        }
      } else if (track && stream) {
        try {
          slot.pc.addTrack(track, stream);
        } catch {
          /* already added */
        }
      }
    }
  }

  private schedulePoll(delay: number): void {
    if (this.closed) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => void this.poll(), delay);
  }

  private async pollOnce(): Promise<void> {
    const params = new URLSearchParams({
      room: this.opts.room,
      peer: this.opts.selfId,
      name: this.opts.name ?? "",
      since: String(this.cursor),
    });
    const res = await fetch(`/api/rtc?${params}`);
    if (this.closed) return;
    if (!res.ok) throw new Error(`signaling poll failed: ${res.status}`);
    const body = (await res.json()) as RtcPollResponse;
    if (this.closed) return;
    if (!this.everPolled) {
      this.everPolled = true;
      this.opts.onConnected?.();
    }
    this.reconcile(body.peers);
    const roster = new Set(body.peers.map((p) => p.id));
    for (const sig of body.signals) {
      this.cursor = Math.max(this.cursor, sig.id);
      await this.onSignal(sig.from, sig.kind, sig.payload, roster);
      if (this.closed) return;
    }
  }

  private async poll(): Promise<void> {
    if (this.closed) return;
    try {
      await this.pollOnce();
    } catch {
      /* transient */
    }
    const connecting = [...this.peers.values()].some((s) => s.info.connectionState !== "connected");
    this.schedulePoll(connecting ? 400 : 2000);
  }

  private reconcile(peers: { id: string; name: string }[]): void {
    const alive = new Set(peers.map((p) => p.id));
    for (const p of peers) {
      if (p.id === this.opts.selfId) continue;
      const existing = this.peers.get(p.id);
      if (existing) existing.info.name = p.name;
      else this.connectTo(p.id, p.name, this.opts.selfId > p.id);
    }
    for (const [id, slot] of this.peers) {
      if (!alive.has(id)) {
        slot.pc.close();
        this.peers.delete(id);
        this.remotes.delete(id);
      }
    }
    this.emit();
  }

  private connectTo(peerId: string, name: string, initiator: boolean): Slot | null {
    if (this.closed) return null;
    const pc = new RTCPeerConnection({ iceServers: defaultIceServers() });
    const slot: Slot = {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      pendingCandidates: [],
      info: {
        id: peerId,
        name,
        connectionState: pc.connectionState,
        candidateType: null,
        rttMs: null,
      },
    };
    this.peers.set(peerId, slot);

    pc.onicecandidate = (e) => {
      if (e.candidate) void this.sendSignal(peerId, "ice", e.candidate.toJSON());
    };
    pc.onconnectionstatechange = () => {
      slot.info.connectionState = pc.connectionState;
      this.emit();
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      this.remotes.set(peerId, { peerId, name: slot.info.name, stream });
      this.emit();
    };
    pc.onnegotiationneeded = async () => {
      try {
        slot.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) {
          await this.sendSignal(peerId, "offer", pc.localDescription.toJSON());
        }
      } catch {
        /* next cycle */
      } finally {
        slot.makingOffer = false;
      }
    };

    if (initiator) {
      pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.addTransceiver("video", { direction: "sendrecv" });
    }
    void this.syncTracks(slot);
    return slot;
  }

  private async onSignal(
    from: string,
    kind: SignalKind,
    payload: unknown,
    roster: Set<string>,
  ): Promise<void> {
    if (this.closed) return;
    let slot = this.peers.get(from);
    if (!slot) {
      if (!roster.has(from)) return;
      const created = this.connectTo(from, "", false);
      if (!created) return;
      slot = created;
    }
    const polite = this.opts.selfId < from;
    try {
      if (kind === "offer" || kind === "answer") {
        const description = payload as RTCSessionDescriptionInit;
        const collision =
          kind === "offer" && (slot.makingOffer || slot.pc.signalingState !== "stable");
        slot.ignoreOffer = !polite && collision;
        if (slot.ignoreOffer) return;
        await slot.pc.setRemoteDescription(description);
        while (slot.pendingCandidates.length) {
          const c = slot.pendingCandidates.shift()!;
          try {
            await slot.pc.addIceCandidate(c);
          } catch {
            /* ignore */
          }
        }
        if (kind === "offer") {
          await this.syncTracks(slot);
          await slot.pc.setLocalDescription();
          if (slot.pc.localDescription) {
            await this.sendSignal(from, "answer", slot.pc.localDescription.toJSON());
          }
        }
      } else if (kind === "ice") {
        const candidate = payload as RTCIceCandidateInit;
        if (!slot.pc.remoteDescription) {
          slot.pendingCandidates.push(candidate);
          return;
        }
        try {
          await slot.pc.addIceCandidate(candidate);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* next offer */
    }
  }

  private sendSignal(to: string, kind: SignalKind, payload: unknown): Promise<void> {
    const prev = this.signalQueues.get(to) ?? Promise.resolve();
    const next = prev.then(() => this.postSignal(to, kind, payload));
    this.signalQueues.set(to, next.catch(() => {}));
    return next;
  }

  private async postSignal(to: string, kind: SignalKind, payload: unknown): Promise<void> {
    try {
      await fetch("/api/rtc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "signal",
          room: this.opts.room,
          from: this.opts.selfId,
          to,
          kind,
          payload,
        }),
      });
    } catch {
      /* retry via next offer */
    }
  }

  private emit(): void {
    this.opts.onPeersChanged?.([...this.peers.values()].map((s) => ({ ...s.info })));
    this.opts.onRemoteStreams?.([...this.remotes.values()].map((r) => ({
      ...r,
      name: this.peers.get(r.peerId)?.info.name || r.name,
    })));
  }
}
