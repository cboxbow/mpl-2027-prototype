/**
 * ÉTAT DE DÉMONSTRATION PARTAGÉ ENTRE LES RÔLES (joueur, organisateur, administration).
 * Fonctions pures (réducteur) : aucune connexion réseau, aucun backend, aucun Supabase. Persisté en localStorage uniquement.
 */
import { DEFAULT_DEMO_PLAYER, DEFAULT_ORGANIZER_CLUB, DEMO_TODAY } from "@/config/demo-config";
import { tr } from "@/lib/i18n";
import { shiftDate } from "@/lib/format";
import type { Division } from "@/data/demo";
import { stageOf, type DrawConfig, type DrawStage, type MatchHist, type MatchResult, type MatchState } from "@/lib/bracket";
import { can, ROLE_EN, type Perm, type Role } from "@/lib/permissions";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { hydrateIc, icApply, icGuard, initialIc, type IcAction, type IcState } from "@/interclub/state";
export type { Role } from "@/lib/permissions";

export type RegStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "waitlist" | "withdrawn";
/** Historique propre à une inscription (alimente l'espace joueur et l'écran de gestion organisateur). */
export interface RegHistoryItem { at: string; actor: string; action: string; note?: string }
export interface DemoRegistration { id: string; eventId: string; division: Division; playerId: string; partnerId: string; status: RegStatus; createdAt: string; amount: number; decidedAt?: string; decidedBy?: string; reason?: string; history?: RegHistoryItem[] }
export interface QueueItem { id: string; kind: "result" | "licence" | "calendar" | "club"; title: string; detail: string; by: string; status: "pending" | "approved" | "rejected"; matchRef?: { eventId: string; division: string; matchId: string }; requestRef?: string; correctionRef?: string }
export interface ScoreEntry { value: string; queueId: string; at: string }
export interface OrgState { validated: string[]; refused: string[]; withdrawn: string[]; drawPublished: string[]; scores: Record<string, ScoreEntry> }
export interface AuditEntry { at: string; actor: string; action: string; ref?: string }
export interface DemoNotification { id: string; at: string; kind: "registration" | "draw" | "ranking" | "club" | "interclub"; text: string; playerId?: string; eventId?: string; clubId?: string }
export interface NotifPrefs { open: boolean; draw: boolean; results: boolean }

/** Identité de démonstration de l'auteur d'une action (rôle + club + juge-arbitre) — contrôlée par le réducteur, pas seulement par l'interface. */
export interface Actor { role: Role; clubId?: string; refereeId?: string }
export interface TournamentRequest { id: string; clubId: string; eventId: string; note: string; status: "submitted" | "approved" | "rejected"; by: string; at: string; decidedAt?: string; decisionNote?: string; history: RegHistoryItem[] }
export type StaffRole = "club_admin" | "club_staff" | "director";
export interface StaffMember { id: string; name: string; role: StaffRole; email: string }
export interface ClubProfilePatch { contact?: string; phone?: string; email?: string; address?: string; about?: string }
export interface CourtItem { id: string; name: string; surface: string; covered: boolean; active: boolean }
export type IncidentKind = "injury" | "conduct" | "weather" | "equipment" | "other";
export interface Incident { id: string; eventId: string; division?: string; matchId?: string; kind: IncidentKind; text: string; by: string; at: string; status: "open" | "closed" }
export interface CorrectionRequest { id: string; eventId: string; division: string; reason: string; by: string; at: string; status: "pending" | "approved" | "refused" | "applied"; decidedAt?: string; decisionNote?: string }
export interface Sportive { status: "validated" | "flagged"; note?: string; by: string; at: string }
/** Version archivée d'un tableau publié, conservée avant toute correction exceptionnelle (jamais présentée comme résultat courant). */
export interface DrawArchive { id: string; eventId: string; division: string; version: number; cfg: DrawConfig; matches: Record<string, MatchState>; archivedAt: string; archivedBy: string; reason: string; trigger: "correction-modify" | "correction-delete"; correction?: CorrectionRequest }
export interface DemoState { /** D0/D1 : registre des règles et engagements Interclub (démonstration). */ ic: IcState; archives: DrawArchive[]; role: Role; playerId: string; organizerClub: string; registrations: DemoRegistration[]; queue: QueueItem[]; org: OrgState; audit: AuditEntry[]; snapshots: string[]; notifications: DemoNotification[]; prefs: NotifPrefs; draws: Record<string, DrawConfig>; matches: Record<string, MatchState>; refereeId: string; assignments: Record<string, string>; requests: TournamentRequest[]; staff: Record<string, StaffMember[]>; clubProfiles: Record<string, ClubProfilePatch>; courts: Record<string, CourtItem[]>; incidents: Incident[]; corrections: CorrectionRequest[]; sportive: Record<string, Sportive> }

export const drawKey = (eventId: string, division: string) => `${eventId}|${division}`;
export const matchKey = (eventId: string, division: string, matchId: string) => `${eventId}|${division}|${matchId}`;
export const STATE_KEY = "mpl27-demo-state-v2";
export const ACTIVE: RegStatus[] = ["pending", "confirmed"];
export const isActive = (r: Pick<DemoRegistration, "status">) => ACTIVE.includes(r.status);
/** Inscription « tenue » : occupe une place OU attend sur la liste d'attente (bloque les doublons et les conflits de dates). */
export const HOLDING: RegStatus[] = ["pending", "confirmed", "waitlist"];
export const isHolding = (r: Pick<DemoRegistration, "status">) => HOLDING.includes(r.status);

