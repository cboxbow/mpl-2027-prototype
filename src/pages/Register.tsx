import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Bell, CheckCircle2, ChevronDown, Clock, History, Search, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CategoryBadge, DemoBadge, PlayerAvatar } from "@/components/mpl/bits";
import { RegistrationWizard } from "@/components/mpl/RegistrationWizard";
import { RegistrationStepper } from "@/components/mpl/RegistrationStepper";
import { CALENDAR_EVENTS, type CalendarEvent } from "@/data/calendar.generated";
import { DIVISION_LABEL, displayName, playerById, type Division } from "@/data/demo";
import { allEntries, freePlaces } from "@/lib/entries";
import { eventStatus, fmtDate, fmtRange, shiftDate } from "@/lib/format";
import { REG_OPEN_DAYS_BEFORE, TEAM_CAPACITY } from "@/config/demo-config";
import { allowedDivisions } from "@/lib/registration";
import { isHolding, type DemoRegistration } from "@/lib/demo-state";
import { useDemo } from "@/lib/demo-store";
import { tr, trDyn } from "@/lib/i18n";
import { clubById } from "@/data/clubs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Gate } from "./player/Dashboard";

const evMap = new Map(CALENDAR_EVENTS.map((e) => [e.id, e]));
const STATUS: Record<DemoRegistration["status"], { label: string; cls: string }> = {
  pending: { label: tr("Pending validation"), cls: "border-warning/50 text-warning" }, confirmed: { label: tr("Confirmed"), cls: "border-success/50 text-success" },
  rejected: { label: tr("Refused by the organizer"), cls: "border-destructive/50 text-destructive" }, cancelled: { label: tr("Cancelled"), cls: "border-muted-foreground/40 text-muted-foreground" },
  waitlist: { label: tr("Waiting list"), cls: "border-warning/50 text-warning" }, withdrawn: { label: tr("Withdrawn"), cls: "border-muted-foreground/40 text-muted-foreground" },
};
/** Étapes du suivi d'une inscription : [libellé, atteint ?]. */
function steps(r: DemoRegistration): Array<[string, "done" | "current" | "todo" | "stop"]> {
  const s = r.status;
  if (s === "confirmed") return [[tr("Submitted"), "done"], [tr("Organizer review"), "done"], [tr("Confirmed"), "done"]];
  if (s === "pending") return [[tr("Submitted"), "done"], [tr("Organizer review"), "current"], [tr("Confirmed"), "todo"]];
  if (s === "waitlist") return [[tr("Submitted"), "done"], [tr("Waiting list"), "current"], [tr("Confirmed"), "todo"]];
  return [[tr("Submitted"), "done"], [s === "rejected" ? tr("Refused") : s === "withdrawn" ? tr("Withdrawn") : tr("Cancelled"), "stop"]];
}
/** Écran 9 — Inscription complète à un tournoi : choix du tournoi, places, assistant (partenaire → éligibilité → confirmation), suivi, liste d'attente, annulation, notifications. */
export default function Register() {
  const { role, setRole, registrations, org, playerId, notifications, cancelRegistration } = useDemo(); const me = playerById(playerId)!;
  const ctx = useMemo(() => ({ registrations, org }), [registrations, org]);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("all"); const [mineOnly, setMineOnly] = useState(true); const [wiz, setWiz] = useState<CalendarEvent | null>(null); const [cancelling, setCancelling] = useState<DemoRegistration | null>(null);
  const mine = useMemo(() => registrations.filter((r) => r.playerId === playerId || r.partnerId === playerId), [registrations, playerId]);
  const open = useMemo(() => CALENDAR_EVENTS.filter((e) => eventStatus(e) === "open"), []);
  const soon = useMemo(() => CALENDAR_EVENTS.filter((e) => eventStatus(e) === "upcoming").slice(0, 4), []);
  const cats = useMemo(() => [...new Set(open.map((e) => e.category))], [open]);
  const list = useMemo(() => open.filter((e) => (cat === "all" || e.category === cat) && `${e.clubName} ${e.category}`.toLowerCase().includes(q.toLowerCase()) && (!mineOnly || allowedDivisions(e, me).length > 0)), [open, cat, q, mineOnly, me]);
  const feed = notifications.filter((n) => n.kind === "registration" && n.playerId === playerId).slice(0, 6);
  if (role !== "player") return <Gate onSwitch={() => setRole("player")} label={tr("player")} />;
  const regOf = (e: CalendarEvent) => mine.find((r) => r.eventId === e.id && isHolding(r));
  return (
    <div className="container-mpl py-6 sm:py-8" data-register-page>
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5">
        <PlayerAvatar name={displayName(me)} size={52} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold sm:text-3xl">{tr("Register for a tournament")}</h1><DemoBadge label={tr("DEMO — NO REAL PAYMENT")} /></div><p className="text-sm text-muted-foreground">{displayName(me)} · {clubById(me.clubId)?.name} · {tr("Choose a tournament, pick a partner, check eligibility, confirm.")}</p></div>
        <Button asChild variant="outline" className="w-full sm:w-auto"><Link to="/player">{tr("My space")}</Link></Button>
      </div>
      <RegistrationStepper flow={{ step: null }} className="mb-6 rounded-2xl border bg-card p-4" />
      {mine.length > 0 && <Button type="button" variant="outline" className="mb-4 min-h-11 w-full lg:hidden" onClick={() => document.getElementById("track-h")?.scrollIntoView({ behavior: "smooth", block: "start" })} data-jump-tracker>{tr("My registrations")} ({mine.length})</Button>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="pick-h" className="min-w-0">
          <h2 id="pick-h" className="mb-3 text-lg font-semibold">{tr("1 · Choose a tournament")}</h2>
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_180px]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={tr("Search a club or category")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search a club or category…")} className="pl-9" /></div>
            <Select value={cat} onValueChange={setCat}><SelectTrigger aria-label={tr("Category")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{tr("All categories")}</SelectItem>{cats.map((c) => <SelectItem key={c} value={c}>{c.replace("MIXTE ", tr("Mixed "))}</SelectItem>)}</SelectContent></Select></div>
          <div className="mb-4 flex min-h-11 items-center gap-2"><Switch id="mine-only" checked={mineOnly} onCheckedChange={setMineOnly} /><Label htmlFor="mine-only" className="cursor-pointer font-normal">{tr("Only tournaments open to my profile")}</Label></div>
          {list.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{tr("No open tournament matches these filters.")}</div> : (
            <ul className="space-y-3" aria-label={tr("Open tournaments")}>{list.map((e) => {
              const reg = regOf(e); const divs = allowedDivisions(e, me).length ? allowedDivisions(e, me) : [];
              const places = divs.map((d: Division) => ({ d, left: freePlaces(e, d, ctx) })); const anyFull = places.some((x) => x.left === 0); const allFull = places.length > 0 && places.every((x) => x.left === 0);
              return (<li key={e.id} data-event-id={e.id} className="rounded-xl border bg-card p-4"><div className="flex flex-wrap items-center gap-3"><CategoryBadge category={e.category} />
                <div className="min-w-0 flex-1 basis-48"><Link to={`/tournaments/${e.id}`} className="block min-h-11 break-words py-2.5 font-semibold hover:underline md:min-h-0 md:py-0" data-event-link>{e.clubName}</Link><p className="text-xs text-muted-foreground">{fmtRange(e)} 2027 · {e.id}</p></div>
                {reg ? <Badge variant="outline" className={STATUS[reg.status].cls}>{STATUS[reg.status].label}</Badge> : <Button onClick={() => setWiz(e)} disabled={divs.length === 0} variant={allFull ? "outline" : "default"} className="min-h-11" data-register-event={e.id} data-waitlist={allFull}>{allFull ? tr("Join the waiting list") : tr("Register")}</Button>}</div>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" data-places>{places.length === 0 ? tr("No draw open to this profile.") : places.map(({ d, left }) => <span key={d} className={cn(left === 0 && "text-warning")}>{DIVISION_LABEL[d]}: <strong className="num text-foreground">{left === 0 ? tr("full") : `${left}/${TEAM_CAPACITY}`}</strong>{left === 0 ? ` · ${tr("waiting list open")}` : ` ${tr("places left")}`}</span>)}{anyFull && !allFull && <span>{tr("(a full draw puts you on the waiting list)")}</span>}</p></li>); })}</ul>)}
          <section aria-labelledby="ic-note-h" className="mt-6 rounded-xl border bg-card p-4" data-interclub-note><h3 id="ic-note-h" className="mb-1 text-sm font-semibold">{tr("Interclub is not a pair registration")}</h3><p className="text-sm text-muted-foreground">{tr("Interclub teams are engaged by clubs (squads, hosting, exclusivity) under their own rules. They are not registered here.")}</p><Button asChild variant="outline" size="sm" className="mt-2 min-h-11"><Link to="/interclub-public">{tr("Open the Interclub portal")}</Link></Button></section>
          {soon.length > 0 && <div className="mt-6"><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{tr("Opening soon")}</h3><ul className="grid gap-2 sm:grid-cols-2">{soon.map((e) => <li key={e.id} className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm"><Clock className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 break-words">{e.category.replace("MIXTE ", tr("Mixed "))} · {e.clubName}</span><span className="text-xs text-muted-foreground">{tr("Opens")} {fmtDate(shiftDate(e.start, -REG_OPEN_DAYS_BEFORE))}</span></li>)}</ul></div>}
        </section>

        <aside className="space-y-6">
          <section aria-labelledby="track-h"><h2 id="track-h" className="mb-3 text-lg font-semibold">{tr("My registrations")}</h2>
            {mine.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{tr("No registration yet.")} <span className="mt-1 block">{tr("Choose a tournament in the list to register; its status will be tracked here.")}</span></div> : <ul className="space-y-3" aria-label={tr("Registration tracker")}>{mine.map((r) => { const e = evMap.get(r.eventId)!; const p = playerById(r.playerId === playerId ? r.partnerId : r.playerId); const st = STATUS[r.status];
              const rank = r.status === "waitlist" ? allEntries(e, r.division, ctx).find((x) => x.regId === r.id)?.waitRank : undefined;
              return (<li key={r.id} data-reg-id={r.id} data-reg-status={r.status} className="rounded-xl border bg-card p-3.5">
                <div className="flex flex-wrap items-center gap-2"><CategoryBadge category={e.category} /><Badge variant="outline" className={st.cls} data-status-badge>{st.label}{rank ? ` #${rank}` : ""}</Badge><span className="ml-auto font-mono text-xs text-muted-foreground">{r.id}</span></div>
                <p className="mt-1.5 break-words text-sm font-medium">{e.clubName}</p><p className="text-xs text-muted-foreground">{fmtRange(e)} · {DIVISION_LABEL[r.division]} · {tr("Partner:")} {p ? displayName(p) : "—"}</p>
                <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-xs" aria-label={tr("Progress")}>{steps(r).map(([l, s], i) => <li key={i} className="flex min-w-0 items-center gap-1.5">{i > 0 && <span className="h-px w-3 shrink-0 bg-border" />}<span className={cn("inline-flex min-w-0 items-center gap-1 rounded-full px-2 py-0.5", s === "done" ? "bg-success/15 text-success" : s === "current" ? "bg-warning/15 text-warning" : s === "stop" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>{s === "done" ? <CheckCircle2 className="size-3 shrink-0" /> : s === "stop" ? <XCircle className="size-3 shrink-0" /> : <Clock className="size-3 shrink-0" />}<span>{l}</span></span></li>)}</ol>
                {r.reason && <p className="mt-2 text-xs text-muted-foreground">{tr("Reason:")} {r.reason}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">{isHolding(r) && <Button variant="outline" size="sm" className="min-h-11 md:min-h-8" onClick={() => setCancelling(r)} aria-label={trDyn(`Cancel registration ${r.id}`)}><Trash2 className="mr-1.5 size-4" />{tr("Cancel")}</Button>}<Button asChild variant="ghost" size="sm" className="min-h-11 md:min-h-8"><Link to={`/tournaments/${e.id}`}>{tr("Tournament page")}</Link></Button></div>
                {(r.history?.length ?? 0) > 0 && <details className="group mt-1"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground md:min-h-0"><History className="size-3.5" />{tr("History")} ({r.history!.length})<ChevronDown className="size-3.5 transition group-open:rotate-180" /></summary><ol className="mt-1.5 space-y-1 border-l pl-3 text-xs">{r.history!.map((h, i) => <li key={i}><span className="font-mono text-muted-foreground">{h.at}</span> · {trDyn(h.action)}{h.note ? ` — ${h.note}` : ""}</li>)}</ol></details>}
              </li>); })}</ul>}
          </section>
          <section aria-labelledby="notif-h"><h2 id="notif-h" className="mb-3 flex items-center gap-2 text-lg font-semibold"><Bell className="size-4 text-muted-foreground" />{tr("Notifications")}</h2>
            {feed.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">{tr("No notification.")}</p> : <ul className="space-y-2" aria-label={tr("Registration notifications")}>{feed.map((n) => <li key={n.id} className="rounded-lg border bg-card p-3 text-sm"><p>{trDyn(n.text)}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{n.at}</p></li>)}</ul>}
            <p className="mt-2 text-xs text-muted-foreground">{tr("In-app notifications only — no e-mail, SMS or push in this prototype.")}</p></section>
        </aside>
      </div>
      {wiz && <RegistrationWizard event={wiz} open onOpenChange={(o) => { if (!o) setWiz(null); }} />}
      <Dialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}><DialogContent><DialogHeader><DialogTitle>{tr("Cancel this registration?")}</DialogTitle><DialogDescription>{cancelling ? `${cancelling.id} — ${evMap.get(cancelling.eventId)?.clubName}. ` : ""}{cancelling?.status === "waitlist" ? tr("You leave the waiting list; the next pair moves up.") : tr("The slot is released and the organizer is informed in the audit log. No refund is processed in this prototype.")}</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" onClick={() => setCancelling(null)}>{tr("Keep registration")}</Button><Button variant="destructive" onClick={() => { if (cancelling) { cancelRegistration(cancelling.id); toast(tr("Registration cancelled (demo)")); } setCancelling(null); }}>{tr("Cancel registration")}</Button></DialogFooter></DialogContent></Dialog>
      <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{tr("Prototype: the fee is a demo value, no payment is processed and no refund is made automatically. Waiting-list promotion is done manually by the organizer.")}</p>
    </div>
  );
}
