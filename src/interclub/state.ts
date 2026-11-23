/**
 * D0/D1 — ÉTAT INTERCLUB DE DÉMONSTRATION (tranche `ic` du store partagé).
 * Réutilise le journal d'audit et les notifications du store de démonstration ; réinitialisé avec lui.
 * ⚠ Aucune action ne rend une règle officielle. Les décisions de la Commission sont des DÉCISIONS SIMULÉES, jamais une validation officielle.
 */
import type { Actor, AuditEntry, DemoNotification, DemoState } from "@/lib/demo-state";
import type { Perm } from "@/lib/permissions";
import { ROLE_EN } from "@/lib/permissions";
import { REASON_MIN_LENGTH } from "@/config/demo-config";
import { RULES } from "./rules-data";
import { newRuntime, DEFAULT_OWNER, type RuleRuntime } from "./rules";
import { DEFAULT_DIVISIONS } from "./capacity";
import { MPL_ADDRESSEE, applyClubEdit, blocking, deriveStatus, emptyForm, newLines, otherClubsMap, validateForm, wantedDivisions, type Dossier, type EngForm, type HistoryItem, type LineState, type ValidationCtx } from "./engagement";
import { seedDossiers } from "./seed";
import { d4Apply, d4Guard, d4Track, hydrateD4, initialD4, isD4, type D4Action, type D4State } from "./d4/d4state";
import { d3Apply, d3Guard, hydrateD3, initialD3, isD3, type D3Action, type D3State } from "./d3/d3state";
import { d2Apply, d2Guard, hydrateD2, initialD2, isD2, type D2Action, type D2State } from "./d2state";

export interface IcParams {
  d2hActive: boolean; maxByDivision: Record<string, number>; minHomologated: number; minPlayersPerTeam: number; closeDate: string; /** Date de référence de la période d'engagement (démo) : le prototype est à la date 2027, la campagne d'engagement se déroule fin 2026. */ refDate: string; lateBlocking: boolean; exclusivityBlocking: boolean;
  /** Droits d'inscription PROPOSÉS (Rs par équipe) : affichage seul, aucun paiement. */ fee: number; requiredDocs: string[];
}
export interface IcState { year: number; basis: "demo"; params: IcParams; dossiers: Dossier[]; rules: Record<string, RuleRuntime>; /** D2 : éligibilité, compositions, poules, calendrier. */ d2: D2State; /** D3 : feuilles de rencontre, scores, validation. */ d3: D3State; /** D4 : règles de classement, décisions, annulations, finales, recalculs. */ d4: D4State }
export const defaultParams = (): IcParams => ({ d2hActive: true, maxByDivision: Object.fromEntries(DEFAULT_DIVISIONS.map((d) => [d.code, d.max])), minHomologated: 2, minPlayersPerTeam: 6, closeDate: "2026-12-11", refDate: "2026-11-21", lateBlocking: false, exclusivityBlocking: false, fee: 5000, requiredDocs: [] });
export const initialIc = (): IcState => ({ year: 2027, basis: "demo", params: defaultParams(), dossiers: seedDossiers(), rules: Object.fromEntries(RULES.map((r) => [r.id, newRuntime(r)])), d2: initialD2(), d3: initialD3(), d4: initialD4() });
/** Fusion tolérante (état stocké ancien ou partiel). */
export function hydrateIc(raw: unknown): IcState {
  const base = initialIc(); if (!raw || typeof raw !== "object") return base; const r = raw as Partial<IcState>;
  return { ...base, ...r, basis: "demo", params: { ...base.params, ...(r.params ?? {}), maxByDivision: { ...base.params.maxByDivision, ...(r.params?.maxByDivision ?? {}) } }, dossiers: Array.isArray(r.dossiers) ? r.dossiers : base.dossiers, rules: { ...base.rules, ...(r.rules ?? {}) }, d2: hydrateD2(r.d2), d3: hydrateD3(r.d3), d4: hydrateD4(r.d4) };
}

export type IcAction =
  | { k: "create"; clubId: string; form: EngForm } | { k: "save"; clubId: string; form: EngForm } | { k: "submit"; clubId: string }
  | { k: "request"; clubId: string; division: string; reason: string } | { k: "decide"; clubId: string; division: string; status: "accepted" | "refused"; reason?: string } | { k: "reopen"; clubId: string; division: string; reason: string }
  | { k: "export"; clubId: string; what: "csv" | "pdf" } | { k: "remind" }
  | { k: "param"; patch: Partial<IcParams> } | { k: "divMax"; code: string; max: number }
  | D2Action | D3Action | D4Action | { k: "ruleSim"; id: string; value: string | null } | { k: "ruleDemo"; id: string; note: string; on: boolean } | { k: "ruleOwner"; id: string; owner: string } | { k: "ruleNote"; id: string; note: string };
