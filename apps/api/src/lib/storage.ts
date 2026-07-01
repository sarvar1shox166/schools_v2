import { createReadStream as fsReadStream, createWriteStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as s3GetSignedUrl } from "@aws-sdk/s3-request-presigner";

const LOCAL_UPLOADS = path.resolve(process.cwd(), "uploads");

const USE_S3 = Boolean(
  process.env.AWS_S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
);

let s3: S3Client | null = null;
if (USE_S3) {
  s3 = new S3Client({
    region: process.env.AWS_REGION ?? "eu-central-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET = process.env.AWS_S3_BUCKET ?? "";
const CDN_URL = process.env.AWS_S3_CDN_URL ?? "";

// ── Public URL ────────────────────────────────────────────────────────────────
// S3: https://cdn.example.com/key  ya  https://bucket.s3.region.amazonaws.com/key
// Local: /uploads/key
export function publicUrl(key: string): string {
  if (USE_S3) {
    if (CDN_URL) return `${CDN_URL.replace(/\/$/, "")}/${key}`;
    return `https://${BUCKET}.s3.${process.env.AWS_REGION ?? "eu-central-1"}.amazonaws.com/${key}`;
  }
  return `/uploads/${key}`;
}

// ── Upload buffer ─────────────────────────────────────────────────────────────
export async function uploadFile(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> {
  if (USE_S3) {
    await s3!.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return publicUrl(key);
  }

  const filePath = path.join(LOCAL_UPLOADS, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return publicUrl(key);
}

// ── Presigned download URL (materiallar uchun) ────────────────────────────────
// S3: 1 soatlik imzolangan URL
// Local: oddiy /uploads/key — auth API orqali beriladi
export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!USE_S3) return null;
  const url = await s3GetSignedUrl(
    s3!,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  );
  return url;
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deleteFile(key: string): Promise<void> {
  if (USE_S3) {
    await s3!.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return;
  }
  await unlink(path.join(LOCAL_UPLOADS, key)).catch(() => {});
}

// ── Local stream (faqat local download uchun) ─────────────────────────────────
export function localReadStream(key: string) {
  return fsReadStream(path.join(LOCAL_UPLOADS, key));
}

export { USE_S3 };
