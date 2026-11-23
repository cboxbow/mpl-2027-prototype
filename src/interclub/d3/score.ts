/**
 * D3 — MOTEUR DE SCORE CONFIGURABLE (fonctions pures). Un match = 1 double ; une rencontre = 3 matchs (scénario de travail).
 * ⚠ Aucun format n'est fixé : format de match A/C et format du 3e set ne sont PAS tranchés par le règlement. La configuration est un jeu
 * d'HYPOTHÈSES PROVISOIRES ; avec `thirdSet: "undecided"` les deux formes sont acceptées avec un avertissement.
 */
export type ThirdSet = "undecided" | "full_set" | "super_tiebreak";
export interface ScoreConfig {
  /** 1 ou 3 manches gagnantes selon le format (hypothèse). */ bestOf: 1 | 3;
  /** Forme du 3e set quand les deux joueurs sont à une manche partout. */ thirdSet: ThirdSet;
  /** Autorise le super tie-break dans la configuration (sinon refusé quel que soit `thirdSet`). */ superTiebreakAllowed: boolean;
  superTiebreakTo: number; setGames: number; tiebreakAtSetGames: boolean; /** Jeux du set à partir desquels un écart de 2 est exigé sans tie-break. */ tiebreakTo: number;
}
export const defaultScoreConfig = (): ScoreConfig => ({ bestOf: 3, thirdSet: "undecided", superTiebreakAllowed: true, superTiebreakTo: 10, setGames: 6, tiebreakAtSetGames: true, tiebreakTo: 7 });
export type Side = "A" | "B";
export const other = (s: Side): Side => (s === "A" ? "B" : "A");
export type SetKind = "set" | "stb";
export interface SetScore { a: number; b: number; kind: SetKind; /** Score du tie-break (jeu décisif) si le set finit 7-6. */ tb?: { a: number; b: number } }
/** played = joué ; retired = abandon en cours de match ; walkover_pair = forfait d'une paire ; walkover_match = forfait d'un match ; not_played = pas (encore) joué. */
export type MatchKind = "played" | "retired" | "walkover_pair" | "walkover_match" | "not_played";
export interface Proof { name: string; note?: string }
export interface MatchEntry { kind: MatchKind; sets: SetScore[]; /** Côté qui abandonne ou qui déclare forfait. */ side?: Side; comment?: string; proofs: Proof[] }
export const emptyMatch = (): MatchEntry => ({ kind: "not_played", sets: [], proofs: [] });
export type ScoreIssueCode = "set_invalid" | "stb_invalid" | "too_many_sets" | "match_already_decided" | "match_incomplete" | "third_set_undecided" | "third_set_stb_not_allowed" | "third_set_full_required" | "side_required" | "score_with_walkover" | "no_score";
export interface ScoreIssue { code: ScoreIssueCode; severity: "block" | "warn"; params?: Record<string, string | number> }
export interface MatchEval { winner: Side | null; issues: ScoreIssue[]; complete: boolean; label: string }
const winsOf = (sets: SetScore[]) => ({ A: sets.filter((s) => s.a > s.b).length, B: sets.filter((s) => s.b > s.a).length });
export function validSet(s: SetScore, c: ScoreConfig): boolean {
  if (!Number.isInteger(s.a) || !Number.isInteger(s.b) || s.a < 0 || s.b < 0 || s.a === s.b) return false;
  const hi = Math.max(s.a, s.b), lo = Math.min(s.a, s.b), g = c.setGames;
  if (s.kind === "stb") return hi >= c.superTiebreakTo && hi - lo >= 2 && (hi === c.superTiebreakTo ? lo <= hi - 2 : hi - lo === 2);
  if (hi === g) return lo <= g - 2; if (hi === g + 1) return lo === g - 1 || (lo === g && c.tiebreakAtSetGames);
  return !c.tiebreakAtSetGames && hi > g + 1 && hi - lo === 2;
}
/** Évalue un match : gagnant, anomalies (bloquantes ou avertissements) et libellé du score. */
export function evalMatch(m: MatchEntry, c: ScoreConfig): MatchEval {
  const issues: ScoreIssue[] = []; const B = (code: ScoreIssueCode, params?: ScoreIssue["params"]) => issues.push({ code, severity: "block", params }); const W = (code: ScoreIssueCode, params?: ScoreIssue["params"]) => issues.push({ code, severity: "warn", params });
  if (m.kind === "not_played") return { winner: null, issues: [{ code: "no_score", severity: "warn" }], complete: false, label: "—" };
  if (m.kind === "walkover_pair" || m.kind === "walkover_match") {
    if (!m.side) B("side_required"); if (m.sets.length) B("score_with_walkover");
    return { winner: m.side ? other(m.side) : null, issues, complete: !!m.side && !m.sets.length, label: "W.O." };
  }
  const need = c.bestOf === 1 ? 1 : 2; const label = m.sets.map((s) => (s.kind === "stb" ? `[${s.a}-${s.b}]` : `${s.a}-${s.b}${s.tb ? `(${Math.min(s.tb.a, s.tb.b)})` : ""}`)).join(" ") || "—";
  let decided: Side | null = null; let a = 0, b = 0;
  m.sets.forEach((s, i) => {
    if (m.kind === "retired" && i === m.sets.length - 1 && !validSet(s, c) && Number.isInteger(s.a) && Number.isInteger(s.b) && s.a >= 0 && s.b >= 0) return; // dernier set interrompu par l'abandon : score partiel, non compté
    if (decided && m.kind === "played") { B("match_already_decided", { set: i + 1 }); return; }
    if (i >= c.bestOf) { B("too_many_sets", { max: c.bestOf }); return; }
    const third = c.bestOf === 3 && i === 2;
    if (s.kind === "stb" && !third) { B("stb_invalid", { set: i + 1 }); return; }
    if (third) {
      if (s.kind === "stb" && (!c.superTiebreakAllowed || c.thirdSet === "full_set")) B("third_set_stb_not_allowed");
      else if (s.kind === "set" && c.thirdSet === "super_tiebreak") B("third_set_full_required");
      else if (c.thirdSet === "undecided") W("third_set_undecided");
    }
    if (!validSet(s, c)) { B(s.kind === "stb" ? "stb_invalid" : "set_invalid", { set: i + 1, score: `${s.a}-${s.b}` }); return; }
    if (s.a > s.b) a++; else b++; if (a === need) decided = "A"; if (b === need) decided = "B";
  });
  if (m.kind === "retired") { if (!m.side) B("side_required"); const w = m.side ? other(m.side) : null; return { winner: w, issues, complete: !!w, label: `${label} (ret.)` }; }
  if (!decided) { if (m.sets.length) B("match_incomplete"); else B("no_score"); }
  return { winner: decided, issues, complete: !!decided && !issues.some((i) => i.severity === "block"), label };
}
export const hasBlock = (e: { issues: ScoreIssue[] }) => e.issues.some((i) => i.severity === "block");
export interface TieResult { a: number; b: number; winner: Side | null; complete: boolean; label: string }
/** Résultat de la rencontre : nombre de matchs gagnés ; « complet » quand les trois matchs ont un gagnant et aucune anomalie bloquante. */
export function tieResult(ms: MatchEntry[], c: ScoreConfig): TieResult {
  const ev = ms.map((m) => evalMatch(m, c)); const a = ev.filter((e) => e.winner === "A").length, b = ev.filter((e) => e.winner === "B").length;
  const complete = ev.length === 3 && ev.every((e) => e.complete);
  return { a, b, winner: complete ? (a > b ? "A" : "B") : null, complete, label: `${a}–${b}` };
}
export { winsOf };
