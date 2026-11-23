/** Passerelle entre le store de démo, les inscriptions (entries.ts) et le moteur illustratif (bracket.ts). */
import type { CalendarEvent } from "@/data/calendar.generated";
import { RANKING_F, RANKING_M, displayName, type Division } from "@/data/demo";
import { allEntries, type EntryCtx, type EntryRow } from "@/lib/entries";
import { buildDraw, resolveDraw, type Built, type DMatch, type DrawConfig, type Resolved, type Sched } from "@/lib/bracket";
import { matchKey, drawKey, type DemoState } from "@/lib/demo-state";
import { tr, trDyn } from "@/lib/i18n";
import { eachDay } from "@/lib/format";

const POINTS = new Map<string, number>([...RANKING_M, ...RANKING_F].map((r) => [r.player.id, r.points]));
/** Valeur de tête de série (démo) : somme des points de classement des deux joueurs. */
export const seedValue = (r: EntryRow) => (POINTS.get(r.a.id) ?? 0) + (POINTS.get(r.b.id) ?? 0);
/** Paires confirmées d'une épreuve/division, triées par valeur de tête de série décroissante (ordre stable). */
export function confirmedPairs(ev: CalendarEvent, division: Division, ctx: EntryCtx): EntryRow[] {
  return allEntries(ev, division, ctx).filter((e) => e.status === "confirmed").map((e, i) => ({ e, i })).sort((x, y) => seedValue(y.e) - seedValue(x.e) || x.i - y.i).map((x) => x.e);
}
export interface DrawView { cfg: DrawConfig; built: Built; resolved: Map<string, Resolved>; teams: Map<string, EntryRow>; days: string[]; sched: (id: string) => Sched; stateOf: (id: string) => ReturnType<typeof stateAt>; changed: boolean }
const stateAt = (s: Pick<DemoState, "matches">, ev: string, div: string, id: string) => s.matches[matchKey(ev, div, id)];
export function drawView(s: Pick<DemoState, "draws" | "matches" | "registrations" | "org">, ev: CalendarEvent, division: Division): DrawView | null {
  const cfg = s.draws[drawKey(ev.id, division)]; if (!cfg) return null;
  const teams = new Map(allEntries(ev, division, s).map((r) => [r.key, r])); const built = buildDraw(cfg);
  const stateOf = (id: string) => stateAt(s, ev.id, division, id); const resolved = resolveDraw(built, stateOf);
  const confirmedNow = new Set(confirmedPairs(ev, division, s).map((r) => r.key));
  const changed = cfg.entries.some((k) => !confirmedNow.has(k)) || [...confirmedNow].some((k) => !cfg.entries.includes(k));
  return { cfg, built, resolved, teams, days: eachDay(ev.start, ev.end), sched: (id) => { const m = stateOf(id); return { court: m?.court, day: m?.day, time: m?.time }; }, stateOf, changed };
}
export const teamName = (v: DrawView, key: string | null | "bye", short = false) => { if (key === "bye") return tr("BYE"); if (!key) return tr("To be determined"); const r = v.teams.get(key); if (!r) return key; return short ? `${r.a.last} / ${r.b.last}` : `${displayName(r.a)} / ${displayName(r.b)}`; };
export const teamPlayers = (v: DrawView, key: string | null | "bye"): string[] => { if (!key || key === "bye") return []; const r = v.teams.get(key); return r ? [r.a.id, r.b.id] : []; };
export const matchLabel = (m: DMatch) => (m.id === "F" ? tr("Final") : m.id === "3P" ? tr("3rd place") : m.id === "5P" ? tr("5th place") : m.id === "7P" ? tr("7th place") : m.kind === "group" ? trDyn(`Group ${m.label.slice(6)}`) : m.kind === "qual" ? trDyn(m.label) : m.label.startsWith("5–8") ? trDyn(m.label) : m.label);
export const roundLabel = (r: string) => ({ QR: tr("Qualifying"), G: tr("Groups"), R32: tr("Round of 32"), R16: tr("Round of 16"), QF: tr("Quarter-finals"), SF: tr("Semi-finals"), F: tr("Final"), P: tr("Placement matches") }[r] ?? r);
export const statusLabel = (s: Resolved["status"]) => ({ bye: tr("BYE"), waiting: tr("Waiting"), ready: tr("Ready"), scheduled: tr("Scheduled"), live: tr("Live"), pending: tr("Pending validation"), done: tr("Completed") }[s]);
