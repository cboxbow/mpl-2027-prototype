import { useMemo } from "react";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import type { Division } from "@/data/demo";
import { SetScores } from "@/components/mpl/SetScores";
import { drawView, matchLabel, roundLabel, teamName, type DrawView } from "@/lib/draws";
import { useDemo } from "@/lib/demo-store";
import { fmtDate } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { BracketView, GroupsView, MatchGrid, MatchStatus } from "./BracketView";
import { DemoBadge } from "./bits";

type Ev = (typeof CALENDAR_EVENTS)[number];
/** Vue publique d'un tableau PUBLIÉ par l'organisateur (démo) — ne montre que les scores VALIDÉS. */
export function usePublicDraw(ev: Ev, division: Division): DrawView | null {
  const { draws, matches, registrations, org } = useDemo();
  return useMemo(() => { const v = drawView({ draws, matches, registrations, org }, ev, division); return v && v.cfg.published ? v : null; }, [draws, matches, registrations, org, ev, division]);
}
export function PublicBracket({ v }: { v: DrawView }) {
  const ids = (k: string) => v.built.matches.filter((m) => m.kind === k).map((m) => m.id);
  return (
    <div className="space-y-5" data-public-draw>
      <div className="flex flex-wrap items-center gap-2 text-sm"><strong>{v.cfg.format === "groups" ? tr("Groups + final phase") : tr("Knockout")} · {v.cfg.size}</strong><DemoBadge label={tr("ILLUSTRATIVE DRAW")} /></div>
      {v.cfg.format === "groups" && <section><h3 className="mb-2 font-semibold">{tr("Groups")}</h3><GroupsView v={v} /></section>}
      {v.built.qualifiers > 0 && <section><h3 className="mb-2 font-semibold">{tr("Qualifying round")}</h3><MatchGrid v={v} ids={ids("qual")} /></section>}
      <section><h3 className="mb-2 font-semibold">{v.cfg.format === "groups" ? tr("Final phase") : tr("Main draw")}</h3><BracketView v={v} /></section>
      {ids("placement").length > 0 && <section><h3 className="mb-2 font-semibold">{tr("Placement matches")}</h3><MatchGrid v={v} ids={ids("placement")} /></section>}
    </div>
  );
}
/** Programme public : matchs planifiés par jour, puis par heure. */
export function PublicSchedule({ v }: { v: DrawView }) {
  const rows = [...v.resolved.values()].filter((r) => !r.bye && r.st?.day && r.st.time && r.st.court != null).sort((a, b) => (a.st!.day! + a.st!.time!).localeCompare(b.st!.day! + b.st!.time!) || a.st!.court! - b.st!.court!);
  if (!rows.length) return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground" data-public-schedule-empty>{tr("The order of play is not published yet.")}</p>;
  const days = [...new Set(rows.map((r) => r.st!.day!))];
  return (<div className="space-y-5" data-public-schedule><DemoBadge label={tr("ILLUSTRATIVE SCHEDULE")} />{days.map((d) => (<section key={d}><h3 className="mb-2 font-semibold">{fmtDate(d)}</h3><ul className="space-y-2">{rows.filter((r) => r.st!.day === d).map((r) => (
    <li key={r.id} data-public-sched-row={r.id} className="flex items-start gap-3 rounded-xl border bg-card p-3 text-sm"><span className="num w-12 shrink-0 font-mono font-semibold">{r.st!.time}</span><div className="min-w-0 flex-1"><p className="font-medium">{matchLabel(r.m)} · {roundLabel(r.m.round)} <span className="text-muted-foreground">· {tr("Court")} {r.st!.court}</span> <MatchStatus r={r} className="ml-1" /></p><p className="break-words text-xs text-muted-foreground">{teamName(v, r.a, true)} — {teamName(v, r.b, true)}</p>{r.st?.result && <p className="num mt-0.5 text-xs"><SetScores r={r.st.result} /></p>}</div></li>))}</ul></section>))}</div>);
}
/** Résultats publics : uniquement les matchs dont le score a été validé par l'administration. */
export function PublicResults({ v }: { v: DrawView }) {
  const rows = [...v.resolved.values()].filter((r) => !r.bye && r.st?.result).sort((a, b) => a.m.roundIdx - b.m.roundIdx || a.m.order - b.m.order);
  if (!rows.length) return null;
  return (<section className="mb-6" data-public-results><div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="font-semibold">{tr("Validated match results")}</h3><DemoBadge label={tr("DEMO — NOT OFFICIAL")} /></div><ul className="grid gap-2 sm:grid-cols-2">{rows.map((r) => { const res = r.st!.result!; return (
    <li key={r.id} data-public-result={r.id} className="rounded-xl border bg-card p-3 text-sm"><p className="font-semibold">{matchLabel(r.m)} <span className="font-normal text-muted-foreground">· {roundLabel(r.m.round)}</span></p>
      <p className="break-words"><span className={res.winner === "A" ? "font-semibold" : ""}>{teamName(v, r.a, true)}</span> <span className="text-muted-foreground">—</span> <span className={res.winner === "B" ? "font-semibold" : ""}>{teamName(v, r.b, true)}</span></p><p className="num text-xs text-muted-foreground"><SetScores r={res} /></p></li>); })}</ul></section>);
}
