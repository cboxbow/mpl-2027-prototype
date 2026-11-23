import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, BadgeCheck, CalendarClock, Eye, EyeOff, IdCard, Lock, Medal, Percent, ShieldCheck, Swords, TrendingUp, Trophy, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CategoryBadge, ClubAvatar, DemoBadge, PlayerAvatar, StatCard } from "@/components/mpl/bits";
import { ScoreString } from "@/components/mpl/SetScores";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { clubById } from "@/data/clubs";
import { DIVISION_LABEL, RANKING_F, RANKING_M, ROUND_LABEL, divisionsForEvent, displayName, playerById } from "@/data/demo";
import { playerMatches } from "@/data/matches";
import { allEntries } from "@/lib/entries";
import { DEMO_TODAY, eventStatus, fmtDate, fmtRange } from "@/lib/format";
import { COUNTED_RESULTS } from "@/config/demo-config";
import { useDemo } from "@/lib/demo-store";
import { playerStats, rankHistory } from "@/lib/player-stats";
import { tr, trDyn } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { HubActionList, HubNav, HubRegistrationList, HubSquadList } from "@/components/player/PlayerHub";
import { hubActions, hubRegistrations, hubSquads } from "@/lib/player-hub";
import NotFound from "./NotFound";

const evMap = new Map(CALENDAR_EVENTS.map((e) => [e.id, e]));
const STATUS_TXT: Record<string, string> = { confirmed: tr("Confirmed"), pending: tr("Pending validation"), waitlist: tr("Waiting list") };
const AXIS = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false } as const;
const TIP = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 };

