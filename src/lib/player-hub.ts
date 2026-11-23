/**
 * Lot 5B-7 (P1-06) — Profil joueur unifié : dérivations en LECTURE SEULE.
 * Aucun second référentiel joueur : tout est calculé depuis le référentiel existant (PLAYERS / JUNIORS), le store de démonstration
 * (inscriptions, notifications, tableaux, Interclub), le classement et l'historique de matchs. Aucune règle ni aucun calcul sportif modifié.
 */
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { RANKING_F, RANKING_M, playerById } from "@/data/demo";
import { playerMatches, type PlayerMatch } from "@/data/matches";
import { DEMO_TODAY } from "@/lib/format";
import { drawView, teamPlayers, matchLabel } from "@/lib/draws";
import { rankHistory, type RankPoint } from "@/lib/player-stats";
import type { DemoRegistration, DemoState } from "@/lib/demo-state";
import type { IcState } from "@/interclub/state";
import type { LineStatus } from "@/interclub/engagement";

const EV = new Map(CALENDAR_EVENTS.map((e) => [e.id, e]));
export const ACTIVE_STATUSES: DemoRegistration["status"][] = ["pending", "confirmed", "waitlist"];

export interface HubRegistration { reg: DemoRegistration; eventId: string; clubName: string; start: string; end: string; category: string; upcoming: boolean; partnerId: string }
export interface HubNextMatch { eventId: string; division: string; label: string; day?: string; time?: string; court?: number; status: string; opponents: string[] }
export interface HubSquad { clubId: string; division: string; lineStatus: LineStatus | "none"; dossierId: string }
export type HubActionKind = "licence" | "pending" | "waitlist" | "register" | "squad-returned";
export interface HubAction { kind: HubActionKind; id: string; eventId?: string; regId?: string }

/** Un joueur est-il lui-même (profil privé) ? Les mineurs n'ont jamais de classement ni de résultats. */
export const isMinor = (id: string) => !!playerById(id)?.junior;

export function rankingRowOf(id: string) { const p = playerById(id); if (!p || p.junior) return undefined; return (p.gender === "M" ? RANKING_M : RANKING_F).find((r) => r.player.id === id); }

/** Inscriptions du joueur (en tant que titulaire OU partenaire), de la plus proche à la plus lointaine. Source unique : le store (parcours 5B-5). */
export function hubRegistrations(id: string, registrations: DemoRegistration[]): HubRegistration[] {
  return registrations.filter((r) => r.playerId === id || r.partnerId === id).flatMap((reg) => { const e = EV.get(reg.eventId); if (!e) return []; return [{ reg, eventId: e.id, clubName: e.clubName, start: e.start, end: e.end, category: e.category, upcoming: e.end >= DEMO_TODAY, partnerId: reg.playerId === id ? reg.partnerId : reg.playerId }]; }).sort((a, b) => a.start.localeCompare(b.start));
}
export const upcomingRegistrations = (hr: HubRegistration[]) => hr.filter((h) => h.upcoming && ACTIVE_STATUSES.includes(h.reg.status));

/** Prochain match CONNU : uniquement un match d'un tableau publié/planifié où le joueur est déjà identifié. Sinon null (état vide explicite). */
export function nextKnownMatch(id: string, hr: HubRegistration[], s: Pick<DemoState, "draws" | "matches" | "registrations" | "org">): HubNextMatch | null {
  const out: HubNextMatch[] = [];
  for (const h of upcomingRegistrations(hr)) {
    if (h.reg.status !== "confirmed") continue; const e = EV.get(h.eventId); if (!e) continue;
    const v = drawView(s, e, h.reg.division); if (!v) continue;
    for (const r of v.resolved.values()) {
      if (r.winner || r.bye || !["scheduled", "ready", "live"].includes(r.status)) continue;
      const a = teamPlayers(v, r.a), b = teamPlayers(v, r.b); const mine = a.includes(id) ? "a" : b.includes(id) ? "b" : null; if (!mine) continue;
      const sc = v.sched(r.id); out.push({ eventId: e.id, division: h.reg.division, label: matchLabel(r.m), day: sc.day, time: sc.time, court: sc.court, status: r.status, opponents: mine === "a" ? b : a });
    }
  }
  return out.sort((x, y) => (x.day ?? "9999").localeCompare(y.day ?? "9999") || (x.time ?? "").localeCompare(y.time ?? ""))[0] ?? null;
}

/** Sélections dans un effectif Interclub. Ce N'EST PAS une inscription individuelle officielle (règle 5B-7). */
export function hubSquads(id: string, ic: IcState): HubSquad[] {
  return ic.dossiers.flatMap((d) => d.form.players.filter((p) => p.playerId === id).map((p) => ({ clubId: d.clubId, division: p.division, lineStatus: (d.lines[p.division]?.status ?? "none") as HubSquad["lineStatus"], dossierId: d.id })));
}

export const lastResult = (id: string): PlayerMatch | null => (isMinor(id) ? null : playerMatches(id)[0] ?? null);
export const rankEvolution = (id: string): RankPoint[] => { const p = playerById(id); const row = rankingRowOf(id); return p && row ? rankHistory(id, p.gender).filter((x) => x.rank != null) : []; };

/** Actions prioritaires (propres au joueur) — ordre : licence, inscription à suivre, liste d'attente, sélection renvoyée, puis inscription à faire. */
export function hubActions(id: string, hr: HubRegistration[], squads: HubSquad[]): HubAction[] {
  const p = playerById(id); if (!p) return []; const out: HubAction[] = [];
  if (p.licenceExpiry < DEMO_TODAY) out.push({ kind: "licence", id: "licence" });
  else if (hr.some((h) => h.upcoming && ACTIVE_STATUSES.includes(h.reg.status) && p.licenceExpiry < h.end)) out.push({ kind: "licence", id: "licence" });
  for (const h of upcomingRegistrations(hr)) { if (h.reg.status === "pending") out.push({ kind: "pending", id: "p-" + h.reg.id, eventId: h.eventId, regId: h.reg.id }); else if (h.reg.status === "waitlist") out.push({ kind: "waitlist", id: "w-" + h.reg.id, eventId: h.eventId, regId: h.reg.id }); }
  for (const s of squads) if (s.lineStatus === "to_complete") out.push({ kind: "squad-returned", id: `s-${s.clubId}-${s.division}` });
  if (!upcomingRegistrations(hr).length) out.push({ kind: "register", id: "register" });
  return out;
}
