/** Affichage partagé (organisateur + public) des tableaux, poules et matchs — illustratif, aucune règle officielle. */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Radio, Search, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tr, trDyn } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { groupStandings, scoreText, type Resolved } from "@/lib/bracket";
import { matchLabel, roundLabel, statusLabel, teamName, type DrawView } from "@/lib/draws";
import { fmtDate } from "@/lib/format";

const STATUS_CLS: Record<Resolved["status"], string> = { bye: "text-muted-foreground", waiting: "text-muted-foreground", ready: "text-foreground", scheduled: "text-primary", live: "text-destructive", pending: "text-warning", done: "text-success" };
export function MatchStatus({ r, className }: { r: Resolved; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 text-xs font-medium", STATUS_CLS[r.status], className)}>{r.status === "live" && <Radio className="size-3 animate-pulse" aria-hidden />}{r.status === "scheduled" && <Clock className="size-3" aria-hidden />}{statusLabel(r.status)}</span>;
}
/** Un match : deux équipes, score par set (résultat VALIDÉ uniquement), terrain et horaire. */
export function MatchCard({ v, r, onSelect, hl, selected, compact }: { v: DrawView; r: Resolved; onSelect?: (id: string) => void; hl?: boolean; selected?: boolean; compact?: boolean }) {
  const res = r.st?.result; const seedOf = (k: string | null) => { const i = k ? v.cfg.seeds.indexOf(k) : -1; return i >= 0 && i < v.built.seedCount ? i + 1 : 0; };
  const Row = ({ side }: { side: "A" | "B" }) => {
    const k = side === "A" ? r.a : r.b; const win = res?.winner === side || (r.bye && r.winner === side && k !== "bye"); const sd = k && k !== "bye" ? seedOf(k) : 0;
    return (<div className={cn("flex items-center gap-2 px-2.5 py-1.5 text-sm", win ? "bg-success/10 font-semibold" : k === "bye" ? "text-muted-foreground italic" : !k ? "text-muted-foreground" : "")} data-team={side} data-winner={win ? "true" : "false"} data-seed={sd || undefined} data-team-key={k && k !== "bye" ? k : undefined}>
      {sd > 0 && <span className="grid size-5 shrink-0 place-items-center rounded bg-primary/15 text-[11px] font-bold num text-success" aria-label={trDyn(`Seed ${sd}`)}>{sd}</span>}
      <span className="min-w-0 flex-1 break-words">{teamName(v, k, compact)}</span>
      {res && res.kind !== "walkover" && <span className="num flex gap-1.5 text-xs" aria-label={tr("Score")}>{res.sets.map(([x, y], i) => <span key={i} className={cn((side === "A" ? x > y : y > x) && "font-bold")}>{side === "A" ? x : y}</span>)}</span>}
    </div>);
  };
  const sch = r.st?.court != null && r.st.time ? `${tr("Court")} ${r.st.court} · ${r.st.day ? fmtDate(r.st.day) + " · " : ""}${r.st.time}` : null;
  const body = (<>
    <div className="flex items-center justify-between gap-2 border-b bg-secondary/50 px-2.5 py-1 text-xs"><span className="font-semibold uppercase tracking-wide text-muted-foreground">{matchLabel(r.m)}</span><MatchStatus r={r} /></div>
    <Row side="A" /><div className="border-t border-border/60" /><Row side="B" />
    {(sch || res?.kind !== undefined && res.kind !== "played") && <div className="flex flex-wrap items-center justify-between gap-x-2 border-t bg-secondary/30 px-2.5 py-1 text-xs text-muted-foreground">{sch && <span>{sch}</span>}{res && res.kind === "walkover" && <span className="font-medium text-warning">{tr("Walkover")}</span>}{res && res.kind === "retired" && <span className="font-medium text-warning">{tr("Retirement")}</span>}</div>}
  </>);
  const cls = cn("w-full overflow-hidden rounded-lg border bg-card text-left", hl && "ring-2 ring-primary", selected && "border-primary", r.status === "bye" && "opacity-70");
  const attrs = { "data-match-id": r.id, "data-match-status": r.status, "data-match-kind": r.m.kind };
  return onSelect && !r.bye ? <button type="button" onClick={() => onSelect(r.id)} className={cn(cls, "transition hover:border-primary/60")} aria-label={`${matchLabel(r.m)} — ${teamName(v, r.a, true)} / ${teamName(v, r.b, true)}`} {...attrs}>{body}</button> : <div className={cls} {...attrs}>{body}</div>;
}
const isMain = (r: Resolved) => r.m.kind === "main";
/** Tableau d'élimination : colonnes par tour, navigation par tour / moitié / recherche d'équipe pour les grands tableaux (8, 16, 32). */
export function BracketView({ v, onSelect, selected }: { v: DrawView; onSelect?: (id: string) => void; selected?: string }) {
  const rounds = useMemo(() => { const by = new Map<number, Resolved[]>(); for (const r of v.resolved.values()) if (isMain(r)) (by.get(r.m.roundIdx) ?? by.set(r.m.roundIdx, []).get(r.m.roundIdx)!).push(r); return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([, xs]) => xs.sort((a, b) => a.m.order - b.m.order)); }, [v.resolved]);
  const mobile = typeof window !== "undefined" && window.innerWidth < 768; const big = rounds[0]?.length > 4;
  const [focus, setFocus] = useState<"all" | "top" | "bottom" | "round">(mobile || big ? (mobile ? "round" : "all") : "all"); const [ri, setRi] = useState(0); const [q, setQ] = useState("");
  const query = q.trim().toLowerCase(); const hit = (r: Resolved) => !!query && [r.a, r.b].some((k) => k && k !== "bye" && teamName(v, k).toLowerCase().includes(query));
  const hits = useMemo(() => rounds.flat().filter(hit), [rounds, query, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (hits[0]) { const ix = rounds.findIndex((rd) => rd.some((x) => x.id === hits[0].id)); if (focus === "round" && ix >= 0) setRi(ix); requestAnimationFrame(() => ref.current?.querySelector(`[data-match-id="${hits[0].id}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" })); } }, [query]); // eslint-disable-line react-hooks/exhaustive-deps
  if (rounds.length === 0) return null;
  const half = (rd: Resolved[], i: number) => (rd.length === 1 ? true : focus === "top" ? i < rd.length / 2 : focus === "bottom" ? i >= rd.length / 2 : true);
  const shown = focus === "round" ? [rounds[Math.min(ri, rounds.length - 1)]] : rounds;
  const first = rounds[0][0]?.m.round;
  return (
    <div data-bracket data-bracket-size={rounds[0].length * 2} data-bracket-focus={focus}>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="toolbar" aria-label={tr("Bracket navigation")}>
        <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label={tr("View")}>
          {([["all", tr("Full draw")], ["top", tr("Top half")], ["bottom", tr("Bottom half")], ["round", tr("Round by round")]] as const).filter(([k]) => big || k === "all" || k === "round").map(([k, l]) => <button key={k} type="button" aria-pressed={focus === k} onClick={() => setFocus(k)} data-focus={k} className={cn("min-h-11 rounded-md px-3 text-sm font-medium transition md:min-h-9", focus === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>)}
        </div>
        <div className="relative min-w-40 flex-1 sm:max-w-xs"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input aria-label={tr("Find a pair in the draw")} placeholder={tr("Find a pair…")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" data-bracket-search /></div>
        {query && <span className="text-xs text-muted-foreground" data-hits>{hits.length} {tr("match(es) found")}</span>}
      </div>
      {focus === "round" && <div className="mb-3 flex items-center justify-between gap-2" role="group" aria-label={tr("Round")}>
        <Button type="button" variant="outline" size="icon" className="size-11 md:size-9" disabled={ri === 0} onClick={() => setRi(ri - 1)} aria-label={tr("Previous round")}><ChevronLeft className="size-4" /></Button>
        <div className="no-scrollbar flex min-w-0 flex-1 justify-center gap-1 overflow-x-auto">{rounds.map((rd, i) => <button key={i} type="button" onClick={() => setRi(i)} aria-pressed={ri === i} data-round-tab={rd[0].m.round} className={cn("min-h-11 rounded-md border px-3 text-xs font-semibold md:min-h-9", ri === i ? "border-primary bg-primary/15" : "text-muted-foreground")}>{roundLabel(rd[0].m.round)}</button>)}</div>
        <Button type="button" variant="outline" size="icon" className="size-11 md:size-9" disabled={ri >= rounds.length - 1} onClick={() => setRi(ri + 1)} aria-label={tr("Next round")}><ChevronRight className="size-4" /></Button>
      </div>}
      <div ref={ref} className="overflow-x-auto pb-2">
        <div className={cn("flex gap-5", focus === "round" ? "" : "min-w-max")}>
          {shown.map((rd) => <div key={rd[0].m.round} className={cn("flex flex-col", focus === "round" ? "w-full" : "w-60 shrink-0")} data-round={rd[0].m.round}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{roundLabel(rd[0].m.round)}{rd[0].m.round === first && rd.some((x) => x.bye) ? ` · ${rd.filter((x) => x.bye).length} ${tr("BYE")}` : ""}</p>
            <div className={cn("flex flex-1 flex-col gap-3", focus === "round" ? "" : "justify-around")}>{rd.map((r, i) => half(rd, i) && <MatchCard key={r.id} v={v} r={r} onSelect={onSelect} hl={hit(r)} selected={selected === r.id} />)}</div>
          </div>)}
          {focus !== "round" && champion(v) && <div className="flex w-52 shrink-0 flex-col justify-center"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Champion")}</p><div className="rounded-lg border border-gold/50 bg-gold/10 p-3 text-center" data-champion><Trophy className="mx-auto mb-1 size-5 text-gold" /><p className="text-sm font-bold">{teamName(v, champion(v))}</p></div></div>}
        </div>
      </div>
    </div>
  );
}
const champion = (v: DrawView) => { const f = v.resolved.get("F"); return f?.status === "done" ? f.winnerTeam : null; };
/** Liste plate de matchs (qualifications, classement, etc.). */
export function MatchGrid({ v, ids, onSelect, selected, empty }: { v: DrawView; ids: string[]; onSelect?: (id: string) => void; selected?: string; empty?: string }) {
  const rs = ids.map((i) => v.resolved.get(i)).filter(Boolean) as Resolved[];
  if (rs.length === 0) return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rs.map((r) => <MatchCard key={r.id} v={v} r={r} onSelect={onSelect} selected={selected === r.id} />)}</div>;
}
/** Poules : classement + rencontres de chaque poule. */
export function GroupsView({ v, onSelect, selected }: { v: DrawView; onSelect?: (id: string) => void; selected?: string }) {
  return (<div className="grid gap-4 lg:grid-cols-2" data-groups>{v.built.groups.map((teams, gi) => {
    const st = groupStandings(teams, gi, v.resolved); const letter = String.fromCharCode(65 + gi);
    return (<section key={gi} className="rounded-xl border bg-card p-3" aria-label={trDyn(`Group ${letter}`)} data-group={letter}><h3 className="mb-2 font-semibold">{trDyn(`Group ${letter}`)}</h3>
      <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">{trDyn(`Group ${letter}`)}</caption><thead><tr className="text-left text-xs uppercase text-muted-foreground"><th scope="col" className="py-1 pr-2">#</th><th scope="col" className="py-1 pr-2">{tr("Pair")}</th><th scope="col" className="px-1 text-right">{tr("P")}</th><th scope="col" className="px-1 text-right">{tr("W")}</th><th scope="col" className="px-1 text-right">{tr("L")}</th><th scope="col" className="px-1 text-right">{tr("Sets")}</th></tr></thead>
        <tbody>{st.rows.map((r) => <tr key={r.key} className={cn("border-t", st.complete && r.rank <= 2 && "bg-success/10 font-semibold")} data-group-row={r.key}><td className="py-1.5 pr-2 num">{r.rank}</td><td className="py-1.5 pr-2">{teamName(v, r.key, true)}</td><td className="px-1 text-right num">{r.played}</td><td className="px-1 text-right num">{r.wins}</td><td className="px-1 text-right num">{r.losses}</td><td className="px-1 text-right num">{r.setsFor}-{r.setsAgainst}</td></tr>)}</tbody></table></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{[...v.resolved.values()].filter((r) => r.m.kind === "group" && r.m.group === gi).map((r) => <MatchCard key={r.id} v={v} r={r} onSelect={onSelect} selected={selected === r.id} compact />)}</div>
      {st.complete && <p className="mt-2 text-xs text-muted-foreground">{tr("Top 2 qualify for the final phase.")}</p>}</section>);
  })}</div>);
}
export { scoreText };
