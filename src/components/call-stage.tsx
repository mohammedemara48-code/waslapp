import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import type { RemoteMedia } from "@/lib/media/media-room";
import { startCallTone, stopCallTone } from "@/lib/call-tone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STORY_FILTERS, filterClass } from "@/lib/story-style";

function VideoTile({
  stream,
  muted,
  label,
  mirror,
  large,
  fx,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  label: string;
  mirror?: boolean;
  large?: boolean;
  fx?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
  }, [stream]);
  const hasVideo = Boolean(stream?.getVideoTracks().some((t) => t.enabled && t.readyState === "live"));

  return (
    <figure className="relative overflow-hidden rounded-xl border border-border-strong bg-elevated aspect-video">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={cn("size-full object-cover", filterClass(fx), mirror && "-scale-x-100", !hasVideo && "opacity-0")}
      />
      {!hasVideo ? (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted">{label}</div>
      ) : null}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/80 to-transparent px-3 py-2 text-xs">
        {label}
      </figcaption>
    </figure>
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
}: {
  kind: "audio" | "video";
  localStream: MediaStream | null;
  remotes: RemoteMedia[];
  muted: boolean;
  cameraOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onHangup: () => void;
}) {
  const [fx, setFx] = useState("none");
  const connected = remotes.length > 0;

  useEffect(() => {
    if (connected) {
      stopCallTone();
      return;
    }
    startCallTone("out");
    return () => stopCallTone();
  }, [connected]);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-strong bg-surface p-4 shadow-glow">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">{kind === "video" ? "مكالمة فيديو" : "مكالمة صوتية"}</h2>
        <p className="text-xs text-muted">
          {connected ? `${remotes.length + 1} في المكالمة` : "يرن… بانتظار الرد"}
        </p>
      </div>

      {kind === "video" ? (
        <div className="flex flex-wrap gap-1">
          {STORY_FILTERS.map((f) => (
            <Button key={f.id} type="button" size="sm" variant={fx === f.id ? "default" : "secondary"} onClick={() => setFx(f.id)}>
              {f.label}
            </Button>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-3",
          remotes.length === 0 && "grid-cols-1",
          remotes.length === 1 && "grid-cols-1 md:grid-cols-2",
          remotes.length >= 2 && "grid-cols-1 sm:grid-cols-2",
        )}
      >
        <VideoTile stream={localStream} muted label="أنت" mirror large fx={kind === "video" ? fx : "none"} />
        {remotes.map((remote) => (
          <VideoTile key={remote.peerId} stream={remote.stream} label={remote.name || "مشارك"} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" size="icon" onClick={onToggleMute} aria-label={muted ? "إلغاء الكتم" : "كتم"}>
          {muted ? <MicOff /> : <Mic />}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={onToggleCamera}
          aria-label={cameraOn ? "إيقاف الكاميرا" : "تشغيل الكاميرا"}
        >
          {cameraOn ? <Video /> : <VideoOff />}
        </Button>
        <Button variant="danger" onClick={onHangup}>
          <PhoneOff />
          إنهاء
        </Button>
      </div>
    </section>
  );
}