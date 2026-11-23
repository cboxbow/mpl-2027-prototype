/** Lot 5B-7 (P1-06) — blocs du profil joueur unifié. Lecture seule : aucun état dupliqué, aucune règle modifiée. */
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CalendarClock, ClipboardList, IdCard, Medal, Swords, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/mpl/bits";
import { clubById } from "@/data/clubs";
import { DIVISION_LABEL, displayName, playerById } from "@/data/demo";
import { fmtRange } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { DemoRegistration } from "@/lib/demo-state";
import type { HubAction, HubRegistration, HubSquad } from "@/lib/player-hub";

export const REG_STATUS: Record<DemoRegistration["status"], { label: string; cls: string }> = {
  pending: { label: tr("Pending validation"), cls: "border-warning/50 text-warning" }, confirmed: { label: tr("Confirmed"), cls: "border-success/50 text-success" },
  rejected: { label: tr("Refused by the organizer"), cls: "border-destructive/50 text-destructive" }, cancelled: { label: tr("Cancelled"), cls: "border-muted-foreground/40 text-muted-foreground" },
  waitlist: { label: tr("Waiting list"), cls: "border-warning/50 text-warning" }, withdrawn: { label: tr("Withdrawn"), cls: "border-muted-foreground/40 text-muted-foreground" },
};
const LINE: Record<HubSquad["lineStatus"], string> = { none: tr("No engagement file"), draft: tr("Draft"), submitted: tr("Submitted to the Commission"), to_complete: tr("Returned to complete"), accepted: tr("Accepted (simulated)"), refused: tr("Refused (simulated)") };

/** Navigation simple : profil · inscriptions · résultats · classements. `current` n'est pas un lien. */
export function HubNav({ playerId, current, self }: { playerId: string; current?: "dashboard" | "profile"; self: boolean }) {
  const items: Array<{ k: string; to: string; label: string; icon: React.ReactNode }> = [
    ...(self ? [{ k: "dashboard", to: "/player", label: tr("My space"), icon: <ClipboardList className="size-4" /> }] : []),
    { k: "profile", to: `/players/${playerId}`, label: tr("Profile"), icon: <IdCard className="size-4" /> },
    ...(self ? [{ k: "registrations", to: `/players/${playerId}?tab=registrations`, label: tr("Registrations"), icon: <CalendarClock className="size-4" /> }] : []),
    { k: "results", to: `/players/${playerId}?tab=matches`, label: tr("Results"), icon: <Swords className="size-4" /> },
    { k: "rankings", to: "/rankings", label: tr("Rankings"), icon: <Trophy className="size-4" /> },
  ];
  return (<nav aria-label={tr("Player navigation")} data-hub-nav className="mb-5 flex flex-wrap gap-2">{items.map((i) => (<Button key={i.k} asChild variant={current === i.k ? "secondary" : "outline"} size="sm" className="min-h-11 md:min-h-9"><Link to={i.to} aria-current={current === i.k ? "page" : undefined} data-hub-link={i.k}>{i.icon}<span className="ml-1.5">{i.label}</span></Link></Button>))}</nav>);
}

