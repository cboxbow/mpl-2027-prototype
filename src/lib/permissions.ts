/**
 * MATRICE DE PERMISSIONS DE DÉMONSTRATION (vague C).
 * ⚠ Aucune authentification réelle : ces contrôles sont appliqués par les fonctions du prototype (réducteur + store) pour démontrer
 * le modèle de périmètres, mais NE CONSTITUENT PAS une sécurité de production.
 * Fonctions pures, sans réseau.
 */
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { tr } from "@/lib/i18n";

export type Role = "visitor" | "player" | "organizer" | "admin" | "club_admin" | "club_staff" | "director" | "referee";
/** Rôles de la matrice (« organizer » est l'ancien rôle de démonstration : alias de Tournament Director). */
export const MATRIX_ROLES: Role[] = ["admin", "club_admin", "club_staff", "director", "referee", "player", "visitor"];
export const ROLE_ALIAS: Partial<Record<Role, Role>> = { organizer: "director" };
export const canonicalRole = (r: Role): Role => ROLE_ALIAS[r] ?? r;
/** Périmètre : tout · son club · tournois attribués · soi-même. */
export type Scope = "all" | "club" | "assigned" | "self";
export type Perm =
  | "public.view" | "registration.self" | "club.view" | "club.profile.edit" | "club.courts.edit" | "club.staff.manage" | "club.report.export"
  | "sheet.view" | "sheet.lineup" | "sheet.score" | "sheet.contest" | "sheet.referee" | "sheet.assign" | "sheet.commission" | "sheet.correction.request" | "sheet.incident" | "sheet.flag" | "d3.config"
  | "sheet.cancel" | "d4.rules" | "d4.decide" | "d4.finals" | "d4.dashboard"
  | "request.create" | "request.decide" | "referee.assign" | "entries.view" | "entries.decide" | "pairs.sportive"
  | "draw.edit" | "draw.publish" | "draw.lock" | "correction.request" | "correction.decide" | "schedule.edit" | "scores.enter" | "scores.validate"
  | "incident.report" | "audit.view" | "queue.resolve" | "matrix.view" | "snapshot.publish"
  | "interclub.view" | "rules.view" | "rules.edit" | "engagement.view" | "engagement.edit" | "engagement.submit" | "engagement.decide" | "engagement.export" | "engagement.history" | "season.config" | "composition.view" | "composition.edit" | "composition.submit" | "composition.review" | "waiver.request" | "waiver.decide" | "d2.config" | "prep.validate" | "eligibility.config";

