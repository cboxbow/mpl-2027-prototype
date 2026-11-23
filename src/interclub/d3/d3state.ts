/**
 * D3 — ÉTAT ET ACTIONS (feuilles de rencontre, scores, validation, forfaits, incidents, corrections). Tranche `ic.d3` du store partagé.
 * Les droits sont contrôlés ICI (fonctions métier) en plus du réducteur principal : appartenance du club à la rencontre, juge-arbitre affecté, rôle.
 * Parcours : Capitaine → Juge-arbitre → Commission MPL → « Résultat validé en démonstration » (jamais un résultat officiel).
 */
import type { Actor, DemoNotification, DemoState } from "@/lib/demo-state";
import { ROLE_EN, canonicalRole, refereeName, type Perm } from "@/lib/permissions";
import { clubById } from "@/data/clubs";
const cn = (id: string) => clubById(id)?.name ?? id;
import { REASON_MIN_LENGTH } from "@/config/demo-config";
import { MPL_ADDRESSEE, otherClubsMap } from "../engagement";
import { compKey } from "../compositions";
import { SLOTS } from "../compositions";
import { defaultScoreConfig, emptyMatch, evalMatch, hasBlock, other, tieResult, type MatchEntry, type ScoreConfig, type Side } from "./score";
import { clubOfTeam, evalLineup, isEditable, newSheet, sheetId, sideClub, sideOfClub, type ForfeitMode, type Incident, type Lineup, type Sheet, type SheetVersion, type Stage } from "./sheets";
import { compBlocking } from "../compositions";

export interface D3Config { score: ScoreConfig; forfeitMode: ForfeitMode; requireReferee: boolean }
export interface D3State { cfg: D3Config; sheets: Record<string, Sheet>; seq: number }
export const initialD3 = (): D3State => ({ cfg: { score: defaultScoreConfig(), forfeitMode: "commission_decides", requireReferee: true }, sheets: {}, seq: 1 });
export function hydrateD3(raw: unknown): D3State {
  const b = initialD3(); if (!raw || typeof raw !== "object") return b; const r = raw as Partial<D3State>;
  return { ...b, ...r, cfg: { ...b.cfg, ...(r.cfg ?? {}), score: { ...b.cfg.score, ...(r.cfg?.score ?? {}) } }, sheets: { ...(r.sheets ?? {}) } };
}
export type D3Action =
  | { k: "shSync" } | { k: "shAssignRef"; id: string; refereeId: string | null } | { k: "shCaptain"; id: string; side: Side; club: string; name: string }
  | { k: "shLineupSave"; id: string; side: Side; club: string; lineup: Pick<Lineup, "pairs" | "subs" | "unavail"> } | { k: "shLineupConfirm"; id: string; side: Side; club: string }
  | { k: "shScoreSave"; id: string; by: string; idx: number; entry: MatchEntry } | { k: "shSubmit"; id: string; by: string } | { k: "shContest"; id: string; by: string; reason: string }
  | { k: "shRefDecide"; id: string; decision: "check" | "return" | "uphold_contest" | "reject_contest"; reason?: string } | { k: "shComDecide"; id: string; decision: "validate" | "refuse"; reason?: string }
  | { k: "shCorrectionRequest"; id: string; by: string; reason: string } | { k: "shCorrectionDecide"; id: string; decision: "approve" | "refuse"; reason: string }
  | { k: "shIncident"; id: string; by: string; kind: Incident["kind"]; severity: Incident["severity"]; side?: Side; text: string }
  | { k: "shPostpone"; id: string; reason: string; newDate?: string } | { k: "shInterrupt"; id: string; reason: string } | { k: "shResume"; id: string; note?: string } | { k: "shForfeit"; id: string; side: Side; reason: string }
  | { k: "d3Config"; patch: Omit<Partial<D3Config>, "score"> & { score?: Partial<ScoreConfig> } };
