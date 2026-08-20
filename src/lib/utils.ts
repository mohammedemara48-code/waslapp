import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "؟";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]!).join("");
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ar", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return "اليوم";
  return new Intl.DateTimeFormat("ar", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function slugifyRoom(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "r";
  for (let i = 0; i < 10; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function peerIdFromUser(userId: string, session = ""): string {
  const clean = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20) || "anon";
  const suffix = session.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 6);
  return `u${clean}${suffix}`.slice(0, 64);
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function phoneToEmail(phone: string): string {
  const digits = digitsOnly(phone);
  return `${digits}@phone.wasl.app`;
}

export function emailToPhone(email: string): string | null {
  const m = email.trim().toLowerCase().match(/^(\d+)@phone\.wasl\.app$/);
  return m ? m[1]! : null;
}

export function profileAvatar(profile: { avatar_url?: string | null } | null | undefined): string | null {
  return profile?.avatar_url ?? null;
}

export async function compressImage(file: File, maxDim = 960, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذر معالجة الصورة");
  ctx.drawImage(bitmap, 0, 0, w, h);
  const data = canvas.toDataURL("image/jpeg", quality);
  if (data.length > 900_000) throw new Error("الصورة كبيرة بعد الضغط");
  return data;
}

export const VIDEO_MAX_SECONDS = 15;

function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export async function compressVideo(file: File, maxSeconds = VIDEO_MAX_SECONDS): Promise<string> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("تعذر قراءة الفيديو"));
    });
    const mime = pickRecorderMime();
    const clip = video as HTMLVideoElement & { captureStream?: (fps?: number) => MediaStream };
    if (!mime || typeof clip.captureStream !== "function") {
      if (file.size > 2_400_000) {
        throw new Error(`اختَر مقطعاً حتى ${maxSeconds} ثانية بجودة أقل`);
      }
      return readFileAsDataUrl(file);
    }
    await video.play().catch(() => {});
    video.pause();
    video.currentTime = 0;
    const stream = clip.captureStream();
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 450_000, audioBitsPerSecond: 48_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise<Blob>((resolve, reject) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || mime }));
      rec.onerror = () => reject(new Error("تعذر ضغط الفيديو"));
    });
    rec.start(200);
    await video.play();
    await new Promise<void>((resolve) => {
      const cut = window.setTimeout(() => resolve(), maxSeconds * 1000);
      video.onended = () => {
        window.clearTimeout(cut);
        resolve();
      };
    });
    video.pause();
    if (rec.state !== "inactive") rec.stop();
    stream.getTracks().forEach((track) => track.stop());
    const blob = await stopped;
    if (blob.size < 80) throw new Error("تعذر تجهيز المقطع");
    const data = await blobToDataUrl(blob);
    if (data.length > 3_400_000) {
      throw new Error(`المقطع ما زال كبيراً بعد الضغط. اختصر لأقل من ${maxSeconds} ثانية`);
    }
    return data;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(blob);
  });
}

export async function fileToAttachment(file: File): Promise<{
  name: string;
  type: string;
  data: string;
}> {
  if (file.type.startsWith("image/")) {
    const data = await compressImage(file, 1280, 0.8);
    return { name: file.name, type: "image/jpeg", data };
  }
  if (file.type.startsWith("video/")) {
    const data = await compressVideo(file);
    const type = data.startsWith("data:video/mp4") ? "video/mp4" : "video/webm";
    return { name: file.name.replace(/\.[^.]+$/, "") + (type === "video/mp4" ? ".mp4" : ".webm"), type, data };
  }
  if (file.size > 1_400_000) throw new Error("الحد الأقصى للمرفق حوالي 1 ميغابايت");
  const data = await readFileAsDataUrl(file);
  if (data.length > 1_800_000) throw new Error("الملف كبير جداً");
  return { name: file.name, type: file.type || "application/octet-stream", data };
}
