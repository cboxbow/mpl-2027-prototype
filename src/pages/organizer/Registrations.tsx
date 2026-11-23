import { WorkflowNav } from "@/components/mpl/WorkflowNav";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowUpCircle, Check, ClipboardList, Download, History, LogOut, Search, ShieldAlert, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ClubAvatar, DemoBadge, StatCard, StatusBadge } from "@/components/mpl/bits";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { clubById } from "@/data/clubs";
import { DIVISION_LABEL, displayName, divisionsForEvent, playerById, type Division } from "@/data/demo";
import { allEntries, capacityFor, findDuplicates, freePlaces, occupied, type EntryRow, type EntryStatus } from "@/lib/entries";
import { eventStatus, fmtRange } from "@/lib/format";
import { REASON_MIN_LENGTH } from "@/config/demo-config";
import { useDemo } from "@/lib/demo-store";
import { tr, trDyn } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { OpsAccess, useScopedEvents } from "@/lib/ops";

type RowStatus = EntryStatus | "cancelled";
type Row = Omit<EntryRow, "status"> & { status: RowStatus };
type Kind = "approve" | "refuse" | "withdraw" | "promote";
type SF = "all" | "pending" | "confirmed" | "waitlist" | "closed";
const ORDER: Record<RowStatus, number> = { pending: 0, waitlist: 1, confirmed: 2, rejected: 3, withdrawn: 4, cancelled: 5 };
const BADGE: Record<RowStatus, { label: string; cls: string }> = {
  pending: { label: tr("Pending"), cls: "bg-warning/15 text-warning" }, confirmed: { label: tr("Confirmed"), cls: "bg-success/15 text-success" }, waitlist: { label: tr("Waiting list"), cls: "bg-muted text-muted-foreground" },
  rejected: { label: tr("Refused"), cls: "bg-destructive/15 text-destructive" }, withdrawn: { label: tr("Withdrawn"), cls: "bg-muted text-muted-foreground" }, cancelled: { label: tr("Cancelled"), cls: "bg-muted text-muted-foreground" },
};
const REFUSE_PRESETS = [tr("Licence not valid"), tr("Duplicate registration"), tr("Level not suitable"), tr("Incomplete information")];
const WITHDRAW_PRESETS = [tr("Injury"), tr("Partner unavailable"), tr("Personal reasons")];

