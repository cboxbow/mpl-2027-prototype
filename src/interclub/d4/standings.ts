/**
 * D4 — MOTEUR DE CLASSEMENT INTERCLUB (pur, configurable). Calcule, par division et par poule, les statistiques de rencontres, matchs de double, sets et jeux
 * ainsi que les « points de championnat Interclub » à partir des résultats D3 « validés en démonstration ».
 * ⚠ Les points de championnat Interclub n'ont RIEN À VOIR avec les points du classement individuel MPL (jamais lus, jamais modifiés).
 * ⚠ Barème, ordre des critères et crédits de forfait sont des HYPOTHÈSES DE SIMULATION NON APPROUVÉES. Aucun classement ici n'est officiel.
 * Aucun second moteur de score : les gagnants de matchs et de rencontres viennent de `d3/score.ts` (`evalMatch`, `tieResult`).
 */
import { evalMatch, tieResult, validSet, type ScoreConfig, type Side } from "../d3/score";
import type { Sheet } from "../d3/sheets";

export type Criterion = "points" | "matchDiff" | "setDiff" | "gameDiff" | "headToHead";
export type StatCriterion = Exclude<Criterion, "headToHead">;
export const CRITERIA: Criterion[] = ["points", "matchDiff", "setDiff", "gameDiff", "headToHead"];
export interface PointsScale { win30: number; win21: number; loss12: number; loss03: number; forfeitWin: number; forfeitLoss: number }
export interface RulesConfig {
  /** Incrémentée à chaque modification (historique des recalculs). */ version: number;
  /** Toujours faux : aucune de ces valeurs n'est approuvée par le Comité. */ approved: false;
  scale: PointsScale; order: Criterion[]; /** Critères appliqués DANS la mini-poule des équipes à égalité (confrontations directes). */ h2hOrder: StatCriterion[];
  /** Un super tie-break compte comme un set gagné et 1 jeu (sinon 0 jeu). */ stbAsGame: boolean;
  /** Crédit de stats d'un forfait de match / de paire (set et jeux du gagnant). */ walkoverSets: number; walkoverGames: number;
  /** Forfait total : crédit de stats (3 matchs W.O.) pour les modes « sans score » et « décision Commission » (le mode 3–0 crédite toujours les 3 W.O.). */ creditTieForfeitStats: boolean;
  /** Nombre d'équipes qualifiées pour les phases finales (= 2 × demi-finales). */ pairing: "seeded" | "cross_pool"; useBestRunnersUp: boolean;
}
/** Valeurs de simulation — NON APPROUVÉES. */
export const defaultRules = (): RulesConfig => ({ version: 1, approved: false, scale: { win30: 3, win21: 2, loss12: 1, loss03: 0, forfeitWin: 3, forfeitLoss: 0 },
  order: ["points", "matchDiff", "setDiff", "gameDiff", "headToHead"], h2hOrder: ["points", "matchDiff", "setDiff", "gameDiff"], stbAsGame: true, walkoverSets: 2, walkoverGames: 12, creditTieForfeitStats: false, pairing: "seeded", useBestRunnersUp: true });
export const RULES_MAX_POINTS = 20;

export type OutcomeMode = "validated" | "preview";
export interface TieOutcome {
  sheetId: string; division: string; pool: number; round: number; phase: "pool" | "SF1" | "SF2" | "F"; day: number; date: string; home: string; away: string;
  /** « counted » = résultat validé en démonstration ; « preview » = aperçu avant validation (jamais définitif). */ status: "counted" | "preview"; stage: Sheet["stage"];
  mA: number; mB: number; sA: number; sB: number; gA: number; gB: number; winner: Side; kind: "3-0" | "2-1" | "1-2" | "0-3" | "forfeit"; forfeit: boolean; ptsA: number; ptsB: number; label: string;
}
export type SkipReason = "not_validated" | "contested" | "cancelled" | "incomplete" | "orphan" | "postponed" | "interrupted" | "correction" | "forfeit_pending";
export interface Skipped { sheetId: string; division: string; pool: number; phase: TieOutcome["phase"]; reason: SkipReason; stage: Sheet["stage"] }
export const phaseOf = (s: Sheet): TieOutcome["phase"] => ((s as Sheet & { phase?: TieOutcome["phase"] }).phase ?? "pool");

