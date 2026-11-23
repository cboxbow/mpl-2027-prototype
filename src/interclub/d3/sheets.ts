/**
 * D3 — FEUILLES DE RENCONTRE : modèle, étapes et fonctions pures. Réutilise les équipes, compositions, verdicts d'éligibilité, poules, calendrier,
 * hôtes, rôles et notifications de D0/D1/D2 : aucun second référentiel de clubs ou de joueurs. « Validé en démonstration » n'est PAS un résultat officiel.
 */
import type { EngPlayer } from "../engagement";
import { SLOTS, evaluateComposition, emptyComposition, type CompEval, type Composition, type Slot } from "../compositions";
import type { EligParams, Waiver } from "../eligibility";
import type { Tie } from "../schedule";
import { emptyMatch, type MatchEntry, type ScoreConfig, type Side } from "./score";

export type Stage = "preparation" | "ready" | "scoring" | "submitted" | "contested" | "referee_checked" | "validated_demo" | "correction_requested" | "postponed" | "interrupted";
export type Flag = null | "forfeit";
export const STAGE_ORDER: Stage[] = ["preparation", "ready", "scoring", "submitted", "referee_checked", "validated_demo"];
export type ForfeitMode = "three_zero" | "no_score" | "commission_decides";
export interface Lineup { pairs: Record<Slot, [string, string]>; subs: string[]; unavail: Record<string, number[]>; confirmed: boolean; confirmedAt?: string; confirmedBy?: string; source: "d2" | "manual" | "empty" }
export interface Incident { id: string; at: string; by: string; kind: "disciplinary" | "injury" | "weather" | "court" | "other"; severity: "info" | "major"; side?: Side; text: string }
export interface HistItem { at: string; actor: string; action: string; note?: string }
export interface SheetVersion { n: number; at: string; by: string; reason?: string; stage: Stage; matches: MatchEntry[]; lineups: { A: Lineup; B: Lineup }; summary: string }
export interface Contest { by: string; reason: string; at: string; resolution?: "upheld" | "rejected"; note?: string }
export interface CorrectionReq { state: "requested" | "approved" | "refused"; by: string; reason: string; at: string; decidedBy?: string; decidedAt?: string; note?: string }
export interface Sheet {
  id: string; /** Phase finale (SF1/SF2/F) ; absent = poule. */ phase?: "SF1" | "SF2" | "F"; division: string; pool: number; round: number; day: number; date: string; time: string | null; host: string | null; home: string; away: string;
  /** La rencontre n'est plus programmée dans le calendrier D2 courant : elle ne peut plus être validée. */ orphan: boolean;
  captains: { A: string; B: string }; refereeId: string | null; lineups: { A: Lineup; B: Lineup }; matches: MatchEntry[];
  incidents: Incident[]; stage: Stage; flag: Flag; forfeit?: { side: Side; mode: ForfeitMode; reason: string; at: string }; postponedTo?: string; interruptedReason?: string; resumeStage?: Stage;
  submittedBy?: string; contest?: Contest; version: number; versions: SheetVersion[]; history: HistItem[]; locked: boolean; correction?: CorrectionReq; corrections: CorrectionReq[]; createdAt: string; updatedAt: string;
}
export const sheetId = (tieId: string) => `FR-${tieId}`;
export const clubOfTeam = (team: string) => team.split("|")[0];
export const sideClub = (s: Sheet, side: Side) => clubOfTeam(side === "A" ? s.home : s.away);
export const sideOfClub = (s: Sheet, clubId: string): Side | null => (clubOfTeam(s.home) === clubId ? "A" : clubOfTeam(s.away) === clubId ? "B" : null);
export const emptyLineup = (): Lineup => ({ pairs: { P1: ["", ""], P2: ["", ""], P3: ["", ""] }, subs: [], unavail: {}, confirmed: false, source: "empty" });
export const lineupFromComposition = (c: Composition | undefined): Lineup => (c && (c.status === "submitted" || c.status === "checked") ? { pairs: JSON.parse(JSON.stringify(c.pairs)), subs: [...c.subs], unavail: JSON.parse(JSON.stringify(c.unavail)), confirmed: false, source: "d2" } : emptyLineup());
export function newSheet(t: Tie, comps: { A?: Composition; B?: Composition }, at: string): Sheet {
  return { id: sheetId(t.id), division: t.division, pool: t.pool, round: t.round, day: t.day ?? 0, date: t.date ?? "", time: t.time, host: t.host, home: t.home, away: t.away, orphan: false, captains: { A: "", B: "" }, refereeId: null,
    lineups: { A: lineupFromComposition(comps.A), B: lineupFromComposition(comps.B) }, matches: [emptyMatch(), emptyMatch(), emptyMatch()], incidents: [], stage: "preparation", flag: null, version: 0, versions: [], history: [{ at, actor: "System", action: "Match sheet created from the D2 calendar" }],
    locked: false, corrections: [], createdAt: at, updatedAt: at };
}
/** Suggestion de préremplissage : les six premiers joueurs listés en trois paires, les autres en remplaçants (toujours soumis aux contrôles d'éligibilité). */
export function suggestLineup(players: EngPlayer[]): Lineup {
  const ids = players.map((p) => p.id); const l = emptyLineup(); SLOTS.forEach((s, i) => { l.pairs[s] = [ids[i * 2] ?? "", ids[i * 2 + 1] ?? ""]; }); l.subs = ids.slice(6); l.source = "manual"; return l;
}
export interface LineupCtx { players: EngPlayer[]; otherClubs: Map<string, string>; elig: EligParams; waivers: Waiver[]; day?: number }
export function evalLineup(clubId: string, division: string, l: Lineup, x: LineupCtx): CompEval {
  const c: Composition = { ...emptyComposition(clubId, division, ""), pairs: l.pairs, subs: l.subs, unavail: l.unavail };
  return evaluateComposition(c, { players: x.players, otherClubs: x.otherClubs, elig: x.elig, waivers: x.waivers, teamDays: x.day ? [x.day] : undefined });
}
/** Appariement des matchs : le match i oppose la paire Pi de A à la paire Pi de B (emplacements, sans ordre sportif imposé — DEC-IC-12). */
export const pairOf = (l: Lineup, i: number): [string, string] => l.pairs[SLOTS[i]];
export const isEditable = (s: Sheet) => !s.locked && !s.orphan && ["ready", "scoring"].includes(s.stage);
export const summaryOf = (s: Pick<Sheet, "matches">, c: ScoreConfig, f: (m: MatchEntry[], c: ScoreConfig) => { label: string }) => f(s.matches, c).label;
export type { Slot };
