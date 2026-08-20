import { useState } from "react";
import { Eye, PhoneMissed, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { consumeViewOnce } from "@/lib/chat/server";
import { MediaVideo } from "@/components/media-video";
import { Button } from "@/components/ui/button";
import type { MessageRow } from "@/lib/chat/types";

export function isOnceType(type: string | null | undefined) {
  return Boolean(type?.startsWith("once:"));
}

export function rawMime(type: string | null | undefined) {
  if (!type) return "";
  return type.startsWith("once:") ? type.slice(5) : type;
}

export function CallEventLine({ msg }: { msg: MessageRow }) {
  const kind = msg.attachment_name === "video" ? "فيديو" : "صوت";
  const status = msg.attachment_data || msg.body;
  const missed = status === "missed" || status === "no-answer" || status === "rejected";
  const label =
    status === "rejected"
      ? `مكالمة ${kind} مرفوضة`
      : status === "no-answer"
        ? `مكالمة ${kind} · لم يرد`
        : status === "ended"
          ? `مكالمة ${kind} انتهت`
          : `مكالمة ${kind} فائتة`;
  return (
    <p className="flex items-center gap-2 text-xs text-muted">
      {missed ? <PhoneMissed className="size-3.5 text-danger" /> : <PhoneOff className="size-3.5" />}
      {label}
    </p>
  );
}

export function MessageMedia({
  msg,
  mine,
}: {
  msg: MessageRow;
  mine?: boolean;
}) {
  const type = msg.attachment_type;
  const data = msg.attachment_data;
  if (!type || type === "sticker") return null;
  if (type === "call-event") return <CallEventLine msg={msg} />;

  const once = isOnceType(type);
  const mime = rawMime(type);
  if (once) {
    return <ViewOnceMedia msg={msg} mime={mime} mine={mine} />;
  }
  if (!data) return null;
  if (mime.startsWith("image/")) {
    return <img src={data} alt={msg.attachment_name ?? ""} className="mt-2 max-h-56 rounded-md object-cover" />;
  }
  if (mime.startsWith("video/")) {
    return <MediaVideo src={data} className="mt-2 max-h-56 w-full rounded-md" />;
  }
  if (mime.startsWith("audio/")) {
    return <audio src={data} controls className="mt-2 w-full max-w-xs" />;
  }
  return (
    <a href={data} download={msg.attachment_name ?? "file"} className="mt-2 block text-xs underline underline-offset-4">
      {msg.attachment_name ?? "ملف"}
    </a>
  );
}

function ViewOnceMedia({
  msg,
  mime,
  mine,
}: {
  msg: MessageRow;
  mime: string;
  mine?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(!msg.attachment_data);

  async function close() {
    setOpen(false);
    if (gone || !msg.attachment_data) return;
    try {
      await consumeViewOnce({ data: msg.id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر إغلاق المرفق");
    }
    setGone(true);
  }

  if (gone || !msg.attachment_data) {
    return <p className="mt-2 text-xs text-subtle">مرفق لمرة واحدة · انتهت صلاحيته</p>;
  }

  return (
    <>
      <button
        type="button"
        className="mt-2 flex items-center gap-2 rounded-md border border-border bg-bg/40 px-3 py-2 text-xs"
        onClick={() => setOpen(true)}
      >
        <Eye className="size-3.5" />
        {mine ? "عرض المرفق لمرة واحدة" : "عرض مرة واحدة ثم يختفي"}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/95 p-4" onClick={() => void close()}>
          <div className="max-h-[90dvh] w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            {mime.startsWith("image/") ? (
              <img src={msg.attachment_data} alt="" className="max-h-[80dvh] w-full rounded-xl object-contain" />
            ) : mime.startsWith("video/") ? (
              <MediaVideo src={msg.attachment_data} className="max-h-[80dvh] w-full rounded-xl" />
            ) : mime.startsWith("audio/") ? (
              <audio src={msg.attachment_data} controls autoPlay className="w-full" />
            ) : null}
            <Button className="mt-3 w-full" variant="secondary" onClick={() => void close()}>
              إغلاق وإنهاء الصلاحية
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