function matchStats(ms: Sheet["matches"], cfg: ScoreConfig, r: RulesConfig) {
  const t = { mA: 0, mB: 0, sA: 0, sB: 0, gA: 0, gB: 0 };
  for (const m of ms) {
    const ev = evalMatch(m, cfg); if (!ev.winner) continue; if (ev.winner === "A") t.mA++; else t.mB++;
    if (m.kind === "walkover_pair" || m.kind === "walkover_match") { if (ev.winner === "A") { t.sA += r.walkoverSets; t.gA += r.walkoverGames; } else { t.sB += r.walkoverSets; t.gB += r.walkoverGames; } continue; }
    for (const s of m.sets) { if (!validSet(s, cfg)) continue; if (s.kind === "stb") { if (s.a > s.b) { t.sA++; t.gA += r.stbAsGame ? 1 : 0; } else { t.sB++; t.gB += r.stbAsGame ? 1 : 0; } continue; } if (s.a > s.b) t.sA++; else t.sB++; t.gA += s.a; t.gB += s.b; }
  }
  return t;
}
/** Résultat d'une feuille (ou raison d'exclusion). Une feuille non validée n'est JAMAIS comptée comme définitive. */
export function outcomeOf(sh: Sheet, cfg: ScoreConfig, r: RulesConfig, mode: OutcomeMode, cancelled: boolean): { outcome?: TieOutcome; skip?: Skipped } {
  const base = { sheetId: sh.id, division: sh.division, pool: sh.pool, phase: phaseOf(sh), stage: sh.stage };
  if (cancelled) return { skip: { ...base, reason: "cancelled" } }; if (sh.orphan) return { skip: { ...base, reason: "orphan" } };
  const counted = sh.stage === "validated_demo"; const preview = mode === "preview" && ["submitted", "referee_checked"].includes(sh.stage);
  if (!counted && !preview) return { skip: { ...base, reason: sh.stage === "contested" ? "contested" : sh.stage === "postponed" ? "postponed" : sh.stage === "interrupted" ? "interrupted" : sh.stage === "correction_requested" ? "correction" : sh.flag === "forfeit" ? "forfeit_pending" : "not_validated" } };
  const status: TieOutcome["status"] = counted ? "counted" : "preview"; const sc = r.scale;
  const head = { ...base, round: sh.round, day: sh.day, date: sh.date, home: sh.home, away: sh.away, status };
  if (sh.flag === "forfeit" && sh.forfeit) {
    const winner: Side = sh.forfeit.side === "A" ? "B" : "A"; const credit = sh.forfeit.mode === "three_zero" || r.creditTieForfeitStats;
    const st = sh.forfeit.mode === "three_zero" ? matchStats(sh.matches, cfg, r) : credit ? matchStats([0, 1, 2].map(() => ({ kind: "walkover_match" as const, sets: [], side: sh.forfeit!.side, proofs: [] })), cfg, r) : { mA: 0, mB: 0, sA: 0, sB: 0, gA: 0, gB: 0 };
    return { outcome: { ...head, ...st, winner, kind: "forfeit", forfeit: true, ptsA: winner === "A" ? sc.forfeitWin : sc.forfeitLoss, ptsB: winner === "B" ? sc.forfeitWin : sc.forfeitLoss, label: "W.O." } };
  }
  const res = tieResult(sh.matches, cfg); if (!res.complete || !res.winner) return { skip: { ...base, reason: "incomplete" } };
  const st = matchStats(sh.matches, cfg, r); const w = res.winner; const big = Math.max(res.a, res.b) === 3;
  const kind = (w === "A" ? (big ? "3-0" : "2-1") : big ? "0-3" : "1-2") as TieOutcome["kind"];
  const wp = big ? sc.win30 : sc.win21, lp = big ? sc.loss03 : sc.loss12;
  return { outcome: { ...head, ...st, winner: w, kind, forfeit: false, ptsA: w === "A" ? wp : lp, ptsB: w === "B" ? wp : lp, label: res.label } };
}
export function collect(sheets: Sheet[], cfg: ScoreConfig, r: RulesConfig, mode: OutcomeMode, cancelled: Record<string, unknown>) {
  const outcomes: TieOutcome[] = []; const skipped: Skipped[] = [];
  for (const sh of sheets) { const x = outcomeOf(sh, cfg, r, mode, !!cancelled[sh.id]); if (x.outcome) outcomes.push(x.outcome); else if (x.skip) skipped.push(x.skip); }
  return { outcomes, skipped };
}

