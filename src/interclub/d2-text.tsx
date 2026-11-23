import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { fmtMsg } from "./EngagementForm";
import type { Finding, Verdict } from "./eligibility";
import type { CompIssue } from "./compositions";
import type { PoolIssue } from "./pools";
import type { Adjustment, Conflict } from "./schedule";
import type { PrepStatus } from "./d2state";
import { clubById } from "@/data/clubs";
import { parseTeam } from "./pools";

export const clubName = (id: string) => clubById(id)?.name ?? id;
export const teamName = (t: string) => { const { clubId, division } = parseTeam(t); return `${clubName(clubId)} · ${division}`; };
export const VERDICT_LABEL: Record<Verdict, string> = { eligible: tr("Eligible"), check: tr("Check needed"), not_eligible: tr("Not eligible") };
const VERDICT_TONE: Record<Verdict, string> = { eligible: "bg-emerald-700 text-white", check: "bg-amber-700 text-white", not_eligible: "bg-rose-700 text-white" };
export const VerdictBadge = ({ v, provisional }: { v: Verdict; provisional?: boolean }) => <span data-verdict-badge={v} className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", VERDICT_TONE[v])}>{VERDICT_LABEL[v]}{provisional ? " · " + tr("provisional") : ""}</span>;
export const PREP_LABEL: Record<PrepStatus, string> = { draft: tr("Draft"), to_check: tr("To verify"), ready: tr("Ready for validation"), validated_demo: tr("Validated in demo") };
const PREP_TONE: Record<PrepStatus, string> = { draft: "bg-zinc-600 text-white", to_check: "bg-amber-700 text-white", ready: "bg-sky-700 text-white", validated_demo: "bg-emerald-700 text-white" };
export const PrepBadge = ({ s }: { s: PrepStatus }) => <span data-prep-status={s} className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", PREP_TONE[s])}>{PREP_LABEL[s]}</span>;

