/** Lot 5B-4 — « À traiter » de l'administration MPL et exports CSV. Fonctions pures (testées en unitaire) ; aucune règle sportive ni décision modifiée. */
import { toCsv, WATERMARK } from "@/interclub/exports";
import { tr } from "@/lib/i18n";
import type { QueueItem } from "@/lib/demo-state";
import type { IcState } from "@/interclub/state";
import type { CalendarEvent } from "@/data/calendar.generated";
import { clubById } from "@/data/clubs";

export interface AdminTodo { results: number; requests: number; corrections: number; other: number; engagementLines: number; sheets: number; total: number }
/** Sheets whose result still has to be controlled by the Commission (submitted, contested or checked by the referee, not yet validated). */
const SHEET_TO_CONTROL = new Set(["submitted", "contested", "referee_checked"]);
export function adminTodo(queue: QueueItem[], ic: IcState): AdminTodo {
  const pending = queue.filter((q) => q.status === "pending");
  const results = pending.filter((q) => q.matchRef).length, requests = pending.filter((q) => q.requestRef).length, corrections = pending.filter((q) => q.correctionRef).length;
  const other = pending.length - results - requests - corrections;
  const engagementLines = ic.dossiers.reduce((n, d) => n + Object.values(d.lines).filter((l) => l.status === "submitted").length, 0);
  const sheets = Object.values(ic.d3.sheets).filter((s) => !s.orphan && SHEET_TO_CONTROL.has(s.stage)).length;
  return { results, requests, corrections, other, engagementLines, sheets, total: pending.length + engagementLines + sheets };
}
export const csvQueue = (queue: QueueItem[]) => toCsv([[WATERMARK], ["id", tr("Type"), tr("Title"), tr("Detail"), tr("By"), tr("Status")], ...queue.map((q) => [q.id, q.kind, q.title, q.detail, q.by, q.status])]);
export const csvAudit = (audit: Array<{ at: string; actor: string; action: string; ref?: string }>) => toCsv([[WATERMARK], [tr("Date"), tr("Actor"), tr("Action"), tr("Reference")], ...audit.map((a) => [a.at, a.actor, a.action, a.ref ?? ""])]);
export const csvCalendar = (events: CalendarEvent[]) => toCsv([[WATERMARK], ["id", tr("Category"), tr("Club"), tr("Start"), tr("End"), tr("Courts"), tr("Modified vs reference")], ...events.map((e) => [e.id, e.category, e.clubName, e.start, e.end, e.courts, e.moved ? tr("Yes") : tr("No")])]);
export const csvEngagements = (ic: IcState) => toCsv([[WATERMARK], [tr("Club"), tr("Division"), tr("Status"), tr("Note")], ...ic.dossiers.flatMap((d) => Object.entries(d.lines).map(([div, l]) => [clubById(d.clubId)?.name ?? d.clubId, div, l.status, l.note ?? ""]))]);
