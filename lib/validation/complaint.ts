import { z } from "zod";

export const analyzeTextBodySchema = z.object({
  text: z.string().min(3).max(2000),
  draftId: z.string().uuid().optional(),
});

export const locationBodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().optional(),
  timestamp: z.number().optional(),
  draftId: z.string().uuid().optional(),
});

export const imageUploadSchema = z.object({
  draftId: z.string().uuid(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]),
  sizeBytes: z.number().max(10 * 1024 * 1024),
  width: z.number().min(200).max(8000),
  height: z.number().min(200).max(8000),
});

export const submitComplaintSchema = z.object({
  draftId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid(),
});

export const transcribeBodySchema = z.object({
  mimeType: z.string().regex(/^audio\/(mpeg|wav|webm|mp4|ogg|x-m4a)$/),
  draftId: z.string().uuid().optional(),
});

export const statusUpdateSchema = z.object({
  status: z.enum([
    "SUBMITTED",
    "UNDER_REVIEW",
    "ASSIGNED",
    "IN_PROGRESS",
    "NEEDS_INFORMATION",
    "RESOLVED",
    "CLOSED",
    "REJECTED",
  ]),
  note: z.string().max(500).optional(),
});

export const assignmentSchema = z.object({
  departmentId: z.string().uuid().optional(),
  employeeId: z.string().uuid().nullable().optional(),
  reason: z.string().max(300).optional(),
});

export const internalNoteSchema = z.object({
  note: z.string().min(1).max(1000),
});

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
