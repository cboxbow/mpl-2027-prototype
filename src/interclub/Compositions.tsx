import { useEffect, useMemo, useState } from "react";
import { Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo-store";
import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { REASON_MIN_LENGTH } from "@/config/demo-config";
import { clubById } from "@/data/clubs";
import { SLOTS, compKey, emptyComposition, evaluateComposition, compBlocking, membersOf, type Composition, type Slot } from "./compositions";
import { deriveStatus, otherClubsMap, rankLabel, type EngPlayer } from "./engagement";
import { parseTeam, teamId } from "./pools";
import { VerdictBadge, compIssueText, findingText } from "./d2-text";
import { IcNotice, LineBadge, WarnLine, field, sel } from "./ui-bits";
import { PROPOSED_DATES } from "./capacity";
import type { FindingCode } from "./eligibility";

const STATUS_LABEL: Record<string, string> = { draft: tr("Draft"), submitted: tr("Submitted"), returned: tr("Returned by the Commission"), checked: tr("Checked (simulated)") };
/** D2 — Compositions d'équipe (capitaine / responsable de club). P1/P2/P3 = emplacements, sans ordre sportif imposé. */
export default function Compositions() {
  const { ic, organizerClub: clubId, allowed, icAct } = useDemo(); const d = ic.dossiers.find((x) => x.clubId === clubId); const club = clubById(clubId);
  const divs = d ? Object.entries(d.lines).filter(([, l]) => l.status !== "refused" && l.status !== "draft").map(([c]) => c) : [];
  const [div, setDiv] = useState(divs[0] ?? ""); const division = divs.includes(div) ? div : divs[0] ?? "";
  if (!d || !divs.length) return (<div className="space-y-4" data-comp-empty><IcNotice /><p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">{tr("No active engagement line: submit the engagement file (D1) before building a composition.")}</p></div>);
  return (<div className="space-y-4" data-compositions>
    <IcNotice />
    <div className="flex flex-wrap items-end gap-3"><div className="w-full sm:w-56"><label htmlFor="comp-div" className="mb-1 block text-sm font-medium">{tr("Division")}</label><select id="comp-div" className={sel} value={division} onChange={(e) => setDiv(e.target.value)} data-comp-division>{divs.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
      <p className="text-sm text-muted-foreground">{club?.name} · {tr("A tie = 3 doubles matches played at the same time on 3 courts.")}</p></div>
    <Editor key={`${clubId}|${division}`} clubId={clubId} division={division} players={d.form.players.filter((p) => p.division === division)} canEdit={allowed("composition.edit", { clubId })} canSubmit={allowed("composition.submit", { clubId })} canWaive={allowed("waiver.request", { clubId })} lineStatus={deriveStatus({ [division]: d.lines[division] })} icAct={icAct} ic={ic} />
  </div>);
}
function Editor({ clubId, division, players, canEdit, canSubmit, canWaive, icAct, ic, lineStatus }: { clubId: string; division: string; players: EngPlayer[]; canEdit: boolean; canSubmit: boolean; canWaive: boolean; icAct: ReturnType<typeof useDemo>["icAct"]; ic: ReturnType<typeof useDemo>["ic"]; lineStatus: string }) {
  const saved = ic.d2.compositions[compKey(clubId, division)]; const base = saved ?? emptyComposition(clubId, division, ic.params.refDate);
  const [c, setC] = useState<Composition>(base); useEffect(() => setC(saved ?? emptyComposition(clubId, division, ic.params.refDate)), [saved?.updatedAt, saved?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const ro = !canEdit || c.status === "submitted" || c.status === "checked"; const teamDays = useMemo(() => (ic.d2.run?.ties ?? []).filter((t) => t.day && [t.home, t.away].includes(teamId(clubId, division))).map((t) => t.day!), [ic.d2.run, clubId, division]);
  const ev = useMemo(() => evaluateComposition(c, { players, otherClubs: otherClubsMap(ic.dossiers, clubId), elig: ic.d2.elig, waivers: ic.d2.waivers, teamDays }), [c, players, ic.dossiers, ic.d2.elig, ic.d2.waivers, clubId, teamDays]);
  const bl = compBlocking(ev); const used = new Set(membersOf(c));
  const setPair = (s: Slot, i: 0 | 1, v: string) => setC({ ...c, pairs: { ...c.pairs, [s]: (i === 0 ? [v, c.pairs[s][1]] : [c.pairs[s][0], v]) as [string, string] } });
  const toggleSub = (id: string) => setC({ ...c, subs: c.subs.includes(id) ? c.subs.filter((x) => x !== id) : [...c.subs, id] });
  const toggleDay = (id: string, day: number) => { const cur = c.unavail[id] ?? []; setC({ ...c, unavail: { ...c.unavail, [id]: cur.includes(day) ? cur.filter((x) => x !== day) : [...cur, day].sort((a, b) => a - b) } }); };
  const label = (p: EngPlayer) => `${p.name} · ${tr("rank")} ${rankLabel(p.rank)}`;
  const save = () => { icAct({ k: "compSave", clubId, division, pairs: c.pairs, subs: c.subs, unavail: c.unavail }); toast.success(tr("Composition draft saved")); };
  const submit = () => { icAct({ k: "compSave", clubId, division, pairs: c.pairs, subs: c.subs, unavail: c.unavail }); icAct({ k: "compSubmit", clubId, division }); toast.success(tr("Composition submitted to the MPL Commission (demo)")); };
  const [wv, setWv] = useState<{ id: string; code: FindingCode; reason: string } | null>(null);
  const members = [...new Set(membersOf(c))];
  return (<div className="space-y-5">
    <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-semibold">{tr("Status")}:</span><span data-comp-status={c.status} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">{STATUS_LABEL[c.status]}</span><LineBadge status={lineStatus as "draft"} />{c.version > 0 && <span className="text-xs text-muted-foreground">v{c.version}</span>}{ro && <span className="text-xs text-muted-foreground" data-readonly>{!canEdit ? tr("Read-only for this role.") : tr("Locked: already submitted or decided.")}</span>}</div>
    {c.note && <p className="rounded-md border border-amber-500/60 bg-amber-500/10 p-2 text-sm" data-comp-note>{tr("Commission note")}: {c.note}</p>}
    <p className="text-xs text-muted-foreground">{tr("P1/P2/P3 are slots only: no sporting order is required until it is validated (DEC-IC-12).")}</p>
    <div className="grid gap-3 md:grid-cols-3">{SLOTS.map((s) => (
      <div key={s} className="rounded-xl border bg-card p-4" data-pair={s}><h2 className="mb-2 font-semibold">{s}</h2>
        {([0, 1] as const).map((i) => <div key={i} className="mb-2"><label className="mb-1 block text-xs text-muted-foreground" htmlFor={`${s}-${i}`}>{tr("Player")} {i + 1}</label>
          <select id={`${s}-${i}`} className={sel} disabled={ro} value={c.pairs[s][i]} onChange={(e) => setPair(s, i, e.target.value)} data-pair-select={`${s}-${i}`}><option value="">{tr("— choose —")}</option>{players.map((p) => <option key={p.id} value={p.id} disabled={used.has(p.id) && c.pairs[s][i] !== p.id && !ic.d2.elig.allowPlayerInTwoPairs}>{label(p)}</option>)}</select></div>)}
      </div>))}</div>
    <div className="rounded-xl border bg-card p-4"><h3 className="mb-2 font-semibold">{tr("Substitutes")}</h3><ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-subs>{players.filter((p) => !SLOTS.flatMap((s) => c.pairs[s]).includes(p.id)).map((p) => <li key={p.id}><label className={cn("flex min-h-11 items-center gap-3 rounded-lg border p-2 text-sm", c.subs.includes(p.id) && "border-primary bg-primary/5")}><input type="checkbox" className="size-5" disabled={ro} checked={c.subs.includes(p.id)} onChange={() => toggleSub(p.id)} data-sub={p.id} />{label(p)}</label></li>)}</ul></div>
    {members.length > 0 && <div className="rounded-xl border bg-card p-4"><h3 className="mb-1 font-semibold">{tr("Player availability (simulation)")}</h3><p className="mb-2 text-xs text-muted-foreground">{tr("Tick the days a player cannot play. Compared with the simulated calendar when available.")}</p>
      <div className="space-y-2">{members.map((id) => { const p = players.find((x) => x.id === id); if (!p) return null; return (<div key={id} className="flex flex-wrap items-center gap-2 text-sm" data-avail-row={id}><span className="w-44 shrink-0 font-medium">{p.name}</span><div className="flex flex-wrap gap-1">{PROPOSED_DATES.map((dt, i) => { const off = (c.unavail[id] ?? []).includes(i + 1); return <button key={dt} type="button" disabled={ro} aria-pressed={off} aria-label={`${p.name} J${i + 1} ${fmtDate(dt)}`} title={fmtDate(dt, { day: "numeric", month: "short" })} onClick={() => toggleDay(id, i + 1)} className={cn("h-9 min-w-10 rounded-md border px-1.5 text-xs font-medium", off ? "border-rose-700 bg-rose-700 text-white" : "bg-background")}>J{i + 1}</button>; })}</div></div>); })}</div></div>}
    <div><h3 className="mb-2 font-semibold">{tr("Eligibility and checks")}</h3>
      {members.length === 0 ? <p className="text-sm text-muted-foreground">{tr("Select players to see their eligibility.")}</p> : <ul className="space-y-2" data-elig-list>{members.map((id) => { const r = ev.elig[id]; const p = players.find((x) => x.id === id); if (!r || !p) return null; const w = ic.d2.waivers.filter((x) => x.clubId === clubId && x.division === division && x.playerId === id);
        return (<li key={id} className="rounded-lg border p-3 text-sm" data-elig-player={id}><div className="flex flex-wrap items-center gap-2"><strong>{p.name}</strong><VerdictBadge v={r.verdict} provisional={r.findings.some((f) => f.provisional)} />{r.waived.length > 0 && <span className="text-xs text-muted-foreground">{tr("Waiver granted (simulated)")}</span>}</div>
          {r.findings.length > 0 && <ul className="mt-1.5 space-y-1">{r.findings.map((f, i) => <li key={i} className="flex flex-wrap items-center gap-2 text-xs"><span className="min-w-0 flex-1">{findingText(f)}</span>{canWaive && !r.waived.includes(f.code) && !w.some((x) => x.code === f.code && x.status === "requested") && <Button size="sm" variant="outline" className="h-9" onClick={() => setWv({ id, code: f.code, reason: "" })} data-waiver-open={`${id}:${f.code}`}>{tr("Request a waiver")}</Button>}{w.filter((x) => x.code === f.code).map((x) => <span key={x.id} className="rounded-full border px-2 py-0.5" data-waiver-status={x.status}>{x.id} · {x.status === "requested" ? tr("Requested") : x.status === "granted" ? tr("Granted (simulated)") : tr("Refused (simulated)")}</span>)}</li>)}</ul>}
          {wv?.id === id && <div className="mt-2 flex flex-wrap items-end gap-2" data-waiver-form><div className="min-w-48 flex-1"><label className="mb-1 block text-xs" htmlFor={`wv-${id}`}>{tr("Reason for the waiver request")}</label><input id={`wv-${id}`} className={field} value={wv.reason} onChange={(e) => setWv({ ...wv, reason: e.target.value })} data-waiver-reason /></div><Button size="sm" disabled={wv.reason.trim().length < REASON_MIN_LENGTH} onClick={() => { icAct({ k: "waiverRequest", clubId, division, playerId: id, code: wv.code, reason: wv.reason }); setWv(null); toast.success(tr("Waiver requested (demo)")); }} data-waiver-send>{tr("Send request")}</Button><Button size="sm" variant="ghost" onClick={() => setWv(null)}>{tr("Cancel")}</Button></div>}</li>); })}</ul>}
      {ev.issues.length > 0 && <ul className="mt-3 space-y-1.5" data-comp-issues>{ev.issues.map((i, n) => <WarnLine key={n} level={i.severity}>{compIssueText(i)}</WarnLine>)}</ul>}
      <p className="mt-2 text-xs text-muted-foreground">{tr("Eligibility alerts come from provisional parameters (DEC-IC-08, DEC-IC-12): they never block a submission. Only incomplete pairs, duplicates and players outside the engagement list do.")}</p></div>
    <div className="flex flex-wrap gap-2">{!ro && <Button variant="outline" onClick={save} data-comp-save><Save className="mr-1 size-4" />{tr("Save draft")}</Button>}{!ro && canSubmit && <Button onClick={submit} disabled={bl.length > 0} data-comp-submit><Send className="mr-1 size-4" />{tr("Submit the composition")}</Button>}{!ro && !canSubmit && canEdit && <span className="self-center text-xs text-muted-foreground">{tr("Only the club administrator can submit.")}</span>}</div>
    <div><h3 className="mb-2 font-semibold">{tr("Change history")}</h3>{c.history.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No change recorded yet.")}</p> : <ol className="space-y-1.5" data-comp-history>{[...c.history].reverse().map((h, i) => <li key={i} className="rounded-md border p-2 text-sm"><span className="text-xs text-muted-foreground">{h.at} · {h.actor}</span><br />{h.action}{h.note ? ` — ${h.note}` : ""}</li>)}</ol>}</div>
  </div>);
}
void parseTeam;
