import { isHolding } from "@/lib/demo-state";
import { tr, trDyn } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock, ExternalLink, Info, LayoutGrid, MapPin, Share2, Users, Trophy, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { CategoryBadge, ClubAvatar, DemoBadge, StatusBadge } from "@/components/mpl/bits";
import { RegistrationWizard } from "@/components/mpl/RegistrationWizard";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { clubById, ZONES } from "@/data/clubs";
import { DIVISION_LABEL, ROUND_LABEL, WINNER_POINTS, displayName, divisionsForEvent, playerById, resultsForEvent, shortLabel, type Division } from "@/data/demo";
import { REG_CLOSE_DAYS_BEFORE, REG_FEE_DEMO, REG_OPEN_DAYS_BEFORE, TEAM_CAPACITY } from "@/config/demo-config";
import { eventStatus, fmtDate, fmtRange, daysBetween, DEMO_TODAY, fmtMUR, shiftDate } from "@/lib/format";
import { occupied, allEntries, publicEntries, type EntryRow } from "@/lib/entries";
import { registrationState, waitlistDivisions, type RegState } from "@/lib/registration";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import NotFound from "./NotFound";
import { PublicBracket, PublicResults, PublicSchedule, usePublicDraw } from "@/components/mpl/PublicDraw";

import { matchScore as score } from "@/data/matches";
const pairName = (ids: [string, string]) => ids.map((i) => { const p = playerById(i); return p ? shortLabel(p) : ""; }).join(" / ");

