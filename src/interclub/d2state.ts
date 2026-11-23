/**
 * D2 — ÉTAT ET ACTIONS (éligibilité, compositions, poules, calendrier, préparation Commission).
 * Réutilise le journal d'audit, les notifications et le store de démonstration (tranche `ic.d2`). Aucune publication officielle :
 * « Validé en démonstration » n'est pas une approbation du Comité.
 */
import type { Actor, DemoNotification, DemoState } from "@/lib/demo-state";
import { ROLE_EN, type Perm } from "@/lib/permissions";
import { REASON_MIN_LENGTH } from "@/config/demo-config";
import { DEFAULT_DIVISIONS } from "./capacity";
import { MPL_ADDRESSEE, otherClubsMap, type Dossier } from "./engagement";
import { defaultEligParams, type EligParams, type Threshold, type Waiver, type FindingCode } from "./eligibility";
import { compBlocking, compKey, emptyComposition, evaluateComposition, type CompStatus, type Composition, type Slot } from "./compositions";
import { DEFAULT_FORMATS, drawPools, parseTeam, poolIssues, teamsFor, type PoolPlan, type TeamSource } from "./pools";
import { defaultSchedParams, generateSchedule, hostsFor, type SchedParams, type ScheduleRun } from "./schedule";
import type { IcState } from "./state";

export type PrepStatus = "draft" | "to_check" | "ready" | "validated_demo";
export const PREP_ORDER: PrepStatus[] = ["draft", "to_check", "ready", "validated_demo"];
export interface PrepDecision { at: string; actor: string; key: string; from: PrepStatus; to: PrepStatus; note?: string }
export interface RunMeta { version: number; at: string; by: string; scheduled: number; unscheduled: number; conflicts: number }
export interface D2State {
  elig: EligParams; sched: SchedParams; formats: Record<string, number>; source: TeamSource; seed: number;
  waivers: Waiver[]; compositions: Record<string, Composition>; pools: Record<string, PoolPlan>;
  run: ScheduleRun | null; runSig: string; runs: RunMeta[]; prep: Record<string, PrepStatus>; decisions: PrepDecision[]; seq: number;
}
export const initialD2 = (): D2State => ({ elig: defaultEligParams(), sched: defaultSchedParams(), formats: { ...DEFAULT_FORMATS }, source: "accepted_submitted", seed: 2027, waivers: [], compositions: {}, pools: {}, run: null, runSig: "", runs: [], prep: {}, decisions: [], seq: 1 });
export function hydrateD2(raw: unknown): D2State {
  const b = initialD2(); if (!raw || typeof raw !== "object") return b; const r = raw as Partial<D2State>;
  return { ...b, ...r, elig: { ...b.elig, ...(r.elig ?? {}), thresholds: { ...(r.elig?.thresholds ?? {}) } }, sched: { ...b.sched, ...(r.sched ?? {}), overrides: { ...(r.sched?.overrides ?? {}) } }, formats: { ...b.formats, ...(r.formats ?? {}) },
    waivers: Array.isArray(r.waivers) ? r.waivers : [], compositions: { ...(r.compositions ?? {}) }, pools: { ...(r.pools ?? {}) }, runs: Array.isArray(r.runs) ? r.runs : [], prep: { ...(r.prep ?? {}) }, decisions: Array.isArray(r.decisions) ? r.decisions : [] };
}
export type D2Action =
  | { k: "eligParam"; patch: Partial<Omit<EligParams, "thresholds">> } | { k: "eligThreshold"; division: string; th: Threshold | null }
  | { k: "d2Config"; formats?: Record<string, number>; source?: TeamSource; sched?: Partial<SchedParams>; seed?: number }
  | { k: "compSave"; clubId: string; division: string; pairs: Composition["pairs"]; subs: string[]; unavail: Composition["unavail"] } | { k: "compSubmit"; clubId: string; division: string }
  | { k: "compReview"; clubId: string; division: string; status: "checked" | "returned"; reason?: string }
  | { k: "waiverRequest"; clubId: string; division: string; playerId: string; code: FindingCode; reason: string } | { k: "waiverDecide"; id: string; status: "granted" | "refused"; note?: string }
  | { k: "poolsGenerate"; division: string; seed?: number } | { k: "poolsMove"; division: string; team: string; to: number } | { k: "poolsRemove"; division: string; team: string; removed: boolean } | { k: "poolsRestore"; division: string; version: number }
  | { k: "schedGenerate" } | { k: "hostOverride"; tieId: string; host: string | null }
  | { k: "prepSet"; key: string; to: PrepStatus; note?: string };
