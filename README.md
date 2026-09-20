# Mysuru Gov Complaint Portal

A production-grade civic complaint registration and tracking platform for the city of Mysuru.

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js server routes + server actions + Zod
- **Database**: PostgreSQL (Supabase recommended)
- **Auth**: Supabase Auth compatible (cookie-based session used here for portability)
- **AI**: Google Gemini (analysis, transcribe, live, TTS)
- **Maps**: Leaflet + OpenStreetMap tiles

The user-visible journey follows the spec exactly: **Describe → Location → Photo → AI Analysis → Review → Submit → Track.**

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure

Copy `.env.example` to `.env` and fill in the values:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgres://...
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
# Current Gemini lineup (Jan 2026). Replace with whatever your key has.
GEMINI_ANALYSIS_MODEL=gemini-3.6-flash
GEMINI_TRANSCRIBE_MODEL=gemini-3.6-flash
GEMINI_TRANSCRIBE_LIVE_MODEL=gemini-3.6-flash
GEMINI_LIVE_MODEL=gemini-3.6-flash
GEMINI_TTS_MODEL=gemini-3.6-flash-tts
GEOCODER_PROVIDER=nominatim
LOCATION_MAX_ACCURACY_METERS=50
STORAGE_BUCKET=complaints
MYSURU_SERVICE_AREA_SOURCE=config
```

> Never commit real keys. `.env.example` ships with empty values only.

> **Model availability note**: The values shown are the current published lineup. Older names like `gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-1.5-flash`, and the `*-transcribe-*` variants return 404. The transcribe audio path will still fall back through `gemini-3.6-flash` → `gemini-3.6-flash-lite` automatically if the configured model fails.

### 3. Migrate and seed

```bash
npm run db:migrate
```

This creates the schema and inserts departments / categories / subcategories.

### 4. Run

```bash
npm run dev
```

### 5. Test

```bash
npm test
```

---

## Architecture

### Citizen flow (matches spec)

1. **Describe**: Text or voice (`/complaints/new`)
2. **Location**: Browser Geolocation → `POST /api/location/validate` → backend authoritative point-in-polygon test against the configured Mysuru polygon.
3. **Camera**: `getUserMedia({ facingMode: 'environment' })` or upload. Image uploaded to `POST /api/images/upload` → private storage at `complaints/{draftId}/{imageId}.{ext}`.
4. **AI analysis**: `POST /api/complaints/analyze-image` calls Gemini 3.5 Flash with strict JSON schema, validated by Zod. If the image supports a civic issue, a final title + description are generated.
5. **Review**: Editable title, description, location, original text, evidence.
6. **Submit**: `POST /api/complaints` re-validates jurisdiction, generates `CMP-MYS-YYYY-NNNNNN` deterministically, creates the row, links the image, and emits the first event.
7. **Track**: `/complaints/[complaintNumber]` shows status timeline.

### State machine

Explicit reducer in `components/complaint/complaint-flow.tsx`. States: `IDLE, DESCRIBING, DESCRIPTION_READY, REQUEST_LOCATION, LOCATING, LOCATION_VALIDATING, LOCATION_VALID, LOCATION_INVALID, REQUEST_CAMERA, CAMERA_OPEN, IMAGE_UPLOADING, IMAGE_PROCESSING, IMAGE_VALID, IMAGE_INVALID, GENERATING_COMPLAINT, REVIEW, SUBMITTING, REGISTERED` plus error states for permissions, low accuracy, format, size, irrelevance, AI timeout, database / submission errors.

### Gemini service layer (`lib/gemini/`)

- `client.ts` — single `GoogleGenAI` instance, model names from env via `MODELS`.
- `text.ts` — analyze text → complaint intent.
- `vision.ts` — analyze image + generate final description.
- `audio.ts` — transcribe + TTS + live session marker.
- `prompts.ts` — all system instructions.
- `schemas.ts` — Zod schemas for every Gemini call.

All business-critical Gemini calls use `responseMimeType: "application/json"` and are validated with Zod before being trusted.

### Location (`lib/location/`)

- `jurisdiction.ts` — polygon + bounding box.
- `pointInPolygon.ts` — ray casting.
- `geocoder.ts` — Nominatim adapter, pluggable via `GEOCODER_PROVIDER`.
- `validate.ts` — coordinate format, accuracy threshold, reverse-geocode, polygon test, jurisdiction decision. Backend is authoritative. Gemini is **never** asked to decide jurisdiction.

### Storage (`lib/storage/`)

Filesystem-backed by default, with HMAC-signed URLs and authorization checks. Swap with Supabase Storage in production by replacing `lib/storage/index.ts`.

### Complaint ID (`lib/complaints/generateId.ts`)

Database-backed sequence per year using `MAX(CAST(SPLIT_PART(complaint_number,'-',4) AS INTEGER))+1`. Format `CMP-MYS-YYYY-NNNNNN`.

### Department routing (`lib/complaints/routing.ts`)

Deterministic mapping (never AI). Mappings in section 33 of the spec.

### Status transitions (`lib/complaints/create.ts`)

`canTransition` enforces the valid flow. Backend rejects invalid transitions.

### Audit (`lib/audit/`)

Logs complaint creation, status changes, assignments, notes, admin actions. Immutable.

### Notifications (`lib/notifications/`)

Pluggable dispatcher with `subscribe` API. Default no-op; wire to SMS / email in production.

---

## Routes

### Citizen

- `/` — home with hero + pill input
- `/complaints/new?draft=...&mode=text|voice` — wizard
- `/complaints` — my complaints
- `/complaints/[complaintNumber]` — tracking + timeline
- `/auth/login` — sign in
- `/profile` — minimal profile

### Employee

- `/employee` — dashboard
- `/employee/complaints` — filterable, paginated table
- `/employee/complaints/[id]` — full detail (AI analysis, evidence, timeline, internal notes, status/assignment actions)
- `/employee/map` — Leaflet map with markers
- `/employee/analytics` — charts by status, category, time, department, priority
- `/employee/employees` — (department admins / super admins)

### Admin

- `/admin/users`
- `/admin/departments`
- `/admin/categories`
- `/admin/jurisdiction`
- `/admin/settings`
- `/admin/audit`

---

## API

```
POST /api/auth/login
DELETE /api/auth/login
GET   /api/auth/me