export default function Tournament() {
  const { id } = useParams(); const ev = CALENDAR_EVENTS.find((e) => e.id === id);
  const { role, setRole, registrations, org, queue, playerId } = useDemo(); const [wiz, setWiz] = useState(false);
  const [drawSelRaw, setDrawSel] = useState<Division | "">("");
  const st = ev ? eventStatus(ev) : "upcoming";
  const ctx = useMemo(() => ({ registrations, org }), [registrations, org]);
  const divisions = ev ? divisionsForEvent(ev) : []; const drawSel: Division = (drawSelRaw && divisions.includes(drawSelRaw) ? drawSelRaw : divisions[0]) ?? "M";
  const results = useMemo(() => (ev ? resultsForEvent(ev.id) : []), [ev]);
  const pub = usePublicDraw(ev ?? CALENDAR_EVENTS[0], drawSel);
  const entries = useMemo(() => (ev ? publicEntries(ev, drawSel, ctx) : []), [ev, drawSel, ctx]);
  const regState: RegState = ev ? registrationState(ev, ctx) : "upcoming";
  if (!ev) return <NotFound />;
  const club = clubById(ev.club)!; const mine = registrations.find((r) => r.eventId === ev.id && isHolding(r) && (r.playerId === playerId || r.partnerId === playerId)); const refused = registrations.find((r) => r.eventId === ev.id && r.status === "rejected" && r.playerId === playerId);
  const opens = shiftDate(ev.start, -REG_OPEN_DAYS_BEFORE), closes = shiftDate(ev.start, -REG_CLOSE_DAYS_BEFORE); const j = daysBetween(DEMO_TODAY, ev.start);
  const hasWomen = divisions.length > 1; const ranked = WINNER_POINTS[ev.category] != null; const teams = occupied(allEntries(ev, drawSel, ctx));
  const idx = CALENDAR_EVENTS.findIndex((e) => e.id === ev.id); const siblings = CALENDAR_EVENTS.filter((e) => e.club === ev.club && e.id !== ev.id).slice(0, 4);
  const onRegister = () => { if (role !== "player") { toast(tr("Switching to the demo player role to register"), { description: tr("Demo only — in production, players sign in.") }); setRole("player"); } setWiz(true); };
  const ctaLabel = regState === "open" ? (mine ? tr("Already registered") : tr("Register for this event")) : regState === "upcoming" ? `${tr("Opens")} ${fmtDate(opens)}` : regState === "closed" ? tr("Registration closed") : regState === "full" ? tr("Event full") : regState === "cancelled" ? tr("Event cancelled") : regState === "live" ? tr("Event in progress") : tr("Event completed");
  const canRegister = regState === "open" && !mine; const canWait = !mine && waitlistDivisions(ev, ctx).length > 0 && regState === "full";
  const nextStep = regState === "open" ? `${tr("Registration is open until")} ${fmtDate(closes, { day: "numeric", month: "long" })}` : regState === "upcoming" ? `${tr("Registration opens on")} ${fmtDate(opens, { day: "numeric", month: "long" })}` : regState === "closed" ? `${tr("Draw on")} ${fmtDate(closes, { day: "numeric", month: "long" })}` : regState === "full" ? tr("Every draw is full — join the waiting list") : regState === "live" ? tr("Event in progress — follow the draw and the schedule") : regState === "cancelled" ? tr("This event is cancelled") : tr("Completed — see the results");
  const cta = <Button size="lg" variant={canRegister ? "default" : "secondary"} className="w-full disabled:border disabled:opacity-100" onClick={onRegister} disabled={!canRegister} data-reg-state={regState}>{ctaLabel}</Button>;
  return (
    <div>
      <div className="border-b bg-card/50"><div className="container-mpl py-6 sm:py-8">
        <Link to="/calendar" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:min-h-0"><ArrowLeft className="size-4" />{tr("Calendar")}</Link>
        <div className="flex flex-wrap items-start gap-4">
          <ClubAvatar club={club} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><CategoryBadge category={ev.category} className="text-sm" />{regState === "full" ? null : <StatusBadge status={st} />}{regState === "full" && <span className="rounded border border-destructive/50 bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">{tr("FULL (demo)")}</span>}{ev.moved && <span className="rounded border border-warning/50 bg-warning/10 px-1.5 py-0.5 text-xs font-semibold text-warning">{tr("DATE MODIFIED (scenario C)")}</span>}{st === "cancelled" && <DemoBadge label={tr("CANCELLED — DEMO SCENARIO")} />}</div>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{ev.category.replace("MIXTE ", tr("Mixed "))} · {club.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><CalendarDays className="size-4" />{fmtRange(ev)} 2027</span><span className="inline-flex items-center gap-1"><MapPin className="size-4" />{club.locality ? `${club.locality} · ` : ""}{ZONES[ev.zone].label}</span><span className="inline-flex items-center gap-1"><LayoutGrid className="size-4" />{ev.courts} {tr("courts")}</span></p>
            <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2" data-event-glance>
              <div className="flex gap-2"><dt className="shrink-0 text-muted-foreground">{tr("Divisions")}</dt><dd className="min-w-0 break-words font-medium" data-event-divisions>{divisions.map((d) => DIVISION_LABEL[d]).join(" · ")}</dd></div>
              <div className="flex gap-2"><dt className="shrink-0 text-muted-foreground">{tr("Teams entered")}</dt><dd className="font-medium num" data-event-teams>{teams}/{TEAM_CAPACITY} <span className="font-normal text-muted-foreground">({DIVISION_LABEL[drawSel]})</span></dd></div>
              <div className="flex gap-2 sm:col-span-2"><dt className="shrink-0 text-muted-foreground">{tr("Next step")}</dt><dd className="min-w-0 break-words font-medium" data-event-next>{nextStep}</dd></div>
            </dl>
          </div>
          <Button variant="outline" size="icon" aria-label={tr("Share")} onClick={() => { navigator.clipboard?.writeText(location.href); toast.success(tr("Link copied")); }}><Share2 className="size-4" /></Button>
        </div>
      </div></div>

      <div className="container-mpl grid gap-6 py-8 pb-28 md:pb-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Tabs defaultValue={st === "completed" ? "results" : "overview"}>
            <TabsList className="no-scrollbar h-12 w-full justify-start overflow-x-auto" ><TabsTrigger value="overview"><Info className="mr-1.5 size-4" />{tr("Overview")}</TabsTrigger><TabsTrigger value="entries"><Users className="mr-1.5 size-4" />{tr("Entries")}</TabsTrigger><TabsTrigger value="draw"><Trophy className="mr-1.5 size-4" />{tr("Draw")}</TabsTrigger><TabsTrigger value="schedule"><Clock className="mr-1.5 size-4" />{tr("Schedule")}</TabsTrigger><TabsTrigger value="results"><ListChecks className="mr-1.5 size-4" />{tr("Results")}</TabsTrigger></TabsList>

            <TabsContent value="overview" className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[[tr("Format"), ev.format.replace(" / ", " · ")], [tr("Region"), ZONES[ev.zone].label], [tr("Courts"), String(ev.courts)], [tr("Event ID"), ev.id], [tr("Registration opens"), fmtDate(opens, { day: "numeric", month: "long" }) + ` (J-${REG_OPEN_DAYS_BEFORE})`], [tr("Registration closes"), fmtDate(closes, { day: "numeric", month: "long" }) + ` (J-${REG_CLOSE_DAYS_BEFORE}, draw day)`]].map(([k, v]) => <div key={k} className="min-w-0 rounded-xl border bg-card p-3 sm:p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p><p className="mt-1 break-words font-semibold">{v}</p></div>)}
              </div>
              <Alert><Info className="size-4" /><AlertTitle>{tr("Registration timeline")}</AlertTitle><AlertDescription>{st === "cancelled" ? tr("This event is cancelled (demo scenario).") : regState === "full" ? tr("Registration is open but every draw is full.") : st === "upcoming" ? trDyn(`Registration opens in ${j - REG_OPEN_DAYS_BEFORE} days.`) : st === "open" ? trDyn(`Registration is open — closes in ${j - REG_CLOSE_DAYS_BEFORE} days.`) : st === "closed" ? tr("Registration is closed; the draw is being prepared.") : st === "live" ? tr("The event is in progress.") : tr("This event has taken place.")}</AlertDescription></Alert>
              <div className="rounded-xl border bg-card p-4"><h2 className="mb-2 font-semibold">{tr("Points & ranking")}</h2>{ranked ? <p className="text-sm text-muted-foreground">{tr("Winner of a")} {ev.category} {tr("earns")} <strong className="text-foreground num">{WINNER_POINTS[ev.category]} {tr("points")}</strong>{tr(". Each player's best 8 results over a rolling 12 months count toward the ranking.")}</p> : <p className="text-sm text-muted-foreground">{tr("The points scale for this category is")} <strong className="text-foreground">{tr("to be confirmed")}</strong> {tr("and is not used in the ranking yet.")}</p>}</div>
              {siblings.length > 0 && <div><h3 className="mb-2 font-semibold">{tr("Also at")} {club.name}</h3><div className="flex flex-wrap gap-2">{siblings.map((s) => <Link key={s.id} to={`/tournaments/${s.id}`} className="min-h-11 rounded-lg border px-3 py-2 text-sm transition hover:border-primary/60"><CategoryBadge category={s.category} className="mr-2" />{fmtDate(s.start)}</Link>)}</div></div>}
            </TabsContent>

            <TabsContent value="entries" className="mt-5">
              {hasWomen && <DrawToggle v={drawSel} set={setDrawSel} divisions={divisions} />}
              {entries.length === 0 ? <Empty title={tr("No entries yet")} text={st === "cancelled" ? tr("This event is cancelled.") : tr("Registrations have not opened for this event.")} /> : (
                <><div className="mb-3 flex items-center justify-between text-sm text-muted-foreground"><span><strong className="text-foreground num">{entries.length}</strong> {tr("teams ·")} <span className="num">{teams}/{TEAM_CAPACITY}</span> {tr("places taken")}</span><DemoBadge label={tr("FICTIONAL ENTRIES")} /></div>
                <div className="overflow-x-auto rounded-xl border"><Table><TableCaption className="sr-only">{tr("Registered teams")}</TableCaption><TableHeader><TableRow><TableHead className="w-10">#</TableHead><TableHead>{tr("Team")}</TableHead><TableHead className="hidden sm:table-cell">{tr("Clubs")}</TableHead><TableHead className="text-right">{tr("Status")}</TableHead></TableRow></TableHeader><TableBody>
                  {entries.map((p: EntryRow, i) => { const ok = p.status === "confirmed"; return (
                    <TableRow key={p.key} data-entry-source={p.source} className={cn(p.source === "demo" && "bg-accent/30")}><TableCell className="num text-muted-foreground">{i + 1}</TableCell><TableCell className="whitespace-normal font-medium">{displayName(p.a)} / {displayName(p.b)}{p.source === "demo" && <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">{tr("Demo registration")}</span>}</TableCell><TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{clubById(p.a.clubId)?.name} · {clubById(p.b.clubId)?.name}</TableCell><TableCell className="text-right"><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ok ? "bg-success/15 text-success" : p.status === "waitlist" ? "bg-muted text-muted-foreground" : "bg-warning/15 text-warning")}>{ok ? tr("Confirmed") : p.status === "waitlist" ? tr("Waiting list") : tr("Pending")}</span></TableCell></TableRow>); })}
                </TableBody></Table></div></>
              )}
              {!mine && refused && <p className="mt-3 rounded-lg border border-destructive/40 p-3 text-sm" data-refused-note>{tr("Your registration")} <strong className="font-mono">{refused.id}</strong> {tr("was refused by the organizer")}{refused.reason ? ` (${refused.reason})` : ""}{tr(". You can register again.")}</p>}
              {mine && <p className="mt-3 rounded-lg border border-primary/40 bg-accent/30 p-3 text-sm">{tr("Your registration")} <strong className="font-mono">{mine.id}</strong> {tr("is")} <strong>{STATUS_LABEL[mine.status]}</strong>.</p>}
            </TabsContent>

            <TabsContent value="draw" className="mt-5">
              {hasWomen && <DrawToggle v={drawSel} set={setDrawSel} divisions={divisions} />}
              {pub && ev ? <PublicBracket v={pub} />
                : st === "completed" && (drawSel === "M" || drawSel === "F") && results.find((r) => r.draw === drawSel) ? <Bracket result={results.find((r) => r.draw === drawSel)!} />
                : org.drawPublished.includes(ev.id) ? <DrawPreview entries={entries} />
                : <Empty title={tr("Draw not published yet")} text={st === "upcoming" || st === "open" ? trDyn(`The draw is made on ${fmtDate(closes, { day: "numeric", month: "long" })} (J-7), once registrations close.`) : tr("The organizer will publish the draw soon.")} />}
              <p className="mt-3 text-xs text-muted-foreground">{tr("Prototype note: draw rendering is a visual mock-up. The regulatory draw engine is not part of this prototype.")}</p>
            </TabsContent>

            <TabsContent value="schedule" className="mt-5">
              {pub ? <PublicSchedule v={pub} /> : st === "upcoming" || st === "open" ? <Empty title={tr("Schedule not available")} text={tr("The order of play is published after the draw.")} /> : <Schedule ev={ev} entries={entries} />}
            </TabsContent>

            <TabsContent value="results" className="mt-5">
              <EnteredScores evId={ev.id} />
              {pub && <PublicResults v={pub} />}
              {!ranked ? <Empty title={tr("No ranking points")} text={tr("Points scale to be confirmed for this category.")} /> : results.length === 0 ? <Empty title={tr("Results not available")} text={st === "completed" ? tr("No results were generated for this event.") : tr("Results will appear once the event has taken place.")} /> : (
                <div className="space-y-6">{results.map((r) => (<div key={r.draw}><div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">{DIVISION_LABEL[r.draw]}</h2><DemoBadge label={tr("FICTIONAL RESULTS")} /></div><div className="overflow-x-auto rounded-xl border"><Table><TableCaption className="sr-only">{tr("Points per result")}</TableCaption><TableHeader><TableRow><TableHead>{tr("Result")}</TableHead><TableHead>{tr("Team")}</TableHead><TableHead className="text-right">{tr("Points / player")}</TableHead></TableRow></TableHeader><TableBody>{r.placements.map((p, i) => (<TableRow key={i}><TableCell className="font-medium">{ROUND_LABEL[p.round]}</TableCell><TableCell>{p.pair.map((x) => playerById(x)?.name).join(" / ")}</TableCell><TableCell className="text-right font-bold num">{p.points}</TableCell></TableRow>))}</TableBody></Table></div></div>))}
                  <p className="text-xs text-muted-foreground">{tr("Only the winner's points are official for this category; the other levels use a placeholder scale in this prototype.")}</p></div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{tr("Entry fee")} <DemoBadge className="ml-1" /></p><p className="mt-1 text-3xl font-bold num">{fmtMUR(REG_FEE_DEMO)}<span className="ml-1 text-sm font-normal text-muted-foreground">{tr("/ player")}</span></p>
            <div className="my-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">{tr("Opens")}</span><span className="num">{fmtDate(opens)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">{tr("Closes")}</span><span className="num">{fmtDate(closes)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">{tr("Draw")}</span><span className="num">{fmtDate(closes)}</span></div></div>
            {cta}{canWait && <Button size="lg" variant="outline" className="mt-2 w-full" onClick={onRegister} data-waitlist-cta>{tr("Join the waiting list")}</Button>}{mine && <p className="mt-2 text-center text-xs text-muted-foreground">{tr("Registration")} {mine.id} · {STATUS_LABEL[mine.status]}</p>}
          </div>
          <div className="rounded-2xl border bg-card p-5"><div className="flex items-center gap-3"><ClubAvatar club={club} size={44} /><div><p className="font-semibold">{club.name}</p><p className="text-xs text-muted-foreground">{club.events} {tr("MPL events in 2027")}</p></div></div>
            <Button asChild className="mt-4 w-full"><Link to={`/clubs/${club.id}`} data-club-page-link>{tr("Club page")}</Link></Button>
            <Button asChild variant="outline" className="mt-2 w-full"><a href={`https://www.google.com/maps/search/?api=1&query=${club.lat},${club.lng}`} target="_blank" rel="noreferrer noopener"><MapPin className="mr-1.5 size-4" />{tr("Open in Maps")}<ExternalLink className="ml-1.5 size-3.5" /></a></Button>
            <Button asChild variant="ghost" className="mt-1 w-full"><Link to={`/calendar?club=${club.id}`}>{tr("Club calendar")}</Link></Button></div>
        </aside>
      </div>
      <RegistrationWizard event={ev} open={wiz} onOpenChange={setWiz} />
      {st !== "completed" && <div className="fixed inset-x-0 bottom-[var(--mobile-nav-h)] z-30 border-t bg-background/95 px-4 py-2.5 backdrop-blur-lg md:hidden" data-sticky-cta><div className="mx-auto flex max-w-lg items-center gap-3"><div className="min-w-0 shrink-0"><p className="text-xs text-muted-foreground">{tr("Entry fee")} <span className="text-gold">{tr("DEMO")}</span></p><p className="font-bold num">{fmtMUR(REG_FEE_DEMO)}<span className="text-xs font-normal text-muted-foreground"> {tr("/ player")}</span></p></div><div className="min-w-0 flex-1">{cta}</div>{canWait && <Button size="lg" className="shrink-0" onClick={onRegister} data-waitlist-cta-mobile>{tr("Waiting list")}</Button>}</div></div>}
      <span className="sr-only">{idx}</span>
    </div>
  );
}
function DrawToggle({ v, set, divisions }: { v: Division; set: (x: Division) => void; divisions: Division[] }) {
  return <div className="mb-4 inline-flex flex-wrap rounded-lg border p-0.5" role="group" aria-label={tr("Draw")}>{divisions.map((d) => <button key={d} onClick={() => set(d)} aria-pressed={v === d} className={cn("min-h-11 rounded-md px-4 py-1.5 text-sm font-medium transition md:min-h-9", v === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{DIVISION_LABEL[d]}</button>)}</div>;
}
const STATUS_LABEL: Record<string, string> = { pending: tr("pending validation"), confirmed: tr("confirmed"), rejected: tr("refused by the organizer"), cancelled: tr("cancelled"), waitlist: tr("on the waiting list"), withdrawn: tr("withdrawn") };
/** Scores saisis par l'organisateur dans le prototype (état partagé) — statut issu de la file de validation de l'administration. */
function EnteredScores({ evId }: { evId: string }) {
  const { org, queue } = useDemo(); const rows = Object.entries(org.scores).filter(([k]) => k.startsWith(evId + "|"));
  if (rows.length === 0) return null;
  return <div className="mb-6 rounded-xl border bg-card p-4" data-entered-scores><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">{tr("Scores entered by the organizer")}</h3><DemoBadge label={tr("DEMO — NOT OFFICIAL")} /></div><ul className="space-y-1.5 text-sm">{rows.map(([k, s]) => { const q = queue.find((x) => x.id === s.queueId)?.status ?? "pending"; return <li key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"><span className="text-muted-foreground">{k.split("|")[1]}</span><span className="flex items-center gap-2"><span className="font-mono font-semibold">{s.value}</span><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", q === "approved" ? "bg-success/15 text-success" : q === "rejected" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning")}>{q === "approved" ? tr("Validated by MPL admin") : q === "rejected" ? tr("Rejected by MPL admin") : tr("Waiting for MPL admin")}</span></span></li>; })}</ul><p className="mt-2 text-xs text-muted-foreground">{tr("Prototype only: rankings are not recalculated from these scores.")}</p></div>;
}
function Empty({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-dashed p-10 text-center"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>;
}
function Bracket({ result }: { result: ReturnType<typeof resultsForEvent>[number] }) {
  const P = Object.fromEntries(result.placements.map((p, i) => [p.round + (p.round === "SF" || p.round === "QF" ? (p.round === "SF" ? (result.placements.slice(0, i).filter((x) => x.round === "SF").length + 1) : (result.placements.slice(0, i).filter((x) => x.round === "QF").length + 1)) : ""), p.pair])) as Record<string, [string, string]>;
  const qf = [["W", "QF1"], ["SF1", "QF3"], ["F", "QF2"], ["SF2", "QF4"]] as const; const sf = [["W", "SF1"], ["F", "SF2"]] as const;
  const Team = ({ k, win }: { k: string; win?: boolean }) => <div className={cn("flex items-center justify-between gap-2 px-3 py-1.5 text-xs", win ? "bg-primary/15 font-semibold" : "text-muted-foreground")}><span className="break-words">{pairName(P[k])}</span></div>;
  const Match = ({ a, b, i, label }: { a: string; b: string; i: number; label: string }) => <div className="overflow-hidden rounded-lg border bg-card"><div className="flex justify-between border-b bg-secondary/50 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground"><span>{label}</span><span className="num">{score(i)}</span></div><Team k={a} win /><Team k={b} /></div>;
  return (
    <div className="overflow-x-auto pb-2"><div className="grid min-w-[640px] grid-cols-3 gap-6"><div className="space-y-3"><p className="text-xs font-semibold uppercase text-muted-foreground">{tr("Quarter-finals")}</p>{qf.map(([a, b], i) => <Match key={i} a={a} b={b} i={i} label={`QF ${i + 1}`} />)}</div>
      <div className="space-y-3 pt-12"><p className="-mt-12 text-xs font-semibold uppercase text-muted-foreground">{tr("Semi-finals")}</p>{sf.map(([a, b], i) => <div key={i} className={i ? "mt-24" : ""}><Match a={a} b={b} i={i + 4} label={`SF ${i + 1}`} /></div>)}</div>
      <div className="pt-32"><p className="-mt-32 mb-32 text-xs font-semibold uppercase text-muted-foreground">{tr("Final")}</p><Match a="W" b="F" i={6} label={tr("Final")} /><div className="mt-3 rounded-lg border border-gold/50 bg-gold/10 p-3 text-center"><Trophy className="mx-auto mb-1 size-5 text-gold" /><p className="text-sm font-bold">{pairName(P.W)}</p></div></div></div></div>
  );
}
function DrawPreview({ entries }: { entries: EntryRow[] }) {
  const top = entries.slice(0, 8);
  return <div><DemoBadge label={tr("PREVIEW — SIMULATION")} /><ol className="mt-3 grid gap-2 sm:grid-cols-2">{top.map((p, i) => <li key={i} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm"><span className="grid size-6 place-items-center rounded bg-primary/15 text-xs font-bold text-primary num">{i + 1}</span>{shortLabel(p.a)} / {shortLabel(p.b)}</li>)}</ol></div>;
}
function Schedule({ ev, entries }: { ev: (typeof CALENDAR_EVENTS)[number]; entries: EntryRow[] }) {
  const slots = ["08:30", "10:00", "11:30", "13:00", "14:30"]; const courts = Array.from({ length: Math.min(ev.courts, 4) }, (_, i) => trDyn(`Court ${i + 1}`));
  return (<div><div className="mb-2 flex justify-end"><DemoBadge label={tr("ILLUSTRATIVE SCHEDULE")} /></div><div className="overflow-x-auto rounded-xl border"><Table><TableCaption className="sr-only">{tr("Illustrative schedule")}</TableCaption><TableHeader><TableRow><TableHead>{tr("Time")}</TableHead>{courts.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{slots.map((s, r) => <TableRow key={s}><TableCell className="font-mono text-xs">{s}</TableCell>{courts.map((c, ci) => { const a = entries[(r * courts.length + ci) * 2]; const b = entries[(r * courts.length + ci) * 2 + 1]; return <TableCell key={c} className="text-xs">{a && b ? `${shortLabel(a.a)}/${shortLabel(a.b)} vs ${shortLabel(b.a)}/${shortLabel(b.b)}` : "—"}</TableCell>; })}</TableRow>)}</TableBody></Table></div></div>);
}