export const D3_KINDS = new Set(["shSync", "shAssignRef", "shCaptain", "shLineupSave", "shLineupConfirm", "shScoreSave", "shSubmit", "shContest", "shRefDecide", "shComDecide", "shCorrectionRequest", "shCorrectionDecide", "shIncident", "shPostpone", "shInterrupt", "shResume", "shForfeit", "d3Config"]);
export const isD3 = (a: { k: string }): a is D3Action => D3_KINDS.has(a.k);
/** Permission et club cible par action (contrôle du réducteur principal ; les contrôles métier fins sont refaits dans `d3Apply`). */
export function d3Guard(a: D3Action): { perm: Perm; club?: string } {
  switch (a.k) {
    case "shSync": case "shAssignRef": return { perm: "sheet.assign" };
    case "shCaptain": case "shLineupSave": case "shLineupConfirm": return { perm: "sheet.lineup", club: a.club };
    case "shScoreSave": case "shSubmit": return { perm: "sheet.score", club: a.by }; case "shContest": return { perm: "sheet.contest", club: a.by };
    case "shRefDecide": return { perm: "sheet.referee" }; case "shComDecide": case "shCorrectionDecide": return { perm: "sheet.commission" };
    case "shCorrectionRequest": return { perm: "sheet.correction.request", club: a.by }; case "shIncident": return { perm: "sheet.incident", club: a.by };
    case "shPostpone": case "shInterrupt": case "shResume": case "shForfeit": return { perm: "sheet.flag" };
    case "d3Config": return { perm: "d3.config" };
  }
}
type Wrapped = { type: "ic"; ic: D3Action; at: string; act?: Actor };
let nid = 0; const nId = () => "d3" + Date.now().toString(36) + (nid++).toString(36);
const who = (act?: Actor) => (act ? `${ROLE_EN[act.role]} (DEMO)` : "Unknown");
const reasonOk = (r?: string) => (r ?? "").trim().length >= REASON_MIN_LENGTH;
const note = (at: string, text: string, clubId: string): DemoNotification => ({ id: nId(), at, kind: "interclub", clubId, text });
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const label = (s: Sheet) => `${s.id}`;
const noteBoth = (at: string, s: Sheet, text: string, extra: string[] = []) => [...new Set([clubOfTeam(s.home), clubOfTeam(s.away), ...extra])].map((c) => note(at, text, c));
export const refereeOf = (s: Sheet) => s.refereeId;

