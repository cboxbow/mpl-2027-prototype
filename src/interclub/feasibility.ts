/**
 * D2.1 — DIAGNOSTIC DE FAISABILITÉ DU CALENDRIER (pur). Tout résultat est une SIMULATION : les ajustements proposés ne sont jamais des décisions réglementaires.
 */
import { DEFAULT_DIVISIONS } from "./capacity";
import { effPerDay, hostCapacity, tieMinutes, wavesOf, finalsPlanOf, type Adjustment, type Conflict, type ScheduleRun } from "./schedule";
import { parseTeam } from "./pools";

export interface DivDiag {
  code: string; teams: number; pools: number; legs: "single" | "double"; /** Rondes nécessaires (à une rencontre par équipe et par jour). */ rounds: number; /** Dates disponibles pour les rondes de poule de cette division. */ daysAvailable: number;
  missingRounds: number; ties: number; scheduled: number; unscheduled: number; structural: number; noHost: number; unavailable: number; moved: number; conflicts: number;
  finalsTotal: number; finalsScheduled: number; coverage: number; verdict: "ok" | "partial" | "blocked";
}
export interface DayNeed { day: number; date: string; pool: number; finals: number; demand: number; /** Rencontres que les hôtes peuvent accueillir ce jour-là (toutes divisions). */ capacity: number; deficit: number; scheduled: number; courtsNeeded: number | null; courtsAvailable: number; hostsAvailable: number }
export type BlockerCode = "rounds_exceed_days" | "capacity_deficit" | "finals_no_date" | "no_wave" | "no_hosts";
export interface Blocker { code: BlockerCode; params: Record<string, string | number> }
export interface Diagnostic {
  verdict: "feasible" | "partial" | "blocked";
  totals: { poolTies: number; finals: number; total: number; poolMatches: number; totalMatches: number; scheduled: number; coverage: number; poolCoverage: number; structural: number; noHost: number; moved: number; conflicts: number; neutral: number; capacityTotal: number; demandTotal: number };
  waves: number; tieMinutes: number; divisions: DivDiag[]; needs: DayNeed[]; conflictsByDivision: Record<string, Conflict[]>; adjustments: Adjustment[]; blockers: Blocker[];
}
export function diagnose(run: ScheduleRun): Diagnostic {
  const p = run.params; const pd = effPerDay(p); const waves = wavesOf(p); const divs = [...new Set(run.ties.map((t) => t.division))]; const order = DEFAULT_DIVISIONS.map((d) => d.code);
  divs.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const divDiag: DivDiag[] = divs.map((code) => {
    const ts = run.ties.filter((t) => t.division === code); const fs = run.finals.filter((f) => f.division === code); const teams = new Set(ts.flatMap((t) => [t.home, t.away])); const pools = new Set(ts.map((t) => t.pool)).size;
    const R = Math.max(0, ...ts.map((t) => t.round)); const rDays = Math.ceil(R / pd); const plan = finalsPlanOf(code); const lim = plan.semis > 0 && p.reserveFinals ? Math.min(p.poolDays, rDays) : p.poolDays;
    const sch = ts.filter((t) => t.status === "scheduled").length; const structural = ts.filter((t) => t.reasons.includes("rounds_exceed_days")).length;
    const fSch = fs.filter((f) => f.status === "scheduled").length; const tot = ts.length + fs.length; const cov = tot ? (sch + fSch) / tot : 1;
    return { code, teams: teams.size, pools, legs: p.legs, rounds: R, daysAvailable: lim, missingRounds: Math.max(0, rDays - lim), ties: ts.length, scheduled: sch, unscheduled: ts.length - sch, structural, noHost: ts.filter((t) => t.status === "unscheduled" && t.reasons.includes("no_host")).length,
      unavailable: ts.filter((t) => t.status === "unscheduled" && t.reasons.some((r) => r.startsWith("team_unavailable:"))).length, moved: ts.filter((t) => t.status === "scheduled" && t.day !== t.wantedDay).length,
      conflicts: run.conflicts.filter((c) => c.tieIds.some((id) => id.startsWith(code + "."))).length, finalsTotal: fs.length, finalsScheduled: fSch, coverage: cov, verdict: cov === 1 && structural === 0 ? "ok" : sch + fSch === 0 ? "blocked" : "partial" };
  });
  const hosts = Object.values(run.hosts); const needs: DayNeed[] = p.dates.map((date, i) => { const day = i + 1;
    const pool = run.ties.filter((t) => t.wantedDay === day).length; const finals = run.finals.filter((f) => f.wantedDay === day).length; const demand = pool + finals;
    const capacity = hosts.reduce((a, h) => a + hostCapacity(h, day, p), 0); const avail = hosts.filter((h) => hostCapacity(h, day, p) > 0);
    return { day, date, pool, finals, demand, capacity, deficit: Math.max(0, demand - capacity), scheduled: [...run.ties, ...run.finals].filter((t) => t.day === day && t.status === "scheduled").length, courtsNeeded: waves > 0 ? Math.ceil(demand / waves) * p.courtsPerTie : null, courtsAvailable: avail.reduce((a, h) => a + h.courts, 0), hostsAvailable: avail.length }; });
  const blockers: Blocker[] = [];
  if (waves === 0) blockers.push({ code: "no_wave", params: { minutes: tieMinutes(p), window: `${p.startTime}–${p.endTime}` } });
  if (!hosts.length) blockers.push({ code: "no_hosts", params: {} });
  for (const d of divDiag) { if (d.missingRounds > 0) blockers.push({ code: "rounds_exceed_days", params: { division: d.code, rounds: d.rounds, days: d.daysAvailable, missing: d.missingRounds } }); }
  for (const f of run.finals.filter((x) => x.reasons.includes("no_free_day"))) if (!blockers.some((b) => b.code === "finals_no_date" && b.params.division === f.division)) blockers.push({ code: "finals_no_date", params: { division: f.division, day: f.wantedDay, dates: p.dates.length } });
  for (const n of needs) if (n.deficit > 0) blockers.push({ code: "capacity_deficit", params: { day: n.day, demand: n.demand, capacity: n.capacity } });
  const poolTies = run.ties.length, finals = run.finals.length, total = poolTies + finals; const sch = run.stats.scheduled + run.stats.finalsScheduled;
  const conflictsByDivision: Record<string, Conflict[]> = {}; for (const c of run.conflicts) { const div = c.tieIds[0]?.split(".")[0] ?? "?"; (conflictsByDivision[div] ??= []).push(c); }
  const verdict: Diagnostic["verdict"] = sch === total && run.conflicts.length === 0 ? "feasible" : sch === 0 ? "blocked" : "partial";
  return { verdict, waves, tieMinutes: tieMinutes(p), divisions: divDiag, needs, conflictsByDivision, adjustments: run.adjustments, blockers,
    totals: { poolTies, finals, total, poolMatches: poolTies * p.matchesPerTie, totalMatches: total * p.matchesPerTie, scheduled: sch, coverage: total ? sch / total : 1, poolCoverage: poolTies ? run.stats.scheduled / poolTies : 1, structural: run.stats.structural, noHost: run.ties.filter((t) => t.reasons.includes("no_host") && t.status === "unscheduled").length, moved: run.stats.moved, conflicts: run.conflicts.length, neutral: run.stats.neutral, capacityTotal: needs.reduce((a, n) => a + n.capacity, 0), demandTotal: needs.reduce((a, n) => a + n.demand, 0) } };
}
/** Export CSV du rapport de faisabilité (BOM + filigrane). `L` fournit les libellés traduits. */
export function feasibilityCsv(d: Diagnostic, L: Record<string, string>, nameOf: (id: string) => string, sep = ";"): string {
  const esc = (v: string | number) => { const s = String(v ?? ""); return /["\r\n;,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows: Array<Array<string | number>> = [[L.watermark], [], [L.summary], [L.verdict, L[d.verdict]], [L.coverage, `${Math.round(d.totals.coverage * 100)} %`], [L.poolTies, d.totals.poolTies], [L.finals, d.totals.finals], [L.total, d.totals.total], [L.scheduled, d.totals.scheduled], [L.structural, d.totals.structural], [L.noHost, d.totals.noHost], [L.moved, d.totals.moved], [L.conflicts, d.totals.conflicts], [], [L.byDivision],
    [L.division, L.teams, L.pools, L.rounds, L.daysAvailable, L.missingRounds, L.ties, L.scheduled, L.unscheduled, L.structural, L.noHost, L.finals, L.coverage], ...d.divisions.map((x) => [x.code, x.teams, x.pools, x.rounds, x.daysAvailable, x.missingRounds, x.ties, x.scheduled, x.unscheduled, x.structural, x.noHost, `${x.finalsScheduled}/${x.finalsTotal}`, `${Math.round(x.coverage * 100)} %`]), [], [L.needs],
    [L.day, L.date, L.poolTies, L.finals, L.demand, L.capacity, L.deficit, L.courtsNeeded, L.courtsAvailable, L.hosts], ...d.needs.map((n) => [`J${n.day}`, n.date, n.pool, n.finals, n.demand, n.capacity, n.deficit, n.courtsNeeded ?? "—", n.courtsAvailable, n.hostsAvailable]), [], [L.blockers], ...d.blockers.map((b) => [b.code, JSON.stringify(b.params)]), [], [L.adjustments], ...d.adjustments.map((a) => [a.code, JSON.stringify(a.params ?? {})])];
  void nameOf; return "﻿" + rows.map((r) => r.map(esc).join(sep)).join("\r\n");
}
void parseTeam;
