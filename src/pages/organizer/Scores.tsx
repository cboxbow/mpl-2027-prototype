import { WorkflowNav } from "@/components/mpl/WorkflowNav";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, History, Play, Send, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClubAvatar, DemoBadge } from "@/components/mpl/bits";
import { MatchStatus } from "@/components/mpl/BracketView";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { clubById } from "@/data/clubs";
import { DIVISION_LABEL, divisionsForEvent, type Division } from "@/data/demo";
import { REASON_MIN_LENGTH } from "@/config/demo-config";
import { SetScores } from "@/components/mpl/SetScores";
import { canChangeWinner, validateResult, type MatchResult, type ResultKind, type ScoreIssue, type Set2 } from "@/lib/bracket";
import { drawView, matchLabel, roundLabel, teamName, type DrawView } from "@/lib/draws";
import { matchKey } from "@/lib/demo-state";
import { useDemo } from "@/lib/demo-store";
import { eventStatus, fmtDate, fmtRange } from "@/lib/format";
import { tr, trDyn } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { OpsAccess, useScopedEvents } from "@/lib/ops";

type Filter = "all" | "todo" | "live" | "pending" | "done";
const ISSUE: Record<ScoreIssue, string> = { empty: tr("Enter at least one set."), "invalid-set": tr("Invalid set score (e.g. 6-3, 7-5, 7-6; set 3 may be a 10-point tie-break)."), incomplete: tr("The match is not finished: one pair must win 2 sets."), "too-many-sets": tr("Too many sets for this result."), reason: trDyn(`A reason of at least ${REASON_MIN_LENGTH} characters is required.`), winner: tr("Choose the winning pair.") };
const REASONS = { walkover: [tr("No-show"), tr("Late arrival"), tr("Withdrawn before the match")], retired: [tr("Injury"), tr("Illness"), tr("Personal reason")] };
/** Écran 12 — Saisie des scores et résultats (organisateur) : saisie par set, vainqueur, forfait/abandon, correction, soumission à validation, historique. ILLUSTRATIF. */
function OrganizerScoresInner() {
  const { allowed, org, registrations, draws, matches, submitResult, startMatch, organizerClub } = useDemo();
  const [sp, setSp] = useSearchParams(); const scopedAll = useScopedEvents(); const club = clubById(organizerClub)!;
  const mine = useMemo(() => scopedAll.filter((e) => ["open", "closed", "live", "completed"].includes(eventStatus(e))), [scopedAll]);
  const sv = useMemo(() => ({ draws, matches, registrations, org }), [draws, matches, registrations, org]);
  const withDraw = mine.find((e) => Object.keys(draws).some((k) => k.startsWith(e.id + "|")))?.id;
  const ev = mine.find((e) => e.id === sp.get("event")) ?? mine.find((e) => e.id === withDraw) ?? mine.find((e) => eventStatus(e) === "open") ?? mine[0];
  const divisions = ev ? divisionsForEvent(ev) : []; const qd = sp.get("division") as Division | null; const division: Division = qd && divisions.includes(qd) ? qd : divisions[0];
  const view = useMemo(() => (ev ? drawView(sv, ev, division) : null), [sv, ev, division]);
  const [filter, setFilter] = useState<Filter>("all"); const [showDetail, setShowDetail] = useState(!!sp.get("match"));
  if (!ev) return <div className="container-mpl py-10 text-center text-muted-foreground">{tr("No event for this club.")}</div>;
  const rows = view ? [...view.resolved.values()].filter((r) => !r.bye).sort((a, b) => a.m.roundIdx - b.m.roundIdx || a.m.order - b.m.order) : [];
  const selId = sp.get("match") ?? ""; const sel = view?.resolved.get(selId) ?? null;
  const shown = rows.filter((r) => filter === "all" || (filter === "todo" ? ["ready", "scheduled"].includes(r.status) : r.status === filter));
  const cnt = (f: Filter) => rows.filter((r) => (f === "all" ? true : f === "todo" ? ["ready", "scheduled"].includes(r.status) : r.status === f)).length;
  const setParams = (e: string, d?: string, m?: string) => { const n = new URLSearchParams(); n.set("event", e); if (d) n.set("division", d); if (m) n.set("match", m); setSp(n, { replace: true }); };
  const open = (id: string) => { setParams(ev.id, division, id); setShowDetail(true); };
  return (
    <div className="container-mpl py-6 sm:py-8" data-organizer-scores>
      <WorkflowNav />
      <Link to="/organizer" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:min-h-0"><ArrowLeft className="size-4" />{tr("Organizer space")}</Link>
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5"><ClubAvatar club={clubById(ev.club) ?? club} size={48} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold sm:text-3xl">{tr("Scores and results")}</h1><DemoBadge label={tr("DEMO — NOT OFFICIAL")} /></div><p className="text-sm text-muted-foreground">{(clubById(ev.club) ?? club).name} · {ev.category} · {fmtRange(ev)}</p></div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,260px)_auto]"><Select value={ev.id} onValueChange={(v) => setParams(v)}><SelectTrigger aria-label={tr("Event")}><SelectValue /></SelectTrigger><SelectContent>{mine.map((e) => <SelectItem key={e.id} value={e.id}>{e.category.replace("MIXTE ", tr("Mixed "))} · {fmtRange(e)} · {e.id}</SelectItem>)}</SelectContent></Select>
          <Button asChild variant="outline" className="min-h-11 md:min-h-9"><Link to={`/organizer/draws?event=${ev.id}&division=${division}`}>{tr("Draws and schedule")}</Link></Button></div></div>
      {divisions.length > 1 && <div className="mb-4 inline-flex flex-wrap rounded-lg border p-0.5" role="group" aria-label={tr("Draw")}>{divisions.map((d) => <button key={d} onClick={() => setParams(ev.id, d)} aria-pressed={division === d} className={cn("min-h-11 rounded-md px-4 text-sm font-medium transition md:min-h-9", division === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{DIVISION_LABEL[d]}</button>)}</div>}
      <Alert className="mb-4" data-validation-note><ShieldCheck className="size-4" /><AlertTitle>{tr("Results are validated by MPL administration")}</AlertTitle><AlertDescription>{tr("A submitted result waits in the validation queue. The winner advances and the score becomes public only after validation. Demo data, not official results.")}</AlertDescription></Alert>
      {!view ? <div className="rounded-xl border border-dashed p-10 text-center" data-no-draw><p className="font-semibold">{tr("No draw for this event yet")}</p><p className="mt-1 text-sm text-muted-foreground">{tr("Generate the draw first: scores are entered match by match.")}</p><Button asChild className="mt-4 min-h-11"><Link to={`/organizer/draws?event=${ev.id}&division=${division}`}>{tr("Draws and schedule")}</Link></Button></div> : (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className={cn(showDetail && "hidden lg:block")} data-panel="match-list">
            <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label={tr("Filter matches")}>{([["all", tr("All")], ["todo", tr("To play")], ["live", tr("Live")], ["pending", tr("Pending validation")], ["done", tr("Completed")]] as const).map(([k, l]) => <button key={k} type="button" data-score-filter={k} aria-pressed={filter === k} onClick={() => setFilter(k)} className={cn("min-h-11 rounded-full border px-3 text-xs md:min-h-9", filter === k ? "border-primary bg-primary/15 font-semibold" : "text-muted-foreground")}>{l} <span className="num">{cnt(k)}</span></button>)}</div>
            <ul className="space-y-2 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1" data-score-list>{shown.map((r) => { const res = r.st?.result; return (<li key={r.id}><button type="button" onClick={() => open(r.id)} aria-pressed={selId === r.id} data-score-match={r.id} data-match-status={r.status} className={cn("w-full rounded-xl border bg-card p-3 text-left transition hover:border-primary/60", selId === r.id && "border-primary")}>
              <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{matchLabel(r.m)} <span className="font-normal text-muted-foreground">· {roundLabel(r.m.round)}</span></span><MatchStatus r={r} /></div>
              <p className="mt-1 break-words text-sm">{teamName(v(view), r.a, true)} <span className="text-muted-foreground">—</span> {teamName(v(view), r.b, true)}</p>
              {res && <p className="num mt-1 text-xs text-muted-foreground"><SetScores r={res} /></p>}</button></li>); })}
              {shown.length === 0 && <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{tr("No match in this filter.")}</li>}</ul>
          </div>
          <div className={cn("min-w-0 rounded-2xl border bg-card p-4 sm:p-5", !showDetail && "hidden lg:block")} data-panel="score-entry">
            <Button variant="ghost" size="sm" className="-ml-2 mb-2 min-h-11 lg:hidden" onClick={() => { setShowDetail(false); setParams(ev.id, division); }}><ArrowLeft className="mr-1.5 size-4" />{tr("All matches")}</Button>
            {!sel ? <div className="py-10 text-center text-sm text-muted-foreground" data-no-selection><ClipboardList className="mx-auto mb-2 size-8" />{tr("Select a match to enter its score.")}</div> :
              <ScoreEntry canEnter={allowed("scores.enter", { eventId: ev.id })} key={sel.id + (sel.st?.result ? "r" : "") + (sel.st?.proposal ? "p" : "")} v={view} id={sel.id} onSubmit={(res, correction) => { submitResult(matchKey(ev.id, division, sel.id), ev.id, division, sel.id, res, `${matchLabel(sel.m)} — ${ev.id} · ${DIVISION_LABEL[division]}`, correction); toast.success(tr("Result submitted — waiting for MPL admin validation (demo)")); }} onStart={() => { startMatch(matchKey(ev.id, division, sel.id), ev.id, `${matchLabel(sel.m)} — ${ev.id}`); toast.success(tr("Match marked as live")); }} />}
          </div>
        </div>)}
    </div>
  );
}
const v = (x: DrawView) => x;
function ScoreEntry({ v, id, onSubmit, onStart, canEnter }: { canEnter: boolean; v: DrawView; id: string; onSubmit: (r: MatchResult, correction: boolean) => void; onStart: () => void }) {
  const { setRole } = useDemo(); const nav = useNavigate(); const r = v.resolved.get(id)!; const st = r.st;
  const A = teamName(v, r.a), B = teamName(v, r.b); const res = st?.result; const prop = st?.proposal;
  const [correcting, setCorrecting] = useState(false); const [kind, setKind] = useState<ResultKind>("played"); const [sets, setSets] = useState<[string, string][]>([["", ""], ["", ""], ["", ""]]);
  const [side, setSide] = useState<"A" | "B" | "">(""); const [reason, setReason] = useState(""); const [touched, setTouched] = useState(false);
  const teamsKnown = r.a && r.b && r.a !== "bye" && r.b !== "bye"; const editable = canEnter && teamsKnown && !prop && (!res || correcting) && r.status !== "bye";
  const nums: Set2[] = sets.map(([x, y]) => [x === "" ? 0 : Number(x), y === "" ? 0 : Number(y)]);
  const winner = side ? (side === "A" ? "B" : "A") : undefined; // « side » = paire qui abandonne / est forfait
  const check = useMemo(() => validateResult(kind, kind === "walkover" ? [] : nums, { winner: kind === "played" ? undefined : winner, reason, reasonMin: REASON_MIN_LENGTH }), [kind, sets, side, reason]); // eslint-disable-line react-hooks/exhaustive-deps
  const corrReasonOk = !correcting || reason.trim().length >= REASON_MIN_LENGTH;
  const blockedWinner = correcting && res && check.ok && check.result.winner !== res.winner && !canChangeWinner(v.built, id, v.stateOf);
  const startCorrection = () => { setCorrecting(true); setKind(res!.kind); setSets([0, 1, 2].map((i) => (res!.sets[i] ? [String(res!.sets[i][0]), String(res!.sets[i][1])] : ["", ""])) as [string, string][]); setSide(res!.kind === "played" ? "" : res!.winner === "A" ? "B" : "A"); setReason(""); setTouched(false); };
  const submit = () => { setTouched(true); if (!check.ok || !corrReasonOk || blockedWinner) return; const result: MatchResult = { ...check.result, reason: correcting ? reason.trim() : check.result.reason }; onSubmit(result, correcting); setCorrecting(false); };
  const setCell = (i: number, j: 0 | 1, val: string) => setSets(sets.map((s, k) => (k === i ? (j === 0 ? [val, s[1]] : [s[0], val]) : s)) as [string, string][]);
  const issues = touched && !check.ok ? check.issues : [];
  const live = st?.live;
  return (
    <div data-score-entry={id}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">{matchLabel(r.m)} <span className="text-base font-normal text-muted-foreground">· {roundLabel(r.m.round)}</span></h2>{st?.court != null && st.time && <p className="text-sm text-muted-foreground">{tr("Court")} {st.court} · {st.day ? fmtDate(st.day) + " · " : ""}{st.time}</p>}</div><MatchStatus r={r} className="text-sm" /></div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center" data-teams><div className={cn("rounded-xl border p-3 text-sm font-semibold", res?.winner === "A" && "border-success/60 bg-success/10")} data-team-a>{A}</div><span className="text-center text-xs font-bold uppercase text-muted-foreground">{tr("vs")}</span><div className={cn("rounded-xl border p-3 text-sm font-semibold", res?.winner === "B" && "border-success/60 bg-success/10")} data-team-b>{B}</div></div>
      {st?.rejectedNote && <Alert variant="destructive" className="mb-3" data-rejected-note><AlertTriangle className="size-4" /><AlertTitle>{tr("Result rejected by the administration")}</AlertTitle><AlertDescription>{st.rejectedNote}</AlertDescription></Alert>}
      {!teamsKnown && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground" data-waiting>{tr("Both pairs are not known yet: the previous matches must be validated first.")}</p>}
      {prop && <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm" data-proposal><p className="font-semibold">{prop.correction ? tr("Correction submitted") : tr("Result submitted")} — {tr("waiting for validation")}</p><p className="num mt-1"><SetScores r={prop} />{prop.reason ? ` · ${prop.reason}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{tr("The winner does not advance and the score is not public until MPL administration validates it.")}</p>
        <Button variant="outline" size="sm" className="mt-2 min-h-11 md:min-h-8" onClick={() => { setRole("admin"); nav("/admin"); }} data-open-queue>{tr("Open the validation queue (admin)")}</Button></div>}
      {res && !correcting && <div className="rounded-lg border border-success/50 bg-success/10 p-3 text-sm" data-validated><p className="flex items-center gap-1.5 font-semibold"><CheckCircle2 className="size-4 text-success" />{tr("Validated result")}</p><p className="num mt-1" data-validated-score><SetScores r={res} />{res.reason ? ` · ${res.reason}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{tr("Winner")}: <strong>{res.winner === "A" ? A : B}</strong></p>
        {canEnter && <Button variant="outline" size="sm" className="mt-2 min-h-11 md:min-h-8" onClick={startCorrection} data-correct-result>{tr("Correct result")}</Button>}</div>}
      {!canEnter && <p className="mt-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground" data-readonly-scores>{tr("Your role cannot enter scores for this tournament (read-only).")}</p>}
      {canEnter && teamsKnown && !res && !prop && !live && <Button variant="outline" className="mb-3 min-h-11 md:min-h-9" onClick={onStart} data-start-match><Play className="mr-1.5 size-4" />{tr("Start match (live)")}</Button>}
      {editable && <form className="mt-3 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }} data-score-form>
        {correcting && <Alert data-correcting><AlertTriangle className="size-4" /><AlertTitle>{tr("Correcting a validated result")}</AlertTitle><AlertDescription>{tr("The current validated score stays public until the administration validates the correction. A reason is required.")}</AlertDescription></Alert>}
        <div className="inline-flex flex-wrap rounded-lg border p-0.5" role="group" aria-label={tr("Result type")}>{([["played", tr("Played")], ["walkover", tr("Walkover")], ["retired", tr("Retirement")]] as const).map(([k, l]) => <button key={k} type="button" data-kind={k} aria-pressed={kind === k} onClick={() => { setKind(k); setTouched(false); setSide(""); }} className={cn("min-h-11 rounded-md px-3 text-sm font-medium md:min-h-9", kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{l}</button>)}</div>
        {kind !== "walkover" && <div className="space-y-2" role="group" aria-label={tr("Set scores")}>{[0, 1, 2].map((i) => (<div key={i} className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2"><span className="w-14 text-xs font-semibold uppercase text-muted-foreground">{i === 2 ? tr("Set 3 / TB") : `${tr("Set")} ${i + 1}`}</span>
          <Input inputMode="numeric" type="number" min={0} max={99} value={sets[i][0]} onChange={(e) => setCell(i, 0, e.target.value)} aria-label={`${tr("Set")} ${i + 1} — ${A}`} data-set={i + 1} data-side="A" className="h-11 text-center text-lg num" /><span className="text-muted-foreground">–</span>
          <Input inputMode="numeric" type="number" min={0} max={99} value={sets[i][1]} onChange={(e) => setCell(i, 1, e.target.value)} aria-label={`${tr("Set")} ${i + 1} — ${B}`} data-set={i + 1} data-side="B" className="h-11 text-center text-lg num" /></div>))}</div>}
        {kind === "played" && check.ok && <p className="rounded-lg bg-success/10 p-2.5 text-sm" data-winner-preview>{tr("Winner")}: <strong>{check.result.winner === "A" ? A : B}</strong> <span className="num">(<SetScores r={check.result} />)</span></p>}
        {kind !== "played" && <div className="space-y-3"><div role="group" aria-label={kind === "walkover" ? tr("Pair forfeiting") : tr("Pair retiring")}><Label className="mb-1.5 block text-sm font-semibold">{kind === "walkover" ? tr("Pair forfeiting") : tr("Pair retiring")}</Label><div className="grid gap-2 sm:grid-cols-2">{(["A", "B"] as const).map((s) => <button key={s} type="button" data-side-choice={s} aria-pressed={side === s} onClick={() => setSide(s)} className={cn("min-h-11 rounded-lg border p-2.5 text-left text-sm", side === s ? "border-primary bg-primary/15 font-semibold" : "text-muted-foreground")}>{s === "A" ? A : B}</button>)}</div></div>
          <div><Label htmlFor="reason" className="mb-1.5 block text-sm font-semibold">{tr("Reason (required)")}</Label><div className="mb-2 flex flex-wrap gap-1.5">{REASONS[kind].map((p) => <button key={p} type="button" onClick={() => setReason(p)} className="min-h-11 rounded-full border px-3 text-xs hover:bg-accent md:min-h-8">{p}</button>)}</div><Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} data-reason /></div>
          {check.ok && <p className="rounded-lg bg-success/10 p-2.5 text-sm" data-winner-preview>{tr("Winner")}: <strong>{check.result.winner === "A" ? A : B}</strong> <span className="num">(<SetScores r={check.result} />)</span></p>}</div>}
        {correcting && <div><Label htmlFor="corr" className="mb-1.5 block text-sm font-semibold">{tr("Reason for the correction (required)")}</Label><Input id="corr" value={reason} onChange={(e) => setReason(e.target.value)} data-correction-reason />{touched && !corrReasonOk && <p className="mt-1 text-xs text-destructive">{ISSUE.reason}</p>}</div>}
        {issues.length > 0 && <ul className="space-y-1 text-sm text-destructive" role="alert" data-score-errors>{issues.map((i) => <li key={i}>{ISSUE[i]}</li>)}</ul>}
        {blockedWinner && <p className="text-sm text-destructive" role="alert" data-winner-blocked>{tr("The winner cannot change: later matches already have results. Reset them first (demo limit).")}</p>}
        <div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-11 md:min-h-9" data-submit-result><Send className="mr-1.5 size-4" />{correcting ? tr("Submit correction for validation") : tr("Submit for validation")}</Button>{correcting && <Button type="button" variant="ghost" className="min-h-11 md:min-h-9" onClick={() => setCorrecting(false)}>{tr("Cancel")}</Button>}</div>
      </form>}
      <section className="mt-6" aria-labelledby="hist-h" data-match-history><h3 id="hist-h" className="mb-2 flex items-center gap-2 font-semibold"><History className="size-4 text-muted-foreground" />{tr("History")}</h3>
        {(st?.history.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">{tr("No modification yet.")}</p> : <ol className="space-y-1.5 text-sm">{[...st!.history].reverse().map((h, i) => <li key={i} className="rounded-lg border bg-background p-2.5" data-history-item><span className="font-medium">{trDyn(h.action)}</span>{h.note && <span className="num text-muted-foreground"> — {trDyn(h.note)}</span>}<br /><span className="text-xs text-muted-foreground">{h.at} · {trDyn(h.actor)}</span></li>)}</ol>}</section>
    </div>
  );
}

export default function OrganizerScores() { return <OpsAccess><OrganizerScoresInner /></OpsAccess>; }
