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

export function formatLastSeen(iso: string | null | undefined, online?: boolean): string {
  if (online) return "متصل الآن";
  if (!iso) return "غير متصل";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "غير متصل";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 2) return "ظهر للتو";
  if (mins < 60) return `آخر ظهور منذ ${mins} د`;
  if (mins < 24 * 60) return `آخر ظهور منذ ${Math.round(mins / 60)} س`;
  return `آخر ظهور ${formatDay(iso)}`;
}

export function inviteUrl(waslNo: number | null | undefined): string {
  if (!waslNo || typeof window === "undefined") return "";
  return `${window.location.origin}/n/${waslNo}`;
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

export function formatWaslNo(n: number | null | undefined): string {
  if (!n) return "";
  return String(n);
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

export const VIDEO_MAX_SECONDS = 180;

export async function fileToAttachment(file: File): Promise<{
  name: string;
  type: string;
  data: string;
}> {
  const { storeMedia } = await import("@/lib/media/client");
  return storeMedia(file);
}
