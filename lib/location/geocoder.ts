// Reverse-geocoder adapter. Pluggable provider via env.

export interface ReverseGeocodeResult {
  state?: string;
  district?: string;
  city?: string;
  address?: string;
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const provider = (process.env.GEOCODER_PROVIDER ?? "nominatim").toLowerCase();
  try {
    if (provider === "nominatim") {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const headers: Record<string, string> = {
        "User-Agent": "MysuruGovComplaintPortal/1.0",
        "Accept-Language": "en",
      };
      if (process.env.GEOCODER_API_KEY)
        headers.Authorization = `Bearer ${process.env.GEOCODER_API_KEY}`;
      const r = await fetch(url, { headers, cache: "no-store" });
      if (!r.ok) return {};
      const j = (await r.json()) as {
        address?: {
          state?: string;
          county?: string;
          city?: string;
          town?: string;
          village?: string;
          suburb?: string;
          road?: string;
        };
        display_name?: string;
      };
      return {
        state: j.address?.state,
        district: j.address?.county,
        city: j.address?.city ?? j.address?.town ?? j.address?.village,
        address:
          j.display_name ??
          [j.address?.road, j.address?.suburb, j.address?.city, j.address?.state]
            .filter(Boolean)
            .join(", "),
      };
    }
    return {};
  } catch {
    return {};
  }
}
