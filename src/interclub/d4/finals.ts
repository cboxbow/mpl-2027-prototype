/**
 * D4 — PHASES FINALES (qualification, meilleurs deuxièmes, demi-finales, finale, champion en démonstration). Fonctions pures.
 * ⚠ Toute qualification est PROVISOIRE ou « qualifiée en démonstration » : aucune équipe n'est qualifiée définitivement selon une règle non approuvée.
 * Les rencontres finales réutilisent les feuilles et le workflow D3 (créneaux « SF1 / SF2 / F » réservés par le calendrier D2).
 */
import type { FinalSlot } from "../schedule";
import { buildRows, type Row, type PoolTable, type RulesConfig, type StatCriterion, type TieOutcome } from "./standings";

export type QualStatus = "provisional" | "qualified_demo" | "pending_commission";
export type QualVia = "winner" | "runner_up" | "top" | "best_runner_up";
export interface Qualifier { team: string; division: string; seed: number; pool: number; poolRank: number; via: QualVia; status: QualStatus; row: Row }
export type FinalsAlertCode = "no_final_phase" | "pool_incomplete" | "unresolved_tie" | "unequal_pools" | "best_runner_up_rule" | "seed_tie" | "same_pool_semi" | "slot_unscheduled" | "too_many_pools" | "changed_since_generation" | "few_teams";
export interface FinalsAlert { code: FinalsAlertCode; params?: Record<string, string | number> }
export interface FinalsPlan {
  division: string; hasSemis: boolean; hasFinal: boolean; pools: number; needed: number; perPool: number; extra: number; qualifiers: Qualifier[];
  semis: Array<{ stage: "SF1" | "SF2"; a: string; b: string }>; alerts: FinalsAlert[]; /** Toutes les poules terminées, sans égalité non résolue sur les rangs de qualification. */ ready: boolean;
  /** Division sans phase finale : vainqueur de poule unique. */ poolChampion: string | null; slots: FinalSlot[];
}
const crossKey = (r: Row, order: StatCriterion[]) => order.map((c) => (c === "points" ? r.pts : c === "matchDiff" ? r.mDiff : c === "setDiff" ? r.sDiff : r.gDiff));
const cmpKey = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i]; return 0; };

