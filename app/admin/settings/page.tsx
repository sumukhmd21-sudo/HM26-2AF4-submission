import { requireRole } from "@/lib/auth";

export default async function SettingsPage() {
  try {
    await requireRole("SUPER_ADMIN");
  } catch {
    return null;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="glass-card p-5 text-sm text-white/70">
        <p>Configuration is environment-driven. Update .env to change models, geocoders, jurisdiction source, and storage.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-white/60">
          <li>GEMINI_ANALYSIS_MODEL — primary image/text model</li>
          <li>GEMINI_TRANSCRIBE_MODEL — recorded audio transcription</li>
          <li>GEMINI_TRANSCRIBE_LIVE_MODEL — realtime transcription</li>
          <li>GEMINI_LIVE_MODEL — voice conversation</li>
          <li>GEMINI_TTS_MODEL — text-to-speech</li>
          <li>LOCATION_MAX_ACCURACY_METERS — GPS accuracy threshold</li>
          <li>GEOCODER_PROVIDER / GEOCODER_API_KEY — reverse geocoder</li>
          <li>MYSURU_SERVICE_AREA_SOURCE — jurisdiction polygon source</li>
        </ul>
      </div>
    </div>
  );
}
