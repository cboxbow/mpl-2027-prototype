import { Link } from "react-router-dom";
import { tr, trDyn } from "@/lib/i18n";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BadgeCheck, Bell, CalendarClock, Medal, Trash2, Trophy, TrendingUp, UserRound, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryBadge, ClubAvatar, DemoBadge, PlayerAvatar, StatCard } from "@/components/mpl/bits";
import { RANKING_F, RANKING_M, ROUND_LABEL, DIVISION_LABEL, displayName, playerById } from "@/data/demo";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { shiftDate } from "@/lib/format";
import { allEntries } from "@/lib/entries";
import { isHolding } from "@/lib/demo-state";
import { History, ChevronDown, IdCard } from "lucide-react";
import { DEMO_TODAY, REG_OPEN_DAYS_BEFORE } from "@/config/demo-config";
import type { DemoRegistration } from "@/lib/demo-state";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { clubById } from "@/data/clubs";
import { useDemo } from "@/lib/demo-store";
import { fmtDate, fmtMUR, fmtRange } from "@/lib/format";
import { toast } from "sonner";
import { openEvents } from "@/lib/public-data";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { HubActionList, HubNav } from "@/components/player/PlayerHub";
import { hubActions, hubRegistrations, hubSquads, lastResult, nextKnownMatch } from "@/lib/player-hub";

