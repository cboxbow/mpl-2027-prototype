import { useEffect, useMemo } from "react";
import { tr, trDyn, CURRENT_LANG } from "@/lib/i18n";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Camera, Check, Download, ClipboardCheck, Handshake, History, MapPin, ShieldCheck, Users, X, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { CategoryBadge, ClubAvatar, DemoBadge, StatCard } from "@/components/mpl/bits";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { CLUBS, ZONES } from "@/data/clubs";
import { SPONSOR_ASSETS } from "@/data/sponsors";
import { JUNIORS, PLAYERS } from "@/data/demo";
import { FICTIONAL_REGISTRATIONS_BASE } from "@/config/demo-config";
import { useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { monthKey, fmtRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Gate } from "../player/Dashboard";
import { ActionCenter } from "@/components/mpl/ActionCenter";
import { adminTodo, csvAudit, csvCalendar, csvEngagements, csvQueue } from "@/lib/admin-ops";
import { downloadText } from "@/interclub/exports";
import { Link, useSearchParams } from "react-router-dom";
import { AdminInterclub, AdminSpaceNav, AdminSummary, SPACE_LABEL, TAB_LABEL } from "@/components/mpl/AdminSpaces";
import { DEFAULT_TAB, SPACE_TABS, resolveAdminTab, spaceOfTab, type AdminTab } from "@/lib/admin-nav";
import { commissionQueue } from "@/interclub/journey";
import { CorrectionActions, PermissionsTab, RefereesTab, RequestActions } from "@/components/mpl/AdminWaveC";
import { Input } from "@/components/ui/input";
import { REASON_MIN_LENGTH } from "@/config/demo-config";
import { canChangeWinner } from "@/lib/bracket";
import { drawView, matchLabel, teamPlayers } from "@/lib/draws";
import { matchKey, type QueueItem } from "@/lib/demo-state";
import { DIVISION_LABEL, type Division } from "@/data/demo";

/** Actions de validation d'un résultat de match (file admin) : approuver / rejeter avec motif. */
function MatchQueueActions({ q }: { q: QueueItem }) {
  const { draws, matches, registrations, org, validateMatch, rejectMatch } = useDemo(); const [rej, setRej] = useState(false); const [reason, setReason] = useState("");
  const ref = q.matchRef!; const ev = CALENDAR_EVENTS.find((e) => e.id === ref.eventId); const v = ev ? drawView({ draws, matches, registrations, org }, ev, ref.division as Division) : null;
  const r = v?.resolved.get(ref.matchId); const prop = r?.st?.proposal; const key = matchKey(ref.eventId, ref.division, ref.matchId);
  if (!v || !r || !prop) return <span className="text-xs text-muted-foreground">{tr("Result no longer available")}</span>;
  const label = `${matchLabel(r.m)} — ${ref.eventId} · ${DIVISION_LABEL[ref.division as Division]}`;
  const blocked = !!r.st?.result && prop.winner !== r.st.result.winner && !canChangeWinner(v.built, ref.matchId, v.stateOf);
  const approve = () => { const notify = [r.a, r.b].flatMap((k) => teamPlayers(v, k)).map((playerId) => ({ playerId, text: `Result validated for ${matchLabel(r.m)} (${ref.eventId}).` })); validateMatch(key, ref.eventId, label, notify); toast.success(tr("Result validated (demo)")); };
  return (<div className="flex flex-col gap-2" data-match-queue={ref.matchId}>
    {!rej ? <div className="flex gap-2"><Button size="sm" disabled={blocked} onClick={approve} data-approve-result><Check className="mr-1 size-4" />{tr("Validate result")}</Button><Button size="sm" variant="outline" onClick={() => setRej(true)} data-reject-result><X className="mr-1 size-4" />{tr("Reject")}</Button></div> :
      <div className="flex flex-col gap-2"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr("Rejection reason (required)")} aria-label={tr("Rejection reason (required)")} data-reject-reason /><div className="flex gap-2"><Button size="sm" variant="destructive" disabled={reason.trim().length < REASON_MIN_LENGTH} onClick={() => { rejectMatch(key, ref.eventId, label, reason.trim()); toast(tr("Result rejected (demo)")); }} data-confirm-reject>{tr("Confirm rejection")}</Button><Button size="sm" variant="ghost" onClick={() => setRej(false)}>{tr("Cancel")}</Button></div></div>}
    {blocked && <p className="max-w-xs text-xs text-destructive" data-winner-blocked>{tr("The winner cannot change: later matches already have results (demo limit).")}</p>}
    <Link to={`/organizer/scores?event=${ref.eventId}&division=${ref.division}&match=${ref.matchId}`} className="text-xs underline">{tr("View match")}</Link></div>);
}

