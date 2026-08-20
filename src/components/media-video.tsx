import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function guessType(src: string): string {
  if (src.startsWith("data:")) {
    const m = src.slice(5).split(";", 1)[0];
    if (m?.startsWith("video/")) return m;
  }
  return "video/mp4";
}

export function MediaVideo({
  src,
  className,
  onEnded,
}: {
  src: string;
  className?: string;
  onEnded?: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setFailed(false);
    setBlobUrl(null);
    void (async () => {
      try {
        const res = await fetch(src);
        const raw = await res.blob();
        const type = raw.type.startsWith("video/") ? raw.type : guessType(src);
        const blob = raw.type.startsWith("video/") ? raw : new Blob([raw], { type });
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setBlobUrl(src);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (failed) {
    return (
      <p className="rounded-lg bg-elevated px-3 py-8 text-center text-sm text-muted">
        تعذر تشغيل هذا المقطع. انشر قصة جديدة بعد التحديث.
      </p>
    );
  }
  if (!blobUrl) {
    return <div className={cn("grid h-40 place-items-center text-sm text-muted", className)}>جارٍ التحميل…</div>;
  }
  return (
    <video
      src={blobUrl}
      className={className}
      autoPlay
      playsInline
      controls
      preload="auto"
      onEnded={onEnded}
      onError={() => setFailed(true)}
    />
  );
}
