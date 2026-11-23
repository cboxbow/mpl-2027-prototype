import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { clubById } from "@/data/clubs";
import { REASON_MIN_LENGTH } from "@/config/demo-config";
import type { QueueItem } from "@/lib/demo-state";
import { useDemo } from "@/lib/demo-store";
import { eventStatus, fmtRange } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { DEMO_REFEREES, MATRIX, MATRIX_ROLES, PERM_GROUPS, PERMS, SCOPE_LABEL, can, roleLabel, type Perm, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Décision de l'administration MPL sur une demande d'organisation (file de validation). */
export function RequestActions({ q }: { q: QueueItem }) {
  const { requests, decideRequest } = useDemo(); const [rej, setRej] = useState(false); const [note, setNote] = useState("");
  const r = requests.find((x) => x.id === q.requestRef); if (!r) return null; const label = `${r.eventId} · ${clubById(r.clubId)?.name ?? r.clubId}`;
  return (<div className="flex flex-col gap-2" data-request-queue={r.id}>
    {r.note && <p className="max-w-xs text-xs text-muted-foreground">{r.note}</p>}
    {!rej ? <div className="flex gap-2"><Button size="sm" onClick={() => { decideRequest(r.id, "approved", "", label); toast.success(tr("Request approved (demo)")); }} data-approve-request><Check className="mr-1 size-4" />{tr("Approve request")}</Button><Button size="sm" variant="outline" onClick={() => setRej(true)} data-reject-request><X className="mr-1 size-4" />{tr("Refuse")}</Button></div> :
      <div className="flex flex-col gap-2"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("Refusal reason (required)")} aria-label={tr("Refusal reason (required)")} data-request-reason /><div className="flex gap-2"><Button size="sm" variant="destructive" disabled={note.trim().length < REASON_MIN_LENGTH} onClick={() => { decideRequest(r.id, "rejected", note.trim(), label); toast(tr("Request refused (demo)")); }} data-confirm-refuse-request>{tr("Confirm refusal")}</Button><Button size="sm" variant="ghost" onClick={() => setRej(false)}>{tr("Cancel")}</Button></div></div>}</div>);
}
/** Décision de l'administration MPL sur une demande de correction exceptionnelle d'un tableau publié. */
export function CorrectionActions({ q }: { q: QueueItem }) {
  const { corrections, decideCorrection } = useDemo(); const [rej, setRej] = useState(false); const [note, setNote] = useState("");
  const c = corrections.find((x) => x.id === q.correctionRef); if (!c) return null; const label = `${c.eventId} · ${c.division}`;
  return (<div className="flex flex-col gap-2" data-correction-queue={c.id}><p className="max-w-xs text-xs text-muted-foreground">{c.reason}</p>
    {!rej ? <div className="flex gap-2"><Button size="sm" onClick={() => { decideCorrection(c.id, "approved", "", label); toast.success(tr("Correction approved (demo)")); }} data-approve-correction><Check className="mr-1 size-4" />{tr("Approve correction")}</Button><Button size="sm" variant="outline" onClick={() => setRej(true)} data-reject-correction><X className="mr-1 size-4" />{tr("Refuse")}</Button></div> :
      <div className="flex flex-col gap-2"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("Refusal reason (required)")} aria-label={tr("Refusal reason (required)")} data-correction-refuse-reason /><div className="flex gap-2"><Button size="sm" variant="destructive" disabled={note.trim().length < REASON_MIN_LENGTH} onClick={() => { decideCorrection(c.id, "refused", note.trim(), label); toast(tr("Correction refused (demo)")); }} data-confirm-refuse-correction>{tr("Confirm refusal")}</Button><Button size="sm" variant="ghost" onClick={() => setRej(false)}>{tr("Cancel")}</Button></div></div>}</div>);
}
/** Affectation des juges-arbitres aux tournois (administration MPL uniquement). */
export function RefereesTab() {
  const { assignments, assignReferee, allowed } = useDemo(); const can = allowed("referee.assign");
  const events = useMemo(() => CALENDAR_EVENTS.filter((e) => ["open", "closed", "live"].includes(eventStatus(e))), []);
  return (<div data-referees-tab><p className="mb-3 text-sm text-muted-foreground">{tr("A referee can only act on the tournaments assigned here (demo scope, not a production security control).")}</p>
    <ul className="divide-y rounded-xl border bg-card">{events.map((e) => (<li key={e.id} className="flex flex-wrap items-center gap-3 p-3" data-assign-row={e.id}><div className="min-w-0 flex-1"><p className="font-medium">{`${tr("Event")} ${e.id}`} <span className="font-normal text-muted-foreground">· {clubById(e.club)?.name}</span></p><p className="text-xs text-muted-foreground">{e.category} · {fmtRange(e)}</p></div>
      <select aria-label={`${tr("Referee")} ${e.id}`} data-assign-event={e.id} disabled={!can} value={assignments[e.id] ?? ""} onChange={(ev) => { assignReferee(e.id, ev.target.value || null, `${e.id} · ${clubById(e.club)?.name}`); toast.success(tr("Assignment saved")); }} className="h-11 rounded-md border border-input bg-background px-3 text-sm md:h-9"><option value="">{tr("Unassigned")}</option>{DEMO_REFEREES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></li>))}</ul></div>);
}
/** Matrice de permissions explicite + simulateur : le contrôle est celui des fonctions du prototype (`can`). */
export function PermissionsTab() {
  const [role, setRole] = useState<Role>("club_staff"); const [perm, setPerm] = useState<Perm>("draw.publish"); const [clubId, setClubId] = useState("rm-club-hennessy"); const [refId, setRefId] = useState("REF-01"); const [eventId, setEventId] = useState("HEN-MIXTE500-1"); const { assignments } = useDemo();
  const res = can(role, perm, { clubId, refereeId: refId, assignments, eventId, targetClub: undefined });
  return (<div data-permissions-tab className="space-y-6">
    <Alert data-permissions-note><AlertTitle>{tr("Demo permissions — not production security")}</AlertTitle><AlertDescription>{tr("There is no real authentication in this prototype. These rules are enforced by the prototype functions (store and reducer, which log denied attempts in the audit log), but they do not constitute production security.")}</AlertDescription></Alert>
    <div className="overflow-x-auto rounded-xl border" tabIndex={0} role="region" aria-label={tr("Permission matrix")}><table className="w-full min-w-[760px] text-sm" data-matrix><caption className="sr-only">{tr("Permission matrix")}</caption>
      <thead><tr className="border-b bg-secondary/40 text-left"><th scope="col" className="p-2.5">{tr("Permission")}</th>{MATRIX_ROLES.map((r) => <th key={r} className="p-2.5 text-center text-xs" scope="col">{roleLabel(r)}</th>)}</tr></thead>
      <tbody>{PERM_GROUPS.map((g) => (<>{<tr key={g.title} className="bg-secondary/20"><th scope="colgroup" colSpan={MATRIX_ROLES.length + 1} className="p-2 text-left text-xs uppercase tracking-wide text-muted-foreground">{g.title}</th></tr>}{g.perms.map((p) => (<tr key={p} className="border-t" data-perm-row={p}><th scope="row" className="p-2.5 text-left font-normal">{MATRIX[p].label}</th>{MATRIX_ROLES.map((r) => { const sc = MATRIX[p].roles[r]; return <td key={r} data-cell={`${p}:${r}`} data-allowed={sc ? "true" : "false"} className={cn("p-2.5 text-center text-xs", sc ? "font-medium text-success" : "text-muted-foreground")}>{sc ? SCOPE_LABEL[sc] : "—"}</td>; })}</tr>))}</>))}</tbody></table></div>
    <p className="text-xs text-muted-foreground">{tr("“Organizer” (legacy demo role) behaves as Tournament Director. Scopes: own club, tournaments assigned to the referee, or all.")} {PERMS.length} {tr("permissions")}.</p>
    <section className="rounded-xl border bg-card p-4" data-simulator><h2 className="mb-3 font-semibold">{tr("Permission test (simulation)")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div><Label htmlFor="sim-role" className="mb-1 block text-xs">{tr("Role")}</Label><select id="sim-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">{MATRIX_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></div>
        <div><Label htmlFor="sim-perm" className="mb-1 block text-xs">{tr("Action")}</Label><select id="sim-perm" value={perm} onChange={(e) => setPerm(e.target.value as Perm)} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">{PERMS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
        <div><Label htmlFor="sim-event" className="mb-1 block text-xs">{tr("Tournament")}</Label><select id="sim-event" value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">{CALENDAR_EVENTS.filter((e) => ["open", "closed", "live"].includes(eventStatus(e))).map((e) => <option key={e.id} value={e.id}>{`${tr("Event")} ${e.id}`}</option>)}</select></div>
        <div><Label htmlFor="sim-club" className="mb-1 block text-xs">{tr("User's club")}</Label><select id="sim-club" value={clubId} onChange={(e) => setClubId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">{[...new Set(CALENDAR_EVENTS.map((e) => e.club))].map((c) => <option key={c} value={c}>{clubById(c)?.name ?? c}</option>)}</select></div>
        <div><Label htmlFor="sim-ref" className="mb-1 block text-xs">{tr("Referee")}</Label><select id="sim-ref" value={refId} onChange={(e) => setRefId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">{DEMO_REFEREES.map((r) => <option key={r.id} value={r.id}>{r.id}</option>)}</select></div></div>
      <p className={cn("mt-3 rounded-lg p-3 text-sm font-medium", res.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")} role="status" data-sim-result={res.ok ? "allowed" : "denied"}>{res.ok ? `${tr("Allowed")} — ${SCOPE_LABEL[res.scope]}` : `${tr("Denied")} — ${res.reason === "scope" ? tr("outside the user's scope") : tr("role not allowed")}`}</p></section>
    <p className="text-sm text-muted-foreground">{tr("Denied attempts are listed in the audit log tab.")}</p></div>);
}
