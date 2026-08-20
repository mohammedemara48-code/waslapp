export const INLINE_MEDIA_MAX = 4_000_000;
export const REMOTE_URL_MAX = 2000;
export const REMOTE_FILE_MAX_BYTES = 80 * 1024 * 1024;
export const REMOTE_VIDEO_MAX_SECONDS = 180;

export function isRemoteMediaUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

export function assertStoredMedia(value: string | null | undefined, label = "الملف"): string | null {
  if (!value) return null;
  if (isRemoteMediaUrl(value)) {
    if (value.length > REMOTE_URL_MAX) throw new Error(`${label} غير صالح`);
    return value;
  }
  if (value.length > INLINE_MEDIA_MAX) throw new Error(`${label} كبير للرفع بدون تخزين ملفات`);
  return value;
}
