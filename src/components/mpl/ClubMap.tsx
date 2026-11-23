import { lazy, Suspense } from "react";
import { tr } from "@/lib/i18n";
import { CLUBS, type Club } from "@/data/clubs";
// 5F : Leaflet (~150 Ko minifiés) est chargé à la demande, hors du JavaScript initial. Même API, même balisage ([data-club-map]).
const Impl = lazy(() => import("./ClubMapLeaflet").then((m) => ({ default: m.ClubMapLeaflet })));
export function ClubMap({ clubs = CLUBS, height = 380, onSelect }: { clubs?: Club[]; height?: number; onSelect?: (c: Club) => void }) {
  return (
    <Suspense fallback={<div className="relative" data-club-map data-tiles="ok"><div style={{ height }} className="w-full rounded-xl border bg-muted/40" role="region" aria-label={tr("Map of MPL clubs")} aria-busy="true" /></div>}>
      <Impl clubs={clubs} height={height} onSelect={onSelect} />
    </Suspense>
  );
}
