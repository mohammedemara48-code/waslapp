import { useEffect } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { startCallTone, stopCallTone } from "@/lib/call-tone";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function IncomingCallScreen({
  name,
  kind,
  onAccept,
  onReject,
}: {
  name: string;
  kind: "audio" | "video";
  onAccept: () => void;
  onReject: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    startCallTone("in");
    return () => stopCallTone();
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-between bg-bg px-6 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mt-8 text-center">
        <p className="text-sm text-accent">{t.incoming_call}</p>
        <div className="mx-auto mt-8 grid size-28 place-items-center rounded-full border border-accent/50 bg-accent/15 text-accent shadow-glow">
          {kind === "video" ? <Video className="size-12" /> : <Phone className="size-12" />}
        </div>
        <h1 className="mt-6 font-display text-3xl">{name || t.incoming_call}</h1>
        <p className="mt-2 text-muted">{kind === "video" ? t.call_video : t.call_audio}</p>
      </div>
      <div className="flex w-full max-w-sm items-center justify-around pb-6">
        <button
          type="button"
          onClick={onReject}
          className={cn(
            "flex flex-col items-center gap-2 text-sm text-muted",
          )}
        >
          <span className="grid size-16 place-items-center rounded-full bg-danger text-bg">
            <PhoneOff className="size-7" />
          </span>
          {t.reject}
        </button>
        <button type="button" onClick={onAccept} className="flex flex-col items-center gap-2 text-sm text-muted">
          <span className="grid size-16 place-items-center rounded-full bg-ok text-accent-fg">
            {kind === "video" ? <Video className="size-7" /> : <Phone className="size-7" />}
          </span>
          {t.accept}
        </button>
      </div>
    </div>
  );
}
