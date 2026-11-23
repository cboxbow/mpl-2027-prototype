/**
 * D2/D2.1 — GÉNÉRATEUR DE CALENDRIER INTERCLUB (fonctions pures, déterministes).
 * ⚠ Dates = proposition (CAL v2/v3, non approuvée). Qualification pour les phases finales NON figée : les ½ finales et finales sont des
 * créneaux RÉSERVÉS (équipes « à désigner »), jamais des rencontres entre équipes nommées.
 * Notions distinctes : RONDE sportive (ordre dans la poule) ≠ DATE (vendredi) ≠ RENCONTRE (3 matchs) ≠ CRÉNEAU (vague horaire) ≠ TERRAIN ≠ CLUB HÔTE.
 * Ne force jamais un calendrier irréalisable : une rencontre impossible reste « non programmée » avec ses raisons et des ajustements proposés.
 * Une équipe ne joue jamais deux rencontres le même jour sans autorisation réglementaire explicite (`twoPerDayAuthorized`, jamais activée par défaut).
 */
import { CLUBS } from "@/data/clubs";
import { DEFAULT_DIVISIONS, PROPOSED_DATES, FORMAT_MINUTES, toMin } from "./capacity";
import type { Avail, Dossier } from "./engagement";
import { parseTeam } from "./pools";

export interface SchedParams {
  dates: string[]; /** Dates utilisables pour les rondes de poule (1..dates.length). */ poolDays: number; legs: "double" | "single";
  /** Rencontres max par équipe et par jour : 2 n'est appliqué QUE si `twoPerDayAuthorized` (autorisation réglementaire explicite, inexistante à ce jour). */ perDay: 1 | 2; twoPerDayAuthorized: boolean;
  startTime: string; endTime: string; matchMin: number; warmupMin: number; matchesPerTie: number;
  /** Terrains mobilisés simultanément par une rencontre : 3 = les 3 matchs en même temps ; 1 = les 3 matchs à la suite sur un seul terrain. */ courtsPerTie: 1 | 2 | 3;
  /** Réserver les ½ finales et finales (équipes à désigner). */ reserveFinals: boolean;
  allowNeutralHost: boolean; unknownAvailable: boolean; maybeAvailable: boolean;
  /** Part des terrains existants supposés libres si le club n'a pas déclaré ses terrains du vendredi (ESTIMATION). */ share: number;
  /** Hôte imposé par la Commission : tieId → clubId (appliqué seulement s'il est réalisable). */ overrides: Record<string, string>;
}
export const defaultSchedParams = (): SchedParams => ({ dates: [...PROPOSED_DATES], poolDays: PROPOSED_DATES.length, legs: "double", perDay: 1, twoPerDayAuthorized: false, startTime: "17:00", endTime: "21:00", matchMin: FORMAT_MINUTES.A.match, warmupMin: FORMAT_MINUTES.A.warmup, matchesPerTie: 3, courtsPerTie: 3, reserveFinals: true, allowNeutralHost: true, unknownAvailable: true, maybeAvailable: true, share: 0.5, overrides: {} });
export const effPerDay = (p: Pick<SchedParams, "perDay" | "twoPerDayAuthorized">): 1 | 2 => (p.twoPerDayAuthorized ? p.perDay : 1);
/** Durée d'occupation d'un groupe de terrains par une rencontre = matchs successifs × (match + échauffement). */
export const tieMinutes = (p: SchedParams) => Math.ceil(p.matchesPerTie / Math.max(1, p.courtsPerTie)) * (p.matchMin + p.warmupMin);
/** Vagues (créneaux) possibles dans la fenêtre horaire. */
export const wavesOf = (p: SchedParams) => Math.max(0, Math.floor((toMin(p.endTime) - toMin(p.startTime)) / Math.max(1, tieMinutes(p))));
export interface HostInfo { clubId: string; courts: number; availability: Avail[]; /** true = estimation (pas de déclaration du vendredi). */ estimated: boolean }
export function hostsFor(clubIds: string[], dossiers: Dossier[], p: Pick<SchedParams, "share">): Record<string, HostInfo> {
  const out: Record<string, HostInfo> = {};
  for (const id of clubIds) { const d = dossiers.find((x) => x.clubId === id && Object.values(x.lines).some((l) => l.status !== "draft")); const club = CLUBS.find((c) => c.id === id);
    out[id] = d ? { clubId: id, courts: d.form.hosting.fridayCourts, availability: d.form.availability, estimated: false } : { clubId: id, courts: Math.floor((club?.courtsMax ?? 0) * p.share), availability: Array(10).fill("") as Avail[], estimated: true }; }
  return out;
}
export const availOk = (a: Avail | undefined, p: Pick<SchedParams, "unknownAvailable" | "maybeAvailable">) => (a === "yes" ? true : a === "no" ? false : a === "maybe" ? p.maybeAvailable : p.unknownAvailable);
/** Rencontres simultanées par vague sur un site. */
export const slotsPerWave = (courts: number, courtsPerTie: number) => Math.floor(courts / Math.max(1, courtsPerTie));
/** Capacité d'un hôte sur une date = vagues × rencontres simultanées ; nulle si indisponible. */
export const hostCapacity = (h: HostInfo | undefined, day: number, p: SchedParams) => (!h || !availOk(h.availability[day - 1], p) ? 0 : wavesOf(p) * slotsPerWave(h.courts, p.courtsPerTie));
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const waveStart = (w: number, p: SchedParams) => hhmm(toMin(p.startTime) + w * tieMinutes(p));

