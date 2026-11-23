/**
 * Lot 5B-8 — navigation de l'administration MPL en cinq espaces. Regroupement VISUEL : les neuf onglets historiques gardent leur identifiant
 * (`queue`, `overview`, `calendar`, `rankings`, `clubs`, `partners`, `referees`, `permissions`, `audit`) ; trois vues s'y ajoutent
 * (`summary`, `interclub`, `reports`) qui ne font que présenter des données existantes. Aucune règle métier ici.
 */
export const ADMIN_SPACES = ["overview", "competitions", "participants", "interclub", "admin"] as const;
export type AdminSpace = (typeof ADMIN_SPACES)[number];
export type AdminTab = "summary" | "overview" | "queue" | "calendar" | "referees" | "clubs" | "rankings" | "interclub" | "reports" | "audit" | "permissions" | "partners";
export const SPACE_TABS: Record<AdminSpace, AdminTab[]> = {
  overview: ["summary", "overview"],
  competitions: ["queue", "calendar", "referees"],
  participants: ["clubs", "rankings"],
  interclub: ["interclub"],
  admin: ["reports", "audit", "permissions", "partners"],
};
export const DEFAULT_TAB: AdminTab = "summary";
export const ALL_TABS: AdminTab[] = ADMIN_SPACES.flatMap((s) => SPACE_TABS[s]);
export const spaceOfTab = (t: AdminTab): AdminSpace => ADMIN_SPACES.find((s) => SPACE_TABS[s].includes(t)) ?? "overview";
/** Adresse → onglet. `?tab=` (anciens identifiants compris) l'emporte ; `?space=` seul ouvre le 1er onglet de l'espace ; valeur inconnue → synthèse. */
export function resolveAdminTab(tab: string | null, space: string | null): AdminTab {
  if (tab && (ALL_TABS as string[]).includes(tab)) return tab as AdminTab;
  if (space && (ADMIN_SPACES as readonly string[]).includes(space)) return SPACE_TABS[space as AdminSpace][0];
  return DEFAULT_TAB;
}
/** Adresse partageable d'une vue (la synthèse reste `/admin`, compatible avec l'ancien lien). */
export const adminHref = (t: AdminTab) => (t === DEFAULT_TAB ? "/admin" : `/admin?tab=${t}`);
