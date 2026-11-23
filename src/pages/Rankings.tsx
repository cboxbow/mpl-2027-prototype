import { useMemo, useState } from "react";
import { tr } from "@/lib/i18n";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Info, Search, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { CategoryBadge, ClubAvatar, DemoBadge, PlayerAvatar, Trend } from "@/components/mpl/bits";
import { COUNTED_RESULTS, RANKING_F, RANKING_M, ROUND_LABEL, type RankingRow } from "@/data/demo";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { CLUBS, clubById } from "@/data/clubs";
import { cn } from "@/lib/utils";
import { fmtDate, shiftDate } from "@/lib/format";
import { DEMO_TODAY } from "@/config/demo-config";
import { displayName } from "@/data/demo";
import { toast } from "sonner";

const evMap = new Map(CALENDAR_EVENTS.map((e) => [e.id, e]));
export default function Rankings() {
  const [sp, setSp] = useSearchParams(); const tab = (["M", "F", "X"].includes(sp.get("tab") ?? "") ? sp.get("tab") : "M") as "M" | "F" | "X"; const q = sp.get("q") ?? ""; const club = sp.get("club") ?? "all";
  const setP = (k: string, v: string, def = "") => { const n = new URLSearchParams(sp); if (!v || v === def) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const setTab = (v: "M" | "F" | "X") => setP("tab", v, "M"); const setQ = (v: string) => setP("q", v); const setClub = (v: string) => setP("club", v, "all"); const [sel, setSel] = useState<RankingRow | null>(null); const [limit, setLimit] = useState(25);
  const base = tab === "M" ? RANKING_M : tab === "F" ? RANKING_F : [];
  const rows = useMemo(() => base.filter((r) => (club === "all" || r.player.clubId === club) && r.player.name.toLowerCase().includes(q.toLowerCase())), [base, club, q]);
  const exportCsv = () => { const body = [["rank", "player", "club", "points", "results_played", "results_counted"], ...rows.map((r) => [r.rank, r.player.name, clubById(r.player.clubId)?.name ?? "", r.points, r.played, r.counted])]; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body.map((r) => r.join(",")).join("\n")], { type: "text/csv" })); a.download = `mpl-demo-ranking-${tab}.csv`; a.click(); toast.success(tr("Demo ranking exported")); };
  return (
    <div className="container-mpl py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{tr("Rolling 12 months · best 8 results")}</p><h1 className="text-3xl font-bold sm:text-4xl">{tr("Player rankings")}</h1></div><div className="flex gap-2"><DemoBadge label={tr("FICTIONAL DATA — NOT OFFICIAL")} className="self-center" /><Button variant="outline" onClick={exportCsv}><Download className="mr-1.5 size-4" />{tr("Export")}</Button></div></div>
      <Alert className="mb-6"><Info className="size-4" /><AlertTitle>{tr("How the ranking works")}</AlertTitle><AlertDescription>{tr("A player's points are the sum of their")} <strong>{COUNTED_RESULTS} {tr("best results")}</strong> {tr("over a rolling 12-month window. Results beyond the 8th are shown but not counted. All players and results below are fictional.")}</AlertDescription></Alert>
      <Tabs value={tab} onValueChange={(v) => { setTab(v as "M" | "F" | "X"); setLimit(25); }}><TabsList><TabsTrigger value="M">{tr("Men")}</TabsTrigger><TabsTrigger value="F">{tr("Women")}</TabsTrigger><TabsTrigger value="X">{tr("Mixed")}</TabsTrigger></TabsList></Tabs>
      {tab === "X" ? (
        <div className="mt-6 rounded-xl border border-dashed p-12 text-center"><p className="font-semibold">{tr("Mixed ranking — points scale to be confirmed")}</p><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{tr("Mixed 250 and Mixed 500 events exist in the 2027 calendar, but no official points scale is defined yet. This ranking will be enabled once it is.")}</p><Button asChild variant="outline" className="mt-4"><Link to="/calendar?category=MIXTE">{tr("See mixed events")}</Link></Button></div>
      ) : (<>
        <div className="my-4 grid gap-2 sm:grid-cols-[1fr_260px]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={tr("Search player")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search a player…")} className="pl-9" /></div>
          <Select value={club} onValueChange={setClub}><SelectTrigger aria-label={tr("Club")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{tr("All clubs")}</SelectItem>{CLUBS.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <p className="mb-2 text-sm text-muted-foreground" aria-live="polite" data-rank-count><strong className="text-foreground num">{rows.length}</strong> {tr("players")}{club !== "all" && <> · {clubById(club)?.name} <Link to={`/clubs/${club}`} className="font-medium text-primary underline-offset-4 hover:underline">{tr("Club page")}</Link></>}{(q || club !== "all") && <button type="button" className="ml-3 inline-flex min-h-8 items-center font-medium text-primary underline-offset-4 hover:underline" onClick={() => setSp(tab === "M" ? {} : { tab }, { replace: true })}>{tr("Clear filters")}</button>}</p>
        {rows.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground" data-empty="rankings">{tr("No player matches.")}</div> : (
          <div className="rounded-xl border bg-card"><Table><TableCaption className="sr-only">{tr("MPL ranking")}</TableCaption><TableHeader><TableRow><TableHead className="w-10 px-2 text-center sm:w-14">#</TableHead><TableHead className="px-2">{tr("Player")}</TableHead><TableHead className="hidden md:table-cell">{tr("Club")}</TableHead><TableHead className="hidden text-center sm:table-cell">{tr("Played")}</TableHead><TableHead className="w-12 px-1 text-center">+/−</TableHead><TableHead className="px-2 text-right">{tr("Points")} <span className="text-gold">{tr("(demo)")}</span></TableHead></TableRow></TableHeader><TableBody>
            {rows.slice(0, limit).map((r) => (<TableRow key={r.player.id} onClick={() => setSel(r)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSel(r)} className="cursor-pointer" aria-label={`${r.player.name}, rank ${r.rank}`}>
              <TableCell className={cn("px-2 text-center text-base font-bold num", r.rank <= 3 && "text-gold")}>{r.rank}</TableCell>
              <TableCell className="whitespace-normal px-2"><div className="flex min-w-0 items-center gap-2.5"><PlayerAvatar name={displayName(r.player)} size={34} /><div className="min-w-0"><span className="block font-semibold leading-tight">{displayName(r.player)}</span><span className="block break-words text-xs text-muted-foreground md:hidden">{clubById(r.player.clubId)?.name}</span></div></div></TableCell>
              <TableCell className="hidden md:table-cell"><div className="flex items-center gap-2 text-sm text-muted-foreground"><ClubAvatar club={clubById(r.player.clubId)} size={22} />{clubById(r.player.clubId)?.name}</div></TableCell>
              <TableCell className="hidden text-center num sm:table-cell">{r.played}<span className="text-muted-foreground"> ({r.counted})</span></TableCell>
              <TableCell className="px-1 text-center"><Trend now={r.rank} prev={r.prevRank} /></TableCell><TableCell className="px-2 text-right text-base font-bold num">{r.points.toLocaleString("en-GB")}</TableCell></TableRow>))}
          </TableBody></Table></div>
        )}
        {rows.length > limit && <div className="mt-4 text-center"><Button variant="outline" onClick={() => setLimit(limit + 25)}>{tr("Show more (")}{rows.length - limit} {tr("left)")}</Button></div>}
        <p className="mt-3 text-xs text-muted-foreground">{tr("“Played (counted)”: results in the window and how many count toward the ranking. Last update: ranking snapshot of")} {fmtDate(shiftDate(DEMO_TODAY, -1), { day: "numeric", month: "short", year: "numeric" })} {tr("(demo). Points are fictional demonstration values.")}</p>
      </>)}
      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}><SheetContent className="w-full overflow-y-auto sm:max-w-md">{sel && (<>
        <SheetHeader className="text-left"><div className="flex items-center gap-3"><PlayerAvatar name={sel.player.name} size={52} /><div><SheetTitle>{sel.player.name}</SheetTitle><SheetDescription>{clubById(sel.player.clubId)?.name} {tr("· Rank #")}{sel.rank} · <Link to={`/clubs/${sel.player.clubId}`} className="font-medium text-primary underline-offset-4 hover:underline">{tr("Club page")}</Link></SheetDescription></div></div></SheetHeader>
        <div className="grid grid-cols-3 gap-2 px-4"><div className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold num">{sel.points}</p><p className="text-xs text-muted-foreground">{tr("points")}</p></div><div className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold num">{sel.played}</p><p className="text-xs text-muted-foreground">{tr("tournaments")}</p></div><div className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold num">{sel.wins}</p><p className="text-xs text-muted-foreground">{tr("wins")}</p></div></div>
        <div className="px-4 pb-6"><h3 className="mb-2 mt-5 text-sm font-semibold">{tr("Results — best")} {COUNTED_RESULTS} {tr("counted")}</h3>
          <ul className="space-y-1.5">{sel.results.map((x, i) => { const e = evMap.get(x.eventId)!; return (<li key={i} className={cn("flex items-center gap-2 rounded-lg border p-2 text-sm", x.counted ? "bg-card" : "opacity-50")}><CategoryBadge category={e.category} /><div className="min-w-0 flex-1"><Link to={`/tournaments/${e.id}`} className="block break-words font-medium hover:underline">{e.clubName}</Link><p className="text-xs text-muted-foreground">{fmtDate(x.date)} · {ROUND_LABEL[x.round]}</p></div><span className="font-bold num">{x.points}</span>{!x.counted && <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{tr("not counted")}</span>}</li>); })}</ul>
          <Button asChild className="mt-4 w-full"><Link to={`/players/${sel.player.id}`} data-full-profile>{tr("Full profile")}</Link></Button><Button variant="outline" className="mt-2 w-full" onClick={() => { navigator.clipboard?.writeText(location.href); toast.success(tr("Link copied")); }}><Share2 className="mr-1.5 size-4" />{tr("Share profile")}</Button></div></>)}</SheetContent></Sheet>
    </div>
  );
}
