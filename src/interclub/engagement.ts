/**
 * D1 — FORMULAIRE D'ENGAGEMENT DES CLUBS : types, validation, doublons, exclusivité, statuts. Fonctions pures.
 * ⚠ Données fictives, aucun paiement, aucune signature légale. Règles non validées = AVERTISSEMENTS (jamais bloquantes), sauf structure du formulaire.
 */
import { DIVISION_CODES, PROPOSED_DATES } from "./capacity";

export type LineStatus = "draft" | "submitted" | "to_complete" | "accepted" | "refused";
export type DossierStatus = LineStatus | "partial";
export interface EngPlayer { id: string; playerId?: string; name: string; /** null = NC (non classé). undefined = non renseigné. */ rank?: number | null; pair: "" | "P1" | "P2" | "P3"; division: string }
export interface EngClub { officialName: string; legalName: string; regNo: string; address: string; city: string; phone: string; email: string }
export interface EngContact { lastName: string; firstName: string; role: string; phone: string; email: string }
export interface EngHosting { homologated: number; fridayCourts: number; simultaneous: number; lighting: boolean; conditions: string; partnerConvention: boolean }
export type Avail = "" | "yes" | "maybe" | "no";
export interface EngDoc { id: string; name: string; type: string; size: number }
export interface EngForm {
  club: EngClub; contact: EngContact; divisions: Record<string, boolean>; players: EngPlayer[]; hosting: EngHosting; availability: Avail[];
  declarations: { rules: boolean; exclusivity: boolean; courts: boolean; fee: boolean }; docs: EngDoc[]; step: number;
}
export interface LineState { status: LineStatus; note?: string; decidedAt?: string; decidedBy?: string }
export interface HistoryItem { at: string; actor: string; action: string; note?: string; division?: string }
export interface DossierVersion { n: number; at: string; by: string; reason: string; form: EngForm; lines: Record<string, LineState> }
export interface Dossier { id: string; clubId: string; season: number; form: EngForm; lines: Record<string, LineState>; version: number; versions: DossierVersion[]; history: HistoryItem[]; createdAt: string; updatedAt: string; /** true = dossier de démonstration pré-rempli */ seeded?: boolean }
export const STEPS = 7;
export const MPL_ADDRESSEE = "__mpl__";

export const emptyForm = (clubName = "", seed: Partial<EngForm> = {}): EngForm => ({
  club: { officialName: clubName, legalName: "", regNo: "", address: "", city: "", phone: "", email: "" },
  contact: { lastName: "", firstName: "", role: "", phone: "", email: "" },
  divisions: Object.fromEntries(DIVISION_CODES.map((c) => [c, false])), players: [],
  hosting: { homologated: 0, fridayCourts: 0, simultaneous: 0, lighting: false, conditions: "", partnerConvention: false },
  availability: PROPOSED_DATES.map(() => ""), declarations: { rules: false, exclusivity: false, courts: false, fee: false }, docs: [], step: 1, ...seed,
});
export const wantedDivisions = (f: EngForm) => DIVISION_CODES.filter((c) => f.divisions[c]);
export const newLines = (f: EngForm, prev: Record<string, LineState> = {}): Record<string, LineState> => Object.fromEntries(wantedDivisions(f).map((c) => [c, prev[c] ?? { status: "draft" as LineStatus }]));

/** Statut du dossier dérivé des lignes-division (priorité : à compléter, brouillon, soumis, puis décisions). */
export function deriveStatus(lines: Record<string, LineState>): DossierStatus {
  const v = Object.values(lines); if (!v.length) return "draft";
  if (v.some((l) => l.status === "to_complete")) return "to_complete";
  if (v.some((l) => l.status === "draft")) return "draft";
  if (v.some((l) => l.status === "submitted")) return "submitted";
  const a = v.filter((l) => l.status === "accepted").length; return a === v.length ? "accepted" : a === 0 ? "refused" : "partial";
}
/** Le club peut-il modifier ce dossier ? Brouillon ou à compléter uniquement. */
export const isEditable = (lines: Record<string, LineState>) => ["draft", "to_complete"].includes(deriveStatus(lines));
/** Divisions modifiables : en brouillon toutes ; à compléter : seulement les lignes signalées (ou encore en brouillon). */
export const editableDivisions = (lines: Record<string, LineState>): Set<string> => new Set(Object.entries(lines).filter(([, l]) => l.status === "to_complete" || l.status === "draft").map(([c]) => c));
/** Applique une modification du club en respectant les lignes verrouillées (soumises, acceptées, refusées). */
export function applyClubEdit(d: Dossier, next: EngForm): Dossier {
  if (!isEditable(d.lines)) return d;
  const ed = editableDivisions(d.lines); const locked = Object.keys(d.lines).filter((c) => !ed.has(c));
  const divisions = { ...next.divisions }; for (const c of locked) divisions[c] = d.form.divisions[c];
  const players = [...next.players.filter((p) => !locked.includes(p.division)), ...d.form.players.filter((p) => locked.includes(p.division))];
  const form = { ...next, divisions, players };
  return { ...d, form, lines: newLines(form, d.lines) };
}

