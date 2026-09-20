"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Marker {
  id: string;
  complaint_number: string;
  title: string;
  latitude: number;
  longitude: number;
  status: string;
  priority: string;
  category_code: string;
}

export function EmployeeMap({ markers }: { markers: Marker[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, {
      center: [12.2958, 76.6394],
      zoom: 12,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    m.eachLayer((l) => {
      if (l instanceof L.Marker || l instanceof L.CircleMarker) m.removeLayer(l);
    });
    const bounds: L.LatLngTuple[] = [];
    for (const mk of markers) {
      const color =
        mk.priority === "CRITICAL"
          ? "#ef4444"
          : mk.priority === "HIGH"
          ? "#f59e0b"
          : mk.priority === "MEDIUM"
          ? "#3b82f6"
          : "#64748b";
      const cm = L.circleMarker([mk.latitude, mk.longitude], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 2,
      }).addTo(m);
      cm.bindPopup(
        `<div style="color:#000"><strong>${mk.complaint_number}</strong><br/>${mk.title}<br/><small>${mk.category_code} · ${mk.status} · ${mk.priority}</small></div>`
      );
      bounds.push([mk.latitude, mk.longitude]);
    }
    if (bounds.length > 0) m.fitBounds(bounds, { padding: [40, 40] });
  }, [markers]);

  return (
    <div
      ref={ref}
      className="h-[70vh] w-full overflow-hidden rounded-xl border border-white/10"
    />
  );
}
