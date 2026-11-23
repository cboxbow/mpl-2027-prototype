/**
 * D2.1 — SCÉNARIOS COMPARATIFS (purs, déterministes). Hypothèses fixes, affichées dans chaque résultat :
 *  • équipes : scénario fictif au maximum de chaque division (64 équipes, ou 52 sans D2H), un club par division ;
 *  • hôtes : les 18 clubs MPL, terrains = ⌊terrains existants × part supposée libre⌋, aucune disponibilité déclarée (supposés disponibles) ;
 *  • poules : formats de travail D1H 1, D2H 3, D3H 3, D4H 4, D1F 1, D2F 1, D3F 2 ; tirage à graine fixe ; ½ finales/finales : créneaux réservés ;
 *  • fenêtre 17h00–21h00 ; hôtes neutres autorisés ; une seule rencontre par équipe et par jour (aucune autorisation réglementaire de deux).
 * Modes de rencontre : « simultané » = 3 matchs en même temps sur 3 terrains (matchs de 90 min, 2 vagues) ; « un terrain » = 3 matchs à la suite sur 1 terrain
 * (matchs de 60 min car 3 × 100 min dépassent la fenêtre de 240 min ; 1 vague). Interprétation à faire valider.
 */
import { DEFAULT_DIVISIONS, FORMAT_MINUTES } from "./capacity";
import { DEFAULT_FORMATS, drawPools, teamsFor } from "./pools";
import { defaultSchedParams, generateSchedule, hostsFor, type SchedParams, type ScheduleRun } from "./schedule";
import { diagnose, type Diagnostic } from "./feasibility";

export type TieMode = "simultaneous" | "single_court";
export interface ScenarioSpec { legs: "single" | "double"; poolDays: number; share: number; d2h: boolean; mode: TieMode }
export interface ScenarioResult { spec: ScenarioSpec; id: string; teams: number; waves: number; tieMinutes: number; diag: Diagnostic; coverage: number; poolScheduled: number; poolTotal: number; finalsScheduled: number; finalsTotal: number; structural: number; noHost: number; capacityTotal: number; demandTotal: number; blockers: string[] }
export const scenarioParams = (spec: ScenarioSpec): SchedParams => ({ ...defaultSchedParams(), legs: spec.legs, poolDays: spec.poolDays, share: spec.share, courtsPerTie: spec.mode === "simultaneous" ? 3 : 1,
  matchMin: spec.mode === "simultaneous" ? FORMAT_MINUTES.A.match : FORMAT_MINUTES.C.match, warmupMin: spec.mode === "simultaneous" ? FORMAT_MINUTES.A.warmup : FORMAT_MINUTES.C.warmup });
export const scenarioId = (s: ScenarioSpec) => `${s.legs === "single" ? "AS" : "AR"}-${s.poolDays}j-${Math.round(s.share * 100)}%-${s.d2h ? "D2H" : "sansD2H"}-${s.mode === "simultaneous" ? "3T" : "1T"}`;
export function runScenarioRun(spec: ScenarioSpec, seed = 2027): ScheduleRun {
  const p = scenarioParams(spec); const sets = DEFAULT_DIVISIONS.filter((d) => spec.d2h || d.code !== "D2H").map((d) => ({ division: d.code, pools: drawPools(teamsFor(d.code, [], "demo_full", d.max), DEFAULT_FORMATS[d.code], seed) }));
  const clubs = [...new Set(sets.flatMap((s) => s.pools.flat().map((t) => t.split("|")[0])))];
  return generateSchedule(sets, hostsFor(clubs, [], p), p, { version: 1, at: "scenario", by: "simulation" });
}
export function runScenario(spec: ScenarioSpec): ScenarioResult {
  const run = runScenarioRun(spec); const diag = diagnose(run);
  return { spec, id: scenarioId(spec), teams: new Set(run.ties.flatMap((t) => [t.home, t.away])).size, waves: diag.waves, tieMinutes: diag.tieMinutes, diag, coverage: diag.totals.coverage, poolScheduled: run.stats.scheduled, poolTotal: run.stats.total, finalsScheduled: run.stats.finalsScheduled, finalsTotal: run.stats.finalsTotal,
    structural: run.stats.structural, noHost: diag.totals.noHost, capacityTotal: diag.totals.capacityTotal, demandTotal: diag.totals.demandTotal, blockers: [...new Set(diag.blockers.map((b) => b.code))] };
}
export function scenarioMatrix(): ScenarioResult[] {
  const out: ScenarioResult[] = [];
  for (const mode of ["simultaneous", "single_court"] as TieMode[]) for (const d2h of [true, false]) for (const legs of ["double", "single"] as const) for (const poolDays of [6, 10]) for (const share of [0.5, 0.75, 1]) out.push(runScenario({ legs, poolDays, share, d2h, mode }));
  return out;
}
