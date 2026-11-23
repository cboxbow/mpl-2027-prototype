import { useEffect, useMemo, useState } from "react";
import { tr, trDyn } from "@/lib/i18n";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Info, Landmark, Store, UserRound, XCircle, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CategoryBadge, DemoBadge, PlayerAvatar } from "@/components/mpl/bits";
import type { CalendarEvent } from "@/data/calendar.generated";
import { DIVISION_LABEL, divisionsForEvent, displayName, playerById, type Division } from "@/data/demo";
import { REG_FEE_DEMO } from "@/config/demo-config";
import { clubById } from "@/data/clubs";
import { fmtMUR, fmtRange } from "@/lib/format";
import { useDemo } from "@/lib/demo-store";
import { allowedDivisions, checkEligibility, partnerPool, rankOf, type CheckStatus } from "@/lib/registration";
import { isHolding } from "@/lib/demo-state";
import { allEntries, freePlaces, isFull } from "@/lib/entries";
import { TEAM_CAPACITY } from "@/config/demo-config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RegistrationStepper } from "@/components/mpl/RegistrationStepper";
import { STAGES, currentStage, flowStates, stageLabel } from "@/lib/registration-flow";

const ICON: Record<CheckStatus, { I: typeof CheckCircle2; cls: string; label: string }> = { pass: { I: CheckCircle2, cls: "text-success", label: tr("Passed") }, fail: { I: XCircle, cls: "text-destructive", label: tr("Blocked") }, info: { I: Info, cls: "text-muted-foreground", label: tr("Note") } };