export function initialState(): DemoState {
  const y = shiftDate(DEMO_TODAY, -1), y2 = shiftDate(DEMO_TODAY, -2);
  return {
    ic: initialIc(), role: "visitor", playerId: DEFAULT_DEMO_PLAYER, organizerClub: DEFAULT_ORGANIZER_CLUB, registrations: [], notifications: [],
    queue: [
      { id: "q1", kind: "result", title: tr("Results — RPC-M25-1"), detail: tr("Final results submitted by RM Club Port Chambly (DEMO)"), by: "Club organizer", status: "pending" },
      { id: "q2", kind: "licence", title: tr("Licence request — Camille Dufresne"), detail: tr("Documents received, medical certificate pending (DEMO)"), by: "Player", status: "pending" },
      { id: "q3", kind: "calendar", title: tr("Date change — event moved by 1 week"), detail: tr("Scenario C — 8-week gap test to re-run (DEMO)"), by: "Club organizer", status: "pending" },
      { id: "q4", kind: "club", title: tr("Club onboarding — Rêve Padel Club"), detail: tr("Contact details incomplete (DEMO)"), by: "MPL admin", status: "pending" },
      { id: "q5", kind: "result", title: tr("Results — SPA-M1000-1"), detail: tr("Scores uploaded, 2 matches to double-check (DEMO)"), by: "Referee", status: "pending" },
    ],
    org: { validated: [], refused: [], withdrawn: [], drawPublished: [], scores: {} },
    audit: [{ at: `${y} 18:02`, actor: "System", action: "Ranking snapshot generated (DEMO)" }, { at: `${y2} 10:14`, actor: "Admin", action: "Calendar V4 loaded (DEMO)" }],
    snapshots: [y], prefs: { open: true, draw: true, results: false }, draws: {}, matches: {},
    refereeId: "REF-01", assignments: { "HEN-MIXTE500-1": "REF-01", "RMT-M500-2": "REF-01", "USB-M500-1": "REF-02" }, requests: [], staff: {}, clubProfiles: {}, courts: {}, incidents: [], corrections: [], sportive: {}, archives: [],
  };
}

type BaseAction =
  | { type: "setRole"; role: Role } | { type: "setPlayer"; id: string } | { type: "setOrganizerClub"; id: string }
  | { type: "register"; reg: DemoRegistration; at: string; label: string }
  | { type: "cancel"; id: string; at: string }
  | { type: "decide"; id: string; status: "confirmed" | "rejected"; reason?: string; at: string; label: string }
  | { type: "validateEntries"; keys: string[]; eventId: string; at: string; label: string }
  | { type: "refuseEntry"; key: string; eventId: string; at: string; label: string; reason?: string }
  | { type: "promote"; id: string; at: string; label: string }
  | { type: "promoteEntry"; key: string; eventId: string; at: string; label: string }
  | { type: "withdraw"; id: string; reason: string; at: string; label: string }
  | { type: "withdrawEntry"; key: string; eventId: string; reason: string; at: string; label: string }
  | { type: "publishDraw"; eventId: string; at: string }
  | { type: "saveScore"; key: string; value: string; eventId: string; queueId: string; at: string; label: string }
  | { type: "resolveQueue"; id: string; status: "approved" | "rejected"; at: string }
  | { type: "addQueue"; item: Omit<QueueItem, "status">; at: string; actor: string }
  | { type: "log"; action: string; actor: string; at: string; ref?: string }
  | { type: "publishSnapshot"; at: string; date: string; act?: Actor }
  | { type: "setPrefs"; prefs: Partial<NotifPrefs> }
  | { type: "drawSave"; cfg: DrawConfig; at: string; label: string }
  | { type: "drawPublish"; key: string; at: string; label: string; notify: Array<{ playerId: string; text: string }> }
  | { type: "drawDelete"; key: string; at: string; label: string }
  | { type: "matchSchedule"; items: Array<{ key: string; court?: number; day?: string; time?: string }>; at: string; label: string; notify: Array<{ playerId: string; text: string }>; eventId: string }
  | { type: "matchLive"; key: string; at: string; label: string; eventId: string }
  | { type: "matchSubmit"; key: string; result: MatchResult; correction: boolean; at: string; label: string; queueId: string; eventId: string; division: string; matchId: string }
  | { type: "matchValidate"; key: string; at: string; label: string; eventId: string; notify: Array<{ playerId: string; text: string }> }
  | { type: "matchReject"; key: string; reason: string; at: string; label: string; eventId: string }
  | { type: "setReferee"; id: string }
  | { type: "requestCreate"; req: TournamentRequest; label: string; at: string; act?: Actor }
  | { type: "requestDecide"; id: string; status: "approved" | "rejected"; note: string; label: string; at: string; act?: Actor }
  | { type: "assignReferee"; eventId: string; refereeId: string | null; label: string; at: string; act?: Actor }
  | { type: "staffSet"; clubId: string; list: StaffMember[]; note: string; at: string; act?: Actor }
  | { type: "clubProfile"; clubId: string; patch: ClubProfilePatch; label: string; at: string; act?: Actor }
  | { type: "courtsSet"; clubId: string; courts: CourtItem[]; note: string; at: string; act?: Actor }
  | { type: "sportiveSet"; key: string; eventId: string; value: Sportive | null; label: string; at: string; act?: Actor }
  | { type: "incidentAdd"; incident: Incident; label: string; at: string; act?: Actor }
  | { type: "incidentClose"; id: string; eventId: string; at: string; act?: Actor }
  | { type: "drawStage"; key: string; stage: DrawStage; label: string; at: string; act?: Actor }
  | { type: "correctionCreate"; corr: CorrectionRequest; label: string; at: string; act?: Actor }
  | { type: "correctionDecide"; id: string; status: "approved" | "refused"; note: string; label: string; at: string; act?: Actor }
  | { type: "ic"; ic: IcAction; at: string; act?: Actor }
  | { type: "reset" };
