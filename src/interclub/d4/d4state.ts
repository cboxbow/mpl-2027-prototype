/**
 * D4 — ÉTAT ET ACTIONS (règles de classement versionnées, décisions de la Commission, annulations, phases finales, journal des recalculs).
 * Tranche `ic.d4` du store partagé. Les classements sont DÉRIVÉS des feuilles D3 (aucune donnée dupliquée) ; ce module n'enregistre que les règles,
 * les décisions humaines et l'historique des recalculs. ⚠ Rien ici n'est officiel : « champion », « qualifié » = démonstration.
 */
import type { Actor, DemoNotification, DemoState } from "@/lib/demo-state";
import { ROLE_EN, type Perm } from "@/lib/permissions";
import { REASON_MIN_LENGTH } from "@/config/demo-config";
import { newSheet, sheetId, clubOfTeam, type Sheet } from "../d3/sheets";
import type { IcState } from "../state";
import type { FinalSlot, Tie } from "../schedule";
import { championOf, planFinals, winnerOf, type Champion, type FinalsPlan } from "./finals";
import { collect, defaultRules, poolTable, poolsOfRun, tieKey, CRITERIA, RULES_MAX_POINTS, type CommissionDecision, type Criterion, type OutcomeMode, type PointsScale, type PoolTable, type RulesConfig, type Skipped, type StatCriterion, type TieOutcome } from "./standings";

export type RecalcCause = "result_validated" | "correction_requested" | "correction_approved" | "tie_cancelled" | "tie_restored" | "forfeit_changed" | "rules_changed" | "decision_recorded" | "finals_generated" | "other";
export interface RecalcEntry { n: number; at: string; actor: string; cause: RecalcCause; rulesVersion: number; counted: number; divisions: string[]; ref?: string }
export interface RulesVersion { version: number; at: string; actor: string; note: string; snapshot: RulesConfig }
export interface D4State { rules: RulesConfig; rulesHistory: RulesVersion[]; decisions: CommissionDecision[]; cancelled: Record<string, { reason: string; at: string; by: string }>; finals: Record<string, { at: string; by: string; teams: string[]; rulesVersion: number }>; history: RecalcEntry[] }
export const initialD4 = (): D4State => ({ rules: defaultRules(), rulesHistory: [], decisions: [], cancelled: {}, finals: {}, history: [] });
export function hydrateD4(raw: unknown): D4State {
  const b = initialD4(); if (!raw || typeof raw !== "object") return b; const r = raw as Partial<D4State>;
  return { ...b, ...r, rules: { ...b.rules, ...(r.rules ?? {}), approved: false, scale: { ...b.rules.scale, ...(r.rules?.scale ?? {}) } }, rulesHistory: r.rulesHistory ?? [], decisions: r.decisions ?? [], cancelled: { ...(r.cancelled ?? {}) }, finals: { ...(r.finals ?? {}) }, history: r.history ?? [] };
}
export type RulesPatch = { scale?: Partial<PointsScale>; order?: Criterion[]; h2hOrder?: StatCriterion[]; stbAsGame?: boolean; walkoverSets?: number; walkoverGames?: number; creditTieForfeitStats?: boolean; pairing?: RulesConfig["pairing"]; useBestRunnersUp?: boolean };
export type D4Action =
  | { k: "d4Rules"; patch: RulesPatch; note: string } | { k: "d4RulesReset"; note: string }
  | { k: "d4Decide"; division: string; pool: number; order: string[]; reason: string }
  | { k: "shCancel"; id: string; reason: string } | { k: "shUncancel"; id: string; reason: string }
  | { k: "d4FinalsGenerate"; division: string } | { k: "d4FinalsAdvance"; division: string };
