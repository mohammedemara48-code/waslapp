import { useEffect, useRef, useState } from "react";
import { MediaRoom, type RemoteMedia } from "./media-room";
import type { PeerInfo } from "@/lib/multiplayer";

export function useMediaRoom(opts: {
  room: string;
  selfId: string;
  name: string;
  enabled: boolean;
  stream: MediaStream | null;
}) {
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [remotes, setRemotes] = useState<RemoteMedia[]>([]);
  const [joined, setJoined] = useState(false);
  const roomRef = useRef<MediaRoom | null>(null);

  useEffect(() => {
    if (!opts.enabled) return;
    const media = new MediaRoom({
      room: opts.room,
      selfId: opts.selfId,
      name: opts.name,
      onPeersChanged: setPeers,
      onRemoteStreams: setRemotes,
      onConnected: () => setJoined(true),
    });
    roomRef.current = media;
    void media.join();
    return () => {
      roomRef.current = null;
      media.close();
      setJoined(false);
      setPeers([]);
      setRemotes([]);
    };
  }, [opts.enabled, opts.room, opts.selfId, opts.name]);

  useEffect(() => {
    void roomRef.current?.setLocalStream(opts.stream);
  }, [opts.stream, joined]);

  return { peers, remotes, joined };
}
