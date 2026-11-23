/** 5B-1 — Titre HTML dynamique par route (WCAG 2.4.2). Les textes passent par tr() : EN = source, FR = dictionnaire fr-5b1. */
import { matchPath } from "react-router-dom";
import { tr } from "@/lib/i18n";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { displayName, playerById } from "@/data/demo";
import { clubById } from "@/data/clubs";

const STATIC: Array<[string, string]> = [
  ["/", "Home"], ["/calendar", "Tournament calendar"], ["/rankings", "Rankings"], ["/register", "Registration"], ["/player", "My space"],
  ["/organizer", "Organizer space"], ["/organizer/registrations", "Registrations"], ["/organizer/draws", "Draws and schedule"], ["/organizer/scores", "Scores"],
  ["/club", "Club portal"], ["/referee", "Referee console"], ["/admin", "MPL administration"], ["/interclub", "Interclub — management"],
  ["/interclub-public", "Interclub — public portal"], ["/clubs", "MPL clubs"],
];
export const SITE_TITLE = "MPL 2027";
export function routeTitle(pathname: string): string {
  const hit = STATIC.find(([p]) => p === pathname);
  if (hit) return tr(hit[1]);
  const t = matchPath("/tournaments/:id", pathname);
  if (t) { const ev = CALENDAR_EVENTS.find((e) => e.id === t.params.id); return ev ? `${ev.category} · ${ev.clubName}` : tr("Tournament"); }
  const c = matchPath("/clubs/:id", pathname);
  if (c) return clubById(c.params.id ?? "")?.name ?? tr("Club");
  const p = matchPath("/players/:id", pathname);
  if (p) { const pl = playerById(p.params.id ?? ""); return pl ? displayName(pl) : tr("Player"); }
  return tr("Page not found");
}
export const documentTitle = (pathname: string) => `${routeTitle(pathname)} — ${SITE_TITLE}`;