export const D4_KINDS = new Set(["d4Rules", "d4RulesReset", "d4Decide", "shCancel", "shUncancel", "d4FinalsGenerate", "d4FinalsAdvance"]);
export const isD4 = (a: { k: string }): a is D4Action => D4_KINDS.has(a.k);
export function d4Guard(a: D4Action): { perm: Perm; club?: string } {
  switch (a.k) { case "d4Rules": case "d4RulesReset": return { perm: "d4.rules" }; case "d4Decide": return { perm: "d4.decide" }; case "shCancel": case "shUncancel": return { perm: "sheet.cancel" }; case "d4FinalsGenerate": case "d4FinalsAdvance": return { perm: "d4.finals" }; }
}

/** Calcul complet (dérivé, pur) à partir de l'état Interclub. */
export interface Computed { outcomes: TieOutcome[]; skipped: Skipped[]; tables: PoolTable[]; plans: Record<string, FinalsPlan>; champions: Champion[]; mode: OutcomeMode }
export function computeD4(ic: IcState, mode: OutcomeMode = "validated"): Computed {
  const run = ic.d2.run; const sheets = Object.values(ic.d3.sheets); const { outcomes, skipped } = collect(sheets, ic.d3.cfg.score, ic.d4.rules, mode, ic.d4.cancelled);
  if (!run) return { outcomes, skipped, tables: [], plans: {}, champions: [], mode };
  const cancelledIds = new Set(Object.keys(ic.d4.cancelled)); const tables = poolsOfRun(run.ties).map((p) => poolTable(p, outcomes, cancelledIds, ic.d4.rules, ic.d4.decisions));
  const divisions = [...new Set(tables.map((t) => t.division))]; const plans: Record<string, FinalsPlan> = {}; const champions: Champion[] = [];
  for (const d of divisions) { plans[d] = planFinals(d, tables, run.finals, ic.d4.rules, ic.d4.finals[d]?.teams); const c = championOf(plans[d], outcomes); if (c) champions.push(c); }
  return { outcomes, skipped, tables, plans, champions, mode };
}
const sigOf = (ic: IcState) => { const { outcomes } = collect(Object.values(ic.d3.sheets), ic.d3.cfg.score, ic.d4.rules, "validated", ic.d4.cancelled); return outcomes.map((o) => `${o.sheetId}:${o.winner}:${o.label}:${o.kind}:${o.ptsA}/${o.ptsB}:${o.mA}${o.sA}${o.gA}-${o.mB}${o.sB}${o.gB}`).sort(); };
/** Appelé après CHAQUE action Interclub : si l'ensemble des résultats comptés ou les règles ont changé, un recalcul est journalisé avec la version des règles. */
export function d4Track(prev: DemoState, next: DemoState, k: { k: string; decision?: string }, at: string, actor: string): DemoState {
  if (prev === next) return next; const a = sigOf(prev.ic), b = sigOf(next.ic); const rulesChanged = prev.ic.d4.rules.version !== next.ic.d4.rules.version; const decChanged = prev.ic.d4.decisions.length !== next.ic.d4.decisions.length;
  const same = a.length === b.length && a.every((x, i) => x === b[i]); if (same && !rulesChanged && !decChanged) return next;
  const cause: RecalcCause = rulesChanged ? "rules_changed" : decChanged ? "decision_recorded" : k.k === "shComDecide" ? "result_validated" : k.k === "shCorrectionDecide" ? "correction_approved" : k.k === "shCorrectionRequest" ? "correction_requested" : k.k === "shCancel" ? "tie_cancelled" : k.k === "shUncancel" ? "tie_restored" : k.k === "shForfeit" ? "forfeit_changed" : "other";
  const key = (x: string) => x.split(":")[0]; const ma = new Map(a.map((x) => [key(x), x])), mb = new Map(b.map((x) => [key(x), x])); const ids = [...new Set([...ma.keys(), ...mb.keys()])].filter((id) => ma.get(id) !== mb.get(id));
  const divs = rulesChanged ? [...new Set(Object.values(next.ic.d3.sheets).map((x) => x.division))] : [...new Set(ids.map((id) => next.ic.d3.sheets[id]?.division ?? prev.ic.d3.sheets[id]?.division).filter(Boolean) as string[])];
  const entry: RecalcEntry = { n: next.ic.d4.history.length + 1, at, actor, cause, rulesVersion: next.ic.d4.rules.version, counted: b.length, divisions: divs, ref: ids[0] };
  return { ...next, ic: { ...next.ic, d4: { ...next.ic.d4, history: [entry, ...next.ic.d4.history] } } };
}

