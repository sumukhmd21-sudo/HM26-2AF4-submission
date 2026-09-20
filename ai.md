# AI Usage Disclosure

## AI used in development

We built this project primarily using **MiniMax M3**, an AI coding model. It generated the application structure, API routes, Supabase integration, the Gemini service layer, and the employee/admin dashboards. Most of the generated code was used largely as-is; our review focused on checking that it matched our intended feature set rather than rewriting it line by line.

We also used **Claude** (Anthropic's AI assistant) to review our repository against the hackathon submission checklist, to proofread this file, and to draft our **decision log, README and slide deck**. We reviewed the drafts against our own project and edited them before submitting.

What we did ourselves: we set up and configured the environment (Supabase project, Gemini API credentials), then ran the local install and migration (`npm install`, `npm run db:migrate`, `npm run dev`). The app runs locally, but because of our limited Gemini API key we could not complete the last step (providing a tracking address).. We also hit a real Gemini API billing/quota issue during testing and worked through it. AI analysis can be rate-limited in the live demo. That process let us verify the app's actual behavior beyond what the AI-generated code claimed.

## AI used inside the product itself

The application uses **Google Gemini** at runtime for:
- Analyzing a citizen's complaint text and photo, and drafting a title and description (`lib/gemini/text.ts`, `lib/gemini/vision.ts`)
- Transcribing voice input and generating text-to-speech responses (`lib/gemini/audio.ts`)

Gemini is deliberately **not** used to decide department routing or jurisdiction. Those are handled by deterministic backend logic (`lib/complaints/routing.ts`, `lib/location/`) so that a citizen's ward assignment and department routing can't be altered by a bad or manipulated AI response.

## What we manually verified

During testing,walked through the complaint submission flow up to the final step. (text/photo input → AI analysis → jurisdiction validation → routing) and confirmed the deterministic routing and jurisdiction logic behaves correctly independent of the AI-generated description text.

Example file we reviewed by hand and explain in the video: We did not manually edit the AI-generated code; we verified its behaviour by running the app and testing the submission flow.

We did not manually edit the AI-generated code; we verified its behaviour by running the app and testing the submission flow. In the video we open one AI-assisted file and explain what it does and what we tested.