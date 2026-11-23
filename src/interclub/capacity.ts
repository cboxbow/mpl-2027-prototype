/**
 * D1 — SIMULATEUR DE CAPACITÉ (SIMULATION, aucune règle officielle).
 * Reproduit MODELE_CAPACITE_INTERCLUB_2027.xlsx (phase 4D.0). Hypothèses affichées à l'écran.
 * Distinction essentielle : « terrains existants » (liste MPL) ≠ « terrains réellement disponibles le vendredi 17h–21h » (à collecter, aucun engagement d'hôte).
 */
export interface DivisionPlan { code: string; level: string; max: number; teams: number; pools: number; semis: number; finals: number; homeAway: boolean; active: boolean }
/** 7 divisions proposées (DEC-IC-05, non approuvées) ; poules et phases finales : onglet INPUTS du modèle. */
export const DEFAULT_DIVISIONS: DivisionPlan[] = [
  { code: "D1H", level: "Masters", max: 6, teams: 6, pools: 1, semis: 0, finals: 0, homeAway: true, active: true },
  { code: "D2H", level: "Challenger", max: 12, teams: 12, pools: 3, semis: 2, finals: 1, homeAway: true, active: true },
  { code: "D3H", level: "Open", max: 12, teams: 12, pools: 3, semis: 2, finals: 1, homeAway: true, active: true },
  { code: "D4H", level: "Rising", max: 16, teams: 16, pools: 4, semis: 2, finals: 1, homeAway: true, active: true },
  { code: "D1F", level: "Masters", max: 4, teams: 4, pools: 1, semis: 0, finals: 0, homeAway: true, active: true },
  { code: "D2F", level: "Challenger", max: 6, teams: 6, pools: 1, semis: 0, finals: 0, homeAway: true, active: true },
  { code: "D3F", level: "Open", max: 8, teams: 8, pools: 2, semis: 2, finals: 1, homeAway: true, active: true },
];
export const DIVISION_CODES = DEFAULT_DIVISIONS.map((d) => d.code);
/** 18 clubs et 65 terrains : liste MPL (terrains EXISTANTS, pas disponibilité du vendredi). */
export const MPL_COURTS_REFERENCE: Array<{ name: string; courts: number }> = [
  { name: "RM Club Forbach", courts: 7 }, { name: "Isla Padel Grand Baie", courts: 6 }, { name: "Cana Beau Plan", courts: 5 }, { name: "RM Club Tamarin", courts: 5 },
  { name: "Urban Sport Black River", courts: 4 }, { name: "SPARC Cascavelle", courts: 4 }, { name: "I Padel RM Hennessy", courts: 4 }, { name: "Moka Rangers", courts: 4 },
  { name: "Club Med Albion", courts: 3 }, { name: "Urban Sport Grand Baie", courts: 3 }, { name: "Labourdonnais Mapou", courts: 3 }, { name: "I Padel RM Port Chambly", courts: 3 },
  { name: "Studio By RM Azuri", courts: 3 }, { name: "Terres Brunes S&L", courts: 3 }, { name: "Mont Choisy Golf", courts: 2 }, { name: "Oxygen Moka", courts: 2 },
  { name: "Club House", courts: 2 }, { name: "Energia Pte Cannonniers", courts: 2 },
];
/** Dix journées proposées (CAL v2, PROPOSITION non approuvée). J1–J6 : poules ; J7–J10 : phases finales. */
export const PROPOSED_DATES = ["2027-02-19", "2027-03-19", "2027-04-16", "2027-05-21", "2027-06-18", "2027-07-16", "2027-09-17", "2027-10-15", "2027-11-12", "2027-11-26"];
export const POOL_DAYS = 6;
/** Fenêtre horaire et durées : un format A = 2 vagues, un format C = 3 vagues (FRIDAY_NIGHT_CAPACITY_2027.md). */
export const FORMAT_MINUTES = { A: { match: 90, warmup: 10 }, C: { match: 60, warmup: 10 } } as const;
export type MatchFormat = keyof typeof FORMAT_MINUTES;
export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + (m || 0); };
export const wavesFor = (format: MatchFormat, start = "17:00", end = "21:00") => { const f = FORMAT_MINUTES[format]; return Math.max(0, Math.floor((toMin(end) - toMin(start)) / (f.match + f.warmup))); };