/** Rondes aller simple par la méthode du cercle ; domicile choisi pour équilibrer domicile/extérieur (déficit le plus grand d'abord). */
export function roundRobin(teams: string[]): Array<Array<[string, string]>> {
  const arr = [...teams]; if (arr.length % 2) arr.push("__bye__"); const m = arr.length; const out: Array<Array<[string, string]>> = []; const diff = new Map<string, number>();
  for (let r = 0; r < m - 1; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < m / 2; i++) { const a = arr[i], b = arr[m - 1 - i]; if (a === "__bye__" || b === "__bye__") continue; const da = diff.get(a) ?? 0, db = diff.get(b) ?? 0; const aHome = da !== db ? da < db : (i + r) % 2 === 0; const [h, x] = aHome ? [a, b] : [b, a]; diff.set(h, (diff.get(h) ?? 0) + 1); diff.set(x, (diff.get(x) ?? 0) - 1); pairs.push([h, x]); }
    out.push(pairs); arr.splice(1, 0, arr.pop()!);
  }
  return out;
}
export interface Tie { id: string; division: string; pool: number; round: number; leg: 1 | 2; wantedDay: number; home: string; away: string; day: number | null; date: string | null; host: string | null; hostKind: "home" | "away" | "neutral" | null; wave: number | null; time: string | null; courts: number[]; status: "scheduled" | "unscheduled"; reasons: string[] }
/** ½ finale / finale RÉSERVÉE : équipes à désigner (qualification non figée) ; occupe un hôte, jamais une équipe. */
export interface FinalSlot { id: string; division: string; stage: "SF1" | "SF2" | "F"; wantedDay: number; day: number | null; date: string | null; host: string | null; wave: number | null; time: string | null; courts: number[]; status: "scheduled" | "unscheduled"; reasons: string[] }
export interface Conflict { code: "team_double_booked" | "court_double_booked" | "host_over_capacity" | "host_unavailable" | "team_unavailable" | "outside_dates"; tieIds: string[]; params?: Record<string, string | number> }
export interface Adjustment { code: "single_leg" | "two_per_day" | "extra_days" | "split_pool" | "declare_courts" | "allow_neutral" | "confirm_availability" | "reduce_teams" | "shorter_matches" | "fewer_courts_per_tie"; params?: Record<string, string | number> }
export interface Balance { team: string; home: number; away: number; diff: number }
export interface ScheduleRun {
  version: number; at: string; by: string; params: SchedParams; ties: Tie[]; finals: FinalSlot[]; conflicts: Conflict[]; adjustments: Adjustment[]; balance: Balance[];
  stats: { total: number; scheduled: number; unscheduled: number; neutral: number; estimatedHosts: number; unknownAvailability: number; byDivision: Record<string, { total: number; scheduled: number }>;
    finalsTotal: number; finalsScheduled: number; /** Rencontres jouées à une autre date que leur ronde nominale. */ moved: number; /** Rencontres non placées parce que le format exige plus de rondes que de journées. */ structural: number };
  complete: boolean; hosts: Record<string, HostInfo>; ignoredOverrides: string[];
}
export interface PoolSet { division: string; pools: string[][] }
/** Plan de phases finales d'une division (½ finales puis finale), selon DEFAULT_DIVISIONS ; qualification non figée. */
export const finalsPlanOf = (division: string) => { const d = DEFAULT_DIVISIONS.find((x) => x.code === division); return { semis: d?.semis ?? 0, finals: d?.finals ?? 0 }; };

