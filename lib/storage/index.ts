// Storage abstraction. Default: local filesystem under /storage (private).
// Production: replace with Supabase Storage adapter using signed URLs.

import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import crypto from "crypto";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

export interface StoredFile {
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

export async function storeBuffer(input: {
  draftId: string;
  buffer: Buffer;
  mimeType: string;
  extension: string;
}): Promise<StoredFile> {
  const id = nanoid();
  const dir = path.join(STORAGE_ROOT, "complaints", input.draftId);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${id}.${input.extension.replace(/^\./, "")}`);
  await fs.writeFile(file, input.buffer);
  return {
    storagePath: path.posix.join("complaints", input.draftId, `${id}.${input.extension.replace(/^\./, "")}`),
    mimeType: input.mimeType,
    sizeBytes: input.buffer.byteLength,
  };
}

export async function readBuffer(storagePath: string): Promise<Buffer> {
  const safe = path.normalize(storagePath).replace(/^(\.\.[/\\])+/, "");
  const p = path.join(STORAGE_ROOT, safe);
  return fs.readFile(p);
}

export function signedUrl(storagePath: string, expiresInSec = 300): string {
  // Stateless signed URL using HMAC; replace with Supabase signed URL in production.
  const secret = process.env.STORAGE_BUCKET ?? "dev-secret";
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${storagePath}:${exp}`)
    .digest("hex")
    .slice(0, 32);
  return `/api/storage/serve?p=${encodeURIComponent(storagePath)}&exp=${exp}&sig=${sig}`;
}

export function verifySignedUrl(
  storagePath: string,
  exp: number,
  sig: string
): boolean {
  if (Math.floor(Date.now() / 1000) > exp) return false;
  const secret = process.env.STORAGE_BUCKET ?? "dev-secret";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${storagePath}:${exp}`)
    .digest("hex")
    .slice(0, 32);
  return expected === sig;
}
