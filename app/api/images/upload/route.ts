import { NextRequest, NextResponse } from "next/server";
import { storeBuffer } from "@/lib/storage";
import { query, queryOne } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const draftId = form.get("draftId") as string | null;
    if (!file || !draftId) {
      return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.type)) {
      return NextResponse.json({ error: "IMAGE_INVALID_FORMAT" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "IMAGE_TOO_LARGE" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/png" ? "png"
      : file.type === "image/webp" ? "webp"
      : file.type === "image/heic" ? "heic"
      : "jpg";
    const stored = await storeBuffer({
      draftId,
      buffer: buf,
      mimeType: file.type,
      extension: ext,
    });

    // Get image dimensions via dynamic import of sharp if available; else null
    let width: number | null = null;
    let height: number | null = null;
    try {
      const sharpMod = "sharp";
      const sharp = (await import(sharpMod)).default as (
        input: Buffer
      ) => { metadata: () => Promise<{ width?: number; height?: number }> };
      const meta = await sharp(buf).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      width = null;
      height = null;
    }
    if (width !== null && height !== null && (width < 200 || height < 200)) {
      return NextResponse.json({ error: "IMAGE_LOW_QUALITY" }, { status: 400 });
    }

    const { rows } = await query<{ id: string }>(
      `INSERT INTO complaint_images (draft_id, storage_path, mime_type, size_bytes, width, height, analysis_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        draftId,
        stored.storagePath,
        stored.mimeType,
        stored.sizeBytes,
        width,
        height,
        "PENDING",
      ]
    );
    const imageId = rows[0].id;
    await query(
      `UPDATE complaint_drafts SET image_id = $1 WHERE id = $2`,
      [imageId, draftId]
    );
    return NextResponse.json({ imageId, storagePath: stored.storagePath, width, height });
  } catch (e) {
    return NextResponse.json(
      { error: "IMAGE_UPLOAD_ERROR", message: (e as Error).message },
      { status: 500 }
    );
  }
}
