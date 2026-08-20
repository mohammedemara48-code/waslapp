import { compressImage } from "@/lib/utils";
import { INLINE_MEDIA_MAX, REMOTE_FILE_MAX_BYTES, REMOTE_VIDEO_MAX_SECONDS } from "./limits";

export type MediaConfig = {
  storage: "blob" | "s3" | "none";
  maxBytes: number;
  maxSeconds: number;
};

let cached: MediaConfig | null = null;

export async function getMediaConfig(): Promise<MediaConfig> {
  if (cached) return cached;
  try {
    const res = await fetch("/api/media/config");
    cached = (await res.json()) as MediaConfig;
  } catch {
    cached = { storage: "none", maxBytes: INLINE_MEDIA_MAX, maxSeconds: 30 };
  }
  return cached;
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

export async function storeMedia(file: File): Promise<{ name: string; type: string; data: string }> {
  const cfg = await getMediaConfig();
  if (file.size > cfg.maxBytes) {
    throw new Error(`الملف أكبر من ${(cfg.maxBytes / (1024 * 1024)).toFixed(0)} ميغابايت`);
  }
  if (cfg.storage === "blob") {
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(file.name || "media", file, {
      access: "public",
      handleUploadUrl: "/api/media/blob",
    });
    return { name: file.name, type: file.type || "application/octet-stream", data: blob.url };
  }
  if (cfg.storage === "s3") {
    const sign = await fetch("/api/media/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, type: file.type, size: file.size }),
    });
    if (!sign.ok) throw new Error("تعذر تجهيز رفع الملف");
    const { uploadUrl, publicUrl } = (await sign.json()) as { uploadUrl: string; publicUrl: string };
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) throw new Error("فشل رفع الملف");
    return { name: file.name, type: file.type || "application/octet-stream", data: publicUrl };
  }
  if (file.type.startsWith("image/")) {
    const data = await compressImage(file, 1280, 0.8);
    return { name: file.name, type: "image/jpeg", data };
  }
  const data = await readFileAsDataUrl(file);
  if (data.length > INLINE_MEDIA_MAX) {
    throw new Error(`بدون تخزين ملفات الحد ~3 ميغابايت. اربط Vercel Blob أو R2. الفيديو حتى ${REMOTE_VIDEO_MAX_SECONDS} ثانية بعد الربط.`);
  }
  return { name: file.name, type: file.type || "application/octet-stream", data };
}

export { REMOTE_FILE_MAX_BYTES, REMOTE_VIDEO_MAX_SECONDS };
