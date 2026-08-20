import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { REMOTE_FILE_MAX_BYTES } from "./limits";

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

export function blobStorageOn(): boolean {
  return Boolean(env("BLOB_READ_WRITE_TOKEN"));
}

export function s3StorageOn(): boolean {
  return Boolean(env("S3_BUCKET") && env("S3_ACCESS_KEY_ID") && env("S3_SECRET_ACCESS_KEY"));
}

export function remoteStorageKind(): "blob" | "s3" | "none" {
  if (blobStorageOn()) return "blob";
  if (s3StorageOn()) return "s3";
  return "none";
}

function s3Client(): S3Client {
  const region = env("S3_REGION") ?? "auto";
  const endpoint = env("S3_ENDPOINT");
  return new S3Client({
    region,
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: env("S3_ACCESS_KEY_ID") as string,
      secretAccessKey: env("S3_SECRET_ACCESS_KEY") as string,
    },
  });
}

export async function presignS3Upload(input: { filename: string; type: string; size: number }) {
  if (input.size > REMOTE_FILE_MAX_BYTES) throw new Error("الملف أكبر من 80 ميغابايت");
  const bucket = env("S3_BUCKET");
  if (!bucket) throw new Error("S3_BUCKET غير مضبوط");
  const safe = input.filename.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "file";
  const key = `wasl/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: input.type || "application/octet-stream",
    ContentLength: input.size,
  });
  const uploadUrl = await getSignedUrl(s3Client(), command, { expiresIn: 120 });
  const base = (env("S3_PUBLIC_BASE") ?? "").replace(/\/+$/, "");
  const publicUrl = base
    ? `${base}/${key}`
    : env("S3_ENDPOINT")
      ? `${env("S3_ENDPOINT")!.replace(/\/+$/, "")}/${bucket}/${key}`
      : `https://${bucket}.s3.${env("S3_REGION") ?? "us-east-1"}.amazonaws.com/${key}`;
  return { uploadUrl, publicUrl, key };
}
