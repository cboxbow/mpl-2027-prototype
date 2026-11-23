import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Check, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo-store";
import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { LINE_LABEL } from "./exports";
import { deriveStatus } from "./engagement";
import { JSTAGES, clubJourney, commissionQueue, refereeQueue, type Blocker, type JStage, type Journey } from "./journey";

export const JSTAGE_LABEL: Record<JStage, string> = { engagement: tr("Engagement"), validation: tr("Validation"), squad: tr("Squad"), composition: tr("Composition"), matches: tr("Matches"), results: tr("Results") };
const NEXT_TEXT: Record<Journey["next"]["code"], string> = {
  start: tr("Start the engagement file"), finish: tr("Complete and submit the engagement file"), wait: tr("Waiting for the MPL Commission to instruct the file (simulated)"), squad: tr("Add players so each accepted team reaches the minimum squad"),
  compose: tr("Build and submit the team compositions"), play: tr("Confirm line-ups and enter the scores of your ties"), follow: tr("Follow the validation of your results"), done: tr("All your ties are validated in demonstration"),
};
const BLOCK_TEXT: Record<Blocker["code"], string> = {
  returned: tr("The Commission asked for changes"), refused: tr("Line refused by the Commission (simulated decision)"), comp_returned: tr("Composition returned by the Commission"), contested: tr("Result contested: waiting for the referee"),
  correction: tr("Correction requested: waiting for the Commission"), orphan: tr("Tie no longer scheduled in the calendar"), postponed: tr("Tie postponed"), interrupted: tr("Tie interrupted"), all_refused: tr("No accepted line: no team can be composed"),
};
/** 5B-6 — parcours club / capitaine : 6 étapes, statut du dossier, prochaine action, blocages, décisions de la Commission. Affichage seul. */
export function JourneyBar({ onGo, clubId }: { onGo: (tab: "engagement" | "compositions" | "matches") => void; clubId?: string }) {
  const { ic, organizerClub } = useDemo(); const id = clubId ?? organizerClub; const j = clubJourney(ic, id); const d = ic.dossiers.find((x) => x.clubId === id);
  const curIdx = j.current ? JSTAGES.indexOf(j.current) + 1 : JSTAGES.length;
  return (
    <section className="mb-6 space-y-3 rounded-2xl border bg-card p-4" data-ic-journey data-current={j.current ?? "done"} aria-label={tr("Interclub journey")}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold">{tr("Your Interclub journey")}</h2>{d && <span className="text-xs text-muted-foreground" data-ic-dossier-status>{tr("Engagement file")} : <strong>{LINE_LABEL[deriveStatus(d.lines)]}</strong> · v{d.version}</span>}</div>
      <ol className="flex items-start justify-between gap-1" aria-label={tr("Interclub journey")}>
        {JSTAGES.map((s, i) => (
          <li key={s} data-jstage={s} data-state={j.states[s]} aria-current={j.states[s] === "current" || j.states[s] === "blocked" ? "step" : undefined} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <span className={cn("grid size-8 place-items-center rounded-full border text-xs font-bold num", j.states[s] === "done" ? "border-success/60 bg-success/15 text-success" : j.states[s] === "current" ? "border-primary bg-primary text-primary-foreground" : j.states[s] === "blocked" ? "border-destructive bg-destructive/15 text-foreground" : "bg-background text-muted-foreground")}>{j.states[s] === "done" ? <Check className="size-4" aria-hidden /> : j.states[s] === "blocked" ? <AlertTriangle className="size-4" aria-hidden /> : i + 1}</span>
            <span className={cn("hidden break-words text-[11px] leading-tight sm:block", j.states[s] === "current" || j.states[s] === "blocked" ? "font-semibold text-foreground" : "text-muted-foreground")}>{JSTAGE_LABEL[s]}</span><span className="sr-only sm:hidden">{JSTAGE_LABEL[s]} — {j.states[s]}</span>
          </li>))}
      </ol>
      <p className="text-xs font-medium text-muted-foreground sm:hidden" data-jstage-text aria-live="polite">{tr("Step")} {curIdx} {tr("of")} {JSTAGES.length} — {j.current ? JSTAGE_LABEL[j.current] : tr("Completed")}</p>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-3" data-next-action={j.next.code}>
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Next action")}</p><p className="text-sm font-medium">{NEXT_TEXT[j.next.code]}</p></div>
        {j.next.code !== "done" && j.next.code !== "wait" && <Button className="min-h-11 md:min-h-9" onClick={() => onGo(j.next.tab)} data-next-go>{tr("Open")}<ArrowRight className="ml-1.5 size-4" /></Button>}
      </div>
      {j.blockers.length > 0 && <ul className="space-y-1.5" data-blockers>{j.blockers.map((b, i) => <li key={i} className="flex items-start gap-2 rounded-md border border-destructive/60 bg-destructive/10 p-2 text-sm" data-blocker={b.code}><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /><span>{BLOCK_TEXT[b.code]}{b.division ? ` · ${b.division}` : ""}{b.note ? ` — ${b.note}` : ""}</span></li>)}</ul>}
      {j.decisions.length > 0 && <div data-commission-decisions><h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold"><Gavel className="size-4" aria-hidden />{tr("Commission decisions (simulated)")}</h3>
        <ul className="space-y-1 text-sm">{j.decisions.map((x) => <li key={x.division} className="flex flex-wrap items-center gap-x-2" data-decision={x.division}><strong>{x.division}</strong><span>{LINE_LABEL[x.status]}</span>{x.at && <span className="text-xs text-muted-foreground">{fmtDate(x.at.slice(0, 10))}</span>}{x.note && <span className="text-muted-foreground">— {x.note}</span>}</li>)}</ul>
        <p className="mt-1 text-xs text-muted-foreground">{tr("A simulated decision is not an official validation.")}</p></div>}
    </section>
  );
}
/** Résumé compact du parcours pour le portail club (`/club`) : étape en cours + lien direct vers la prochaine action. */
export function JourneySummary({ clubId }: { clubId: string }) {
  const { ic } = useDemo(); const j = clubJourney(ic, clubId);
  return (<div className="mb-3 rounded-xl border bg-background p-3" data-club-journey data-current={j.current ?? "done"}>
    <p className="text-sm"><span className="text-muted-foreground">{tr("Current step")} : </span><strong>{j.current ? JSTAGE_LABEL[j.current] : tr("Completed")}</strong>{j.blockers.length > 0 && <span className="ml-2 text-xs font-semibold text-destructive" data-club-blockers>{j.blockers.length} {tr("blocker(s)")}</span>}</p>
    <p className="text-xs text-muted-foreground">{NEXT_TEXT[j.next.code]}</p>
    <Link to={`/interclub?tab=${j.next.tab}`} className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline md:min-h-8" data-club-journey-link>{tr("Go to the next action")}<ArrowRight className="ml-1 size-4" aria-hidden /></Link></div>);
}
type Go = (tab: string, stage?: string) => void;
const Chip = ({ n, label, onClick, tone, id }: { n: number; label: string; onClick: () => void; tone?: boolean; id: string }) => (
  <li><button type="button" onClick={onClick} data-queue-item={id} data-count={n} className={cn("flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 text-left text-sm hover:bg-accent", n > 0 && tone && "border-primary/60")}><span>{label}</span><strong className="num rounded-full bg-secondary px-2.5 py-0.5 text-secondary-foreground">{n}</strong></button></li>);
/** File « À traiter » de la Commission (admin) ou du juge-arbitre : accès direct à l'onglet et au filtre concernés. Aucune décision automatique. */
export function WorkQueue({ kind, onGo }: { kind: "commission" | "referee"; onGo: Go }) {
  const { ic, refereeId } = useDemo();
  if (kind === "commission") { const q = commissionQueue(ic); return (
    <section className="mb-6 rounded-2xl border bg-card p-4" data-ic-queue="commission" data-total={q.total} aria-label={tr("To process")}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-bold">{tr("To process")}</h2><p className="text-xs text-muted-foreground">{q.total === 0 ? tr("Nothing waiting for the Commission.") : `${q.total} ${tr("item(s) waiting")} — ${tr("every decision stays manual and reasoned (simulated).")}`}</p></div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Chip id="engagements" n={q.engagements} tone label={tr("Engagement lines to instruct")} onClick={() => onGo("commission")} />
        <Chip id="compositions" n={q.compositions} tone label={tr("Compositions to check")} onClick={() => onGo("prep")} />
        <Chip id="toDecide" n={q.toDecide} tone label={tr("Match sheets to decide")} onClick={() => onGo("matches", "referee_checked")} />
        <Chip id="corrections" n={q.corrections} tone label={tr("Correction requests")} onClick={() => onGo("matches", "correction_requested")} />
        <Chip id="contested" n={q.contested} label={tr("Contested results (referee first)")} onClick={() => onGo("matches", "contested")} />
        <Chip id="incidents" n={q.incidents} label={tr("Major incidents reported")} onClick={() => onGo("matches")} /></ul></section>); }
  const q = refereeQueue(ic, refereeId); return (
    <section className="mb-6 rounded-2xl border bg-card p-4" data-ic-queue="referee" data-total={q.toCheck + q.contested} aria-label={tr("My ties")}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-bold">{tr("My ties")}</h2><p className="text-xs text-muted-foreground">{q.total === 0 ? tr("No match sheet is assigned to you yet.") : `${q.total} ${tr("assigned tie(s)")}`}</p></div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Chip id="toCheck" n={q.toCheck} tone label={tr("Sheets to check")} onClick={() => onGo("matches", "submitted")} />
        <Chip id="contested" n={q.contested} tone label={tr("Contested results to rule on")} onClick={() => onGo("matches", "contested")} />
        <Chip id="toPlay" n={q.toPlay} label={tr("Ties to play or in progress")} onClick={() => onGo("matches")} />
        <Chip id="awaiting" n={q.awaiting} label={tr("Waiting for the Commission")} onClick={() => onGo("matches", "referee_checked")} />
        <Chip id="done" n={q.done} label={tr("Validated in demonstration")} onClick={() => onGo("matches", "validated_demo")} /></ul></section>);
}
