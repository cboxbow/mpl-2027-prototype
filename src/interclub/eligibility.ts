/**
 * D2 — MOTEUR D'ÉLIGIBILITÉ CONFIGURABLE (fonctions pures).
 * ⚠ Les règles DEC-IC-08 (seuils par division) et DEC-IC-12 (paires) sont PROVISOIRES. Aucun seuil n'est défini par défaut ;
 * un seuil saisi par l'administration est une SIMULATION : il produit un constat marqué « provisoire » qui ne bloque jamais une soumission.
 * Trois résultats : éligible · non éligible · vérification nécessaire. Aucune décision n'est officielle.
 */
import { PLAYERS } from "@/data/demo";
import { rankOf } from "./seed";
import type { EngPlayer } from "./engagement";

export type Verdict = "eligible" | "not_eligible" | "check";
export type Policy = "eligible" | "check" | "not_eligible";
export interface Threshold { /** Meilleur rang autorisé (ex. 1). Un joueur mieux classé est « trop fort » pour la division. */ minRank?: number | null; /** Plus mauvais rang autorisé. */ maxRank?: number | null }
export interface EligParams {
  /** Seuils par division : AUCUN par défaut (DEC-IC-08 non décidée). Valeur saisie = simulation provisoire. */
  thresholds: Record<string, Threshold>;
  /** Joueur non classé (DEC-IC-11, contradictoire). */ unranked: Policy;
  /** Joueur de club différent de l'équipe (appartenance). */ membershipMismatch: Policy;
  /** Joueur listé par un autre club (exclusivité, DEC-IC-10). */ exclusivity: Policy;
  /** Joueur listé dans plusieurs divisions du même club (changement/participation multiple). */ multiDivision: Policy;
  /** Joueur ne correspondant pas au genre de la division. */ genderMismatch: Policy;
  /** Joueur plus fort que la division (participation en division inférieure) / plus faible (supérieure), quand un seuil simulé existe. */ outOfBand: Policy;
  /** Nombre maximal de remplaçants par équipe (null = non défini, pas de contrôle). */ maxSubs: number | null;
  /** Un même joueur peut-il figurer dans deux paires d'une même composition ? (DEC-IC-12, provisoire) */ allowPlayerInTwoPairs: boolean;
  /** Remplaçant hors liste d'engagement du club. */ subOutsideList: Policy;
}
export const defaultEligParams = (): EligParams => ({ thresholds: {}, unranked: "check", membershipMismatch: "check", exclusivity: "check", multiDivision: "check", genderMismatch: "check", outOfBand: "check", maxSubs: null, allowPlayerInTwoPairs: false, subOutsideList: "check" });

export type FindingCode = "club_member" | "club_member_unknown" | "exclusive" | "unranked" | "rank_unknown" | "threshold_undefined" | "too_strong" | "too_weak" | "multi_division" | "gender" | "sub_outside_list" | "not_listed" | "no_threshold_for_division";
export interface Finding { code: FindingCode; verdict: Verdict; /** Constat issu d'une règle ou d'un seuil non approuvé : jamais bloquant officiellement. */ provisional: boolean; ruleId?: string; params?: Record<string, string | number> }
export interface Waiver { id: string; clubId: string; division: string; playerId: string; /** Code du constat concerné. */ code: FindingCode; reason: string; status: "requested" | "granted" | "refused"; requestedAt: string; decidedAt?: string; decidedBy?: string; decisionNote?: string; history: Array<{ at: string; actor: string; action: string; note?: string }> }
export interface EligInput {
  params: EligParams; clubId: string; division: string; role: "titular" | "sub";
  /** Joueur issu de la liste d'engagement. */ listed?: EngPlayer;
  /** playerId → clubId des autres clubs (engagements actifs). */ otherClubs: Map<string, string>;
  /** Divisions où le joueur est listé par ce club. */ listedDivisions: string[];
  waivers?: Waiver[];
}
export interface EligResult { verdict: Verdict; findings: Finding[]; /** Constats couverts par une dérogation accordée (simulée). */ waived: FindingCode[]; official: false }

const worse = (a: Verdict, b: Verdict): Verdict => (a === "not_eligible" || b === "not_eligible" ? "not_eligible" : a === "check" || b === "check" ? "check" : "eligible");
const fromPolicy = (p: Policy): Verdict => p;
export const divGender = (division: string) => (division.endsWith("F") ? "F" : "M");

