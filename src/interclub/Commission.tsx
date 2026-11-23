import { useMemo, useState } from "react";
import { Check, Download, MessageSquareWarning, RotateCcw, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/mpl/bits";
import { clubById } from "@/data/clubs";
import { REASON_MIN_LENGTH } from "@/config/demo-config";
import { useDemo } from "@/lib/demo-store";
import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DEFAULT_DIVISIONS, DIVISION_CODES, computeCapacity, defaultInputs, teamsByDivision } from "./capacity";
import { HistoryPanel, issueText } from "./EngagementForm";
import { blocking, exclusivityConflicts, otherClubsMap, rankLabel, teamCounts, validateForm, type Dossier, type LineStatus } from "./engagement";
import { LINE_LABEL, csvAll, downloadText, toCsv } from "./exports";
import { validationCtx } from "./state";
import { IcNotice, LineBadge, WarnLine, field, sel } from "./ui-bits";

/** Commission MPL — instruction des dossiers. Décisions SIMULÉES : jamais une validation officielle. */
export default function Commission() {
  const s = useDemo(); const { ic, icAct } = s; const [fc, setFc] = useState(""); const [fd, setFd] = useState(""); const [fs, setFs] = useState(""); const [open, setOpen] = useState<string | null>(null);
  const lines = useMemo(() => ic.dossiers.flatMap((d) => Object.entries(d.lines).map(([div, l]) => ({ d, div, l }))), [ic.dossiers]);
  const rows = lines.filter(({ d, div, l }) => (!fc.trim() || (clubById(d.clubId)?.name ?? d.clubId).toLowerCase().includes(fc.trim().toLowerCase())) && (!fd || div === fd) && (!fs || l.status === fs));
  const count = (st: LineStatus) => lines.filter((x) => x.l.status === st).length;
  const accepted = teamCounts(ic.dossiers, ["accepted"]); const pending = teamCounts(ic.dossiers, ["submitted", "accepted"]);
  const chart = DIVISION_CODES.map((c) => ({ c, accepted: accepted[c] ?? 0, submitted: (pending[c] ?? 0) - (accepted[c] ?? 0), max: ic.params.maxByDivision[c] }));
  return (
    <div className="space-y-5" data-commission>
      <IcNotice><span data-simulated-note>{tr("Decisions made here are SIMULATED. They are not official validations and do not assign pools, hosts or payments.")}</span></IcNotice>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><StatCard label={tr("Engagement files")} value={ic.dossiers.length} /><StatCard label={tr("Lines to instruct")} value={count("submitted")} tone={count("submitted") ? "warn" : "default"} /><StatCard label={tr("Waiting for the club")} value={count("to_complete")} /><StatCard label={tr("Accepted (simulated)")} value={count("accepted")} tone="good" /><StatCard label={tr("Refused (simulated)")} value={count("refused")} /></div>
      <Stats chart={chart} />
      <LoadGauge />
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-44 flex-1"><label htmlFor="cm-club" className="mb-1 block text-xs font-medium">{tr("Club")}</label><input id="cm-club" className={field} value={fc} onChange={(e) => setFc(e.target.value)} /></div>
        <div><label htmlFor="cm-div" className="mb-1 block text-xs font-medium">{tr("Division")}</label><select id="cm-div" className={cn(sel, "w-32")} value={fd} onChange={(e) => setFd(e.target.value)}><option value="">{tr("All")}</option>{DIVISION_CODES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label htmlFor="cm-st" className="mb-1 block text-xs font-medium">{tr("Status")}</label><select id="cm-st" className={cn(sel, "w-48")} value={fs} onChange={(e) => setFs(e.target.value)}><option value="">{tr("All")}</option>{(["draft", "submitted", "to_complete", "accepted", "refused"] as const).map((x) => <option key={x} value={x}>{LINE_LABEL[x]}</option>)}</select></div>
        <Button variant="outline" onClick={() => { const rowsOut = [[tr("Club"), tr("Division"), tr("Status"), tr("Players"), tr("Note")], ...lines.map(({ d, div, l }) => [clubById(d.clubId)?.name ?? d.clubId, div, LINE_LABEL[l.status], d.form.players.filter((p) => p.division === div).length, l.note ?? ""])]; downloadText("interclub-2027-engagements.csv", toCsv(rowsOut)); toast.success(tr("CSV exported")); }} data-export-all><Download className="mr-1 size-4" />CSV</Button>
        <Button variant="outline" onClick={() => { s.icAct({ k: "remind" }); toast.success(tr("Closing reminders simulated")); }} data-remind>{tr("Simulate closing reminders")}</Button></div>
      <p className="text-sm text-muted-foreground" aria-live="polite" data-line-count>{rows.length} {tr("line(s)")}</p>
      <ul className="space-y-2.5" data-queue>{rows.map(({ d, div, l }) => { const key = `${d.clubId}|${div}`; return (
        <li key={key} className="rounded-xl border bg-card p-4" data-queue-line={key}>
          <div className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><p className="font-semibold">{clubById(d.clubId)?.name ?? d.clubId} · {div}</p><p className="text-xs text-muted-foreground">{d.id} · v{d.version} · {d.form.players.filter((p) => p.division === div).length} {tr("player(s)")}</p></div><LineBadge status={l.status} /><Button size="sm" variant="outline" onClick={() => setOpen(open === key ? null : key)} aria-expanded={open === key} data-open-line={key}>{open === key ? tr("Close") : tr("Instruct")}</Button></div>
          {open === key && <Instruct d={d} div={div} icAct={icAct} />}
        </li>); })}</ul>
    </div>
  );
}
function Stats({ chart }: { chart: Array<{ c: string; accepted: number; submitted: number; max: number }> }) {
  return (<div className="rounded-xl border bg-card p-4" data-stats><h2 className="mb-1 font-semibold">{tr("Engagement statistics")}</h2><p className="mb-3 text-xs text-muted-foreground">{tr("Teams per division against the proposed maximum (not approved).")}</p>
    <div role="img" aria-label={tr("Bar chart: accepted and submitted teams per division")}><ResponsiveContainer width="100%" height={220}><BarChart data={chart} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="c" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} /><YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} width={28} /><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} /><Bar dataKey="accepted" stackId="a" name={tr("Accepted")} fill="var(--chart-1, #1f6f5c)" /><Bar dataKey="submitted" stackId="a" name={tr("Submitted")} fill="var(--chart-3, #5b7fbf)" /></BarChart></ResponsiveContainer></div>
    <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">{chart.map((x) => <li key={x.c} data-div-count={x.c}><span className="flex justify-between"><strong>{x.c}</strong><span>{x.accepted} / {x.max}</span></span><Progress value={Math.min(100, (x.accepted / x.max) * 100)} aria-label={`${x.c} ${tr("accepted teams")}`} />{x.accepted + x.submitted > x.max && <span className="text-xs text-amber-700 dark:text-amber-400">{tr("Above the proposed maximum (warning).")}</span>}</li>)}</ul></div>);
}
/** Contrôle des capacités déclarées : charge par vendredi à partir des équipes soumises/acceptées et des disponibilités déclarées par les clubs. */
export function LoadGauge() {
  const { ic } = useDemo(); const counts = teamCounts(ic.dossiers, ["submitted", "accepted"]); const hosts = ic.dossiers.filter((d) => d.form.hosting.fridayCourts > 0);
  const res = useMemo(() => { const base = defaultInputs("custom"); const divs = teamsByDivision(counts, DEFAULT_DIVISIONS).map((x) => ({ ...x, active: x.code === "D2H" ? ic.params.d2hActive : true })); return computeCapacity({ ...base, divisions: divs, clubs: hosts.map((d) => ({ name: clubById(d.clubId)?.name ?? d.clubId, courts: d.form.hosting.homologated, available: d.form.hosting.fridayCourts })) }); }, [ic.dossiers, ic.params.d2hActive]); // eslint-disable-line react-hooks/exhaustive-deps
  const ratio = res.theoretical ? res.loadPerFriday / res.theoretical : 0;
  return (<div className="rounded-xl border bg-card p-4" data-load-gauge><h3 className="font-semibold">{tr("Load per Friday vs declared hosting capacity")}</h3>
    <p className="mb-2 text-xs text-muted-foreground">{tr("Based on submitted and accepted teams and on the Friday courts declared by the clubs (not a hosting commitment).")}</p>
    <div className="grid gap-3 sm:grid-cols-3 text-sm"><div><p className="text-xs text-muted-foreground">{tr("Ties per Friday (J1–J6)")}</p><p className="text-2xl font-bold" data-gauge-load>{res.loadPerFriday}</p></div><div><p className="text-xs text-muted-foreground">{tr("Declared capacity")}</p><p className="text-2xl font-bold" data-gauge-capacity>{res.theoretical}</p></div><div><p className="text-xs text-muted-foreground">{tr("Declaring clubs")}</p><p className="text-2xl font-bold">{hosts.length}</p></div></div>
    <Progress className="mt-2" value={Math.min(100, ratio * 100)} aria-label={tr("Load against declared capacity")} />
    {hosts.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{tr("No club has declared Friday courts yet.")}</p> : res.verdict !== "ok" && res.loadPerFriday > 0 && <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-400" data-gauge-warning>{res.verdict === "impossible" ? tr("Declared capacity is below the load: the calendar cannot be hosted with the current declarations.") : tr("Load above the recommended share of declared capacity (overload risk).")}</p>}
    <p className="mt-1 text-xs text-muted-foreground">{tr("Open the Capacity tab for the full simulator.")}</p></div>);
}
function Instruct({ d, div, icAct }: { d: Dossier; div: string; icAct: ReturnType<typeof useDemo>["icAct"] }) {
  const s = useDemo(); const [reason, setReason] = useState(""); const l = d.lines[div]; const players = d.form.players.filter((p) => p.division === div);
  const ctx = validationCtx(s, d.clubId); const other = otherClubsMap(s.ic.dossiers, d.clubId); const conf = exclusivityConflicts(players, other); const issues = validateForm(d.form, ctx); const bl = blocking(issues);
  const ok = reason.trim().length >= REASON_MIN_LENGTH; const h = d.form.hosting;
  return (<div className="mt-3 space-y-4 border-t pt-3" data-instruct>
    <div className="grid gap-4 lg:grid-cols-2">
      <div><h4 className="mb-1 text-sm font-semibold">{tr("Squad check")}</h4><p className="text-xs text-muted-foreground">{players.length} {tr("player(s)")} · {tr("minimum")} {s.ic.params.minPlayersPerTeam} ({tr("proposed")})</p>
        <ul className="mt-1 space-y-1 text-sm" data-squad>{players.map((p) => <li key={p.id} className={cn("flex justify-between rounded border px-2 py-1", p.playerId && other.has(p.playerId) && "border-amber-500")}><span>{p.name}</span><span className="text-muted-foreground">{tr("rank")} {rankLabel(p.rank)} · {p.pair || "—"}</span></li>)}</ul>
        {conf.length > 0 && <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-400" data-conflicts>{tr("Exclusivity conflicts")}: {conf.map((p) => `${p.name} (${clubById(other.get(p.playerId!)!)?.name})`).join(", ")}</p>}</div>
      <div><h4 className="mb-1 text-sm font-semibold">{tr("Declared capacity")}</h4><ul className="space-y-1 text-sm" data-capacity-declared><li>{tr("Homologated courts")}: {h.homologated}</li><li>{tr("Friday evening courts (declared)")}: {h.fridayCourts}{h.fridayCourts > h.homologated && <span className="text-destructive"> — {tr("above the total")}</span>}</li><li>{tr("Lighting")}: {h.lighting ? tr("Yes") : tr("No")}</li><li>{tr("Availability")}: {d.form.availability.filter((a) => a === "yes").length} {tr("yes")} / {d.form.availability.filter((a) => a === "maybe").length} {tr("maybe")} / {d.form.availability.filter((a) => a === "no").length} {tr("no")}</li></ul>
        <p className="mt-1 text-xs text-muted-foreground">{tr("Existing courts are not courts really available on Fridays.")}</p></div></div>
    {issues.length > 0 && <ul className="space-y-1" data-instruct-issues>{issues.map((i, n) => <WarnLine key={n} level={i.severity === "block" ? "block" : "warn"}>{issueText(i)}</WarnLine>)}</ul>}
    {bl.length > 0 && <p className="text-xs text-muted-foreground">{tr("Blocking issues are shown for information: a submitted file already passed them.")}</p>}
    {l.status === "submitted" || l.status === "accepted" || l.status === "refused" ? (
      <div className="space-y-2 rounded-lg border p-3"><label htmlFor={`rs-${d.clubId}-${div}`} className="text-sm font-medium">{tr("Reason (required to refuse, request changes or reopen)")}</label>
        <input id={`rs-${d.clubId}-${div}`} className={field} value={reason} onChange={(e) => setReason(e.target.value)} data-reason />
        <div className="flex flex-wrap gap-2">
          {l.status === "submitted" && <><Button size="sm" onClick={() => { icAct({ k: "decide", clubId: d.clubId, division: div, status: "accepted", reason: reason.trim() || undefined }); setReason(""); toast.success(tr("Line accepted (simulated decision)")); }} data-accept><Check className="mr-1 size-4" />{tr("Accept (simulated)")}</Button>
            <Button size="sm" variant="outline" disabled={!ok} onClick={() => { icAct({ k: "request", clubId: d.clubId, division: div, reason: reason.trim() }); setReason(""); toast.success(tr("Correction requested")); }} data-request><MessageSquareWarning className="mr-1 size-4" />{tr("Request changes")}</Button>
            <Button size="sm" variant="destructive" disabled={!ok} onClick={() => { icAct({ k: "decide", clubId: d.clubId, division: div, status: "refused", reason: reason.trim() }); setReason(""); toast.success(tr("Line refused (simulated decision)")); }} data-refuse><X className="mr-1 size-4" />{tr("Refuse (simulated)")}</Button></>}
          {(l.status === "accepted" || l.status === "refused") && <Button size="sm" variant="outline" disabled={!ok} onClick={() => { icAct({ k: "reopen", clubId: d.clubId, division: div, reason: reason.trim() }); setReason(""); }} data-reopen><RotateCcw className="mr-1 size-4" />{tr("Reopen")}</Button>}</div>
        <p className="text-xs text-muted-foreground">{tr("A simulated decision is not an official validation. A reason of at least")} {REASON_MIN_LENGTH} {tr("characters is required.")}</p></div>
    ) : <p className="text-sm text-muted-foreground">{l.status === "to_complete" ? tr("Waiting for the club to correct and re-submit.") : tr("Draft: not submitted yet.")}</p>}
    <HistoryPanel d={d} />
    <Button size="sm" variant="outline" onClick={() => { const c = csvAll(d, clubById(d.clubId)?.name ?? d.clubId); downloadText(`${d.id}-lines.csv`, c.lines); downloadText(`${d.id}-players.csv`, c.players); icAct({ k: "export", clubId: d.clubId, what: "csv" }); }}><Download className="mr-1 size-4" />CSV</Button>
  </div>);
}
