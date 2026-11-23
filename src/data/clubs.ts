import type { Zone } from "./calendar.generated";
import { tr } from "@/lib/i18n";
import { CALENDAR_EVENTS } from "./calendar.generated";
/** 18 clubs du calendrier 2027 V4. Positions : fichier clubsMap du site 2027 (lecture seule). Logos : uniquement ceux disponibles. */
export interface Club { id: string; name: string; zone: Zone; lat: number; lng: number; locality?: string; logo?: string; mapsUrl?: string; note?: string; courtsMax: number; events: number; }
const RAW: Array<[string, string, Zone, number, number, string?, string?, string?]> = [
  ["cana-beau-plan", "Caña Beau Plan", "NORD", -20.094933813, 57.58666717, "Beau Plan", "/assets/clubs/cana-beau-plan.png"],
  ["urban-sport-grand-baie", "Urban Sport Grand Baie", "NORD", -20.0114278, 57.5984873, "Grand Baie"],
  ["urban-sport-black-river", "Urban Sport Black River", "OUEST", -20.3644304, 57.382951, "Black River"],
  ["sparc-cascavelle", "SPARC Cascavelle", "OUEST", -20.277105349, 57.396219004, "Cascavelle"],
  ["rm-club-tamarin", "RM Club Tamarin", "OUEST", -20.331221151, 57.382628011, "Tamarin"],
  ["rm-club-hennessy", "RM Club Hennessy", "CENTRE", -20.242655243, 57.489691475],
  ["rm-club-grand-baie", "RM Club Grand Baie", "NORD", -20.0568375, 57.614078125, "Grand Baie", undefined, "Forbach site"],
  ["labourdonnais-sports-club", "Labourdonnais Sports Club", "NORD", -20.069947515, 57.614905719, "Mapou"],
  ["rm-club-port-chambly", "RM Club Port Chambly", "CENTRE", -20.111056098, 57.523839523, "Port Chambly"],
  ["rm-club-azuri", "RM Club Azuri", "EST", -20.099010843, 57.708325025, "Azuri"],
  ["isla-padel-grand-baie", "Isla Padel Grand Baie", "NORD", -20.021944964, 57.577814573, "Grand Baie"],
  ["terres-brunes-tamarin", "Terres Brunes Tamarin", "OUEST", -20.344728, 57.388136, "Tamarin"],
  ["mont-choisy", "Mont Choisy", "NORD", -20.027244078, 57.560090823, "Mont Choisy", "/assets/clubs/mont-choisy.png"],
  ["oxygen", "Oxygen", "CENTRE", -20.32839, 57.5101135],
  ["club-house-black-river", "Club House Black River", "OUEST", -20.3691879, 57.3791872, "Black River"],
  ["energia-pte-aux-canonniers", "Energia Pte aux Canonniers", "NORD", -20.00263135, 57.554626855, "Pointe aux Canonniers"],
  ["moka-rangers", "Moka Rangers", "CENTRE", -20.228209421, 57.52021403, "Moka"],
  ["reve-padel-club", "Rêve Padel Club", "NORD", -20.0099296, 57.6175575, "Petit Raffray"],
];
export const CLUBS: Club[] = RAW.map(([id, name, zone, lat, lng, locality, logo, note]) => {
  const ev = CALENDAR_EVENTS.filter((e) => e.club === id);
  return { id, name, zone, lat, lng, locality, logo, note, events: ev.length, courtsMax: Math.max(0, ...ev.map((e) => e.courts)) };
});
export const clubById = (id: string) => CLUBS.find((c) => c.id === id);
export const ZONES: Record<Zone, { label: string; color: string }> = {
  NORD: { label: tr("North"), color: "#3b82f6" }, OUEST: { label: tr("West"), color: "#10b981" },
  CENTRE: { label: tr("Centre"), color: "#8b5cf6" }, EST: { label: tr("East"), color: "#f59e0b" },
};