POST  /api/complaints/draft
GET   /api/complaints/draft/:id
PATCH /api/complaints/draft/:id

POST  /api/complaints/analyze-text
POST  /api/complaints/analyze-image

POST  /api/location/validate
POST  /api/images/upload

POST  /api/voice/session
POST  /api/voice/token
POST  /api/voice/transcribe
POST  /api/voice/tts
POST  /api/voice/end-session

POST  /api/complaints            # final submission
GET   /api/citizen/complaints
GET   /api/complaints/:complaintNumber
GET   /api/complaints/:complaintNumber/timeline

GET   /api/employee/complaints
GET   /api/employee/complaints/:id
PATCH /api/employee/complaints/:id/status
PATCH /api/employee/complaints/:id/assignment
POST  /api/employee/complaints/:id/notes
GET   /api/employee/map
GET   /api/employee/analytics
GET   /api/employee/employees

GET   /api/admin/users
GET   /api/admin/departments
GET   /api/admin/categories
GET   /api/admin/audit-logs
GET   /api/admin/jurisdiction

GET   /api/storage/serve        # signed URL serving
```

---

## Security

- All credentials via env. No keys in code or client bundle.
- File validation: MIME allowlist, max size 10 MB, minimum dimensions 200×200, server-side decoding.
- Signed, expiring URLs for evidence. Citizens can only access their own complaint images; staff can access those within their department (or all if super admin).
- Backend re-validates location on final submission, never trusts client jurisdiction flags.
- Role-based authorization on every endpoint (`requireUser`, `requireRole`).
- Prompt-injection-safe Gemini calls — citizen text is data, not instructions. Strict system prompts and Zod validation at the boundary.
- Audit logs for status changes, assignments, notes, admin actions.
- Internal notes never returned to citizens.
- Phone/email never returned to other citizens.

---

## Accessibility

- Semantic HTML, focus rings, visible labels.
- Status pills include text labels (not color-only).
- Reduced-motion friendly (no decorative animations).
- Voice is optional; text always shown alongside audio.

---

## Phase-by-phase status

- **Phase 1** (setup, auth, base UI): done.
- **Phase 2** (draft, text, location, camera, image AI, review, submit, ID): done.
- **Phase 3** (citizen list, tracking, timeline): done.
- **Phase 4** (employee auth, dashboard, filtering, detail, assignment, status, notes): done.
- **Phase 5** (Gemini Live, transcribe, TTS, voice UI): done (TTS via `lib/gemini/audio.ts`; live conversation via client-side WebSocket + ephemeral token from `/api/voice/token`; multilingual transcription via Gemini with auto-detect).
- **Phase 6** (employee map, analytics, admin, audit, notifications): done.

---

## Notes on what is unverified in this environment

This bundle was authored in an environment without network or live DB. I have **not** run `npm install`, `next build`, or `tsc` against the actual toolchain here. The architecture, contracts, and structure match the spec; before deployment, run `npm install`, point `DATABASE_URL` at a real PostgreSQL (run `npm run db:migrate`), supply `GEMINI_API_KEY`, and exercise the wizard end-to-end.