/* ───────── Validation ───────── */
export type Severity = "block" | "warn";
export interface Issue { code: string; severity: Severity; step: number; ruleId?: string; params?: Record<string, string | number>; division?: string }
export interface ValidationCtx {
  today: string; closeDate: string; lateBlocking: boolean; minHomologated: number; minPlayersPerTeam: number;
  /** playerId → clubId pour les joueurs listés dans les dossiers d'AUTRES clubs (soumis ou acceptés). */
  otherClubs: Map<string, string>; otherClubNames?: Map<string, string>; exclusivityBlocking?: boolean;
}
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
export const isPhone = (s: string) => /^\+?[0-9 ()-]{7,}$/.test(s.trim());
export const normName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function duplicatePlayers(players: EngPlayer[]): EngPlayer[][] {
  /** Doublon = même joueur (identifiant ou nom normalisé) listé deux fois dans la MÊME division. */
  const out: EngPlayer[][] = []; const seen = new Set<string>();
  for (const div of new Set(players.map((p) => p.division))) {
    const inDiv = players.filter((p) => p.division === div);
    for (const p of inDiv) { const grp = inDiv.filter((q) => (p.playerId && q.playerId === p.playerId) || (normName(p.name) !== "" && normName(q.name) === normName(p.name))); if (grp.length > 1) { const key = div + ":" + grp.map((x) => x.id).sort().join("|"); if (!seen.has(key)) { seen.add(key); out.push(grp); } } }
  }
  return out;
}
/** Joueurs déjà listés par un autre club (exclusivité, DEC-IC-10). */
export const exclusivityConflicts = (players: EngPlayer[], otherClubs: Map<string, string>) => players.filter((p) => p.playerId && otherClubs.has(p.playerId));
export function validateForm(f: EngForm, ctx: ValidationCtx): Issue[] {
  const out: Issue[] = []; const B = (code: string, step: number, extra: Partial<Issue> = {}) => out.push({ code, severity: "block", step, ...extra }); const W = (code: string, step: number, extra: Partial<Issue> = {}) => out.push({ code, severity: "warn", step, ...extra });
  if (!f.club.officialName.trim() || !f.club.address.trim() || !f.club.city.trim()) B("club_required", 1);
  if (!isEmail(f.club.email) || !isPhone(f.club.phone)) B("club_contact_invalid", 1);
  if (!f.contact.lastName.trim() || !f.contact.firstName.trim() || !f.contact.role.trim()) B("contact_required", 2);
  if (!isEmail(f.contact.email) || !isPhone(f.contact.phone)) B("contact_invalid", 2);
  const wanted = wantedDivisions(f); if (!wanted.length) B("no_division", 3);
  const dups = duplicatePlayers(f.players); for (const g of dups) B("duplicate_player", 4, { params: { name: g[0].name } });
  for (const p of f.players) { if (!p.name.trim()) B("player_name", 4); if (p.rank === undefined) B("rank_missing", 4, { params: { name: p.name || "?" } }); }
  if (!f.declarations.rules || !f.declarations.exclusivity || !f.declarations.courts || !f.declarations.fee) B("declaration_missing", 7);
  for (const c of wanted) {
    const pl = f.players.filter((p) => p.division === c);
    if (pl.length < ctx.minPlayersPerTeam) W("few_players", 4, { ruleId: "DEC-IC-07", division: c, params: { division: c, n: pl.length, min: ctx.minPlayersPerTeam } });
    if (pl.some((p) => p.pair === "")) W("pair_missing", 4, { ruleId: "DEC-IC-12", division: c, params: { division: c } });
  }
  for (const p of exclusivityConflicts(f.players, ctx.otherClubs)) (ctx.exclusivityBlocking ? B : W)("exclusivity", 4, { ruleId: "DEC-IC-10", params: { name: p.name, club: ctx.otherClubNames?.get(ctx.otherClubs.get(p.playerId!)!) ?? ctx.otherClubs.get(p.playerId!) ?? "?" } });
  if (f.hosting.homologated < ctx.minHomologated && !f.hosting.partnerConvention) W("few_courts", 5, { ruleId: "DEC-IC-03", params: { n: f.hosting.homologated, min: ctx.minHomologated } });
  if (f.hosting.fridayCourts > f.hosting.homologated) B("friday_above_total", 5);
  const missing = f.availability.filter((a) => a === "").length; if (missing) W("availability_missing", 6, { ruleId: "DEC-IC-15", params: { n: missing } });
  if (ctx.today > ctx.closeDate) (ctx.lateBlocking ? B : W)("late", 7, { ruleId: "DEC-IC-02", params: { date: ctx.closeDate } });
  return out;
}
export const blocking = (i: Issue[]) => i.filter((x) => x.severity === "block");
/** Rang MPL à partir du snapshot de démonstration (null = NC). */
export const rankLabel = (r: number | null | undefined) => (r === undefined ? "?" : r === null ? "NC" : String(r));
/** Teams per division counts for a list of dossiers (lignes acceptées, ou soumises + acceptées). */
export function teamCounts(dossiers: Dossier[], statuses: LineStatus[]): Record<string, number> {
  const c: Record<string, number> = {}; for (const d of dossiers) for (const [div, l] of Object.entries(d.lines)) if (statuses.includes(l.status)) c[div] = (c[div] ?? 0) + 1; return c;
}
/** playerId → clubId, pour les dossiers d'autres clubs (hors brouillons et refusés). */
export function otherClubsMap(dossiers: Dossier[], clubId: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const d of dossiers) { if (d.clubId === clubId) continue; for (const [div, l] of Object.entries(d.lines)) { if (!["submitted", "accepted", "to_complete"].includes(l.status)) continue; for (const p of d.form.players) if (p.division === div && p.playerId) m.set(p.playerId, d.clubId); } }
  return m;
}