export interface ClubCourts { name: string; courts: number; /** Terrains RÉELLEMENT disponibles le vendredi (déclarés), prioritaires sur la part globale. */ available?: number }
export interface CapacityInputs {
  divisions: DivisionPlan[]; /** Part des terrains libérés (0–1) quand la disponibilité du club n'est pas déclarée. */ share: number; waves: number; reserve: number; matchesPerTie: number;
  clubs: ClubCourts[]; /** Disponibilité par journée (0–1), J1..J10. */ dateFactors?: number[];
}
export const poolTies = (d: DivisionPlan) => (!d.active || d.pools === 0 ? 0 : d.pools * (d.teams / d.pools) * (d.teams / d.pools - 1) * (d.homeAway ? 1 : 0.5));
export const divisionTies = (d: DivisionPlan) => (d.active ? poolTies(d) + d.semis + d.finals : 0);
const roundDown = (x: number) => Math.floor(x + 1e-6);
export const freedCourts = (c: ClubCourts, share: number, factor = 1) => (c.available !== undefined ? roundDown(c.available * factor) : roundDown(c.courts * share * factor));
export const clubTies = (c: ClubCourts, share: number, waves: number, mpt: number, factor = 1) => roundDown((waves * freedCourts(c, share, factor)) / mpt);
export type Verdict = "impossible" | "overload" | "ok";
export interface DateLoad { n: number; date: string; kind: "pools" | "finals"; factor: number; theoretical: number; recommended: number; load: number | null; verdict: Verdict | "n/a" }
export interface RiskItem { code: "above_theoretical" | "above_recommended" | "tight" | "odd_pool" | "full_availability" | "no_host_commitment" | "date_overload" | "weekday_unconfirmed"; level: "high" | "medium" | "info"; params?: Record<string, string | number> }
export interface CapacityResult {
  teams: number; loadPerFriday: number; matchesPerFriday: number; theoretical: number; recommended: number; ratioRecommended: number | null; ratioTheoretical: number | null;
  clubsNeeded: number | null; courtsNeeded: number | null; courtsShare: number | null; totalCourts: number; totalFreed: number; totalTies: number; totalMatches: number; phaseTies: number;
  verdict: Verdict; perDate: DateLoad[]; risks: RiskItem[]; clubRows: Array<{ name: string; courts: number; freed: number; ties: number; cumTies: number; cumCourts: number }>;
}
export function computeCapacity(inp: CapacityInputs): CapacityResult {
  const act = inp.divisions.filter((d) => d.active);
  const teams = act.reduce((a, d) => a + d.teams, 0);
  const loadPerFriday = act.reduce((a, d) => a + d.teams / 2, 0);
  const rows0 = inp.clubs.map((c) => ({ c, freed: freedCourts(c, inp.share), ties: clubTies(c, inp.share, inp.waves, inp.matchesPerTie) }));
  const sorted = [...rows0].sort((a, b) => b.ties - a.ties || b.c.courts - a.c.courts);
  let cumT = 0, cumC = 0; const clubRows = sorted.map((r) => { cumT += r.ties; if (r.ties > 0) cumC += r.freed; return { name: r.c.name, courts: r.c.courts, freed: r.freed, ties: r.ties, cumTies: cumT, cumCourts: cumC }; });
  const theoretical = cumT; const totalFreed = rows0.reduce((a, r) => a + r.freed, 0); const totalCourts = inp.clubs.reduce((a, c) => a + c.courts, 0);
  const recommended = roundDown(theoretical * inp.reserve);
  const possible = loadPerFriday <= theoretical;
  let clubsNeeded: number | null = null, courtsNeeded: number | null = null;
  if (possible) { clubsNeeded = loadPerFriday === 0 ? 0 : clubRows.filter((r) => r.cumTies < loadPerFriday).length + 1; courtsNeeded = clubsNeeded === 0 ? 0 : clubRows[clubsNeeded - 1].cumCourts; }
  const verdict: Verdict = loadPerFriday > theoretical ? "impossible" : loadPerFriday > recommended ? "overload" : "ok";
  const totalTies = inp.divisions.reduce((a, d) => a + divisionTies(d), 0); const phaseTies = act.reduce((a, d) => a + d.semis + d.finals, 0);
  const factors = inp.dateFactors ?? PROPOSED_DATES.map(() => 1);
  const perDate: DateLoad[] = PROPOSED_DATES.map((date, i) => {
    const f = factors[i] ?? 1; const th = inp.clubs.reduce((a, c) => a + clubTies(c, inp.share, inp.waves, inp.matchesPerTie, f), 0); const rec = roundDown(th * inp.reserve);
    const pools = i < POOL_DAYS; const load = pools ? loadPerFriday : null;
    return { n: i + 1, date, kind: pools ? "pools" : "finals", factor: f, theoretical: th, recommended: rec, load, verdict: load === null ? "n/a" : load > th ? "impossible" : load > rec ? "overload" : "ok" };
  });
  const risks: RiskItem[] = [];
  if (verdict === "impossible") risks.push({ code: "above_theoretical", level: "high", params: { load: loadPerFriday, cap: theoretical } });
  else if (verdict === "overload") risks.push({ code: "above_recommended", level: "high", params: { load: loadPerFriday, cap: recommended } });
  else if (recommended > 0 && loadPerFriday >= 0.9 * recommended) risks.push({ code: "tight", level: "medium", params: { load: loadPerFriday, cap: recommended } });
  const odd = act.filter((d) => d.pools > 0 && d.teams % d.pools !== 0).map((d) => d.code); if (odd.length) risks.push({ code: "odd_pool", level: "medium", params: { divisions: odd.join(", ") } });
  const over = perDate.filter((d) => d.verdict === "impossible" || d.verdict === "overload").map((d) => `J${d.n}`); if (over.length && verdict === "ok") risks.push({ code: "date_overload", level: "high", params: { dates: over.join(", ") } });
  if (inp.share >= 1 && inp.clubs.every((c) => c.available === undefined)) risks.push({ code: "full_availability", level: "medium" });
  risks.push({ code: "no_host_commitment", level: "info" }); risks.push({ code: "weekday_unconfirmed", level: "info" });
  return { teams, loadPerFriday, matchesPerFriday: loadPerFriday * inp.matchesPerTie, theoretical, recommended, ratioRecommended: recommended === 0 ? null : loadPerFriday / recommended, ratioTheoretical: theoretical === 0 ? null : loadPerFriday / theoretical, clubsNeeded, courtsNeeded, courtsShare: courtsNeeded === null || totalCourts === 0 ? null : courtsNeeded / totalCourts, totalCourts, totalFreed, totalTies, totalMatches: totalTies * inp.matchesPerTie, phaseTies, verdict, perDate, risks, clubRows };
}
/** Scénarios de la phase 4D.0. */
export type ScenarioKey = "s64" | "s52" | "custom";
export const scenarioDivisions = (k: ScenarioKey, base: DivisionPlan[] = DEFAULT_DIVISIONS): DivisionPlan[] => base.map((d) => ({ ...d, teams: d.max, active: k === "s52" && d.code === "D2H" ? false : true }));
export const defaultInputs = (k: ScenarioKey = "s64"): CapacityInputs => ({ divisions: scenarioDivisions(k), share: 1, waves: wavesFor("A"), reserve: 0.75, matchesPerTie: 3, clubs: MPL_COURTS_REFERENCE.map((c) => ({ ...c })), dateFactors: PROPOSED_DATES.map(() => 1) });
/** Charge à partir d'engagements de démonstration. HYPOTHÈSE du simulateur : poules et phases finales du modèle conservées (poules ≤ équipes/2), non réglementaire. */
export const teamsByDivision = (counts: Record<string, number>, base: DivisionPlan[] = DEFAULT_DIVISIONS): DivisionPlan[] => base.map((d) => ({ ...d, teams: counts[d.code] ?? 0, pools: Math.max(0, Math.min(d.pools, Math.floor((counts[d.code] ?? 0) / 2))), semis: (counts[d.code] ?? 0) > 0 ? d.semis : 0, finals: (counts[d.code] ?? 0) > 0 ? d.finals : 0 }));
