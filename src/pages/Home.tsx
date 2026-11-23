import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarCheck2, Clock3, Layers, MapPin, Radio, Search, Swords, Trophy, UserRound, Users2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryBadge, ClubAvatar, DemoBadge, EventCard, PlayerAvatar, SectionHeader, Trend } from "@/components/mpl/bits";
import { ScoreString } from "@/components/mpl/SetScores";
import { ClubMap } from "@/components/mpl/ClubMap";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { CLUBS } from "@/data/clubs";
import { RANKING_F, RANKING_M, playerById, shortLabel } from "@/data/demo";
import { DEFAULT_DIVISIONS } from "@/interclub/capacity";
import { DEMO_TODAY, eventStatus, fmtDate } from "@/lib/format";
import { useI18n, tr } from "@/lib/i18n";
import { useDemo } from "@/lib/demo-store";
import { SPONSOR_ASSETS } from "@/data/sponsors";
import { latestResults, liveEvents, nextEvents, openEvents } from "@/lib/public-data";

const CATEGORIES = ["M25", "M50", "M100", "M250", "M500", "M1000", "M1500"];
const pair = (ids: [string, string]) => ids.map((i) => { const p = playerById(i); return p ? shortLabel(p) : ""; }).join(" / ");
export default function Home() {
  const { t } = useI18n(); const nav = useNavigate(); const [q, setQ] = useState(""); const { ic } = useDemo();
  const live = useMemo(() => liveEvents(), []); const next = useMemo(() => nextEvents(6), []); const openCount = useMemo(() => CALENDAR_EVENTS.filter((e) => eventStatus(e) === "open").length, []);
  const results = useMemo(() => latestResults(6), []); const firstOpen = useMemo(() => openEvents(1)[0], []);
  const stats = useMemo(() => [
    { n: CALENDAR_EVENTS.length, l: "events in 2027", i: CalendarCheck2 }, { n: CLUBS.length, l: "partner clubs", i: MapPin },
    { n: new Set(CALENDAR_EVENTS.map((e) => e.category)).size, l: "categories", i: Layers }, { n: 4, l: "regions", i: Users2 },
  ], []);
  const run = ic.d2.run; const icTeams = run ? new Set(run.ties.flatMap((x) => [x.home, x.away])).size : 0;
  const confirmedPartners = SPONSOR_ASSETS.filter((s) => s.status === "confirmed-2027");
  const onSearch = (e: React.FormEvent) => { e.preventDefault(); nav(`/calendar?q=${encodeURIComponent(q)}`); };
  return (
    <>
      {/* Héros : « îlot sombre » dans les deux thèmes (classe dark) — le texte clair repose toujours sur le voile sombre de l'image (voir tests/unit/contrast.test.ts). */}
      <section className="dark relative isolate overflow-hidden border-b" data-contrast-skip="hero-overlay" data-home-hero>
        <img src="/assets/brand/hero-background.png" alt="" className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10" style={{ background: "var(--hero-overlay)" }} />
        <div className="container-mpl py-12 sm:py-16 lg:py-20">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-widest text-white/90 backdrop-blur"><span className="size-1.5 rounded-full bg-primary" />{tr("MAURITIUS PADEL LEAGUE · SEASON 2027")}</p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl">{tr("Compete. Climb.")}<br /><span className="text-primary">{tr("Own the Indian Ocean.")}</span></h1>
          <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">{tr("The national padel circuit of Mauritius: find a tournament, register in minutes, follow draws and track your ranking.")}</p>
          <form onSubmit={onSearch} role="search" className="mt-7 flex max-w-xl gap-2 rounded-2xl border border-white/15 bg-black/30 p-2 backdrop-blur focus-within:ring-2 focus-within:ring-primary">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/60" /><Input value={q} onChange={(e) => setQ(e.target.value)} aria-label={tr("Search tournaments")} placeholder={tr("Club, category, month…")} className="h-11 border-0 bg-transparent pl-9 text-white placeholder:text-white/50 focus-visible:ring-0" /></div>
            <Button type="submit" size="lg">{tr("Search")}</Button>
          </form>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/calendar">{t("cta.viewCalendar")} <ArrowRight className="ml-1 size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"><Link to="/rankings">{t("cta.rankings")}</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"><Link to="/interclub-public">{tr("Interclub portal")}</Link></Button>
          </div>
          <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (<div key={tr(s.l)} className="rounded-xl border border-white/10 bg-black/25 p-4 backdrop-blur"><s.i className="mb-2 size-4 text-primary" /><dt className="sr-only">{tr(s.l)}</dt><dd className="text-3xl font-bold text-white num">{s.n}</dd><p className="text-xs text-white/70">{tr(s.l)}</p></div>))}
          </dl>
        </div>
      </section>

      <section className="container-mpl py-8" aria-labelledby="home-spaces" data-home-spaces>
        <h2 id="home-spaces" className="sr-only">{tr("Your space")}</h2>
        <div className="grid [&>*]:min-w-0 gap-3 md:grid-cols-3">
          {([[UserRound, "/player", "Player space", "Registrations, profile, notifications and results."], [Building2, "/club", "Club space", "Request a tournament, manage registrations and courts."], [MapPin, "/clubs", "Club directory", "Find a club: courts, events and Interclub teams."]] as const).map(([Icon, to, title, text]) => (
            <Link key={to} to={to} className="group flex min-h-16 items-center gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/60 hover:bg-accent/30">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><Icon className="size-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold">{tr(title)}</span><span className="block text-sm text-muted-foreground">{tr(text)}</span></span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
            </Link>))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{tr("Demonstration: the player and club spaces open with a demo profile, no real account.")}</p>
      </section>

      <section className="container-mpl pb-10" data-home-live>
        <SectionHeader eyebrow={tr("Happening now")} title={tr("Tournaments in progress")} className="mb-3" />
        {live.length > 0
          ? <div className="grid [&>*]:min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-3">{live.map((e) => <EventCard key={e.id} e={e} />)}</div>
          : <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground" data-empty="live"><Radio className="size-4 shrink-0" /><span className="min-w-0 flex-1">{tr("No tournament is in progress on the demonstration date")} ({fmtDate(DEMO_TODAY, { day: "numeric", month: "long", year: "numeric" })}).{next[0] ? ` ${tr("Next tournament:")} ${next[0].category.replace("MIXTE ", tr("Mixed "))} · ${next[0].clubName}, ${fmtDate(next[0].start)}.` : ""}</span></div>}
      </section>

      <section className="container-mpl pb-12" data-home-next>
        <SectionHeader eyebrow={tr("Coming up")} title={tr("Next tournaments to join")} className="mb-3" action={<Button asChild variant="ghost"><Link to="/calendar">{tr("Full calendar")} <ArrowRight className="ml-1 size-4" /></Link></Button>} />
        <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"><span><strong className="text-foreground num">{openCount}</strong> {tr("events open for registration")}</span>{firstOpen && <Link to="/calendar?status=open" className="inline-flex min-h-11 items-center md:min-h-8 font-medium text-primary underline-offset-4 hover:underline">{tr("All open events")}</Link>}</p>
        <div className="grid [&>*]:min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-3">{next.map((e) => <EventCard key={e.id} e={e} />)}</div>
        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><Clock3 className="mt-0.5 size-3.5 shrink-0" />{tr("Registrations open 21 days before the event and close 7 days before (draw day). Events further away are shown as “Upcoming”.")}</p>
      </section>

      <section className="border-y bg-card/40" data-home-results>
        <div className="container-mpl py-12">
          <SectionHeader eyebrow={tr("Latest results")} title={tr("Recent winners")} className="mb-3" action={<DemoBadge label={tr("FICTIONAL RESULTS")} />} />
          {results.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground" data-empty="results">{tr("No result is available yet.")}</p> : (
            <ul className="grid [&>*]:min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {results.map((r) => (
                <li key={r.event.id + r.draw}><Link to={`/tournaments/${r.event.id}`} className="block rounded-xl border bg-card p-4 transition hover:border-primary/60" data-result-card>
                  <div className="flex flex-wrap items-center gap-2"><CategoryBadge category={r.event.category} /><span className="text-xs text-muted-foreground">{r.draw === "M" ? tr("Men") : tr("Women")} · {fmtDate(r.event.end)}</span></div>
                  <p className="mt-2 flex items-start gap-2 break-words font-semibold"><Trophy className="mt-0.5 size-4 shrink-0 text-gold" />{pair(r.winner)}</p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{tr("beat")} {pair(r.finalist)} <ScoreString score={r.score} /></p>
                  <p className="mt-2 text-xs text-muted-foreground">{r.event.clubName}</p>
                </Link></li>))}
            </ul>)}
          <p className="mt-3 text-xs text-muted-foreground">{tr("Winners and scores shown here are fictional demonstration data.")}</p>
        </div>
      </section>

      <section className="container-mpl grid gap-8 py-12 lg:grid-cols-2" data-home-rankings>
        {([["Men", RANKING_M], ["Women", RANKING_F]] as const).map(([label, rows]) => (
          <div key={label} className="min-w-0">
            <SectionHeader eyebrow={tr("Rankings · Top 8 results counted")} title={`${tr(label)} — Top 5`} className="mb-3" action={<DemoBadge label={tr("DEMO DATA")} />} />
            <ol className="divide-y rounded-xl border bg-card">
              {rows.slice(0, 5).map((r) => (
                <li key={r.player.id}><Link to={`/players/${r.player.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 transition hover:bg-accent/30">
                  <span className="w-6 text-center text-lg font-bold text-primary num">{r.rank}</span><PlayerAvatar name={r.player.name} size={34} />
                  <div className="min-w-0 flex-1"><p className="break-words font-semibold">{r.player.name}</p><p className="break-words text-xs text-muted-foreground">{CLUBS.find((c) => c.id === r.player.clubId)?.name}</p></div>
                  <Trend now={r.rank} prev={r.prevRank} /><span className="w-16 text-right font-bold num">{r.points.toLocaleString("en-GB")}<span className="ml-0.5 text-xs font-normal text-muted-foreground">{tr("pts")}</span></span>
                </Link></li>
              ))}
            </ol>
            <Button asChild variant="ghost" className="mt-2"><Link to="/rankings">{tr("Full ranking")} <ArrowRight className="ml-1 size-4" /></Link></Button>
          </div>
        ))}
      </section>

      <section className="border-y bg-card/40" data-home-clubs>
        <div className="container-mpl py-12">
          <SectionHeader eyebrow={tr("Clubs")} title={tr("18 clubs across the island")} action={<Button asChild variant="ghost"><Link to="/clubs">{tr("Club directory")} <ArrowRight className="ml-1 size-4" /></Link></Button>} />
          <div className="grid [&>*]:min-w-0 gap-5 lg:grid-cols-[1.4fr_1fr]">
            <ClubMap height={380} />
            <ul className="grid [&>*]:min-w-0 max-h-[380px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {CLUBS.map((c) => (
                <li key={c.id}><Link to={`/clubs/${c.id}`} className="flex min-h-14 items-center gap-3 rounded-lg border bg-card p-2.5 transition hover:border-primary/60"><ClubAvatar club={c} size={34} /><div className="min-w-0"><p className="break-words text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.zone.charAt(0) + c.zone.slice(1).toLowerCase()} · {c.events} {tr("events")}</p></div></Link></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-mpl py-12" data-home-interclub>
        <SectionHeader eyebrow={tr("Team competition")} title={tr("Interclub 2027")} action={<DemoBadge label={tr("FICTIONAL DATA — PROTOTYPE")} />} className="mb-3" />
        <div className="grid [&>*]:min-w-0 gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[1.4fr_1fr]">
          <div><p className="text-sm text-muted-foreground">{tr("The Interclub championship brings clubs together in divisions, pools and final phases. Follow the calendar, results, standings and final phases in the public portal.")}</p>
            <div className="mt-4 flex flex-wrap gap-2"><Button asChild className="max-w-full whitespace-normal"><Link to="/interclub-public"><Swords className="mr-1.5 size-4" />{tr("Divisions and results")}</Link></Button></div></div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[[DEFAULT_DIVISIONS.length, tr("divisions")], [run ? icTeams : "—", tr("teams")], [run ? run.ties.length : "—", tr("ties scheduled")]].map(([n, l]) => (<div key={String(l)} className="rounded-lg border p-3"><dd className="text-2xl font-bold num">{n}</dd><dt className="text-xs text-muted-foreground">{l}</dt></div>))}
          </dl>
        </div>
        {!run && <p className="mt-2 text-xs text-muted-foreground" data-empty="interclub">{tr("The Interclub demonstration calendar has not been generated yet.")}</p>}
      </section>

      <section className="container-mpl pb-10" data-home-levels>
        <SectionHeader eyebrow={tr("The circuit")} title={tr("Find your level")} className="mb-3" />
        <ul className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (<li key={c}><Link to={`/calendar?category=${c}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-3 transition hover:border-primary/60"><CategoryBadge category={c} /><span className="text-xs text-muted-foreground num">{CALENDAR_EVENTS.filter((e) => e.category === c).length} {tr("events")}</span></Link></li>))}
          <li><Link to="/calendar?category=MIXTE" className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-3 transition hover:border-primary/60"><CategoryBadge category="MIXTE 250" /><span className="text-xs text-muted-foreground">{tr("Mixed 250 / 500")}</span></Link></li>
          <li><Link to="/calendar?category=JUNIOR" className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-3 transition hover:border-primary/60"><CategoryBadge category="JUNIOR" /><span className="text-xs text-muted-foreground">{tr("U11 / U13 / U15")}</span></Link></li>
        </ul>
      </section>

      <section className="container-mpl pb-14" data-home-partners>
        <SectionHeader eyebrow={tr("Partners")} title={tr("Confirmed partners")} className="mb-3" />
        {confirmedPartners.length > 0
          ? <ul className="grid [&>*]:min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">{confirmedPartners.map((s) => <li key={s.id} className="grid h-24 place-items-center rounded-xl border bg-white p-3"><img src={s.file} alt={s.name} className="max-h-16 w-auto object-contain" /></li>)}</ul>
          : <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground" data-empty="partners"><p className="font-medium text-foreground">{tr("No 2027 partner is confirmed yet.")}</p><p className="mt-1">{tr("Partners will appear here once their agreement with MPL is confirmed.")}</p></div>}
      </section>
    </>
  );
}