const ACTION_TEXT: Record<HubAction["kind"], { title: string; hint: string }> = {
  licence: { title: tr("Renew your licence"), hint: tr("Your licence expires before an upcoming tournament or has already expired. Registration checks will fail until it is renewed.") },
  pending: { title: tr("Registration awaiting validation"), hint: tr("The organizer has not decided yet. Nothing to do except follow the status.") },
  waitlist: { title: tr("On a waiting list"), hint: tr("You are promoted automatically if a place opens. You can withdraw at any time.") },
  "squad-returned": { title: tr("Interclub file returned to your club"), hint: tr("Your club must complete its file. This is not an individual registration.") },
  register: { title: tr("Register for a tournament"), hint: tr("You have no upcoming registration.") },
};
/** Actions prioritaires, avec état vide explicite. */
export function HubActionList({ actions, eventName }: { actions: HubAction[]; eventName: (id?: string) => string }) {
  return (<section className="rounded-2xl border bg-card p-4 sm:p-5" data-player-actions aria-labelledby="hub-actions-h"><h2 id="hub-actions-h" className="mb-3 text-base font-bold">{tr("Priority actions")}</h2>
    {actions.length === 0 ? <p className="text-sm text-muted-foreground" data-empty="player-actions">{tr("Nothing to do right now.")}</p> : (
      <ul className="space-y-2.5">{actions.map((a) => { const t = ACTION_TEXT[a.kind]; const to = a.kind === "register" ? "/calendar?status=open" : a.kind === "squad-returned" ? "#hub-squads" : "/register#track-h"; return (
        <li key={a.id} data-action={a.kind} className="flex flex-wrap items-start gap-3 rounded-xl border p-3">{a.kind === "licence" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" /> : <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />}
          <div className="min-w-0 flex-1 basis-56"><p className="text-sm font-medium">{t.title}{a.eventId ? ` — ${eventName(a.eventId)}` : ""}</p><p className="text-xs text-muted-foreground">{t.hint}</p></div>
          {a.kind !== "licence" && <Button asChild size="sm" variant="outline" className="min-h-11 md:min-h-8">{to.startsWith("#") ? <a href={to}>{tr("See")}</a> : <Link to={to}>{a.kind === "register" ? tr("Browse open tournaments") : tr("Track")}</Link>}</Button>}</li>); })}</ul>)}</section>);
}

/** Inscriptions et statuts du joueur — même source que le suivi du parcours 5B-5 (aucune duplication). */
export function HubRegistrationList({ items }: { items: HubRegistration[] }) {
  return (<section data-hub-registrations aria-label={tr("My registrations")}>
    {items.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center" data-empty="hub-registrations"><p className="font-semibold">{tr("No registration yet")}</p><p className="mt-1 text-sm text-muted-foreground">{tr("Find a tournament and register with a partner in a few clicks.")}</p><Button asChild className="mt-4 min-h-11"><Link to="/register">{tr("Register for a tournament")}</Link></Button></div> : (
      <ul className="space-y-2">{items.map((h) => { const s = REG_STATUS[h.reg.status]; const q = playerById(h.partnerId); return (
        <li key={h.reg.id} data-reg-id={h.reg.id} data-hub-reg-status={h.reg.status} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"><CategoryBadge category={h.category as never} />
          <div className="min-w-0 flex-1 basis-52"><Link to={`/tournaments/${h.eventId}`} className="block break-words font-medium hover:underline">{h.clubName}</Link><p className="text-xs text-muted-foreground">{fmtRange({ start: h.start, end: h.end })} · {DIVISION_LABEL[h.reg.division]}{q ? ` · ${tr("with")} ${displayName(q)}` : ""}{!h.upcoming ? ` · ${tr("past")}` : ""}</p></div>
          <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", s.cls)}>{s.label}</span></li>); })}</ul>)}
    {items.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{tr("Same data as the registration tracking: cancel or withdraw from the tracking page.")} <Link to="/register#track-h" className="font-medium text-primary underline-offset-4 hover:underline">{tr("Open the tracking")}</Link></p>}</section>);
}

/** Équipes Interclub. Une sélection dans un effectif n'est PAS une inscription individuelle officielle. */
export function HubSquadList({ items }: { items: HubSquad[] }) {
  return (<section id="hub-squads" data-hub-squads aria-label={tr("Interclub teams")}>
    <p className="mb-3 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground" data-squad-note>{tr("A squad selection is a club decision. It is not an individual registration and does not replace one.")}</p>
    {items.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground" data-empty="hub-squads">{tr("You are not listed in any Interclub squad.")}</div> : (
      <ul className="space-y-2">{items.map((s) => (<li key={s.clubId + s.division} data-squad={s.clubId} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"><Users className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1 basis-52"><Link to={`/clubs/${s.clubId}`} className="block break-words font-medium hover:underline">{clubById(s.clubId)?.name ?? s.clubId}</Link><p className="text-xs text-muted-foreground">{tr("Division")} {s.division}</p></div>
        <Badge variant="outline">{LINE[s.lineStatus]}</Badge><Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground">{tr("Squad selection")}</Badge></li>))}</ul>)}</section>);
}

export { Medal };
