import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Mic, MicOff, Minimize2, PhoneOff, PictureInPicture2, UserPlus, Video, VideoOff } from "lucide-react";
import type { RemoteMedia } from "@/lib/media/media-room";
import { startCallTone, stopCallTone } from "@/lib/call-tone";
import { boostPlayback } from "@/lib/media/boost";
import { useI18n } from "@/lib/i18n";
import { CallInviteBar } from "@/components/call-invite-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STORY_FILTERS, filterClass } from "@/lib/story-style";

function VideoTile({
  stream,
  muted,
  label,
  mirror,
  fx,
  fill,
  portrait,
  videoRef,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  label: string;
  mirror?: boolean;
  fx?: string;
  fill?: boolean;
  portrait?: boolean;
  videoRef?: React.Ref<HTMLVideoElement>;
}) {
  const elRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.srcObject = stream;
    el.volume = 1;
    if (videoRef && typeof videoRef !== "function") {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    }
    const stopBoost = muted ? undefined : boostPlayback(el, stream, true);
    return () => {
      stopBoost?.();
    };
  }, [stream, videoRef, muted]);
  const hasVideo = Boolean(stream?.getVideoTracks().some((t) => t.enabled && t.readyState === "live"));

  return (
    <figure className={cn("relative overflow-hidden bg-elevated", fill ? "size-full" : portrait ? "aspect-[3/4]" : "aspect-video")}>
      <video
        ref={elRef}
        autoPlay
        playsInline
        muted={muted}
        className={cn(
          "size-full",
          portrait || fill ? "object-cover object-center" : "object-cover",
          filterClass(fx),
          mirror && "-scale-x-100",
          !hasVideo && "opacity-0",
        )}
      />
      {!hasVideo ? (
        <div className="absolute inset-0 grid place-items-center px-2 text-center text-sm text-muted">{label}</div>
      ) : null}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/80 to-transparent px-2 py-1.5 text-[11px]">
        {label}
      </figcaption>
    </figure>
  );
}

