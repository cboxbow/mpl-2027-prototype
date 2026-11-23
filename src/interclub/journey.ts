/**
 * 5B-6 (P1-11) — PARCOURS INTERCLUB SIMPLIFIÉ : fonctions pures d'AFFICHAGE.
 * Elles lisent l'état Interclub existant (dossier, compositions, feuilles) et n'écrivent rien : aucune règle d'éligibilité n'est ajoutée ou modifiée,
 * aucune décision n'est prise ici (les décisions de la Commission restent manuelles, motivées et simulées).
 */
import type { IcState } from "./state";
import { compKey } from "./compositions";
import type { Dossier, LineStatus } from "./engagement";
import { sideOfClub, type Sheet, type Stage } from "./d3/sheets";

export const JSTAGES = ["engagement", "validation", "squad", "composition", "matches", "results"] as const;
export type JStage = (typeof JSTAGES)[number];
export type JState = "done" | "current" | "blocked" | "todo";
export type JTab = "engagement" | "compositions" | "matches";
export type Blocker = { code: "returned" | "refused" | "comp_returned" | "contested" | "correction" | "orphan" | "postponed" | "interrupted" | "all_refused"; division?: string; note?: string };
export type Decision = { division: string; status: LineStatus; note?: string; at?: string; by?: string };
export interface Journey {
  hasDossier: boolean; states: Record<JStage, JState>; current: JStage | null; next: { code: "start" | "finish" | "wait" | "squad" | "compose" | "play" | "follow" | "done"; tab: JTab; stage?: Stage };
  blockers: Blocker[]; decisions: Decision[]; counts: { sheets: number; validated: number };
}
const SUBMITTED_STAGES: Stage[] = ["submitted", "contested", "referee_checked", "validated_demo", "correction_requested"];
const clubSheets = (ic: IcState, clubId: string): Sheet[] => Object.values(ic.d3.sheets).filter((s) => !!sideOfClub(s, clubId));

export function clubJourney(ic: IcState, clubId: string, dossier?: Dossier): Journey {
  const d = dossier ?? ic.dossiers.find((x) => x.clubId === clubId); const sheets = clubSheets(ic, clubId); const validated = sheets.filter((s) => s.stage === "validated_demo").length;
  const blank = Object.fromEntries(JSTAGES.map((s) => [s, "todo"])) as Record<JStage, JState>;
  if (!d) return { hasDossier: false, states: { ...blank, engagement: "current" }, current: "engagement", next: { code: "start", tab: "engagement" }, blockers: [], decisions: [], counts: { sheets: sheets.length, validated } };
  const lines = Object.entries(d.lines); const blockers: Blocker[] = [];
  const decisions: Decision[] = lines.filter(([, l]) => l.status === "accepted" || l.status === "refused" || l.status === "to_complete").map(([division, l]) => ({ division, status: l.status, note: l.note, at: l.decidedAt, by: l.decidedBy }));
  const accepted = lines.filter(([, l]) => l.status === "accepted").map(([div]) => div);
  lines.forEach(([division, l]) => { if (l.status === "to_complete") blockers.push({ code: "returned", division, note: l.note }); if (l.status === "refused") blockers.push({ code: "refused", division, note: l.note }); });
  const engagementDone = lines.length > 0 && lines.every(([, l]) => l.status !== "draft" && l.status !== "to_complete");
  const decided = lines.length > 0 && lines.every(([, l]) => l.status === "accepted" || l.status === "refused"); const validationDone = decided && accepted.length > 0;
  if (decided && accepted.length === 0) blockers.push({ code: "all_refused" });
  const squadDone = accepted.length > 0 && accepted.every((div) => d.form.players.filter((p) => p.division === div).length >= ic.params.minPlayersPerTeam);
  const comps = accepted.map((div) => ic.d2.compositions[compKey(clubId, div)]);
  comps.forEach((c, i) => { if (c?.status === "returned") blockers.push({ code: "comp_returned", division: accepted[i], note: c.note }); });
  const compDone = accepted.length > 0 && comps.every((c) => c && (c.status === "submitted" || c.status === "checked"));
  const matchesDone = sheets.length > 0 && sheets.every((s) => SUBMITTED_STAGES.includes(s.stage)); const resultsDone = sheets.length > 0 && validated === sheets.length;
  sheets.forEach((s) => { if (s.stage === "contested") blockers.push({ code: "contested", division: s.division }); if (s.stage === "correction_requested") blockers.push({ code: "correction", division: s.division }); if (s.orphan) blockers.push({ code: "orphan", division: s.division }); if (s.stage === "postponed") blockers.push({ code: "postponed", division: s.division }); if (s.stage === "interrupted") blockers.push({ code: "interrupted", division: s.division }); });
  const done = [engagementDone, validationDone, squadDone, compDone, matchesDone, resultsDone]; const idx = done.findIndex((x) => !x); const current = idx === -1 ? null : JSTAGES[idx];
  const stuck = blockers.length > 0; const states = Object.fromEntries(JSTAGES.map((s, i) => [s, idx === -1 || i < idx ? "done" : i === idx ? (stuck ? "blocked" : "current") : "todo"])) as Record<JStage, JState>;
  const nextByStage: Record<JStage, Journey["next"]> = {
    engagement: { code: "finish", tab: "engagement" }, validation: { code: "wait", tab: "engagement" }, squad: { code: "squad", tab: "engagement" }, composition: { code: "compose", tab: "compositions" },
    matches: { code: "play", tab: "matches" }, results: { code: "follow", tab: "matches" },
  };
  const next = current ? nextByStage[current] : { code: "done" as const, tab: "matches" as JTab };
  return { hasDossier: true, states, current, next, blockers, decisions, counts: { sheets: sheets.length, validated } };
}

/** File de la Commission : éléments à instruire ou à décider, par catégorie (comptage seul — aucune décision automatique). */
export interface CommissionQueue { engagements: number; compositions: number; toDecide: number; corrections: number; contested: number; incidents: number; total: number }
export function commissionQueue(ic: IcState): CommissionQueue {
  const sheets = Object.values(ic.d3.sheets);
  const engagements = ic.dossiers.reduce((n, d) => n + Object.values(d.lines).filter((l) => l.status === "submitted").length, 0);
  const compositions = Object.values(ic.d2.compositions).filter((c) => c.status === "submitted").length;
  const toDecide = sheets.filter((s) => s.stage === "referee_checked").length; const corrections = sheets.filter((s) => s.stage === "correction_requested").length; const contested = sheets.filter((s) => s.stage === "contested").length;
  const incidents = sheets.reduce((n, s) => n + s.incidents.filter((i) => i.severity === "major").length, 0);
  return { engagements, compositions, toDecide, corrections, contested, incidents, total: engagements + compositions + toDecide + corrections + contested };
}
/** File du juge-arbitre : ses feuilles par état. */
export interface RefereeQueue { toCheck: number; contested: number; toPlay: number; awaiting: number; done: number; total: number }
export function refereeQueue(ic: IcState, refereeId: string | undefined): RefereeQueue {
  const mine = Object.values(ic.d3.sheets).filter((s) => !!refereeId && s.refereeId === refereeId); const n = (...st: Stage[]) => mine.filter((s) => st.includes(s.stage)).length;
  return { toCheck: n("submitted"), contested: n("contested"), toPlay: n("preparation", "ready", "scoring", "interrupted", "postponed"), awaiting: n("referee_checked", "correction_requested"), done: n("validated_demo"), total: mine.length };
}
