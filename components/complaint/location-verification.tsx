"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { LocationReason, LocationValidationResult } from "@/lib/types";
import { MapPin, Loader2 } from "lucide-react";

const LocationMap = dynamic(() => import("./location-map"), { ssr: false });

export function LocationVerification({
  draftId,
  onLocating,
  onValidating,
  onValid,
  onInvalid,
  onLowAccuracy,
}: {
  draftId: string;
  onLocating: () => void;
  onValidating: () => void;
  onValid: (r: LocationValidationResult) => void;
  onInvalid: (reason: LocationReason) => void;
  onLowAccuracy: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);

  const allow = async () => {
    if (!navigator.geolocation) {
      onInvalid("LOCATION_PERMISSION_DENIED");
      return;
    }
    setBusy(true);
    onLocating();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        setCoords({ lat, lng, accuracy });
        onValidating();
        try {
          const r = await fetch("/api/location/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: lat,
              longitude: lng,
              accuracyMeters: accuracy,
              timestamp: pos.timestamp,
              draftId,
            }),
          });
          const j = await r.json();
          const result: LocationValidationResult = j.result;
          if (result.reason === "LOW_ACCURACY") {
            onLowAccuracy();
            return;
          }
          if (!result.valid) {
            onInvalid(result.reason ?? "OUTSIDE_SERVICE_AREA");
            return;
          }
          onValid(result);
        } catch {
          onInvalid("LOCATION_NETWORK_ERROR");
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        // Map the GeolocationPositionError codes to our typed reason so the
        // UI can show an accurate message.
        if (err.code === err.PERMISSION_DENIED) {
          onInvalid("LOCATION_PERMISSION_DENIED");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          onInvalid("LOCATION_NETWORK_ERROR");
        } else {
          onInvalid("LOCATION_NETWORK_ERROR");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-500/15 text-blue-300">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-medium">Verify your location</h2>
          <p className="text-sm text-white/60">
            We need your current location to confirm that this complaint falls within the Mysuru service area.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <LocationMap coords={coords} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-white/50">
          {coords
            ? `Coordinates: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (±${Math.round(
                coords.accuracy ?? 0
              )} m)`
            : "Location not yet captured"}
        </div>
        <button className="btn-primary" disabled={busy} onClick={allow}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          {busy ? "Verifying..." : "Allow Location"}
        </button>
      </div>
    </div>
  );
}