function DraggablePip({
  children,
  index = 0,
}: {
  children: ReactNode;
  index?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  useEffect(() => {
    function place() {
      const el = ref.current;
      if (!el) return;
      const w = el.offsetWidth || 140;
      const h = el.offsetHeight || 190;
      const gap = 12;
      const x = Math.max(gap, window.innerWidth - w - gap);
      const y = Math.max(gap, window.innerHeight - h - 108 - index * (h + 10));
      setPos({ x, y });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [index]);

  function clamp(next: { x: number; y: number }) {
    const el = ref.current;
    const w = el?.offsetWidth ?? 140;
    const h = el?.offsetHeight ?? 190;
    return {
      x: Math.min(window.innerWidth - w - 8, Math.max(8, next.x)),
      y: Math.min(window.innerHeight - h - 8, Math.max(8, next.y)),
    };
  }

  return (
    <div
      ref={ref}
      className="absolute z-20 w-[min(42vw,11.5rem)] touch-none overflow-hidden rounded-xl border border-border-strong bg-bg shadow-glow"
      style={pos ? { left: pos.x, top: pos.y } : { right: 12, bottom: 108 }}
      onPointerDown={(e) => {
        if (!pos) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const next = clamp({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
        if (Math.abs(next.x - (pos?.x ?? 0)) + Math.abs(next.y - (pos?.y ?? 0)) > 6) drag.current.moved = true;
        setPos(next);
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
    >
      {children}
    </div>
  );
}

export function CallStage({
  kind,
  localStream,
  remotes,
  muted,
  cameraOn,
  onToggleMute,
  onToggleCamera,
  onHangup,
  ringOut = true,
  slug,
}: {
  kind: "audio" | "video";
  localStream: MediaStream | null;
  remotes: RemoteMedia[];
  muted: boolean;
  cameraOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onHangup: () => void;
  ringOut?: boolean;
  slug?: string;
}) {
  const [fx, setFx] = useState("none");
  const [mode, setMode] = useState<"dock" | "full" | "mini">("full");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | "local" | null>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const connected = remotes.length > 0;
  const { t } = useI18n();

  useEffect(() => {
    if (connected) {
      stopCallTone();
      return;
    }
    if (!ringOut) {
      stopCallTone();
      return;
    }
    startCallTone("out");
    return () => stopCallTone();
  }, [connected, ringOut]);

  useEffect(() => {
    function onHide() {
      if (document.hidden) void enterNativePip();
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  async function enterNativePip() {
    const el = remoteVideo.current;
    if (!el || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement !== el) await el.requestPictureInPicture();
    } catch {
      /* ignore */
    }
  }

  const focusedRemote = focusId && focusId !== "local" ? remotes.find((r) => r.peerId === focusId) : remotes[0];
  const mainIsLocal = !connected || focusId === "local";
  const pipRemotes = remotes.filter((r) => (mainIsLocal ? true : r.peerId !== focusedRemote?.peerId));

  const controls = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button variant="secondary" size="icon" className="rounded-full" onClick={onToggleMute} aria-label={muted ? "إلغاء الكتم" : "كتم"}>
        {muted ? <MicOff /> : <Mic />}
      </Button>
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full"
        onClick={onToggleCamera}
        aria-label={cameraOn ? "إيقاف الكاميرا" : "تشغيل الكاميرا"}
      >
        {cameraOn ? <Video /> : <VideoOff />}
      </Button>
      {slug ? (
        <Button
          variant={inviteOpen ? "default" : "secondary"}
          size="icon"
          className="rounded-full"
          onClick={() => setInviteOpen((v) => !v)}
          aria-label={t.invite_to_call}
        >
          <UserPlus />
        </Button>
      ) : null}
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full"
        onClick={() => setMode((m) => (m === "full" ? "mini" : "full"))}
        aria-label={mode === "full" ? "تصغير" : "تكبير"}
      >
        {mode === "full" ? <Minimize2 /> : <Maximize2 />}
      </Button>
      <Button variant="secondary" size="icon" className="rounded-full" onClick={() => void enterNativePip()} aria-label="صورة داخل صورة">
        <PictureInPicture2 />
      </Button>
      <Button variant="danger" className="rounded-full" onClick={onHangup}>
        <PhoneOff />
        {t.hangup}
      </Button>
    </div>
  );

  if (mode === "mini") {
    return (
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] start-3 z-40 w-36 overflow-hidden rounded-xl border border-border-strong bg-surface shadow-glow">
        <button type="button" className="block w-full" onClick={() => setMode("full")} aria-label="توسيع المكالمة">
          {remotes[0] ? (
            <VideoTile stream={remotes[0].stream} label={remotes[0].name || "مكالمة"} portrait videoRef={remoteVideo} />
          ) : (
            <VideoTile stream={localStream} muted label="مكالمة" mirror portrait videoRef={remoteVideo} />
          )}
        </button>
        <div className="flex justify-center gap-1 p-1.5">
          <Button variant="secondary" size="icon" className="size-8" onClick={() => setMode("full")} aria-label="تكبير">
            <Maximize2 className="size-3.5" />
          </Button>
          <Button variant="danger" size="icon" className="size-8" onClick={onHangup} aria-label="إنهاء">
            <PhoneOff className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "full") {
    return (
      <section className="fixed inset-0 z-50 bg-bg">
        <div className="absolute inset-0">
          {mainIsLocal ? (
            <VideoTile stream={localStream} muted label={connected ? t.you_label : t.ringing} mirror fill portrait fx={kind === "video" ? fx : "none"} />
          ) : (
            <VideoTile
              stream={focusedRemote?.stream ?? null}
              label={focusedRemote?.name || t.in_call}
              fill
              portrait
              videoRef={remoteVideo}
            />
          )}
        </div>

        {connected && !mainIsLocal ? (
          <DraggablePip index={0}>
            <button type="button" className="block w-full" onClick={() => setFocusId("local")} aria-label={t.you_label}>
              <VideoTile stream={localStream} muted label={t.you_label} mirror portrait fx={kind === "video" ? fx : "none"} />
            </button>
          </DraggablePip>
        ) : null}
        {pipRemotes.map((remote, i) => (
          <DraggablePip key={remote.peerId} index={mainIsLocal ? i : i + 1}>
            <button type="button" className="block w-full" onClick={() => setFocusId(remote.peerId)} aria-label={remote.name}>
              <VideoTile stream={remote.stream} label={remote.name} portrait videoRef={i === 0 && mainIsLocal ? remoteVideo : undefined} />
            </button>
          </DraggablePip>
        ))}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <p className="pointer-events-auto rounded-full bg-bg/60 px-3 py-1 text-xs">
            {kind === "video" ? t.call_video : t.call_audio} · {connected ? t.in_call : t.ringing}
          </p>
        </div>

        {kind === "video" ? (
          <div className="absolute inset-x-0 top-12 flex flex-wrap justify-center gap-1 px-3">
            {STORY_FILTERS.map((f) => (
              <Button key={f.id} type="button" size="sm" variant={fx === f.id ? "default" : "secondary"} onClick={() => setFx(f.id)}>
                {f.label}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 space-y-3 bg-gradient-to-t from-bg via-bg/80 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
          {inviteOpen && slug ? <CallInviteBar slug={slug} kind={kind} /> : null}
          {controls}
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-strong bg-surface p-4 shadow-glow">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">{kind === "video" ? t.call_video : t.call_audio}</h2>
        <p className="text-xs text-muted">{connected ? t.in_call : t.ringing}</p>
      </div>
      <VideoTile stream={localStream} muted label={t.you_label} mirror portrait />
      {controls}
    </section>
  );
}
