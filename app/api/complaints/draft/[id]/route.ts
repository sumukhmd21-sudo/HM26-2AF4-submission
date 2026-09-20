import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDraft, updateDraft } from "@/lib/complaints/draft";
import { getCurrentUser } from "@/lib/auth";

const patchSchema = z.object({
  original_text: z.string().optional(),
  voice_transcript: z.string().optional(),
  normalized_text: z.string().optional(),
  category_id: z.string().uuid().optional(),
  subcategory_id: z.string().uuid().optional(),
  location_json: z.unknown().optional(),
  image_id: z.string().uuid().optional(),
  ai_analysis_json: z.unknown().optional(),
  status: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const d = await getDraft(params.id);
  if (!d) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const u = await getCurrentUser();
  if (u && d.citizen_id && d.citizen_id !== u.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return NextResponse.json({ draft: d });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const d = await updateDraft(params.id, parsed.data);
  if (!d) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ draft: d });
}