export function d3Apply(s: DemoState, a: Wrapped): DemoState {
  const k = a.ic; const ic = s.ic; const d3 = ic.d3; const d2 = ic.d2; const actor = who(a.act); const role = a.act ? canonicalRole(a.act.role) : undefined; const cfg = d3.cfg;
  const out = (next: D3State, action: string, ref?: string, notifs: DemoNotification[] = []): DemoState => ({ ...s, ic: { ...ic, d3: next }, audit: [{ at: a.at, actor, action, ref }, ...s.audit], notifications: [...notifs, ...s.notifications] });
  const deny = (why: string): DemoState => ({ ...s, audit: [{ at: a.at, actor, action: `Denied — ${why}` }, ...s.audit] });
  const put = (sh: Sheet, h: string, hn?: string): D3State => ({ ...d3, sheets: { ...d3.sheets, [sh.id]: { ...sh, updatedAt: a.at, history: [...sh.history, { at: a.at, actor, action: h, note: hn }] } } });
  const snap = (sh: Sheet, reason?: string): Sheet => { const n = sh.version + 1; const v: SheetVersion = { n, at: a.at, by: actor, reason, stage: sh.stage, matches: clone(sh.matches), lineups: clone(sh.lineups), summary: tieResult(sh.matches, cfg.score).label }; return { ...sh, version: n, versions: [...sh.versions, v] }; };
  const sheetOf = (id: string) => d3.sheets[id];
  /** Droit métier : l'acteur est-il un capitaine (admin/staff) du club `by`, et ce club joue-t-il cette rencontre ? */
  const captainOk = (sh: Sheet, by: string) => role !== undefined && ["club_admin", "club_staff"].includes(role) && a.act?.clubId === by && !!sideOfClub(sh, by);
  const refOk = (sh: Sheet) => role === "referee" && !!a.act?.refereeId && sh.refereeId === a.act.refereeId;
  const blocked = (sh: Sheet) => (sh.orphan ? "sheet no longer scheduled in the D2 calendar — cannot be played or validated normally" : sh.flag === "forfeit" && sh.stage !== "validated_demo" ? "" : "");
  void blocked;
  if ("id" in k && ic.d4?.cancelled[k.id] && !["shAssignRef"].includes(k.k)) return deny(`tie cancelled — no further action possible · ${k.id}`);
  switch (k.k) {
    case "d3Config": { const sc = k.patch.score; if (sc && ((sc.superTiebreakTo !== undefined && (!Number.isInteger(sc.superTiebreakTo) || sc.superTiebreakTo < 5 || sc.superTiebreakTo > 15)) || (sc.bestOf !== undefined && ![1, 3].includes(sc.bestOf)))) return deny("invalid score configuration");
      return out({ ...d3, cfg: { ...cfg, ...k.patch, score: { ...cfg.score, ...(sc ?? {}) } } }, "D3 score engine configuration updated (provisional, demo hypotheses)"); }
    case "shSync": {
      const run = d2.run; if (!run) return deny("no D2 calendar simulation — generate the calendar first"); const sheets = { ...d3.sheets }; let created = 0, refreshed = 0, orphaned = 0; const ids = new Set([...run.ties.filter((t) => t.status === "scheduled").map((t) => sheetId(t.id)), ...run.finals.filter((f) => f.status === "scheduled").map((f) => sheetId(f.id))]);
      for (const t of run.ties) { if (t.status !== "scheduled") continue; const id = sheetId(t.id); const cur = sheets[id];
        if (!cur) { sheets[id] = newSheet(t, { A: d2.compositions[compKey(t.home.split("|")[0], t.division)], B: d2.compositions[compKey(t.away.split("|")[0], t.division)] }, a.at); created++; }
        else { const moved = cur.date !== (t.date ?? "") || cur.time !== t.time || cur.host !== t.host; if (moved || cur.orphan) { if (cur.stage === "preparation" || cur.stage === "ready") { sheets[id] = { ...cur, orphan: false, day: t.day ?? 0, date: t.date ?? "", time: t.time, host: t.host, history: [...cur.history, { at: a.at, actor, action: "Slot refreshed from the D2 calendar" }] }; refreshed++; } else if (moved) { sheets[id] = { ...cur, orphan: false, history: [...cur.history, { at: a.at, actor, action: "Calendar slot changed in D2 after scores were entered — review needed", note: `${t.date ?? ""} ${t.time ?? ""}` }] }; refreshed++; } } } }
      for (const [id, sh] of Object.entries(sheets)) if (!ids.has(id) && !sh.orphan) { sheets[id] = { ...sh, orphan: true, history: [...sh.history, { at: a.at, actor, action: "No longer scheduled in the D2 calendar — blocked" }] }; orphaned++; }
      return out({ ...d3, sheets }, `Match sheets synchronised from the D2 calendar: ${created} created, ${refreshed} refreshed, ${orphaned} blocked`); }
    case "shAssignRef": { const sh = sheetOf(k.id); if (!sh) return deny(`unknown sheet ${k.id}`); if (sh.locked) return deny(`sheet is locked · ${k.id}`);
      return out(put({ ...sh, refereeId: k.refereeId }, k.refereeId ? `Referee ${refereeName(k.refereeId)} assigned` : "Referee unassigned"), `Referee ${k.refereeId ? refereeName(k.refereeId) : "none"} assigned to sheet ${label(sh)}`, k.id, k.refereeId ? noteBoth(a.at, sh, `Referee ${refereeName(k.refereeId)} assigned to your ${sh.division} tie (${sh.date}).`) : []); }
    case "shCaptain": { const sh = sheetOf(k.id); if (!sh) return deny(`unknown sheet ${k.id}`); if (k.club !== sideClub(sh, k.side) || !captainOk(sh, k.club)) return deny(`not a captain of this team · ${k.id}`); if (sh.locked) return deny(`sheet is locked · ${k.id}`);
      if (!k.name.trim()) return deny("captain name required"); return out(put({ ...sh, captains: { ...sh.captains, [k.side]: k.name.trim() } }, `Captain ${k.side} set`, k.name.trim()), `Captain set — ${label(sh)}`, k.id); }
    case "shLineupSave": case "shLineupConfirm": {
      const sh = sheetOf(k.id); if (!sh) return deny(`unknown sheet ${k.id}`); const club = sideClub(sh, k.side); if (k.club !== club || !captainOk(sh, club)) return deny(`not a captain of this team · ${k.id}`);
      if (sh.orphan) return deny(`sheet not scheduled in D2 · ${k.id}`); if (sh.locked || !["preparation", "ready", "scoring"].includes(sh.stage)) return deny(`line-up is locked (${sh.stage}) · ${k.id}`);
      const cur = sh.lineups[k.side]; if (cur.confirmed && k.k === "shLineupSave") return deny(`line-up already confirmed · ${k.id}`); if (sh.matches.some((m) => m.kind !== "not_played")) return deny(`line-up cannot change once scores are entered · ${k.id}`);
      const d = ic.dossiers.find((x) => x.clubId === club); const players = d?.form.players.filter((p) => p.division === sh.division) ?? [];
      const nl: Lineup = k.k === "shLineupSave" ? { ...cur, pairs: clone(k.lineup.pairs), subs: [...k.lineup.subs], unavail: clone(k.lineup.unavail), source: "manual" } : cur;
      if (k.k === "shLineupSave") return out(put({ ...sh, lineups: { ...sh.lineups, [k.side]: nl } }, `Line-up ${k.side} saved (draft)`), `Line-up draft saved — ${label(sh)} (${k.side})`, k.id);
      const ev = evalLineup(club, sh.division, nl, { players, otherClubs: otherClubsMap(ic.dossiers, club), elig: d2.elig, waivers: d2.waivers, day: sh.day }); const bl = compBlocking(ev); if (bl.length) return deny(`incomplete line-up (${bl.length} blocking issue(s)) · ${k.id}`);
      const conf: Lineup = { ...nl, confirmed: true, confirmedAt: a.at, confirmedBy: actor }; const both = (k.side === "A" ? true : sh.lineups.A.confirmed) && (k.side === "B" ? true : sh.lineups.B.confirmed);
      return out(put({ ...sh, lineups: { ...sh.lineups, [k.side]: conf }, stage: both && sh.stage === "preparation" ? "ready" : sh.stage }, `Line-up ${k.side} confirmed`, `${ev.issues.length} alert(s)`), `Line-up confirmed — ${label(sh)} (${k.side})`, k.id, noteBoth(a.at, sh, `Line-up of ${club} confirmed for the ${sh.division} tie of ${sh.date}.`)); }
    case "shScoreSave": {
      const sh = sheetOf(k.id); if (!sh) return deny(`no match sheet — the tie is not scheduled in D2 · ${k.id}`); if (!captainOk(sh, k.by)) return deny(`not a captain of this tie · ${k.id}`);
      if (sh.orphan) return deny(`tie not scheduled in D2 — cannot be played normally · ${k.id}`); if (sh.locked || sh.stage === "validated_demo") return deny(`sheet is validated and locked — a motivated correction is required · ${k.id}`);
      if (!["ready", "scoring"].includes(sh.stage) && !(sh.stage === "interrupted")) return deny(`scores cannot be entered at this stage (${sh.stage}) · ${k.id}`);
      if (!sh.lineups.A.confirmed || !sh.lineups.B.confirmed) return deny(`line-ups must be confirmed before scoring · ${k.id}`); if (!Number.isInteger(k.idx) || k.idx < 0 || k.idx > 2) return deny("invalid match index");
      const ms = sh.matches.map((m, i) => (i === k.idx ? clone(k.entry) : m)); return out(put({ ...sh, matches: ms, stage: sh.stage === "ready" ? "scoring" : sh.stage }, `Match ${k.idx + 1} score saved (draft)`), `Score draft saved — ${label(sh)} (match ${k.idx + 1})`, k.id); }
    case "shSubmit": {
      const sh = sheetOf(k.id); if (!sh) return deny(`unknown sheet ${k.id}`); if (!captainOk(sh, k.by)) return deny(`not a captain of this tie · ${k.id}`); if (sh.orphan) return deny(`tie not scheduled in D2 — cannot be submitted · ${k.id}`);
      if (!["scoring", "interrupted"].includes(sh.stage)) return deny(`nothing to submit at this stage (${sh.stage}) · ${k.id}`);
      const ev = sh.matches.map((m) => evalMatch(m, cfg.score)); if (ev.some(hasBlock) && !(sh.stage === "interrupted" && ev.every((e) => !e.issues.some((i) => i.severity === "block" && i.code !== "no_score" && i.code !== "match_incomplete")))) return deny(`inconsistent score (${ev.filter(hasBlock).length} match(es)) · ${k.id}`);
      if (!tieResult(sh.matches, cfg.score).complete && sh.stage !== "interrupted" && sh.flag !== "forfeit") return deny(`all three matches must be resolved · ${k.id}`);
      const nsh = snap({ ...sh, stage: "submitted", submittedBy: k.by, contest: undefined }, "Submitted by the captain"); const oth = clubOfTeam(sideOfClub(sh, k.by) === "A" ? sh.away : sh.home);
      return out(put(nsh, `Submitted by the captain of ${cn(k.by)} (version ${nsh.version})`), `Match sheet submitted — ${label(sh)} (version ${nsh.version})`, k.id, [note(a.at, `Result of the ${sh.division} tie submitted by ${cn(k.by)}: you may confirm or contest it.`, oth), ...(sh.refereeId ? [note(a.at, `Sheet ${sh.id} submitted for referee check.`, MPL_ADDRESSEE)] : [])]); }
    case "shContest": {
      const sh = sheetOf(k.id); if (!sh) return deny(`unknown sheet ${k.id}`); if (!captainOk(sh, k.by)) return deny(`not a captain of this tie · ${k.id}`); if (sh.stage !== "submitted") return deny(`only a submitted result can be contested · ${k.id}`);
      if (k.by === sh.submittedBy) return deny(`the submitting club cannot contest its own submission · ${k.id}`); if (!reasonOk(k.reason)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`);
      return out(put({ ...sh, stage: "contested", contest: { by: k.by, reason: k.reason.trim(), at: a.at } }, `Result contested by ${cn(k.by)}`, k.reason.trim()), `Result contested — ${label(sh)}`, k.id, noteBoth(a.at, sh, `Result of the ${sh.division} tie contested by ${cn(k.by)}: ${k.reason.trim()}`, [MPL_ADDRESSEE])); }
    case "shRefDecide": {
      const sh = sheetOf(k.id); if (!sh) return deny(`unknown sheet ${k.id}`); if (!refOk(sh)) return deny(`only the assigned referee can decide · ${k.id}`); if (sh.orphan) return deny(`tie not scheduled in D2 · ${k.id}`);
      if (k.decision === "check") { if (sh.stage !== "submitted") return deny(`only a submitted sheet can be checked · ${k.id}`); const ev = sh.matches.map((m) => evalMatch(m, cfg.score)); if (ev.some((e) => e.issues.some((i) => i.severity === "block" && i.code !== "no_score" && i.code !== "match_incomplete")) ) return deny(`inconsistent score · ${k.id}`);
        const nsh = snap({ ...sh, stage: "referee_checked" }, "Checked by the referee"); return out(put(nsh, "Checked by the referee", k.reason), `Sheet checked by the referee — ${label(sh)}`, k.id, [note(a.at, `Sheet ${sh.id} checked by the referee — awaiting the Commission.`, MPL_ADDRESSEE), ...noteBoth(a.at, sh, `Referee checked the ${sh.division} sheet; awaiting the Commission (simulated).`)]); }
      if (k.decision === "return") { if (!["submitted", "contested"].includes(sh.stage)) return deny(`nothing to return · ${k.id}`); if (!reasonOk(k.reason)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`);
        return out(put({ ...sh, stage: "scoring", contest: sh.contest ? { ...sh.contest, resolution: "upheld", note: k.reason } : undefined }, "Returned to the captains by the referee", k.reason), `Sheet returned for correction — ${label(sh)}`, k.id, noteBoth(a.at, sh, `Referee returned the ${sh.division} sheet: ${k.reason}`)); }
      if (sh.stage !== "contested" || !sh.contest) return deny(`no contest to decide · ${k.id}`); if (!reasonOk(k.reason)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`);
      if (k.decision === "uphold_contest") return out(put({ ...sh, stage: "scoring", contest: { ...sh.contest, resolution: "upheld", note: k.reason } }, "Contest accepted — back to scoring", k.reason), `Contest accepted — ${label(sh)}`, k.id, noteBoth(a.at, sh, `Contest accepted on the ${sh.division} tie: ${k.reason}`));
      return out(put({ ...sh, stage: "submitted", contest: { ...sh.contest, resolution: "rejected", note: k.reason } }, "Contest rejected (motivated)", k.reason), `Contest rejected — ${label(sh)}`, k.id, noteBoth(a.at, sh, `Contest rejected on the ${sh.division} tie: ${k.reason}`)); }
    case "shComDecide": {
      const sh = sheetOf(k.id); if (!sh) return deny(`unknown sheet ${k.id}`); if (sh.orphan) return deny(`tie not scheduled in D2 — cannot be validated · ${k.id}`); if (sh.stage !== "referee_checked") return deny(`the Commission only decides sheets checked by the referee · ${k.id}`);
      if (k.decision === "refuse") { if (!reasonOk(k.reason)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`); return out(put({ ...sh, stage: "scoring" }, "Refused by the Commission (simulated)", k.reason), `Sheet refused (simulated) — ${label(sh)}`, k.id, noteBoth(a.at, sh, `The Commission returned the ${sh.division} sheet (simulated decision): ${k.reason}`)); }
      const nsh = snap({ ...sh, stage: "validated_demo", locked: true }, "Validated in demonstration"); const r = tieResult(sh.matches, cfg.score);
      return out(put(nsh, `Validated in demonstration (version ${nsh.version}) — not an official result`, k.reason), `Result validated in demonstration — ${label(sh)} (${r.label}; not an official result)`, k.id, noteBoth(a.at, sh, `Result of the ${sh.division} tie validated in demonstration (${r.label}) — not an official result.`)); }
    case "shCorrectionRequest": {
      const sh = sheetOf(k.id); if (!sh) return deny(`unknown sheet ${k.id}`); if (sh.stage !== "validated_demo") return deny(`only a validated sheet needs a correction request · ${k.id}`); if (!(captainOk(sh, k.by) || refOk(sh))) return deny(`not allowed to request a correction · ${k.id}`);
      if (!reasonOk(k.reason)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`); const cr = { state: "requested" as const, by: actor, reason: k.reason.trim(), at: a.at };
      return out(put({ ...sh, stage: "correction_requested", correction: cr }, "Correction requested after validation", k.reason.trim()), `Correction requested — ${label(sh)}`, k.id, noteBoth(a.at, sh, `Correction requested on the validated ${sh.division} sheet: ${k.reason.trim()}`, [MPL_ADDRESSEE])); }
    case "shCorrectionDecide": {
      const sh = sheetOf(k.id); if (!sh || !sh.correction) return deny(`no correction to decide · ${k.id}`); if (sh.stage !== "correction_requested") return deny(`no pending correction · ${k.id}`); if (!reasonOk(k.reason)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`);
      const dec = { ...sh.correction, state: (k.decision === "approve" ? "approved" : "refused") as "approved" | "refused", decidedBy: actor, decidedAt: a.at, note: k.reason.trim() };
      if (k.decision === "refuse") return out(put({ ...sh, stage: "validated_demo", correction: undefined, corrections: [...sh.corrections, dec] }, "Correction refused (motivated) — validated result kept", k.reason), `Correction refused — ${label(sh)}`, k.id, noteBoth(a.at, sh, `Correction refused on the ${sh.division} sheet: ${k.reason}`));
      const nsh = snap({ ...sh, stage: "scoring", locked: false, correction: undefined, corrections: [...sh.corrections, dec], submittedBy: undefined, contest: undefined }, `Correction approved: ${sh.correction.reason}`);
      return out(put(nsh, `Correction approved — new version ${nsh.version}; previous validated scores preserved`, k.reason), `Correction approved — ${label(sh)} (version ${nsh.version})`, k.id, noteBoth(a.at, sh, `Correction approved on the ${sh.division} sheet; the result goes through validation again.`)); }
    case "shIncident": {
      const sh = sheetOf(k.id); if (!sh) return deny(`unknown sheet ${k.id}`); const ok = role === "admin" || refOk(sh) || captainOk(sh, k.by); if (!ok) return deny(`not allowed to report an incident on this sheet · ${k.id}`);
      if (!reasonOk(k.text)) return deny(`description required (min ${REASON_MIN_LENGTH} characters)`); const inc: Incident = { id: `INC-${String(d3.seq).padStart(3, "0")}`, at: a.at, by: actor, kind: k.kind, severity: k.severity, side: k.side, text: k.text.trim() };
      return out({ ...put({ ...sh, incidents: [...sh.incidents, inc] }, `Incident ${inc.id} reported (${k.kind})`, k.text.trim()), seq: d3.seq + 1 }, `Incident ${inc.id} reported — ${label(sh)} (${k.kind}; no sanction applied)`, k.id, k.kind === "disciplinary" || k.severity === "major" ? [note(a.at, `Incident ${inc.id} (${k.kind}) reported on sheet ${sh.id}.`, MPL_ADDRESSEE)] : []); }
    case "shPostpone": case "shInterrupt": case "shForfeit": {
      const sh = sheetOf(k.id); if (!sh) return deny(`unknown sheet ${k.id}`); if (!(role === "admin" || refOk(sh))) return deny(`only the Commission or the assigned referee can do this · ${k.id}`); if (sh.locked) return deny(`sheet is validated and locked · ${k.id}`);
      if (!reasonOk(k.reason)) return deny(`reason required (min ${REASON_MIN_LENGTH} characters)`);
      if (k.k === "shPostpone") return out(put({ ...sh, stage: "postponed", resumeStage: sh.stage === "postponed" ? sh.resumeStage : sh.stage, postponedTo: k.newDate }, "Tie postponed", k.reason), `Tie postponed — ${label(sh)}${k.newDate ? ` (new date proposed ${k.newDate})` : ""}`, k.id, noteBoth(a.at, sh, `The ${sh.division} tie of ${sh.date} was postponed: ${k.reason}`));
      if (k.k === "shInterrupt") return out(put({ ...sh, stage: "interrupted", resumeStage: sh.stage === "interrupted" ? sh.resumeStage : sh.stage, interruptedReason: k.reason }, "Tie interrupted", k.reason), `Tie interrupted — ${label(sh)}`, k.id, noteBoth(a.at, sh, `The ${sh.division} tie was interrupted: ${k.reason}`, [MPL_ADDRESSEE]));
      if (sh.stage === "validated_demo") return deny(`use the correction workflow · ${k.id}`);
      let ms = sh.matches; if (cfg.forfeitMode === "three_zero") ms = [0, 1, 2].map(() => ({ ...emptyMatch(), kind: "walkover_match" as const, side: k.side, comment: "Total team forfeit — simulation mode three_zero" }));
      return out(put({ ...sh, flag: "forfeit", matches: ms, stage: cfg.forfeitMode === "three_zero" ? "scoring" : "interrupted", forfeit: { side: k.side, mode: cfg.forfeitMode, reason: k.reason, at: a.at } }, `Total team forfeit recorded (${cfg.forfeitMode}; simulation, no official scale applied)`, k.reason), `Team forfeit recorded — ${label(sh)} (mode ${cfg.forfeitMode}; no official scale applied)`, k.id, noteBoth(a.at, sh, `Total forfeit of ${sideClub(sh, k.side)} recorded on the ${sh.division} tie (simulation mode ${cfg.forfeitMode}; no official scale applied).`, [MPL_ADDRESSEE])); }
    case "shResume": {
      const sh = sheetOf(k.id); if (!sh) return deny(`unknown sheet ${k.id}`); if (!(role === "admin" || refOk(sh))) return deny(`only the Commission or the assigned referee can do this · ${k.id}`); if (!["postponed", "interrupted"].includes(sh.stage)) return deny(`nothing to resume · ${k.id}`);
      const back: Stage = sh.stage === "interrupted" ? "scoring" : sh.resumeStage && !["postponed", "interrupted"].includes(sh.resumeStage) ? sh.resumeStage : sh.lineups.A.confirmed && sh.lineups.B.confirmed ? "ready" : "preparation";
      return out(put({ ...sh, stage: back, postponedTo: undefined, interruptedReason: undefined }, `Tie resumed (${back})`, k.note), `Tie resumed — ${label(sh)}`, k.id, noteBoth(a.at, sh, `The ${sh.division} tie was resumed.`)); }
  }
}
void SLOTS; void other;
