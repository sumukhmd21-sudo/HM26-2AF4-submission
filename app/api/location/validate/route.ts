import { NextRequest, NextResponse } from "next/server";
import { locationBodySchema } from "@/lib/validation/complaint";
import { validateLocation } from "@/lib/location/validate";
import { getDraft, updateDraft } from "@/lib/complaints/draft";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = locationBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const result = await validateLocation(parsed.data);
  if (parsed.data.draftId) {
    await updateDraft(parsed.data.draftId, { location_json: result });
  }
  return NextResponse.json({ result });
}