export type IcWrapped = { type: "ic"; ic: IcAction; at: string; act?: Actor };

/** Permission et périmètre requis par une action Interclub (même modèle que la vague C). */
export function icGuard(a: IcAction): { perm: Perm; club?: string } {
  if (isD2(a)) return d2Guard(a);
  if (isD3(a)) return d3Guard(a);
  if (isD4(a)) return d4Guard(a);
  switch (a.k) {
    case "create": case "save": return { perm: "engagement.edit", club: a.clubId };
    case "submit": return { perm: "engagement.submit", club: a.clubId };
    case "request": case "decide": case "reopen": return { perm: "engagement.decide" };
    case "export": return { perm: "engagement.export", club: a.clubId };
    case "remind": case "param": case "divMax": return { perm: "season.config" };
    default: return { perm: "rules.edit" };
  }
}
let nid = 0; const nId = () => "ic" + Date.now().toString(36) + (nid++).toString(36);
const who = (act?: Actor) => (act ? `${ROLE_EN[act.role]} (DEMO)` : "Unknown");
const aud = (s: DemoState, at: string, actor: string, action: string, ref?: string): AuditEntry[] => [{ at, actor, action, ref }, ...s.audit];
const note = (at: string, text: string, clubId: string): DemoNotification => ({ id: nId(), at, kind: "interclub", clubId, text });
const deny = (s: DemoState, a: IcWrapped, why: string): DemoState => ({ ...s, audit: aud(s, a.at, who(a.act), `Denied — ${why}`) });
const reasonOk = (r?: string) => (r ?? "").trim().length >= REASON_MIN_LENGTH;
export const dossierOf = (ic: IcState, clubId: string) => ic.dossiers.find((d) => d.clubId === clubId);
export const validationCtx = (s: Pick<DemoState, "ic">, clubId: string): ValidationCtx => ({
  today: s.ic.params.refDate, closeDate: s.ic.params.closeDate, lateBlocking: s.ic.params.lateBlocking, minHomologated: s.ic.params.minHomologated, minPlayersPerTeam: s.ic.params.minPlayersPerTeam,
  otherClubs: otherClubsMap(s.ic.dossiers, clubId), exclusivityBlocking: s.ic.params.exclusivityBlocking,
});
const hist = (at: string, actor: string, action: string, extra: Partial<HistoryItem> = {}): HistoryItem => ({ at, actor, action, ...extra });
const put = (ic: IcState, d: Dossier): IcState => ({ ...ic, dossiers: ic.dossiers.some((x) => x.id === d.id) ? ic.dossiers.map((x) => (x.id === d.id ? d : x)) : [d, ...ic.dossiers] });
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** Réducteur de la tranche Interclub (appelé par le réducteur principal après contrôle de permission). */
export function icApply(s: DemoState, a: IcWrapped): DemoState {
  return d4Track(s, icApplyCore(s, a), a.ic as { k: string }, a.at, who(a.act));
}
function icApplyCore(s: DemoState, a: IcWrapped): DemoState {
  if (isD4(a.ic)) return d4Apply(s, a as typeof a & { ic: D4Action });
  if (isD2(a.ic)) return d2Apply(s, a as typeof a & { ic: D2Action });
  if (isD3(a.ic)) return d3Apply(s, a as typeof a & { ic: D3Action });
  const k = a.ic; const ic = s.ic; const actor = who(a.act);
  const withIc = (next: IcState, action: string, ref: string | undefined, notifs: DemoNotification[] = []): DemoState => ({ ...s, ic: next, audit: aud(s, a.at, actor, action, ref), notifications: [...notifs, ...s.notifications] });
  switch (k.k) {
    case "create": {
      if (dossierOf(ic, k.clubId)) return deny(s, a, `duplicate engagement file · ${k.clubId}`);
      const d: Dossier = { id: `ENG-${k.clubId}-${ic.year}`, clubId: k.clubId, season: ic.year, form: k.form, lines: newLines(k.form), version: 0, versions: [], history: [hist(a.at, actor, "Draft created")], createdAt: a.at, updatedAt: a.at };
      return withIc(put(ic, d), `Engagement file ${d.id} created (draft)`, k.clubId);
    }
    case "save": {
      const d = dossierOf(ic, k.clubId); if (!d) return deny(s, a, `no engagement file · ${k.clubId}`);
      if (deriveStatus(d.lines) !== "draft" && deriveStatus(d.lines) !== "to_complete") return deny(s, a, `engagement file is locked (${deriveStatus(d.lines)}) · ${k.clubId}`);
      const nd = applyClubEdit(d, k.form); return withIc(put(ic, { ...nd, updatedAt: a.at, history: [...nd.history, hist(a.at, actor, "Draft saved")] }), `Engagement draft saved — ${k.clubId}`, k.clubId);
    }
    case "submit": {
      const d = dossierOf(ic, k.clubId); if (!d) return deny(s, a, `no engagement file · ${k.clubId}`);
      const st = deriveStatus(d.lines); if (st !== "draft" && st !== "to_complete") return deny(s, a, `engagement file already submitted · ${k.clubId}`);
      const bl = blocking(validateForm(d.form, validationCtx(s, k.clubId))); if (bl.length) return deny(s, a, `incomplete engagement file (${bl.length} blocking issue(s)) · ${k.clubId}`);
      const lines: Record<string, LineState> = {}; for (const [c, l] of Object.entries(d.lines)) lines[c] = l.status === "draft" || l.status === "to_complete" ? { status: "submitted" } : l;
      const n = d.version + 1; const ver = { n, at: a.at, by: actor, reason: n === 1 ? "Initial submission" : "Corrections submitted", form: clone(d.form), lines: clone(lines) };
      const nd: Dossier = { ...d, lines, version: n, versions: [...d.versions, ver], updatedAt: a.at, history: [...d.history, hist(a.at, actor, n === 1 ? `Submitted (version ${n})` : `Re-submitted (version ${n})`)] };
      return withIc(put(ic, nd), `Engagement file ${d.id} submitted (version ${n})`, k.clubId, [note(a.at, `Engagement file ${d.id} submitted by ${k.clubId} (version ${n}).`, MPL_ADDRESSEE)]);
    }
    case "request": {
      const d = dossierOf(ic, k.clubId); if (!d) return deny(s, a, `no engagement file · ${k.clubId}`); if (!reasonOk(k.reason)) return deny(s, a, `reason required (min ${REASON_MIN_LENGTH} characters)`);
      const targets = k.division === "*" ? Object.keys(d.lines).filter((c) => d.lines[c].status === "submitted") : [k.division];
      if (!targets.length || targets.some((c) => d.lines[c]?.status !== "submitted")) return deny(s, a, `only submitted lines can be sent back · ${k.clubId}`);
      const lines = { ...d.lines }; for (const c of targets) lines[c] = { status: "to_complete", note: k.reason, decidedAt: a.at, decidedBy: actor };
      const nd: Dossier = { ...d, lines, updatedAt: a.at, history: [...d.history, ...targets.map((c) => hist(a.at, actor, "More information requested (simulated decision)", { division: c, note: k.reason }))] };
      return withIc(put(ic, nd), `More information requested — ${k.clubId} ${targets.join(", ")}`, k.clubId, [note(a.at, `More information requested on your engagement file (${targets.join(", ")}): ${k.reason}`, k.clubId)]);
    }
    case "decide": {
      const d = dossierOf(ic, k.clubId); const l = d?.lines[k.division]; if (!d || !l) return deny(s, a, `unknown line · ${k.clubId} ${k.division}`);
      if (l.status !== "submitted") return deny(s, a, `only a submitted line can be decided · ${k.clubId} ${k.division}`); if (k.status === "refused" && !reasonOk(k.reason)) return deny(s, a, `reason required (min ${REASON_MIN_LENGTH} characters)`);
      const max = ic.params.maxByDivision[k.division]; const accepted = ic.dossiers.reduce((n, x) => n + (x.lines[k.division]?.status === "accepted" ? 1 : 0), 0);
      const over = k.status === "accepted" && max !== undefined && accepted >= max; const suspended = k.division === "D2H" && !ic.params.d2hActive;
      const extra = [over ? `maximum of ${max} teams exceeded (warning, not blocking)` : "", suspended && k.status === "accepted" ? "division currently suspended in the configuration (warning)" : ""].filter(Boolean).join(" · ");
      const lines = { ...d.lines, [k.division]: { status: k.status, note: k.reason, decidedAt: a.at, decidedBy: actor } as LineState };
      const nd: Dossier = { ...d, lines, updatedAt: a.at, history: [...d.history, hist(a.at, actor, k.status === "accepted" ? "Line accepted (simulated decision — not an official validation)" : "Line refused (simulated decision — not an official validation)", { division: k.division, note: [k.reason, extra].filter(Boolean).join(" · ") || undefined })] };
      return withIc(put(ic, nd), `Engagement line ${k.status === "accepted" ? "accepted" : "refused"} (simulated) — ${k.clubId} ${k.division}${extra ? ` · ${extra}` : ""}`, k.clubId, [note(a.at, `Your ${k.division} team request was ${k.status === "accepted" ? "accepted" : "refused"} (simulated decision, not an official validation).${k.reason ? " " + k.reason : ""}`, k.clubId)]);
    }
    case "reopen": {
      const d = dossierOf(ic, k.clubId); const l = d?.lines[k.division]; if (!d || !l) return deny(s, a, `unknown line · ${k.clubId} ${k.division}`);
      if (l.status !== "accepted" && l.status !== "refused") return deny(s, a, `only a decided line can be reopened · ${k.clubId} ${k.division}`); if (!reasonOk(k.reason)) return deny(s, a, `reason required (min ${REASON_MIN_LENGTH} characters)`);
      const nd: Dossier = { ...d, lines: { ...d.lines, [k.division]: { status: "to_complete", note: k.reason, decidedAt: a.at, decidedBy: actor } }, updatedAt: a.at, history: [...d.history, hist(a.at, actor, "Line reopened", { division: k.division, note: k.reason })] };
      return withIc(put(ic, nd), `Engagement line reopened — ${k.clubId} ${k.division}`, k.clubId, [note(a.at, `Your ${k.division} line was reopened for completion: ${k.reason}`, k.clubId)]);
    }
    case "export": {
      const d = dossierOf(ic, k.clubId); if (!d) return s;
      return withIc(put(ic, { ...d, history: [...d.history, hist(a.at, actor, k.what === "csv" ? "CSV export" : "PDF export")] }), `Engagement ${k.what.toUpperCase()} export — ${k.clubId}`, k.clubId);
    }
    case "remind": {
      const pending = ic.dossiers.filter((d) => ["draft"].includes(deriveStatus(d.lines)));
      return withIc(ic, `Closing reminders simulated (${pending.length} club(s) without a submitted file)`, undefined, pending.map((d) => note(a.at, `Reminder: engagement closing on ${ic.params.closeDate} (simulated). Your file is still a draft.`, d.clubId)));
    }
    case "param": return withIc({ ...ic, params: { ...ic.params, ...k.patch } }, `Interclub season parameters updated (demo) — ${Object.keys(k.patch).join(", ")}`, undefined);
    case "divMax": { if (!Number.isInteger(k.max) || k.max < 1 || k.max > 99) return deny(s, a, `invalid maximum for ${k.code}`); return withIc({ ...ic, params: { ...ic.params, maxByDivision: { ...ic.params.maxByDivision, [k.code]: k.max } } }, `Division ${k.code} maximum set to ${k.max} (demo, not approved)`, k.code); }
    case "ruleSim": case "ruleDemo": case "ruleOwner": case "ruleNote": {
      const def = RULES.find((r) => r.id === k.id); if (!def) return deny(s, a, `unknown rule ${k.id}`); const rt = ic.rules[k.id] ?? newRuntime(def); let nr: RuleRuntime = rt; let msg = "";
      if (k.k === "ruleSim") { nr = { ...rt, sim: k.value ?? undefined, history: [...rt.history, { at: a.at, actor, action: k.value === null ? "Simulated value cleared" : "Value simulated (demo only — status unchanged)", note: k.value ?? undefined }] }; msg = `Rule ${k.id} ${k.value === null ? "simulation cleared" : "simulated"} (status unchanged)`; }
      if (k.k === "ruleDemo") { nr = { ...rt, demoValidation: k.on ? { by: actor, at: a.at, note: k.note } : undefined, history: [...rt.history, { at: a.at, actor, action: k.on ? "Demo validation set (NOT a Committee approval)" : "Demo validation removed", note: k.note || undefined }] }; msg = `Rule ${k.id} demo validation ${k.on ? "set" : "removed"} (not a Committee approval)`; }
      if (k.k === "ruleOwner") { nr = { ...rt, owner: k.owner, history: [...rt.history, { at: a.at, actor, action: "Validation owner changed", note: k.owner }] }; msg = `Rule ${k.id} validation owner set`; }
      if (k.k === "ruleNote") { nr = { ...rt, note: k.note, history: [...rt.history, { at: a.at, actor, action: "Note updated", note: k.note }] }; msg = `Rule ${k.id} note updated`; }
      return withIc({ ...ic, rules: { ...ic.rules, [k.id]: nr } }, msg, k.id);
    }
  }
}
export const ruleOwner = (ic: IcState, id: string) => ic.rules[id]?.owner ?? DEFAULT_OWNER;
export { emptyForm, wantedDivisions };
