import { useMemo, useState } from "react";
import { tr } from "@/lib/i18n";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, List, Search, SlidersHorizontal, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CategoryBadge, EventCard, StatusBadge } from "@/components/mpl/bits";
import { PageHeader } from "@/components/mpl/PageHeader";
import { DIVISION_FILTERS, PERIOD_FILTERS, matchesDivision, matchesPeriod, type DivisionFilter, type PeriodFilter } from "@/lib/public-data";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { CLUBS, clubById } from "@/data/clubs";
import { eventStatus, monthKey, monthLabel, fmtRange, daysBetween } from "@/lib/format";
import { DEMO_TODAY } from "@/config/demo-config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATS = ["M25", "M50", "M100", "M250", "M500", "MIXTE", "M1000", "M1500", "JUNIOR"];
const ALL = "all";
export default function CalendarPage() {
  const [sp, setSp] = useSearchParams(); const view: "list" | "month" = sp.get("view") === "month" ? "month" : "list";
  const DIV_LABEL: Record<DivisionFilter, string> = { M: tr("Men"), F: tr("Women"), X: tr("Mixed"), JUNIOR: tr("Juniors") }; const PERIOD_LABEL: Record<PeriodFilter, string> = { next30: tr("Next 30 days"), next90: tr("Next 90 days"), past: tr("Past events") };
  const q = sp.get("q") ?? ""; const category = sp.get("category") ?? ALL; const club = sp.get("club") ?? ALL; const zone = sp.get("zone") ?? ALL; const status = sp.get("status") ?? ALL; const division = sp.get("division") ?? ALL; const period = sp.get("period") ?? ALL;
  const months = useMemo(() => [...new Set(CALENDAR_EVENTS.map((e) => monthKey(e.start)))], []);
  const [month, setMonth] = useState(() => (months.includes(monthKey(DEMO_TODAY)) ? monthKey(DEMO_TODAY) : months[0])); const [moreOpen, setMoreOpen] = useState(false);
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (!v || v === ALL) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const filtered = useMemo(() => CALENDAR_EVENTS.filter((e) => {
    if (category !== ALL && !(category === "MIXTE" ? e.category.startsWith("MIXTE") : e.category === category)) return false;
    if (division !== ALL && DIVISION_FILTERS.includes(division as DivisionFilter) && !matchesDivision(e, division as DivisionFilter)) return false;
    if (period !== ALL && PERIOD_FILTERS.includes(period as PeriodFilter) && !matchesPeriod(e, period as PeriodFilter)) return false;
    if (club !== ALL && e.club !== club) return false; if (zone !== ALL && e.zone !== zone) return false; if (status !== ALL && eventStatus(e) !== status) return false;
    if (q) { const s = q.toLowerCase(); const c = clubById(e.club); if (![e.category, e.clubName, c?.locality ?? "", e.zone, monthLabel(monthKey(e.start))].some((x) => x.toLowerCase().includes(s))) return false; }
    return true;
  }), [q, category, club, zone, status, division, period]);
  // 5B-1 : la liste s'ouvre sur les prochaines épreuves (à partir de la date de démo) et se parcourt par fenêtres de 3 mois ; ?from=AAAA-MM-JJ mémorise la position (partageable).
  const PAGE = 3; const fromParam = sp.get("from"); const validFrom = !!fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam);
  const groupBy = (list: typeof filtered) => { const m = new Map<string, typeof filtered>(); list.forEach((e) => { const k = monthKey(e.start); (m.get(k) ?? m.set(k, []).get(k)!).push(e); }); return [...m.entries()]; };
  const allMonths = useMemo(() => [...new Set(filtered.map((e) => monthKey(e.start)))], [filtered]);
  const defaultFrom = status === "completed" || period === "past" ? "0000-01-01" : DEMO_TODAY;
  let fromDate = validFrom ? fromParam! : defaultFrom;
  if (!validFrom && filtered.length > 0 && !filtered.some((e) => e.end >= fromDate)) fromDate = (allMonths[Math.max(0, allMonths.length - PAGE)] ?? "0000-01") + "-01"; // filtre ne contenant que du passé : on montre les derniers mois
  const upcomingMode = !validFrom;
  const fromList = useMemo(() => filtered.filter((e) => e.end >= fromDate), [filtered, fromDate]);
  const groups = useMemo(() => groupBy(fromList), [fromList]);
  const grouped = groups.slice(0, PAGE); const shownCount = grouped.reduce((n, [, l]) => n + l.length, 0);
  const beforeCount = filtered.length - fromList.length; const laterCount = fromList.length - shownCount;
  const firstShown = grouped[0]?.[0]; const lastShown = grouped[grouped.length - 1]?.[0];
  const goEarlier = () => { const idx = firstShown ? allMonths.indexOf(firstShown) : 0; go(allMonths[Math.max(0, idx - PAGE)] + "-01"); };
  const goLater = () => { const nxt = groups[PAGE]?.[0]; if (nxt) go(nxt + "-01"); };
  function go(v?: string) { set("from", v ?? ""); requestAnimationFrame(() => document.getElementById("cal-list")?.scrollIntoView({ block: "start" })); }
  const active = [q, category, club, zone, status, division, period].some((v) => v && v !== ALL); const moreCount = [club, zone, status, division, period].filter((v) => v && v !== ALL).length;
  const chips = ([["q", q ? `“${q}”` : ""], ["category", category === ALL ? "" : category === "MIXTE" ? tr("Mixed") : category], ["club", club === ALL ? "" : clubById(club)?.name ?? club], ["zone", zone === ALL ? "" : zone.charAt(0) + zone.slice(1).toLowerCase()], ["status", status === ALL ? "" : status === "open" ? tr("Registration open") : status === "closed" ? tr("Registration closed") : status === "upcoming" ? tr("Upcoming") : status === "completed" ? tr("Completed") : status === "cancelled" ? tr("Cancelled") : status], ["division", DIV_LABEL[division as DivisionFilter] ?? ""], ["period", PERIOD_LABEL[period as PeriodFilter] ?? ""]] as Array<[string, string]>).filter(([, l]) => l);
  const nextEv = view === "list" && upcomingMode ? fromList.find((e) => e.start > DEMO_TODAY && eventStatus(e) !== "cancelled") : undefined; const nextIn = nextEv ? daysBetween(DEMO_TODAY, nextEv.start) : 0;
  const exportCsv = () => {
    const rows = [["id", "start", "end", "club", "zone", "category", "format", "courts"], ...filtered.map((e) => [e.id, e.start, e.end, e.clubName, e.zone, e.category, e.format, String(e.courts)])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mpl-2027-calendar-filtered.csv"; a.click(); toast.success(`${filtered.length} ${tr("events exported")}`);
  };
  return (
    <div className="container-mpl py-8">
      <PageHeader eyebrow={tr("Season 2027 · Calendar V4")} title={tr("Tournament calendar")} className="mb-4" actions={<>
          <ToggleGroup type="single" value={view} onValueChange={(v) => { if (!v) return; const n = new URLSearchParams(sp); if (v === "month") n.set("view", "month"); else n.delete("view"); setSp(n, { replace: true }); }} variant="outline" aria-label={tr("View")}>
            <ToggleGroupItem value="list" aria-label={tr("List view")} className="min-h-11 md:min-h-9"><List className="mr-1.5 size-4" />{tr("List")}</ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label={tr("Month view")} className="min-h-11 md:min-h-9"><CalendarDays className="mr-1.5 size-4" />{tr("Month")}</ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" onClick={exportCsv} aria-label={tr("Export CSV")} className="min-h-11 md:min-h-9"><Download className="size-4 sm:mr-1.5" /><span className="hidden sm:inline">{tr("Export CSV")}</span></Button>
        </>} />

      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground" aria-live="polite"><span><strong className="text-foreground num">{filtered.length}</strong> {tr("of")} {CALENDAR_EVENTS.length} {tr("events")}{view === "list" && grouped.length > 0 && <span className="ml-1">· {tr("showing")} <strong className="text-foreground num">{shownCount}</strong> ({monthLabel(firstShown!)}{lastShown !== firstShown ? ` – ${monthLabel(lastShown!)}` : ""})</span>}</span>{active && <button onClick={() => setSp({}, { replace: true })} className="inline-flex min-h-11 items-center gap-1 px-2 font-medium text-primary md:min-h-0"><X className="size-3" />{tr("Clear filters")}</button>}</div>
      <div className="sticky top-16 z-30 -mx-4 mb-5 space-y-2 border-b bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4 sm:py-3" data-filters>
        <div className="flex gap-2 md:grid md:grid-cols-3 xl:grid-cols-[1.4fr_repeat(5,1fr)]">
          <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={tr("Search")} value={q} onChange={(e) => set("q", e.target.value)} placeholder={tr("Search club, month, category…")} className="pl-9" /></div>
          <Button variant="outline" className="shrink-0 md:hidden" aria-expanded={moreOpen} aria-controls="more-filters" onClick={() => setMoreOpen((o) => !o)}><SlidersHorizontal className="mr-1.5 size-4" />{tr("More filters")}{moreCount > 0 && <span className="ml-1.5 grid size-5 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{moreCount}</span>}</Button>
          <div id="more-filters" className={cn(moreOpen ? "grid grid-cols-1 gap-2 max-md:absolute max-md:inset-x-0 max-md:top-full max-md:z-30 max-md:border-b max-md:bg-background max-md:p-4 max-md:shadow-lg md:contents" : "hidden md:contents")}>
          <Select value={club} onValueChange={(v) => set("club", v)}><SelectTrigger aria-label={tr("Club")}><SelectValue placeholder={tr("All clubs")} /></SelectTrigger><SelectContent><SelectItem value={ALL}>{tr("All clubs")}</SelectItem>{CLUBS.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
          <Select value={zone} onValueChange={(v) => set("zone", v)}><SelectTrigger aria-label={tr("Region")}><SelectValue placeholder={tr("All regions")} /></SelectTrigger><SelectContent><SelectItem value={ALL}>{tr("All regions")}</SelectItem>{["NORD", "OUEST", "CENTRE", "EST"].map((z) => <SelectItem key={z} value={z}>{z.charAt(0) + z.slice(1).toLowerCase()}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={(v) => set("status", v)}><SelectTrigger aria-label={tr("Status")}><SelectValue placeholder={tr("Any status")} /></SelectTrigger><SelectContent><SelectItem value={ALL}>{tr("Any status")}</SelectItem><SelectItem value="open">{tr("Registration open")}</SelectItem><SelectItem value="closed">{tr("Registration closed")}</SelectItem><SelectItem value="upcoming">{tr("Upcoming")}</SelectItem><SelectItem value="completed">{tr("Completed")}</SelectItem><SelectItem value="cancelled">{tr("Cancelled (demo)")}</SelectItem></SelectContent></Select>
          <Select value={division} onValueChange={(v) => set("division", v)}><SelectTrigger aria-label={tr("Division")}><SelectValue placeholder={tr("All divisions")} /></SelectTrigger><SelectContent><SelectItem value={ALL}>{tr("All divisions")}</SelectItem>{DIVISION_FILTERS.map((d) => <SelectItem key={d} value={d}>{DIV_LABEL[d]}</SelectItem>)}</SelectContent></Select>
          <Select value={period} onValueChange={(v) => set("period", v)}><SelectTrigger aria-label={tr("Period")}><SelectValue placeholder={tr("Any period")} /></SelectTrigger><SelectContent><SelectItem value={ALL}>{tr("Any period")}</SelectItem>{PERIOD_FILTERS.map((x) => <SelectItem key={x} value={x}>{PERIOD_LABEL[x]}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label={tr("Category filter")}>
          {[ALL, ...CATS].map((c) => (
            <button key={c} onClick={() => set("category", c)} aria-pressed={category === c} className={cn("min-h-11 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition md:min-h-9", category === c ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary/50 hover:text-foreground")}>{c === ALL ? tr("All") : c === "MIXTE" ? tr("Mixed") : c}</button>
          ))}
        </div>
      </div>

      {chips.length > 0 && <ul className="mb-4 flex flex-wrap gap-2" aria-label={tr("Active filters")} data-active-filters>{chips.map(([k, l]) => <li key={k}><button type="button" onClick={() => set(k, "")} aria-label={`${tr("Remove filter")} ${l}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-medium transition hover:border-primary/60 md:min-h-8">{l}<X className="size-3.5" aria-hidden /></button></li>)}</ul>}
      {nextEv && <Link to={`/tournaments/${nextEv.id}`} data-next-event className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border-2 border-primary/50 bg-primary/5 p-3 transition hover:bg-primary/10"><span className="text-xs font-semibold uppercase tracking-wide text-primary">{tr("Next event")}</span><CategoryBadge category={nextEv.category} /><span className="font-semibold">{nextEv.clubName}</span><span className="text-sm text-muted-foreground">{fmtRange(nextEv)} · {nextIn} {nextIn === 1 ? tr("day to go") : tr("days to go")}</span><span className="ml-auto flex items-center gap-2"><StatusBadge status={eventStatus(nextEv)} /><ArrowRight className="size-4 text-muted-foreground" /></span></Link>}
      {view === "list" && filtered.length > 0 && (
        <nav className="mb-4 flex flex-wrap items-end gap-2" aria-label={tr("Calendar periods")} data-cal-nav>
          <Button variant="outline" className="min-h-11 md:min-h-9" disabled={beforeCount === 0} onClick={goEarlier} data-cal-earlier><ChevronLeft className="mr-1 size-4" />{tr("Earlier months")}{beforeCount > 0 && <span className="ml-1.5 text-xs text-muted-foreground num">({beforeCount})</span>}</Button>
          <Button variant="outline" className="min-h-11 md:min-h-9" disabled={laterCount <= 0} onClick={goLater} data-cal-later>{tr("Later months")}{laterCount > 0 && <span className="ml-1.5 text-xs text-muted-foreground num">({laterCount})</span>}<ChevronRight className="ml-1 size-4" /></Button>
          <div className="ml-auto flex items-end gap-2">
            {!upcomingMode && <Button variant="ghost" className="min-h-11 text-primary md:min-h-9" onClick={() => go()} data-cal-upcoming>{tr("Back to upcoming")}</Button>}
            <div><label htmlFor="cal-jump" className="mb-1 block text-xs font-medium text-muted-foreground">{tr("Jump to month")}</label>
              <select id="cal-jump" className="h-11 rounded-md border border-input bg-background px-2 text-sm md:h-9" value={upcomingMode ? "" : fromDate.slice(0, 7) + "-01"} onChange={(e) => go(e.target.value || undefined)}>
                <option value="">{tr("Upcoming events")}</option>{allMonths.map((m) => <option key={m} value={m + "-01"}>{monthLabel(m)}</option>)}
              </select></div>
          </div>
        </nav>)}
      {filtered.length === 0 && (
        <div className="grid place-items-center rounded-xl border border-dashed py-16 text-center" data-empty="calendar"><div><p className="text-lg font-semibold">{tr("No tournament matches these filters")}</p><p className="mt-1 text-sm text-muted-foreground">{tr("Try removing a filter or searching another club.")}</p><Button className="mt-4" onClick={() => setSp({}, { replace: true })}>{tr("Clear filters")}</Button></div></div>
      )}
      <div id="cal-list" className="scroll-mt-40" />
      {view === "list" && grouped.map(([k, evs]) => (
        <section key={k} className="mb-8"><h2 className="mb-3 flex items-baseline gap-2 text-lg font-bold">{monthLabel(k)}<span className="text-xs font-normal text-muted-foreground num">{evs.length} {tr("events")}</span></h2><div className="grid min-w-0 gap-2.5 md:grid-cols-2 xl:grid-cols-3">{evs.map((e) => <EventCard key={e.id} e={e} />)}</div></section>
      ))}
      {view === "list" && laterCount > 0 && <div className="mb-8 flex justify-center"><Button variant="outline" className="min-h-11" onClick={goLater} data-cal-more>{tr("Show later months")} ({laterCount})</Button></div>}
      {view === "month" && filtered.length > 0 && <MonthGrid month={month} setMonth={setMonth} months={months} events={filtered} />}
    </div>
  );
}
function MonthGrid({ month, setMonth, months, events }: { month: string; setMonth: (m: string) => void; months: string[]; events: typeof CALENDAR_EVENTS }) {
  const idx = months.indexOf(month); const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)); const lead = (first.getUTCDay() + 6) % 7; const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const withEvents = [...new Set(events.map((e) => monthKey(e.start)))].sort(); const nextWith = withEvents.find((m) => m > month); const prevWith = [...withEvents].reverse().find((m) => m < month);
  const byDay = new Map<number, typeof events>(); events.filter((e) => monthKey(e.start) === month).forEach((e) => { const d = Number(e.start.slice(8)); (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(e); });
  return (
    <div>
      <div className="mb-3 flex items-center justify-between"><Button variant="outline" size="icon" disabled={idx <= 0} onClick={() => setMonth(months[idx - 1])} aria-label={tr("Previous month")}><ChevronLeft className="size-4" /></Button><h2 className="text-lg font-bold">{monthLabel(month)}</h2><Button variant="outline" size="icon" disabled={idx >= months.length - 1} onClick={() => setMonth(months[idx + 1])} aria-label={tr("Next month")}><ChevronRight className="size-4" /></Button></div>
      {byDay.size === 0 && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground" data-empty="month"><span className="min-w-0 flex-1">{tr("No tournament this month with these filters.")}</span>{prevWith && <Button variant="outline" className="min-h-11 md:min-h-9" onClick={() => setMonth(prevWith)}>{tr("Previous month with events")}: {monthLabel(prevWith)}</Button>}{nextWith && <Button variant="outline" className="min-h-11 md:min-h-9" onClick={() => setMonth(nextWith)}>{tr("Next month with events")}: {monthLabel(nextWith)}</Button>}</div>}
      <div className="hidden grid-cols-7 gap-1 md:grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">{tr(d)}</div>)}
        {Array.from({ length: lead }).map((_, i) => <div key={"l" + i} />)}
        {Array.from({ length: days }).map((_, i) => { const ev = byDay.get(i + 1) ?? []; return (
          <div key={i} className={cn("min-h-24 rounded-lg border p-1.5", ev.length ? "bg-card" : "bg-transparent opacity-60")}><div className="mb-1 text-xs font-semibold text-muted-foreground num">{i + 1}</div><div className="space-y-1">{ev.slice(0, 3).map((e) => <Link key={e.id} to={`/tournaments/${e.id}`} className="flex items-center gap-1 truncate rounded bg-secondary px-1 py-0.5 text-xs font-medium hover:bg-accent"><CategoryBadge category={e.category} className="px-1 py-0 text-xs ring-0" /><span className="truncate">{e.clubName}</span></Link>)}{ev.length > 3 && <p className="text-xs text-muted-foreground">+{ev.length - 3} {tr("more")}</p>}</div></div>
        ); })}
      </div>
      <ul className="space-y-2 md:hidden">{[...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([d, ev]) => (<li key={d} className="rounded-xl border bg-card p-3"><p className="mb-2 text-sm font-bold">{fmtRange(ev[0])}</p><div className="space-y-2">{ev.map((e) => <EventCard key={e.id} e={e} compact />)}</div></li>))}</ul>
    </div>
  );
}