const AXIS = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false } as const;
/** Largeur d'écran étroite : les libellés d'axe sont inclinés pour rester lisibles et ne jamais se chevaucher. */
function useNarrow() { const [n, setN] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches); useEffect(() => { const m = window.matchMedia("(max-width: 639px)"); const h = () => setN(m.matches); m.addEventListener("change", h); return () => m.removeEventListener("change", h); }, []); return n; }
const TIP = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };
export default function AdminDashboard() {
  const { role, setRole, queue, resolveQueue, audit, snapshots, publishSnapshot, registrations, ic, allowed } = useDemo(); const [actor, setActor] = useState("all"); const [sp, setSp] = useSearchParams(); const tab = resolveAdminTab(sp.get("tab"), sp.get("space")); const space = spaceOfTab(tab); const setTab = (t: AdminTab) => setSp(t === DEFAULT_TAB ? {} : { tab: t });
  const byMonth = useMemo(() => { const m = new Map<string, number>(); CALENDAR_EVENTS.forEach((e) => m.set(monthKey(e.start), (m.get(monthKey(e.start)) ?? 0) + 1)); return [...m.entries()].map(([k, n]) => ({ m: new Date(k + "-01T00:00:00Z").toLocaleString(CURRENT_LANG === "fr" ? "fr-FR" : "en-GB", { month: "short", timeZone: "UTC" }), n })); }, []);
  const byZone = useMemo(() => (Object.keys(ZONES) as (keyof typeof ZONES)[]).map((z) => ({ name: ZONES[z].label, value: CALENDAR_EVENTS.filter((e) => e.zone === z).length, color: ZONES[z].color })), []);
  const narrow = useNarrow();
  const byCat = useMemo(() => { const m = new Map<string, number>(); CALENDAR_EVENTS.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + 1)); return [...m.entries()].map(([c, n]) => ({ c: c.replace("MIXTE ", "Mx "), n })); }, []);
  const moved = CALENDAR_EVENTS.filter((e) => e.moved);
  if (role !== "admin") return <Gate onSwitch={() => setRole("admin")} label={tr("admin")} />;
  const pending = queue.filter((q) => q.status === "pending").length; const todo = adminTodo(queue, ic); const icq = commissionQueue(ic); const goQueue = () => setTab("queue");
  const exp = (name: string, csv: string) => { downloadText(name, csv); toast.success(tr("CSV exported")); };
  return (
    <div className="container-mpl py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{tr("MPL administration")}</p><h1 className="text-3xl font-bold sm:text-4xl">{tr("Control centre")}</h1></div><DemoBadge label={tr("DEMO ADMIN — NO PRODUCTION ACCESS")} /></div>
      <AdminSpaceNav space={space} onGo={setTab} badges={{ competitions: pending, interclub: icq.total }} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as AdminTab)}>{SPACE_TABS[space].length > 1 && <TabsList className="no-scrollbar h-12 w-full justify-start overflow-x-auto" aria-label={SPACE_LABEL[space]()}>{SPACE_TABS[space].map((t) => <TabsTrigger key={t} value={t} data-admin-tab={t}>{TAB_LABEL[t]()}{t === "queue" && pending > 0 && <Badge className="ml-2 h-5 px-1.5">{pending}</Badge>}</TabsTrigger>)}</TabsList>}
        <TabsContent value="summary" className="mt-5 space-y-4">
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label={tr("Events 2027")} value={CALENDAR_EVENTS.length} hint="Calendar V4" icon={<CalendarRange className="size-4" />} /><StatCard label={tr("Clubs")} value={CLUBS.length} icon={<MapPin className="size-4" />} /><StatCard label={tr("Demo players")} value={PLAYERS.length + JUNIORS.length} hint={`${PLAYERS.length} ${tr("adults")} + ${JUNIORS.length} ${tr("juniors, fictional")}`} icon={<Users className="size-4" />} /><StatCard label={tr("Registrations (demo)")} value={registrations.filter((r) => r.status !== "cancelled").length + FICTIONAL_REGISTRATIONS_BASE} hint={`${registrations.length} ${tr("created in this demo + fictional base")}`} icon={<Handshake className="size-4" />} /></div>
          <AdminSummary queue={queue} audit={audit} movedCount={moved.length} icq={icq} renderActions={
        <ActionCenter className="lg:col-span-2" title={tr("To do")} items={[
          { key: "results", label: tr("Match results to validate"), count: todo.results, tone: "warn", onSelect: goQueue },
          { key: "requests", label: tr("Club requests to process"), count: todo.requests, tone: "warn", onSelect: goQueue },
          { key: "corrections", label: tr("Result corrections to review"), count: todo.corrections, tone: "warn", onSelect: goQueue },
          { key: "other", label: tr("Other items in the validation queue"), count: todo.other, onSelect: goQueue },
          { key: "engagements", label: tr("Interclub engagement lines to instruct"), count: todo.engagementLines, tone: "warn", to: "/interclub", hint: tr("Commission tab — decisions are simulated") },
          { key: "sheets", label: tr("Interclub match sheets to check"), count: todo.sheets, to: "/interclub", hint: tr("Matches tab") },
        ]} />
          } />
        </TabsContent>
        <TabsContent value="interclub" className="mt-5"><AdminInterclub icq={icq} /></TabsContent>
        <TabsContent value="reports" className="mt-5 max-w-xl">
        <section aria-labelledby="admin-exports-title" data-admin-exports className="rounded-2xl border bg-card p-4 sm:p-5"><h2 id="admin-exports-title" className="mb-1 text-base font-bold">{tr("Reports and exports")}</h2><p className="mb-3 text-xs text-muted-foreground">{tr("CSV files of the current demonstration state (fictional data, unofficial).")}</p>
          <div className="flex flex-col gap-2">{([["queue", tr("Validation queue"), () => exp("mpl2027-validation-queue.csv", csvQueue(queue))], ["audit", tr("Audit log"), () => exp("mpl2027-audit-log.csv", csvAudit(audit))], ["calendar", tr("Calendar 2027"), () => exp("mpl2027-calendar.csv", csvCalendar(CALENDAR_EVENTS))], ["engagements", tr("Interclub engagements"), () => exp("mpl2027-interclub-engagements.csv", csvEngagements(ic))]] as const).map(([k, label, fn]) => <Button key={k} type="button" variant="outline" size="sm" className="min-h-11 justify-start" onClick={fn} data-export={k}><Download className="mr-2 size-4" aria-hidden="true" />{label}</Button>)}</div></section>
        </TabsContent>

        <TabsContent value="queue" className="mt-5">{queue.length === 0 ? <p className="text-muted-foreground">{tr("Nothing to review.")}</p> : <ul className="space-y-2.5">{queue.map((q) => (
          <li key={q.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"><Badge variant="secondary" className="uppercase" data-queue-kind={q.kind}>{enumLabel(q.kind)}</Badge><div className="min-w-0 flex-1"><p className="font-semibold">{trDyn(q.title)}</p><p className="text-sm text-muted-foreground">{trDyn(q.detail)} {tr("· by")} {q.by}</p></div>
            {q.status === "pending" && q.matchRef ? <MatchQueueActions q={q} /> : q.status === "pending" && q.requestRef ? <RequestActions q={q} /> : q.status === "pending" && q.correctionRef ? <CorrectionActions q={q} /> : q.status === "pending" ? <div className="flex gap-2"><Button size="sm" onClick={() => { resolveQueue(q.id, "approved"); toast.success(tr("Approved (demo)")); }}><Check className="mr-1 size-4" />{tr("Approve")}</Button><Button size="sm" variant="outline" onClick={() => { resolveQueue(q.id, "rejected"); toast(tr("Rejected (demo)")); }}><X className="mr-1 size-4" />{tr("Reject")}</Button></div> : <Badge className={cn(q.status === "approved" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")} data-queue-status={q.status}>{enumLabel(q.status)}</Badge>}</li>))}</ul>}</TabsContent>

        <TabsContent value="overview" className="mt-5 grid gap-4 lg:grid-cols-3">
          <Card title={tr("Events per month")} cls="lg:col-span-2"><div role="img" aria-label={tr("Bar chart: number of events per month, 2027")}><ResponsiveContainer width="100%" height={240}><BarChart data={byMonth} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="m" interval={0} tickMargin={6} {...AXIS} {...(narrow ? { angle: -40, textAnchor: "end" as const, height: 48 } : {})} /><YAxis width={32} allowDecimals={false} axisLine={false} {...AXIS} /><Tooltip {...TIP} cursor={{ fill: "var(--accent)" }} /><Bar dataKey="n" fill="var(--primary)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
          <Card title={tr("By region")}><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={byZone} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={2} label={({ name, value }) => `${name} ${value}`} labelLine={false} fontSize={11}>{byZone.map((z) => <Cell key={z.name} fill={z.color} />)}</Pie><Tooltip {...TIP} /></PieChart></ResponsiveContainer></Card>
          <Card title={tr("Events per category")} cls="lg:col-span-3"><div role="img" aria-label={tr("Bar chart: number of events per category, 2027")}><ResponsiveContainer width="100%" height={220}><BarChart data={byCat} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="c" interval={0} tickMargin={6} {...AXIS} {...(narrow ? { angle: -40, textAnchor: "end" as const, height: 56 } : {})} /><YAxis width={32} allowDecimals={false} axisLine={false} {...AXIS} /><Tooltip {...TIP} cursor={{ fill: "var(--accent)" }} /><Bar dataKey="n" fill="var(--info)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-5 space-y-4"><Alert><AlertTriangle className="size-4" /><AlertTitle>{moved.length} {tr("events modified vs reference (scenario C)")}</AlertTitle><AlertDescription>{tr("Dates marked “modified” in calendar V4. The 8-week gap test between events of the same club should be re-run when a date changes.")}</AlertDescription></Alert>
          <div className="overflow-x-auto rounded-xl border"><Table><TableCaption className="sr-only">{tr("Tournament calendar control")}</TableCaption><TableHeader><TableRow><TableHead>{tr("Event")}</TableHead><TableHead>{tr("Club")}</TableHead><TableHead>{tr("Dates")}</TableHead><TableHead className="text-right">{tr("Action")}</TableHead></TableRow></TableHeader><TableBody>{moved.map((e) => (<TableRow key={e.id}><TableCell><CategoryBadge category={e.category} /> <span className="ml-1 font-mono text-xs text-muted-foreground">{e.id}</span></TableCell><TableCell>{e.clubName}</TableCell><TableCell>{fmtRange(e)}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" asChild><Link to={`/tournaments/${e.id}`}>{tr("Open")}</Link></Button></TableCell></TableRow>))}</TableBody></Table></div></TabsContent>

        <TabsContent value="rankings" className="mt-5 space-y-4"><div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border bg-card p-5"><h2 className="mb-1 flex items-center gap-2 font-semibold"><Camera className="size-4" />{tr("Ranking snapshots")}</h2><p className="mb-4 text-sm text-muted-foreground">{tr("Rule applied: rolling 12 months, best 8 results counted.")}</p><Button data-snapshot-publish disabled={!allowed("snapshot.publish")} onClick={() => { if (publishSnapshot()) toast.success(tr("Snapshot published (simulation)")); }}>{tr("Publish a new snapshot")}</Button><ul className="mt-4 space-y-1.5 text-sm">{snapshots.map((s) => <li key={s} className="flex justify-between rounded-lg border px-3 py-2"><span className="font-mono">{s}</span><Badge variant="secondary">{tr("published")}</Badge></li>)}</ul></div>
          <div className="rounded-xl border bg-card p-5"><h2 className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck className="size-4" />{tr("Points scale status")}</h2><ul className="space-y-1.5 text-sm">{[["M25 → M1000", tr("Winner points defined"), "ok"], ["M1500", tr("Scale to be confirmed"), "todo"], [tr("Mixed 250 / 500"), tr("Scale to be confirmed"), "todo"], [tr("Intermediate rounds"), tr("Placeholder scale (demo)"), "todo"]].map(([a, b, s]) => <li key={a} className="flex items-center justify-between rounded-lg border px-3 py-2"><span>{a}</span><span className={cn("text-xs font-medium", s === "ok" ? "text-success" : "text-warning")}>{b}</span></li>)}</ul></div></div></TabsContent>

        <TabsContent value="clubs" className="mt-5"><div className="overflow-x-auto rounded-xl border"><Table><TableCaption className="sr-only">{tr("Clubs")}</TableCaption><TableHeader><TableRow><TableHead>{tr("Club")}</TableHead><TableHead>{tr("Region")}</TableHead><TableHead className="text-center">{tr("Events")}</TableHead><TableHead className="text-center">{tr("Max courts")}</TableHead></TableRow></TableHeader><TableBody>{CLUBS.map((c) => <TableRow key={c.id}><TableCell><div className="flex items-center gap-2.5"><ClubAvatar club={c} size={28} /><span className="font-medium">{c.name}</span></div></TableCell><TableCell><span className="inline-flex items-center gap-1.5 text-sm"><span className="size-2 rounded-full" style={{ background: ZONES[c.zone].color }} />{ZONES[c.zone].label}</span></TableCell><TableCell className="text-center num">{c.events}</TableCell><TableCell className="text-center num">{c.courtsMax}</TableCell></TableRow>)}</TableBody></Table></div></TabsContent>

        <TabsContent value="partners" className="mt-5 space-y-4"><Alert><AlertTriangle className="size-4" /><AlertTitle>{tr("No partner is shown as a 2027 partner")}</AlertTitle><AlertDescription>{tr("These logos come from existing MPL resources. Their 2027 status must be confirmed before they appear on the public site.")}</AlertDescription></Alert>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{SPONSOR_ASSETS.map((s) => (<div key={s.id} className="rounded-xl border bg-card p-3 text-center"><div className="grid h-20 place-items-center rounded-lg bg-white p-2"><img src={s.file} alt={s.name} className="max-h-full max-w-full object-contain" /></div><p className="mt-2 text-sm font-medium">{s.name}</p><Badge variant="outline" className="mt-1 border-warning/50 text-xs text-warning">{tr("TO CONFIRM FOR 2027")}</Badge></div>))}</div></TabsContent>

        <TabsContent value="referees" className="mt-5"><RefereesTab /></TabsContent>
        <TabsContent value="permissions" className="mt-5"><PermissionsTab /></TabsContent>
        <TabsContent value="audit" className="mt-5"><div className="rounded-xl border bg-card"><div className="flex flex-wrap items-center gap-2 border-b p-4"><History className="size-4" /><h2 className="font-semibold">{tr("Audit log")}</h2><div className="ml-auto flex flex-wrap gap-1.5" role="group" aria-label={tr("Filter by actor")}>{["all", "Player", "Organizer", "Admin", "System"].map((a) => <button key={a} onClick={() => setActor(a)} aria-pressed={actor === a} className={cn("min-h-11 rounded-full border px-3 text-xs font-semibold md:min-h-9", actor === a ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}>{a === "all" ? tr("All") : trDyn(a)}</button>)}</div><span className="w-full text-xs text-muted-foreground">{tr("Saved in this browser only (demo) · simulated actions from every role appear here.")}</span></div><ul className="divide-y" aria-label={tr("Audit entries")}>{audit.filter((a) => actor === "all" || a.actor.startsWith(actor)).slice(0, 60).map((a, i) => <li key={i} data-audit-actor={a.actor} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 text-sm"><span className="font-mono text-xs text-muted-foreground">{a.at}</span><span className="font-medium">{trDyn(a.actor)}</span><span className="min-w-0 flex-1 break-words text-muted-foreground">{trDyn(a.action)}</span>{a.ref && <Link to={`/tournaments/${a.ref}`} className="inline-flex min-h-11 items-center text-xs font-medium text-primary hover:underline md:min-h-0">{a.ref}</Link>}</li>)}</ul></div></TabsContent>
      </Tabs>
    </div>
  );
}
/* 5B-1 : enumerations shown raw (result, approved...) are translated in French; English stays unchanged. */
const enumLabel = (v: string) => (CURRENT_LANG === "fr" ? tr(v.charAt(0).toUpperCase() + v.slice(1)) : v);
function Card({ title, children, cls }: { title: string; children: React.ReactNode; cls?: string }) {
  return <div className={cn("rounded-xl border bg-card p-4", cls)}><h2 className="mb-3 font-semibold">{title}</h2>{children}</div>;
}
