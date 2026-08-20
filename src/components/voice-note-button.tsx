import { useEffect, useRef, useState } from "react";
import { Mic, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fileToAttachment } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function VoiceNoteButton({
  disabled,
  onReady,
}: {
  disabled?: boolean;
  onReady: (file: { name: string; type: string; data: string }) => void;
}) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [canceling, setCanceling] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number>(0);
  const cancelled = useRef(false);
  const startX = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const acRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      window.clearInterval(timer.current);
      cancelAnimationFrame(rafRef.current);
      recRef.current?.stream.getTracks().forEach((t) => t.stop());
      void acRef.current?.close();
    };
  }, []);

  function drawWave() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = canceling ? "oklch(0.72 0.16 25)" : "oklch(0.84 0.09 82)";
    const step = Math.max(1, Math.floor(data.length / 36));
    const barW = width / 36;
    for (let i = 0; i < 36; i++) {
      const v = data[i * step] ?? 128;
      const amp = Math.abs(v - 128) / 128;
      const h = Math.max(4, amp * height);
      ctx.fillRect(i * barW + 1, (height - h) / 2, barW - 2, h);
    }
    rafRef.current = requestAnimationFrame(drawWave);
  }

  async function start(x: number) {
    if (recording || disabled) return;
    cancelled.current = false;
    startX.current = x;
    setCanceling(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        window.clearInterval(timer.current);
        cancelAnimationFrame(rafRef.current);
        void acRef.current?.close();
        acRef.current = null;
        analyserRef.current = null;
        setRecording(false);
        setSeconds(0);
        if (cancelled.current) return;
        const blob = new Blob(chunks.current, { type: rec.mimeType || mime });
        if (blob.size < 1200) {
          toast.error(t.rec_short || "التسجيل قصير جداً");
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
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ac = new AC();
        acRef.current = ac;
        const src = ac.createMediaStreamSource(stream);
        const analyser = ac.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;
        drawWave();
      } catch {
        /* waveform optional */
      }
      if (navigator.vibrate) navigator.vibrate(18);
    } catch {
      toast.error("تعذر الوصول للميكروفون");
    }
  }

  function stop(cancel: boolean) {
    cancelled.current = cancel;
    recRef.current?.stop();
    recRef.current = null;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    void start(e.clientX);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!recording) return;
    const delta = Math.abs(e.clientX - startX.current);
    setCanceling(delta > 72);
  }

  function onPointerUp() {
    if (!recording) return;
    stop(canceling);
    setCanceling(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-full border border-border bg-elevated text-muted touch-none",
          recording && !canceling && "border-accent bg-accent text-accent-fg",
          recording && canceling && "border-danger bg-danger text-bg",
        )}
        aria-label={t.voice_note || "رسالة صوتية"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => recording && stop(true)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {recording && canceling ? <Trash2 className="size-4" /> : <Mic className="size-4" />}
      </button>
      {recording ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 px-3">
          <div
            className={cn(
              "mx-auto flex max-w-md items-center gap-3 rounded-full border px-4 py-2 shadow-glow",
              canceling ? "border-danger bg-danger/15" : "border-accent/50 bg-surface",
            )}
          >
            <span className="w-8 text-xs tabular-nums text-fg">{seconds}s</span>
            <canvas ref={canvasRef} width={180} height={28} className="h-7 flex-1" />
            <span className="text-[11px] text-muted">
              {canceling ? t.slide_cancel || "أفلت للإلغاء" : t.release_send || "اترك للإرسال"}
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