export type Action = BaseAction & { act?: Actor };

/** Archive la version courante (tableau + matchs + scores + décision MPL) avant une modification sous correction approuvée. */
function archiveDraw(s: DemoState, key: string, a: { at: string; act?: Actor }, trigger: DrawArchive["trigger"], label: string): { archives: DrawArchive[]; audit: AuditEntry[] } | null {
  const d = s.draws[key]; if (!d?.grant) return null; const corr = s.corrections.find((c) => c.id === d.grant); const prefix = key + "|";
  const matches = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(s.matches).filter(([k]) => k.startsWith(prefix))))) as Record<string, MatchState>;
  const version = s.archives.filter((x) => drawKey(x.eventId, x.division) === key).length + 1; const id = `ARC-${s.archives.length + 1}`;
  const arc: DrawArchive = { id, eventId: d.eventId, division: d.division, version, cfg: JSON.parse(JSON.stringify({ ...d, grant: undefined })), matches, archivedAt: a.at, archivedBy: a.act ? `${ROLE_EN[a.act.role]} (DEMO)` : "Organizer (DEMO)", reason: corr?.reason ?? "", trigger, correction: corr ? { ...corr } : undefined };
  const played = Object.values(matches).filter((m) => m.result).length;
  return { archives: [arc, ...s.archives], audit: [{ at: a.at, actor: arc.archivedBy, action: `Draw version ${version} archived (${id}) — ${Object.keys(matches).length} matches, ${played} results — ${label}`, ref: d.eventId }, ...s.audit] };
}
const aud = (s: DemoState, at: string, actor: string, action: string, ref?: string): AuditEntry[] => [{ at, actor, action, ref }, ...s.audit];
let nid = 0; const notifId = () => "n" + Date.now().toString(36) + (nid++).toString(36);

