/** 5B-2 — Sélecteurs de données du portail public (lecture seule). Aucune donnée n'est créée : tout provient du calendrier 2027, des résultats fictifs et des clubs existants. */
import { CALENDAR_EVENTS, type CalendarEvent } from "@/data/calendar.generated";
import { DRAW_RESULTS, divisionsForEvent, type Division } from "@/data/demo";
import { ALL_MATCHES } from "@/data/matches";
import { DEMO_TODAY, eventStatus } from "@/lib/format";

const byStart = (a: CalendarEvent, b: CalendarEvent) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id);
/** Épreuves en cours à la date de démonstration (hors annulées). */
export const liveEvents = (): CalendarEvent[] => CALENDAR_EVENTS.filter((e) => eventStatus(e) === "live").sort(byStart);
/** Prochaines épreuves (début après aujourd'hui, hors annulées), ordre chronologique. */
export const nextEvents = (n: number): CalendarEvent[] => CALENDAR_EVENTS.filter((e) => e.start > DEMO_TODAY && eventStatus(e) !== "cancelled").sort(byStart).slice(0, n);
export const openEvents = (n: number): CalendarEvent[] => CALENDAR_EVENTS.filter((e) => eventStatus(e) === "open").sort(byStart).slice(0, n);
export const clubEvents = (clubId: string) => CALENDAR_EVENTS.filter((e) => e.club === clubId).sort(byStart);

export interface LatestResult { event: CalendarEvent; draw: "M" | "F"; winner: [string, string]; finalist: [string, string]; score: string }
/** Derniers résultats : tableaux terminés (résultats fictifs du prototype), du plus récent au plus ancien. */
export function latestResults(n: number, clubId?: string): LatestResult[] {
  const evs = new Map(CALENDAR_EVENTS.map((e) => [e.id, e]));
  return DRAW_RESULTS.map((d) => ({ d, e: evs.get(d.eventId)! })).filter((x) => x.e && (!clubId || x.e.club === clubId))
    .sort((a, b) => b.e.end.localeCompare(a.e.end) || a.e.id.localeCompare(b.e.id) || a.d.draw.localeCompare(b.d.draw))
    .slice(0, n).map(({ d, e }) => {
      const fin = ALL_MATCHES.find((m) => m.eventId === d.eventId && m.draw === d.draw && m.round === "F");
      return { event: e, draw: d.draw, winner: fin?.winner ?? d.placements.find((p) => p.round === "W")!.pair, finalist: fin?.loser ?? d.placements.find((p) => p.round === "F")!.pair, score: fin?.score ?? "" };
    });
}
/** Filtre « division » du calendrier : Hommes, Dames, Mixte, Juniors. */
export type DivisionFilter = "M" | "F" | "X" | "JUNIOR";
export const DIVISION_FILTERS: DivisionFilter[] = ["M", "F", "X", "JUNIOR"];
export function matchesDivision(e: CalendarEvent, f: DivisionFilter): boolean {
  const ds: Division[] = divisionsForEvent(e);
  return f === "JUNIOR" ? ds.some((d) => d.startsWith("U")) : ds.includes(f);
}
/** Filtre « période » du calendrier (relatif à la date de démonstration). */
export type PeriodFilter = "next30" | "next90" | "past";
export const PERIOD_FILTERS: PeriodFilter[] = ["next30", "next90", "past"];
export function matchesPeriod(e: CalendarEvent, p: PeriodFilter, today = DEMO_TODAY): boolean {
  const plus = (days: number) => { const d = new Date(today + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
  if (p === "past") return e.end < today;
  return e.end >= today && e.start <= plus(p === "next30" ? 30 : 90);
}