export function planFinals(division: string, tables: PoolTable[], slots: FinalSlot[], r: RulesConfig, generated?: string[]): FinalsPlan {
  const mine = tables.filter((t) => t.division === division).sort((a, b) => a.pool - b.pool); const slotsOf = slots.filter((s) => s.division === division);
  const hasSemis = slotsOf.some((s) => s.stage === "SF1"); const hasFinal = slotsOf.some((s) => s.stage === "F"); const alerts: FinalsAlert[] = []; const pools = mine.length;
  const base: FinalsPlan = { division, hasSemis, hasFinal, pools, needed: hasSemis ? 4 : 0, perPool: 0, extra: 0, qualifiers: [], semis: [], alerts, ready: false, poolChampion: null, slots: slotsOf };
  if (!pools) return base;
  const order = r.order.filter((c): c is StatCriterion => c !== "headToHead");
  const allComplete = mine.every((t) => t.complete); if (!allComplete) alerts.push({ code: "pool_incomplete", params: { n: mine.filter((t) => !t.complete).length } });
  if (!hasSemis) {
    if (pools === 1) { const top = mine[0].rows[0]; const un = mine[0].unresolvedGroups.some((g) => g.includes(top?.team)); if (un) alerts.push({ code: "unresolved_tie" }); base.poolChampion = top && mine[0].complete && !un ? top.team : null; base.ready = !!base.poolChampion; }
    else alerts.push({ code: "no_final_phase" });
    return base;
  }
  const needed = 4; const perPool = Math.floor(needed / pools); const extra = needed - perPool * pools; Object.assign(base, { perPool, extra });
  if (pools > needed) { alerts.push({ code: "too_many_pools" }); return base; }
  if (new Set(mine.map((t) => t.teams.length)).size > 1) alerts.push({ code: "unequal_pools" });
  if (mine.reduce((n, t) => n + t.teams.length, 0) < needed) { alerts.push({ code: "few_teams" }); return base; }
  const q: Qualifier[] = [];
  for (const t of mine) t.rows.slice(0, perPool).forEach((row, i) => {
    q.push({ team: row.team, division, seed: 0, pool: t.pool, poolRank: i + 1, via: pools === 1 ? "top" : i === 0 ? "winner" : "runner_up", status: !t.complete ? "provisional" : "qualified_demo", row });
  });
  // Un groupe d'égalité non résolu à cheval sur la limite de qualification d'une poule bloque la qualification de ses équipes (Décision Commission requise).
  for (const t of mine) for (const g of t.unresolvedGroups) {
    const idx = t.rows.map((x, i) => (g.includes(x.team) ? i : -1)).filter((i) => i >= 0); const cutAt = perPool + (extra > 0 ? 1 : 0);
    if (Math.min(...idx) < cutAt && Math.max(...idx) >= perPool) { alerts.push({ code: "unresolved_tie", params: { pool: t.pool } }); for (const x of q) if (x.pool === t.pool && g.includes(x.team)) x.status = "pending_commission"; }
  }
  if (extra > 0) {
    if (!r.useBestRunnersUp) alerts.push({ code: "best_runner_up_rule" });
    else {
      const cands = mine.map((t) => ({ t, row: t.rows[perPool] })).filter((c): c is { t: PoolTable; row: Ranked } => !!c.row);
      cands.sort((a, b) => cmpKey(crossKey(a.row, order), crossKey(b.row, order)) || a.row.team.localeCompare(b.row.team));
      const take = cands.slice(0, extra); const cut = cands[extra]; const tieAtCut = take.length > 0 && !!cut && cmpKey(crossKey(take[take.length - 1].row, order), crossKey(cut.row, order)) === 0;
      for (const c of take) q.push({ team: c.row.team, division, seed: 0, pool: c.t.pool, poolRank: perPool + 1, via: "best_runner_up", status: !allComplete ? "provisional" : tieAtCut || c.row.unresolved ? "pending_commission" : "qualified_demo", row: c.row });
      if (tieAtCut) alerts.push({ code: "unresolved_tie" });
      alerts.push({ code: "best_runner_up_rule" });
    }
  }
  q.sort((a, b) => a.poolRank - b.poolRank || cmpKey(crossKey(a.row, order), crossKey(b.row, order)) || a.team.localeCompare(b.team));
  for (let i = 1; i < q.length; i++) if (q[i].poolRank === q[i - 1].poolRank && cmpKey(crossKey(q[i].row, order), crossKey(q[i - 1].row, order)) === 0) { if (!alerts.some((a) => a.code === "seed_tie")) alerts.push({ code: "seed_tie" }); }
  q.forEach((x, i) => { x.seed = i + 1; }); base.qualifiers = q;
  if (q.length === needed) {
    let sf: Array<[Qualifier, Qualifier]> = [[q[0], q[3]], [q[1], q[2]]];
    if (r.pairing === "cross_pool") { const opts: Array<Array<[Qualifier, Qualifier]>> = [[[q[0], q[3]], [q[1], q[2]]], [[q[0], q[2]], [q[1], q[3]]], [[q[0], q[1]], [q[2], q[3]]]]; sf = opts.find((o) => o.every(([a, b]) => a.pool !== b.pool)) ?? sf; }
    if (sf.some(([a, b]) => a.pool === b.pool)) alerts.push({ code: "same_pool_semi" });
    base.semis = [{ stage: "SF1", a: sf[0][0].team, b: sf[0][1].team }, { stage: "SF2", a: sf[1][0].team, b: sf[1][1].team }];
  }
  if (slotsOf.some((s) => s.status !== "scheduled")) alerts.push({ code: "slot_unscheduled" });
  if (generated && generated.length && JSON.stringify([...generated].sort()) !== JSON.stringify(q.map((x) => x.team).sort())) alerts.push({ code: "changed_since_generation" });
  base.ready = allComplete && q.length === needed && q.every((x) => x.status === "qualified_demo");
  return base;
}
type Ranked = PoolTable["rows"][number];

/** Vainqueur d'une rencontre finale (feuille validée en démonstration). */
export const winnerOf = (outs: TieOutcome[], sheetId: string): string | null => { const o = outs.find((x) => x.sheetId === sheetId && x.status === "counted"); return o ? (o.winner === "A" ? o.home : o.away) : null; };
export interface Champion { division: string; team: string; via: "pool" | "final" }
export function championOf(plan: FinalsPlan, outs: TieOutcome[]): Champion | null {
  if (plan.poolChampion) return { division: plan.division, team: plan.poolChampion, via: "pool" };
  if (plan.hasFinal) { const w = winnerOf(outs, `FR-${plan.division}.F`); if (w) return { division: plan.division, team: w, via: "final" }; }
  return null;
}
export { buildRows };
