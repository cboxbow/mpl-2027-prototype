/** Inscrits d'une épreuve = inscrits fictifs + inscriptions créées dans la démo (même source pour joueur, public et organisateur). */
import type { CalendarEvent } from "@/data/calendar.generated";
import { DIVISION_LABEL, entriesForEvent, playerById, type Division, type Player } from "@/data/demo";
import { TEAM_CAPACITY } from "@/config/demo-config";
import { isActive, type DemoRegistration, type OrgState } from "@/lib/demo-state";

export type EntryStatus = "confirmed" | "pending" | "waitlist" | "rejected" | "withdrawn";
export interface EntryRow { key: string; a: Player; b: Player; status: EntryStatus; source: "fictional" | "demo"; regId?: string; playerId?: string; waitRank?: number }
export interface EntryCtx { registrations: DemoRegistration[]; org: Pick<OrgState, "validated" | "refused"> & { withdrawn?: string[] } }
export const entryKey = (eventId: string, playerId: string) => `${eventId}-${playerId}`;
export { DIVISION_LABEL };

/** Liste complète (avec refusés) ; les inscriptions annulées n'apparaissent jamais. Les inscriptions de la démo sont en tête. */
export function allEntries(ev: CalendarEvent, division: Division, ctx: EntryCtx): EntryRow[] {
  const fic: EntryRow[] = entriesForEvent(ev, division).map((p) => {
    const key = entryKey(ev.id, p.a.id);
    const status: EntryStatus = ctx.org.refused.includes(key) ? "rejected" : (ctx.org.withdrawn ?? []).includes(key) ? "withdrawn" : ctx.org.validated.includes(key) ? "confirmed" : p.status;
    return { key, a: p.a, b: p.b, status, source: "fictional" };
  });
  const mine: EntryRow[] = ctx.registrations.filter((r) => r.eventId === ev.id && r.division === division && r.status !== "cancelled").flatMap((r) => {
    const a = playerById(r.playerId), b = playerById(r.partnerId); if (!a || !b) return [];
    return [{ key: `reg-${r.id}`, a, b, status: r.status as EntryStatus, source: "demo" as const, regId: r.id, playerId: r.playerId }];
  });
  const rows = [...mine, ...fic];
  // Rang d'attente : inscrits fictifs d'abord (arrivés avant), puis inscriptions de la démo par ordre d'arrivée (la liste du store est la plus récente en premier).
  const wait = [...fic.filter((e) => e.status === "waitlist"), ...mine.filter((e) => e.status === "waitlist").reverse()];
  wait.forEach((e, i) => { e.waitRank = i + 1; });
  return rows;
}
/** Vue publique : sans les refusés. */
export const publicEntries = (ev: CalendarEvent, division: Division, ctx: EntryCtx) => allEntries(ev, division, ctx).filter((e) => e.status !== "rejected" && e.status !== "withdrawn");
/** Équipes occupant une place (confirmées ou en attente de validation). */
export const occupied = (rows: EntryRow[]) => rows.filter((e) => e.status === "confirmed" || e.status === "pending").length;
export const capacityFor = (_ev: CalendarEvent, _division: Division) => TEAM_CAPACITY;
export const isFull = (ev: CalendarEvent, division: Division, ctx: EntryCtx) => occupied(allEntries(ev, division, ctx)) >= capacityFor(ev, division);
/** Inscriptions de la démo actives (en attente ou confirmées). */
export const activeRegs = (regs: DemoRegistration[]) => regs.filter(isActive);

/** Places libres d'un tableau (jamais négatif). */
export const freePlaces = (ev: CalendarEvent, division: Division, ctx: EntryCtx) => Math.max(0, capacityFor(ev, division) - occupied(allEntries(ev, division, ctx)));
/** Rangées qui occupent une place ou attendent (statuts « vivants »). */
export const liveRows = (rows: EntryRow[]) => rows.filter((e) => e.status === "confirmed" || e.status === "pending" || e.status === "waitlist");
/**
 * Contrôle des doublons dans UN tableau : un même joueur présent dans deux paires vivantes.
 * Retourne, pour chaque clé de paire concernée, la description des autres paires où apparaît l'un de ses joueurs.
 */
export function findDuplicates(rows: EntryRow[]): Map<string, string[]> {
  const live = liveRows(rows); const byPlayer = new Map<string, EntryRow[]>();
  for (const r of live) for (const p of [r.a, r.b]) (byPlayer.get(p.id) ?? byPlayer.set(p.id, []).get(p.id)!).push(r);
  const out = new Map<string, string[]>();
  for (const [id, rs] of byPlayer) if (rs.length > 1) for (const r of rs) {
    const others = rs.filter((x) => x.key !== r.key).map((x) => `${id}|${x.key}`);
    out.set(r.key, [...(out.get(r.key) ?? []), ...others]);
  }
  return out;
}
