/**
 * D2 — COMPOSITIONS D'ÉQUIPE (fonctions pures). Une rencontre = 3 matchs de double (scénario de travail).
 * ⚠ Aucun ordre sportif P1/P2/P3 n'est imposé (DEC-IC-12 non validée) : P1/P2/P3 sont de simples emplacements.
 */
import type { EngPlayer } from "./engagement";
import { evaluateListed, blocksSubmission, type EligParams, type EligResult, type Waiver } from "./eligibility";

export type Slot = "P1" | "P2" | "P3";
export const SLOTS: Slot[] = ["P1", "P2", "P3"];
export type CompStatus = "draft" | "submitted" | "returned" | "checked";
export interface CompVersion { n: number; at: string; by: string; pairs: Record<Slot, [string, string]>; subs: string[] }
export interface Composition {
  clubId: string; division: string; /** Identifiants d'engagement (EngPlayer.id) ; "" = vide. */ pairs: Record<Slot, [string, string]>; subs: string[];
  /** Journées (1–10) où un joueur est indisponible, par identifiant d'engagement. */ unavail: Record<string, number[]>;
  status: CompStatus; version: number; versions: CompVersion[]; note?: string; history: Array<{ at: string; actor: string; action: string; note?: string }>; updatedAt: string;
}
export const emptyComposition = (clubId: string, division: string, at: string): Composition => ({ clubId, division, pairs: { P1: ["", ""], P2: ["", ""], P3: ["", ""] }, subs: [], unavail: {}, status: "draft", version: 0, versions: [], history: [], updatedAt: at });
export const compKey = (clubId: string, division: string) => `${clubId}|${division}`;
export const membersOf = (c: Pick<Composition, "pairs" | "subs">) => [...SLOTS.flatMap((s) => c.pairs[s]), ...c.subs].filter(Boolean);
export type CompIssueCode = "pair_incomplete" | "duplicate_player" | "sub_in_pair" | "not_listed" | "too_many_subs" | "player_unavailable" | "elig_not" | "elig_check" | "pair_two_clubs";
export interface CompIssue { code: CompIssueCode; severity: "block" | "warn"; params?: Record<string, string | number>; engId?: string }
export interface CompCtx { players: EngPlayer[]; otherClubs: Map<string, string>; elig: EligParams; waivers: Waiver[]; /** Journées où l'équipe joue (calendrier simulé), si disponible. */ teamDays?: number[] }
export interface CompEval { issues: CompIssue[]; elig: Record<string, EligResult> }
export function evaluateComposition(c: Composition, x: CompCtx): CompEval {
  const issues: CompIssue[] = []; const B = (code: CompIssueCode, p?: CompIssue["params"], engId?: string) => issues.push({ code, severity: "block", params: p, engId }); const W = (code: CompIssueCode, p?: CompIssue["params"], engId?: string) => issues.push({ code, severity: "warn", params: p, engId });
  for (const s of SLOTS) if (c.pairs[s].some((v) => !v)) B("pair_incomplete", { slot: s });
  const inPairs = SLOTS.flatMap((s) => c.pairs[s]).filter(Boolean); const seen = new Set<string>();
  for (const id of inPairs) { if (seen.has(id) && !x.elig.allowPlayerInTwoPairs) B("duplicate_player", { name: x.players.find((p) => p.id === id)?.name ?? id }, id); seen.add(id); }
  for (const id of c.subs) { if (inPairs.includes(id)) B("sub_in_pair", { name: x.players.find((p) => p.id === id)?.name ?? id }, id); if (c.subs.indexOf(id) !== c.subs.lastIndexOf(id)) B("duplicate_player", { name: x.players.find((p) => p.id === id)?.name ?? id }, id); }
  if (x.elig.maxSubs != null && c.subs.length > x.elig.maxSubs) W("too_many_subs", { n: c.subs.length, max: x.elig.maxSubs });
  const elig: Record<string, EligResult> = {};
  for (const id of new Set(membersOf(c))) {
    const name = x.players.find((p) => p.id === id)?.name ?? id; const role = c.subs.includes(id) ? "sub" : "titular";
    const r = evaluateListed({ params: x.elig, clubId: c.clubId, division: c.division, otherClubs: x.otherClubs, players: x.players, engId: id, role, waivers: x.waivers }); elig[id] = r;
    if (blocksSubmission(r)) B("not_listed", { name }, id); else if (r.verdict === "not_eligible") W("elig_not", { name }, id); else if (r.verdict === "check") W("elig_check", { name }, id);
    if (role === "titular") { const un = (c.unavail[id] ?? []).filter((d) => x.teamDays?.includes(d)); if (un.length) W("player_unavailable", { name, days: un.map((d) => `J${d}`).join(", ") }, id); }
  }
  return { issues, elig };
}
export const compBlocking = (e: CompEval) => e.issues.filter((i) => i.severity === "block");
