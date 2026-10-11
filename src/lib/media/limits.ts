export const INLINE_MEDIA_MAX = 4_000_000;
export const REMOTE_URL_MAX = 2000;
export const REMOTE_FILE_MAX_BYTES = 80 * 1024 * 1024;
export const REMOTE_VIDEO_MAX_SECONDS = 180;

export function isRemoteMediaUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function assertStoredMedia(value: string | null | undefined, label = "الملف"): string | null {
  if (!value) return null;
  if (isRemoteMediaUrl(value)) {
    if (value.length > REMOTE_URL_MAX) throw new Error(`${label} غير صالح`);
    return value;
  }
  // Only inline base64 data URIs are allowed besides http(s); reject javascript:, etc.
  if (!/^data:[a-z0-9.+-]+\/[a-z0-9.+-]+(;[a-z0-9=._+-]+)*;base64,/i.test(value.slice(0, 200))) {
    throw new Error(`${label} غير صالح`);
  }
  if (/^data:(text\/html|image\/svg\+xml|application\/xhtml)/i.test(value)) {
    throw new Error(`${label} غير صالح`);
  }
  if (value.length > INLINE_MEDIA_MAX) throw new Error(`${label} كبير للرفع بدون تخزين ملفات`);
  return value;
}
