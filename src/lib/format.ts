import type { CalendarEvent } from "@/data/calendar.generated";
import { CURRENT_LANG } from "@/lib/i18n";
const LOCALE = CURRENT_LANG === "fr" ? "fr-FR" : "en-GB";
import { DEMO_TODAY, DEMO_CANCELLED_EVENTS, REG_CLOSE_DAYS_BEFORE, REG_OPEN_DAYS_BEFORE } from "@/config/demo-config";
/** Date « aujourd'hui » de la démo : définie dans src/config/demo-config.ts (modifiable sans toucher aux composants). */
export { DEMO_TODAY };
const d = (s: string) => new Date(s + "T00:00:00Z");
export const daysBetween = (a: string, b: string) => Math.round((d(b).getTime() - d(a).getTime()) / 86400000);
export type EventStatus = "upcoming" | "open" | "closed" | "live" | "completed" | "cancelled";
/** Règle confirmée : ouvert de J-21 à J-8, clos à J-7 (tirage), >21 jours = à venir. Un id listé dans DEMO_CANCELLED_EVENTS est « annulé » (scénario fictif). */
export function eventStatus(ev: Pick<CalendarEvent, "start" | "end"> & { id?: string }, today = DEMO_TODAY): EventStatus {
  if (ev.id && DEMO_CANCELLED_EVENTS.includes(ev.id)) return "cancelled";
  if (today > ev.end) return "completed";
  if (today >= ev.start) return "live";
  const j = daysBetween(today, ev.start);
  if (j > REG_OPEN_DAYS_BEFORE) return "upcoming";
  if (j > REG_CLOSE_DAYS_BEFORE) return "open";
  return "closed";
}
export const shiftDate = (s: string, days: number) => { const x = d(s); x.setUTCDate(x.getUTCDate() + days); return x.toISOString().slice(0, 10); };
export const fmtDate = (s: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Intl.DateTimeFormat(LOCALE, { ...opts, timeZone: "UTC" }).format(d(s));
export const fmtRange = (e: Pick<CalendarEvent, "start" | "end">) =>
  e.start === e.end ? fmtDate(e.start, { weekday: "short", day: "numeric", month: "short" }) : `${fmtDate(e.start)} – ${fmtDate(e.end)}`;
export const monthKey = (s: string) => s.slice(0, 7);
export const monthLabel = (k: string) => new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" }).format(d(k + "-01"));
export const fmtMUR = (n: number) => `MUR ${n.toLocaleString(LOCALE)}`;
/** Liste des jours ISO d'une plage [start, end]. */
export const eachDay = (start: string, end: string): string[] => { const out: string[] = []; for (let x = start; x <= end && out.length < 31; x = shiftDate(x, 1)) out.push(x); return out; };
