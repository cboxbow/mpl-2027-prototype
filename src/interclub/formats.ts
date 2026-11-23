/**
 * D2.1 — MATHÉMATIQUE DES FORMATS INTERCLUB (fonctions pures).
 * Vocabulaire strict (ENCOUNTER_CALCULATION_2027 §1) :
 *  MATCH = 1 double ; RENCONTRE = 3 matchs entre deux équipes ; RONDE = tour sportif où chaque équipe joue au plus une rencontre ;
 *  DATE = vendredi proposé ; CRÉNEAU = vague horaire d'une soirée ; TERRAIN ; CLUB HÔTE.
 * Aucun chiffre n'est ajusté pour concorder avec un document : tout est recalculé à partir de (équipes, poules, aller simple/retour, phases finales).
 */
import { DEFAULT_DIVISIONS, POOL_DAYS, PROPOSED_DATES } from "./capacity";

export type Legs = "single" | "double";
export interface FormatInput { code: string; teams: number; pools: number; /** ½ finales (0 ou 2). */ semis: number; /** Finales (0 ou 1). */ finals: number; active: boolean }
export const poolSizeList = (n: number, k: number): number[] => (k <= 0 || n <= 0 ? [] : Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0)));
/** Rencontres d'une poule de n équipes. */
export const tiesOfPool = (n: number, legs: Legs) => (n < 2 ? 0 : (legs === "double" ? n * (n - 1) : (n * (n - 1)) / 2));
/** Rondes minimales d'une poule : n−1 (n pair) ou n (n impair, une équipe exempte par ronde), doublées en aller-retour. */
export const roundsOfPool = (n: number, legs: Legs) => (n < 2 ? 0 : (n % 2 === 0 ? n - 1 : n) * (legs === "double" ? 2 : 1));
export const tiesPerRound = (n: number) => Math.floor(n / 2);

export interface FormatRow {
  code: string; active: boolean; teams: number; pools: number; sizes: number[]; legs: Legs;
  tiesSingle: number; tiesDouble: number; ties: number; rounds: number; roundsSingle: number; roundsDouble: number;
  semis: number; finals: number; finalsTies: number; stageDays: number; daysNeeded: number;
  /** Rondes de poule qui ne tiennent pas dans les journées de poule disponibles (à une rencontre par équipe et par jour). */ missingPoolRounds: number;
  /** Journées manquantes pour poules + ½ finales + finale dans les dates proposées. */ missingTotalDays: number;
  matches: number; finalsMatches: number; perRound: number; semisDay: number | null; finalDay: number | null;
}
export interface FormatOptions { legs: Legs; legsBy?: Record<string, Legs>; /** Journées disponibles pour les rondes de poule. */ poolDays: number; /** Nombre de dates proposées. */ dates: number; matchesPerTie: number; /** Rencontres max par équipe et par jour (1 sauf autorisation réglementaire explicite). */ perDay: 1 | 2 }
export const defaultFormatOptions = (): FormatOptions => ({ legs: "double", poolDays: POOL_DAYS, dates: PROPOSED_DATES.length, matchesPerTie: 3, perDay: 1 });
export const formatInputs = (activeOverride: Record<string, boolean> = {}): FormatInput[] => DEFAULT_DIVISIONS.map((d) => ({ code: d.code, teams: d.teams, pools: d.pools, semis: d.semis, finals: d.finals, active: activeOverride[d.code] ?? d.active }));

