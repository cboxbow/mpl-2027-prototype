import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClubAvatar } from "@/components/mpl/bits";
import { ClubMap } from "@/components/mpl/ClubMap";
import { PageHeader } from "@/components/mpl/PageHeader";
import { CLUBS, ZONES } from "@/data/clubs";
import type { Zone } from "@/data/calendar.generated";
import { DEMO_TODAY, fmtDate } from "@/lib/format";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ZONE_LIST = Object.keys(ZONES) as Zone[];
/** 5B-2 — Annuaire public des clubs : région, recherche, carte, prochain tournoi. Données du calendrier 2027 uniquement. */
export default function Clubs() {
  const [sp, setSp] = useSearchParams(); const q = sp.get("q") ?? ""; const zone = sp.get("zone") ?? "all";
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (!v || v === "all") n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const rows = useMemo(() => CLUBS.filter((c) => (zone === "all" || c.zone === zone) && (!q || `${c.name} ${c.locality ?? ""}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name)), [q, zone]);
  const nextOf = (id: string) => CALENDAR_EVENTS.filter((e) => e.club === id && e.start > DEMO_TODAY).sort((a, b) => a.start.localeCompare(b.start))[0];
  return (
    <div className="container-mpl py-8" data-clubs-page>
      <PageHeader eyebrow={tr("Season 2027")} title={tr("MPL clubs")} description={tr("Every club that hosts MPL tournaments in 2027: region, courts and upcoming events.")} />
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]" role="search">
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={tr("Search a club")} value={q} onChange={(e) => set("q", e.target.value)} placeholder={tr("Search a club or a town…")} className="pl-9" /></div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label={tr("Region filter")}>
          {["all", ...ZONE_LIST].map((z) => (<button key={z} type="button" onClick={() => set("zone", z)} aria-pressed={zone === z} className={cn("min-h-11 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition md:min-h-9", zone === z ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary/50 hover:text-foreground")}>{z === "all" ? tr("All regions") : ZONES[z as Zone].label}</button>))}
        </div>
      </div>
      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite"><strong className="text-foreground num">{rows.length}</strong> {tr("of")} {CLUBS.length} {tr("clubs")}</p>
      {rows.length > 0 && <div className="mb-6"><ClubMap clubs={rows} height={300} /></div>}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center" data-empty="clubs"><p className="font-semibold">{tr("No club matches these filters")}</p><p className="mt-1 text-sm text-muted-foreground">{tr("Try another town or region.")}</p><Button className="mt-4" onClick={() => setSp({}, { replace: true })}>{tr("Clear filters")}</Button></div>
      ) : (
        <ul className="grid [&>*]:min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => { const n = nextOf(c.id); return (
            <li key={c.id}><Link to={`/clubs/${c.id}`} className="flex h-full min-h-24 items-start gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/60 hover:bg-accent/30" data-club-card={c.id}>
              <ClubAvatar club={c} size={44} />
              <div className="min-w-0 flex-1"><p className="break-words font-semibold">{c.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3.5 shrink-0" />{c.locality ? `${c.locality} · ` : ""}{ZONES[c.zone].label}</p>
                <p className="mt-2 text-xs text-muted-foreground"><span className="num">{c.events}</span> {tr("events in 2027")} · {tr("up to")} <span className="num">{c.courtsMax}</span> {tr("courts")}</p>
                <p className="mt-1 text-xs">{n ? <>{tr("Next:")} <span className="font-medium">{n.category.replace("MIXTE ", tr("Mixed "))} · {fmtDate(n.start)}</span></> : <span className="text-muted-foreground">{tr("No upcoming event")}</span>}</p></div>
            </Link></li>); })}
        </ul>
      )}
    </div>
  );
}
