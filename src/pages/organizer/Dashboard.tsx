import { WorkflowNav } from "@/components/mpl/WorkflowNav";
import { ActionCenter } from "@/components/mpl/ActionCenter";
import { useMemo, useState } from "react";
import { tr, trDyn } from "@/lib/i18n";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, CheckCheck, ChevronRight, ClipboardList, Download, Gavel, Plus, Send, Shuffle, Trophy, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CategoryBadge, ClubAvatar, DemoBadge, StatCard, StatusBadge } from "@/components/mpl/bits";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { clubById } from "@/data/clubs";
import { DIVISION_LABEL, displayName, divisionsForEvent, playerById, resultsForEvent, shortLabel, type Division } from "@/data/demo";
import { allEntries, type EntryRow } from "@/lib/entries";
import { CLUBS } from "@/data/clubs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { eventStatus, fmtRange } from "@/lib/format";
import { REG_CLOSE_DAYS_BEFORE, REG_OPEN_DAYS_BEFORE } from "@/config/demo-config";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { OpsAccess, useScopedEvents } from "@/lib/ops";

const CHECK = [tr("Courts confirmed and lines marked"), tr("Referee assigned"), tr("Balls and trophies ready"), tr("Medical kit and emergency contact"), tr("Draw & order of play shared with players")];
type Filter = "all" | "open" | "completed";
function OrganizerDashboardInner() {
  const { role, setRole, org, registrations, queue, organizerClub, setOrganizerClub, validateEntries, refuseEntry, decideRegistration, publishDraw, saveScore, addQueue } = useDemo();
  const scopedAll = useScopedEvents(); const club = clubById(organizerClub)!; const mine = useMemo(() => scopedAll, [scopedAll]);
  const ctx = useMemo(() => ({ registrations, org }), [registrations, org]);
  const firstId = () => mine.find((e) => registrations.some((r) => r.eventId === e.id && r.status === "pending"))?.id ?? mine.find((e) => eventStatus(e) === "open")?.id ?? mine[0].id;
  const [selRaw, setSelId] = useState<string>(""); const selId = mine.some((e) => e.id === selRaw) ? selRaw : firstId();
  const [showDetail, setShowDetail] = useState(false); const [filter, setFilter] = useState<Filter>("all"); const [divRaw, setDiv] = useState<Division | "">("");
  const [checks, setChecks] = useState<Record<string, boolean>>({}); const [scoreOpen, setScoreOpen] = useState(false); const [reqOpen, setReqOpen] = useState(false); const [refuse, setRefuse] = useState<EntryRow | null>(null);
  const ev = mine.find((e) => e.id === selId)!; const st = eventStatus(ev); const divisions = divisionsForEvent(ev); const division: Division = (divRaw && divisions.includes(divRaw) ? divRaw : divisions[0]);
  const entries = allEntries(ev, division, ctx); const pending = entries.filter((p) => p.status === "pending" || p.status === "waitlist");
  const pendingFor = (id: string) => registrations.filter((r) => r.eventId === id && r.status === "pending").length;
  // 5B-3 : décisions en attente = mêmes entrées que le badge « Entries » (inscriptions réelles de la démo + paires fictives), toutes divisions
  const awaiting = useMemo(() => mine.map((e) => ({ id: e.id, n: divisionsForEvent(e).reduce((t, d) => t + allEntries(e, d, ctx).filter((p) => p.status === "pending" || p.status === "waitlist").length, 0) })), [mine, ctx]);
  const awaitingTotal = awaiting.reduce((t, x) => t + x.n, 0); const awaitingFirst = awaiting.find((x) => x.n > 0)?.id;
  const totalPending = mine.reduce((s, e) => s + pendingFor(e.id), 0);
  const list = mine.filter((e) => filter === "all" || (filter === "open" ? ["open", "closed", "live"].includes(eventStatus(e)) : eventStatus(e) === "completed"));
  const label = (p: EntryRow) => `${ev.id} · ${DIVISION_LABEL[division]} · ${displayName(p.a)} / ${displayName(p.b)}`;
  const approve = (p: EntryRow) => { if (p.regId) decideRegistration(p.regId, "confirmed", label(p)); else validateEntries([p.key], ev.id, label(p)); toast.success(tr("Entry approved")); };
  const approveAll = () => { const fic = pending.filter((p) => !p.regId).map((p) => p.key); pending.filter((p) => p.regId).forEach((p) => decideRegistration(p.regId!, "confirmed", label(p))); if (fic.length) validateEntries(fic, ev.id, `${ev.id} · ${DIVISION_LABEL[division]} (batch)`); toast.success(`${pending.length} ${tr("entries approved (demo)")}`); };
  const exportEntries = () => { const body = [["team", "status", "source"], ...entries.map((p) => [`${displayName(p.a)} / ${displayName(p.b)}`, p.status, p.source])]; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body.map((r) => r.join(",")).join("\n")], { type: "text/csv" })); a.download = `${ev.id}-entries-demo.csv`; a.click(); toast.success(tr("Entries exported")); };
  const canDraw = st === "closed" || st === "live"; const open = (id: string) => { setSelId(id); setDiv(""); setShowDetail(true); window.scrollTo({ top: 0 }); };
  return (
    <div className="container-mpl py-6 sm:py-8">
      <WorkflowNav />
      <div className={cn("mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5", showDetail && "hidden lg:flex")}><ClubAvatar club={club} size={52} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold sm:text-3xl">{club.name}</h1><DemoBadge label={tr("DEMO ORGANIZER")} /></div><p className="text-sm text-muted-foreground">{tr("Organizer space ·")} {mine.length} {tr("MPL events in 2027")}</p></div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto"><Select value={club.id} onValueChange={setOrganizerClub}><SelectTrigger aria-label={tr("Demo: act as club")} className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent>{CLUBS.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><Button onClick={() => setReqOpen(true)}><Plus className="mr-1.5 size-4" />{tr("Request a change")}</Button></div></div>
      <div className={cn("mb-6", showDetail && "hidden lg:block")}><ActionCenter title={tr("To do")} items={[
        { key: "entries", label: tr("Entries awaiting a decision"), count: awaitingTotal, tone: "warn", hint: tr("Pending validation or waiting list, all divisions"), to: `/organizer/registrations?event=${encodeURIComponent(awaitingFirst ?? selId)}` },
        { key: "draws", label: tr("Draws ready to publish"), count: mine.filter((e) => (eventStatus(e) === "closed" || eventStatus(e) === "live") && !org.drawPublished.includes(e.id)).length, to: `/organizer/draws?event=${encodeURIComponent(mine.find((e) => (eventStatus(e) === "closed" || eventStatus(e) === "live") && !org.drawPublished.includes(e.id))?.id ?? selId)}`, hint: tr("Registration closed — preview only (simulation)") },
        { key: "scores", label: tr("Live events: scores to enter"), count: mine.filter((e) => eventStatus(e) === "live").length, to: `/organizer/scores?event=${encodeURIComponent(mine.find((e) => eventStatus(e) === "live")?.id ?? selId)}` },
      ]} /></div>
      <div className={cn("mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4", showDetail && "hidden lg:grid")}><StatCard label={tr("My events")} value={mine.length} icon={<Trophy className="size-4" />} /><StatCard label={tr("Open for registration")} value={mine.filter((e) => eventStatus(e) === "open").length} tone="good" /><StatCard label={tr("Player registrations to review")} value={totalPending} hint={tr("Entered by players in this demo. The “To do” block also counts fictional pairs.")} tone={totalPending ? "warn" : "default"} icon={<Users className="size-4" />} /><StatCard label={tr("Completed")} value={mine.filter((e) => eventStatus(e) === "completed").length} icon={<CheckCheck className="size-4" />} /></div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className={cn(showDetail && "hidden lg:block")} data-panel="list"><div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{tr("My events")}</h2>
          <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as Filter)} variant="outline" size="sm" aria-label={tr("Filter events")}><ToggleGroupItem value="all" className="min-w-11">{tr("All")}</ToggleGroupItem><ToggleGroupItem value="open">{tr("Active")}</ToggleGroupItem><ToggleGroupItem value="completed">{tr("Done")}</ToggleGroupItem></ToggleGroup></div>
          <ul className="space-y-2 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">{list.map((e) => { const n = pendingFor(e.id); return (<li key={e.id}><button onClick={() => open(e.id)} aria-pressed={selId === e.id} aria-label={`${e.category} ${fmtRange(e)}`} className={cn("flex min-h-14 w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition hover:border-primary/60", selId === e.id && "border-primary bg-accent/40")}><CategoryBadge category={e.category} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{fmtRange(e)}</p><p className="break-words text-xs text-muted-foreground">{e.format.replace(" / ", " · ")}</p></div>{n > 0 && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">{n} {tr("to review")}</span>}<StatusBadge status={eventStatus(e)} /><ChevronRight className="size-4 text-muted-foreground lg:hidden" /></button></li>); })}{list.length === 0 && <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{tr("No event in this filter.")}</li>}</ul></div>
        <div className={cn("min-w-0 rounded-2xl border bg-card p-4 sm:p-5", !showDetail && "hidden lg:block")} data-panel="detail">
          <Button variant="ghost" size="sm" className="-ml-2 mb-2 lg:hidden" onClick={() => setShowDetail(false)}><ArrowLeft className="mr-1.5 size-4" />{tr("All events")}</Button>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">{ev.category} · {fmtRange(ev)}</h2><p className="text-sm text-muted-foreground">{ev.courts} {tr("courts ·")} {ev.id} · <StatusBadge status={st} /></p></div><Button asChild variant="outline" size="sm"><Link to={`/tournaments/${ev.id}`}>{tr("Public page")}</Link></Button></div>
          <Tabs defaultValue="entries"><TabsList className="no-scrollbar h-12 w-full justify-start overflow-x-auto"><TabsTrigger value="entries">{tr("Entries")}{pending.length > 0 && <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 text-xs text-warning">{pending.length}</span>}</TabsTrigger><TabsTrigger value="draw">{tr("Draw")}</TabsTrigger><TabsTrigger value="scores">{tr("Scores")}</TabsTrigger><TabsTrigger value="checklist">{tr("Checklist")}</TabsTrigger></TabsList>
            <TabsContent value="entries" className="mt-4">
              {divisions.length > 1 && <div className="mb-3 inline-flex flex-wrap rounded-lg border p-0.5" role="group" aria-label={tr("Draw")}>{divisions.map((d) => <button key={d} onClick={() => setDiv(d)} aria-pressed={division === d} className={cn("min-h-11 rounded-md px-4 text-sm font-medium transition md:min-h-9", division === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{DIVISION_LABEL[d]}</button>)}</div>}
              <div className="mb-3 flex flex-wrap gap-2"><Button size="sm" disabled={pending.length === 0} onClick={approveAll}><CheckCheck className="mr-1.5 size-4" />{tr("Approve all (")}{pending.length})</Button><Button size="sm" variant="outline" onClick={exportEntries} disabled={!entries.length}><Download className="mr-1.5 size-4" />{tr("Export CSV")}</Button><Button asChild size="sm" variant="secondary"><Link to={`/organizer/registrations?event=${ev.id}&division=${division}`} data-manage-registrations><ClipboardList className="mr-1.5 size-4" />{tr("Manage registrations")}</Link></Button><Button asChild size="sm" variant="secondary"><Link to={`/organizer/draws?event=${ev.id}&division=${division}`} data-open-draws><Trophy className="mr-1.5 size-4" />{tr("Draws & schedule")}</Link></Button><Button asChild size="sm" variant="secondary"><Link to={`/organizer/scores?event=${ev.id}&division=${division}`} data-open-scores><ClipboardList className="mr-1.5 size-4" />{tr("Scores")}</Link></Button></div>
              {entries.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{tr("No entries yet — registrations open")} {REG_OPEN_DAYS_BEFORE} {tr("days before the event.")}</div> : <ul className="divide-y rounded-xl border" aria-label={tr("Entries")}>{entries.map((p) => { const ok = p.status === "confirmed"; const rej = p.status === "rejected"; return (
                <li key={p.key} data-entry-source={p.source} data-entry-status={p.status} className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 p-3", p.source === "demo" && "bg-accent/30")}>
                  <div className="min-w-0 flex-1"><p className="font-medium">{displayName(p.a)} / {displayName(p.b)}{p.source === "demo" && <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">{tr("Demo registration")} {p.regId}</span>}</p></div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ok ? "bg-success/15 text-success" : rej ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning")}>{ok ? tr("Confirmed") : rej ? tr("Refused") : p.status === "waitlist" ? tr("Waiting list") : tr("Pending")}</span>
                  {!ok && !rej && <div className="flex gap-2"><Button size="sm" onClick={() => approve(p)} aria-label={trDyn(`Approve ${displayName(p.a)} / ${displayName(p.b)}`)}><Check className="mr-1 size-4" />{tr("Approve")}</Button><Button size="sm" variant="outline" onClick={() => setRefuse(p)} aria-label={trDyn(`Refuse ${displayName(p.a)} / ${displayName(p.b)}`)}><X className="mr-1 size-4" />{tr("Refuse")}</Button></div>}
                </li>); })}</ul>}
            </TabsContent>
            <TabsContent value="draw" className="mt-4 space-y-3">
              <Alert><Gavel className="size-4" /><AlertTitle>{tr("Draw — simulation only")}</AlertTitle><AlertDescription>{tr("The regulatory draw engine is")} <strong>{tr("not operational")}</strong> {tr("in this prototype. The button below only publishes an illustrative seeded preview.")}</AlertDescription></Alert>
              <div className="flex flex-wrap gap-2"><Button disabled={!canDraw || org.drawPublished.includes(ev.id)} onClick={() => { publishDraw(ev.id); toast.success(tr("Draw preview published (simulation)")); }}><Shuffle className="mr-1.5 size-4" />{org.drawPublished.includes(ev.id) ? tr("Preview published") : tr("Publish draw preview")}</Button></div>
              {!canDraw && <p className="text-xs text-muted-foreground">{tr("Available once registration is closed (J-")}{REG_CLOSE_DAYS_BEFORE}).</p>}
            </TabsContent>
            <TabsContent value="scores" className="mt-4">
              {st === "completed" || st === "live" ? <div><Button onClick={() => setScoreOpen(true)}><ClipboardList className="mr-1.5 size-4" />{tr("Enter scores")}</Button>{Object.keys(org.scores).filter((k) => k.startsWith(ev.id + "|")).length > 0 && <ul className="mt-3 space-y-1.5 text-sm">{Object.entries(org.scores).filter(([k]) => k.startsWith(ev.id + "|")).map(([k, v]) => { const q = queue.find((x) => x.id === v.queueId)?.status ?? "pending"; return <li key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"><span className="text-muted-foreground">{k.split("|")[1]}</span><span className="flex items-center gap-2"><span className="font-mono font-semibold">{v.value}</span><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{q === "approved" ? "validated" : q === "rejected" ? "rejected" : "sent to admin"}</span></span></li>; })}</ul>}</div> : <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{tr("Scores can be entered once the event has started.")}</div>}
            </TabsContent>
            <TabsContent value="checklist" className="mt-4"><ul className="space-y-2">{CHECK.map((c) => (<li key={c}><Label htmlFor={c} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 font-normal"><Checkbox id={c} checked={!!checks[ev.id + c]} onCheckedChange={(v) => setChecks({ ...checks, [ev.id + c]: v === true })} />{c}</Label></li>))}</ul><p className="mt-2 text-xs text-muted-foreground num">{CHECK.filter((c) => checks[ev.id + c]).length}/{CHECK.length} {tr("done (local to this session)")}</p></TabsContent>
          </Tabs>
        </div>
      </div>
      <ScoreDialog open={scoreOpen} onOpenChange={setScoreOpen} evId={ev.id} onSave={(k, v, l) => { saveScore(k, v, ev.id, l); }} />
      <RefuseDialog entry={refuse} onClose={() => setRefuse(null)} onConfirm={(reason) => { if (!refuse) return; if (refuse.regId) decideRegistration(refuse.regId, "rejected", label(refuse), reason || undefined); else refuseEntry(refuse.key, ev.id, label(refuse)); toast(tr("Entry refused (demo)")); setRefuse(null); }} />
      <RequestDialog open={reqOpen} onOpenChange={setReqOpen} club={club.name} onSend={(t, d) => { addQueue({ kind: "calendar", title: t, detail: d, by: club.name }); toast.success(tr("Request sent to MPL admin (demo)")); }} />
    </div>
  );
}
function RefuseDialog({ entry, onClose, onConfirm }: { entry: EntryRow | null; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (<Dialog open={!!entry} onOpenChange={(o) => { if (!o) { onClose(); setReason(""); } }}><DialogContent><DialogHeader><DialogTitle>{tr("Refuse this entry?")}</DialogTitle><DialogDescription>{entry ? `${displayName(entry.a)} / ${displayName(entry.b)}` : ""} {tr("— the player sees the new status in their space (demo).")}</DialogDescription></DialogHeader>
    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr("Reason (optional)")} rows={3} aria-label={tr("Reason")} />
    <DialogFooter><Button variant="ghost" onClick={onClose}>{tr("Cancel")}</Button><Button variant="destructive" onClick={() => { onConfirm(reason.trim()); setReason(""); }}>{tr("Refuse entry")}</Button></DialogFooter></DialogContent></Dialog>);
}
function ScoreDialog({ open, onOpenChange, evId, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; evId: string; onSave: (k: string, v: string, label: string) => void }) {
  const res = resultsForEvent(evId)[0]; const pairs = res ? res.placements.slice(0, 4).map((p) => p.pair.map((x) => { const pl = playerById(x); return pl ? shortLabel(pl) : ""; }).join(" / ")) : ["Team A / Team B", "Team C / Team D"];
  const [match, setMatch] = useState("0"); const [sets, setSets] = useState(["", "", ""]); const err = sets[0] && !/^\d{1,2}-\d{1,2}$/.test(sets[0]);
  const save = () => { if (!sets[0] || err) return toast.error(tr("Enter set 1 as e.g. 6-3")); onSave(`${evId}|${pairs[+match]}`, sets.filter(Boolean).join(" "), `${evId} · ${pairs[+match]}`); toast.success(tr("Score saved — sent to the MPL admin validation queue (demo)")); setSets(["", "", ""]); onOpenChange(false); };
  return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{tr("Enter a match score")}</DialogTitle><DialogDescription>{tr("The score is saved in this prototype, shown on the public tournament page and sent to the MPL admin validation queue. Rankings are not recalculated. (Demo)")}</DialogDescription></DialogHeader>
    <div className="space-y-3"><div><Label htmlFor="score-match" className="mb-1.5 block">{tr("Match")}</Label><Select value={match} onValueChange={setMatch}><SelectTrigger id="score-match"><SelectValue /></SelectTrigger><SelectContent>{pairs.map((p, i) => <SelectItem key={i} value={String(i)}>{p}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid grid-cols-3 gap-2">{sets.map((s, i) => <div key={i}><Label htmlFor={"s" + i} className="mb-1.5 block text-xs">{tr("Set")} {i + 1}</Label><Input id={"s" + i} value={s} placeholder="6-4" aria-invalid={i === 0 && !!err} aria-describedby={i === 0 && err ? "set-err" : undefined} onChange={(e) => setSets(sets.map((x, j) => (j === i ? e.target.value : x)))} /></div>)}</div>{err && <p id="set-err" role="alert" className="text-xs text-destructive">{tr("Use the format 6-3.")}</p>}</div>
    <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>{tr("Cancel")}</Button><Button onClick={save}><Send className="mr-1.5 size-4" />{tr("Save score")}</Button></DialogFooter></DialogContent></Dialog>);
}
function RequestDialog({ open, onOpenChange, club, onSend }: { open: boolean; onOpenChange: (o: boolean) => void; club: string; onSend: (t: string, d: string) => void }) {
  const [type, setType] = useState("date"); const [note, setNote] = useState("");
  const send = () => { if (note.trim().length < 10) return toast.error(tr("Please describe your request (10 characters min.)")); onSend(`Request (${type}) — ${club}`, note); setNote(""); onOpenChange(false); };
  return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{tr("Request a change")}</DialogTitle><DialogDescription>{tr("Sent to MPL administration for approval. (Demo)")}</DialogDescription></DialogHeader>
    <div className="space-y-3"><Select value={type} onValueChange={setType}><SelectTrigger aria-label={tr("Request type")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="date">{tr("Date change")}</SelectItem><SelectItem value="courts">{tr("Number of courts")}</SelectItem><SelectItem value="category">{tr("Category / format")}</SelectItem></SelectContent></Select><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("Explain what you need and why…")} rows={4} aria-label={tr("Details")} /></div>
    <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>{tr("Cancel")}</Button><Button onClick={send}>{tr("Send request")}</Button></DialogFooter></DialogContent></Dialog>);
}

export default function OrganizerDashboard() { return <OpsAccess noReferee><OrganizerDashboardInner /></OpsAccess>; }