export function findingText(f: Finding): string {
  const p = f.params ?? {}; const M: Record<string, string> = {
    club_member: tr("The player belongs to another club ({club}) in the prototype player base."), club_member_unknown: tr("Player not found in the prototype player base: club membership cannot be checked."),
    exclusive: tr("Already listed by another club ({club}) this season."), unranked: tr("Unranked (NC): the rule for unranked players is not decided (DEC-IC-11)."), rank_unknown: tr("MPL rank not provided."),
    no_threshold_for_division: tr("No threshold is defined for {division}: eligibility by ranking cannot be decided (DEC-IC-08)."), threshold_undefined: tr("Threshold undefined."),
    too_strong: tr("Rank {rank} is better than the simulated minimum {min} for {division} (simulated threshold, not official)."), too_weak: tr("Rank {rank} is below the simulated maximum {max} for {division} (simulated threshold, not official)."),
    multi_division: tr("Also listed in {divisions}: division change or participation in another division to be checked."), gender: tr("The player's gender does not match the division {division}."),
    sub_outside_list: tr("Substitute outside the club engagement list."), not_listed: tr("The player is not in the club engagement list for this division."), no_threshold: tr("No threshold."),
  };
  return fmtMsg(M[f.code] ?? f.code, p);
}
export function compIssueText(i: CompIssue): string {
  const p = i.params ?? {}; const M: Record<string, string> = {
    pair_incomplete: tr("Pair {slot} is incomplete (two players required)."), duplicate_player: tr("{name} appears more than once in the composition."), sub_in_pair: tr("{name} is both in a pair and a substitute."),
    not_listed: tr("{name} is not in the engagement list of this division."), too_many_subs: tr("{n} substitutes selected, provisional limit {max}."), player_unavailable: tr("{name} is unavailable on {days}, when the team is scheduled (simulation)."),
    elig_not: tr("{name}: not eligible under provisional parameters."), elig_check: tr("{name}: eligibility to be checked."),
  };
  return fmtMsg(M[i.code] ?? i.code, p);
}
export function poolIssueText(i: PoolIssue): string {
  const p = { ...(i.params ?? {}) } as Record<string, string | number>; if (typeof p.team === "string") p.team = teamName(p.team); if (typeof p.club === "string") p.club = clubName(p.club);
  const M: Record<string, string> = {
    over_max: tr("{n} teams, above the proposed maximum of {max} (warning)."), duplicate_team: tr("{team} appears twice."), duplicate_club: tr("{club} has two teams in the same division."), unassigned: tr("{team} is not assigned to a pool."),
    removed_assigned: tr("{team} is withdrawn but still assigned."), unknown_team: tr("{team} is not in the accepted list."), stale_list: tr("The list of engaged teams changed since the draw: redo the simulation."),
    small_pool: tr("A pool has fewer than 3 teams."), uneven: tr("Pools of uneven size."), no_teams: tr("No team available for this division."),
  };
  return fmtMsg(M[i.code] ?? i.code, p);
}
export function conflictText(c: Conflict): string {
  const p = { ...(c.params ?? {}) } as Record<string, string | number>; if (typeof p.club === "string") p.club = clubName(p.club); if (typeof p.team === "string") p.team = teamName(p.team);
  const M: Record<string, string> = {
    team_double_booked: tr("{team} plays more than allowed on J{day}."), court_double_booked: tr("Court {court} at {club} is used twice on J{day} (same wave)."), host_over_capacity: tr("{club} hosts {n} ties on J{day}, capacity {cap}."),
    host_unavailable: tr("{club} is not available to host on J{day}."), team_unavailable: tr("{club} declared itself unavailable on J{day}."), outside_dates: tr("Tie outside the ten proposed days."),
  };
  return fmtMsg(M[c.code] ?? c.code, p);
}
export function reasonText(r: string): string {
  if (r.startsWith("team_unavailable:")) return fmtMsg(tr("{club} unavailable"), { club: clubName(r.split(":")[1]) });
  const M: Record<string, string> = { no_free_day: tr("no free pool day (more rounds than days)"), team_busy: tr("team already playing that day"), no_host: tr("no host with enough courts"), rounds_exceed_days: tr("the format needs more rounds than available dates (not placed)") };
  return M[r] ?? r;
}
export function adjustmentText(a: Adjustment): string {
  const p = { ...(a.params ?? {}) } as Record<string, string | number>; if (typeof p.club === "string") p.club = clubName(p.club);
  const M: Record<string, string> = {
    single_leg: tr("{division}: play a single round-robin ({rounds} rounds fit the {days} pool days)."), two_per_day: tr("{division}: two ties per team on the same day would fit ({rounds} rounds over {days} days) — NOT allowed without an explicit regulatory authorization."),
    extra_days: tr("{division}: {missing} extra date(s) needed beyond the {days} available for pool rounds."), split_pool: tr("{division}: split the pool into smaller pools (fewer rounds)."),
    declare_courts: tr("J{day}: {n} tie(s) without a host — ask clubs to declare more Friday courts."), allow_neutral: tr("Allow neutral hosts (hosting at a club that is not the home club)."), confirm_availability: tr("Ask {club} to confirm its availability on J{day}."),
    reduce_teams: tr("Reduce the number of teams or open more host clubs."), shorter_matches: tr("Shorter matches ({minutes} min, format C) would add evening slots."), fewer_courts_per_tie: tr("Playing the three matches one after another on a single court would raise hosting capacity."),
  };
  return fmtMsg(M[a.code] ?? a.code, p);
}
export function blockerText(b: { code: string; params: Record<string, string | number> }): string {
  const p = b.params;
  const M: Record<string, string> = {
    rounds_exceed_days: tr("{division}: {rounds} rounds needed but only {days} pool date(s) available ({missing} missing)."), capacity_deficit: tr("J{day}: {demand} ties to host, hosting capacity {capacity}."),
    finals_no_date: tr("{division}: no date left for the final phases (J{day} requested, {dates} dates)."), no_wave: tr("A tie needs {minutes} min: it does not fit the {window} window."), no_hosts: tr("No host club."),
  };
  return fmtMsg(M[b.code] ?? b.code, p);
}
