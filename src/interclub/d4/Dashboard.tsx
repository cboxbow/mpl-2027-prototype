import { useMemo, type ReactNode } from "react";
import { useDemo } from "@/lib/demo-store";
import { tr } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fmtMsg } from "../EngagementForm";
import { IcNotice, WarnLine } from "../ui-bits";
import { STAGE_LABEL, STAGE_TONE } from "../d3/d3-text";
import { QUAL_LABEL, QUAL_TONE, StandingsTable, finalsAlertText, teamName } from "./d4-text";
import { computeD4 } from "./d4state";

const Card = ({ id, title, value, children }: { id: string; title: string; value?: ReactNode; children?: ReactNode }) => (<section className="space-y-2 rounded-xl border bg-card p-4" data-dash={id}><div className="flex items-baseline justify-between gap-2"><h2 className="text-sm font-semibold">{title}</h2>{value !== undefined && <span className="text-2xl font-bold tabular-nums" data-dash-value>{value}</span>}</div>{children}</section>);
/** D4 — Tableau de bord Commission (simulation) : avancement, attentes, contestations, forfaits, égalités, qualifications, alertes. */
export default function Dashboard() {
  const { ic } = useDemo(); const c = useMemo(() => computeD4(ic, "validated"), [ic]); const pv = useMemo(() => computeD4(ic, "preview"), [ic]); const run = ic.d2.run; const sheets = Object.values(ic.d3.sheets); const cancelled = ic.d4.cancelled;
  const live = sheets.filter((s) => !cancelled[s.id] && !s.orphan); const validated = live.filter((s) => s.stage === "validated_demo"); const remaining = live.filter((s) => s.stage !== "validated_demo");
  const unscheduled = run?.ties.filter((t) => t.status === "unscheduled") ?? []; const totalTies = run?.ties.length ?? 0;
  const pending = live.filter((s) => ["submitted", "referee_checked", "correction_requested"].includes(s.stage)); const contested = live.filter((s) => s.stage === "contested");
  const forfeits = sheets.filter((s) => s.flag === "forfeit"); const incidents = sheets.flatMap((s) => s.incidents.map((i) => ({ ...i, sheet: s.id }))); const unresolved = c.tables.flatMap((t) => t.unresolvedGroups.map((g) => ({ t, g })));
  const pendingQual = Object.values(c.plans).flatMap((p) => p.qualifiers.filter((q) => q.status !== "qualified_demo").map((q) => ({ p, q })));
  const alerts: string[] = [];
  if (!ic.d4.rules.approved) alerts.push(tr("Points scale and tie-break order are unapproved simulation values (rules version {v}).").replace("{v}", String(ic.d4.rules.version)));
  if (unscheduled.length) alerts.push(fmtMsg(tr("{n} tie(s) cannot be scheduled in D2: they cannot be presented as played normally."), { n: unscheduled.length }));
  if (sheets.some((s) => s.orphan)) alerts.push(tr("Some match sheets are no longer scheduled in the D2 calendar and are blocked."));
  if (Object.keys(cancelled).length) alerts.push(fmtMsg(tr("{n} tie(s) cancelled: standings are computed without them."), { n: Object.keys(cancelled).length }));
  if (forfeits.some((s) => s.forfeit?.mode === "commission_decides" && s.stage !== "validated_demo")) alerts.push(tr("A total forfeit awaits a Commission decision: no official scale is applied automatically."));
  if (incidents.some((i) => i.kind === "disciplinary")) alerts.push(tr("A disciplinary incident was reported: no sanction is applied by the prototype."));
  if (c.tables.some((t) => t.rows.some((r) => r.sepBy === "commission"))) alerts.push(tr("Some rankings rely on a simulated Commission decision."));
  for (const p of Object.values(c.plans)) for (const a of p.alerts) if (!["pool_incomplete"].includes(a.code)) alerts.push(`${p.division}: ${finalsAlertText(a)}`);
  return (<div className="space-y-4" data-dashboard>
    <IcNotice />
    <p className="rounded-md border border-amber-500/60 bg-amber-500/10 p-2 text-sm" data-d4-notice>{tr("Commission dashboard — demonstration data. Nothing here is official.")}</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card id="played" title={tr("Ties played (validated in demonstration)")} value={validated.length}><p className="text-xs text-muted-foreground">{tr("out of")} {totalTies + (run?.finals.filter((f) => f.status === "scheduled").length ?? 0)} {tr("planned ties")}</p></Card>
      <Card id="remaining" title={tr("Ties remaining")} value={remaining.length + unscheduled.length}><p className="text-xs text-muted-foreground">{unscheduled.length} {tr("not scheduled in D2")}</p></Card>
      <Card id="contested" title={tr("Contestations")} value={contested.length} />
      <Card id="forfeits" title={tr("Forfeits and incidents")} value={`${forfeits.length} / ${incidents.length}`}><p className="text-xs text-muted-foreground">{tr("forfeits")} / {tr("incidents")}</p></Card></div>
    <div className="grid gap-3 lg:grid-cols-2">
      <Card id="pending" title={tr("Results awaiting a decision")} value={pending.length}>{pending.length === 0 ? <p className="text-sm text-muted-foreground">{tr("Nothing pending.")}</p> : <ul className="space-y-1 text-sm">{pending.slice(0, 8).map((s) => <li key={s.id} className="flex flex-wrap items-center gap-2"><span>{s.division} · {fmtDate(s.date)} · {teamName(s.home)} {tr("vs")} {teamName(s.away)}</span><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STAGE_TONE[s.stage])}>{STAGE_LABEL[s.stage]}</span></li>)}</ul>}</Card>
      <Card id="contest-list" title={tr("Contested results")}>{contested.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No contestation.")}</p> : <ul className="space-y-1 text-sm">{contested.map((s) => <li key={s.id}>{s.division} · {teamName(s.home)} {tr("vs")} {teamName(s.away)} — {s.contest?.reason}</li>)}</ul>}</Card>
      <Card id="unresolved" title={tr("Unresolved ties")} value={unresolved.length}>{unresolved.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No unresolved tie.")}</p> : <ul className="space-y-1 text-sm">{unresolved.map(({ t, g }, i) => <li key={i}><WarnLine level="block">{t.division} P{t.pool}: {g.map(teamName).join(" · ")} — {tr("Commission decision required")}</WarnLine></li>)}</ul>}</Card>
      <Card id="qualifications" title={tr("Qualifications pending")} value={pendingQual.length}>{pendingQual.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No pending qualification.")}</p> : <ul className="space-y-1 text-sm">{pendingQual.slice(0, 10).map(({ p, q }) => <li key={q.team} className="flex flex-wrap items-center gap-2"><span>{p.division} · {teamName(q.team)}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${QUAL_TONE[q.status]}`}>{QUAL_LABEL[q.status]}</span></li>)}</ul>}</Card></div>
    <Card id="alerts" title={tr("Regulatory alerts")} value={alerts.length}>{alerts.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No alert.")}</p> : <ul className="space-y-1" data-alert-list>{alerts.map((a, i) => <WarnLine key={i}>{a}</WarnLine>)}</ul>}</Card>
    <Card id="preview" title={tr("Provisional standings — preview before any validation")}>
      <p className="text-xs text-muted-foreground">{tr("Includes submitted and referee-checked results (shown in italics). These standings are never final.")}</p>
      {pv.tables.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No standings yet.")}</p> : <div className="space-y-3">{pv.tables.map((t) => <StandingsTable key={`${t.division}-${t.pool}`} t={t} />)}</div>}</Card>
  </div>);
}
