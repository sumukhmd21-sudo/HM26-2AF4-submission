import { describe, it, expect, vi } from "vitest";

// Mock the geocoder so tests don't hit the real Nominatim service. The
// validator only uses geocoding for label enrichment; the polygon check is
// the real service-area gate.
vi.mock("@/lib/location/geocoder", () => ({
  reverseGeocode: async () => ({
    state: "Karnataka",
    district: "Mysuru",
    city: "Mysuru",
    address: "Mysuru, Karnataka, India",
  }),
}));

import { pointInPolygon } from "@/lib/location/pointInPolygon";
import { MYSURU_POLYGON } from "@/lib/location/jurisdiction";
import { validateLocation } from "@/lib/location/validate";
import { canTransition } from "@/lib/complaints/create";

describe("pointInPolygon", () => {
  it("returns true for a point inside Mysuru", () => {
    expect(pointInPolygon(12.2958, 76.6394, MYSURU_POLYGON)).toBe(true);
  });
  it("returns false for a point outside Mysuru", () => {
    expect(pointInPolygon(13.0, 77.6, MYSURU_POLYGON)).toBe(false);
  });
});

describe("validateLocation", () => {
  it("accepts a typical desktop-grade fix inside the polygon", async () => {
    const r = await validateLocation({
      latitude: 12.2958,
      longitude: 76.6394,
      accuracyMeters: 500,
    });
    expect(r.valid).toBe(true);
    expect(r.reason).not.toBe("LOW_ACCURACY");
    expect(r.state).toBe("Karnataka");
  });

  it("rejects fixes above the accuracy ceiling", async () => {
    const r = await validateLocation({
      latitude: 12.2958,
      longitude: 76.6394,
      accuracyMeters: 5000,
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("LOW_ACCURACY");
  });

  it("rejects a point clearly outside the polygon", async () => {
    const r = await validateLocation({
      latitude: 13.0,
      longitude: 77.6,
      accuracyMeters: 10,
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("OUTSIDE_SERVICE_AREA");
  });

  it("rejects garbage coordinates", async () => {
    const r = await validateLocation({
      latitude: NaN,
      longitude: 76.6,
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("INVALID_COORDINATES");
  });
});

describe("canTransition", () => {
  it("allows SUBMITTED -> UNDER_REVIEW", () => {
    expect(canTransition("SUBMITTED", "UNDER_REVIEW")).toBe(true);
  });
  it("rejects SUBMITTED -> RESOLVED", () => {
    expect(canTransition("SUBMITTED", "RESOLVED")).toBe(false);
  });
  it("rejects CLOSED -> anything", () => {
    expect(canTransition("CLOSED", "IN_PROGRESS")).toBe(false);
  });
});

describe("complaint ID format", () => {
  it("matches CMP-MYS-YYYY-NNNNNN", () => {
    const re = /^CMP-MYS-\d{4}-\d{6}$/;
    expect(re.test("CMP-MYS-2026-000184")).toBe(true);
  });
});