export interface Row { team: string; played: number; won: number; lost: number; forfeitsAgainst: number; mW: number; mL: number; sW: number; sL: number; gW: number; gL: number; pts: number; mDiff: number; sDiff: number; gDiff: number; preview: boolean }
const blank = (team: string): Row => ({ team, played: 0, won: 0, lost: 0, forfeitsAgainst: 0, mW: 0, mL: 0, sW: 0, sL: 0, gW: 0, gL: 0, pts: 0, mDiff: 0, sDiff: 0, gDiff: 0, preview: false });
/** Tableau brut (non classé) d'un ensemble d'équipes : seules les rencontres entre ces équipes sont comptées. */
export function buildRows(teams: string[], outs: TieOutcome[]): Row[] {
  const rows = new Map(teams.map((t) => [t, blank(t)])); const set = new Set(teams);
  for (const o of outs) {
    if (!set.has(o.home) || !set.has(o.away)) continue; const h = rows.get(o.home)!, a = rows.get(o.away)!;
    const add = (r: Row, own: "A" | "B") => { const w = o.winner === own; r.played++; if (w) r.won++; else r.lost++; if (o.forfeit && !w) r.forfeitsAgainst++; r.mW += own === "A" ? o.mA : o.mB; r.mL += own === "A" ? o.mB : o.mA; r.sW += own === "A" ? o.sA : o.sB; r.sL += own === "A" ? o.sB : o.sA; r.gW += own === "A" ? o.gA : o.gB; r.gL += own === "A" ? o.gB : o.gA; r.pts += own === "A" ? o.ptsA : o.ptsB; if (o.status === "preview") r.preview = true; };
    add(h, "A"); add(a, "B");
  }
  for (const r of rows.values()) { r.mDiff = r.mW - r.mL; r.sDiff = r.sW - r.sL; r.gDiff = r.gW - r.gL; }
  return [...rows.values()];
}
const val = (r: Row, c: StatCriterion) => (c === "points" ? r.pts : c === "matchDiff" ? r.mDiff : c === "setDiff" ? r.sDiff : r.gDiff);
/** Partition en groupes d'égalité, du meilleur au moins bon, selon un critère numérique. */
function partition(rows: Row[], key: (r: Row) => number[]): Row[][] {
  const sorted = [...rows].sort((x, y) => { const a = key(x), b = key(y); for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i]; return 0; });
  const out: Row[][] = []; for (const r of sorted) { const last = out[out.length - 1]; if (last && key(last[0]).every((v, i) => v === key(r)[i])) last.push(r); else out.push([r]); } return out;
}
export interface Ranked extends Row { rank: number; tied: boolean; /** Égalité impossible à départager par les critères configurés. */ unresolved: boolean; /** Critère qui a départagé cette équipe de ses voisines. */ sepBy: Criterion | "commission" | null }
export interface CommissionDecision { key: string; order: string[]; reason: string; at: string; by: string; rulesVersion: number }
export const tieKey = (division: string, pool: number, teams: string[]) => `${division}|P${pool}|${[...teams].sort().join(",")}`;