export function RegistrationWizard({ event, open, onOpenChange }: { event: CalendarEvent; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addRegistration, registrations, playerId, setRole, setOrganizerClub, org } = useDemo(); const nav = useNavigate();
  const me = playerById(playerId)!; const ctx = useMemo(() => ({ registrations, org }), [registrations, org]);
  const allDivisions = divisionsForEvent(event); const allowed = allowedDivisions(event, me);
  const [step, setStep] = useState(0); const [division, setDivision] = useState<Division | "">(""); const [q, setQ] = useState(""); const [partner, setPartner] = useState<string>("");
  const [err, setErr] = useState(""); const [wl, setWl] = useState(false); const [pay, setPay] = useState("card"); const [terms, setTerms] = useState(false); const [ref, setRef] = useState("");
  useEffect(() => { if (open && !division) setDivision(allowed[0] ?? ""); }, [open, division, allowed]);
  const already = registrations.find((r) => isHolding(r) && r.eventId === event.id && (r.playerId === me.id || r.partnerId === me.id));
  const div = (division || allowed[0]) as Division | undefined;
  const pool = useMemo(() => (div ? partnerPool(div, me) : []), [div, me]);
  const candidates = useMemo(() => pool.filter((p) => displayName(p).toLowerCase().includes(q.toLowerCase())).slice(0, 8), [pool, q]);
  const pp = partner ? playerById(partner) : undefined; const total = REG_FEE_DEMO * 2;
  const waitlistMode = !!div && isFull(event, div, ctx); const left = div ? freePlaces(event, div, ctx) : 0;
  const elig = useMemo(() => (div && pp ? checkEligibility({ event, division: div, me, partner: pp, registrations, ctx, waitlist: waitlistMode }) : null), [event, div, me, pp, registrations, ctx, waitlistMode]);
  const created = ref ? registrations.find((r) => r.id === ref) : undefined; const waitRank = created && div ? allEntries(event, div, ctx).find((e) => e.regId === ref)?.waitRank : undefined;
  const reset = () => { setErr(""); setWl(false); setStep(0); setPartner(""); setQ(""); setTerms(false); setPay("card"); setRef(""); setDivision(""); };
  // Chaque ouverture (ou changement de tournoi) repart d'un assistant vierge : pas d'état résiduel d'une inscription précédente.
  useEffect(() => { if (open) reset(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event.id, playerId]);
  // 5B-5 : progression commune (7 étapes) et message d'erreur lisible sous le contenu, en plus de la notification.
  const licenceOk = me.licenceExpiry >= event.end; const flow = { step, hasCategory: !!div, playerOk: allowed.length > 0 }; const cur = currentStage(flowStates(flow));
  const fail = (m: string) => { setErr(m); toast.error(m); };
  const back = () => { setErr(""); if (step === 0) onOpenChange(false); else setStep(step - 1); };
  const next = () => {
    if (!div) return;
    setErr("");
    if (step === 0 && !partner) return fail(tr("Choose a partner to continue"));
    if (step === 1 && !elig?.ok) return fail(tr("Eligibility checks failed — see the list"));
    if (step === 2) {
      if (!terms) return fail(tr("Please accept the registration conditions"));
      const r = addRegistration({ eventId: event.id, division: div, playerId: me.id, partnerId: partner, amount: total, waitlist: waitlistMode, label: `${event.id} · ${DIVISION_LABEL[div]} · ${displayName(me)} / ${displayName(pp!)}` });
      setRef(r.id); setWl(waitlistMode); toast.success(waitlistMode ? tr("Added to the waiting list (demo)") : tr("Registration created (demo)"));
    }
    setStep((s) => s + 1);
  };
  const toOrganizer = () => { setOrganizerClub(event.club); setRole("organizer"); onOpenChange(false); nav("/organizer"); };
  const toSpace = () => { onOpenChange(false); nav("/player"); };
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 200); }}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="space-y-2 border-b p-5 pr-14 text-left">
          <div className="flex flex-wrap items-center gap-2"><CategoryBadge category={event.category} /><DemoBadge label={tr("DEMO — NO REAL PAYMENT")} /></div>
          <DialogTitle>{tr("Register —")} {clubById(event.club)?.name}</DialogTitle>
          <DialogDescription>{fmtRange(event)} · {tr("Step")} {cur.n} {tr("of")} {STAGES.length} — {stageLabel(cur.stage)}</DialogDescription>
          <Progress value={(cur.n / STAGES.length) * 100} className="h-1.5" aria-label={tr("Progress")} />
          <RegistrationStepper flow={flow} className="pt-1" />
        </DialogHeader>
        <div className="space-y-4 p-5">
          {step === 0 && (<>
            {already && <Alert><AlertTriangle className="size-4" /><AlertTitle>{tr("Already registered")}</AlertTitle><AlertDescription>{tr("You already have a registration (")}{already.id}{tr(") for this event in your player space.")}</AlertDescription></Alert>}
            {allowed.length === 0 && <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>{tr("No draw available for this profile")}</AlertTitle><AlertDescription>{tr("This event offers")} {allDivisions.map((d) => DIVISION_LABEL[d]).join(", ")}{tr(". The demo profile")} <strong>{displayName(me)}</strong> {tr("cannot enter any of them — switch the demo player profile from the role menu.")}</AlertDescription></Alert>}
            <h3 className="text-sm font-semibold" data-reg-section="category">{tr("Category")} · <span className="font-normal text-muted-foreground">{event.category.replace("MIXTE ", tr("Mixed "))}{allDivisions.length === 1 && div ? ` · ${DIVISION_LABEL[div]}` : ""}</span></h3>
            {allDivisions.length > 1 && (<div><Label className="mb-2 block">{tr("Draw")}</Label><RadioGroup value={div ?? ""} onValueChange={(v) => { setDivision(v as Division); setPartner(""); }} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {allDivisions.map((d) => { const ok = allowed.includes(d); return <Label key={d} htmlFor={"d" + d} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border p-3", div === d && "border-primary bg-accent/40", !ok && "cursor-not-allowed opacity-50")}><RadioGroupItem id={"d" + d} value={d} disabled={!ok} />{DIVISION_LABEL[d]}</Label>; })}
            </RadioGroup>{allowed.length < allDivisions.length && <p className="mt-1.5 text-xs text-muted-foreground">{tr("Draws are limited by the pair composition rules for your profile (men / women / mixed / junior group).")}</p>}</div>)}
            {div && <p className={cn("rounded-lg border p-3 text-sm", waitlistMode ? "border-warning/50 bg-warning/10" : "bg-secondary/50")} data-places-line data-waitlist-mode={waitlistMode}>{waitlistMode ? <>{trDyn(`The ${DIVISION_LABEL[div]} draw is full.`)} <strong>{tr("You can join the waiting list.")}</strong> {tr("A place may open if a pair withdraws; the organizer promotes the next pair manually.")}</> : <>{tr("Places left:")} <strong className="num">{left}</strong> / <span className="num">{TEAM_CAPACITY}</span> {tr("in the")} {DIVISION_LABEL[div]} {tr("draw.")}</>}</p>}
            {div === "X" && <p className="rounded-lg border bg-secondary/50 p-3 text-sm">{tr("Mixed doubles: one man and one woman. Partner suggestions below are")} <strong>{me.gender === "M" ? "women" : "men"}</strong>.</p>}
            <h3 className="text-sm font-semibold" data-reg-section="player">{tr("Player")}</h3>
            <div className="flex items-center gap-3 rounded-lg border bg-secondary/50 p-3"><PlayerAvatar name={displayName(me)} /><div className="min-w-0"><p className="text-sm font-semibold">{displayName(me)} <span className="font-normal text-muted-foreground">{tr("(you")}{me.junior ? ` · Junior ${me.junior.group}` : ""})</span></p>{!me.junior && <p className="text-xs text-muted-foreground">{tr("Licence")} {me.licence}</p>}</div></div>
            {!me.junior && <p className={cn("-mt-2 flex items-start gap-1.5 text-xs", licenceOk ? "text-muted-foreground" : "text-destructive")} data-licence-line data-licence-ok={licenceOk}>{licenceOk ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" /> : <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />}<span>{licenceOk ? `${tr("Licence valid until")} ${me.licenceExpiry}.` : `${tr("Licence expires on")} ${me.licenceExpiry}, ${tr("before the event: registration will be blocked at the check step.")}`} {tr("Not you? Switch the demo profile from the role menu.")}</span></p>}
            <h3 className="text-sm font-semibold" data-reg-section="partner">{tr("Partner")}</h3>
            <div><Label htmlFor="partner-q" className="mb-2 block">{tr("Your partner")}</Label><Input id="partner-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search a player by name…")} disabled={!div || allowed.length === 0} /></div>
            <ul className="max-h-52 space-y-1 overflow-y-auto" role="listbox" aria-label={tr("Partner suggestions")}>
              {candidates.map((p) => (<li key={p.id}><button role="option" aria-selected={partner === p.id} onClick={() => { setPartner(p.id); setErr(""); }} className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg border p-2.5 text-left transition hover:bg-accent/40", partner === p.id && "border-primary bg-accent/50")}><PlayerAvatar name={displayName(p)} size={30} /><span className="min-w-0 flex-1 break-words text-sm font-medium">{displayName(p)}{p.junior && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{p.junior.group}</span>}</span>{!p.junior && <span className="text-xs text-muted-foreground num">{tr("Rank #")}{rankOf(p.id) ?? "—"}</span>}{partner === p.id && <CheckCircle2 className="size-4 text-primary" />}</button></li>))}
              {candidates.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">{tr("No player found for this draw.")}</li>}
            </ul>
          </>)}
          {step === 1 && pp && elig && (<>
            <div className="grid gap-2 sm:grid-cols-2">{[me, pp].map((p) => (<div key={p.id} className="flex items-center gap-3 rounded-lg border p-3"><PlayerAvatar name={displayName(p)} /><div className="min-w-0"><p className="break-words text-sm font-semibold">{displayName(p)}</p><p className="text-xs text-muted-foreground">{p.junior ? `Junior ${p.junior.group}` : p.licence}</p></div></div>))}</div>
            <ul className="space-y-2" aria-label={tr("Eligibility checks")}>{elig.checks.map((c) => { const { I, cls, label } = ICON[c.status]; return (<li key={c.id} data-check={c.id} data-status={c.status} className="flex gap-2.5 rounded-lg border p-2.5 text-sm"><I className={cn("mt-0.5 size-4 shrink-0", cls)} aria-label={label} /><div className="min-w-0"><p className="font-medium">{c.label}</p><p className="text-xs text-muted-foreground">{trDyn(c.detail)}</p></div></li>); })}</ul>
            {!elig.ok && <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>{tr("Registration blocked")}</AlertTitle><AlertDescription>{tr("Fix the failed checks (go back and choose another partner or draw). Licence renewal is simulated only in this prototype.")}</AlertDescription></Alert>}
            <p className="text-xs text-muted-foreground">{tr("Checks are computed from the fictional player data and the rules in the demo configuration. They are not the official MPL regulation.")}</p>
          </>)}
          {step === 2 && (<>
            <div className="rounded-lg border p-3 text-sm"><div className="flex justify-between"><span>{tr("Entry fee × 2 players")}</span><span className="num">{fmtMUR(REG_FEE_DEMO)} × 2</span></div><div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>{tr("Total")}</span><span className="num">{fmtMUR(total)}</span></div><p className="mt-2 text-xs text-muted-foreground">{tr("Fee is a DEMO value, not the official MPL fee.")}</p></div>
            <RadioGroup value={pay} onValueChange={setPay} className="space-y-2">
              {[["card", tr("Card online"), CreditCard], ["transfer", tr("Bank transfer"), Landmark], ["club", tr("Pay at the club"), Store]].map(([v, l, I]) => { const Ic = I as typeof CreditCard; return (<Label key={v as string} htmlFor={"p" + v} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3", pay === v && "border-primary bg-accent/40")}><RadioGroupItem id={"p" + v} value={v as string} /><Ic className="size-4" />{l as string}</Label>); })}
            </RadioGroup>
            {waitlistMode && <Alert><Info className="size-4" /><AlertTitle>{tr("Waiting list — nothing is due now")}</AlertTitle><AlertDescription>{tr("The fee would only be due if your pair is promoted. No automatic refund is made in this prototype.")}</AlertDescription></Alert>}
            <Alert><AlertTriangle className="size-4" /><AlertTitle>{tr("Simulation")}</AlertTitle><AlertDescription>{tr("No payment is processed and no card data is collected.")}</AlertDescription></Alert>
            <Label htmlFor="terms" className="flex min-h-11 cursor-pointer items-start gap-2 text-sm font-normal"><Checkbox id="terms" checked={terms} onCheckedChange={(c) => setTerms(c === true)} className="mt-0.5" />{tr("I accept the registration conditions and the MPL code of conduct.")}</Label>
          </>)}
          {step === 3 && (
            <div className="py-4 text-center"><div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-success/15"><CheckCircle2 className="size-9 text-success" /></div><h3 className="text-xl font-bold" data-confirmation-title>{wl ? tr("You are on the waiting list") : tr("Registration received")}</h3><p className="mt-1 text-sm text-muted-foreground">{tr("Reference")} <strong className="font-mono text-foreground">{ref}</strong> · {displayName(me)} &amp; {pp ? displayName(pp) : ""}</p>{wl ? <p className="mt-3 text-sm text-muted-foreground" data-waitlist-confirmation>{tr("Status:")} <strong className="text-warning">{tr("waiting list")}</strong> · {tr("position")} <strong className="num text-foreground">#{waitRank ?? "—"}</strong>. {tr("You will be notified in your player space if a place opens. You can cancel at any time.")}</p> : <p className="mt-3 text-sm text-muted-foreground">{tr("Status:")} <strong className="text-warning">{tr("pending validation")}</strong> {tr("by the organizer of")} {clubById(event.club)?.name}{tr(". You can follow or cancel it from your player space.")}</p>}
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><Button onClick={toSpace}><UserRound className="mr-1.5 size-4" />{tr("Go to my space")}</Button><Button variant="outline" onClick={() => { onOpenChange(false); nav("/register"); }} data-track-registration>{tr("Track my registration")}</Button><Button variant="outline" onClick={toOrganizer}><Building2 className="mr-1.5 size-4" />{tr("See it as the organizer (demo)")}</Button><Button variant="ghost" onClick={() => onOpenChange(false)} asChild><Link to={`/tournaments/${event.id}`}>{tr("Back to tournament")}</Link></Button></div></div>
          )}
        {err && step < 3 && <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" data-reg-error>{err}</p>}
        </div>
        {step < 3 && (<DialogFooter className="sticky bottom-0 flex-row justify-between gap-2 border-t bg-background p-4 sm:justify-between"><Button variant="ghost" className="min-h-11" onClick={back}>{step === 0 ? tr("Cancel") : <><ArrowLeft className="mr-1 size-4" />{tr("Back")}</>}</Button><Button className="min-h-11" onClick={next} disabled={(step === 0 && (!!already || allowed.length === 0)) || (step === 1 && !!elig && !elig.ok)}>{step === 2 ? tr("Confirm registration") : <>{tr("Continue")}<ArrowRight className="ml-1 size-4" /></>}</Button></DialogFooter>)}
      </DialogContent>
    </Dialog>
  );
}
