import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Check, Flag, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoBadge, StatCard } from "@/components/mpl/bits";
import { clubById } from "@/data/clubs";
import { DIVISION_LABEL, displayName, divisionsForEvent, type Division } from "@/data/demo";
import { allEntries } from "@/lib/entries";
import { fmtRange } from "@/lib/format";
import { useDemo } from "@/lib/demo-store";
import type { IncidentKind } from "@/lib/demo-state";
import { stageOf } from "@/lib/bracket";
import { tr, trDyn } from "@/lib/i18n";
import { OpsAccess, useScopedEvents } from "@/lib/ops";
import { refereeName } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const KINDS: Array<[IncidentKind, string]> = [["injury", tr("Injury")], ["conduct", tr("Conduct")], ["weather", tr("Weather")], ["equipment", tr("Equipment")], ["other", tr("Other")]];
const sel = "h-11 min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm md:h-9";

export default function RefereeConsole() {
  return <OpsAccess><Inner /></OpsAccess>;
}
function Inner() {
  const { archives, role, refereeId, registrations, org, allowed, sportive, setSportive, incidents, reportIncident, closeIncident, audit, corrections, draws, assignments } = useDemo();
  const events = useScopedEvents();
  const [selRaw, setSel] = useState(""); const ev = events.find((e) => e.id === selRaw) ?? events[0];
  const divisions = divisionsForEvent(ev); const [divRaw, setDiv] = useState<Division | "">(""); const division = (divRaw && divisions.includes(divRaw) ? divRaw : divisions[0]) as Division;
  const ctx = useMemo(() => ({ registrations, org }), [registrations, org]);
  const rows = allEntries(ev, division, ctx).filter((r) => r.status === "confirmed" || r.status === "pending");
  const canSport = allowed("pairs.sportive", { eventId: ev.id }); const canInc = allowed("incident.report", { eventId: ev.id });
  const label = `${ev.id} · ${division}`; const skey = (k: string) => `${ev.id}|${division}|${k}`;
  const evInc = incidents.filter((i) => i.eventId === ev.id); const evAudit = audit.filter((a) => a.ref?.includes(ev.id) || a.action.includes(ev.id)).slice(0, 40);
  const evCorr = corrections.filter((c) => c.eventId === ev.id);
  const dr = draws[`${ev.id}|${division}`]; const stage = dr ? stageOf(dr) : null;
  const [kind, setKind] = useState<IncidentKind>("other"); const [text, setText] = useState("");
  const nValid = rows.filter((r) => sportive[skey(r.key)]?.status === "validated").length;
  return (
    <div className="container-mpl py-6 md:py-10" data-referee-console data-event={ev.id}>
      <div className="mb-5 flex flex-wrap items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-primary/15"><Gavel className="size-6 text-primary" /></span><div className="min-w-0 flex-1"><h1 className="text-2xl font-bold md:text-3xl">{tr("Referee console")}</h1><p className="text-sm text-muted-foreground">{role === "referee" ? refereeName(refereeId) : tr("Preview (read-only role)")} · <span data-assigned-count>{events.length}</span> {tr("assigned tournament(s)")}</p></div>{role === "referee" && <Button asChild variant="outline" size="sm" className="min-h-11 md:min-h-8"><Link to="/interclub" data-referee-interclub>{tr("Interclub match sheets")}</Link></Button>}<DemoBadge /></div>
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
        <Label htmlFor="ref-event" className="text-sm">{tr("Tournament")}</Label>
        <select id="ref-event" className={sel} value={ev.id} onChange={(e) => setSel(e.target.value)} data-referee-event>{events.map((e) => <option key={e.id} value={e.id}>{e.id} · {clubById(e.club)?.name}</option>)}</select>
        {divisions.length > 1 && <select aria-label={tr("Draw")} className={sel} value={division} onChange={(e) => setDiv(e.target.value as Division)}>{divisions.map((d) => <option key={d} value={d}>{DIVISION_LABEL[d]}</option>)}</select>}
        <span className="text-xs text-muted-foreground">{fmtRange(ev)} · {assignments[ev.id] ? refereeName(assignments[ev.id]) : tr("Unassigned")}</span>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard label={tr("Pairs")} value={rows.length} /><StatCard label={tr("Validated sportively")} value={nValid} tone="good" /><StatCard label={tr("Open incidents")} value={evInc.filter((i) => i.status === "open").length} tone={evInc.some((i) => i.status === "open") ? "warn" : "default"} /><StatCard label={tr("Draw")} value={stage ? ({ draft: tr("Draft"), ready: tr("Ready to publish"), published: tr("Published"), locked: tr("Locked") })[stage] : "—"} /></div>
      <Tabs defaultValue="pairs">
        <TabsList className="mb-4 h-auto w-full flex-wrap justify-start gap-1">{[["pairs", tr("Pairs")], ["operations", tr("Draw, schedule, scores")], ["incidents", tr("Incidents")], ["history", tr("Modification history")], ["corrections", tr("Corrections")]].map(([v, l]) => <TabsTrigger key={v} value={v} data-ref-tab={v} className="min-h-11 md:min-h-8">{l}</TabsTrigger>)}</TabsList>
        <TabsContent value="pairs"><p className="mb-2 text-sm text-muted-foreground">{tr("Sporting validation checks the level and eligibility of each pair before seeding (illustrative, not a regulatory decision).")}</p>
          <ul className="divide-y rounded-xl border bg-card" data-pairs>{rows.length === 0 && <li className="p-3 text-sm text-muted-foreground">{tr("No pair registered yet.")}</li>}{rows.map((r) => { const s = sportive[skey(r.key)]; const nm = `${displayName(r.a)} / ${displayName(r.b)}`; return (
            <li key={r.key} className="flex flex-wrap items-center gap-2 p-3" data-pair={r.key} data-sportive={s?.status ?? "none"}><span className="min-w-0 flex-1 font-medium">{nm}</span>
              <span className={cn("rounded-full border px-2 py-0.5 text-xs", s?.status === "validated" && "border-success/50 text-success", s?.status === "flagged" && "border-warning/50 text-warning")}>{s?.status === "validated" ? tr("Validated") : s?.status === "flagged" ? tr("Flagged") : tr("To check")}</span>
              {canSport && <><Button size="sm" variant="outline" className="min-h-11 md:min-h-8" onClick={() => setSportive(skey(r.key), ev.id, { status: "validated", by: refereeId, at: "" }, nm)} data-validate-pair><Check className="mr-1 size-4" />{tr("Validate")}</Button><Button size="sm" variant="outline" className="min-h-11 md:min-h-8" onClick={() => setSportive(skey(r.key), ev.id, { status: "flagged", by: refereeId, at: "", note: "level to check" }, nm)} data-flag-pair><Flag className="mr-1 size-4" />{tr("Flag")}</Button>{s && <Button size="sm" variant="ghost" className="min-h-11 md:min-h-8" onClick={() => setSportive(skey(r.key), ev.id, null, nm)}>{tr("Clear")}</Button>}</>}
            </li>); })}</ul>
          {!canSport && <p className="mt-2 text-sm text-muted-foreground" data-readonly-pairs>{tr("Your role cannot validate pairs (read-only).")}</p>}</TabsContent>
        <TabsContent value="operations"><div className="grid gap-3 sm:grid-cols-3" data-ref-ops>{([["organizer/registrations", tr("Registrations"), "entries.view"], ["organizer/draws", tr("Draws & schedule"), "draw.edit"], ["organizer/scores", tr("Scores"), "scores.enter"]] as const).map(([to, l, perm]) => <Link key={to} to={`/${to}?event=${ev.id}`} className="rounded-xl border bg-card p-4 font-medium hover:border-primary" data-ref-link={to}>{l}<span className="mt-1 block text-xs font-normal text-muted-foreground">{allowed(perm as never, { eventId: ev.id }) ? tr("Editable") : tr("Read-only")}</span></Link>)}</div></TabsContent>
        <TabsContent value="incidents"><div data-incidents>{canInc && <div className="mb-4 grid max-w-xl gap-2 rounded-xl border bg-card p-4"><h2 className="font-semibold">{tr("Report an incident")}</h2><select aria-label={tr("Type")} className={sel} value={kind} onChange={(e) => setKind(e.target.value as IncidentKind)} data-incident-kind>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><Input aria-label={tr("Description")} placeholder={tr("Description")} value={text} onChange={(e) => setText(e.target.value)} data-incident-text /><Button className="min-h-11 w-fit" disabled={text.trim().length < 5} onClick={() => { reportIncident({ eventId: ev.id, division, kind, text: text.trim() }, label); setText(""); toast.success(tr("Incident recorded")); }} data-report-incident><AlertTriangle className="mr-1.5 size-4" />{tr("Report")}</Button></div>}
          <ul className="divide-y rounded-xl border bg-card">{evInc.length === 0 && <li className="p-3 text-sm text-muted-foreground">{tr("No incident reported.")}</li>}{evInc.map((i) => <li key={i.id} className="flex flex-wrap items-center gap-2 p-3 text-sm" data-incident={i.id} data-status={i.status}><span className="font-medium">{i.id}</span><span className="min-w-0 flex-1">{i.text}</span><span className="text-xs text-muted-foreground">{i.status === "open" ? tr("Open") : tr("Closed")}</span>{canInc && i.status === "open" && <Button size="sm" variant="outline" className="min-h-11 md:min-h-8" onClick={() => closeIncident(i.id, ev.id)} data-close-incident>{tr("Close")}</Button>}</li>)}</ul></div></TabsContent>
        <TabsContent value="history"><ol className="space-y-2" data-ref-history>{evAudit.length === 0 && <li className="text-sm text-muted-foreground">{tr("No modification recorded for this tournament.")}</li>}{evAudit.map((a, i) => <li key={i} className="rounded-lg border p-3 text-sm"><span className="block text-xs text-muted-foreground">{a.at} · {trDyn(a.actor)}</span>{trDyn(a.action)}</li>)}</ol></TabsContent>
        <TabsContent value="corrections"><ul className="divide-y rounded-xl border bg-card" data-ref-corrections>{evCorr.length === 0 && <li className="p-3 text-sm text-muted-foreground">{tr("No correction request. Use the Draws screen to request an exceptional correction on a published draw.")}</li>}{evCorr.map((c) => <li key={c.id} className="p-3 text-sm" data-correction={c.id} data-status={c.status}><span className="font-medium">{c.id}</span> · {c.division} · {{ pending: tr("Pending MPL administration"), approved: tr("Approved"), refused: tr("Refused"), applied: tr("Applied") }[c.status]}<span className="block text-xs text-muted-foreground">{c.reason}{c.decisionNote ? ` — ${c.decisionNote}` : ""}</span>{archives.filter((x) => x.correction?.id === c.id).map((x) => <span key={x.id} className="block text-xs" data-correction-archive={x.id}>{tr("Previous version archived")}: {x.id}</span>)}</li>)}</ul></TabsContent>
      </Tabs>
    </div>
  );
}
