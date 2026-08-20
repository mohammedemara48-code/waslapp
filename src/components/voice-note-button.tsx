import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fileToAttachment } from "@/lib/utils";

export function VoiceNoteButton({
  disabled,
  onReady,
}: {
  disabled?: boolean;
  onReady: (file: { name: string; type: string; data: string }) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number>(0);

  useEffect(() => {
    return () => {
      window.clearInterval(timer.current);
      recRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function toggle() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        window.clearInterval(timer.current);
        setRecording(false);
        const blob = new Blob(chunks.current, { type: rec.mimeType || mime });
        if (blob.size < 800) {
          toast.error("التسجيل قصير جداً");
          return;
        }
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        void fileToAttachment(file)
          .then(onReady)
          .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر رفع الصوت"));
      };
      recRef.current = rec;
      rec.start();
      setSeconds(0);
      setRecording(true);
      timer.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s >= 59) rec.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error("تعذر الوصول للميكروفون");
    }
  }

  return (
    <Button
      type="button"
      variant={recording ? "danger" : "secondary"}
      size="icon"
      disabled={disabled}
      onClick={() => void toggle()}
      aria-label={recording ? "إيقاف وإرسال" : "رسالة صوتية"}
    >
      {recording ? (
        <span className="text-[10px] font-medium">{seconds}s</span>
      ) : (
        <Mic />
      )}
      {recording ? <Square className="hidden" /> : null}
    </Button>
  );
}
