// Domain types - match database schema in section 34

export type Role = "CITIZEN" | "EMPLOYEE" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";

export type ComplaintStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "NEEDS_INFORMATION"
  | "RESOLVED"
  | "CLOSED"
  | "REJECTED";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ImageQuality = "GOOD" | "ACCEPTABLE" | "POOR" | "UNUSABLE";

export type ComplaintState =
  | "IDLE"
  | "VOICE_GREETING"
  | "VOICE_LISTENING"
  | "DESCRIBING"
  | "DESCRIPTION_READY"
  | "REQUEST_LOCATION"
  | "LOCATING"
  | "LOCATION_VALIDATING"
  | "LOCATION_VALID"
  | "LOCATION_INVALID"
  | "REQUEST_CAMERA"
  | "CAMERA_OPEN"
  | "IMAGE_UPLOADING"
  | "IMAGE_PROCESSING"
  | "IMAGE_VALID"
  | "IMAGE_INVALID"
  | "GENERATING_COMPLAINT"
  | "REVIEW"
  | "SUBMITTING"
  | "REGISTERED"
  | "VOICE_PERMISSION_DENIED"
  | "VOICE_ERROR"
  | "LOCATION_PERMISSION_DENIED"
  | "LOCATION_OUTSIDE_SERVICE_AREA"
  | "LOCATION_LOW_ACCURACY"
  | "CAMERA_PERMISSION_DENIED"
  | "IMAGE_UPLOAD_ERROR"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_INVALID_FORMAT"
  | "IMAGE_IRRELEVANT"
  | "IMAGE_LOW_QUALITY"
  | "AI_TIMEOUT"
  | "AI_INVALID_OUTPUT"
  | "DATABASE_ERROR"
  | "SUBMISSION_ERROR";

export type InputMode = "TEXT" | "VOICE";

export interface Category {
  id: string;
  code: string;
  name: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  code: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  active: boolean;
}

export interface User {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: Role;
  department_id?: string;
}

export interface Complaint {
  id: string;
  complaint_number: string;
  citizen_id: string;
  title: string;
  description: string;
  original_description?: string;
  category_id: string;
  subcategory_id: string;
  status: ComplaintStatus;
  priority: Priority;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  jurisdiction: string;
  jurisdiction_verified: boolean;
  assigned_department_id?: string;
  assigned_employee_id?: string;
  ai_analysis_json?: unknown;
  ai_model?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface ComplaintDraft {
  id: string;
  citizen_id?: string;
  session_id: string;
  original_text?: string;
  voice_transcript?: string;
  normalized_text?: string;
  category_id?: string;
  subcategory_id?: string;
  location_json?: LocationValidationResult;
  image_id?: string;
  ai_analysis_json?: ImageAnalysisResult;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ComplaintImage {
  id: string;
  complaint_id?: string;
  draft_id?: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  width?: number;
  height?: number;
  analysis_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  image_valid?: boolean;
  problem_visible?: boolean;
  image_quality?: ImageQuality;
  ai_analysis_json?: ImageAnalysisResult;
  ai_model?: string;
  created_at: string;
}

export interface ComplaintEvent {
  id: string;
  complaint_id: string;
  event_type: string;
  old_status?: ComplaintStatus;
  new_status?: ComplaintStatus;
  actor_user_id?: string;
  actor_role?: Role;
  note?: string;
  created_at: string;
}

export type LocationReason =
  | "INVALID_COORDINATES"
  | "LOW_ACCURACY"
  | "OUTSIDE_SERVICE_AREA"
  | "GEOCODER_UNAVAILABLE"
  | "LOCATION_NETWORK_ERROR"
  | "LOCATION_PERMISSION_DENIED";

export interface LocationValidationResult {
  valid: boolean;
  latitude?: number;
  longitude?: number;
  state?: string;
  district?: string;
  city?: string;
  jurisdiction?: string;
  accuracyMeters?: number;
  address?: string;
  reason?: LocationReason;
}

export interface ComplaintIntentResult {
  intentDetected: boolean;
  category: string | null;
  subcategory: string | null;
  normalizedStatement: string | null;
  needsClarification: boolean;
  clarificationQuestion: string | null;
}

export interface ImageAnalysisResult {
  imageValid: boolean;
  problemVisible: boolean;
  reportedProblemSupported: boolean;
  imageQuality: ImageQuality;
  category: string | null;
  subcategory: string | null;
  title: string | null;
  description: string | null;
  retakeRecommended: boolean;
  confidence: number;
}

export interface ComplaintDescriptionResult {
  title: string;
  description: string;
}

export interface VoiceSessionInfo {
  sessionId: string;
  mode: "LIVE" | "TRANSCRIBE";
}

export const STATUS_ORDER: ComplaintStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  NEEDS_INFORMATION: "Needs Information",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};