export function generateSchedule(pools: PoolSet[], hosts: Record<string, HostInfo>, p: SchedParams, meta: { version: number; at: string; by: string }): ScheduleRun {
  const ties: Tie[] = []; const finals: FinalSlot[] = []; const nDay = p.dates.length; const pd = effPerDay(p); const poolDays = Math.min(p.poolDays, nDay);
  const limitOf = new Map<string, number>(); const roundsOf = new Map<string, number>(); const structuralDiv = new Set<string>();
  for (const ps of pools) {
    let R = 0;
    ps.pools.forEach((teams, pi) => {
      const rr = roundRobin(teams); const rounds = p.legs === "double" ? [...rr, ...rr.map((r) => r.map(([h, a]) => [a, h] as [string, string]))] : rr; R = Math.max(R, rounds.length);
      rounds.forEach((pairs, ri) => pairs.forEach(([h, a], ix) => { const leg: 1 | 2 = p.legs === "double" && ri >= rr.length ? 2 : 1; const wanted = Math.floor(ri / pd) + 1;
        ties.push({ id: `${ps.division}.P${pi + 1}.R${ri + 1}.${ix + 1}`, division: ps.division, pool: pi + 1, round: ri + 1, leg, wantedDay: wanted, home: h, away: a, day: null, date: null, host: null, hostKind: null, wave: null, time: null, courts: [], status: "unscheduled", reasons: [] }); }));
    });
    const plan = finalsPlanOf(ps.division); const rDays = Math.ceil(R / pd); roundsOf.set(ps.division, R);
    // Les ½ finales suivent la dernière ronde ; avant elles, seules les dates de poule restantes sont utilisables.
    const limit = plan.semis > 0 && p.reserveFinals ? Math.min(poolDays, rDays) : poolDays; limitOf.set(ps.division, limit);
    if (rDays > limit) structuralDiv.add(ps.division);
    if (p.reserveFinals && R > 0) { let day = rDays + 1; const add = (stage: FinalSlot["stage"]) => finals.push({ id: `${ps.division}.${stage}`, division: ps.division, stage, wantedDay: day, day: null, date: null, host: null, wave: null, time: null, courts: [], status: "unscheduled", reasons: [] });
      if (plan.semis > 0) { add("SF1"); add("SF2"); day++; } if (plan.finals > 0) add("F"); }
  }
  const teamDay = new Map<string, number>(); const slotUse = new Map<string, number>(); const ignored: string[] = [];
  const key = (c: string, d: number) => `${c}|${d}`; const clubOk = (club: string, day: number) => availOk(hosts[club]?.availability[day - 1], p);
  const spw = (c: string) => Math.max(1, slotsPerWave(hosts[c]?.courts ?? 0, p.courtsPerTie)); const remaining = (c: string, d: number) => hostCapacity(hosts[c], d, p) - (slotUse.get(key(c, d)) ?? 0);
  type Slot = { host: string; wave: number; courts: number[] };
  const take = (c: string, d: number): Slot => { const used = slotUse.get(key(c, d)) ?? 0; slotUse.set(key(c, d), used + 1); const slot = used % spw(c); return { host: c, wave: Math.floor(used / spw(c)), courts: Array.from({ length: p.courtsPerTie }, (_, i) => slot * p.courtsPerTie + i + 1) }; };
  const neutralOrder = (d: number, skip: string[]) => Object.keys(hosts).filter((c) => !skip.includes(c) && remaining(c, d) > 0).sort((x, y) => remaining(y, d) - remaining(x, d) || x.localeCompare(y));
  type Try = { ok: true; host: string; kind: "home" | "away" | "neutral" } | { ok: false; reason: string };
  const tryPlace = (t: Tie, day: number): Try => {
    if (day < 1 || day > (limitOf.get(t.division) ?? poolDays)) return { ok: false, reason: "no_free_day" };
    if ((teamDay.get(key(t.home, day)) ?? 0) >= pd || (teamDay.get(key(t.away, day)) ?? 0) >= pd) return { ok: false, reason: "team_busy" };
    const hc = parseTeam(t.home).clubId, ac = parseTeam(t.away).clubId;
    for (const c of [hc, ac]) if (hosts[c] && !clubOk(c, day)) return { ok: false, reason: `team_unavailable:${c}` };
    const ov = p.overrides[t.id]; const cands: Array<[string, "home" | "away" | "neutral"]> = [];
    if (ov) cands.push([ov, ov === hc ? "home" : ov === ac ? "away" : "neutral"]);
    cands.push([hc, "home"]); if (p.allowNeutralHost) { cands.push([ac, "away"]); for (const c of neutralOrder(day, [hc, ac])) cands.push([c, "neutral"]); }
    for (const [c, kind] of cands) if (remaining(c, day) > 0) return { ok: true, host: c, kind };
    return { ok: false, reason: "no_host" };
  };
  const place = (t: Tie, day: number, r: Extract<Try, { ok: true }>) => {
    const sl = take(r.host, day); t.day = day; t.date = p.dates[day - 1]; t.host = r.host; t.hostKind = r.kind; t.wave = sl.wave; t.time = waveStart(sl.wave, p); t.courts = sl.courts; t.status = "scheduled"; t.reasons = [];
    teamDay.set(key(t.home, day), (teamDay.get(key(t.home, day)) ?? 0) + 1); teamDay.set(key(t.away, day), (teamDay.get(key(t.away, day)) ?? 0) + 1);
    if (p.overrides[t.id] && p.overrides[t.id] !== r.host) ignored.push(t.id);
  };
  // 0. Contrôle structurel : plus de rondes que de journées → rien n'est placé pour cette division (jamais de calendrier partiel trompeur).
  for (const t of ties) if (structuralDiv.has(t.division)) t.reasons = ["rounds_exceed_days"];
  const todo = ties.filter((t) => !structuralDiv.has(t.division));
  // 1. Phases finales réservées (dates déterministes, hôte neutre à désigner) ; impossibles si le format est structurellement bloqué.
  for (const f of finals) { if (structuralDiv.has(f.division)) { f.reasons = ["rounds_exceed_days"]; continue; } if (f.wantedDay > nDay) { f.reasons = ["no_free_day"]; continue; }
    const c = neutralOrder(f.wantedDay, [])[0]; if (!c) { f.reasons = ["no_host"]; continue; } const sl = take(c, f.wantedDay); Object.assign(f, { day: f.wantedDay, date: p.dates[f.wantedDay - 1], host: c, wave: sl.wave, time: waveStart(sl.wave, p), courts: sl.courts, status: "scheduled", reasons: [] }); }
  // 2. Rencontres de poule : date nominale de la ronde, puis réparation sur une autre date autorisée de la division (jamais de forçage).
  const order = [...todo].sort((a, b) => a.wantedDay - b.wantedDay || a.division.localeCompare(b.division) || a.pool - b.pool || a.id.localeCompare(b.id)); const failed: Tie[] = [];
  for (const t of order) { const r = tryPlace(t, t.wantedDay); if (r.ok) place(t, t.wantedDay, r); else { t.reasons = [r.reason]; failed.push(t); } }
  for (const t of failed) { const lim = limitOf.get(t.division) ?? poolDays; const days = Array.from({ length: lim }, (_, i) => i + 1).filter((d) => d !== t.wantedDay).sort((a, b) => Math.abs(a - t.wantedDay) - Math.abs(b - t.wantedDay) || a - b); for (const d of days) { const r = tryPlace(t, d); if (r.ok) { place(t, d, r); break; } } }
  for (const t of ties) if (t.status === "unscheduled" && !t.reasons.length) t.reasons = ["no_free_day"];
  const conflicts = detectConflicts(ties, hosts, p, finals); const adjustments = proposeAdjustments(ties, finals, p, hosts, [...structuralDiv], roundsOf, limitOf);
  const teams = new Set(ties.flatMap((t) => [t.home, t.away])); const balance: Balance[] = [...teams].map((team) => { const home = ties.filter((t) => t.home === team).length, away = ties.filter((t) => t.away === team).length; return { team, home, away, diff: home - away }; });
  const byDivision: Record<string, { total: number; scheduled: number }> = {}; for (const t of ties) { const b = (byDivision[t.division] ??= { total: 0, scheduled: 0 }); b.total++; if (t.status === "scheduled") b.scheduled++; }
  const used = new Set([...ties, ...finals].filter((t) => t.host).map((t) => t.host!)); const scheduled = ties.filter((t) => t.status === "scheduled");
  const unknown = scheduled.filter((t) => [parseTeam(t.home).clubId, parseTeam(t.away).clubId, t.host!].some((c) => (hosts[c]?.availability[t.day! - 1] ?? "") === "")).length;
  return { version: meta.version, at: meta.at, by: meta.by, params: p, ties, finals, conflicts, adjustments, balance, stats: { total: ties.length, scheduled: scheduled.length, unscheduled: ties.length - scheduled.length, neutral: scheduled.filter((t) => t.hostKind !== "home").length, estimatedHosts: [...used].filter((c) => hosts[c]?.estimated).length, unknownAvailability: unknown, byDivision,
    finalsTotal: finals.length, finalsScheduled: finals.filter((f) => f.status === "scheduled").length, moved: scheduled.filter((t) => t.day !== t.wantedDay).length, structural: ties.filter((t) => t.reasons.includes("rounds_exceed_days")).length }, complete: ties.every((t) => t.status === "scheduled") && finals.every((f) => f.status === "scheduled"), hosts, ignoredOverrides: ignored };
}
/** Contrôle indépendant d'un calendrier (utilisé aussi sur des calendriers modifiés à la main). Les créneaux de phases finales comptent pour la capacité des hôtes. */
export function detectConflicts(ties: Tie[], hosts: Record<string, HostInfo>, p: SchedParams, finals: FinalSlot[] = []): Conflict[] {
  const out: Conflict[] = []; const sch = ties.filter((t) => t.status === "scheduled" && t.day); const fs = finals.filter((f) => f.status === "scheduled" && f.day); const pd = effPerDay(p);
  const byTeam = new Map<string, Tie[]>(); const byCourt = new Map<string, string[]>(); const byHost = new Map<string, string[]>();
  const addHost = (id: string, h: string, d: number, w: number | null, courts: number[]) => { for (const c of courts) { const k = `${h}|${d}|${w}|${c}`; byCourt.set(k, [...(byCourt.get(k) ?? []), id]); } const hk = `${h}|${d}`; byHost.set(hk, [...(byHost.get(hk) ?? []), id]); };
  for (const t of sch) { for (const tm of [t.home, t.away]) { const k = `${tm}|${t.day}`; byTeam.set(k, [...(byTeam.get(k) ?? []), t]); } addHost(t.id, t.host!, t.day!, t.wave, t.courts); }
  for (const f of fs) addHost(f.id, f.host!, f.day!, f.wave, f.courts);
  for (const [k, v] of byTeam) if (v.length > pd) out.push({ code: "team_double_booked", tieIds: v.map((t) => t.id), params: { team: k.split("|").slice(0, 2).join("|"), day: Number(k.split("|")[2]) } });
  for (const [k, v] of byCourt) if (v.length > 1) { const [h, d, , c] = k.split("|"); out.push({ code: "court_double_booked", tieIds: v, params: { club: h, day: Number(d), court: Number(c) } }); }
  for (const [k, v] of byHost) { const [h, d] = k.split("|"); const cap = hostCapacity(hosts[h], Number(d), p); if (v.length > cap) out.push({ code: cap === 0 ? "host_unavailable" : "host_over_capacity", tieIds: v, params: { club: h, day: Number(d), n: v.length, cap } }); }
  for (const t of sch) { if (t.day! > p.dates.length || t.day! < 1) out.push({ code: "outside_dates", tieIds: [t.id] }); for (const c of [parseTeam(t.home).clubId, parseTeam(t.away).clubId]) if (hosts[c] && !availOk(hosts[c].availability[t.day! - 1], p)) out.push({ code: "team_unavailable", tieIds: [t.id], params: { club: c, day: t.day! } }); }
  return out;
}
/** Ajustements À SIMULER (jamais appliqués automatiquement, jamais des décisions réglementaires). Agrégés par division / par date. */
export function proposeAdjustments(ties: Tie[], finals: FinalSlot[], p: SchedParams, hosts: Record<string, HostInfo>, structural: string[], roundsOf: Map<string, number>, limitOf: Map<string, number>): Adjustment[] {
  const out: Adjustment[] = []; const add = (a: Adjustment) => { if (!out.some((x) => x.code === a.code && JSON.stringify(x.params) === JSON.stringify(a.params))) out.push(a); }; const pd = effPerDay(p);
  for (const d of structural) { const R = roundsOf.get(d) ?? 0; const lim = limitOf.get(d) ?? 0; const need = Math.ceil(R / pd);
    if (p.legs === "double" && Math.ceil(R / 2 / pd) <= lim) add({ code: "single_leg", params: { division: d, rounds: Math.ceil(R / 2), days: lim } });
    if (!p.twoPerDayAuthorized && Math.ceil(R / 2) <= lim) add({ code: "two_per_day", params: { division: d, rounds: R, days: lim } });
    add({ code: "extra_days", params: { division: d, missing: Math.max(0, need - lim), days: lim } }); add({ code: "split_pool", params: { division: d } }); }
  const noHost = ties.filter((t) => t.reasons.includes("no_host")); const days = [...new Set(noHost.map((t) => t.wantedDay))].sort((a, b) => a - b);
  for (const day of days) add({ code: "declare_courts", params: { day, n: noHost.filter((t) => t.wantedDay === day).length } });
  if (noHost.length || finals.some((f) => f.reasons.includes("no_host"))) {
    if (!p.allowNeutralHost) add({ code: "allow_neutral" });
    const alt = (q: Partial<SchedParams>) => Object.values(hosts).reduce((a, h) => a + hostCapacity(h, 1, { ...p, ...q }), 0) > Object.values(hosts).reduce((a, h) => a + hostCapacity(h, 1, p), 0);
    if (p.matchMin > FORMAT_MINUTES.C.match && alt({ matchMin: FORMAT_MINUTES.C.match })) add({ code: "shorter_matches", params: { minutes: FORMAT_MINUTES.C.match } });
    if (p.courtsPerTie > 1 && alt({ courtsPerTie: 1 }) ) add({ code: "fewer_courts_per_tie" });
  }
  const unav = new Set<string>(); for (const t of ties) for (const r of t.reasons) if (r.startsWith("team_unavailable:")) { const k = `${r.split(":")[1]}|${t.wantedDay}`; if (!unav.has(k)) { unav.add(k); add({ code: "confirm_availability", params: { club: r.split(":")[1], day: t.wantedDay } }); } }
  if (ties.some((t) => t.status === "unscheduled") && new Set(ties.filter((t) => t.status === "unscheduled").map((t) => t.division)).size > 1) add({ code: "reduce_teams" });
  return out;
}

export function scheduleCsv(run: ScheduleRun, nameOf: (clubId: string) => string, sep = ";"): string {
  const esc = (v: string | number) => { const s = String(v ?? ""); return /["\r\n;,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows: Array<Array<string | number>> = [["Division", "Pool", "Day", "Date", "Time", "Home", "Away", "Host", "Courts", "Status", "Reasons"], ...run.finals.map((f) => [f.division, f.stage, f.day ? `J${f.day}` : "", f.date ?? "", f.time ?? "", "", "", f.host ? nameOf(f.host) : "", f.courts?.length ?? "", f.status, f.reasons.join("|")]), ...run.ties.map((t) => [t.division, t.pool, t.day ? `J${t.day}` : "", t.date ?? "", t.time ?? "", nameOf(parseTeam(t.home).clubId), nameOf(parseTeam(t.away).clubId), t.host ? nameOf(t.host) : "", t.courts.join("+"), t.status, t.reasons.join("|")])];
  return "﻿" + ["MPL 2027 — DESIGN PROTOTYPE · unofficial calendar (proposed dates, not approved)", ...rows.map((r) => r.map(esc).join(sep))].join("\r\n");
}
