# Mysuru Gov Complaint Portal

**HackMysuru 1.0 submission · Team Bug Busters · Team ID HM26-2AF4**

> All submission links (live demo, video, decision log, deck) and their SHA-256 hashes are in [`resource.md`](./resource.md).

---

## 1. Problem Understanding

**Sub-problem:** routing citizen complaints to the right department and letting citizens follow them through to resolution.

**The civic gap:** in Mysuru, a citizen who spots a civic issue (a damaged road, a garbage pile, a broken streetlight) often does not know which department owns it, or whether the report ever reached anyone. Reports go missing between departments, and the citizen gets no visibility afterwards.

**What "solved" looks like:** a citizen describes the issue by text or voice, confirms the location, attaches a photo, and gets a complaint ID. The complaint reaches the correct department automatically, and the citizen can track its status until it is closed.

## 2. Target Users & Mysuru Context

| Persona | What they need |
|---|---|
| **Citizen** | Report an issue quickly from a phone, in their own language, and track it |
| **Department employee** | See complaints for their department, assign them, update status, add internal notes |
| **Admin / super admin** | Manage users, departments, categories, jurisdiction and audit logs |

**Constraints we designed for:**
- **Language:** voice input with multilingual transcription (auto-detected), and text always shown alongside audio.
- **Devices:** mobile-first flow using the phone camera (or an upload) and browser geolocation.
- **Location accuracy:** locations are rejected if accuracy is worse than a configured threshold (50 m by default) or if they fall outside the Mysuru boundary.
- **Trust:** citizens only ever see their own complaints and images; internal notes are never shown to citizens.

## 3. Solution Overview

The core citizen journey:

1. **Describe:** type or speak the issue.
2. **Location:** browser geolocation, validated by the backend against the Mysuru boundary.
3. **Photo:** take a photo or upload one; the image is validated and stored privately.
4. **AI analysis and review:** Gemini analyses the text and photo and drafts a title and description; the citizen edits and confirms.
5. **Submit and track:** the backend re-validates the location, generates the complaint ID (`CMP-MYS-YYYY-NNNNNN`), routes it to a department, and the citizen follows the status timeline.

<!-- Add real product screenshots for the 5 steps here, saved in docs/images/ (each under 1 MB), for example:
![Describe](docs/images/01-describe.png)
![Location](docs/images/02-location.png)
![Photo](docs/images/03-photo.png)
![Review](docs/images/04-review.png)
![Track](docs/images/05-track.png)
-->

Staff side: employee dashboard, filterable complaint table, complaint detail with AI analysis and evidence, assignment and status actions, map view, analytics, and an admin area with audit logs.

## 4. Architecture

A Next.js 14 app whose server routes validate location, images and status transitions, call Gemini only for analysis and transcription, and persist everything in PostgreSQL; the full diagram, components, data model and APIs are in [`docs/architecture.md`](./docs/architecture.md).

## 5. Tech Stack & AI Usage

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js server routes and server actions, Zod validation
- **Database:** PostgreSQL (Supabase recommended)
- **AI:** Google Gemini (image and text analysis, transcription, text-to-speech, live voice)
- **Maps:** Leaflet with OpenStreetMap tiles; Nominatim for geocoding

Gemini is deliberately **not** used for jurisdiction or department routing; both are deterministic backend logic. Full disclosure of AI use in development and inside the product: [`ai.md`](./ai.md).

## 6. Decision Log (Summary)

- **Approach chosen:** deterministic backend logic for jurisdiction (point-in-polygon), department routing, complaint IDs and status transitions. Gemini is used only to analyse and draft, and its output is validated with Zod before it is trusted.
- **Why:** a bad or manipulated AI response can never change a citizen's ward assignment or routing.
- **Rejected alternative and trade-offs:** see the full 1-page Decision Log, linked in [`resource.md`](./resource.md).

## 7. Setup & Run

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, Supabase keys, GEMINI_API_KEY
npm run db:migrate        # creates schema, seeds departments and categories
npm run dev               # http://localhost:3000
npm test
```

Full instructions, environment variables and testing notes: [`docs/setup.md`](./docs/setup.md).

## 8. Known Limitations

1. **Gemini API quota:** with a limited API key, AI analysis can be rate-limited, and we could not complete the final tracking-address step during testing.
2. **File storage:** evidence images are stored on the filesystem by default (with signed, expiring URLs); production needs Supabase Storage via `lib/storage/index.ts`.
3. **Notifications:** the notification dispatcher is a no-op by default and still needs to be wired to SMS or email.

Full list, edge cases and scaling roadmap: [`docs/limitations.md`](./docs/limitations.md).

---

## Repository layout

Source code is in `app/`, `components/` and `lib/` at the repository root (Next.js App Router); tests are in `tests/` and helper scripts in `scripts/`.

## Security highlights

- Credentials only via environment variables; no keys in code or the client bundle.
- Uploads validated server-side (MIME allowlist, 10 MB limit, minimum 200x200 pixels).
- Signed, expiring URLs for evidence; role-based authorization on every endpoint.
- Location re-validated on final submission; the client's jurisdiction flags are never trusted.
- Prompt-injection-safe Gemini calls: citizen text is treated as data, with strict system prompts and Zod validation.
- Immutable audit log of status changes, assignments, notes and admin actions.
