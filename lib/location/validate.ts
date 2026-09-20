import { isInsideMysuru } from "./jurisdiction";
import { reverseGeocode } from "./geocoder";
import type { LocationValidationResult } from "@/lib/types";

export async function validateLocation(input: {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  timestamp?: number;
}): Promise<LocationValidationResult> {
  // Default ceiling is 2000 m. Desktop browsers (Wi-Fi/IP geolocation)
  // routinely report 100-1000 m accuracy; indoor phones can hit several
  // hundred metres. 50 m (the previous default) rejected the vast majority
  // of real users. The polygon + reverse-geocoder check still keeps out
  // users clearly outside Mysuru regardless of accuracy.
  const maxAccuracy = Number(process.env.LOCATION_MAX_ACCURACY_METERS ?? 2000);
  if (
    typeof input.latitude !== "number" ||
    typeof input.longitude !== "number" ||
    Math.abs(input.latitude) > 90 ||
    Math.abs(input.longitude) > 180 ||
    Number.isNaN(input.latitude) ||
    Number.isNaN(input.longitude)
  ) {
    return { valid: false, reason: "INVALID_COORDINATES" };
  }
  if (input.accuracyMeters !== undefined && input.accuracyMeters > maxAccuracy) {
    return { valid: false, reason: "LOW_ACCURACY", accuracyMeters: input.accuracyMeters };
  }

  // Polygon containment is the source of truth for service-area. The geocoder
  // is only used to enrich the result with state/district/city labels.
  const inside = isInsideMysuru(input.latitude, input.longitude);
  if (!inside) {
    let geo;
    try {
      geo = await reverseGeocode(input.latitude, input.longitude);
    } catch {
      geo = {};
    }
    return {
      valid: false,
      reason: "OUTSIDE_SERVICE_AREA",
      state: geo.state,
      district: geo.district,
      city: geo.city,
      address: geo.address,
    };
  }

  // We're inside the polygon — try to enrich, but never fail because the
  // reverse-geocoder is unavailable. Surface a distinct reason if it errored
  // so the UI can show a precise message.
  let geo;
  let geocoderFailed = false;
  try {
    geo = await reverseGeocode(input.latitude, input.longitude);
    // reverseGeocode swallows errors and returns {} — treat empty as failure.
    if (!geo.state && !geo.city && !geo.district) geocoderFailed = true;
  } catch {
    geo = {};
    geocoderFailed = true;
  }

  if (geocoderFailed) {
    return {
      valid: true,
      latitude: input.latitude,
      longitude: input.longitude,
      jurisdiction: "MYSURU",
      accuracyMeters: input.accuracyMeters,
      reason: "GEOCODER_UNAVAILABLE",
    };
  }

  return {
    valid: true,
    latitude: input.latitude,
    longitude: input.longitude,
    state: geo.state ?? "Karnataka",
    district: geo.district ?? "Mysuru",
    city: geo.city ?? "Mysuru",
    jurisdiction: "MYSURU",
    accuracyMeters: input.accuracyMeters,
    address: geo.address,
  };
}
