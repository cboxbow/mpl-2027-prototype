/**
 * D0 — REGISTRE DES RÈGLES INTERCLUB (DEC-IC-01 à DEC-IC-33).
 * ⚠ DÉMONSTRATION : aucune règle n'est approuvée par le Comité sauf DEC-IC-33 (décision documentée N0).
 * Une « validation de démonstration » ou une « simulation » ne change JAMAIS le statut réglementaire.
 * Fonctions pures, sans réseau.
 */
import { tr } from "@/lib/i18n";

export type RuleStatus = "documented" | "proposed" | "contradictory" | "to_decide" | "obsolete";
export type ModuleKey = "D1" | "D2" | "D3" | "D4";
export type Level = "red" | "orange" | "green" | "";
export interface RuleDef {
  id: string; num: number; subject: string; subjectEn: string;
  /** Valeur proposée (proposition la plus récente trouvée dans les documents, non approuvée). */
  proposal: string; source: string; contradiction: string; status: RuleStatus; devNote: string; arbitration: string;
  impacts: Record<ModuleKey, { l: Level; n: string }>;
  /** Valeur approuvée : renseignée UNIQUEMENT lorsqu'une décision documentée existe (date + référence). */
  approved?: { value: string; ref: string; by: string; date: string };
}
export interface RuleHistoryItem { at: string; actor: string; action: string; note?: string }
/** Données propres à la démonstration (jamais une approbation). */
export interface RuleRuntime { sim?: string; demoValidation?: { by: string; at: string; note: string }; owner?: string; note?: string; history: RuleHistoryItem[] }

export const MODULES: ModuleKey[] = ["D1", "D2", "D3", "D4"];
export const STATUS_ORDER: RuleStatus[] = ["documented", "proposed", "contradictory", "to_decide", "obsolete"];
export const STATUS_LABEL: Record<RuleStatus, string> = {
  documented: tr("Confirmed by documented decision"), proposed: tr("Proposed for 2027"), contradictory: tr("Contradictory"), to_decide: tr("To be decided"), obsolete: tr("Obsolete"),
};
export const STATUS_SHORT: Record<RuleStatus, string> = { documented: tr("Confirmed"), proposed: tr("Proposed"), contradictory: tr("Contradictory"), to_decide: tr("To decide"), obsolete: tr("Obsolete") };
export const STATUS_TONE: Record<RuleStatus, string> = {
  documented: "bg-emerald-700 text-white", proposed: "bg-sky-700 text-white", contradictory: "bg-amber-700 text-white", to_decide: "bg-rose-700 text-white", obsolete: "bg-zinc-600 text-white",
};
export const LEVEL_LABEL: Record<Exclude<Level, "">, string> = { red: tr("Blocks official go-live"), orange: tr("Structuring (modelled with options)"), green: tr("Configurable (provisional default)") };
export const LEVEL_DOT: Record<Exclude<Level, "">, string> = { red: "bg-rose-600", orange: "bg-amber-500", green: "bg-emerald-600" };
/** Responsable de validation PROPOSÉ (à confirmer) : le prototype ne sait pas qui valide réellement. */
export const DEFAULT_OWNER = "MPL Directing Committee (to be confirmed)";
export const MODULE_LABEL: Record<ModuleKey, string> = { D1: tr("D1 Engagements"), D2: tr("D2 Eligibility, calendar"), D3: tr("D3 Ties, results"), D4: tr("D4 Standings, finals") };

/** Une règle n'est « officielle » que si son statut est « confirmé par décision documentée » ET qu'une valeur approuvée documentée existe. */
export const isOfficial = (r: RuleDef) => r.status === "documented" && !!r.approved;
export const statusCounts = (rules: RuleDef[]): Record<RuleStatus, number> => { const c: Record<RuleStatus, number> = { documented: 0, proposed: 0, contradictory: 0, to_decide: 0, obsolete: 0 }; for (const r of rules) c[r.status]++; return c; };
/** Règles qui bloquent la mise en service officielle d'un module (🔴). */
export const blockersOf = (rules: RuleDef[], m: ModuleKey) => rules.filter((r) => r.impacts[m].l === "red");
export const impactCounts = (rules: RuleDef[], m: ModuleKey): Record<Exclude<Level, "">, number> => { const c = { red: 0, orange: 0, green: 0 }; for (const r of rules) { const l = r.impacts[m].l; if (l) c[l]++; } return c; };
/** Libellé de valeur affichable : approuvée si documentée, sinon proposition marquée comme telle. */
export const valueKind = (r: RuleDef): "approved" | "proposed" => (isOfficial(r) ? "approved" : "proposed");
export const seedHistory = (r: RuleDef): RuleHistoryItem[] => [{ at: "2026-11-21 19:00", actor: "System", action: `Consolidated in phase 4D.0 — status: ${r.status}`, note: r.source }];
export const newRuntime = (r: RuleDef): RuleRuntime => ({ history: seedHistory(r) });