function baseReducer(s: DemoState, a: Action): DemoState {
  switch (a.type) {
    case "setRole": return { ...s, role: a.role };
    case "setPlayer": return { ...s, playerId: a.id };
    case "setOrganizerClub": return { ...s, organizerClub: a.id };
    case "register": {
      const wl = a.reg.status === "waitlist"; const reg: DemoRegistration = { ...a.reg, history: [{ at: a.at, actor: "Player (DEMO)", action: wl ? "Joined the waiting list" : "Registration submitted" }] };
      const text = wl ? `Registration ${reg.id} is on the waiting list for ${reg.eventId}.` : `Registration ${reg.id} received for ${reg.eventId} — pending validation.`;
      return { ...s, registrations: [reg, ...s.registrations], notifications: [{ id: notifId(), at: a.at, kind: "registration", playerId: reg.playerId, eventId: reg.eventId, text }, ...s.notifications],
        audit: aud(s, a.at, "Player (DEMO)", wl ? `Registration ${reg.id} placed on the waiting list — ${a.label}` : `Registration ${reg.id} created — ${a.label}`, reg.eventId) };
    }
    case "cancel": {
      const r = s.registrations.find((x) => x.id === a.id); if (!r || !isHolding(r)) return s;
      return { ...s, registrations: s.registrations.map((x) => (x.id === a.id ? { ...x, status: "cancelled" as const, decidedAt: a.at, decidedBy: "Player (DEMO)", history: [...(x.history ?? []), { at: a.at, actor: "Player (DEMO)", action: "Cancelled by the player" }] } : x)),
        notifications: [{ id: notifId(), at: a.at, kind: "registration", playerId: r.playerId, eventId: r.eventId, text: `Your registration ${a.id} was cancelled. No automatic refund in this demo.` }, ...s.notifications],
        audit: aud(s, a.at, "Player (DEMO)", `Registration ${a.id} cancelled`, r.eventId) };
    }
    case "decide": {
      const r = s.registrations.find((x) => x.id === a.id); if (!r || !(r.status === "pending" || (r.status === "waitlist" && a.status === "rejected"))) return s;
      const verb = a.status === "confirmed" ? "approved" : "refused";
      return { ...s,
        registrations: s.registrations.map((x) => (x.id === a.id ? { ...x, status: a.status, decidedAt: a.at, decidedBy: "Organizer (DEMO)", reason: a.reason, history: [...(x.history ?? []), { at: a.at, actor: "Organizer (DEMO)", action: a.status === "confirmed" ? "Approved by the organizer" : "Refused by the organizer", note: a.reason }] } : x)),
        audit: aud(s, a.at, "Organizer (DEMO)", `Registration ${a.id} ${verb} — ${a.label}${a.reason ? ` · reason: ${a.reason}` : ""}`, r.eventId),
        notifications: [{ id: notifId(), at: a.at, kind: "registration", playerId: r.playerId, eventId: r.eventId, text: `Your registration ${a.id} was ${verb} by the organizer${a.reason ? ` (${a.reason})` : ""}.` }, ...s.notifications] };
    }
    case "promote": {
      const r = s.registrations.find((x) => x.id === a.id); if (!r || r.status !== "waitlist") return s;
      return { ...s, registrations: s.registrations.map((x) => (x.id === a.id ? { ...x, status: "confirmed" as const, decidedAt: a.at, decidedBy: "Organizer (DEMO)", history: [...(x.history ?? []), { at: a.at, actor: "Organizer (DEMO)", action: "Promoted from the waiting list" }] } : x)),
        audit: aud(s, a.at, "Organizer (DEMO)", `Registration ${a.id} promoted from the waiting list — ${a.label}`, r.eventId),
        notifications: [{ id: notifId(), at: a.at, kind: "registration", playerId: r.playerId, eventId: r.eventId, text: `A place opened: your registration ${a.id} was promoted from the waiting list and is confirmed.` }, ...s.notifications] };
    }
    case "withdraw": {
      const r = s.registrations.find((x) => x.id === a.id); if (!r || !isHolding(r)) return s;
      return { ...s, registrations: s.registrations.map((x) => (x.id === a.id ? { ...x, status: "withdrawn" as const, decidedAt: a.at, decidedBy: "Organizer (DEMO)", reason: a.reason, history: [...(x.history ?? []), { at: a.at, actor: "Organizer (DEMO)", action: "Withdrawal recorded", note: a.reason }] } : x)),
        audit: aud(s, a.at, "Organizer (DEMO)", `Registration ${a.id} withdrawn — ${a.label} · reason: ${a.reason}`, r.eventId),
        notifications: [{ id: notifId(), at: a.at, kind: "registration", playerId: r.playerId, eventId: r.eventId, text: `Your registration ${a.id} was recorded as withdrawn (${a.reason}). No automatic refund in this demo.` }, ...s.notifications] };
    }
    case "promoteEntry": return { ...s, org: { ...s.org, validated: [...new Set([...s.org.validated, a.key])], refused: s.org.refused.filter((k) => k !== a.key) }, audit: aud(s, a.at, "Organizer (DEMO)", `Fictional entry promoted from the waiting list — ${a.label}`, a.eventId) };
    case "withdrawEntry": return { ...s, org: { ...s.org, withdrawn: [...new Set([...s.org.withdrawn, a.key])], validated: s.org.validated.filter((k) => k !== a.key) }, audit: aud(s, a.at, "Organizer (DEMO)", `Fictional entry withdrawn — ${a.label} · reason: ${a.reason}`, a.eventId) };
    case "validateEntries": return { ...s, org: { ...s.org, validated: [...new Set([...s.org.validated, ...a.keys])], refused: s.org.refused.filter((k) => !a.keys.includes(k)) }, audit: aud(s, a.at, "Organizer (DEMO)", `${a.keys.length} fictional entr${a.keys.length > 1 ? "ies" : "y"} validated — ${a.label}`, a.eventId) };
    case "refuseEntry": return { ...s, org: { ...s.org, refused: [...new Set([...s.org.refused, a.key])], validated: s.org.validated.filter((k) => k !== a.key) }, audit: aud(s, a.at, "Organizer (DEMO)", `Fictional entry refused — ${a.label}${a.reason ? ` · reason: ${a.reason}` : ""}`, a.eventId) };
    case "publishDraw": {
      const notes = s.registrations.filter((r) => r.eventId === a.eventId && isActive(r)).map((r): DemoNotification => ({ id: notifId(), at: a.at, kind: "draw", playerId: r.playerId, eventId: a.eventId, text: `Draw preview published for ${a.eventId} (simulation).` }));
      return { ...s, org: { ...s.org, drawPublished: [...new Set([...s.org.drawPublished, a.eventId])] }, notifications: [...notes, ...s.notifications], audit: aud(s, a.at, "Organizer (DEMO)", `Draw preview published for ${a.eventId} (simulation)`, a.eventId) };
    }
    case "saveScore": {
      const item: QueueItem = { id: a.queueId, kind: "result", title: `Score — ${a.label}`, detail: `${a.value} entered by the organizer, waiting for validation (DEMO)`, by: "Club organizer", status: "pending" };
      return { ...s, org: { ...s.org, scores: { ...s.org.scores, [a.key]: { value: a.value, queueId: a.queueId, at: a.at } } }, queue: [item, ...s.queue], audit: aud(s, a.at, "Organizer (DEMO)", `Score ${a.value} entered — ${a.label} (sent to validation queue)`, a.eventId) };
    }
    case "resolveQueue": return { ...s, queue: s.queue.map((q) => (q.id === a.id ? { ...q, status: a.status } : q)), audit: aud(s, a.at, "Admin (DEMO)", `Queue item ${a.id} ${a.status}`) };
    case "addQueue": return { ...s, queue: [{ ...a.item, status: "pending" }, ...s.queue], audit: aud(s, a.at, a.actor, `Request sent: ${a.item.title}`) };
    case "log": return { ...s, audit: aud(s, a.at, a.actor, a.action, a.ref) };
    case "publishSnapshot": return { ...s, snapshots: [a.date, ...s.snapshots.filter((x) => x !== a.date)], notifications: [{ id: notifId(), at: a.at, kind: "ranking", text: `Ranking snapshot of ${a.date} published (simulation).` }, ...s.notifications], audit: aud(s, a.at, "Admin (DEMO)", "Ranking snapshot published (simulation)") };
    case "setPrefs": return { ...s, prefs: { ...s.prefs, ...a.prefs } };
    case "drawSave": {
      const key = drawKey(a.cfg.eventId, a.cfg.division); const prefix = key + "|"; const prev = s.draws[key]; const had = !!prev;
      const matches = Object.fromEntries(Object.entries(s.matches).filter(([k]) => !k.startsWith(prefix)));
      const grant = prev?.grant && ["published", "locked"].includes(stageOf(prev)) ? prev.grant : undefined;
      const arch = grant ? archiveDraw(s, key, a, "correction-modify", a.label) : null; if (arch) s = { ...s, archives: arch.archives, audit: arch.audit };
      const cfg: DrawConfig = { ...a.cfg, published: false, stage: "draft", grant: undefined };
      const corrections = grant ? s.corrections.map((c) => (c.id === grant ? { ...c, status: "applied" as const } : c)) : s.corrections;
      return { ...s, draws: { ...s.draws, [key]: cfg }, matches, corrections, audit: aud(s, a.at, whoA(a, "Organizer (DEMO)"), grant ? `Published draw modified under approved correction ${grant} — ${a.label} (back to draft, public view hidden until republished)` : `Draw (illustrative) ${had ? "regenerated" : "generated"} for ${a.label}`, a.cfg.eventId) };
    }
    case "drawPublish": {
      const d = s.draws[a.key]; if (!d) return s;
      const st = stageOf(d); if (st === "published" || st === "locked") return s;
      const au = st === "draft" ? aud({ ...s, audit: aud(s, a.at, whoA(a, "Organizer (DEMO)"), `Draw marked ready to publish for ${a.label}`, d.eventId) }, a.at, whoA(a, "Organizer (DEMO)"), `Draw (illustrative) published for ${a.label}`, d.eventId) : aud(s, a.at, whoA(a, "Organizer (DEMO)"), `Draw (illustrative) published for ${a.label}`, d.eventId);
      return { ...s, draws: { ...s.draws, [a.key]: { ...d, published: true, stage: "published", publishedAt: a.at } }, notifications: [...a.notify.map((n): DemoNotification => ({ id: notifId(), at: a.at, kind: "draw", playerId: n.playerId, eventId: d.eventId, text: n.text })), ...s.notifications], audit: au };
    }
    case "drawStage": {
      const d = s.draws[a.key]; if (!d) return s; const cur = stageOf(d);
      const ok = (cur === "draft" && a.stage === "ready") || (cur === "ready" && a.stage === "draft") || (cur === "published" && a.stage === "locked"); if (!ok) return s;
      const txt = a.stage === "ready" ? `Draw marked ready to publish for ${a.label}` : a.stage === "draft" ? `Draw moved back to draft for ${a.label}` : `Draw locked for ${a.label}`;
      return { ...s, draws: { ...s.draws, [a.key]: { ...d, stage: a.stage } }, audit: aud(s, a.at, whoA(a, "Organizer (DEMO)"), txt, d.eventId) };
    }
    case "drawDelete": {
      const d = s.draws[a.key]; if (!d) return s; const arch = archiveDraw(s, a.key, a, "correction-delete", a.label); if (arch) s = { ...s, archives: arch.archives, audit: arch.audit }; const rest = { ...s.draws }; delete rest[a.key];
      return { ...s, draws: rest, matches: Object.fromEntries(Object.entries(s.matches).filter(([k]) => !k.startsWith(a.key + "|"))), audit: aud(s, a.at, whoA(a, "Organizer (DEMO)"), `Draw deleted for ${a.label}`, d.eventId) };
    }
    case "matchSchedule": {
      const matches = { ...s.matches }; for (const it of a.items) { const cur = matches[it.key] ?? { history: [] }; const note = it.time ? `Court ${it.court} · ${it.day} ${it.time}` : "Unscheduled"; matches[it.key] = { ...cur, court: it.court, day: it.day, time: it.time, history: [...cur.history, { at: a.at, actor: "Organizer (DEMO)", action: it.time ? "Scheduled" : "Schedule cleared", note }] }; }
      const n = a.items.length;
      return { ...s, matches, notifications: [...a.notify.map((x): DemoNotification => ({ id: notifId(), at: a.at, kind: "draw", playerId: x.playerId, eventId: a.eventId, text: x.text })), ...s.notifications], audit: aud(s, a.at, whoA(a, "Organizer (DEMO)"), n === 1 ? `Match ${a.label} schedule updated` : `${n} matches scheduled — ${a.label}`, a.eventId) };
    }
    case "matchLive": {
      const cur = s.matches[a.key] ?? { history: [] }; if (cur.result || cur.proposal) return s;
      return { ...s, matches: { ...s.matches, [a.key]: { ...cur, live: true, history: [...cur.history, { at: a.at, actor: "Organizer (DEMO)", action: "Match started" }] } }, audit: aud(s, a.at, whoA(a, "Organizer (DEMO)"), `Match ${a.label} started`, a.eventId) };
    }
    case "matchSubmit": {
      const cur = s.matches[a.key] ?? { history: [] }; const txt = a.result.kind === "walkover" ? "W.O." : a.result.sets.map(([x, y]) => `${x}-${y}`).join(" ") + (a.result.kind === "retired" ? " ret." : "");
      const act = a.correction ? "Correction submitted" : a.result.kind === "walkover" ? "Walkover submitted" : a.result.kind === "retired" ? "Retirement submitted" : "Result submitted";
      const item: QueueItem = { id: a.queueId, kind: "result", title: `Result — ${a.label}`, detail: `${a.correction ? "Correction" : "Result"} ${txt} submitted by the organizer (DEMO)`, by: "Club organizer", status: "pending", matchRef: { eventId: a.eventId, division: a.division, matchId: a.matchId } };
      return { ...s, matches: { ...s.matches, [a.key]: { ...cur, live: false, rejectedNote: undefined, proposal: { ...a.result, correction: a.correction, by: "Organizer (DEMO)", at: a.at, queueId: a.queueId }, history: [...cur.history, { at: a.at, actor: "Organizer (DEMO)", action: act, note: a.result.reason ? `${txt} — ${a.result.reason}` : txt }] } },
        queue: [item, ...s.queue], audit: aud(s, a.at, whoA(a, "Organizer (DEMO)"), `${a.correction ? "Correction" : "Result"} ${txt} submitted for ${a.label} (sent to validation queue)`, a.eventId) };
    }
    case "matchValidate": {
      const cur = s.matches[a.key]; const p = cur?.proposal; if (!cur || !p) return s; const { correction: _c, by: _b, at: _a, queueId, ...res } = p; void _c; void _b; void _a;
      const txt = res.kind === "walkover" ? "W.O." : res.sets.map(([x, y]) => `${x}-${y}`).join(" ") + (res.kind === "retired" ? " ret." : "");
      return { ...s, matches: { ...s.matches, [a.key]: { ...cur, result: res, proposal: undefined, live: false, history: [...cur.history, { at: a.at, actor: "Admin (DEMO)", action: "Result validated", note: txt }] } },
        queue: s.queue.map((q) => (q.id === queueId ? { ...q, status: "approved" as const } : q)),
        notifications: [...a.notify.map((x): DemoNotification => ({ id: notifId(), at: a.at, kind: "draw", playerId: x.playerId, eventId: a.eventId, text: x.text })), ...s.notifications],
        audit: aud(s, a.at, "Admin (DEMO)", `Result validated — ${a.label} (${txt})`, a.eventId) };
    }
    case "matchReject": {
      const cur = s.matches[a.key]; const p = cur?.proposal; if (!cur || !p) return s;
      return { ...s, matches: { ...s.matches, [a.key]: { ...cur, proposal: undefined, rejectedNote: a.reason, history: [...cur.history, { at: a.at, actor: "Admin (DEMO)", action: "Result rejected", note: a.reason }] } },
        queue: s.queue.map((q) => (q.id === p.queueId ? { ...q, status: "rejected" as const } : q)), audit: aud(s, a.at, "Admin (DEMO)", `Result rejected — ${a.label} · reason: ${a.reason}`, a.eventId) };
    }
    case "setReferee": return { ...s, refereeId: a.id };
    case "requestCreate": {
      const item: QueueItem = { id: "q-" + a.req.id, kind: "calendar", title: `Tournament request — ${a.label}`, detail: `Organisation request for ${a.req.eventId} submitted by the club (DEMO)`, by: "Club", status: "pending", requestRef: a.req.id };
      return { ...s, requests: [a.req, ...s.requests], queue: [item, ...s.queue], notifications: [{ id: notifId(), at: a.at, kind: "club", clubId: a.req.clubId, eventId: a.req.eventId, text: `Request ${a.req.id} for ${a.req.eventId} submitted to MPL administration.` }, ...s.notifications], audit: aud(s, a.at, whoA(a, "Club (DEMO)"), `Tournament request ${a.req.id} submitted — ${a.label}`, a.req.eventId) };
    }
    case "requestDecide": {
      const r = s.requests.find((x) => x.id === a.id); if (!r || r.status !== "submitted") return s;
      const hist: RegHistoryItem = { at: a.at, actor: "MPL Admin (DEMO)", action: a.status === "approved" ? "Request approved" : "Request refused", note: a.note || undefined };
      return { ...s, requests: s.requests.map((x) => (x.id === a.id ? { ...x, status: a.status, decidedAt: a.at, decisionNote: a.note, history: [...x.history, hist] } : x)), queue: s.queue.map((q) => (q.requestRef === a.id ? { ...q, status: a.status } : q)),
        notifications: [{ id: notifId(), at: a.at, kind: "club", clubId: r.clubId, eventId: r.eventId, text: `Request ${r.id} for ${r.eventId} ${a.status === "approved" ? "approved" : "refused"} by MPL administration.${a.note ? " " + a.note : ""}` }, ...s.notifications],
        audit: aud(s, a.at, whoA(a, "MPL Admin (DEMO)"), `Tournament request ${r.id} ${a.status === "approved" ? "approved" : "refused"} — ${a.label}${a.note ? " · " + a.note : ""}`, r.eventId) };
    }
    case "assignReferee": {
      const assignments = { ...s.assignments }; if (a.refereeId) assignments[a.eventId] = a.refereeId; else delete assignments[a.eventId];
      return { ...s, assignments, audit: aud(s, a.at, whoA(a, "MPL Admin (DEMO)"), a.refereeId ? `Referee ${a.refereeId} assigned to ${a.label}` : `Referee unassigned from ${a.label}`, a.eventId) };
    }
    case "staffSet": { if (!a.list.some((m) => m.role === "club_admin")) return denyEntry(s, a, `a club needs at least one Club Admin · ${a.clubId}`); return { ...s, staff: { ...s.staff, [a.clubId]: a.list }, audit: aud(s, a.at, whoA(a, "Club Admin (DEMO)"), `Club managers updated — ${a.note}`, a.clubId) }; }
    case "clubProfile": return { ...s, clubProfiles: { ...s.clubProfiles, [a.clubId]: { ...s.clubProfiles[a.clubId], ...a.patch } }, audit: aud(s, a.at, whoA(a, "Club Admin (DEMO)"), `Club profile updated — ${a.label}`, a.clubId) };
    case "courtsSet": return { ...s, courts: { ...s.courts, [a.clubId]: a.courts }, audit: aud(s, a.at, whoA(a, "Club (DEMO)"), `Club courts updated — ${a.note}`, a.clubId) };
    case "sportiveSet": { const sp = { ...s.sportive }; if (a.value) sp[a.key] = a.value; else delete sp[a.key]; return { ...s, sportive: sp, audit: aud(s, a.at, whoA(a, "Referee (DEMO)"), a.value ? `Pair ${a.value.status === "validated" ? "validated" : "flagged"} sportively — ${a.label}` : `Sporting validation cleared — ${a.label}`, a.eventId) }; }
    case "incidentAdd": return { ...s, incidents: [a.incident, ...s.incidents], audit: aud(s, a.at, whoA(a, "Referee (DEMO)"), `Incident reported — ${a.label}`, a.incident.eventId) };
    case "incidentClose": return { ...s, incidents: s.incidents.map((i) => (i.id === a.id ? { ...i, status: "closed" as const } : i)), audit: aud(s, a.at, whoA(a, "Referee (DEMO)"), `Incident ${a.id} closed`, a.eventId) };
    case "correctionCreate": {
      const item: QueueItem = { id: "q-" + a.corr.id, kind: "calendar", title: `Exceptional correction — ${a.label}`, detail: `Request to modify a published draw: ${a.corr.reason} (DEMO)`, by: a.act ? ROLE_EN[a.act.role] : "Organizer", status: "pending", correctionRef: a.corr.id };
      return { ...s, corrections: [a.corr, ...s.corrections], queue: [item, ...s.queue], audit: aud(s, a.at, whoA(a, "Organizer (DEMO)"), `Exceptional correction ${a.corr.id} requested — ${a.label} · ${a.corr.reason}`, a.corr.eventId) };
    }
    case "correctionDecide": {
      const c = s.corrections.find((x) => x.id === a.id); if (!c || c.status !== "pending") return s; const key = drawKey(c.eventId, c.division); const d = s.draws[key];
      return { ...s, corrections: s.corrections.map((x) => (x.id === a.id ? { ...x, status: a.status, decidedAt: a.at, decisionNote: a.note } : x)), draws: a.status === "approved" && d ? { ...s.draws, [key]: { ...d, grant: a.id } } : s.draws, queue: s.queue.map((q) => (q.correctionRef === a.id ? { ...q, status: a.status === "approved" ? ("approved" as const) : ("rejected" as const) } : q)),
        audit: aud(s, a.at, whoA(a, "MPL Admin (DEMO)"), `Exceptional correction ${a.id} ${a.status === "approved" ? "approved (one modification allowed)" : "refused"} — ${a.label}${a.note ? " · " + a.note : ""}`, c.eventId) };
    }
    case "ic": return icApply(s, a);
    case "reset": return initialState();
  }
}

