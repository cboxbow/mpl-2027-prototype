import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { fmtMsg } from "../EngagementForm";
import { clubName } from "../d3/d3-text";
import type { FinalsAlert, QualStatus, QualVia } from "./finals";
import type { Criterion, PoolTable, Ranked, SkipReason } from "./standings";
import type { RecalcCause } from "./d4state";

export const teamName = (t: string) => { const [c, d] = t.split("|"); return `${clubName(c)} · ${d}`; };
export const CRITERION_LABEL: Record<Criterion, string> = { points: tr("Championship points"), matchDiff: tr("Match difference"), setDiff: tr("Set difference"), gameDiff: tr("Game difference"), headToHead: tr("Head-to-head") };
export const QUAL_LABEL: Record<QualStatus, string> = { provisional: tr("Provisional qualification"), qualified_demo: tr("Qualified (demonstration)"), pending_commission: tr("Commission decision required") };
export const QUAL_TONE: Record<QualStatus, string> = { provisional: "bg-amber-700 text-white", qualified_demo: "bg-emerald-800 text-white", pending_commission: "bg-rose-700 text-white" };
export const VIA_LABEL: Record<QualVia, string> = { winner: tr("Pool winner"), runner_up: tr("Pool runner-up"), top: tr("Top of the pool"), best_runner_up: tr("Best runner-up") };
export const SKIP_LABEL: Record<SkipReason, string> = { not_validated: tr("Not validated yet"), contested: tr("Contested"), cancelled: tr("Cancelled"), incomplete: tr("Incomplete result"), orphan: tr("Not scheduled in D2"), postponed: tr("Postponed"), interrupted: tr("Interrupted"), correction: tr("Correction requested"), forfeit_pending: tr("Forfeit awaiting validation") };
export const CAUSE_LABEL: Record<RecalcCause, string> = { result_validated: tr("Result validated"), correction_requested: tr("Correction requested (result withdrawn)"), correction_approved: tr("Correction approved"), tie_cancelled: tr("Tie cancelled"), tie_restored: tr("Tie restored"), forfeit_changed: tr("Forfeit changed"), rules_changed: tr("Rules changed"), decision_recorded: tr("Commission decision recorded"), finals_generated: tr("Final phases generated"), other: tr("Other change") };
export function finalsAlertText(a: FinalsAlert): string {
  const M: Record<FinalsAlert["code"], string> = {
    no_final_phase: tr("This division has several pools but no final phase in the calendar: the Commission must decide."), pool_incomplete: tr("{n} pool(s) not finished: qualifications remain provisional."), unresolved_tie: tr("A tie on a qualification rank cannot be separated: Commission decision required."),
    unequal_pools: tr("Pools of different sizes: comparing runners-up is not normalised (no rule defined)."), best_runner_up_rule: tr("Best runner-up selection follows a provisional, unapproved rule."), seed_tie: tr("Two qualifiers are tied on seeding: Commission decision required."),
    same_pool_semi: tr("Two teams from the same pool meet in a semi-final (no rule defined for this case)."), slot_unscheduled: tr("A final-phase slot is not scheduled in D2: it cannot be presented as played normally."), too_many_pools: tr("More pools than qualification places: no qualification rule defined."),
    changed_since_generation: tr("Qualifications changed since the final phases were generated: review the pairings."), few_teams: tr("Not enough teams to fill the final phases."),
  };
  return fmtMsg(M[a.code], a.params ?? {});
}
/** Bandeau obligatoire sur toutes les pages publiques de démonstration. */
export const PublicBanner = () => (<div role="note" data-public-banner className="rounded-xl border-2 border-amber-600 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100">{tr("PROTOTYPE — FICTIONAL DATA")}<span className="ml-2 font-normal">{tr("Demonstration results and provisional rules: nothing here is official or published by the MPL.")}</span></div>);

const th = "px-2 py-2 text-left text-xs font-semibold whitespace-nowrap"; const td = "px-2 py-1.5 whitespace-nowrap tabular-nums";
/** Tableau de classement d'une poule (accessible : légende, en-têtes, égalités signalées en texte et pas seulement en couleur). */
export function StandingsTable({ t, club }: { t: PoolTable; club?: string }) {
  const rows = t.rows.filter((r) => !club || club === "all" || r.team.startsWith(`${club}|`)) as Ranked[];
  return (<div className="space-y-1" data-standings-pool={`${t.division}-${t.pool}`}>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[640px] text-sm"><caption className="p-2 text-left text-sm font-semibold">{t.division} · {tr("Pool")} {t.pool} <span className="font-normal text-muted-foreground">({t.counted}/{t.expected} {tr("results counted")}{t.preview ? `, ${t.preview} ${tr("preview")}` : ""})</span></caption>
      <thead className="bg-muted/60"><tr><th scope="col" className={th}>{tr("Rank")}</th><th scope="col" className={th}>{tr("Team")}</th><th scope="col" className={th} title={tr("Ties played")}>{tr("P")}</th><th scope="col" className={th} title={tr("Wins")}>{tr("W")}</th><th scope="col" className={th} title={tr("Losses")}>{tr("L")}</th>
        <th scope="col" className={th} title={tr("Doubles matches won / lost")}>{tr("Matches")}</th><th scope="col" className={th} title={tr("Sets won / lost")}>{tr("Sets")}</th><th scope="col" className={th} title={tr("Games won / lost")}>{tr("Games")}</th><th scope="col" className={th}>{tr("Diff. M/S/G")}</th><th scope="col" className={th} title={tr("Interclub championship points — not the individual MPL ranking points")}>{tr("Pts")}</th></tr></thead>
      <tbody>{rows.map((r) => (<tr key={r.team} className={cn("border-t", r.preview && "italic")} data-standing-row={r.team}><td className={td}><strong>{r.rank}{r.tied ? "=" : ""}</strong></td><td className="px-2 py-1.5">{teamName(r.team)}{r.unresolved && <span className="ml-2 inline-flex rounded-full bg-rose-700 px-2 py-0.5 text-xs font-semibold text-white" data-commission-required>{tr("Commission decision required")}</span>}{r.sepBy === "commission" && <span className="ml-2 text-xs text-muted-foreground">({tr("Commission decision (simulated)")})</span>}{r.preview && <span className="ml-2 text-xs text-muted-foreground">({tr("preview")})</span>}</td>
        <td className={td}>{r.played}</td><td className={td}>{r.won}</td><td className={td}>{r.lost}</td><td className={td}>{r.mW}–{r.mL}</td><td className={td}>{r.sW}–{r.sL}</td><td className={td}>{r.gW}–{r.gL}</td><td className={td}>{r.mDiff >= 0 ? "+" : ""}{r.mDiff} / {r.sDiff >= 0 ? "+" : ""}{r.sDiff} / {r.gDiff >= 0 ? "+" : ""}{r.gDiff}</td><td className={td}><strong>{r.pts}</strong></td></tr>))}</tbody></table></div>
  </div>);
}
