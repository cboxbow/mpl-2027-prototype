/**
 * Historique de matchs FICTIF : dérivé des résultats fictifs (placements) selon exactement la même structure que le tableau affiché
 * sur la page d'une épreuve terminée. Mêmes scores que le tableau (illustratifs). Jamais de juniors, jamais de données réelles.
 */
import { CALENDAR_EVENTS } from "./calendar.generated";
import { DRAW_RESULTS, type DrawResult } from "./demo";

const SCORES = ["6-3 6-4", "7-5 6-2", "6-4 3-6 6-3", "6-2 6-1", "7-6 6-4", "6-3 7-5", "4-6 6-3 6-4", "6-0 6-3"];
/** Score illustratif (vue du vainqueur) du match n° i d'un tableau : 0-3 quarts, 4-5 demies, 6 finale. */
export const matchScore = (i: number) => SCORES[i % 8];

export type MatchRound = "QF" | "SF" | "F";
export interface DrawMatch { eventId: string; draw: "M" | "F"; round: MatchRound; idx: number; winner: [string, string]; loser: [string, string]; score: string; date: string }
const END = new Map(CALENDAR_EVENTS.map((e) => [e.id, e.end]));
/** Placements → clés du tableau (W, F, SF1, SF2, QF1..QF4), puis les 7 matchs du tableau. */
export function drawMatches(d: DrawResult): DrawMatch[] {
  const P: Record<string, [string, string]> = {}; let sf = 0, qf = 0;
  for (const p of d.placements) { const k = p.round === "SF" ? `SF${++sf}` : p.round === "QF" ? `QF${++qf}` : p.round; P[k] = p.pair; }
  const spec: Array<[MatchRound, string, string]> = [["QF", "W", "QF1"], ["QF", "SF1", "QF3"], ["QF", "F", "QF2"], ["QF", "SF2", "QF4"], ["SF", "W", "SF1"], ["SF", "F", "SF2"], ["F", "W", "F"]];
  return spec.map(([round, w, l], i) => ({ eventId: d.eventId, draw: d.draw, round, idx: i, winner: P[w], loser: P[l], score: matchScore(i), date: END.get(d.eventId) ?? "" }));
}
export const ALL_MATCHES: DrawMatch[] = DRAW_RESULTS.flatMap(drawMatches);

export interface PlayerMatch { eventId: string; draw: "M" | "F"; round: MatchRound; date: string; won: boolean; partnerId: string; opponents: [string, string]; score: string }
/** Matchs d'un joueur du plus récent au plus ancien (le score est toujours donné du point de vue du joueur). */
export function playerMatches(id: string): PlayerMatch[] {
  const out: PlayerMatch[] = [];
  for (const m of ALL_MATCHES) {
    const w = m.winner.includes(id), l = m.loser.includes(id); if (!w && !l) continue;
    const team = w ? m.winner : m.loser; const partnerId = team[0] === id ? team[1] : team[0];
    const score = w ? m.score : m.score.split(" ").map((s) => s.split("-").reverse().join("-")).join(" ");
    out.push({ eventId: m.eventId, draw: m.draw, round: m.round, date: m.date, won: w, partnerId, opponents: w ? m.loser : m.winner, score });
  }
  const order: Record<MatchRound, number> = { F: 0, SF: 1, QF: 2 };
  return out.sort((a, b) => b.date.localeCompare(a.date) || order[a.round] - order[b.round]);
}
