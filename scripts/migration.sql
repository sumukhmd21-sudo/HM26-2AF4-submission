-- ============================================================
-- Mysuru Gov Complaint Portal - Database Schema (section 34)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (citizens + employees + admins)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('CITIZEN','EMPLOYEE','DEPARTMENT_ADMIN','SUPER_ADMIN')),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  -- Dev-only fallback: when NULL, /api/auth/login allows any password.
  -- Production deployments should populate this column and remove the
  -- dev fallback in the login route.
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent: bring older deployments up to date if the table already
-- exists but is missing password_hash (added after initial schema).
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL UNIQUE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  role TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, code)
);

-- Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number TEXT NOT NULL UNIQUE,
  citizen_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  original_description TEXT,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  subcategory_id UUID NOT NULL REFERENCES subcategories(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy_meters DOUBLE PRECISION,
  address TEXT,
  city TEXT,
  district TEXT,
  state TEXT,
  jurisdiction TEXT NOT NULL DEFAULT 'MYSURU',
  jurisdiction_verified BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  assigned_employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ai_analysis_json JSONB,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_complaints_number ON complaints(complaint_number);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category_id);
CREATE INDEX IF NOT EXISTS idx_complaints_subcategory ON complaints(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_complaints_dept ON complaints(assigned_department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_emp ON complaints(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);

-- Drafts
CREATE TABLE IF NOT EXISTS complaint_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  original_text TEXT,
  voice_transcript TEXT,
  normalized_text TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL,
  location_json JSONB,
  image_id UUID,
  ai_analysis_json JSONB,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drafts_session ON complaint_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_drafts_expires ON complaint_drafts(expires_at);

-- Complaint images
CREATE TABLE IF NOT EXISTS complaint_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES complaint_drafts(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  analysis_status TEXT NOT NULL DEFAULT 'PENDING',
  image_valid BOOLEAN,
  problem_visible BOOLEAN,
  image_quality TEXT,
  ai_analysis_json JSONB,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_complaint ON complaint_images(complaint_id);
CREATE INDEX IF NOT EXISTS idx_images_draft ON complaint_images(draft_id);

-- Complaint events
CREATE TABLE IF NOT EXISTS complaint_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_complaint ON complaint_events(complaint_id);

-- Assignments
CREATE TABLE IF NOT EXISTS complaint_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  reason TEXT
);

-- Internal notes (employee only)
CREATE TABLE IF NOT EXISTS complaint_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  note TEXT NOT NULL,
  internal_only BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI sessions
CREATE TABLE IF NOT EXISTS ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID REFERENCES users(id) ON DELETE SET NULL,
  complaint_draft_id UUID REFERENCES complaint_drafts(id) ON DELETE SET NULL,
  mode TEXT NOT NULL,
  gemini_session_id TEXT,
  transcript JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
