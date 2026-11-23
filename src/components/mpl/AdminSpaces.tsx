/** Lot 5B-8 — présentation de l'administration en cinq espaces (lecture seule : aucune action métier nouvelle). */
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr, trDyn, CURRENT_LANG } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ADMIN_SPACES, SPACE_TABS, adminHref, type AdminSpace, type AdminTab } from "@/lib/admin-nav";
import { ActionCenter } from "@/components/mpl/ActionCenter";
import type { QueueItem, AuditEntry } from "@/lib/demo-state";
import type { CommissionQueue } from "@/interclub/journey";

export const SPACE_LABEL: Record<AdminSpace, () => string> = { overview: () => (CURRENT_LANG === "fr" ? "Vue d'ensemble" : "Overview"), competitions: () => tr("Competitions"), participants: () => tr("Participants and clubs"), interclub: () => tr("Interclub"), admin: () => tr("Administration and reports") };
export const TAB_LABEL: Record<AdminTab, () => string> = { summary: () => tr("Summary"), overview: () => tr("Charts"), queue: () => tr("Validation queue"), calendar: () => tr("Calendar control"), referees: () => tr("Referees"), clubs: () => tr("Clubs"), rankings: () => tr("Rankings"), interclub: () => tr("Interclub"), reports: () => tr("Reports and exports"), audit: () => tr("Audit log"), permissions: () => tr("Permissions"), partners: () => tr("Partners") };

/** Barre des cinq espaces (liens actifs : l'espace courant porte aria-current). Les compteurs ne portent que sur des éléments en attente. */
export function AdminSpaceNav({ space, onGo, badges }: { space: AdminSpace; onGo: (t: AdminTab) => void; badges: Partial<Record<AdminSpace, number>> }) {
  return (<nav aria-label={tr("Administration spaces")} data-admin-spaces className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
    {ADMIN_SPACES.map((s) => { const n = badges[s] ?? 0; return (
      <a key={s} href={`#${adminHref(SPACE_TABS[s][0])}`} data-admin-space={s} aria-current={space === s ? "page" : undefined} onClick={(e) => { e.preventDefault(); onGo(SPACE_TABS[s][0]); }}
        className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors md:min-h-10", space === s ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}>
        {SPACE_LABEL[s]()}{n > 0 && <span className={cn("grid min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold num", space === s ? "bg-primary-foreground text-primary" : "bg-warning/15 text-warning")} aria-label={`${n} ${tr("pending")}`}>{n}</span>}</a>); })}
  </nav>);
}

function Preview({ title, items, empty, to, attr }: { title: string; items: QueueItem[]; empty: string; to: string; attr: string }) {
  return (<section className="rounded-2xl border bg-card p-4 sm:p-5" {...{ [attr]: "" }} aria-label={title}><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-base font-bold">{title}</h2><Button asChild variant="outline" size="sm" className="min-h-11 md:min-h-8"><Link to={to}>{tr("Open the queue")}</Link></Button></div>
    {items.length === 0 ? <p className="flex items-center gap-2 text-sm text-muted-foreground" data-empty={attr}><CheckCircle2 className="size-4 text-success" aria-hidden="true" />{empty}</p> : <ul className="divide-y">{items.slice(0, 3).map((q) => <li key={q.id} className="py-2 text-sm"><p className="font-medium">{trDyn(q.title)}</p><p className="text-xs text-muted-foreground">{trDyn(q.detail)}</p></li>)}</ul>}
    {items.length > 3 && <p className="mt-2 text-xs text-muted-foreground">+ {items.length - 3} {tr("more in the queue")}</p>}</section>);
}