/** Écran 10 — Gestion des inscriptions (organisateur) : paires, recherche/filtres, validation, refus motivé, liste d'attente, désistements, doublons, historique. */
function OrganizerRegistrationsInner() {
  const { role, allowed, setRole, org, registrations, audit, organizerClub, decideRegistration, validateEntries, refuseEntry, promoteRegistration, promoteEntry, withdrawRegistration, withdrawEntry } = useDemo();
  const [sp, setSp] = useSearchParams(); const scopedAll = useScopedEvents(); const club = clubById(organizerClub)!;
  const mine = useMemo(() => scopedAll, [scopedAll]);
  const ctx = useMemo(() => ({ registrations, org }), [registrations, org]);
  const qEvent = sp.get("event"); const fallback = mine.find((e) => registrations.some((r) => r.eventId === e.id && (r.status === "pending" || r.status === "waitlist")))?.id ?? mine.find((e) => eventStatus(e) === "open")?.id ?? mine[0]?.id;
  const ev = mine.find((e) => e.id === qEvent) ?? mine.find((e) => e.id === fallback)!;
  const canDecide = allowed("entries.decide", { eventId: ev.id });
  const divisions = divisionsForEvent(ev); const qDiv = sp.get("division") as Division | null; const division: Division = qDiv && divisions.includes(qDiv) ? qDiv : divisions[0];
  const [q, setQ] = useState(""); const [sf, setSf] = useState<SF>("all"); const [dupOnly, setDupOnly] = useState(false); const [dlg, setDlg] = useState<{ kind: Kind; row: Row } | null>(null); const [hist, setHist] = useState<Row | null>(null); const [showAllLog, setShowAllLog] = useState(false);
  const base = useMemo(() => allEntries(ev, division, ctx), [ev, division, ctx]);
  const dups = useMemo(() => findDuplicates(base), [base]);
  const cancelled = useMemo(() => registrations.filter((r) => r.eventId === ev.id && r.division === division && r.status === "cancelled"), [registrations, ev.id, division]);
  const all = useMemo<Row[]>(() => [...(base as Row[]), ...cancelled.flatMap((r): Row[] => { const p = playersOf(r.playerId, r.partnerId); return p ? [{ key: `reg-${r.id}`, a: p[0], b: p[1], status: "cancelled", source: "demo", regId: r.id, playerId: r.playerId }] : []; })], [base, cancelled]);
  const flagsOf = (r: Row) => ({ dup: dups.has(r.key) && r.status !== "rejected" && r.status !== "withdrawn" && r.status !== "cancelled", lic: [r.a, r.b].some((p) => p.licenceExpiry < ev.end) });
  const shown = useMemo(() => all.filter((r) => (sf === "all" || (sf === "closed" ? ["rejected", "withdrawn", "cancelled"].includes(r.status) : r.status === sf)) && (!dupOnly || dups.has(r.key)) && `${displayName(r.a)} ${displayName(r.b)} ${r.regId ?? ""} ${clubById(r.a.clubId)?.name ?? ""} ${clubById(r.b.clubId)?.name ?? ""}`.toLowerCase().includes(q.toLowerCase())).sort((x, y) => ORDER[x.status] - ORDER[y.status] || (x.waitRank ?? 0) - (y.waitRank ?? 0)), [all, sf, dupOnly, q, dups]);
  const cnt = (s: RowStatus) => all.filter((r) => r.status === s).length; const closed = all.filter((r) => ["rejected", "withdrawn", "cancelled"].includes(r.status)).length;
  const taken = occupied(base); const cap = capacityFor(ev, division); const free = freePlaces(ev, division, ctx); const waiting = all.filter((r) => r.status === "waitlist").sort((x, y) => (x.waitRank ?? 0) - (y.waitRank ?? 0));
  const label = (r: Row) => `${ev.id} · ${DIVISION_LABEL[division]} · ${displayName(r.a)} / ${displayName(r.b)}`;
  const log = audit.filter((x) => x.ref === ev.id); const logShown = showAllLog ? log : log.slice(0, 6);
  const setParams = (e: string, d?: string) => { const n = new URLSearchParams(); n.set("event", e); if (d) n.set("division", d); setSp(n, { replace: true }); };
  const confirm = (kind: Kind, r: Row, reason = "") => {
    if (kind === "approve") { if (r.regId) decideRegistration(r.regId, "confirmed", label(r)); else validateEntries([r.key], ev.id, label(r)); toast.success(tr("Entry approved")); }
    else if (kind === "refuse") { if (r.regId) decideRegistration(r.regId, "rejected", label(r), reason); else refuseEntry(r.key, ev.id, label(r), reason); toast(tr("Entry refused (demo)")); }
    else if (kind === "withdraw") { if (r.regId) withdrawRegistration(r.regId, label(r), reason); else withdrawEntry(r.key, ev.id, label(r), reason); toast(tr("Withdrawal recorded (demo)")); }
    else { if (free < 1) return toast.error(tr("No free place — a place must open first")); if (r.regId) promoteRegistration(r.regId, label(r)); else promoteEntry(r.key, ev.id, label(r)); toast.success(tr("Pair promoted from the waiting list")); }
    setDlg(null);
  };
  const exportCsv = () => { const body = [["team", "status", "waiting_rank", "source", "registration"], ...shown.map((r) => [`${displayName(r.a)} / ${displayName(r.b)}`, r.status, r.waitRank ?? "", r.source, r.regId ?? ""])]; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body.map((x) => x.join(",")).join("\n")], { type: "text/csv" })); a.download = `${ev.id}-${division}-registrations-demo.csv`; a.click(); toast.success(tr("Entries exported")); };
  const dupText = (r: Row) => (dups.get(r.key) ?? []).map((s) => { const [pid, key] = s.split("|"); const other = all.find((x) => x.key === key); const pl = [r.a, r.b].find((p) => p.id === pid); return `${pl ? displayName(pl) : pid} ${tr("also appears in")} ${other ? `${displayName(other.a)} / ${displayName(other.b)}` : key}`; }).join(" · ");
  return (
    <div className="container-mpl py-6 sm:py-8" data-organizer-registrations>
      <WorkflowNav />
      <Link to="/organizer" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:min-h-0"><ArrowLeft className="size-4" />{tr("Organizer space")}</Link>
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5"><ClubAvatar club={clubById(ev.club) ?? club} size={48} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold sm:text-3xl">{tr("Registration management")}</h1><DemoBadge label={tr("DEMO ORGANIZER")} /></div><p className="text-sm text-muted-foreground">{(clubById(ev.club) ?? club).name} · <span className="inline-flex items-center gap-1.5">{ev.category} · {fmtRange(ev)} <StatusBadge status={eventStatus(ev)} /></span></p></div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,260px)_auto]"><Select value={ev.id} onValueChange={(v) => setParams(v)}><SelectTrigger aria-label={tr("Event")}><SelectValue /></SelectTrigger><SelectContent>{mine.map((e) => <SelectItem key={e.id} value={e.id}>{e.category.replace("MIXTE ", tr("Mixed "))} · {fmtRange(e)}</SelectItem>)}</SelectContent></Select><Button asChild variant="outline"><Link to={`/tournaments/${ev.id}`}>{tr("Public page")}</Link></Button></div></div>
      {divisions.length > 1 && <div className="mb-4 inline-flex flex-wrap rounded-lg border p-0.5" role="group" aria-label={tr("Draw")}>{divisions.map((d) => <button key={d} onClick={() => setParams(ev.id, d)} aria-pressed={division === d} className={cn("min-h-11 rounded-md px-4 text-sm font-medium transition md:min-h-9", division === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{DIVISION_LABEL[d]}</button>)}</div>}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5" data-reg-stats><StatCard label={tr("Places taken")} value={`${taken}/${cap}`} hint={free > 0 ? `${free} ${tr("free")}` : tr("Draw full")} tone={free === 0 ? "warn" : "default"} icon={<ClipboardList className="size-4" />} /><StatCard label={tr("Pending")} value={cnt("pending")} tone={cnt("pending") ? "warn" : "default"} /><StatCard label={tr("Confirmed")} value={cnt("confirmed")} tone="good" /><StatCard label={tr("Waiting list")} value={cnt("waitlist")} /><StatCard label={tr("Possible duplicates")} value={[...dups.keys()].filter((k) => all.find((r) => r.key === k && ["pending", "confirmed", "waitlist"].includes(r.status))).length} tone={dups.size ? "warn" : "default"} icon={<ShieldAlert className="size-4" />} /></div>
      {!canDecide && <Alert className="mb-4" data-readonly-note><AlertTitle>{tr("Read-only for your role")}</AlertTitle><AlertDescription>{tr("Your role can view registrations but not confirm or refuse them. Sporting validation of pairs is done in the referee console.")}</AlertDescription></Alert>}
      {canDecide && free > 0 && waiting.length > 0 && <Alert className="mb-4 border-primary/40" data-free-place-banner><ArrowUpCircle className="size-4" /><AlertTitle>{free} {free > 1 ? tr("places are free") : tr("place is free")} — {waiting.length} {tr("on the waiting list")}</AlertTitle><AlertDescription className="flex flex-wrap items-center gap-3"><span>{tr("Promotion is manual in this prototype (no automatic promotion, no automatic refund).")}</span><Button size="sm" className="min-h-11 md:min-h-8" onClick={() => setDlg({ kind: "promote", row: waiting[0] })} data-promote-next>{tr("Promote next in line")} (#{waiting[0].waitRank})</Button></AlertDescription></Alert>}
      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={tr("Search a pair")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search a player, club or reference…")} className="pl-9" /></div><Button variant="outline" onClick={exportCsv} disabled={!shown.length} className="min-h-11 md:min-h-9"><Download className="mr-1.5 size-4" />{tr("Export CSV")}</Button></div>
      <div className="mb-4 flex flex-wrap items-center gap-3"><ToggleGroup type="single" value={sf} onValueChange={(v) => v && setSf(v as SF)} variant="outline" size="sm" aria-label={tr("Filter by status")} className="flex-wrap justify-start">{([["all", tr("All"), all.length], ["pending", tr("Pending"), cnt("pending")], ["confirmed", tr("Confirmed"), cnt("confirmed")], ["waitlist", tr("Waiting list"), cnt("waitlist")], ["closed", tr("Closed"), closed]] as const).map(([v, l, n]) => <ToggleGroupItem key={v} value={v} className="min-h-11 px-3 md:min-h-8" data-filter={v}>{l} <span className="ml-1 text-xs text-muted-foreground num">{n}</span></ToggleGroupItem>)}</ToggleGroup>
        <div className="flex min-h-11 items-center gap-2"><Checkbox id="dup-only" checked={dupOnly} onCheckedChange={(c) => setDupOnly(c === true)} /><Label htmlFor="dup-only" className="cursor-pointer font-normal">{tr("Possible duplicates only")}</Label></div></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {shown.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{all.length === 0 ? tr("No registration yet for this draw.") : tr("No pair matches these filters.")}</div> : (
            <ul className="divide-y rounded-xl border" aria-label={tr("Registered pairs")}>{shown.map((r) => { const f = flagsOf(r); const b = BADGE[r.status]; const live = r.status === "pending" || r.status === "confirmed" || r.status === "waitlist"; return (
              <li key={r.key} data-entry-source={r.source} data-entry-status={r.status} data-entry-key={r.key} className={cn("flex flex-wrap items-start gap-x-3 gap-y-2 p-3", r.source === "demo" && "bg-accent/30", !live && "opacity-75")}>
                <div className="min-w-0 flex-1 basis-56"><p className="break-words font-medium">{displayName(r.a)} / {displayName(r.b)}{r.source === "demo" && <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-success">{tr("Demo registration")} {r.regId}</span>}</p>
                  <p className="text-xs text-muted-foreground">{clubById(r.a.clubId)?.name} · {clubById(r.b.clubId)?.name}</p>
                  {(f.dup || f.lic) && <div className="mt-1 flex flex-wrap gap-1.5">{f.dup && <span className="inline-flex items-center gap-1 rounded border border-warning/50 bg-warning/10 px-1.5 py-0.5 text-xs font-semibold text-warning" data-flag="duplicate" title={dupText(r)}><ShieldAlert className="size-3" />{tr("Possible duplicate")}</span>}{f.lic && <span className="inline-flex items-center gap-1 rounded border border-destructive/50 bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive" data-flag="licence"><AlertTriangle className="size-3" />{tr("Licence expired")}</span>}</div>}
                  {f.dup && <p className="mt-1 text-xs text-warning">{dupText(r)}</p>}
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", b.cls)} data-status-label>{b.label}{r.status === "waitlist" && r.waitRank ? ` #${r.waitRank}` : ""}</span>
                <div className="flex flex-wrap gap-2">
                  {canDecide && r.status === "pending" && <><Button size="sm" className="min-h-11 md:min-h-8" onClick={() => (f.dup || f.lic ? setDlg({ kind: "approve", row: r }) : confirm("approve", r))} aria-label={trDyn(`Approve ${displayName(r.a)} / ${displayName(r.b)}`)}><Check className="mr-1 size-4" />{tr("Approve")}</Button><Button size="sm" variant="outline" className="min-h-11 md:min-h-8" onClick={() => setDlg({ kind: "refuse", row: r })} aria-label={trDyn(`Refuse ${displayName(r.a)} / ${displayName(r.b)}`)}><X className="mr-1 size-4" />{tr("Refuse")}</Button></>}
                  {canDecide && r.status === "waitlist" && <><Button size="sm" className="min-h-11 md:min-h-8" disabled={free < 1} title={free < 1 ? tr("No free place — a place must open first") : undefined} onClick={() => setDlg({ kind: "promote", row: r })} aria-label={trDyn(`Promote ${displayName(r.a)} / ${displayName(r.b)}`)}><ArrowUpCircle className="mr-1 size-4" />{tr("Promote")}</Button><Button size="sm" variant="outline" className="min-h-11 md:min-h-8" onClick={() => setDlg({ kind: "refuse", row: r })} aria-label={trDyn(`Refuse ${displayName(r.a)} / ${displayName(r.b)}`)}><X className="mr-1 size-4" />{tr("Remove")}</Button></>}
                  {canDecide && (r.status === "pending" || r.status === "confirmed") && <Button size="sm" variant="ghost" className="min-h-11 md:min-h-8" onClick={() => setDlg({ kind: "withdraw", row: r })} aria-label={trDyn(`Record withdrawal ${displayName(r.a)} / ${displayName(r.b)}`)}><LogOut className="mr-1 size-4" />{tr("Withdrawal")}</Button>}
                  <Button size="sm" variant="ghost" className="min-h-11 md:min-h-8" onClick={() => setHist(r)} aria-label={trDyn(`History ${displayName(r.a)} / ${displayName(r.b)}`)}><History className="mr-1 size-4" />{tr("History")}</Button>
                </div></li>); })}</ul>)}
          <p className="mt-3 text-xs text-muted-foreground">{tr("Fictional entries and demo registrations share the same list. Every action is written to the audit log and reaches the player space.")}</p>
        </div>
        <aside className="rounded-2xl border bg-card p-4 lg:self-start" aria-labelledby="log-h" data-activity-log><h2 id="log-h" className="mb-3 flex items-center gap-2 font-semibold"><History className="size-4 text-muted-foreground" />{tr("Action history")}</h2>
          {log.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">{tr("No action recorded for this event yet.")}</p> : <ol className="space-y-2.5">{logShown.map((x, i) => <li key={i} className="border-l-2 pl-3 text-xs"><p className="break-words text-sm">{trDyn(x.action)}</p><p className="mt-0.5 font-mono text-muted-foreground">{x.at} · {trDyn(x.actor)}</p></li>)}</ol>}
          {log.length > 6 && <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setShowAllLog(!showAllLog)}>{showAllLog ? tr("Show less") : `${tr("Show all")} (${log.length})`}</Button>}
          <Button asChild variant="outline" size="sm" className="mt-3 w-full"><Link to="/admin">{tr("Open the audit log (admin)")}</Link></Button></aside>
      </div>
      <DecisionDialog dlg={dlg} label={dlg ? label(dlg.row) : ""} flags={dlg ? flagsOf(dlg.row) : { dup: false, lic: false }} dupText={dlg ? dupText(dlg.row) : ""} onClose={() => setDlg(null)} onConfirm={(reason) => dlg && confirm(dlg.kind, dlg.row, reason)} />
      <HistoryDialog row={hist} onClose={() => setHist(null)} reg={hist?.regId ? registrations.find((x) => x.id === hist.regId) : undefined} auditLines={hist ? log.filter((x) => x.action.includes(`${displayName(hist.a)} / ${displayName(hist.b)}`) || (hist.regId && x.action.includes(hist.regId))) : []} />
    </div>
  );
}
function playersOf(a: string, b: string) { const pa = playerById(a), pb = playerById(b); return pa && pb ? ([pa, pb] as const) : null; }

function DecisionDialog({ dlg, label, flags, dupText, onClose, onConfirm }: { dlg: { kind: Kind; row: Row } | null; label: string; flags: { dup: boolean; lic: boolean }; dupText: string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState(""); const [ack, setAck] = useState(false); const kind = dlg?.kind; const needReason = kind === "refuse" || kind === "withdraw"; const needAck = kind === "approve";
  const okReason = reason.trim().length >= REASON_MIN_LENGTH; const disabled = (needReason && !okReason) || (needAck && !ack);
  const done = () => { onConfirm(reason.trim()); setReason(""); setAck(false); }; const close = () => { onClose(); setReason(""); setAck(false); };
  const T = { approve: tr("Approve this pair?"), refuse: tr("Refuse this entry?"), withdraw: tr("Record a withdrawal?"), promote: tr("Promote this pair?") };
  const D = { approve: tr("This pair has a warning. Approve it only if you have checked it."), refuse: tr("The reason is shown to the player in their space (demo)."), withdraw: tr("The pair withdraws. The place is released; no automatic refund is made in this prototype."), promote: tr("The pair moves from the waiting list to the confirmed list and the player is notified.") };
  const presets = kind === "withdraw" ? WITHDRAW_PRESETS : REFUSE_PRESETS;
  return (<Dialog open={!!dlg} onOpenChange={(o) => !o && close()}><DialogContent data-decision-dialog={kind}><DialogHeader><DialogTitle>{kind ? T[kind] : ""}</DialogTitle><DialogDescription>{kind ? D[kind] : ""}</DialogDescription></DialogHeader>
    <p className="break-words rounded-lg border bg-secondary/50 p-2.5 text-sm font-medium">{label}</p>
    {needAck && <div className="space-y-2 text-sm">{flags.dup && <p className="text-warning">{dupText}</p>}{flags.lic && <p className="text-destructive">{tr("At least one licence expires before the event.")}</p>}<Label htmlFor="ack" className="flex min-h-11 cursor-pointer items-start gap-2 font-normal"><Checkbox id="ack" checked={ack} onCheckedChange={(c) => setAck(c === true)} className="mt-0.5" />{tr("I checked this pair and want to approve it anyway.")}</Label></div>}
    {needReason && <div className="space-y-2"><Label htmlFor="reason">{tr("Reason (required)")}</Label><div className="flex flex-wrap gap-1.5">{presets.map((p) => <button key={p} type="button" onClick={() => setReason(p)} className="min-h-11 rounded-full border px-3 text-xs hover:bg-accent md:min-h-8">{p}</button>)}</div><Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} aria-invalid={reason.length > 0 && !okReason} placeholder={tr("Explain the reason…")} />{reason.length > 0 && !okReason && <p className="text-xs text-destructive">{tr("Please write at least")} {REASON_MIN_LENGTH} {tr("characters.")}</p>}</div>}
    <DialogFooter><Button variant="ghost" onClick={close}>{tr("Cancel")}</Button><Button variant={kind === "refuse" || kind === "withdraw" ? "destructive" : "default"} disabled={disabled} onClick={done} data-confirm-decision>{kind === "approve" ? tr("Approve") : kind === "refuse" ? tr("Refuse entry") : kind === "withdraw" ? tr("Record withdrawal") : tr("Promote")}</Button></DialogFooter></DialogContent></Dialog>);
}
function HistoryDialog({ row, reg, auditLines, onClose }: { row: Row | null; reg?: { history?: { at: string; actor: string; action: string; note?: string }[] }; auditLines: { at: string; actor: string; action: string }[]; onClose: () => void }) {
  const items = reg?.history?.length ? reg.history.map((h) => ({ at: h.at, actor: h.actor, text: h.note ? `${h.action} — ${h.note}` : h.action })) : auditLines.map((x) => ({ at: x.at, actor: x.actor, text: x.action }));
  return (<Dialog open={!!row} onOpenChange={(o) => !o && onClose()}><DialogContent data-history-dialog><DialogHeader><DialogTitle>{tr("Registration history")}</DialogTitle><DialogDescription>{row ? `${displayName(row.a)} / ${displayName(row.b)}${row.regId ? ` · ${row.regId}` : ""}` : ""}</DialogDescription></DialogHeader>
    {items.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">{tr("No action recorded yet for this pair (fictional entry).")}</p> : <ol className="max-h-72 space-y-2 overflow-y-auto">{items.map((x, i) => <li key={i} className="border-l-2 pl-3 text-sm"><p className="break-words">{trDyn(x.text)}</p><p className="font-mono text-xs text-muted-foreground">{x.at} · {trDyn(x.actor)}</p></li>)}</ol>}
    <DialogFooter><Button variant="ghost" onClick={onClose}>{tr("Close")}</Button></DialogFooter></DialogContent></Dialog>);
}

export default function OrganizerRegistrations() { return <OpsAccess><OrganizerRegistrationsInner /></OpsAccess>; }
