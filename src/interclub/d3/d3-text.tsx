import { tr } from "@/lib/i18n";
import { clubById } from "@/data/clubs";
import { fmtMsg } from "../EngagementForm";
import type { ScoreIssue } from "./score";
import type { Stage } from "./sheets";

export const clubName = (id: string) => clubById(id)?.name ?? id;
export const teamLabel = (t: string) => { const [c, d] = t.split("|"); return `${clubName(c)} · ${d}`; };
export const STAGE_LABEL: Record<Stage, string> = {
  preparation: tr("Preparation (line-ups)"), ready: tr("Ready to play"), scoring: tr("Scores in progress"), submitted: tr("Submitted by the captain"), contested: tr("Contested"), referee_checked: tr("Checked by the referee"),
  validated_demo: tr("Validated in demonstration"), correction_requested: tr("Correction requested"), postponed: tr("Postponed"), interrupted: tr("Interrupted"),
};
export const STAGE_TONE: Record<Stage, string> = {
  preparation: "bg-slate-700 text-white", ready: "bg-sky-800 text-white", scoring: "bg-indigo-800 text-white", submitted: "bg-amber-700 text-white", contested: "bg-rose-700 text-white", referee_checked: "bg-teal-800 text-white",
  validated_demo: "bg-emerald-800 text-white", correction_requested: "bg-orange-800 text-white", postponed: "bg-zinc-700 text-white", interrupted: "bg-fuchsia-800 text-white",
};
export const MATCH_KIND_LABEL = { played: tr("Played"), retired: tr("Retirement"), walkover_pair: tr("Pair forfeit"), walkover_match: tr("Match forfeit"), not_played: tr("Not played yet") } as const;
export const INCIDENT_LABEL = { disciplinary: tr("Disciplinary"), injury: tr("Injury"), weather: tr("Weather"), court: tr("Court or equipment"), other: tr("Other") } as const;
export const FORFEIT_MODE_LABEL = { three_zero: tr("Simulation A — opponent credited 3 matches to 0"), no_score: tr("Simulation B — forfeit recorded, no match score"), commission_decides: tr("Simulation C — the Commission decides, nothing is credited") } as const;
export function scoreIssueText(i: ScoreIssue): string {
  const M: Record<string, string> = {
    set_invalid: tr("Set {set}: {score} is not a valid set score."), stb_invalid: tr("Set {set}: invalid super tie-break score."), too_many_sets: tr("More sets than the configured maximum ({max})."), match_already_decided: tr("Set {set} was entered after the match was already decided."),
    match_incomplete: tr("The match is not decided yet."), third_set_undecided: tr("The third-set format is not decided by the rules: both a full set and a super tie-break are accepted for now."), third_set_stb_not_allowed: tr("A super tie-break is not allowed by the current configuration."),
    third_set_full_required: tr("The current configuration requires a full third set."), side_required: tr("Choose which side retires or forfeits."), score_with_walkover: tr("A forfeited match has no score."), no_score: tr("No score entered."),
  };
  return fmtMsg(M[i.code] ?? i.code, i.params ?? {});
}