const evMap = new Map(CALENDAR_EVENTS.map((e) => [e.id, e]));
const STATUS: Record<DemoRegistration["status"], { label: string; cls: string }> = {
  pending: { label: tr("Pending validation"), cls: "border-warning/50 text-warning" }, confirmed: { label: tr("Confirmed"), cls: "border-success/50 text-success" },
  rejected: { label: tr("Refused by the organizer"), cls: "border-destructive/50 text-destructive" }, cancelled: { label: tr("Cancelled"), cls: "border-muted-foreground/40 text-muted-foreground" },
  waitlist: { label: tr("Waiting list"), cls: "border-warning/50 text-warning" }, withdrawn: { label: tr("Withdrawn"), cls: "border-muted-foreground/40 text-muted-foreground" },
};
export default function PlayerDashboard() {
  const { role, setRole, registrations, cancelRegistration, playerId, prefs, setPrefs, notifications, org, draws, matches, ic } = useDemo(); const [cancelling, setCancelling] = useState<DemoRegistration | null>(null);
  const me = playerById(playerId)!; const club = clubById(me.clubId);
  const mine = useMemo(() => registrations.filter((r) => r.playerId === playerId || r.partnerId === playerId), [registrations, playerId]);
  const ctxD = useMemo(() => ({ registrations, org }), [registrations, org]);
  const rankOfReg = useMemo(() => { const m = new Map<string, number>(); for (const r of mine) if (r.status === "waitlist") { const e = allEntries(evMap.get(r.eventId)!, r.division, ctxD).find((x) => x.regId === r.id); if (e?.waitRank) m.set(r.id, e.waitRank); } return m; }, [mine, ctxD]);
  const active = mine.filter((r) => r.status === "pending" || r.status === "confirmed");
  const row = [...RANKING_M, ...RANKING_F].find((r) => r.player.id === me.id);
  const feed = useMemo(() => {
    const own = notifications.filter((n) => n.kind !== "interclub").filter((n) => (n.kind === "registration" ? n.playerId === playerId : n.kind === "draw" ? n.playerId === playerId && prefs.draw : prefs.results)).map((n) => ({ id: n.id, at: n.at, text: n.text }));
    const opening = prefs.open ? CALENDAR_EVENTS.filter((e) => { const o = shiftDate(e.start, -REG_OPEN_DAYS_BEFORE); return o >= DEMO_TODAY && o <= shiftDate(DEMO_TODAY, 14) && e.category !== "JUNIOR" === !me.junior; }).slice(0, 5).map((e) => ({ id: "open-" + e.id, at: shiftDate(e.start, -REG_OPEN_DAYS_BEFORE), text: trDyn(`Registration opens on ${fmtDate(shiftDate(e.start, -REG_OPEN_DAYS_BEFORE))} — ${e.category.replace("MIXTE ", tr("Mixed "))} at ${e.clubName}.`) })) : [];
    return [...own, ...opening].sort((a, b) => b.at.localeCompare(a.at));
  }, [notifications, prefs, playerId, me.junior]);
  // 5B-3 : « prochaine action » — lecture seule des inscriptions et du calendrier (aucune règle ni calcul modifié)
  const upcomingMine = mine.filter((r) => ["pending", "confirmed", "waitlist"].includes(r.status) && (evMap.get(r.eventId)?.end ?? "") >= DEMO_TODAY).sort((x, y) => (evMap.get(x.eventId)!.start).localeCompare(evMap.get(y.eventId)!.start));
  const nextReg = upcomingMine[0]; const nextEv = nextReg ? evMap.get(nextReg.eventId)! : null;
  const cnt = (st: DemoRegistration["status"]) => mine.filter((r) => r.status === st).length;
  const suggestions = openEvents(60).filter((e) => (e.category !== "JUNIOR") === !me.junior && !mine.some((r) => r.eventId === e.id && ["pending", "confirmed", "waitlist"].includes(r.status))).slice(0, 3);
  // 5B-7 : profil unifié — dérivations en lecture seule (mêmes données que le parcours d'inscription 5B-5)
  const hr = useMemo(() => hubRegistrations(playerId, registrations), [registrations, playerId]);
  const nextMatch = useMemo(() => nextKnownMatch(playerId, hr, { draws, matches, registrations, org }), [playerId, hr, draws, matches, registrations, org]);
  const last = lastResult(playerId); const squads = useMemo(() => (me.junior ? [] : hubSquads(playerId, ic)), [playerId, ic, me.junior]);
  const actions = useMemo(() => hubActions(playerId, hr, squads), [playerId, hr, squads]);
  if (role !== "player") return <Gate onSwitch={() => setRole("player")} label={tr("player")} />;
  // courbe de points cumulés (top-8 glissant simplifié)
  const hist = row ? [...row.results].sort((a, b) => a.date.localeCompare(b.date)) : []; let acc = 0; const series = hist.map((x) => { acc += x.points; return { d: fmtDate(x.date), pts: acc }; });
  return (
    <div className="container-mpl py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5">
        <PlayerAvatar name={displayName(me)} size={56} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold sm:text-3xl">{displayName(me)}</h1><DemoBadge label={tr("DEMO PLAYER")} /></div><div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><ClubAvatar club={club} size={18} />{club?.name}</span>{me.junior ? <span className="rounded border px-1.5 text-xs font-semibold">{tr("Junior")} {me.junior.group}</span> : <span className="font-mono text-xs">{me.licence}</span>}<span className={me.licenceExpiry >= DEMO_TODAY ? "inline-flex items-center gap-1 text-success" : "inline-flex items-center gap-1 text-destructive"}><BadgeCheck className="size-4" />{me.licenceExpiry >= DEMO_TODAY ? tr("Licence valid 2027") : tr("Licence expired")}</span></div></div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto"><Button asChild variant="outline" className="flex-1 sm:flex-none"><Link to={`/players/${me.id}`} data-profile-link><IdCard className="mr-1.5 size-4" />{tr("Detailed profile")}</Link></Button><Button asChild variant="outline" className="flex-1 sm:flex-none"><Link to="/rankings"><Trophy className="mr-1.5 size-4" />{tr("Full ranking")}</Link></Button></div>
      </div>
      <HubNav playerId={me.id} self current="dashboard" />
      <section className="mb-6 grid gap-4 md:grid-cols-2" data-player-hub aria-label={tr("At a glance")}>
        <div className="rounded-2xl border bg-card p-4 sm:p-5" data-player-next-match><h2 className="mb-3 text-base font-bold">{tr("Next known match")}</h2>
          {nextMatch ? (<div className="space-y-1 text-sm"><p className="font-medium">{nextMatch.label} · {evMap.get(nextMatch.eventId)?.clubName}</p><p className="text-muted-foreground">{nextMatch.day ? fmtDate(nextMatch.day) : tr("Date to be confirmed")}{nextMatch.time ? ` · ${nextMatch.time}` : ""}{nextMatch.court ? ` · ${tr("Court")} ${nextMatch.court}` : ""}</p>{nextMatch.opponents.length > 0 && <p className="text-muted-foreground">{tr("vs")} {nextMatch.opponents.map((o) => { const q = playerById(o); return q ? displayName(q) : "—"; }).join(" / ")}</p>}</div>)
            : <p className="text-sm text-muted-foreground" data-empty="player-next-match">{tr("No match is known yet. Matches appear here once a draw is published and scheduled.")}</p>}</div>
        <div className="rounded-2xl border bg-card p-4 sm:p-5" data-player-last-result><h2 className="mb-3 text-base font-bold">{tr("Last result")}</h2>
          {last ? (<div className="space-y-1 text-sm"><p className="font-medium"><span className={last.won ? "text-success" : "text-destructive"}>{last.won ? tr("Won") : tr("Lost")}</span> {tr("vs")} {last.opponents.map((o) => { const q = playerById(o); return q ? displayName(q) : "—"; }).join(" / ")}</p><p className="text-muted-foreground">{evMap.get(last.eventId)?.clubName} · {fmtDate(last.date)} · <span className="font-mono num">{last.score}</span></p><Link to={`/players/${me.id}?tab=matches`} className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline md:min-h-8">{tr("All matches")}</Link></div>)
            : <p className="text-sm text-muted-foreground" data-empty="player-last-result">{tr("No result yet. Your results appear here after your first ranked tournament.")}</p>}</div>
      </section>
      <div className="mb-6"><HubActionList actions={actions} eventName={(i) => evMap.get(i ?? "")?.clubName ?? ""} /></div>
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]" data-player-next aria-label={tr("Next action")}>
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="mb-3 text-base font-bold">{tr("My next tournament")}</h2>
          {nextEv && nextReg ? (<div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><CategoryBadge category={nextEv.category} /><Link to={`/tournaments/${nextEv.id}`} className="font-semibold hover:underline">{nextEv.clubName}</Link></div>
            <p className="text-sm text-muted-foreground">{fmtRange(nextEv)} · <span className={"rounded-full border px-2 py-0.5 text-xs font-medium " + STATUS[nextReg.status].cls}>{STATUS[nextReg.status].label}</span></p>
            <div className="flex flex-wrap gap-2"><Button asChild className="min-h-11"><Link to={`/tournaments/${nextEv.id}`}>{tr("Draw and matches")}<ArrowRight className="ml-1.5 size-4" /></Link></Button><Button asChild variant="outline" className="min-h-11"><Link to="/calendar?status=open">{tr("Browse open tournaments")}</Link></Button></div>
            <p className="text-xs text-muted-foreground" data-player-counts>{cnt("pending")} {tr("pending")} · {cnt("confirmed")} {tr("confirmed")} · {cnt("waitlist")} {tr("on a waiting list")}</p></div>)
            : (<div data-empty="player-next"><p className="text-sm text-muted-foreground">{tr("You have no upcoming registration. Pick an open tournament on the right, or register from the Registrations tab.")}</p></div>)}
        </div>
        <div className="rounded-2xl border bg-card p-4 sm:p-5" data-player-suggestions>
          <h2 className="mb-3 text-base font-bold">{tr("Open for registration")}</h2>
          {suggestions.length === 0 ? <p className="text-sm text-muted-foreground" data-empty="player-open">{tr("No tournament is open for registration for your profile on the demonstration date.")}</p> : <ul className="divide-y">{suggestions.map((e) => <li key={e.id}><Link to={`/tournaments/${e.id}`} className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 py-2 text-sm hover:text-primary"><CategoryBadge category={e.category} /><span className="min-w-0 flex-1 basis-32 break-words">{e.clubName}</span><span className="text-xs text-muted-foreground">{fmtRange(e)}</span></Link></li>)}</ul>}
        </div>
      </section>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{row ? (<><StatCard label={tr("Ranking")} value={`#${row.rank}`} hint={`${row.prevRank - row.rank >= 0 ? "▲" : "▼"} ${Math.abs(row.prevRank - row.rank)} ${tr("vs previous")}`} icon={<Medal className="size-4" />} /><StatCard label={tr("Points (demo)")} value={row.points.toLocaleString("en-GB")} hint={tr("Best 8 results counted")} icon={<TrendingUp className="size-4" />} /><StatCard label={tr("Tournaments")} value={row.played} hint={`${row.wins} ${tr("won")}`} icon={<Trophy className="size-4" />} /></>) : (<><StatCard label={tr("Ranking")} value="—" hint={tr("Juniors: no points scale yet")} icon={<Medal className="size-4" />} /><StatCard label={tr("Points")} value="—" hint={tr("Not ranked")} icon={<TrendingUp className="size-4" />} /><StatCard label={tr("Tournaments")} value={0} icon={<Trophy className="size-4" />} /></>)}<StatCard label={tr("Registrations")} value={active.length} hint={tr("Pending or confirmed")} icon={<CalendarClock className="size-4" />} /></div>
      <Tabs defaultValue="registrations"><TabsList className="no-scrollbar h-12 w-full justify-start overflow-x-auto"><TabsTrigger value="registrations">{tr("Registrations")}</TabsTrigger><TabsTrigger value="results">{tr("Results")}</TabsTrigger><TabsTrigger value="progress">{tr("Progress")}</TabsTrigger><TabsTrigger value="settings">{tr("Notifications")}</TabsTrigger></TabsList>
        <TabsContent value="registrations" className="mt-5">
          {mine.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center"><p className="font-semibold">{tr("No upcoming registration")}</p><p className="mt-1 text-sm text-muted-foreground">{tr("Find a tournament and register with a partner in a few clicks.")}</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Button asChild><Link to="/register">{tr("Register for a tournament")}</Link></Button><Button asChild variant="outline"><Link to="/calendar?status=open">{tr("Browse open tournaments")}</Link></Button></div></div> : (
            <ul className="space-y-3" aria-label={tr("My registrations")}>{mine.map((r) => { const e = evMap.get(r.eventId)!; const p = playerById(r.playerId === playerId ? r.partnerId : r.playerId); const s = STATUS[r.status]; return (<li key={r.id} data-reg-id={r.id} data-reg-status={r.status} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"><CategoryBadge category={e.category} /><div className="min-w-0 flex-1 basis-48"><Link to={`/tournaments/${e.id}`} className="block break-words font-semibold hover:underline">{e.clubName}</Link><p className="text-xs text-muted-foreground">{fmtRange(e)} · {DIVISION_LABEL[r.division]} {tr("· Partner:")} {p ? displayName(p) : "—"} · <span className="font-mono">{r.id}</span></p>{r.decidedAt && r.status !== "pending" && <p className="mt-0.5 text-xs text-muted-foreground">{r.decidedBy} · {r.decidedAt}{r.reason ? ` · ${r.reason}` : ""}</p>}</div><Badge variant="outline" className={s.cls} data-status-badge>{s.label}{r.status === "waitlist" && rankOfReg.get(r.id) ? ` #${rankOfReg.get(r.id)}` : ""}</Badge><span className="text-sm font-semibold num"><Wallet className="mr-1 inline size-3.5 text-muted-foreground" />{fmtMUR(r.amount)}</span>{isHolding(r) && <Button variant="ghost" size="icon" aria-label={trDyn(`Cancel registration ${r.id}`)} onClick={() => setCancelling(r)}><Trash2 className="size-4" /></Button>}{(r.history?.length ?? 0) > 0 && <details className="group basis-full" data-reg-history><summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground md:min-h-0"><History className="size-3.5" />{tr("History")} ({r.history!.length})<ChevronDown className="size-3.5 transition group-open:rotate-180" /></summary><ol className="mt-2 space-y-1 border-l pl-3 text-xs">{r.history!.map((h, i) => <li key={i}><span className="font-mono text-muted-foreground">{h.at}</span> · {trDyn(h.action)}{h.note ? ` — ${h.note}` : ""} <span className="text-muted-foreground">({trDyn(h.actor)})</span></li>)}</ol></details>}</li>); })}</ul>)}
        </TabsContent>
        <TabsContent value="results" className="mt-5">{!row ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{tr("No ranked results: junior events have no points scale yet.")}</div> : <ul className="space-y-2">{row.results.map((x, i) => { const e = evMap.get(x.eventId)!; return (<li key={i} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"><CategoryBadge category={e.category} /><div className="min-w-0 flex-1"><Link to={`/tournaments/${e.id}`} className="block break-words font-medium hover:underline">{e.clubName}</Link><p className="text-xs text-muted-foreground">{fmtDate(x.date)} · {ROUND_LABEL[x.round]} {tr("· with")} {displayName(playerById(x.partner)!)}</p></div><span className="text-lg font-bold num">{x.points}</span>{x.counted ? <Badge className="bg-success/15 text-success hover:bg-success/15">{tr("counted")}</Badge> : <Badge variant="secondary">{tr("not counted")}</Badge>}</li>); })}</ul>}</TabsContent>
        <TabsContent value="progress" className="mt-5"><div className="rounded-xl border bg-card p-4"><h2 className="mb-1 font-semibold">{tr("Cumulative points")}</h2><p className="mb-3 text-xs text-muted-foreground">{tr("All results, before applying the best-8 rule (illustration, demo points).")}</p>
          {series.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{tr("Nothing to chart yet.")}</p> : <div className="h-64" role="img" aria-label={tr("Cumulative points chart")}><ResponsiveContainer width="100%" height="100%"><AreaChart data={series} margin={{ left: -10, right: 8, top: 8 }}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={12} interval="preserveStartEnd" /><YAxis stroke="var(--muted-foreground)" fontSize={12} /><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} /><Area type="monotone" dataKey="pts" stroke="var(--primary)" strokeWidth={2} fill="url(#g)" /></AreaChart></ResponsiveContainer></div>}</div></TabsContent>
        <TabsContent value="settings" className="mt-5 grid max-w-3xl gap-6 md:grid-cols-2">
          <div className="space-y-3"><p className="text-sm text-muted-foreground">{tr("In-app notifications only — no e-mail, SMS or push in this prototype. Preferences are saved in this browser and filter the feed on the right.")}</p>{([["open", tr("Registration opening soon")], ["draw", tr("Draw published (my events)")], ["results", tr("Ranking updates")]] as const).map(([k, l]) => (<div key={k} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border bg-card p-4"><Label htmlFor={"n-" + k} className="flex cursor-pointer items-center gap-2"><Bell className="size-4 text-muted-foreground" />{l}</Label><Switch id={"n-" + k} checked={prefs[k]} onCheckedChange={(c) => { setPrefs({ [k]: c }); toast.success(tr("Preference saved in this prototype")); }} /></div>))}</div>
          <div><h2 className="mb-2 text-sm font-semibold">{tr("Notification feed")}</h2>{feed.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{tr("No notification.")}</p> : <ul className="space-y-2" aria-label={tr("Notification feed")}>{feed.map((n) => <li key={n.id} className="rounded-lg border bg-card p-3 text-sm"><p>{trDyn(n.text)}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{n.at}</p></li>)}</ul>}</div>
        </TabsContent>
      </Tabs>
      <Dialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}><DialogContent><DialogHeader><DialogTitle>{tr("Cancel this registration?")}</DialogTitle><DialogDescription>{cancelling ? `${cancelling.id} — ${evMap.get(cancelling.eventId)?.clubName}. ` : ""}{tr("The slot is released and the organizer is informed in the audit log. No refund is processed in this prototype.")}</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" onClick={() => setCancelling(null)}>{tr("Keep registration")}</Button><Button variant="destructive" onClick={() => { if (cancelling) { cancelRegistration(cancelling.id); toast(tr("Registration cancelled (demo)")); } setCancelling(null); }}>{tr("Cancel registration")}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
export function Gate({ onSwitch, label }: { onSwitch: () => void; label: string }) {
  // 5B-1 (U-06) : colonne bornée (minmax(0,1fr)) + libellé du bouton autorisé à passer à la ligne ; une sortie « Retour à l'accueil » est ajoutée.
  return <div className="container-mpl grid min-h-[55vh] grid-cols-[minmax(0,1fr)] place-items-center py-10 text-center" data-gate><div className="w-full max-w-sm"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-accent"><UserRound className="size-7 text-primary" aria-hidden="true" /></div><h1 className="text-2xl font-bold">{tr("Sign-in required")}</h1><p className="mt-2 text-sm text-muted-foreground">{tr("In production this space is protected. In the prototype, switch to the demo")} {label} {tr("role to explore it.")}</p><div className="mt-5 flex flex-col items-stretch gap-2"><Button className="h-auto min-h-11 whitespace-normal py-2.5" onClick={onSwitch}>{tr("Continue as demo")} {label}</Button><Button asChild variant="ghost" className="min-h-11"><Link to="/">{tr("Back to home")}</Link></Button></div></div></div>;
}