export function formatRow(d: FormatInput, o: FormatOptions, teamsOverride?: number): FormatRow {
  const teams = d.active ? (teamsOverride ?? d.teams) : 0; const sizes = d.active ? poolSizeList(teams, d.pools) : []; const legs = o.legsBy?.[d.code] ?? o.legs;
  const tiesSingle = sizes.reduce((a, n) => a + tiesOfPool(n, "single"), 0), tiesDouble = sizes.reduce((a, n) => a + tiesOfPool(n, "double"), 0);
  const roundsSingle = sizes.length ? Math.max(...sizes.map((n) => roundsOfPool(n, "single"))) : 0, roundsDouble = sizes.length ? Math.max(...sizes.map((n) => roundsOfPool(n, "double"))) : 0;
  const rounds = legs === "double" ? roundsDouble : roundsSingle; const ties = legs === "double" ? tiesDouble : tiesSingle;
  const semis = d.active ? d.semis : 0, finals = d.active ? d.finals : 0; const stageDays = (semis > 0 ? 1 : 0) + (finals > 0 ? 1 : 0);
  const poolCap = o.poolDays * o.perDay; const daysNeeded = Math.ceil(rounds / o.perDay) + stageDays;
  return { code: d.code, active: d.active, teams, pools: sizes.length, sizes, legs, tiesSingle, tiesDouble, ties, rounds, roundsSingle, roundsDouble, semis, finals, finalsTies: semis + finals, stageDays, daysNeeded,
    missingPoolRounds: Math.max(0, rounds - poolCap), missingTotalDays: Math.max(0, daysNeeded - o.dates), matches: ties * o.matchesPerTie, finalsMatches: (semis + finals) * o.matchesPerTie, perRound: sizes.reduce((a, n) => a + tiesPerRound(n), 0),
    semisDay: semis > 0 ? Math.ceil(rounds / o.perDay) + 1 : null, finalDay: finals > 0 ? Math.ceil(rounds / o.perDay) + (semis > 0 ? 2 : 1) : null };
}
export interface DayLoad { day: number; pool: number; semis: number; finals: number; total: number }
export interface FormatReport { rows: FormatRow[]; totals: { teams: number; ties: number; finalsTies: number; totalTies: number; matches: number; totalMatches: number; minDates: number; missingPoolRounds: number; structurallyFeasible: boolean }; profile: DayLoad[]; options: FormatOptions }
/** Charge nominale par date : chaque division joue sa ronde r à la date r, ½ finales à la date suivante, finale ensuite (calendrier v3 : J7 ½, J8 finales). */
export function loadProfile(rows: FormatRow[], dates: number, perDay: 1 | 2 = 1): DayLoad[] {
  const out: DayLoad[] = Array.from({ length: dates }, (_, i) => ({ day: i + 1, pool: 0, semis: 0, finals: 0, total: 0 }));
  for (const r of rows) { if (!r.active) continue; const R = Math.ceil(r.rounds / perDay);
    for (let d = 1; d <= Math.min(R, dates); d++) out[d - 1].pool += r.perRound * (perDay === 2 && d * 2 > r.rounds ? 1 : perDay);
    if (r.semisDay && r.semisDay <= dates) out[r.semisDay - 1].semis += r.semis; if (r.finalDay && r.finalDay <= dates) out[r.finalDay - 1].finals += r.finals; }
  for (const d of out) d.total = d.pool + d.semis + d.finals; return out;
}
export function formatReport(inputs: FormatInput[], o: FormatOptions = defaultFormatOptions(), teamsBy: Record<string, number> = {}): FormatReport {
  const rows = inputs.map((d) => formatRow(d, o, teamsBy[d.code])); const sum = (f: (r: FormatRow) => number) => rows.reduce((a, r) => a + f(r), 0);
  const ties = sum((r) => r.ties), finalsTies = sum((r) => r.finalsTies);
  return { rows, options: o, profile: loadProfile(rows, o.dates, o.perDay), totals: { teams: sum((r) => r.teams), ties, finalsTies, totalTies: ties + finalsTies, matches: ties * o.matchesPerTie, totalMatches: (ties + finalsTies) * o.matchesPerTie,
    minDates: Math.max(0, ...rows.map((r) => r.daysNeeded)), missingPoolRounds: sum((r) => r.missingPoolRounds), structurallyFeasible: rows.every((r) => r.missingPoolRounds === 0 && r.missingTotalDays === 0) } };
}
/** Variantes de référence du document ENCOUNTER_CALCULATION_2027 (calculées, jamais recopiées). */
export function referenceVariants() {
  const base = formatInputs(); const o = { ...defaultFormatOptions(), poolDays: 10 };
  const d3fFinalOnly = base.map((d) => (d.code === "D3F" ? { ...d, semis: 0 } : d));
  const p2 = base.map((d) => (d.code === "D1H" || d.code === "D2F" ? { ...d, semis: 2, finals: 1 } : d));
  return {
    v30_d3f_b: formatReport(base, o), v30_d3f_a: formatReport(d3fFinalOnly, o),
    p2: formatReport(p2, { ...o, legsBy: { D1H: "single", D2F: "single" } }),
    sans_d2h: formatReport(formatInputs({ D2H: false }), o),
  };
}
