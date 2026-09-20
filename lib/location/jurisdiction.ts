import { pointInPolygon } from "./pointInPolygon";

// Approximate Mysuru city administrative boundary polygon (configurable).
// Source: MYSURU_SERVICE_AREA_SOURCE=embedded (default).
// Replace with real boundary from authoritative source in production.
export const MYSURU_POLYGON: [number, number][] = [
  [76.55, 12.20],
  [76.75, 12.20],
  [76.78, 12.27],
  [76.72, 12.36],
  [76.60, 12.38],
  [76.52, 12.32],
  [76.55, 12.20],
];

export const MYSURU_BBOX = {
  minLat: 12.20,
  maxLat: 12.38,
  minLng: 76.52,
  maxLng: 76.78,
};

export function isInsideMysuru(lat: number, lng: number): boolean {
  if (
    lat < MYSURU_BBOX.minLat ||
    lat > MYSURU_BBOX.maxLat ||
    lng < MYSURU_BBOX.minLng ||
    lng > MYSURU_BBOX.maxLng
  )
    return false;
  return pointInPolygon(lat, lng, MYSURU_POLYGON);
}
