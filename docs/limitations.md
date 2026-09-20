# Known Limitations

## Top limitations

1. **No fallback when the Gemini API is unavailable.** AI analysis (photo/text understanding, description
   drafting) depends entirely on a live Gemini API call with an active billing account. If Google's API is
   down, rate-limited, or the billing account lapses, complaint submission stalls at the AI analysis step with
   no cached or manual fallback path.
2. **No duplicate/clustering detection yet.** Each complaint is processed and routed independently. At real
   city scale, a single visible issue (e.g. a flooded street after heavy rain) could generate hundreds of
   near-identical reports that flood an employee's queue as separate tickets instead of one grouped thread.
3. **Not yet verified against a live production environment.** The application was built and reviewed but not
   fully exercised against a real PostgreSQL instance and live API keys before this submission; core logic
   (routing, jurisdiction validation) was verified independently, but a full end-to-end run with live services
   was still in progress at submission time.

## Other known gaps

- **Storage** is filesystem-backed by default rather than a production object store; swapping in Supabase
  Storage (`lib/storage/index.ts`) is a config change, not a rewrite, but hasn't been done yet.
- **Notifications** use a pluggable no-op dispatcher by default; SMS/email delivery isn't wired up.
- **Low-accuracy GPS** complaints rely on a configurable accuracy threshold (`LOCATION_MAX_ACCURACY_METERS`) to
  reject unreliable readings, but we haven't tested this against real-world GPS drift in dense urban areas.

## Scaling roadmap

1. **Add a duplicate-detection step** before a complaint enters the employee queue: cluster by category, a
   small radius (~50m, reusing our existing jurisdiction polygon logic), and a time window (~24h), merging
   duplicates into a single thread with a report count.
2. **Add a fallback classification mode** for AI outages: a cached/rule-based classifier that keeps complaint
   submission working (with a lower-confidence routing) when Gemini is unavailable, rather than blocking
   submission entirely.
3. **Move storage and notifications to production-grade services** (Supabase Storage, real SMS/email) once the
   MVP is validated with real users.