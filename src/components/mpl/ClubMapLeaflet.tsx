import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n";
import L from "leaflet";
import { CLUBS, ZONES, type Club } from "@/data/clubs";
export function ClubMapLeaflet({ clubs = CLUBS, height = 380, onSelect }: { clubs?: Club[]; height?: number; onSelect?: (c: Club) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // 5B-3 : repli si les tuiles OpenStreetMap ne se chargent pas (hors ligne, réseau filtré) — les clubs restent listés sous la carte.
  const [tilesFailed, setTilesFailed] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    setTilesFailed(false);
    const map = L.map(ref.current, { scrollWheelZoom: false, zoomControl: true }).setView([-20.2, 57.52], 9, { animate: false });
    let ok = 0, ko = 0; const layer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 18 });
    layer.on("tileload", () => { ok++; setTilesFailed(false); }); layer.on("tileerror", () => { ko++; if (ok === 0 && ko >= 3) setTilesFailed(true); }); layer.addTo(map);
    const pts: L.LatLngTuple[] = [];
    clubs.forEach((c) => {
      const color = ZONES[c.zone].color;
      const icon = L.divIcon({ className: "", html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px #0006;display:grid;place-items:center;color:#fff;font:700 10px Inter,sans-serif">${c.name[0]}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
      const m = L.marker([c.lat, c.lng], { icon, title: c.name }).addTo(map);
      m.bindPopup(`<strong>${c.name}</strong><br/>${ZONES[c.zone].label} · ${c.events} events`);
      m.on("click", () => onSelect?.(c)); pts.push([c.lat, c.lng]);
    });
    if (pts.length > 1) map.fitBounds(pts, { padding: [24, 24], animate: false });
    // 5F : arrêt des animations/minuteurs avant le démontage (évite « _leaflet_pos » d'undefined lors d'une navigation rapide).
    return () => { layer.off(); map.stop(); map.off(); map.remove(); };
  }, [clubs, onSelect]);
  return (
    <div className={tilesFailed ? "relative rounded-xl bg-muted" : "relative"} data-club-map data-tiles={tilesFailed ? "failed" : "ok"}>
      <div ref={ref} style={{ height }} className="w-full overflow-hidden rounded-xl border" role="region" aria-label={tr("Map of MPL clubs")} />
      {tilesFailed && <p role="status" data-map-fallback className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] rounded-lg border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow">{tr("The map background could not be loaded (offline or network blocked). Club markers are still positioned; the list of clubs is available below.")}</p>}
    </div>
  );
}
