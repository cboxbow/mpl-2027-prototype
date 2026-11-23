import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { DEMO_TODAY, REG_FEE_DEMO } from "@/config/demo-config";
import type { DrawConfig, MatchResult } from "@/lib/bracket";
import { STATE_KEY, hydrate, initialState, reducer, type Action, type Actor, type ClubProfilePatch, type CorrectionRequest, type CourtItem, type DemoRegistration, type DemoState, type Incident, type NotifPrefs, type QueueItem, type Role, type Sportive, type StaffMember, type TournamentRequest } from "@/lib/demo-state";
import type { DrawStage } from "@/lib/bracket";
import { can, type Perm, type PermCtx } from "@/lib/permissions";
import { icGuard, type IcAction } from "@/interclub/state";
import { toast } from "sonner";
import { tr } from "@/lib/i18n";
export type { Role, DemoRegistration, QueueItem, RegStatus, DemoNotification, Actor } from "@/lib/demo-state";

const stamp = () => `${DEMO_TODAY} ${new Date().toTimeString().slice(0, 5)}`;
const uid = (p: string) => p + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
export interface NewRegistration { eventId: string; division: DemoRegistration["division"]; playerId: string; partnerId: string; amount?: number; label?: string; waitlist?: boolean }
interface Ctx extends DemoState {
  setRole: (r: Role) => void; setPlayer: (id: string) => void; setOrganizerClub: (id: string) => void;
  addRegistration: (r: NewRegistration) => DemoRegistration; cancelRegistration: (id: string) => void;
  decideRegistration: (id: string, status: "confirmed" | "rejected", label: string, reason?: string) => void;
  validateEntries: (keys: string[], eventId: string, label: string) => void; refuseEntry: (key: string, eventId: string, label: string, reason?: string) => void;
  promoteRegistration: (id: string, label: string) => void; promoteEntry: (key: string, eventId: string, label: string) => void;
  withdrawRegistration: (id: string, label: string, reason: string) => void; withdrawEntry: (key: string, eventId: string, label: string, reason: string) => void;
  resolveQueue: (id: string, s: "approved" | "rejected") => void; publishDraw: (eventId: string) => void; saveScore: (key: string, value: string, eventId: string, label: string) => void;
  addQueue: (q: Omit<QueueItem, "id" | "status">, actor?: string) => void; log: (action: string, actor?: string, ref?: string) => void; publishSnapshot: () => boolean; setPrefs: (p: Partial<NotifPrefs>) => void; reset: () => void;
  saveDraw: (cfg: DrawConfig, label: string) => void; publishBracket: (key: string, label: string, notify: Array<{ playerId: string; text: string }>) => void; deleteDraw: (key: string, label: string) => void;
  scheduleMatches: (eventId: string, items: Array<{ key: string; court?: number; day?: string; time?: string }>, label: string, notify?: Array<{ playerId: string; text: string }>) => void;
  startMatch: (key: string, eventId: string, label: string) => void; submitResult: (key: string, eventId: string, division: string, matchId: string, result: MatchResult, label: string, correction?: boolean) => void;
  validateMatch: (key: string, eventId: string, label: string, notify?: Array<{ playerId: string; text: string }>) => void; rejectMatch: (key: string, eventId: string, label: string, reason: string) => void;
  /** Vague C : identité de démonstration, permissions et actions gardées. */
  /** D0/D1 : action Interclub avec contrôle de permission et de périmètre (le réducteur re-contrôle). */ icAct: (a: IcAction) => void;
  actor: Actor; allowed: (perm: Perm, ctx?: PermCtx) => boolean; setReferee: (id: string) => void;
  createRequest: (clubId: string, eventId: string, note: string, label: string) => TournamentRequest; decideRequest: (id: string, status: "approved" | "rejected", note: string, label: string) => void;
  assignReferee: (eventId: string, refereeId: string | null, label: string) => void;
  setStaff: (clubId: string, list: StaffMember[], note: string) => void; setClubProfile: (clubId: string, patch: ClubProfilePatch, label: string) => void; setCourts: (clubId: string, courts: CourtItem[], note: string) => void;
  setSportive: (key: string, eventId: string, value: Sportive | null, label: string) => void; reportIncident: (i: Omit<Incident, "id" | "at" | "status" | "by">, label: string) => void; closeIncident: (id: string, eventId: string) => void;
  setDrawStage: (key: string, stage: DrawStage, label: string) => void; requestCorrection: (eventId: string, division: string, reason: string, label: string) => CorrectionRequest; decideCorrection: (id: string, status: "approved" | "refused", note: string, label: string) => void;
}
const C = createContext<Ctx | null>(null);
export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [s, d] = useReducer(reducer, undefined, () => { try { const raw = localStorage.getItem(STATE_KEY); if (raw) return hydrate(JSON.parse(raw)); } catch { /* ignore */ } return initialState(); });
  useEffect(() => { try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* ignore */ } }, [s]);
  const actor: Actor = { role: s.role, clubId: s.organizerClub, refereeId: s.refereeId };
  const permCtx = (ctx?: PermCtx): PermCtx => { const c: PermCtx = { clubId: s.organizerClub, refereeId: s.refereeId, assignments: s.assignments, ...ctx }; if (!c.eventId && !c.targetClub) c.targetClub = c.clubId; return c; };
  /** Envoie une action AVEC l'identité de l'acteur : le réducteur refuse (et journalise) toute action hors périmètre. */
  const g = (a: Action, perm?: Perm, ctx?: PermCtx) => { if (perm && !can(s.role, perm, permCtx(ctx)).ok) toast.error(tr("Action not permitted for this role or scope (demo)")); d({ ...a, act: actor } as Action); };
  const api = useMemo<Ctx>(() => ({
    ...s, actor, allowed: (perm, ctx) => can(s.role, perm, permCtx(ctx)).ok, setReferee: (id) => d({ type: "setReferee", id }),
    icAct: (a) => { const gd = icGuard(a); g({ type: "ic", ic: a, at: stamp() }, gd.perm, gd.club ? { targetClub: gd.club } : undefined); },
    setRole: (role) => d({ type: "setRole", role }), setPlayer: (id) => d({ type: "setPlayer", id }), setOrganizerClub: (id) => d({ type: "setOrganizerClub", id }),
    addRegistration: (r) => { const reg: DemoRegistration = { id: uid("REG"), eventId: r.eventId, division: r.division, playerId: r.playerId, partnerId: r.partnerId, status: r.waitlist ? "waitlist" : "pending", createdAt: DEMO_TODAY, amount: r.amount ?? REG_FEE_DEMO * 2 }; g({ type: "register", reg, at: stamp(), label: r.label ?? `${r.eventId} (${r.division})` }, "registration.self"); return reg; },
    cancelRegistration: (id) => g({ type: "cancel", id, at: stamp() }, "registration.self"),
    decideRegistration: (id, status, label, reason) => g({ type: "decide", id, status, label, reason, at: stamp() }),
    validateEntries: (keys, eventId, label) => g({ type: "validateEntries", keys, eventId, label, at: stamp() }, "entries.decide", { eventId }), refuseEntry: (key, eventId, label, reason) => g({ type: "refuseEntry", key, eventId, label, reason, at: stamp() }, "entries.decide", { eventId }),
    promoteRegistration: (id, label) => g({ type: "promote", id, label, at: stamp() }), promoteEntry: (key, eventId, label) => g({ type: "promoteEntry", key, eventId, label, at: stamp() }, "entries.decide", { eventId }),
    withdrawRegistration: (id, label, reason) => g({ type: "withdraw", id, label, reason, at: stamp() }), withdrawEntry: (key, eventId, label, reason) => g({ type: "withdrawEntry", key, eventId, label, reason, at: stamp() }, "entries.decide", { eventId }),
    resolveQueue: (id, status) => g({ type: "resolveQueue", id, status, at: stamp() }, "queue.resolve"), publishDraw: (eventId) => g({ type: "publishDraw", eventId, at: stamp() }, "draw.publish", { eventId }),
    saveScore: (key, value, eventId, label) => g({ type: "saveScore", key, value, eventId, label, queueId: uid("q"), at: stamp() }, "scores.enter", { eventId }),
    addQueue: (item, actor = "Organizer (DEMO)") => g({ type: "addQueue", item: { ...item, id: uid("q") }, actor, at: stamp() }, "request.create"),
    log: (action, actor = "Admin (DEMO)", ref) => d({ type: "log", action, actor, at: stamp(), ref }),
    saveDraw: (cfg, label) => g({ type: "drawSave", cfg, label, at: stamp() }, "draw.edit", { eventId: cfg.eventId }), publishBracket: (key, label, notify) => g({ type: "drawPublish", key, label, notify, at: stamp() }, "draw.publish", { eventId: key.split("|")[0] }), deleteDraw: (key, label) => g({ type: "drawDelete", key, label, at: stamp() }, "draw.edit", { eventId: key.split("|")[0] }),
    scheduleMatches: (eventId, items, label, notify = []) => g({ type: "matchSchedule", eventId, items, label, notify, at: stamp() }, "schedule.edit", { eventId }), startMatch: (key, eventId, label) => g({ type: "matchLive", key, eventId, label, at: stamp() }, "scores.enter", { eventId }),
    submitResult: (key, eventId, division, matchId, result, label, correction = false) => g({ type: "matchSubmit", key, eventId, division, matchId, result, label, correction, queueId: uid("q"), at: stamp() }, "scores.enter", { eventId }),
    validateMatch: (key, eventId, label, notify = []) => g({ type: "matchValidate", key, eventId, label, notify, at: stamp() }, "scores.validate"), rejectMatch: (key, eventId, label, reason) => g({ type: "matchReject", key, eventId, label, reason, at: stamp() }, "scores.validate"),

    createRequest: (clubId, eventId, note, label) => { const req: TournamentRequest = { id: uid("REQ"), clubId, eventId, note, status: "submitted", by: "Club (DEMO)", at: stamp(), history: [{ at: stamp(), actor: "Club (DEMO)", action: "Request submitted", note: note || undefined }] }; g({ type: "requestCreate", req, label, at: stamp() }, "request.create", { targetClub: clubId }); return req; },
    decideRequest: (id, status, note, label) => g({ type: "requestDecide", id, status, note, label, at: stamp() }, "request.decide"),
    assignReferee: (eventId, refereeId, label) => g({ type: "assignReferee", eventId, refereeId, label, at: stamp() }, "referee.assign"),
    setStaff: (clubId, list, note) => g({ type: "staffSet", clubId, list, note, at: stamp() }, "club.staff.manage", { targetClub: clubId }), setClubProfile: (clubId, patch, label) => g({ type: "clubProfile", clubId, patch, label, at: stamp() }, "club.profile.edit", { targetClub: clubId }), setCourts: (clubId, courts, note) => g({ type: "courtsSet", clubId, courts, note, at: stamp() }, "club.courts.edit", { targetClub: clubId }),
    setSportive: (key, eventId, value, label) => g({ type: "sportiveSet", key, eventId, value, label, at: stamp() }, "pairs.sportive", { eventId }),
    reportIncident: (i, label) => g({ type: "incidentAdd", incident: { ...i, id: uid("INC"), at: stamp(), status: "open", by: s.role }, label, at: stamp() }, "incident.report", { eventId: i.eventId }), closeIncident: (id, eventId) => g({ type: "incidentClose", id, eventId, at: stamp() }, "incident.report", { eventId }),
    setDrawStage: (key, stage, label) => g({ type: "drawStage", key, stage, label, at: stamp() }, stage === "locked" ? "draw.lock" : stage === "ready" ? "draw.publish" : "draw.edit", { eventId: key.split("|")[0] }),
    requestCorrection: (eventId, division, reason, label) => { const corr: CorrectionRequest = { id: uid("COR"), eventId, division, reason, by: s.role, at: stamp(), status: "pending" }; g({ type: "correctionCreate", corr, label, at: stamp() }, "correction.request", { eventId }); return corr; },
    decideCorrection: (id, status, note, label) => g({ type: "correctionDecide", id, status, note, label, at: stamp() }, "correction.decide"),
    publishSnapshot: () => { const ok = can(s.role, "snapshot.publish", permCtx()).ok; g({ type: "publishSnapshot", at: stamp(), date: DEMO_TODAY }, "snapshot.publish"); return ok; }, setPrefs: (prefs) => d({ type: "setPrefs", prefs }), reset: () => d({ type: "reset" }),
  }), [s]);
  return <C.Provider value={api}>{children}</C.Provider>;
}
export const useDemo = () => { const c = useContext(C); if (!c) throw new Error("DemoStoreProvider missing"); return c; };
