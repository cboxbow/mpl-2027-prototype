import { WorkflowNav } from "@/components/mpl/WorkflowNav";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Lock, AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CalendarClock, CheckCircle2, ClipboardList, Eye, Gavel, LayoutGrid, Radio, Send, Shuffle, Trash2, Wand2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClubAvatar, DemoBadge, StatCard } from "@/components/mpl/bits";
import { BracketView, GroupsView, MatchCard, MatchGrid, MatchStatus } from "@/components/mpl/BracketView";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { clubById } from "@/data/clubs";
import { DIVISION_LABEL, displayName, divisionsForEvent, type Division } from "@/data/demo";
import { DEMO_TODAY, MATCH_DURATION_MIN, REASON_MIN_LENGTH, SEEDS_BY_SIZE } from "@/config/demo-config";
import { Input } from "@/components/ui/input";
import { DrawHistory } from "@/components/mpl/DrawHistory";
import { autoSchedule, stageOf, defaultSize, groupCount, scheduleConflicts, sizeOptions, slotTimes, type Conflict, type DrawFormat, type Placement } from "@/lib/bracket";
import { confirmedPairs, drawView, matchLabel, roundLabel, teamName, teamPlayers, type DrawView } from "@/lib/draws";
import { drawKey, matchKey } from "@/lib/demo-state";
import { useDemo } from "@/lib/demo-store";
import { eventStatus, fmtDate, fmtRange } from "@/lib/format";
import { tr, trDyn } from "@/lib/i18n";
import { registrationState } from "@/lib/registration";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { OpsAccess, useScopedEvents } from "@/lib/ops";