export const D2_KINDS = new Set(["eligParam", "eligThreshold", "d2Config", "compSave", "compSubmit", "compReview", "waiverRequest", "waiverDecide", "poolsGenerate", "poolsMove", "poolsRemove", "poolsRestore", "schedGenerate", "hostOverride", "prepSet"]);
export const isD2 = (a: { k: string }): a is D2Action => D2_KINDS.has(a.k);
export function d2Guard(a: D2Action): { perm: Perm; club?: string } {
  switch (a.k) {
    case "compSave": return { perm: "composition.edit", club: a.clubId }; case "compSubmit": return { perm: "composition.submit", club: a.clubId };
    case "compReview": return { perm: "composition.review" }; case "waiverRequest": return { perm: "waiver.request", club: a.clubId }; case "waiverDecide": return { perm: "waiver.decide" };
    case "prepSet": return { perm: "prep.validate" }; case "eligParam": case "eligThreshold": return { perm: "eligibility.config" };
    default: return { perm: "d2.config" };
  }
}
type Wrapped = { type: "ic"; ic: D2Action; at: string; act?: Actor };
let nid = 0; const nId = () => "d2" + Date.now().toString(36) + (nid++).toString(36);
const who = (act?: Actor) => (act ? `${ROLE_EN[act.role]} (DEMO)` : "Unknown");
const reasonOk = (r?: string) => (r ?? "").trim().length >= REASON_MIN_LENGTH;
const note = (at: string, text: string, clubId: string): DemoNotification => ({ id: nId(), at, kind: "interclub", clubId, text });
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
export const dossierFor = (ic: IcState, clubId: string): Dossier | undefined => ic.dossiers.find((d) => d.clubId === clubId);
export const poolsSig = (d2: D2State) => JSON.stringify(Object.keys(d2.pools).sort().map((k) => [k, d2.pools[k].assignment, d2.pools[k].removed]));
/** Ensemble de poules actif (équipes retirées exclues) pour le générateur de calendrier. */
export const activePoolSets = (d2: D2State) => DEFAULT_DIVISIONS.filter((d) => d2.pools[d.code]).map((d) => ({ division: d.code, pools: d2.pools[d.code].assignment.map((p) => p.filter((t) => !d2.pools[d.code].removed.includes(t))).filter((p) => p.length) }));

