import { createReadStream as fsReadStream, createWriteStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
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

// ── Stream upload (katta fayllar — video) ──────────────────────────────────────
// Butun faylni xotirada Buffer sifatida ushlab turmasdan to'g'ridan-to'g'ri
// diskka/S3'ga oqim (stream) sifatida yuboradi. `abort()` chaqirilsa — S3'da
// multipart upload'ning tugallanmagan qismlari ham, lokal yarim yozilgan fayl
// ham tozalanadi (mijoz yuklashni bekor qilganda orfan fayl qolmasligi uchun).
export interface StreamUploadHandle {
  done: Promise<string>;
  abort: () => Promise<void>;
}

export function uploadStream(stream: Readable, key: string, mimeType: string): StreamUploadHandle {
  if (USE_S3) {
    const upload = new Upload({
      client: s3!,
      params: { Bucket: BUCKET, Key: key, Body: stream, ContentType: mimeType },
      queueSize: 4,
      partSize: 8 * 1024 * 1024,
    });
    return {
      done: upload.done().then(() => publicUrl(key)),
      abort: async () => {
        try { await upload.abort(); } catch { /* already finished/aborted */ }
      },
    };
  }

  const filePath = path.join(LOCAL_UPLOADS, key);
  let ws: ReturnType<typeof createWriteStream> | null = null;
  const done = (async () => {
    await mkdir(path.dirname(filePath), { recursive: true });
    ws = createWriteStream(filePath);
    await pipeline(stream, ws);
    return publicUrl(key);
  })();
  return {
    done,
    abort: async () => {
      stream.destroy();
      ws?.destroy();
      await unlink(filePath).catch(() => {});
    },
  };
}

// ── URL → storage key (o'chirish uchun) ────────────────────────────────────────
export function keyFromUrl(url: string): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return url.slice("/uploads/".length);
  if (USE_S3) {
    if (CDN_URL && url.startsWith(CDN_URL)) return decodeURIComponent(url.slice(CDN_URL.replace(/\/$/, "").length + 1));
    const s3Match = url.match(/\.amazonaws\.com\/(.+)$/);
    if (s3Match) return decodeURIComponent(s3Match[1]);
  }
  return null;
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

// ── Upload validation (MIME allowlist + per-kind size caps) ───────────────────
// Defense-in-depth: the global multipart plugin only caps at 4 GB — these enforce
// tighter, purpose-specific limits per endpoint and reject unexpected file types.
export const UPLOAD_LIMITS = {
  image: { maxBytes: 10 * 1024 * 1024, mimePrefixes: ["image/"] },       // 10 MB
  video: { maxBytes: 3 * 1024 * 1024 * 1024, mimePrefixes: ["video/"] }, // 3 GB
  material: {
    maxBytes: 200 * 1024 * 1024, // 200 MB
    mimePrefixes: ["image/", "video/", "audio/"],
    mimeExact: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
      "text/plain",
    ],
  },
} as const;

export class UploadValidationError extends Error {}

export function assertAllowedMimeType(
  mimetype: string,
  kind: keyof typeof UPLOAD_LIMITS
): void {
  const rule = UPLOAD_LIMITS[kind];
  const prefixOk = rule.mimePrefixes.some((p) => mimetype.startsWith(p));
  const exactOk = "mimeExact" in rule && (rule.mimeExact as readonly string[]).includes(mimetype);
  if (!prefixOk && !exactOk) {
    throw new UploadValidationError(`Fayl turi qo'llab-quvvatlanmaydi: ${mimetype}`);
  }
}

// ── Content sniffing (defense-in-depth against a spoofed Content-Type) ────────
// The client-declared MIME type above is trivially spoofable. This checks the
// actual file bytes against the declared type once the buffer is in memory.
export function looksLikeTextMarkup(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  return (
    head.startsWith("<!doctype") || head.startsWith("<html") ||
    head.startsWith("<?xml") || head.startsWith("<svg") || head.includes("<script")
  );
}

function sniffCategory(buffer: Buffer): "image" | "video" | "audio" | "pdf" | "zip" | "ole" | null {
  const b = buffer;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image"; // JPEG
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image"; // PNG
  if (b.length >= 6 && ["GIF87a", "GIF89a"].includes(b.toString("ascii", 0, 6))) return "image";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image";
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "pdf"; // %PDF
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) return "zip"; // docx/pptx/xlsx/zip
  if (b.length >= 4 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "ole"; // legacy doc/xls/ppt
  if (b.length >= 12 && b.toString("ascii", 4, 8) === "ftyp") return "video"; // mp4/mov
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video"; // webm/mkv
  if (b.length >= 3 && b.toString("ascii", 0, 3) === "ID3") return "audio";
  if (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return "audio"; // mp3 frame sync
  return null;
}

export function assertContentMatchesMimeType(declaredMime: string, buffer: Buffer): void {
  if (declaredMime !== "text/plain" && looksLikeTextMarkup(buffer)) {
    throw new UploadValidationError("Fayl mazmuni e'lon qilingan turga mos kelmadi");
  }
  const sniffed = sniffCategory(buffer);
  if (!sniffed) return; // formatni aniqlay olmadik — boshqa (kamdan-kam) turlarni bloklamaymiz
  const declaredCategory = declaredMime.split("/")[0];
  const compatible =
    (declaredCategory === "image" && sniffed === "image") ||
    (declaredCategory === "video" && sniffed === "video") ||
    (declaredCategory === "audio" && sniffed === "audio") ||
    (declaredCategory === "application" && (sniffed === "pdf" || sniffed === "zip" || sniffed === "ole"));
  if (!compatible) {
    throw new UploadValidationError("Fayl mazmuni e'lon qilingan turga mos kelmadi");
  }
}