const SELECT_CLS = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm md:h-10";
const CONFLICT_TEXT: Record<Conflict["kind"], string> = { court: tr("Court already used at this time"), team: tr("A pair of this match plays too close to another match"), order: tr("The match is scheduled before the end of a previous match"), hours: tr("Outside the playing hours"), day: tr("Outside the event dates") };
/** Écran 11 — Gestion des tableaux et programmation (organisateur) : têtes de série, tableau/poules, qualifications, classement, terrains, horaires, planning, publication. ILLUSTRATIF. */
function OrganizerDrawsInner() {
  const store = useDemo(); const { archives, allowed, org, registrations, draws, matches, corrections, saveDraw, publishBracket, deleteDraw, scheduleMatches, setDrawStage, requestCorrection } = store; const [corrOpen, setCorrOpen] = useState(false); const [corrReason, setCorrReason] = useState("");
  const [sp, setSp] = useSearchParams(); const scopedAll = useScopedEvents(); const club = clubById(store.organizerClub)!;
  const mine = useMemo(() => scopedAll.filter((e) => ["open", "closed", "live"].includes(eventStatus(e))), [scopedAll]);
  const ctx = useMemo(() => ({ registrations, org }), [registrations, org]);
  const withDraw = mine.find((e) => Object.keys(draws).some((k) => k.startsWith(e.id + "|")))?.id;
  const ev = mine.find((e) => e.id === sp.get("event")) ?? mine.find((e) => e.id === withDraw) ?? mine.find((e) => eventStatus(e) === "open") ?? mine[0];
  const divisions = ev ? divisionsForEvent(ev) : []; const qd = sp.get("division") as Division | null; const division: Division = qd && divisions.includes(qd) ? qd : divisions[0];
  const [tab, setTab] = useState("pairs"); const [format, setFormat] = useState<DrawFormat>("knockout"); const [sizeRaw, setSize] = useState<number | null>(null); const [placement, setPlacement] = useState<Placement>("third");
  const [order, setOrder] = useState<string[] | null>(null); const [selId, setSel] = useState<string | null>(null); const [confirmGen, setConfirmGen] = useState<null | "new" | "apply">(null); const [schedView, setSchedView] = useState<"court" | "time">("court"); const [day, setDay] = useState<string>(""); const [livef, setLivef] = useState<"all" | "live" | "pending" | "done">("all");
  const sv = useMemo(() => ({ draws, matches, registrations, org }), [draws, matches, registrations, org]);
  const pairs = useMemo(() => (ev ? confirmedPairs(ev, division, ctx) : []), [ev, division, ctx]);
  const view = useMemo(() => (ev ? drawView(sv, ev, division) : null), [sv, ev, division]);
  if (!ev) return <div className="container-mpl py-10 text-center text-muted-foreground">{tr("No open event for this club.")}</div>;
  const stage = view ? stageOf(view.cfg) : null; const frozen = !!view && (stage === "published" || stage === "locked") && !view.cfg.grant;
  const canEdit = allowed("draw.edit", { eventId: ev.id }) && !frozen; const canPub = allowed("draw.publish", { eventId: ev.id }); const canLock = allowed("draw.lock", { eventId: ev.id }); const canSched = allowed("schedule.edit", { eventId: ev.id }); const canCorr = allowed("correction.request", { eventId: ev.id });
  const myCorr = corrections.filter((c) => c.eventId === ev.id && c.division === division); const pendingCorr = myCorr.find((c) => c.status === "pending");
  const nArch = archives.filter((x) => x.eventId === ev.id && x.division === division).length;
  const nameOf = new Map(pairs.map((p) => [p.key, `${displayName(p.a)} / ${displayName(p.b)}`]));
  const keys = pairs.map((p) => p.key); const base = view?.cfg.seeds.filter((k) => keys.includes(k)) ?? []; const cur = order ?? (view ? [...base, ...keys.filter((k) => !base.includes(k))] : keys);
  const eff = [...cur.filter((k) => keys.includes(k)), ...keys.filter((k) => !cur.includes(k))];
  const size = sizeRaw ?? view?.cfg.size ?? defaultSize(pairs.length); const opts = sizeOptions(pairs.length); const opt = opts.find((o) => o.size === size); const seedN = format === "groups" ? Math.min(groupCount(size), pairs.length) : SEEDS_BY_SIZE[size] ?? 2;
  const regState = registrationState(ev, ctx); const label = `${ev.id} · ${DIVISION_LABEL[division]}`;
  const setParams = (e: string, d?: string) => { const n = new URLSearchParams(); n.set("event", e); if (d) n.set("division", d); setSp(n, { replace: true }); setOrder(null); setSizeRawNull(); setSel(null); };
  const setSizeRawNull = () => setSize(null);
  const played = view ? [...view.resolved.values()].some((r) => r.st?.result || r.st?.proposal || r.st?.live) : false;
  const generate = (fresh: boolean) => {
    if (opt && !opt.ok && format === "knockout") return toast.error(tr("This draw size cannot hold all the pairs."));
    if (format === "groups" && pairs.length < groupCount(size) * 2) return toast.error(tr("Not enough pairs for this number of groups."));
    saveDraw({ eventId: ev.id, division, format, size, placement, seeds: eff, entries: keys, nonce: fresh ? (view?.cfg.nonce ?? 0) + 1 : view?.cfg.nonce ?? 1, createdAt: DEMO_TODAY, provisional: regState === "open" }, `${label} — ${format === "groups" ? tr("groups") : tr("knockout")} ${size}`);
    setConfirmGen(null); setTab("draw"); toast.success(tr("Draw generated (illustrative)"));
  };
  const askGenerate = (k: "new" | "apply") => (view && played ? setConfirmGen(k) : generate(k === "new"));
  const move = (i: number, d: -1 | 1) => { const a = [...eff]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setOrder(a); };
  const publish = () => { if (!view) return; const notify = view.cfg.entries.flatMap((k) => teamPlayers(view, k)).map((playerId) => ({ playerId, text: `Draw published for ${ev.id} (illustrative): see the Draw tab.` })); publishBracket(drawKey(ev.id, division), label, notify); toast.success(tr("Draw published (illustrative)")); };
  const sel = view && selId ? view.resolved.get(selId) : null;
  const playable = view ? [...view.resolved.values()].filter((r) => !r.bye) : [];
  const days = view?.days ?? []; const dayShown = day && days.includes(day) ? day : days[0];
  const conflicts = view ? scheduleConflicts(view.built, view.resolved, view.sched, view.days) : [];
  const unscheduled = playable.filter((r) => !(r.st?.day && r.st?.time && r.st.court != null) && !r.st?.result);
  const scheduled = playable.filter((r) => r.st?.day && r.st?.time && r.st.court != null).sort((x, y) => (x.st!.day! + x.st!.time!).localeCompare(y.st!.day! + y.st!.time!) || x.st!.court! - y.st!.court!);
  const doAuto = () => { if (!view) return; const plan = autoSchedule(view.built, view.resolved, ev.courts, view.days, view.sched); const items = Object.entries(plan).filter(([id, s]) => { const c = view.sched(id); return c.court !== s.court || c.day !== s.day || c.time !== s.time; }).map(([id, s]) => ({ key: matchKey(ev.id, division, id), ...s })); if (!items.length) return toast(tr("Nothing to schedule")); scheduleMatches(ev.id, items, label); toast.success(`${items.length} ${tr("matches scheduled")}`); };
  const doClear = () => { if (!view) return; const items = scheduled.filter((r) => !r.st?.result && !r.st?.proposal && !r.st?.live).map((r) => ({ key: matchKey(ev.id, division, r.id) })); if (!items.length) return; scheduleMatches(ev.id, items, label); toast(tr("Schedule cleared")); };
  const nLive = playable.filter((r) => r.status === "live").length, nPend = playable.filter((r) => r.status === "pending").length, nDone = playable.filter((r) => r.status === "done").length;
  const ids = (k: string) => (view ? view.built.matches.filter((m) => m.kind === k).map((m) => m.id) : []);
  const liveRows = playable.filter((r) => (livef === "all" ? ["live", "pending", "done"].includes(r.status) : r.status === livef));
  return (
    <div className="container-mpl py-6 sm:py-8" data-organizer-draws>
      <WorkflowNav />
      <Link to="/organizer" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:min-h-0"><ArrowLeft className="size-4" />{tr("Organizer space")}</Link>
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5"><ClubAvatar club={clubById(ev.club) ?? club} size={48} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold sm:text-3xl">{tr("Draws and schedule")}</h1><DemoBadge label={tr("ILLUSTRATIVE DRAW")} /></div><p className="text-sm text-muted-foreground">{(clubById(ev.club) ?? club).name} · {ev.category} · {fmtRange(ev)} · {ev.courts} {tr("courts")}</p></div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,260px)_auto]"><Select value={ev.id} onValueChange={(v) => setParams(v)}><SelectTrigger aria-label={tr("Event")}><SelectValue /></SelectTrigger><SelectContent>{mine.map((e) => <SelectItem key={e.id} value={e.id}>{e.category.replace("MIXTE ", tr("Mixed "))} · {fmtRange(e)} · {e.id}</SelectItem>)}</SelectContent></Select>
          <Button asChild variant="outline" className="min-h-11 md:min-h-9"><Link to={`/tournaments/${ev.id}`}><Eye className="mr-1.5 size-4" />{tr("Public page")}</Link></Button></div></div>
      {divisions.length > 1 && <div className="mb-4 inline-flex flex-wrap rounded-lg border p-0.5" role="group" aria-label={tr("Draw")}>{divisions.map((d) => <button key={d} onClick={() => setParams(ev.id, d)} aria-pressed={division === d} className={cn("min-h-11 rounded-md px-4 text-sm font-medium transition md:min-h-9", division === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{DIVISION_LABEL[d]}</button>)}</div>}
      <Alert className="mb-4 border-warning/50" data-illustrative-note><Gavel className="size-4" /><AlertTitle>{tr("Illustrative draw — not the official engine")}</AlertTitle><AlertDescription>{tr("Seed placement and draw are a deterministic simulation. The regulatory MPL draw engine and rules are developed later; nothing here is an official result.")}</AlertDescription></Alert>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5" data-draw-stats><StatCard label={tr("Confirmed pairs")} value={pairs.length} icon={<ClipboardList className="size-4" />} /><StatCard label={tr("Draw")} value={view ? `${view.cfg.format === "groups" ? tr("Groups") : tr("Knockout")} ${view.cfg.size}` : "—"} hint={view ? (view.cfg.published ? tr("Published (demo)") : tr("Not published")) : tr("Not generated")} tone={view?.cfg.published ? "good" : "default"} icon={<LayoutGrid className="size-4" />} /><StatCard label={tr("Scheduled")} value={`${scheduled.length}/${playable.length}`} icon={<CalendarClock className="size-4" />} /><StatCard label={tr("Live")} value={nLive} tone={nLive ? "warn" : "default"} icon={<Radio className="size-4" />} /><StatCard label={tr("Completed")} value={`${nDone}/${playable.length}`} tone={nDone ? "good" : "default"} icon={<CheckCircle2 className="size-4" />} /></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="no-scrollbar h-12 w-full justify-start overflow-x-auto"><TabsTrigger value="pairs">{tr("Pairs & seeds")}</TabsTrigger><TabsTrigger value="draw">{tr("Draw")}</TabsTrigger><TabsTrigger value="schedule">{tr("Schedule")}{conflicts.length > 0 && <span className="ml-1.5 rounded-full bg-destructive/15 px-1.5 text-xs text-destructive">{conflicts.length}</span>}</TabsTrigger><TabsTrigger value="live">{tr("Live & results")}</TabsTrigger><TabsTrigger value="history" data-tab-history>{tr("Version history")}{nArch > 0 && <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 text-xs">{nArch}</span>}</TabsTrigger></TabsList>

        <TabsContent value="pairs" className="mt-4 space-y-4">
          {regState === "open" && <Alert data-provisional-note><AlertTriangle className="size-4" /><AlertTitle>{tr("Registrations are still open")}</AlertTitle><AlertDescription>{tr("The draw is a provisional preview and can be regenerated (demo). Only confirmed pairs are drawn.")} <Link to={`/organizer/registrations?event=${ev.id}&division=${division}`} className="inline-flex min-h-11 items-center underline md:min-h-8">{tr("Manage registrations")}</Link></AlertDescription></Alert>}
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <section aria-labelledby="seeds-h"><h2 id="seeds-h" className="mb-2 font-semibold">{tr("Confirmed pairs")} <span className="num text-muted-foreground">({pairs.length})</span></h2>
              {pairs.length < 2 ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground" data-no-pairs>{tr("At least 2 confirmed pairs are needed.")}</p> :
                <ol className="divide-y rounded-xl border" data-seed-list aria-label={tr("Confirmed pairs")}>{eff.map((k, i) => { const p = pairs.find((x) => x.key === k)!; const seeded = i < seedN; return (
                  <li key={k} data-pair-key={k} data-seed-rank={i + 1} className={cn("flex items-center gap-2 p-2.5 sm:gap-3 sm:p-3", seeded && "bg-accent/30")}>
                    <span className="grid size-7 shrink-0 place-items-center rounded bg-secondary text-xs font-bold num">{i + 1}</span>
                    <div className="min-w-0 flex-1"><p className="break-words font-medium">{nameOf.get(k)}{p.source === "demo" && <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-success">{tr("Demo registration")}</span>}</p><p className="text-xs text-muted-foreground">{clubById(p.a.clubId)?.name} · {clubById(p.b.clubId)?.name}</p></div>
                    {seeded && <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success" data-seed-badge>{tr("Seed")} {i + 1}</span>}
                    <div className="flex shrink-0"><Button variant="ghost" size="icon" className="size-11 md:size-9" disabled={i === 0 || !canEdit} onClick={() => move(i, -1)} aria-label={trDyn(`Move up ${nameOf.get(k)}`)}><ArrowUp className="size-4" /></Button><Button variant="ghost" size="icon" className="size-11 md:size-9" disabled={i === eff.length - 1 || !canEdit} onClick={() => move(i, 1)} aria-label={trDyn(`Move down ${nameOf.get(k)}`)}><ArrowDown className="size-4" /></Button></div>
                  </li>); })}</ol>}
              <p className="mt-2 text-xs text-muted-foreground">{tr("Default order = sum of the two players' ranking points (demo). Move pairs to change the seeds.")}</p></section>
            <aside className="space-y-4 rounded-xl border bg-card p-4 lg:self-start" aria-label={tr("Draw settings")}>
              <div><Label className="mb-1.5 block text-sm font-semibold">{tr("Format")}</Label><div className="inline-flex flex-wrap rounded-lg border p-0.5" role="group" aria-label={tr("Format")}>{([["knockout", tr("Knockout")], ["groups", tr("Groups + final phase")]] as const).map(([k, l]) => <button key={k} type="button" data-format={k} aria-pressed={format === k} onClick={() => setFormat(k)} className={cn("min-h-11 rounded-md px-3 text-sm font-medium md:min-h-9", format === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{l}</button>)}</div></div>
              <div><Label className="mb-1.5 block text-sm font-semibold">{tr("Draw size")}</Label><div className="flex flex-wrap gap-2" role="group" aria-label={tr("Draw size")}>{opts.map((o) => <button key={o.size} type="button" data-size={o.size} disabled={!o.ok && format === "knockout"} aria-pressed={size === o.size} onClick={() => setSize(o.size)} className={cn("min-h-11 min-w-14 rounded-md border px-3 text-sm font-semibold num disabled:opacity-60 md:min-h-9", size === o.size ? "border-primary bg-primary/15" : "text-muted-foreground")}>{o.size}</button>)}</div>
                <p className="mt-1.5 text-xs text-muted-foreground" data-size-hint>{format === "groups" ? `${groupCount(size)} ${tr("groups")} · ${tr("top 2 qualify")} · ${groupCount(size) * 2} ${tr("in the final phase")}` : !opt?.ok ? tr("This draw size cannot hold all the pairs.") : opt.qualifiers > 0 ? `${opt.qualifiers} ${tr("qualifying matches")}` : opt.byes > 0 ? `${opt.byes} ${tr("BYE")}` : tr("Full draw")} · {seedN} {tr("seeds")}</p></div>
              <div><Label className="mb-1.5 block text-sm font-semibold">{tr("Placement matches")}</Label><div className="flex flex-wrap gap-2" role="group" aria-label={tr("Placement matches")}>{([["none", tr("None")], ["third", tr("3rd place")], ["classification", tr("5–8 classification")]] as const).map(([k, l]) => <button key={k} type="button" data-placement={k} aria-pressed={placement === k} onClick={() => setPlacement(k)} className={cn("min-h-11 rounded-md border px-3 text-sm md:min-h-9", placement === k ? "border-primary bg-primary/15 font-semibold" : "text-muted-foreground")}>{l}</button>)}</div></div>
              {!allowed("draw.edit", { eventId: ev.id }) && <p className="text-xs text-muted-foreground" data-readonly-draw>{tr("Your role cannot edit draws (read-only).")}</p>}
              <div className="flex flex-col gap-2">
                <Button className="min-h-11 md:min-h-9" disabled={pairs.length < 2 || !canEdit} onClick={() => askGenerate(view ? "apply" : "new")} data-generate-draw><Shuffle className="mr-1.5 size-4" />{view ? tr("Apply seeds & settings") : tr("Generate draw (illustrative)")}</Button>
                {view && <Button variant="outline" className="min-h-11 md:min-h-9" disabled={!canEdit} onClick={() => askGenerate("new")} data-new-draw>{tr("New draw (illustrative)")}</Button>}
                {view && <Button variant="ghost" className="min-h-11 text-destructive md:min-h-9" disabled={!canEdit} onClick={() => { deleteDraw(drawKey(ev.id, division), label); toast(tr("Draw deleted")); }} data-delete-draw><Trash2 className="mr-1.5 size-4" />{tr("Delete draw")}</Button>}
              </div>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="draw" className="mt-4 space-y-5">
          {!view ? <div className="rounded-xl border border-dashed p-10 text-center" data-no-draw><p className="font-semibold">{tr("No draw generated yet")}</p><p className="mt-1 text-sm text-muted-foreground">{tr("Choose the seeds and the format in “Pairs & seeds”, then generate the draw.")}</p><Button className="mt-4 min-h-11" variant="outline" onClick={() => setTab("pairs")}>{tr("Pairs & seeds")}</Button></div> : <>
              {frozen && <Alert data-frozen-note><Lock className="size-4" /><AlertTitle>{tr("Published draw — protected")}</AlertTitle><AlertDescription>{tr("A published or locked draw is never modified silently. Request an exceptional correction: MPL administration must approve it first.")}</AlertDescription></Alert>}
              {!frozen && view.cfg.grant && <Alert data-grant-note className="border-success/50"><CheckCircle2 className="size-4" /><AlertTitle>{tr("Exceptional correction approved")}</AlertTitle><AlertDescription>{tr("One modification is allowed. The draw then goes back to draft and the public view is hidden until it is republished; matches and results of this draw are erased (demo).")}</AlertDescription></Alert>}
            {view.built.error && <Alert variant="destructive"><AlertTitle>{trDyn(view.built.error)}</AlertTitle></Alert>}
            {view.changed && <Alert data-draw-changed><AlertTriangle className="size-4" /><AlertTitle>{tr("Confirmed pairs changed since the draw")}</AlertTitle><AlertDescription>{tr("Regenerate the draw to include the latest confirmations and withdrawals.")}</AlertDescription></Alert>}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"><div className="min-w-0 flex-1 text-sm"><strong>{view.cfg.format === "groups" ? tr("Groups + final phase") : tr("Knockout")} · {view.cfg.size}</strong> · {view.cfg.entries.length} {tr("pairs")}{view.built.qualifiers > 0 ? ` · ${view.built.qualifiers} ${tr("qualifying matches")}` : ""}{view.cfg.provisional ? ` · ${tr("provisional")}` : ""}<DemoBadge className="ml-2" label={tr("ILLUSTRATIVE DRAW")} /></div>
              <StageChip stage={stage!} />
              {(stage === "published" || stage === "locked") && <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-success/15 px-3 text-sm font-medium text-success md:min-h-9" data-published-badge><CheckCircle2 className="size-4" />{tr("Published")}</span>}
              {canPub && (stage === "draft") && <Button variant="outline" className="min-h-11 md:min-h-9" onClick={() => setDrawStage(drawKey(ev.id, division), "ready", label)} data-mark-ready>{tr("Mark ready to publish")}</Button>}
              {canEdit && stage === "ready" && <Button variant="ghost" className="min-h-11 md:min-h-9" onClick={() => setDrawStage(drawKey(ev.id, division), "draft", label)} data-back-draft>{tr("Back to draft")}</Button>}
              {canPub && (stage === "draft" || stage === "ready") && <Button className="min-h-11 md:min-h-9" onClick={publish} data-publish-draw><Send className="mr-1.5 size-4" />{tr("Publish draw (illustrative)")}</Button>}
              {canLock && stage === "published" && <Button variant="outline" className="min-h-11 md:min-h-9" onClick={() => { setDrawStage(drawKey(ev.id, division), "locked", label); toast.success(tr("Draw locked")); }} data-lock-draw><Lock className="mr-1.5 size-4" />{tr("Lock draw")}</Button>}
              {canCorr && (stage === "published" || stage === "locked") && !pendingCorr && !view.cfg.grant && <Button variant="outline" className="min-h-11 md:min-h-9" onClick={() => setCorrOpen(true)} data-request-correction>{tr("Request exceptional correction")}</Button>}
              {pendingCorr && <span className="text-xs text-warning" data-correction-pending>{tr("Correction request pending MPL administration")}</span>}
              {(stage === "published" || stage === "locked") && <Button asChild variant="outline" className="min-h-11 md:min-h-9"><Link to={`/tournaments/${ev.id}`}>{tr("See public page")}</Link></Button>}</div>
            {view.cfg.format === "groups" && <section><h2 className="mb-2 font-semibold">{tr("Groups")}</h2><GroupsView v={view} onSelect={setSel} selected={selId ?? undefined} /></section>}
            {view.built.qualifiers > 0 && <section><h2 className="mb-2 font-semibold">{tr("Qualifying round")}</h2><MatchGrid v={view} ids={ids("qual")} onSelect={setSel} selected={selId ?? undefined} /></section>}
            <section><h2 className="mb-2 font-semibold">{view.cfg.format === "groups" ? tr("Final phase") : tr("Main draw")}</h2><BracketView v={view} onSelect={setSel} selected={selId ?? undefined} /></section>
            {ids("placement").length > 0 && <section><h2 className="mb-2 font-semibold">{tr("Placement matches")}</h2><MatchGrid v={view} ids={ids("placement")} onSelect={setSel} selected={selId ?? undefined} /></section>}
          </>}
        </TabsContent>

        <TabsContent value="history" className="mt-4"><DrawHistory ev={ev} division={division} /></TabsContent>
        <TabsContent value="schedule" className="mt-4 space-y-4">
          {!view ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{tr("Generate a draw first: the schedule is built from its matches.")}</p> : <>
            <div className="flex flex-wrap items-center gap-2"><Button className="min-h-11 md:min-h-9" disabled={!canSched} onClick={doAuto} data-auto-schedule><Wand2 className="mr-1.5 size-4" />{tr("Auto-schedule (demo)")}</Button><Button variant="outline" className="min-h-11 md:min-h-9" onClick={doClear} disabled={scheduled.length === 0 || !canSched}>{tr("Clear schedule")}</Button>
              <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label={tr("View")}>{([["court", tr("By court")], ["time", tr("Chronological")]] as const).map(([k, l]) => <button key={k} type="button" data-sched-view={k} aria-pressed={schedView === k} onClick={() => setSchedView(k)} className={cn("min-h-11 rounded-md px-3 text-sm font-medium md:min-h-9", schedView === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{l}</button>)}</div>
              {days.length > 1 && <select aria-label={tr("Day")} value={dayShown} onChange={(e) => setDay(e.target.value)} className={cn(SELECT_CLS, "w-auto")}>{days.map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}</select>}
              <DemoBadge label={`${MATCH_DURATION_MIN} min · ${tr("ILLUSTRATIVE SCHEDULE")}`} /></div>
            {conflicts.length > 0 ? <Alert variant="destructive" data-conflicts><AlertTriangle className="size-4" /><AlertTitle>{conflicts.length} {tr("schedule conflict(s)")}</AlertTitle><AlertDescription><ul className="mt-1 list-disc pl-4">{conflicts.slice(0, 6).map((c, i) => <li key={i}>{matchLabel(view.built.matches.find((m) => m.id === c.matchId)!)} — {CONFLICT_TEXT[c.kind]}{c.other ? ` (${matchLabel(view.built.matches.find((m) => m.id === c.other)!)})` : ""}</li>)}</ul></AlertDescription></Alert> : scheduled.length > 0 && <p className="text-sm text-success" data-no-conflict>{tr("No schedule conflict.")}</p>}
            {schedView === "court" ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-by-court>{Array.from({ length: ev.courts }, (_, i) => i + 1).map((c) => { const rows = scheduled.filter((r) => r.st!.court === c && r.st!.day === dayShown); return (
              <section key={c} data-schedule-court={c} className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">{tr("Court")} {c}</h3>{rows.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No match scheduled")}</p> : <ul className="space-y-2">{rows.map((r) => <li key={r.id} data-sched-row={r.id}><SchedRow v={view} r={r} onEdit={() => setSel(r.id)} /></li>)}</ul>}</section>); })}</div>
            : <ol className="space-y-2" data-chronological>{scheduled.filter((r) => r.st!.day === dayShown).map((r) => <li key={r.id} data-sched-row={r.id}><SchedRow v={view} r={r} onEdit={() => setSel(r.id)} showTime /></li>)}{scheduled.filter((r) => r.st!.day === dayShown).length === 0 && <p className="text-sm text-muted-foreground">{tr("No match scheduled")}</p>}</ol>}
            <section><h3 className="mb-2 font-semibold">{tr("To schedule")} <span className="num text-muted-foreground">({unscheduled.length})</span></h3>{unscheduled.length === 0 ? <p className="text-sm text-muted-foreground">{tr("Every match has a court and a time.")}</p> : <ul className="grid gap-2 sm:grid-cols-2" data-unscheduled>{unscheduled.map((r) => <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2.5 text-sm" data-unsched-row={r.id}><span className="min-w-0"><strong>{matchLabel(r.m)}</strong> <span className="text-muted-foreground">· {roundLabel(r.m.round)}</span><br /><span className="break-words text-xs text-muted-foreground">{teamName(view, r.a, true)} — {teamName(view, r.b, true)}</span></span><Button size="sm" variant="outline" className="min-h-11 shrink-0 md:min-h-8" onClick={() => setSel(r.id)} aria-label={trDyn(`Schedule ${matchLabel(r.m)}`)}>{tr("Schedule")}</Button></li>)}</ul>}</section>
          </>}
        </TabsContent>

        <TabsContent value="live" className="mt-4 space-y-3">
          {!view ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{tr("No draw generated yet")}</p> : <>
            <div className="flex flex-wrap gap-2" role="group" aria-label={tr("Filter matches")}>{([["all", tr("All")], ["live", `${tr("Live")} (${nLive})`], ["pending", `${tr("Pending validation")} (${nPend})`], ["done", `${tr("Completed")} (${nDone})`]] as const).map(([k, l]) => <button key={k} type="button" data-live-filter={k} aria-pressed={livef === k} onClick={() => setLivef(k)} className={cn("min-h-11 rounded-full border px-3 text-sm md:min-h-9", livef === k ? "border-primary bg-primary/15 font-semibold" : "text-muted-foreground")}>{l}</button>)}</div>
            {liveRows.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground" data-live-empty>{tr("No live or completed match yet.")}</p> : <ul className="grid gap-3 sm:grid-cols-2" data-live-list>{liveRows.map((r) => <li key={r.id}><MatchCard v={view} r={r} /><Button asChild variant="ghost" size="sm" className="mt-1 min-h-11 md:min-h-8"><Link to={`/organizer/scores?event=${ev.id}&division=${division}&match=${r.id}`}>{tr("Open score entry")}</Link></Button></li>)}</ul>}
          </>}
        </TabsContent>
      </Tabs>
      {view && <MatchDialog key={selId ?? "none"} canSched={canSched} v={view} r={sel ?? null} onClose={() => setSel(null)} ev={ev} division={division} onSave={(items, text, notify) => { scheduleMatches(ev.id, items, text, notify); toast.success(tr("Schedule saved")); setSel(null); }} />}
      <Dialog open={corrOpen} onOpenChange={setCorrOpen}><DialogContent data-correction-dialog><DialogHeader><DialogTitle>{tr("Request exceptional correction")}</DialogTitle><DialogDescription>{tr("The published draw stays unchanged until MPL administration approves. The request, the decision and any change are recorded in the audit log.")}</DialogDescription></DialogHeader>
        <Label htmlFor="corr-reason">{tr("Reason (required)")}</Label><Input id="corr-reason" value={corrReason} onChange={(e) => setCorrReason(e.target.value)} data-correction-reason-draw />
        <DialogFooter><Button variant="ghost" onClick={() => setCorrOpen(false)}>{tr("Cancel")}</Button><Button disabled={corrReason.trim().length < REASON_MIN_LENGTH} onClick={() => { requestCorrection(ev.id, division, corrReason.trim(), label); setCorrOpen(false); setCorrReason(""); toast.success(tr("Correction request sent to MPL administration")); }} data-send-correction>{tr("Send request")}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!confirmGen} onOpenChange={(o) => !o && setConfirmGen(null)}><DialogContent data-confirm-regenerate><DialogHeader><DialogTitle>{tr("Regenerate the draw?")}</DialogTitle><DialogDescription>{tr("Scores, schedule and results already entered for this draw will be erased (demo).")}</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" onClick={() => setConfirmGen(null)}>{tr("Cancel")}</Button><Button variant="destructive" onClick={() => generate(confirmGen === "new")} data-confirm-generate>{tr("Regenerate")}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
function SchedRow({ v, r, onEdit, showTime }: { v: DrawView; r: ReturnType<DrawView["resolved"]["get"]> & {}; onEdit: () => void; showTime?: boolean }) {
  return (<div className="flex items-start gap-2 rounded-lg border bg-background p-2.5 text-sm"><span className="num w-12 shrink-0 font-mono text-xs font-semibold">{r.st!.time}</span><div className="min-w-0 flex-1"><p className="font-medium">{matchLabel(r.m)}{showTime && <span className="ml-2 text-xs text-muted-foreground">{tr("Court")} {r.st!.court}</span>} <MatchStatus r={r} className="ml-1" /></p><p className="break-words text-xs text-muted-foreground">{teamName(v, r.a, true)} — {teamName(v, r.b, true)}</p></div><Button size="sm" variant="ghost" className="min-h-11 shrink-0 md:min-h-8" onClick={onEdit} aria-label={trDyn(`Edit ${matchLabel(r.m)}`)} disabled={r.status === "done"}>{tr("Edit")}</Button></div>);
}
/** Détail d'un match + attribution terrain / jour / horaire, avec contrôle des conflits en direct. */
function MatchDialog({ v, r, onClose, ev, division, onSave, canSched }: { canSched: boolean; v: DrawView; r: ReturnType<DrawView["resolved"]["get"]> | null; onClose: () => void; ev: (typeof CALENDAR_EVENTS)[number]; division: Division; onSave: (items: Array<{ key: string; court?: number; day?: string; time?: string }>, label: string, notify: Array<{ playerId: string; text: string }>) => void }) {
  const times = slotTimes(); const cur = r?.st;
  const [court, setCourt] = useState(String(cur?.court ?? "")); const [day, setDay] = useState(cur?.day ?? v.days[0]); const [time, setTime] = useState(cur?.time ?? "");
  if (!r) return null;
  const cand = court && time ? { court: +court, day, time } : null;
  const conflicts = cand ? scheduleConflicts(v.built, v.resolved, (id) => (id === r.id ? cand : v.sched(id)), v.days).filter((c) => c.matchId === r.id || c.other === r.id) : [];
  const locked = !canSched || r.status === "done" || r.status === "pending" || r.status === "live";
  const save = () => { if (!cand || conflicts.length) return; const notify = [r.a, r.b].flatMap((k) => teamPlayers(v, k)).map((playerId) => ({ playerId, text: `Your match ${matchLabel(r.m)} is scheduled: Court ${cand.court}, ${cand.time} (${cand.day}).` })); onSave([{ key: matchKey(ev.id, division, r.id), ...cand }], `${matchLabel(r.m)} — ${ev.id}`, notify); };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent data-match-dialog={r.id}><DialogHeader><DialogTitle>{matchLabel(r.m)} · {roundLabel(r.m.round)}</DialogTitle><DialogDescription>{teamName(v, r.a)} — {teamName(v, r.b)}</DialogDescription></DialogHeader>
      <div className="flex items-center gap-2 text-sm"><MatchStatus r={r} />{r.m.kind === "main" && <span className="text-xs text-muted-foreground">· {tr("Main draw")}</span>}</div>
      {r.bye ? <p className="text-sm text-muted-foreground">{tr("This slot is a BYE: the pair advances without playing.")}</p> : <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3"><div><Label htmlFor="m-court" className="mb-1.5 block text-xs">{tr("Court")}</Label><select id="m-court" className={SELECT_CLS} value={court} onChange={(e) => setCourt(e.target.value)} disabled={locked}><option value="">—</option>{Array.from({ length: ev.courts }, (_, i) => <option key={i} value={i + 1}>{tr("Court")} {i + 1}</option>)}</select></div>
          <div><Label htmlFor="m-day" className="mb-1.5 block text-xs">{tr("Day")}</Label><select id="m-day" className={SELECT_CLS} value={day} onChange={(e) => setDay(e.target.value)} disabled={locked}>{v.days.map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}</select></div>
          <div><Label htmlFor="m-time" className="mb-1.5 block text-xs">{tr("Start time")}</Label><select id="m-time" className={SELECT_CLS} value={time} onChange={(e) => setTime(e.target.value)} disabled={locked}><option value="">—</option>{times.map((t) => <option key={t} value={t}>{t}</option>)}</select></div></div>
        {conflicts.length > 0 && <Alert variant="destructive" data-dialog-conflicts><AlertTriangle className="size-4" /><AlertTitle>{tr("Schedule conflict")}</AlertTitle><AlertDescription><ul className="list-disc pl-4">{[...new Set(conflicts.map((c) => c.kind))].map((k) => <li key={k}>{CONFLICT_TEXT[k]}</li>)}</ul></AlertDescription></Alert>}
        {locked && <p className="text-xs text-muted-foreground">{tr("A started or completed match can no longer be rescheduled.")}</p>}</div>}
      <DialogFooter className="flex-col gap-2 sm:flex-row"><Button asChild variant="outline" className="min-h-11 md:min-h-9"><Link to={`/organizer/scores?event=${ev.id}&division=${division}&match=${r.id}`}><ClipboardList className="mr-1.5 size-4" />{tr("Open score entry")}</Link></Button>
        {!r.bye && <Button className="min-h-11 md:min-h-9" disabled={!cand || conflicts.length > 0 || locked} onClick={save} data-save-schedule>{tr("Save schedule")}</Button>}</DialogFooter></DialogContent></Dialog>
  );
}

export default function OrganizerDraws() { return <OpsAccess><OrganizerDrawsInner /></OpsAccess>; }

const STAGES: Array<{ k: "draft" | "ready" | "published" | "locked"; label: string }> = [{ k: "draft", label: tr("Draft") }, { k: "ready", label: tr("Ready to publish") }, { k: "published", label: tr("Published") }, { k: "locked", label: tr("Locked") }];
/** Cycle de publication du tableau : brouillon → prêt → publié → verrouillé. */
export function StageChip({ stage }: { stage: "draft" | "ready" | "published" | "locked" }) {
  const idx = STAGES.findIndex((x) => x.k === stage);
  return (<ol className="inline-flex flex-wrap items-center gap-1 text-xs" data-stage={stage} aria-label={tr("Publication status")}>{STAGES.map((x, i) => <li key={x.k} data-stage-step={x.k} data-active={i === idx ? "true" : "false"} className={cn("rounded-full border px-2.5 py-1", i === idx ? "border-primary bg-primary/15 font-semibold text-foreground" : i < idx ? "border-success/40 text-success" : "text-muted-foreground")}>{x.label}</li>)}</ol>);
}