type Row = { label: string; roles: Partial<Record<Role, Scope>> };
const ALL_USERS: Partial<Record<Role, Scope>> = { admin: "all", club_admin: "all", club_staff: "all", director: "all", referee: "all", player: "all", visitor: "all" };
export const MATRIX: Record<Perm, Row> = {
  "public.view": { label: tr("View public pages (calendar, draws, validated results)"), roles: ALL_USERS },
  "registration.self": { label: tr("Register own pair to a tournament"), roles: { player: "self" } },
  "club.view": { label: tr("View club portal"), roles: { admin: "all", club_admin: "club", club_staff: "club", director: "club" } },
  "club.profile.edit": { label: tr("Edit club profile and contacts"), roles: { club_admin: "club" } },
  "club.courts.edit": { label: tr("Manage the club courts"), roles: { club_admin: "club", club_staff: "club" } },
  "club.staff.manage": { label: tr("Manage club managers and roles"), roles: { club_admin: "club" } },
  "club.report.export": { label: tr("Export club reports (CSV)"), roles: { admin: "all", club_admin: "club", club_staff: "club", director: "club", referee: "assigned" } },
  "request.create": { label: tr("Submit a tournament organisation request"), roles: { club_admin: "club", director: "club" } },
  "request.decide": { label: tr("Approve or refuse organisation requests"), roles: { admin: "all" } },
  "referee.assign": { label: tr("Assign a referee to a tournament"), roles: { admin: "all" } },
  "entries.view": { label: tr("View registrations"), roles: { admin: "all", club_admin: "club", club_staff: "club", director: "club", referee: "assigned" } },
  "entries.decide": { label: tr("Confirm or refuse registrations"), roles: { club_admin: "club", director: "club" } },
  "pairs.sportive": { label: tr("Sporting validation of pairs"), roles: { referee: "assigned", director: "club" } },
  "draw.edit": { label: tr("Prepare seeds and generate or edit draws"), roles: { director: "club", referee: "assigned" } },
  "draw.publish": { label: tr("Mark ready and publish draws"), roles: { director: "club", referee: "assigned" } },
  "draw.lock": { label: tr("Lock a published draw"), roles: { admin: "all", referee: "assigned" } },
  "correction.request": { label: tr("Request an exceptional correction"), roles: { club_admin: "club", director: "club", referee: "assigned" } },
  "correction.decide": { label: tr("Approve or refuse exceptional corrections"), roles: { admin: "all" } },
  "schedule.edit": { label: tr("Schedule matches and assign courts"), roles: { club_staff: "club", director: "club", referee: "assigned" } },
  "scores.enter": { label: tr("Enter scores, walkovers and retirements"), roles: { club_staff: "club", director: "club", referee: "assigned" } },
  "scores.validate": { label: tr("Validate or reject submitted results"), roles: { admin: "all" } },
  "incident.report": { label: tr("Report incidents"), roles: { club_staff: "club", director: "club", referee: "assigned" } },
  "audit.view": { label: tr("View the audit log"), roles: { admin: "all", club_admin: "club", director: "club", referee: "assigned" } },
  "queue.resolve": { label: tr("Resolve validation queue items"), roles: { admin: "all" } },
  "matrix.view": { label: tr("View the permission matrix"), roles: { admin: "all" } },
  "snapshot.publish": { label: tr("Publish a ranking snapshot (local simulation, never official)"), roles: { admin: "all" } },
  "interclub.view": { label: tr("Open the Interclub area (season, capacity simulator)"), roles: { admin: "all", club_admin: "club", club_staff: "club", director: "club" } },
  "rules.view": { label: tr("View the Interclub rules register"), roles: { admin: "all", club_admin: "club", club_staff: "club", director: "club" } },
  "rules.edit": { label: tr("Simulate rules and record demo notes (never an approval)"), roles: { admin: "all" } },
  "engagement.view": { label: tr("View the club engagement file"), roles: { admin: "all", club_admin: "club", club_staff: "club", director: "club" } },
  "engagement.edit": { label: tr("Create and edit the club engagement draft"), roles: { club_admin: "club" } },
  "engagement.submit": { label: tr("Submit the club engagement file"), roles: { club_admin: "club" } },
  "engagement.decide": { label: tr("Instruct engagement files (request changes, accept, refuse — simulated)"), roles: { admin: "all" } },
  "composition.view": { label: tr("View team compositions (P1/P2/P3, substitutes)"), roles: { admin: "all", club_admin: "club", club_staff: "club", director: "club" } },
  "composition.edit": { label: tr("Build and save a team composition draft"), roles: { club_admin: "club", club_staff: "club" } },
  "composition.submit": { label: tr("Submit a team composition"), roles: { club_admin: "club" } },
  "composition.review": { label: tr("Check or return submitted compositions (simulated)"), roles: { admin: "all" } },
  "waiver.request": { label: tr("Request an eligibility waiver"), roles: { club_admin: "club" } },
  "waiver.decide": { label: tr("Decide eligibility waivers (simulated)"), roles: { admin: "all" } },
  "eligibility.config": { label: tr("Configure provisional eligibility parameters (simulation)"), roles: { admin: "all" } },
  "d2.config": { label: tr("Prepare pools and calendar (formats, draw, hosts)"), roles: { admin: "all" } },
  "prep.validate": { label: tr("Move preparation items to Ready / Validated in demo"), roles: { admin: "all" } },
  "engagement.export": { label: tr("Export engagement files (PDF, CSV)"), roles: { admin: "all", club_admin: "club", club_staff: "club", director: "club" } },
  "engagement.history": { label: tr("View the engagement history and versions"), roles: { admin: "all", club_admin: "club" } },
  "sheet.view": { label: tr("View Interclub match sheets"), roles: { admin: "all", club_admin: "club", club_staff: "club", director: "club", referee: "all" } },
  "sheet.lineup": { label: tr("Edit and confirm the match-day line-up (captain)"), roles: { club_admin: "club", club_staff: "club" } },
  "sheet.score": { label: tr("Enter and submit match scores (captain)"), roles: { club_admin: "club", club_staff: "club" } },
  "sheet.contest": { label: tr("Contest a submitted result (opposing club)"), roles: { club_admin: "club", club_staff: "club" } },
  "sheet.referee": { label: tr("Check or return a submitted sheet (assigned referee)"), roles: { referee: "all" } },
  "sheet.assign": { label: tr("Create sheets from the calendar and assign referees"), roles: { admin: "all" } },
  "sheet.commission": { label: tr("Decide match sheets (simulated, never official)"), roles: { admin: "all" } },
  "sheet.correction.request": { label: tr("Request a correction of a validated sheet"), roles: { club_admin: "club", club_staff: "club", referee: "all" } },
  "sheet.incident": { label: tr("Report incidents on a match sheet"), roles: { admin: "all", club_admin: "club", club_staff: "club", referee: "all" } },
  "sheet.flag": { label: tr("Postpone, interrupt, resume or record a team forfeit"), roles: { admin: "all", referee: "all" } },
  "sheet.cancel": { label: tr("Cancel or restore a scheduled tie (Commission, simulated)"), roles: { admin: "all" } },
  "d4.rules": { label: tr("Configure the provisional points scale and tie-break order"), roles: { admin: "all" } },
  "d4.decide": { label: tr("Record a Commission decision on an unresolved tie (simulated)"), roles: { admin: "all" } },
  "d4.finals": { label: tr("Generate and advance the final phases (simulated)"), roles: { admin: "all" } },
  "d4.dashboard": { label: tr("Open the Commission dashboard (standings preview, alerts)"), roles: { admin: "all" } },
  "d3.config": { label: tr("Configure the provisional score engine and forfeit simulation mode"), roles: { admin: "all" } },
  "season.config": { label: tr("Configure the Interclub season (D2H, maximums, closing date)"), roles: { admin: "all" } },
};
export const PERMS = Object.keys(MATRIX) as Perm[];
/** Groupes d'affichage de la matrice. */
export const PERM_GROUPS: Array<{ title: string; perms: Perm[] }> = [
  { title: tr("Public and players"), perms: ["public.view", "registration.self"] },
  { title: tr("Club portal"), perms: ["club.view", "club.profile.edit", "club.courts.edit", "club.staff.manage", "club.report.export", "request.create"] },
  { title: tr("Tournament operations"), perms: ["entries.view", "entries.decide", "pairs.sportive", "draw.edit", "draw.publish", "draw.lock", "schedule.edit", "scores.enter", "incident.report"] },
  { title: tr("MPL administration"), perms: ["request.decide", "referee.assign", "scores.validate", "correction.request", "correction.decide", "queue.resolve", "audit.view", "matrix.view", "snapshot.publish"] },
  { title: tr("Interclub (D0/D1 demo)"), perms: ["interclub.view", "rules.view", "rules.edit", "engagement.view", "engagement.edit", "engagement.submit", "engagement.decide", "engagement.export", "engagement.history", "season.config"] },
  { title: tr("Interclub D2 (eligibility, compositions, pools, calendar)"), perms: ["composition.view", "composition.edit", "composition.submit", "composition.review", "waiver.request", "waiver.decide", "eligibility.config", "d2.config", "prep.validate"] },
  { title: tr("Interclub D3 (match sheets, scores, validation)"), perms: ["sheet.view", "sheet.lineup", "sheet.score", "sheet.contest", "sheet.referee", "sheet.assign", "sheet.commission", "sheet.correction.request", "sheet.incident", "sheet.flag", "d3.config"] },
  { title: tr("Interclub D4 (standings, final phases, dashboard)"), perms: ["sheet.cancel", "d4.rules", "d4.decide", "d4.finals", "d4.dashboard"] },
];
export const SCOPE_LABEL: Record<Scope, string> = { all: tr("All"), club: tr("Own club"), assigned: tr("Assigned tournaments"), self: tr("Self") };

