"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MYSURU_POLYGON } from "@/lib/location/jurisdiction";

export default function LocationMap({
  coords,
}: {
  coords: { lat: number; lng: number; accuracy?: number } | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polyRef = useRef<L.Polygon | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, {
      center: [12.2958, 76.6394],
      zoom: 12,
      attributionControl: false,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);
    polyRef.current = L.polygon(
      MYSURU_POLYGON.map(([lng, lat]) => [lat, lng]),
      { color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08, weight: 2 }
    ).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (coords) {
      markerRef.current = L.marker([coords.lat, coords.lng], { opacity: 0.9 }).addTo(m);
      m.setView([coords.lat, coords.lng], 14);
    }
  }, [coords]);

  return (
    <div
      ref={ref}
      className="h-72 w-full overflow-hidden rounded-xl border border-white/10"
      aria-label="Map showing Mysuru service area"
    />
  );
}
