import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, LayoutGrid, MapPin, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryBadge, ClubAvatar, EventCard } from "@/components/mpl/bits";
import { ClubMap } from "@/components/mpl/ClubMap";
import { ScoreString } from "@/components/mpl/SetScores";
import { clubById, ZONES } from "@/data/clubs";
import { playerById, shortLabel } from "@/data/demo";
import { DEMO_TODAY, eventStatus, fmtDate } from "@/lib/format";
import { clubEvents, latestResults } from "@/lib/public-data";
import { useDemo } from "@/lib/demo-store";
import { tr } from "@/lib/i18n";
import NotFound from "./NotFound";

const pair = (ids: [string, string]) => ids.map((i) => { const p = playerById(i); return p ? shortLabel(p) : ""; }).join(" / ");
/** 5B-2 — Fiche publique d'un club : région, terrains, tournois accueillis, équipes Interclub. Aucune coordonnée n'est inventée : seules les données existantes sont affichées. */
export default function ClubPublic() {
  const { id } = useParams(); const club = id ? clubById(id) : undefined; const { ic } = useDemo();
  const evs = useMemo(() => (club ? clubEvents(club.id) : []), [club]);
  const teams = useMemo(() => { const t = new Set((ic.d2.run?.ties ?? []).flatMap((x) => [x.home, x.away]).filter((x) => x.split("|")[0] === club?.id)); return [...t].map((x) => x.split("|")[1]).sort(); }, [ic, club]);
  if (!club) return <NotFound />;
  const upcoming = evs.filter((e) => e.end >= DEMO_TODAY && eventStatus(e) !== "cancelled"); const past = evs.filter((e) => e.end < DEMO_TODAY);
  const results = latestResults(3, club.id);
  return (
    <div className="container-mpl py-6 sm:py-8" data-club-public={club.id}>
      <Link to="/clubs" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:min-h-0"><ArrowLeft className="size-4" />{tr("Clubs")}</Link>
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5">
        <ClubAvatar club={club} size={64} />
        <div className="min-w-0 flex-1 basis-48"><h1 className="break-words text-2xl font-bold sm:text-3xl">{club.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="size-4" />{club.locality ? `${club.locality} · ` : ""}{ZONES[club.zone].label}</span><span className="inline-flex items-center gap-1"><LayoutGrid className="size-4" />{tr("up to")} <span className="num">{club.courtsMax}</span> {tr("courts")}</span></p></div>
        <Button asChild variant="outline" className="w-full sm:w-auto"><a href={`https://www.google.com/maps/search/?api=1&query=${club.lat},${club.lng}`} target="_blank" rel="noreferrer noopener"><MapPin className="mr-1.5 size-4" />{tr("Open in Maps")}<ExternalLink className="ml-1.5 size-3.5" /></a></Button>
      </div>

      <div className="grid [&>*]:min-w-0 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section aria-labelledby="club-events" data-club-events>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><h2 id="club-events" className="text-xl font-bold">{tr("Tournaments hosted")}</h2><Button asChild variant="ghost" className="min-h-11"><Link to={`/calendar?club=${club.id}`}>{tr("Club calendar")}</Link></Button></div>
            <p className="mb-3 text-sm text-muted-foreground"><strong className="text-foreground num">{evs.length}</strong> {tr("events in 2027")} · <span className="num">{upcoming.length}</span> {tr("upcoming")} · <span className="num">{past.length}</span> {tr("completed")}</p>
            {upcoming.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground" data-empty="club-upcoming">{tr("No upcoming tournament at this club.")}</p>
              : <div className="grid [&>*]:min-w-0 gap-2.5 sm:grid-cols-2">{upcoming.slice(0, 6).map((e) => <EventCard key={e.id} e={e} compact hideClub />)}</div>}
            {upcoming.length > 6 && <p className="mt-2 text-xs text-muted-foreground">{upcoming.length - 6} {tr("more in the club calendar.")}</p>}
          </section>
          <section aria-labelledby="club-results" data-club-results>
            <h2 id="club-results" className="mb-3 text-xl font-bold">{tr("Latest results")}</h2>
            {results.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground" data-empty="club-results">{tr("No result is available for this club yet.")}</p> : (
              <ul className="grid [&>*]:min-w-0 gap-2.5 sm:grid-cols-2">{results.map((r) => (<li key={r.event.id + r.draw}><Link to={`/tournaments/${r.event.id}`} className="block rounded-xl border bg-card p-3 transition hover:border-primary/60"><div className="flex flex-wrap items-center gap-2"><CategoryBadge category={r.event.category} /><span className="text-xs text-muted-foreground">{r.draw === "M" ? tr("Men") : tr("Women")} · {fmtDate(r.event.end)}</span></div><p className="mt-1.5 flex items-start gap-2 break-words text-sm font-semibold"><Trophy className="mt-0.5 size-4 shrink-0 text-gold" />{pair(r.winner)}</p><p className="mt-1"><ScoreString score={r.score} /></p></Link></li>))}</ul>)}
            <p className="mt-2 text-xs text-muted-foreground">{tr("Winners and scores shown here are fictional demonstration data.")}</p>
          </section>
          <section aria-labelledby="club-interclub" data-club-interclub>
            <h2 id="club-interclub" className="mb-3 text-xl font-bold">{tr("Interclub teams")}</h2>
            {teams.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground" data-empty="club-interclub">{tr("No Interclub team is published for this club in the demonstration.")}</p> : (
              <ul className="flex flex-wrap gap-2">{teams.map((d) => (<li key={d}><Link to={`/interclub-public?club=${club.id}&division=${d}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-3.5 text-sm font-medium transition hover:border-primary/60"><Swords className="size-4 text-primary" />{d}</Link></li>))}</ul>)}
            <p className="mt-2 text-xs text-muted-foreground">{tr("Interclub data is fictional and not official.")}</p>
          </section>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-4"><h2 className="mb-2 font-semibold">{tr("Location")}</h2><ClubMap clubs={[club]} height={220} /></div>
          <div className="rounded-2xl border bg-card p-4 text-sm" data-club-contact><h2 className="mb-2 font-semibold">{tr("Contact")}</h2>
            <p className="text-muted-foreground">{tr("Phone and e-mail are not available in the prototype data.")}</p>
            <Button asChild variant="outline" className="mt-3 w-full"><a href={`https://www.google.com/maps/search/?api=1&query=${club.lat},${club.lng}`} target="_blank" rel="noreferrer noopener"><MapPin className="mr-1.5 size-4" />{tr("Get directions")}</a></Button><Button asChild variant="ghost" className="mt-1 w-full"><Link to={`/rankings?club=${club.id}`} data-club-ranking-link>{tr("Players of this club in the ranking")}</Link></Button></div>
        </aside>
      </div>
    </div>
  );
}