type Wrapped = { type: "ic"; ic: D4Action; at: string; act?: Actor };
let nid = 0; const nId = () => "d4" + Date.now().toString(36) + (nid++).toString(36);
const who = (act?: Actor) => (act ? `${ROLE_EN[act.role]} (DEMO)` : "Unknown");
const reasonOk = (r?: string) => (r ?? "").trim().length >= REASON_MIN_LENGTH;
const note = (at: string, text: string, clubId: string): DemoNotification => ({ id: nId(), at, kind: "interclub", clubId, text });
const slotTie = (f: FinalSlot, home: string, away: string): Tie => ({ id: f.id, division: f.division, pool: 0, round: 0, leg: 1, wantedDay: f.wantedDay, home, away, day: f.day, date: f.date, host: f.host, hostKind: null, wave: f.wave, time: f.time, courts: f.courts, status: "scheduled", reasons: [] });

export function d4Apply(s: DemoState, a: Wrapped): DemoState {
  const k = a.ic; const ic = s.ic; const d4 = ic.d4; const actor = who(a.act);
  const out = (next: D4State, action: string, ref?: string, notifs: DemoNotification[] = [], sheets?: Record<string, Sheet>): DemoState => ({ ...s, ic: { ...ic, d4: next, d3: sheets ? { ...ic.d3, sheets } : ic.d3 }, audit: [{ at: a.at, actor, action, ref }, ...s.audit], notifications: [...notifs, ...s.notifications] });
  const deny = (why: string): DemoState => ({ ...s, audit: [{ at: a.at, actor, action: `Denied — ${why}` }, ...s.audit] });
  switch (k.k) {
    case "d4Rules": {
      const p = k.patch; if (!reasonOk(k.note)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`);
      if (p.scale) for (const v of Object.values(p.scale)) if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > RULES_MAX_POINTS) return deny("invalid points scale");
      if (p.order && (new Set(p.order).size !== p.order.length || p.order.some((c) => !CRITERIA.includes(c)) || !p.order.length)) return deny("invalid tie-break order");
      if (p.h2hOrder && (!p.h2hOrder.length || new Set(p.h2hOrder).size !== p.h2hOrder.length)) return deny("invalid tie-break order");
      for (const key of ["walkoverSets", "walkoverGames"] as const) if (p[key] !== undefined && (!Number.isInteger(p[key]) || (p[key] as number) < 0 || (p[key] as number) > 30)) return deny("invalid forfeit credit");
      const nr: RulesConfig = { ...d4.rules, ...p, scale: { ...d4.rules.scale, ...(p.scale ?? {}) }, version: d4.rules.version + 1, approved: false };
      return out({ ...d4, rules: nr, rulesHistory: [...d4.rulesHistory, { version: nr.version, at: a.at, actor, note: k.note.trim(), snapshot: nr }] }, `Standings rules updated — version ${nr.version} (simulation values, not approved)`); }
    case "d4RulesReset": { if (!reasonOk(k.note)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`); const nr = { ...defaultRules(), version: d4.rules.version + 1 };
      return out({ ...d4, rules: nr, rulesHistory: [...d4.rulesHistory, { version: nr.version, at: a.at, actor, note: k.note.trim(), snapshot: nr }] }, `Standings rules reset to the simulation defaults — version ${nr.version}`); }
    case "d4Decide": {
      if (!reasonOk(k.reason)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`); const c = computeD4(ic, "validated"); const t = c.tables.find((x) => x.division === k.division && x.pool === k.pool); if (!t) return deny(`unknown pool · ${k.division} P${k.pool}`);
      const grp = t.unresolvedGroups.find((g) => g.length === k.order.length && g.every((x) => k.order.includes(x))); if (!grp) return deny(`no unresolved tie matches this order · ${k.division} P${k.pool}`);
      const key = tieKey(k.division, k.pool, grp); const dec: CommissionDecision = { key, order: [...k.order], reason: k.reason.trim(), at: a.at, by: actor, rulesVersion: d4.rules.version };
      return out({ ...d4, decisions: [...d4.decisions.filter((x) => x.key !== key), dec] }, `Commission decision recorded on a tie — ${k.division} pool ${k.pool} (simulated, not official)`, key); }
    case "shCancel": case "shUncancel": {
      const sh = ic.d3.sheets[k.id]; if (!sh) return deny(`unknown sheet ${k.id}`); if (!reasonOk(k.reason)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`);
      const both = [clubOfTeam(sh.home), clubOfTeam(sh.away)];
      if (k.k === "shCancel") { if (d4.cancelled[k.id]) return deny(`tie already cancelled · ${k.id}`);
        return out({ ...d4, cancelled: { ...d4.cancelled, [k.id]: { reason: k.reason.trim(), at: a.at, by: actor } } }, `Tie cancelled (simulated) — ${k.id}`, k.id, both.map((c) => note(a.at, `The ${sh.division} tie of ${sh.date} was cancelled (simulated decision): ${k.reason.trim()}`, c))); }
      if (!d4.cancelled[k.id]) return deny(`tie is not cancelled · ${k.id}`); const rest = { ...d4.cancelled }; delete rest[k.id];
      return out({ ...d4, cancelled: rest }, `Tie restored — ${k.id}`, k.id, both.map((c) => note(a.at, `The ${sh.division} tie of ${sh.date} was restored.`, c))); }
    case "d4FinalsGenerate": case "d4FinalsAdvance": {
      const run = ic.d2.run; if (!run) return deny("no D2 calendar simulation — generate the calendar first"); const c = computeD4(ic, "validated"); const plan = c.plans[k.division]; if (!plan) return deny(`unknown division ${k.division}`);
      const sheets = { ...ic.d3.sheets }; const notifs: DemoNotification[] = []; const slot = (st: FinalSlot["stage"]) => run.finals.find((f) => f.division === k.division && f.stage === st);
      const mk = (st: "SF1" | "SF2" | "F", home: string, away: string) => { const f = slot(st); if (!f) return `final slot ${st} not reserved in the D2 calendar`; if (f.status !== "scheduled") return `final slot ${st} not scheduled in D2 — cannot be played normally`;
        const id = sheetId(f.id); if (sheets[id]) return `sheet already exists · ${id}`; sheets[id] = { ...newSheet(slotTie(f, home, away), {}, a.at), phase: st } as Sheet; for (const t of [home, away]) notifs.push(note(a.at, `Demonstration pairing: your ${k.division} team plays the ${st === "F" ? "final" : "semi-final"} (provisional, not official).`, clubOfTeam(t))); return ""; };
      if (k.k === "d4FinalsGenerate") {
        if (!plan.hasSemis) return deny(`this division has no semi-finals · ${k.division}`); if (!plan.ready || plan.semis.length !== 2) return deny(`qualifications are not complete — pools must be finished with no unresolved tie · ${k.division}`);
        for (const sf of plan.semis) { const e = mk(sf.stage, sf.a, sf.b); if (e) return deny(e); }
        return out({ ...d4, finals: { ...d4.finals, [k.division]: { at: a.at, by: actor, teams: plan.qualifiers.map((x) => x.team), rulesVersion: d4.rules.version } } }, `Semi-finals generated (demonstration) — ${k.division}`, k.division, notifs, sheets); }
      if (!plan.hasFinal) return deny(`this division has no final · ${k.division}`); const w1 = winnerOf(c.outcomes, `FR-${k.division}.SF1`), w2 = winnerOf(c.outcomes, `FR-${k.division}.SF2`); if (!w1 || !w2) return deny(`both semi-finals must be validated first · ${k.division}`);
      const e = mk("F", w1, w2); if (e) return deny(e); return out({ ...d4 }, `Final generated (demonstration) — ${k.division}`, k.division, notifs, sheets); }
  }
}