const whoA = (a: { act?: Actor }, fb: string) => (a.act ? `${ROLE_EN[a.act.role]} (DEMO)` : fb);
const evOf = (key: string) => key.split("|")[0];
const clubOfEvent = (id: string) => CALENDAR_EVENTS.find((e) => e.id === id)?.club;
/** Permission requise (et périmètre) par action ; `undefined` = action libre. */
export function guardOf(s: DemoState, a: Action): { perm: Perm; eventId?: string; club?: string } | undefined {
  switch (a.type) {
    case "drawSave": return { perm: "draw.edit", eventId: a.cfg.eventId };
    case "drawDelete": return { perm: "draw.edit", eventId: evOf(a.key) };
    case "drawPublish": return { perm: "draw.publish", eventId: evOf(a.key) };
    case "drawStage": return { perm: a.stage === "locked" ? "draw.lock" : a.stage === "ready" ? "draw.publish" : "draw.edit", eventId: evOf(a.key) };
    case "matchSchedule": return { perm: "schedule.edit", eventId: a.eventId };
    case "matchLive": case "matchSubmit": return { perm: "scores.enter", eventId: a.eventId };
    case "matchValidate": case "matchReject": return { perm: "scores.validate" };
    case "decide": case "promote": case "withdraw": { const r = s.registrations.find((x) => x.id === a.id); return { perm: "entries.decide", eventId: r?.eventId }; }
    case "validateEntries": case "refuseEntry": case "promoteEntry": case "withdrawEntry": return { perm: "entries.decide", eventId: a.eventId };
    case "resolveQueue": return { perm: "queue.resolve" };
    case "publishSnapshot": return { perm: "snapshot.publish" };
    case "publishDraw": return { perm: "draw.publish", eventId: a.eventId };
    case "saveScore": return { perm: "scores.enter", eventId: a.eventId };
    case "addQueue": return { perm: "request.create", club: a.act?.clubId };
    case "register": case "cancel": return { perm: "registration.self" };
    case "requestCreate": return { perm: "request.create", club: a.req.clubId };
    case "requestDecide": return { perm: "request.decide" };
    case "assignReferee": return { perm: "referee.assign" };
    case "staffSet": return { perm: "club.staff.manage", club: a.clubId };
    case "clubProfile": return { perm: "club.profile.edit", club: a.clubId };
    case "courtsSet": return { perm: "club.courts.edit", club: a.clubId };
    case "sportiveSet": return { perm: "pairs.sportive", eventId: a.eventId };
    case "incidentAdd": return { perm: "incident.report", eventId: a.incident.eventId };
    case "incidentClose": return { perm: "incident.report", eventId: a.eventId };
    case "correctionCreate": return { perm: "correction.request", eventId: a.corr.eventId };
    case "correctionDecide": return { perm: "correction.decide" };
    case "ic": { const g = icGuard(a.ic); return { perm: g.perm, club: g.club }; }
    default: return undefined;
  }
}
const denyEntry = (s: DemoState, a: Action, why: string): DemoState => ({ ...s, audit: aud(s, (a as { at?: string }).at ?? "", a.act ? `${ROLE_EN[a.act.role]} (DEMO)` : "Unknown", `Denied — ${why}`) });
/** Réducteur gardé : si l'action porte un `actor`, la permission (matrice + périmètre) et les verrous de publication sont vérifiés ICI, quelle que soit l'interface. */
export function reducer(s: DemoState, a: Action): DemoState {
  /** 5C : la publication d'un instantané exige une identité de démonstration ; sans elle l'action est refusée et journalisée. */
  if (a.type === "publishSnapshot" && !a.act) return denyEntry(s, a, "snapshot.publish (identity required)");
  if (a.act) {
    const g = guardOf(s, a);
    if (g) {
      const d = can(a.act.role, g.perm, { clubId: a.act.clubId, refereeId: a.act.refereeId, assignments: s.assignments, eventId: g.eventId, targetClub: g.club });
      if (!d.ok) return denyEntry(s, a, `${g.perm} (${d.reason === "scope" ? "outside scope" : "role not allowed"})${g.eventId ? ` · ${g.eventId}` : g.club ? ` · ${g.club}` : ""}`);
    }
    if (a.type === "drawSave" || a.type === "drawDelete") {
      const key = a.type === "drawSave" ? drawKey(a.cfg.eventId, a.cfg.division) : a.key; const d = s.draws[key];
      if (d && ["published", "locked"].includes(stageOf(d)) && !d.grant) return denyEntry(s, a, `published draw cannot be modified without an approved exceptional correction · ${evOf(key)}`);
    }
    if (a.type === "drawStage") { const d = s.draws[a.key]; const cur = d ? stageOf(d) : null; const ok = (cur === "draft" && a.stage === "ready") || (cur === "ready" && a.stage === "draft") || (cur === "published" && a.stage === "locked"); if (!ok) return denyEntry(s, a, `invalid publication step ${cur ?? "none"} → ${a.stage} · ${evOf(a.key)}`); }
    if (a.type === "correctionCreate") { const d = s.draws[drawKey(a.corr.eventId, a.corr.division)]; if (!d || !["published", "locked"].includes(stageOf(d))) return denyEntry(s, a, `correction requires a published or locked draw · ${a.corr.eventId}`); }
  }
  return baseReducer(s, a);
}
/** Fusion tolérante d'un état stocké (ancien format ou partiel). */
export function hydrate(raw: unknown): DemoState {
  const base = initialState(); if (!raw || typeof raw !== "object") return base; const r = raw as Partial<DemoState>;
  return { ...base, ...r, ic: hydrateIc(r.ic), archives: Array.isArray(r.archives) ? r.archives : [], org: { ...base.org, ...(r.org ?? {}) }, prefs: { ...base.prefs, ...(r.prefs ?? {}) }, registrations: Array.isArray(r.registrations) ? r.registrations.map((x) => ({ ...x, history: x.history ?? [] })) : [], notifications: Array.isArray(r.notifications) ? r.notifications : [], draws: r.draws && typeof r.draws === "object" ? r.draws : {}, matches: r.matches && typeof r.matches === "object" ? r.matches : {}, refereeId: typeof r.refereeId === "string" ? r.refereeId : base.refereeId, assignments: r.assignments && typeof r.assignments === "object" ? r.assignments : base.assignments, requests: Array.isArray(r.requests) ? r.requests : [], staff: r.staff && typeof r.staff === "object" ? r.staff : {}, clubProfiles: r.clubProfiles && typeof r.clubProfiles === "object" ? r.clubProfiles : {}, courts: r.courts && typeof r.courts === "object" ? r.courts : {}, incidents: Array.isArray(r.incidents) ? r.incidents : [], corrections: Array.isArray(r.corrections) ? r.corrections : [], sportive: r.sportive && typeof r.sportive === "object" ? r.sportive : {} };
}
