import { NextRequest, NextResponse } from "next/server";
import { submitComplaintSchema } from "@/lib/validation/complaint";
import { getDraft } from "@/lib/complaints/draft";
import { createComplaintFromDraft } from "@/lib/complaints/create";
import { validateLocation } from "@/lib/location/validate";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { emit } from "@/lib/notifications";
import { getGemini, MODELS } from "@/lib/gemini/client";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = submitComplaintSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const draft = await getDraft(parsed.data.draftId);
  if (!draft) return NextResponse.json({ error: "DRAFT_NOT_FOUND" }, { status: 404 });
  if (draft.citizen_id && draft.citizen_id !== user.id)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const loc = draft.location_json as
    | { latitude: number; longitude: number; accuracyMeters?: number; address?: string; city?: string; district?: string; state?: string }
    | undefined;
  if (!loc) return NextResponse.json({ error: "LOCATION_REQUIRED" }, { status: 400 });

  // Backend-authoritative re-validation
  const revalidated = await validateLocation({
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracyMeters: loc.accuracyMeters,
  });
  if (!revalidated.valid)
    return NextResponse.json({ error: "JURISDICTION_INVALID" }, { status: 400 });

  if (!draft.category_id || !draft.subcategory_id)
    return NextResponse.json({ error: "CATEGORY_REQUIRED" }, { status: 400 });

  // Photo is preferred but optional: text-only submissions are allowed when
  // the citizen declined or could not use the camera.
  const hasText =
    (draft.normalized_text && draft.normalized_text.trim().length > 0) ||
    (draft.original_text && draft.original_text.trim().length > 0) ||
    (draft.voice_transcript && draft.voice_transcript.trim().length > 0);
  if (!draft.image_id && !hasText) {
    return NextResponse.json(
      { error: "DESCRIPTION_REQUIRED", message: "A complaint needs either a photo or a text description." },
      { status: 400 }
    );
  }

  const complaint = await createComplaintFromDraft({
    draft,
    citizenId: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    originalText:
      draft.original_text ?? draft.voice_transcript ?? parsed.data.description,
    categoryId: parsed.data.categoryId,
    subcategoryId: parsed.data.subcategoryId,
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracyMeters: loc.accuracyMeters,
    address: revalidated.address ?? loc.address,
    city: revalidated.city ?? loc.city,
    district: revalidated.district ?? loc.district,
    state: revalidated.state ?? loc.state,
    aiAnalysis: draft.ai_analysis_json ?? {},
    aiModel: MODELS.analysis(),
    imageId: draft.image_id,
  });

  await audit({
    actorUserId: user.id,
    action: "complaint.created",
    entityType: "complaint",
    entityId: complaint.id,
    metadata: { complaint_number: complaint.complaint_number },
  });

  await emit({
    type: "complaint_registered",
    userId: user.id,
    payload: { complaintNumber: complaint.complaint_number },
  });

  return NextResponse.json({ complaint });
}