export interface SummaryProps { queue: QueueItem[]; audit: AuditEntry[]; movedCount: number; icq: CommissionQueue; renderActions: React.ReactNode }
/** Synthèse : actions prioritaires, résultats à valider, demandes des clubs, alertes, activité récente. */
export function AdminSummary({ queue, audit, movedCount, icq, renderActions }: SummaryProps) {
  const pend = queue.filter((q) => q.status === "pending"); const results = pend.filter((q) => q.matchRef); const requests = pend.filter((q) => q.requestRef);
  const alerts: Array<{ key: string; text: string; to: string }> = [
    ...(movedCount > 0 ? [{ key: "calendar", text: `${movedCount} ${tr("events modified vs reference (scenario C)")}`, to: adminHref("calendar") }] : []),
    ...(icq.incidents > 0 ? [{ key: "incidents", text: `${icq.incidents} ${tr("major Interclub incident(s) to review")}`, to: adminHref("interclub") }] : []),
    { key: "scale", text: tr("Points scale to confirm: M1500 and Mixed"), to: adminHref("rankings") },
    { key: "partners", text: tr("No partner is shown as a 2027 partner"), to: adminHref("partners") },
  ];
  return (<div className="space-y-4" data-admin-summary>
    <div className="grid gap-4 lg:grid-cols-3" data-admin-ops>{renderActions}
      <section className="rounded-2xl border bg-card p-4 sm:p-5" data-admin-alerts aria-labelledby="admin-alerts-h"><h2 id="admin-alerts-h" className="mb-3 flex items-center gap-2 text-base font-bold"><AlertTriangle className="size-4 text-warning" aria-hidden="true" />{tr("Alerts")}</h2>
        <ul className="divide-y">{alerts.map((a) => <li key={a.key} data-alert={a.key}><Link to={a.to} className="flex min-h-11 items-center py-2 text-sm hover:text-primary">{a.text}</Link></li>)}</ul></section></div>
    <div className="grid gap-4 md:grid-cols-2"><Preview title={tr("Results to validate")} items={results} empty={tr("No result is waiting for validation.")} to={adminHref("queue")} attr="data-admin-results" /><Preview title={tr("Club requests")} items={requests} empty={tr("No club request is waiting.")} to={adminHref("queue")} attr="data-admin-requests" /></div>
    <section className="rounded-2xl border bg-card p-4 sm:p-5" data-admin-activity aria-labelledby="admin-activity-h"><div className="mb-3 flex items-center justify-between gap-2"><h2 id="admin-activity-h" className="flex items-center gap-2 text-base font-bold"><History className="size-4" aria-hidden="true" />{tr("Recent activity")}</h2><Button asChild variant="outline" size="sm" className="min-h-11 md:min-h-8"><Link to={adminHref("audit")}>{tr("Open the audit log")}</Link></Button></div>
      {audit.length === 0 ? <p className="text-sm text-muted-foreground" data-empty="admin-activity">{tr("No activity yet.")}</p> : <ul className="divide-y">{audit.slice(0, 5).map((a, i) => <li key={i} className="flex flex-wrap gap-x-3 gap-y-0.5 py-2 text-sm"><span className="font-mono text-xs text-muted-foreground num">{a.at}</span><span className="font-medium">{trDyn(a.actor)}</span><span className="min-w-0 flex-1 basis-48 text-muted-foreground">{trDyn(a.action)}</span></li>)}</ul>}</section>
  </div>);
}

/** Espace Interclub : file de la Commission (lecture) et accès directs aux onglets Interclub. Les décisions restent simulées et se prennent dans /interclub. */
export function AdminInterclub({ icq }: { icq: CommissionQueue }) {
  const tools: Array<[string, string]> = [[tr("Commission"), "/interclub?tab=commission"], [tr("Matches"), "/interclub?tab=matches"], [tr("Rules register"), "/interclub?tab=rules"], [tr("Season and divisions"), "/interclub?tab=season"], [tr("Capacity simulator"), "/interclub?tab=capacity"]];
  return (<div className="grid gap-4 lg:grid-cols-3" data-admin-interclub>
    <ActionCenter className="lg:col-span-2" title={tr("Interclub — Commission queue")} items={[
      { key: "ic-engagements", label: tr("Interclub engagement lines to instruct"), count: icq.engagements, tone: "warn", to: "/interclub?tab=commission", hint: tr("Commission tab — decisions are simulated") },
      { key: "ic-compositions", label: tr("Team compositions to check"), count: icq.compositions, tone: "warn", to: "/interclub?tab=commission" },
      { key: "ic-decide", label: tr("Match sheets to decide"), count: icq.toDecide, tone: "warn", to: "/interclub?tab=matches" },
      { key: "ic-corrections", label: tr("Match-sheet corrections requested"), count: icq.corrections, to: "/interclub?tab=matches" },
      { key: "ic-contested", label: tr("Contested results"), count: icq.contested, tone: "warn", to: "/interclub?tab=matches" },
    ]} />
    <section className="rounded-2xl border bg-card p-4 sm:p-5" data-admin-interclub-tools aria-labelledby="ic-tools-h"><h2 id="ic-tools-h" className="mb-3 text-base font-bold">{tr("Open the Interclub area")}</h2><ul className="divide-y">{tools.map(([l, to]) => <li key={to}><Link to={to} className="flex min-h-11 items-center py-2 text-sm hover:text-primary">{l}</Link></li>)}</ul></section>
  </div>);
}