export function d2Apply(s: DemoState, a: Wrapped): DemoState {
  const k = a.ic; const ic = s.ic; const d2 = ic.d2; const actor = who(a.act);
  const out = (next: D2State, action: string, ref?: string, notifs: DemoNotification[] = []): DemoState => ({ ...s, ic: { ...ic, d2: next }, audit: [{ at: a.at, actor, action, ref }, ...s.audit], notifications: [...notifs, ...s.notifications] });
  const deny = (why: string): DemoState => ({ ...s, audit: [{ at: a.at, actor, action: `Denied — ${why}` }, ...s.audit] });
  const max = (div: string) => ic.params.maxByDivision[div] ?? DEFAULT_DIVISIONS.find((d) => d.code === div)?.max ?? 0;
  const hist = (action: string, n?: string) => ({ at: a.at, actor, action, note: n });
  switch (k.k) {
    case "eligParam": return out({ ...d2, elig: { ...d2.elig, ...k.patch } }, `Eligibility parameters updated (provisional, demo) — ${Object.keys(k.patch).join(", ")}`);
    case "eligThreshold": { const th = { ...d2.elig.thresholds }; if (k.th === null) delete th[k.division]; else { const bad = [k.th.minRank, k.th.maxRank].some((v) => v != null && (!Number.isInteger(v) || v < 1)); if (bad || (k.th.minRank != null && k.th.maxRank != null && k.th.minRank > k.th.maxRank)) return deny(`invalid threshold for ${k.division}`); th[k.division] = k.th; }
      return out({ ...d2, elig: { ...d2.elig, thresholds: th } }, k.th === null ? `Simulated threshold cleared — ${k.division} (DEC-IC-08 still provisional)` : `Simulated threshold set — ${k.division} (DEC-IC-08 still provisional, not official)`, k.division); }
    case "d2Config": {
      if (k.formats && Object.values(k.formats).some((n) => !Number.isInteger(n) || n < 1 || n > 8)) return deny("invalid pool format");
      const sc = k.sched; if (sc?.poolDays !== undefined && (!Number.isInteger(sc.poolDays) || sc.poolDays < 1 || sc.poolDays > d2.sched.dates.length)) return deny("invalid number of pool days");
      if (sc?.courtsPerTie !== undefined && ![1, 2, 3].includes(sc.courtsPerTie)) return deny("invalid courts per tie");
      return out({ ...d2, formats: { ...d2.formats, ...(k.formats ?? {}) }, source: k.source ?? d2.source, seed: k.seed ?? d2.seed, sched: { ...d2.sched, ...(k.sched ?? {}) } }, "D2 working configuration updated (demo hypotheses)"); }
    case "compSave": {
      const d = dossierFor(ic, k.clubId); const l = d?.lines[k.division]; if (!d || !l || l.status === "refused" || l.status === "draft") return deny(`no active engagement line · ${k.clubId} ${k.division}`);
      const key = compKey(k.clubId, k.division); const cur = d2.compositions[key] ?? emptyComposition(k.clubId, k.division, a.at);
      if (cur.status === "submitted" || cur.status === "checked") return deny(`composition is locked (${cur.status}) · ${k.clubId} ${k.division}`);
      const nc: Composition = { ...cur, pairs: clone(k.pairs), subs: [...k.subs], unavail: clone(k.unavail), updatedAt: a.at, history: [...cur.history, hist("Draft saved")] };
      return out({ ...d2, compositions: { ...d2.compositions, [key]: nc } }, `Composition draft saved — ${k.clubId} ${k.division}`, k.clubId); }
    case "compSubmit": {
      const d = dossierFor(ic, k.clubId); const key = compKey(k.clubId, k.division); const c = d2.compositions[key]; if (!d || !c) return deny(`no composition · ${k.clubId} ${k.division}`);
      if (c.status === "submitted" || c.status === "checked") return deny(`composition already submitted · ${k.clubId} ${k.division}`);
      const ev = evaluateComposition(c, { players: d.form.players.filter((p) => p.division === k.division), otherClubs: otherClubsMap(ic.dossiers, k.clubId), elig: d2.elig, waivers: d2.waivers }); const bl = compBlocking(ev);
      if (bl.length) return deny(`incomplete composition (${bl.length} blocking issue(s)) · ${k.clubId} ${k.division}`);
      const n = c.version + 1; const nc: Composition = { ...c, status: "submitted", version: n, versions: [...c.versions, { n, at: a.at, by: actor, pairs: clone(c.pairs), subs: [...c.subs] }], updatedAt: a.at, history: [...c.history, hist(n === 1 ? `Submitted (version ${n})` : `Re-submitted (version ${n})`)] };
      return out({ ...d2, compositions: { ...d2.compositions, [key]: nc } }, `Composition submitted — ${k.clubId} ${k.division} (version ${n})`, k.clubId, [note(a.at, `Composition ${k.division} submitted by ${k.clubId} (version ${n}).`, MPL_ADDRESSEE)]); }
    case "compReview": {
      const key = compKey(k.clubId, k.division); const c = d2.compositions[key]; if (!c) return deny(`no composition · ${k.clubId} ${k.division}`); if (c.status !== "submitted") return deny(`only a submitted composition can be reviewed · ${k.clubId} ${k.division}`);
      if (k.status === "returned" && !reasonOk(k.reason)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`);
      const nc: Composition = { ...c, status: k.status as CompStatus, note: k.reason, updatedAt: a.at, history: [...c.history, hist(k.status === "checked" ? "Roster checked (simulated decision — not an official validation)" : "Returned to the club (simulated decision)", k.reason)] };
      return out({ ...d2, compositions: { ...d2.compositions, [key]: nc } }, k.status === "checked" ? `Roster checked (simulated) — ${k.clubId} ${k.division}` : `Roster returned — ${k.clubId} ${k.division}`, k.clubId, [note(a.at, k.status === "checked" ? `Your ${k.division} composition was checked (simulated decision, not an official validation).` : `Your ${k.division} composition was returned: ${k.reason}`, k.clubId)]); }
    case "waiverRequest": {
      if (!reasonOk(k.reason)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`); const d = dossierFor(ic, k.clubId); if (!d?.form.players.some((p) => p.id === k.playerId && p.division === k.division)) return deny(`unknown player · ${k.clubId} ${k.division}`);
      if (d2.waivers.some((w) => w.clubId === k.clubId && w.division === k.division && w.playerId === k.playerId && w.code === k.code && w.status === "requested")) return deny(`waiver already requested · ${k.clubId} ${k.division}`);
      const w: Waiver = { id: `WV-${String(d2.seq).padStart(3, "0")}`, clubId: k.clubId, division: k.division, playerId: k.playerId, code: k.code, reason: k.reason.trim(), status: "requested", requestedAt: a.at, history: [{ at: a.at, actor, action: "Waiver requested", note: k.reason.trim() }] };
      return out({ ...d2, seq: d2.seq + 1, waivers: [w, ...d2.waivers] }, `Waiver ${w.id} requested — ${k.clubId} ${k.division}`, k.clubId, [note(a.at, `Waiver ${w.id} requested by ${k.clubId} (${k.division}).`, MPL_ADDRESSEE)]); }
    case "waiverDecide": {
      const w = d2.waivers.find((x) => x.id === k.id); if (!w) return deny(`unknown waiver ${k.id}`); if (w.status !== "requested") return deny(`waiver already decided · ${k.id}`); if (k.status === "refused" && !reasonOk(k.note)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`);
      const nw: Waiver = { ...w, status: k.status, decidedAt: a.at, decidedBy: actor, decisionNote: k.note, history: [...w.history, { at: a.at, actor, action: k.status === "granted" ? "Waiver granted (simulated decision)" : "Waiver refused (simulated decision)", note: k.note }] };
      return out({ ...d2, waivers: d2.waivers.map((x) => (x.id === w.id ? nw : x)) }, `Waiver ${w.id} ${k.status} (simulated) — ${w.clubId} ${w.division}`, w.clubId, [note(a.at, `Waiver ${w.id} ${k.status} (simulated decision, not an official validation).${k.note ? " " + k.note : ""}`, w.clubId)]); }
    case "poolsGenerate": {
      const cur = d2.pools[k.division]; const teams = teamsFor(k.division, ic.dossiers, d2.source, max(k.division)); const seed = k.seed ?? d2.seed; if (!teams.length) return deny(`no teams to draw · ${k.division}`);
      const removed = (cur?.removed ?? []).filter((t) => teams.includes(t)); const active = teams.filter((t) => !removed.includes(t)); const n = (cur?.version ?? 0) + 1;
      const np: PoolPlan = { division: k.division, pools: d2.formats[k.division] ?? 1, source: d2.source, teams, removed, assignment: drawPools(active, d2.formats[k.division] ?? 1, seed), seed, version: n, versions: [...(cur?.versions ?? []), { n, at: a.at, by: actor, note: "Simulated draw", assignment: [], removed, seed }].slice(-20), history: [...(cur?.history ?? []), hist(`Simulated draw (seed ${seed})`)], updatedAt: a.at };
      np.versions[np.versions.length - 1].assignment = clone(np.assignment);
      return out({ ...d2, pools: { ...d2.pools, [k.division]: np }, prep: { ...d2.prep, [`pools:${k.division}`]: "draft" } }, `Pools simulated — ${k.division} (version ${n}, seed ${seed}; not a regulatory draw)`, k.division); }
    case "poolsMove": case "poolsRemove": case "poolsRestore": {
      const cur = d2.pools[k.division]; if (!cur) return deny(`no pool plan · ${k.division}`); const n = cur.version + 1; let np: PoolPlan = cur; let msg = "";
      if (k.k === "poolsMove") { if (!cur.assignment.flat().includes(k.team) || k.to < 0 || k.to >= cur.assignment.length) return deny(`invalid move · ${k.division}`); const asg = cur.assignment.map((p) => p.filter((t) => t !== k.team)); asg[k.to] = [...asg[k.to], k.team]; np = { ...cur, assignment: asg }; msg = `Team moved — ${k.division}`; }
      else if (k.k === "poolsRemove") { if (!cur.teams.includes(k.team)) return deny(`unknown team · ${k.division}`); const removed = k.removed ? [...new Set([...cur.removed, k.team])] : cur.removed.filter((t) => t !== k.team); const asg = cur.assignment.map((p) => p.filter((t) => t !== k.team)); if (!k.removed) { const smallest = asg.reduce((bi, p, i) => (p.length < asg[bi].length ? i : bi), 0); asg[smallest] = [...asg[smallest], k.team]; } np = { ...cur, removed, assignment: asg }; msg = k.removed ? `Team withdrawn — ${k.division}` : `Team reinstated — ${k.division}`; }
      else { const v = cur.versions.find((x) => x.n === k.version); if (!v) return deny(`unknown version · ${k.division}`); np = { ...cur, assignment: clone(v.assignment), removed: [...v.removed], seed: v.seed }; msg = `Pool version restored — ${k.division} (v${k.version})`; }
      np = { ...np, version: n, versions: [...cur.versions, { n, at: a.at, by: actor, note: msg, assignment: clone(np.assignment), removed: [...np.removed], seed: np.seed }].slice(-20), history: [...cur.history, hist(msg, "team" in k ? k.team : undefined)], updatedAt: a.at };
      return out({ ...d2, pools: { ...d2.pools, [k.division]: np }, prep: { ...d2.prep, [`pools:${k.division}`]: "draft" } }, `${msg} (version ${n})`, k.division); }
    case "schedGenerate": {
      const sets = activePoolSets(d2); if (!sets.length) return deny("no pool plan to schedule"); const clubs = [...new Set(sets.flatMap((p) => p.pools.flat().map((t) => parseTeam(t).clubId)))]; const v = (d2.runs.at(-1)?.version ?? 0) + 1;
      const run = generateSchedule(sets, hostsFor(clubs, ic.dossiers, d2.sched), d2.sched, { version: v, at: a.at, by: actor }); const meta = { version: v, at: a.at, by: actor, scheduled: run.stats.scheduled, unscheduled: run.stats.unscheduled, conflicts: run.conflicts.length };
      return out({ ...d2, run, runSig: poolsSig(d2), runs: [...d2.runs, meta].slice(-20), prep: { ...d2.prep, calendar: "draft" } }, `Calendar simulated (version ${v}): ${run.stats.scheduled}/${run.stats.total} ties scheduled${run.stats.unscheduled ? `, ${run.stats.unscheduled} impossible` : ""} (proposed dates, not approved)`); }
    case "hostOverride": {
      const o = { ...d2.sched.overrides }; if (k.host === null) delete o[k.tieId]; else o[k.tieId] = k.host; return out({ ...d2, sched: { ...d2.sched, overrides: o } }, k.host === null ? `Host override cleared — ${k.tieId}` : `Host preference set — ${k.tieId} (applied at next generation only if feasible)`, k.tieId); }
    case "prepSet": {
      const cur = d2.prep[k.key] ?? "draft"; const i = PREP_ORDER.indexOf(cur), j = PREP_ORDER.indexOf(k.to); if (j < 0) return deny(`invalid status · ${k.key}`);
      if (j > i + 1) return deny(`status steps cannot be skipped · ${k.key}`); if (j >= 2 && !reasonOk(k.note)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`);
      if (j >= 2) { if (k.key === "calendar") { if (!d2.run) return deny("no calendar simulation"); if (d2.run.stats.unscheduled > 0 || d2.run.conflicts.length > 0) return deny("calendar incomplete or in conflict — cannot be marked ready"); if (d2.runSig !== poolsSig(d2)) return deny("calendar is out of date with the pools"); }
        else if (k.key.startsWith("pools:")) { const div = k.key.slice(6); const p = d2.pools[div]; if (!p) return deny(`no pool plan · ${div}`); const bl = poolIssues(p, teamsFor(div, ic.dossiers, p.source, max(div)), max(div)).filter((x) => x.severity === "block"); if (bl.length) return deny(`pools have blocking issues · ${div}`); } }
      const dec: PrepDecision = { at: a.at, actor, key: k.key, from: cur, to: k.to, note: k.note };
      return out({ ...d2, prep: { ...d2.prep, [k.key]: k.to }, decisions: [dec, ...d2.decisions] }, `${k.key}: ${cur} → ${k.to}${k.to === "validated_demo" ? " (demo validation, not an official publication)" : ""}`, k.key); }
  }
}