/** Profil joueur détaillé (écran 8) : vue publique, vue privée (le joueur lui-même) et profil protégé des mineurs. Données fictives. */
export default function PlayerProfile() {
  const { id } = useParams(); const p = id ? playerById(id) : undefined;
  const { role, playerId, registrations, org, ic } = useDemo(); const ctx = useMemo(() => ({ registrations, org }), [registrations, org]);
  const [filter, setFilter] = useState<"all" | "won" | "lost">("all"); const [sp, setSp] = useSearchParams();
  const minor = !!p?.junior; const isSelf = !!p && role === "player" && playerId === p.id; const isStaff = role === "organizer" || role === "admin";
  const selfTabs = isSelf ? ["registrations", "interclub"] : []; const tabQ = sp.get("tab") ?? ""; const tabV = ["ranking", "matches", "tournaments", "partners", ...selfTabs].includes(tabQ) ? tabQ : "overview";
  const setTabV = (v: string) => setSp(v === "overview" ? {} : { tab: v }, { replace: true });
  const hr = useMemo(() => (p && isSelf ? hubRegistrations(p.id, registrations) : []), [p, isSelf, registrations]);
  const squads = useMemo(() => (p && isSelf && !minor ? hubSquads(p.id, ic) : []), [p, isSelf, minor, ic]);
  const actions = useMemo(() => (p && isSelf ? hubActions(p.id, hr, squads) : []), [p, isSelf, hr, squads]);
  const row = useMemo(() => (p && !minor ? (p.gender === "M" ? RANKING_M : RANKING_F).find((r) => r.player.id === p.id) : undefined), [p, minor]);
  const matches = useMemo(() => (p && !minor ? playerMatches(p.id) : []), [p, minor]);
  const stats = useMemo(() => (p && !minor ? playerStats(p.id, row, matches) : null), [p, minor, row, matches]);
  const history = useMemo(() => (p && !minor && row ? rankHistory(p.id, p.gender) : []), [p, minor, row]);
  const upcoming = useMemo(() => {
    if (!p || (minor && !(isSelf || isStaff))) return [];
    return CALENDAR_EVENTS.filter((e) => ["open", "closed", "live", "upcoming"].includes(eventStatus(e))).flatMap((e) => divisionsForEvent(e).flatMap((d) => allEntries(e, d, ctx).filter((x) => (x.a.id === p.id || x.b.id === p.id) && ["confirmed", "pending", "waitlist"].includes(x.status)).map((x) => ({ e, d, x }))));
  }, [p, minor, isSelf, isStaff, ctx]);
  if (!p) return <NotFound />;
  const club = clubById(p.clubId); const valid = p.licenceExpiry >= DEMO_TODAY; const showLicenceNo = !minor && (isSelf || isStaff);
  const pts = row ? [...row.results].sort((a, b) => a.date.localeCompare(b.date)).reduce<{ d: string; pts: number }[]>((acc, x) => [...acc, { d: fmtDate(x.date), pts: (acc.at(-1)?.pts ?? 0) + x.points }], []) : [];
  const rankSeries = history.map((h) => ({ d: fmtDate(h.asOf, { day: "numeric", month: "short" }), rank: h.rank })).filter((h) => h.rank != null);
  const shownMatches = matches.filter((m) => filter === "all" || (filter === "won" ? m.won : !m.won));
  const nm = (id2: string) => { const q = playerById(id2); return q ? displayName(q) : "—"; };
  return (
    <div className="container-mpl py-6 sm:py-8" data-player-profile={p.id} data-profile-kind={minor ? "minor" : "adult"}>
      <Link to="/rankings" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:min-h-0"><ArrowLeft className="size-4" />{tr("Rankings")}</Link>
      <HubNav playerId={p.id} self={isSelf} current={isSelf ? "profile" : undefined} />
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5">
        <PlayerAvatar name={displayName(p)} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="break-words text-2xl font-bold sm:text-3xl" data-profile-name>{displayName(p)}</h1><DemoBadge label={tr("FICTIONAL PROFILE")} />{isSelf && <Badge variant="outline" className="border-primary/50 text-primary">{tr("Your profile")}</Badge>}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <Link to={`/clubs/${p.clubId}`} className="inline-flex min-h-11 items-center gap-1.5 md:min-h-8 hover:text-foreground hover:underline" data-club-link><ClubAvatar club={club} size={18} />{club?.name}</Link>
            <span>{minor ? `${tr("Junior")} ${p.junior!.group}` : p.gender === "M" ? tr("Men") : tr("Women")}</span>
            <span className={cn("inline-flex items-center gap-1", valid ? "text-success" : "text-destructive")}><BadgeCheck className="size-4" />{valid ? tr("Licence valid 2027") : tr("Licence expired")}</span>
            {showLicenceNo && <span className="font-mono text-xs" data-licence-number>{p.licence}</span>}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground max-sm:w-full max-sm:justify-center" data-visibility-badge>{isSelf ? <><Lock className="size-3.5" />{tr("Private view (you)")}</> : isStaff ? <><ShieldCheck className="size-3.5" />{tr("Staff view")}</> : <><Eye className="size-3.5" />{tr("Public view")}</>}</span>
      </div>

      {minor ? (
        <div className="space-y-5">
          <Alert data-minor-protection><ShieldCheck className="size-4" /><AlertTitle>{tr("Protected junior profile")}</AlertTitle><AlertDescription>{tr("To protect minors, MPL only shows the first name with the initial of the surname, the group and the club. Licence number, date of birth, contact details, results and statistics are never displayed, whoever is looking.")}</AlertDescription></Alert>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={tr("Group")} value={p.junior!.group} icon={<Users className="size-4" />} />
            <StatCard label={tr("Licence")} value={valid ? tr("Valid") : tr("Expired")} hint={tr("Number not displayed")} tone={valid ? "good" : "warn"} icon={<IdCard className="size-4" />} />
            <StatCard label={tr("Ranking")} value="—" hint={tr("Juniors: no points scale yet")} icon={<Medal className="size-4" />} />
          </div>
          <PrivacyPanel minor />
          {(isSelf || isStaff) && <UpcomingList items={upcoming} minor />}
        </div>
      ) : (
        <Tabs value={tabV} onValueChange={setTabV}>
          <TabsList className="no-scrollbar h-12 w-full justify-start overflow-x-auto"><TabsTrigger value="overview">{tr("Overview")}</TabsTrigger><TabsTrigger value="ranking">{tr("Ranking")}</TabsTrigger><TabsTrigger value="matches">{tr("Matches")}</TabsTrigger><TabsTrigger value="tournaments">{tr("Tournaments")}</TabsTrigger><TabsTrigger value="partners">{tr("Partners")}</TabsTrigger>{isSelf && <TabsTrigger value="registrations">{tr("Registrations")}</TabsTrigger>}{isSelf && <TabsTrigger value="interclub">{tr("Interclub")}</TabsTrigger>}</TabsList>
          <TabsContent value="overview" className="mt-5 space-y-5">
            {isSelf && <HubActionList actions={actions} eventName={(i) => evMap.get(i ?? "")?.clubName ?? ""} />}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label={tr("Ranking")} value={row ? `#${row.rank}` : "—"} hint={row ? `${row.prevRank - row.rank >= 0 ? "▲" : "▼"} ${Math.abs(row.prevRank - row.rank)} ${tr("vs previous")}` : tr("Not ranked")} icon={<Medal className="size-4" />} />
              <StatCard label={tr("Points (demo)")} value={row ? row.points.toLocaleString("en-GB") : "—"} hint={tr("Best 8 results counted")} icon={<TrendingUp className="size-4" />} />
              <StatCard label={tr("Tournaments")} value={stats?.tournaments ?? 0} hint={`${stats?.titles ?? 0} ${tr("won")}`} icon={<Trophy className="size-4" />} />
              <StatCard label={tr("Win rate")} value={stats?.winRate != null ? `${stats.winRate}%` : "—"} hint={`${stats?.wins ?? 0} ${tr("wins")} · ${stats?.losses ?? 0} ${tr("losses")}`} icon={<Percent className="size-4" />} />
            </div>
            <section className="rounded-xl border bg-card p-4" data-recent-results aria-labelledby="recent-results"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 id="recent-results" className="font-semibold">{tr("Recent results")}</h2>{matches.length > 3 && <button type="button" className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline md:min-h-8" onClick={() => setTabV("matches")}>{tr("All matches")}</button>}</div>
              {matches.length === 0 ? <p className="text-sm text-muted-foreground" data-empty="recent-results">{tr("No match history in the last 12 months.")}</p> : (
                <ul className="space-y-2">{matches.slice(0, 3).map((m, i) => { const e = evMap.get(m.eventId)!; return (<li key={i} className="flex flex-wrap items-center gap-3 text-sm"><span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold", m.won ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>{m.won ? tr("W") : tr("L")}<span className="sr-only">{m.won ? tr("Won") : tr("Lost")}</span></span><div className="min-w-0 flex-1 basis-48"><p className="break-words font-medium">{tr("vs")} {m.opponents.map(nm).join(" / ")}</p><p className="text-xs text-muted-foreground"><Link to={`/tournaments/${e.id}`} className="hover:underline">{e.clubName}</Link> · {fmtDate(m.date)} · {ROUND_LABEL[m.round]}</p></div><ScoreString score={m.score} /></li>); })}</ul>)}
            </section>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-semibold">{tr("Sport information")}</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {([[tr("Club"), club?.name ?? "—"], [tr("Category"), p.gender === "M" ? tr("Men") : tr("Women")], [tr("Licence"), valid ? tr("Valid") : tr("Expired")], [tr("Valid until"), isSelf || isStaff ? fmtDate(p.licenceExpiry) : tr("Private")], [tr("Licence number"), showLicenceNo ? p.licence : tr("Private")], [tr("Best result"), stats?.bestRound ? ROUND_LABEL[stats.bestRound] : "—"], [tr("Sets won / lost"), stats ? `${stats.setsWon} / ${stats.setsLost}` : "—"], [tr("Matches played"), String(stats?.matches ?? 0)]] as const).map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt><dd className="mt-0.5 break-words font-medium">{v}</dd></div>)}
                </dl></div>
              <PrivacyPanel />
            </div>
          </TabsContent>

          <TabsContent value="ranking" className="mt-5 space-y-5">
            {!row ? <Empty text={tr("No ranked result in the last 12 months.")} /> : <>
              <div className="rounded-xl border bg-card p-4"><h2 className="mb-1 font-semibold">{tr("Rank evolution")}</h2><p className="mb-3 text-xs text-muted-foreground">{tr("Rank at the last six monthly checkpoints (lower is better). Demo points, best-8 rule.")}</p>
                {rankSeries.length < 2 ? <p className="py-8 text-center text-sm text-muted-foreground">{tr("Not enough history to draw an evolution.")}</p> : <div className="h-56" role="img" aria-label={tr("Rank evolution chart")}><ResponsiveContainer width="100%" height="100%"><LineChart data={rankSeries} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" {...AXIS} interval="preserveStartEnd" tickMargin={6} /><YAxis {...AXIS} reversed allowDecimals={false} width={32} axisLine={false} domain={[1, "dataMax + 2"]} /><Tooltip contentStyle={TIP} formatter={(v) => [`#${v}`, tr("Rank")]} /><Line type="monotone" dataKey="rank" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>}</div>
              <div className="rounded-xl border bg-card p-4"><h2 className="mb-1 font-semibold">{tr("Cumulative points")}</h2><p className="mb-3 text-xs text-muted-foreground">{tr("All results, before applying the best-8 rule (illustration, demo points).")}</p>
                <div className="h-56" role="img" aria-label={tr("Cumulative points chart")}><ResponsiveContainer width="100%" height="100%"><LineChart data={pts} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" {...AXIS} interval="preserveStartEnd" tickMargin={6} /><YAxis {...AXIS} width={40} axisLine={false} /><Tooltip contentStyle={TIP} /><Line type="monotone" dataKey="pts" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></div>
              <p className="text-xs text-muted-foreground">{tr("Only the best")} {COUNTED_RESULTS} {tr("results over a rolling 12 months count toward the ranking.")}</p>
            </>}
          </TabsContent>

          <TabsContent value="matches" className="mt-5">
            {matches.length === 0 ? <Empty text={tr("No match history in the last 12 months.")} /> : <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as typeof filter)} variant="outline" size="sm" aria-label={tr("Filter matches")}><ToggleGroupItem value="all" className="min-h-11 min-w-11 md:min-h-8">{tr("All")}</ToggleGroupItem><ToggleGroupItem value="won" className="min-h-11 md:min-h-8">{tr("Won")}</ToggleGroupItem><ToggleGroupItem value="lost" className="min-h-11 md:min-h-8">{tr("Lost")}</ToggleGroupItem></ToggleGroup><DemoBadge label={tr("ILLUSTRATIVE SCORES")} /></div>
              <ul className="space-y-2" aria-label={tr("Match history")}>{shownMatches.map((m, i) => { const e = evMap.get(m.eventId)!; return (
                <li key={i} data-match-result={m.won ? "won" : "lost"} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold", m.won ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")} aria-label={m.won ? tr("Won") : tr("Lost")}>{m.won ? "W" : "L"}</span>
                  <div className="min-w-0 flex-1 basis-56"><p className="break-words text-sm font-medium">{tr("with")} {nm(m.partnerId)} <span className="font-normal text-muted-foreground">{tr("vs")} {m.opponents.map(nm).join(" / ")}</span></p><p className="text-xs text-muted-foreground"><Link to={`/tournaments/${e.id}`} className="hover:underline">{e.clubName}</Link> · {fmtDate(m.date)} · {ROUND_LABEL[m.round]}</p></div>
                  <span className="font-mono text-sm font-semibold num">{m.score}</span></li>); })}</ul>
              {shownMatches.length === 0 && <Empty text={tr("No match in this filter.")} />}
            </>}
          </TabsContent>

          <TabsContent value="tournaments" className="mt-5 space-y-6">
            <UpcomingList items={upcoming} />
            <div><h2 className="mb-2 font-semibold">{tr("Tournaments played")}</h2>{!row ? <Empty text={tr("No ranked result in the last 12 months.")} /> : <ul className="space-y-2">{row.results.map((x, i) => { const e = evMap.get(x.eventId)!; return (<li key={i} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"><CategoryBadge category={e.category} /><div className="min-w-0 flex-1 basis-48"><Link to={`/tournaments/${e.id}`} className="block break-words font-medium hover:underline">{e.clubName}</Link><p className="text-xs text-muted-foreground">{fmtDate(x.date)} · {ROUND_LABEL[x.round]} {tr("· with")} {nm(x.partner)}</p></div><span className="text-lg font-bold num">{x.points}</span>{x.counted ? <Badge className="bg-success/15 text-success hover:bg-success/15">{tr("counted")}</Badge> : <Badge variant="secondary">{tr("not counted")}</Badge>}</li>); })}</ul>}</div>
          </TabsContent>

          <TabsContent value="registrations" className="mt-5"><HubRegistrationList items={hr} /></TabsContent>
          <TabsContent value="interclub" className="mt-5"><HubSquadList items={squads} /></TabsContent>

          <TabsContent value="partners" className="mt-5">
            {!stats || stats.partners.length === 0 ? <Empty text={tr("No previous partner in the last 12 months.")} /> : <ul className="space-y-2" aria-label={tr("Previous partners")}>{stats.partners.map((s) => { const q = playerById(s.partnerId)!; return (<li key={s.partnerId} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"><PlayerAvatar name={displayName(q)} size={36} /><div className="min-w-0 flex-1 basis-40"><Link to={`/players/${q.id}`} className="block break-words font-medium hover:underline">{displayName(q)}</Link><p className="text-xs text-muted-foreground">{clubById(q.clubId)?.name} · {tr("last played")} {fmtDate(s.last)}</p></div><div className="text-right text-sm"><p className="font-semibold num">{s.tournaments} {s.tournaments > 1 ? tr("tournaments") : tr("tournament")}</p><p className="text-xs text-muted-foreground">{tr("best:")} {ROUND_LABEL[s.best]} · {s.wins}/{s.matches} {tr("matches won")}</p></div></li>); })}</ul>}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>; }
function PrivacyPanel({ minor }: { minor?: boolean }) {
  const rows: Array<[string, string, boolean]> = minor
    ? [[tr("Visible to everyone"), tr("First name + surname initial, group, club, licence validity (yes / no)"), true], [tr("Never displayed"), tr("Licence number, date of birth, contact details, results, statistics, ranking"), false]]
    : [[tr("Visible to everyone"), tr("Name, club, ranking, points, results, matches, partners, licence validity"), true], [tr("Private (you and MPL staff)"), tr("Licence number and expiry date"), false], [tr("Never displayed"), tr("Contact details and date of birth"), false]];
  return (<div className="rounded-xl border bg-card p-4" data-privacy-panel><h2 className="mb-3 flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-primary" />{tr("What others can see")}</h2><ul className="space-y-2.5 text-sm">{rows.map(([k, v, pub]) => <li key={k} className="flex gap-2.5">{pub ? <Eye className="mt-0.5 size-4 shrink-0 text-success" /> : <EyeOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}<div><p className="font-medium">{k}</p><p className="text-xs text-muted-foreground">{v}</p></div></li>)}</ul></div>);
}
function UpcomingList({ items, minor }: { items: Array<{ e: (typeof CALENDAR_EVENTS)[number]; d: ReturnType<typeof divisionsForEvent>[number]; x: ReturnType<typeof allEntries>[number] }>; minor?: boolean }) {
  return (<div data-upcoming><h2 className="mb-2 flex items-center gap-2 font-semibold"><CalendarClock className="size-4 text-muted-foreground" />{tr("Upcoming tournaments")}</h2>
    {items.length === 0 ? <Empty text={tr("No upcoming registration.")} /> : <ul className="space-y-2">{items.map(({ e, d, x }) => (<li key={e.id + d} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"><CategoryBadge category={e.category} /><div className="min-w-0 flex-1 basis-48"><Link to={`/tournaments/${e.id}`} className="block break-words font-medium hover:underline">{e.clubName}</Link><p className="text-xs text-muted-foreground">{fmtRange(e)} · {DIVISION_LABEL[d]}{minor ? "" : ` · ${displayName(x.a)} / ${displayName(x.b)}`}</p></div><Badge variant="outline">{trDyn(STATUS_TXT[x.status] ?? x.status)}{x.status === "waitlist" && x.waitRank ? ` #${x.waitRank}` : ""}</Badge></li>))}</ul>}</div>);
}