/** Évalue un joueur pour une division. Retourne le pire constat ; un constat « eligible » n'est jamais listé. */
export function evaluatePlayer(i: EligInput): EligResult {
  const f: Finding[] = []; const P = i.params; const L = i.listed;
  const add = (code: FindingCode, verdict: Verdict, extra: Partial<Finding> = {}) => { if (verdict !== "eligible") f.push({ code, verdict, provisional: true, ...extra }); };
  if (!L) { f.push({ code: "not_listed", verdict: "not_eligible", provisional: false }); return finish(f, i); }
  const pl = L.playerId ? PLAYERS.find((p) => p.id === L.playerId) : undefined;
  // Appartenance au club (base joueurs du prototype)
  if (!pl) add("club_member_unknown", "check");
  else if (pl.clubId !== i.clubId) add("club_member", fromPolicy(P.membershipMismatch), { ruleId: "DEC-IC-10", params: { club: pl.clubId } });
  // Exclusivité pour la saison
  const other = L.playerId ? i.otherClubs.get(L.playerId) : undefined; if (other) add("exclusive", fromPolicy(P.exclusivity), { ruleId: "DEC-IC-10", params: { club: other } });
  // Genre de la division
  if (pl && pl.gender !== divGender(i.division)) add("gender", fromPolicy(P.genderMismatch), { params: { division: i.division } });
  // Classement MPL de référence (snapshot figé de démonstration) et seuils
  const rank = L.playerId ? rankOf(L.playerId) : (L.rank ?? null); const th = P.thresholds[i.division]; const hasTh = !!th && (th.minRank != null || th.maxRank != null);
  if (rank == null) { add(L.rank === undefined ? "rank_unknown" : "unranked", L.rank === undefined ? "check" : fromPolicy(P.unranked), { ruleId: "DEC-IC-11" }); }
  else if (!hasTh) add("no_threshold_for_division", "check", { ruleId: "DEC-IC-08", params: { division: i.division } });
  else {
    if (th.minRank != null && rank < th.minRank) add("too_strong", fromPolicy(P.outOfBand), { ruleId: "DEC-IC-08", params: { rank, min: th.minRank, division: i.division } });
    if (th.maxRank != null && rank > th.maxRank) add("too_weak", fromPolicy(P.outOfBand), { ruleId: "DEC-IC-08", params: { rank, max: th.maxRank, division: i.division } });
  }
  // Participation dans plusieurs divisions (changement de division / division supérieure)
  const others = i.listedDivisions.filter((d) => d !== i.division); if (others.length) add("multi_division", fromPolicy(P.multiDivision), { params: { divisions: others.join(", ") } });
  return finish(f, i);
}
function finish(f: Finding[], _i: EligInput): EligResult {
  return { verdict: f.reduce<Verdict>((v, x) => worse(v, x.verdict), "eligible"), findings: f, waived: [], official: false };
}
/** Évalue un joueur par son identifiant d'engagement (applique les dérogations accordées de ce joueur). */
export function evaluateListed(base: Omit<EligInput, "listed" | "listedDivisions" | "role"> & { players: EngPlayer[]; engId: string; role?: "titular" | "sub" }): EligResult {
  const L = base.players.find((p) => p.id === base.engId && p.division === base.division); const lists = L?.playerId ? [...new Set(base.players.filter((p) => p.playerId === L.playerId).map((p) => p.division))] : [];
  const r = evaluatePlayer({ params: base.params, clubId: base.clubId, division: base.division, role: base.role ?? "titular", listed: L, otherClubs: base.otherClubs, listedDivisions: lists });
  const waived = (base.waivers ?? []).filter((w) => w.status === "granted" && w.clubId === base.clubId && w.division === base.division && w.playerId === base.engId && r.findings.some((x) => x.code === w.code)).map((w) => w.code);
  return { ...r, waived, verdict: r.findings.filter((x) => !waived.includes(x.code)).reduce<Verdict>((v, x) => worse(v, x.verdict), "eligible") };
}
/** Un constat bloque une soumission uniquement s'il est NON provisoire (ex. joueur absent de la liste d'engagement). */
export const blocksSubmission = (r: EligResult) => r.findings.some((x) => !x.provisional && x.verdict === "not_eligible" && !r.waived.includes(x.code));
export const summarize = (rs: EligResult[]) => ({ eligible: rs.filter((r) => r.verdict === "eligible").length, not_eligible: rs.filter((r) => r.verdict === "not_eligible").length, check: rs.filter((r) => r.verdict === "check").length });