/** Départage récursif et configurable. Les confrontations directes se calculent dans la mini-poule des équipes à égalité ; si l'égalité persiste → « Décision Commission requise ». */
export function rankRows(rows: Row[], outs: TieOutcome[], r: RulesConfig, ctx: { division: string; pool: number; decisions?: CommissionDecision[] }): Ranked[] {
  const resolve = (group: Row[], from: number, sep: Ranked["sepBy"]): Array<{ rows: Row[]; sep: Ranked["sepBy"] }> => {
    if (group.length <= 1) return [{ rows: group, sep }];
    for (let i = from; i < r.order.length; i++) {
      const c = r.order[i]; let parts: Row[][];
      if (c === "headToHead") { const mini = buildRows(group.map((g) => g.team), outs); parts = partition(mini, (m) => r.h2hOrder.map((k) => val(m, k))).map((p) => p.map((m) => group.find((g) => g.team === m.team)!)); }
      else parts = partition(group, (x) => [val(x, c)]);
      if (parts.length === 1) continue;
      return parts.flatMap((p) => resolve(p, c === "headToHead" ? i : i + 1, c));
    }
    return [{ rows: group, sep }];
  };
  const groups = resolve(rows, 0, null); const out: Ranked[] = []; let pos = 1;
  for (const g of groups) {
    let ordered = g.rows; let sep = g.sep; let unresolved = g.rows.length > 1;
    if (unresolved) { const d = ctx.decisions?.find((x) => x.key === tieKey(ctx.division, ctx.pool, g.rows.map((x2) => x2.team))); if (d) { ordered = d.order.map((t) => g.rows.find((x2) => x2.team === t)!).filter(Boolean); unresolved = false; sep = "commission"; } }
    ordered.forEach((row, i) => out.push({ ...row, rank: unresolved ? pos : pos + i, tied: unresolved, unresolved, sepBy: sep }));
    pos += g.rows.length;
  }
  return out;
}

export interface PoolTable { division: string; pool: number; teams: string[]; rows: Ranked[]; expected: number; counted: number; preview: number; cancelled: number; complete: boolean; unresolvedGroups: string[][]; }
/** Poules reconstruites à partir du calendrier D2 (aucune autre source d'équipes). */
export function poolsOfRun(ties: Array<{ division: string; pool: number; home: string; away: string; id: string }>) {
  const m = new Map<string, { division: string; pool: number; teams: Set<string>; ids: string[] }>();
  for (const t of ties) { const k = `${t.division}|${t.pool}`; const e = m.get(k) ?? { division: t.division, pool: t.pool, teams: new Set<string>(), ids: [] }; e.teams.add(t.home); e.teams.add(t.away); e.ids.push(t.id); m.set(k, e); }
  return [...m.values()].sort((a, b) => a.division.localeCompare(b.division) || a.pool - b.pool);
}
export function poolTable(p: { division: string; pool: number; teams: Set<string> | string[]; ids: string[] }, outs: TieOutcome[], cancelledIds: Set<string>, r: RulesConfig, decisions: CommissionDecision[]): PoolTable {
  const teams = [...p.teams]; const mine = outs.filter((o) => o.division === p.division && o.pool === p.pool && o.phase === "pool"); const cancelled = p.ids.filter((id) => cancelledIds.has(`FR-${id}`)).length;
  const rows = rankRows(buildRows(teams, mine), mine, r, { division: p.division, pool: p.pool, decisions }); const counted = mine.filter((o) => o.status === "counted").length; const preview = mine.filter((o) => o.status === "preview").length; const expected = p.ids.length - cancelled;
  const groups = new Map<number, string[]>(); for (const x of rows) if (x.unresolved) groups.set(x.rank, [...(groups.get(x.rank) ?? []), x.team]);
  return { division: p.division, pool: p.pool, teams, rows, expected, counted, preview, cancelled, complete: expected > 0 && counted === expected && preview === 0, unresolvedGroups: [...groups.values()] };
}
export const stdLabel = (c: Criterion) => c;
