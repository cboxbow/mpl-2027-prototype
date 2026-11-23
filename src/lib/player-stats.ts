/** Statistiques et évolution d'un joueur (données fictives). Fonctions pures. */
import { COUNTED_RESULTS } from "@/config/demo-config";
import { DEMO_TODAY, shiftDate } from "@/lib/format";
import { buildRanking, type RankingRow } from "@/data/demo";
import { playerMatches, type PlayerMatch } from "@/data/matches";

export interface PartnerStat { partnerId: string; tournaments: number; matches: number; wins: number; best: string; last: string }
export interface PlayerStats { matches: number; wins: number; losses: number; winRate: number | null; setsWon: number; setsLost: number; titles: number; finals: number; tournaments: number; partners: PartnerStat[]; bestRound: "W" | "F" | "SF" | "QF" | null }
const RANK_OF_ROUND: Record<string, number> = { W: 0, F: 1, SF: 2, QF: 3 };
export function setsOf(score: string): { won: number; lost: number } {
  let won = 0, lost = 0; for (const s of score.split(" ")) { const [a, b] = s.split("-").map(Number); if (a > b) won++; else if (b > a) lost++; } return { won, lost };
}
export function playerStats(id: string, row?: RankingRow, matches: PlayerMatch[] = playerMatches(id)): PlayerStats {
  const wins = matches.filter((m) => m.won).length; let sw = 0, sl = 0; for (const m of matches) { const s = setsOf(m.score); sw += s.won; sl += s.lost; }
  const results = row?.results ?? [];
  const by = new Map<string, PartnerStat>();
  for (const r of results) { const s = by.get(r.partner) ?? { partnerId: r.partner, tournaments: 0, matches: 0, wins: 0, best: r.round, last: r.date }; s.tournaments++; if (RANK_OF_ROUND[r.round] < RANK_OF_ROUND[s.best]) s.best = r.round; if (r.date > s.last) s.last = r.date; by.set(r.partner, s); }
  for (const m of matches) { const s = by.get(m.partnerId); if (s) { s.matches++; if (m.won) s.wins++; } }
  const best = results.length ? (results.map((r) => r.round).sort((a, b) => RANK_OF_ROUND[a] - RANK_OF_ROUND[b])[0] as PlayerStats["bestRound"]) : null;
  return { matches: matches.length, wins, losses: matches.length - wins, winRate: matches.length ? Math.round((wins / matches.length) * 100) : null, setsWon: sw, setsLost: sl, titles: results.filter((r) => r.round === "W").length, finals: results.filter((r) => r.round === "F" || r.round === "W").length, tournaments: results.length, partners: [...by.values()].sort((a, b) => b.tournaments - a.tournaments || b.last.localeCompare(a.last)), bestRound: best };
}
export interface RankPoint { asOf: string; rank: number | null; points: number }
/** Rang et points (Top 8) aux n derniers points mensuels de contrôle, du plus ancien au plus récent. */
export function rankHistory(id: string, g: "M" | "F", n = 6, step = 30): RankPoint[] {
  const out: RankPoint[] = [];
  for (let k = n - 1; k >= 0; k--) { const asOf = shiftDate(DEMO_TODAY, -step * k); const rows = buildRanking(g, asOf); const i = rows.findIndex((r) => r.player.id === id); out.push({ asOf, rank: i < 0 ? null : i + 1, points: i < 0 ? 0 : rows[i].points }); }
  return out;
}
export { COUNTED_RESULTS };
