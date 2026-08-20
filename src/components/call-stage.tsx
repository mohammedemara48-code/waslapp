import { useEffect, useRef, useState } from "react";
import { Maximize2, Mic, MicOff, Minimize2, PhoneOff, PictureInPicture2, Video, VideoOff } from "lucide-react";
import type { RemoteMedia } from "@/lib/media/media-room";
import { startCallTone, stopCallTone } from "@/lib/call-tone";
import { boostPlayback } from "@/lib/media/boost";
import { useI18n } from "@/lib/i18n";
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
  videoRef,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  label: string;
  mirror?: boolean;
  fx?: string;
  fill?: boolean;
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
    <figure
      className={cn(
        "relative overflow-hidden rounded-xl border border-border-strong bg-elevated",
        fill ? "min-h-0 flex-1" : "aspect-video",
      )}
    >
      <video
        ref={elRef}
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
  ringOut = true,
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
}) {
  const [fx, setFx] = useState("none");
  const [mode, setMode] = useState<"dock" | "full" | "mini">("full");
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

  const controls = (
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
      <Button
        variant="secondary"
        size="icon"
        onClick={() => setMode((m) => (m === "full" ? "mini" : "full"))}
        aria-label={mode === "full" ? "تصغير" : "تكبير"}
      >
        {mode === "full" ? <Minimize2 /> : <Maximize2 />}
      </Button>
      <Button variant="secondary" size="icon" onClick={() => void enterNativePip()} aria-label="صورة داخل صورة">
        <PictureInPicture2 />
      </Button>
      <Button variant="danger" onClick={onHangup}>
        <PhoneOff />
        {t.hangup}
      </Button>
    </div>
  );

  const tiles = (
    <div
      className={cn(
        "grid min-h-0 gap-3",
        mode === "full" && "flex-1 grid-rows-1",
        remotes.length === 0 && "grid-cols-1",
        remotes.length >= 1 && mode === "full" && "grid-cols-1",
        remotes.length === 1 && mode !== "full" && "grid-cols-1 md:grid-cols-2",
        remotes.length >= 2 && mode !== "full" && "grid-cols-1 sm:grid-cols-2",
      )}
    >
      {mode !== "mini" ? (
        <VideoTile stream={localStream} muted label={t.you_label} mirror fill={mode === "full"} fx={kind === "video" ? fx : "none"} />
      ) : null}
      {remotes.length ? (
        remotes.map((remote, i) => (
          <VideoTile
            key={remote.peerId}
            stream={remote.stream}
            label={remote.name || t.you_label}
            fill={mode === "full"}
            videoRef={i === 0 ? remoteVideo : undefined}
          />
        ))
      ) : mode === "full" ? null : (
        <p className="text-center text-xs text-muted">{t.ringing}</p>
      )}
    </div>
  );

  if (mode === "mini") {
    return (
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] start-3 z-40 w-40 overflow-hidden rounded-xl border border-border-strong bg-surface shadow-glow">
        <button type="button" className="block w-full" onClick={() => setMode("full")} aria-label="توسيع المكالمة">
          {remotes[0] ? (
            <VideoTile stream={remotes[0].stream} label={remotes[0].name || "مكالمة"} videoRef={remoteVideo} />
          ) : (
            <VideoTile stream={localStream} muted label="مكالمة" mirror videoRef={remoteVideo} />
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
      <section className="fixed inset-0 z-50 flex flex-col bg-bg p-3 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium">{kind === "video" ? "مكالمة فيديو" : "مكالمة صوتية"}</h2>
          <p className="text-xs text-muted">{connected ? t.in_call : t.ringing}</p>
        </div>
        {kind === "video" ? (
          <div className="mb-2 flex flex-wrap gap-1">
            {STORY_FILTERS.map((f) => (
              <Button key={f.id} type="button" size="sm" variant={fx === f.id ? "default" : "secondary"} onClick={() => setFx(f.id)}>
                {f.label}
              </Button>
            ))}
          </div>
        ) : null}
        {tiles}
        <div className="mt-3">{controls}</div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-strong bg-surface p-4 shadow-glow">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">{kind === "video" ? "مكالمة فيديو" : "مكالمة صوتية"}</h2>
        <p className="text-xs text-muted">{connected ? t.in_call : t.ringing}</p>
      </div>
      {tiles}
      {controls}
    </section>
  );
}