export interface PermCtx { clubId?: string; refereeId?: string; assignments?: Record<string, string>; eventId?: string; targetClub?: string }
export type Decision = { ok: true; scope: Scope } | { ok: false; reason: "role" | "scope" };
/** Contrôle d'une action pour un rôle dans un périmètre : club de l'utilisateur démo / tournois attribués au juge-arbitre. */
export function can(role: Role, perm: Perm, ctx: PermCtx = {}): Decision {
  const scope = MATRIX[perm].roles[canonicalRole(role)];
  if (!scope) return { ok: false, reason: "role" };
  if (scope === "all" || scope === "self") return { ok: true, scope };
  const evClub = ctx.targetClub ?? (ctx.eventId ? CALENDAR_EVENTS.find((e) => e.id === ctx.eventId)?.club : undefined);
  if (scope === "club") return evClub && ctx.clubId && evClub === ctx.clubId ? { ok: true, scope } : { ok: false, reason: "scope" };
  return ctx.eventId && ctx.refereeId && ctx.assignments?.[ctx.eventId] === ctx.refereeId ? { ok: true, scope } : { ok: false, reason: "scope" };
}
export const allowed = (role: Role, perm: Perm, ctx?: PermCtx) => can(role, perm, ctx).ok;
export const roleLabel = (r: Role) => ({ admin: tr("MPL Admin"), club_admin: tr("Club Admin"), club_staff: tr("Club Staff"), director: tr("Tournament Director"), referee: tr("Referee"), player: tr("Player"), visitor: tr("Visitor"), organizer: tr("Organizer") }[r]);
/** Événements dans le périmètre d'un rôle (club, tournois attribués, ou tous pour l'administration). */
export function scopedEventIds(role: Role, ctx: PermCtx): string[] {
  const r = canonicalRole(role);
  if (r === "admin") return CALENDAR_EVENTS.map((e) => e.id);
  if (r === "referee") return CALENDAR_EVENTS.filter((e) => ctx.assignments?.[e.id] === ctx.refereeId && !!ctx.refereeId).map((e) => e.id);
  if (r === "club_admin" || r === "club_staff" || r === "director") return CALENDAR_EVENTS.filter((e) => e.club === ctx.clubId).map((e) => e.id);
  return [];
}
/** Rôles autorisés à ouvrir un écran d'opérations de tournoi (organisateur, directeur, club, juge-arbitre). */
export const OPS_ROLES: Role[] = ["organizer", "director", "club_admin", "club_staff", "referee"];
export const CLUB_ROLES: Role[] = ["club_admin", "club_staff", "director", "organizer"];
/** Référents de démonstration (juges-arbitres fictifs). */
export const DEMO_REFEREES = [{ id: "REF-01", name: "Jean-Marc Lafleur (fictif)" }, { id: "REF-02", name: "Nadine Ramgoolam (fictive)" }, { id: "REF-03", name: "Kevin Atchia (fictif)" }];
export const refereeName = (id?: string) => DEMO_REFEREES.find((r) => r.id === id)?.name ?? "—";
/** Libellés anglais stockés dans le journal d'audit (traduits à l'affichage par trDyn). */
export const ROLE_EN: Record<Role, string> = { admin: "MPL Admin", club_admin: "Club Admin", club_staff: "Club Staff", director: "Tournament Director", referee: "Referee", player: "Player", visitor: "Visitor", organizer: "Organizer" };
