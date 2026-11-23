import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Plus, Save, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { clubById } from "@/data/clubs";
import { displayName, playerById } from "@/data/demo";
import { useDemo } from "@/lib/demo-store";
import { fmtDate } from "@/lib/format";
import { tr, trDyn } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PROPOSED_DATES } from "./capacity";
import { STEPS, blocking, deriveStatus, duplicatePlayers, editableDivisions, emptyForm, isEditable, rankLabel, validateForm, wantedDivisions, type Avail, type Dossier, type EngForm, type EngPlayer, type Issue } from "./engagement";
import { AVAIL_LABEL, csvAll, downloadText, openPrint, printableHtml } from "./exports";
import { RULES } from "./rules-data";
import { demoPlayerOptions, rankOf } from "./seed";
import { dossierOf, validationCtx } from "./state";
import { IcNotice, LineBadge, RuleStatusBadge, WarnLine, field, sel } from "./ui-bits";
import { defaultCourts } from "@/lib/club-data";

export const fmtMsg = (s: string, p: Record<string, string | number> = {}) => s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ""));
export function issueText(i: Issue): string {
  const p = i.params ?? {};
  const M: Record<string, string> = {
    club_required: tr("Club name, address and city are required."), club_contact_invalid: tr("Club phone and e-mail must be valid."), contact_required: tr("The official contact needs a name and a role."), contact_invalid: tr("The official contact phone and e-mail must be valid."),
    no_division: tr("Select at least one division."), duplicate_player: tr("{name} is listed twice in the same division."), player_name: tr("A player has no name."), rank_missing: tr("{name}: MPL rank missing (enter a rank or tick NC)."),
    declaration_missing: tr("All four declarations must be ticked."), few_players: tr("{division}: {n} player(s) listed, {min} recommended."), pair_missing: tr("{division}: some players have no pair (P1/P2/P3)."),
    exclusivity: tr("{name} is already listed by another club ({club})."), few_courts: tr("{n} homologated court(s), below the proposed minimum of {min} (no partner agreement)."), friday_above_total: tr("Friday courts cannot exceed the homologated courts."),
    availability_missing: tr("{n} Friday availability answer(s) missing."), late: tr("Submitted after the proposed closing date ({date})."),
  };
  return fmtMsg(M[i.code] ?? i.code, p);
}
function Field({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) { return <div><label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>{children}{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div>; }
const STEP_TITLE = [tr("Club identification"), tr("Official contact"), tr("Requested divisions"), tr("Players and rankings"), tr("Courts and hosting capacity"), tr("Availability on the ten proposed days"), tr("Declarations, summary and submission")];

export default function EngagementForm() {
  const { ic, organizerClub: clubId, allowed, icAct, notifications } = useDemo(); const club = clubById(clubId)!; const d = dossierOf(ic, clubId);
  const canEdit = allowed("engagement.edit", { clubId });
  if (!d) return <Start clubId={clubId} canEdit={canEdit} />;
  const status = deriveStatus(d.lines);
  const mine = notifications.filter((n) => n.kind === "interclub" && n.clubId === clubId);
  return (
    <div className="space-y-5" data-engagement>
      <IcNotice />
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"><div className="min-w-0 flex-1"><p className="text-xs font-mono text-muted-foreground">{d.id} · v{d.version}</p><h2 className="text-xl font-bold">{club.name}</h2></div><span data-dossier-status><LineBadge status={status} /></span>
        <Button variant="outline" size="sm" onClick={() => { const c = csvAll(d, club.name); downloadText(`${d.id}-lines.csv`, c.lines); downloadText(`${d.id}-players.csv`, c.players); downloadText(`${d.id}-availability.csv`, c.availability); icAct({ k: "export", clubId, what: "csv" }); toast.success(tr("CSV exported (3 files)")); }} data-export-csv><Download className="mr-1 size-4" />CSV</Button>
        <Button variant="outline" size="sm" onClick={() => { const ok = openPrint(printableHtml(d, club.name)); icAct({ k: "export", clubId, what: "pdf" }); if (!ok) toast.error(tr("The pop-up was blocked")); }} data-export-pdf><FileText className="mr-1 size-4" />PDF</Button></div>
      <Lines d={d} />
      <Tabs defaultValue="form"><TabsList><TabsTrigger value="form">{tr("Form")}</TabsTrigger><TabsTrigger value="history">{tr("History and versions")}</TabsTrigger></TabsList>
        <TabsContent value="form" className="mt-4"><Wizard d={d} canEdit={canEdit} /></TabsContent>
        <TabsContent value="history" className="mt-4"><HistoryPanel d={d} />
          <h3 className="mb-2 mt-6 font-semibold">{tr("Notifications")}</h3>{mine.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No notification yet.")}</p> : <ul className="space-y-1.5" data-ic-notifs>{mine.map((n) => <li key={n.id} className="rounded-md border p-2 text-sm"><span className="text-xs text-muted-foreground">{n.at}</span><br />{trDyn(n.text)}</li>)}</ul>}
          <p className="mt-2 text-xs text-muted-foreground">{tr("In-app notifications only — no e-mail or SMS in this prototype.")}</p></TabsContent></Tabs>
      <span className="hidden" data-edit-scope={[...editableDivisions(d.lines)].join(",")} />
    </div>
  );
}
function Start({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const { icAct, clubProfiles, staff } = useDemo(); const club = clubById(clubId)!; const prof = clubProfiles[clubId] ?? {}; const adm = (staff[clubId] ?? []).find((m) => m.role === "club_admin");
  const create = () => { const [first = "", ...rest] = (prof.contact ?? adm?.name ?? "").split(" "); const f = emptyForm(club.name, { club: { officialName: club.name, legalName: "", regNo: "", address: prof.address ?? "", city: club.locality ?? "", phone: prof.phone ?? "", email: prof.email ?? "" }, contact: { firstName: first, lastName: rest.join(" "), role: "", phone: prof.phone ?? "", email: prof.email ?? adm?.email ?? "" }, hosting: { homologated: defaultCourts(clubId).length, fridayCourts: 0, simultaneous: 1, lighting: false, conditions: "", partnerConvention: false } }); icAct({ k: "create", clubId, form: f }); };
  return (<div className="space-y-4" data-engagement-start><IcNotice /><div className="rounded-xl border bg-card p-6 text-center"><h2 className="text-xl font-bold">{tr("Interclub 2027 — club engagement")}</h2><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{tr("No engagement file yet for this club. The form has seven steps; you can save a draft and resume it later. Nothing is sent to MPL until you submit.")}</p>
    <Button className="mt-4" disabled={!canEdit} onClick={create} data-engagement-create>{tr("Start the engagement file")}</Button>{!canEdit && <p className="mt-2 text-xs text-muted-foreground">{tr("Only the club administrator can create or edit the file.")}</p>}</div></div>);
}
function Lines({ d }: { d: Dossier }) {
  const ws = wantedDivisions(d.form); if (!ws.length) return null;
  return (<ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-lines>{ws.map((c) => { const l = d.lines[c]; return (<li key={c} className="rounded-lg border bg-card p-3" data-line={c}><div className="flex items-center justify-between"><strong>{c}</strong><LineBadge status={l?.status ?? "draft"} /></div>{l?.note && <p className={cn("mt-1 text-xs", l.status === "to_complete" ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>{l.status === "to_complete" ? tr("Requested:") + " " : ""}{l.note}</p>}{l?.status === "accepted" || l?.status === "refused" ? <p className="mt-1 text-xs text-muted-foreground">{tr("Simulated decision — not an official validation.")}</p> : null}</li>); })}</ul>);
}
function Wizard({ d, canEdit }: { d: Dossier; canEdit: boolean }) {
  const s = useDemo(); const { ic, icAct } = s; const clubId = d.clubId; const [form, setForm] = useState<EngForm>(d.form); const [step, setStep] = useState(Math.min(STEPS, Math.max(1, d.form.step || 1)));
  const ro = !canEdit || !isEditable(d.lines); const ed = editableDivisions(d.lines); const topRef = useRef<HTMLDivElement>(null);
  const sig = JSON.stringify(d.form); useEffect(() => { setForm(d.form); }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const up = (patch: Partial<EngForm>) => setForm((f) => ({ ...f, ...patch }));
  const save = (to?: number, quiet = false) => { const next = { ...form, step: to ?? step }; if (!ro) { icAct({ k: "save", clubId, form: next }); if (!quiet) toast.success(tr("Draft saved")); } };
  const go = (n: number) => { save(n, true); setStep(n); topRef.current?.scrollIntoView({ block: "start" }); };
  const ctx = validationCtx(s, clubId); const issues = useMemo(() => validateForm(form, ctx), [form, ic.params, ic.dossiers]); // eslint-disable-line react-hooks/exhaustive-deps
  const bl = blocking(issues);
  const submit = () => { icAct({ k: "save", clubId, form: { ...form, step: 7 } }); icAct({ k: "submit", clubId }); toast.success(tr("Submitted to the MPL Commission (demo)")); };
  return (
    <div className="space-y-4" ref={topRef} data-wizard>
      <div><div className="mb-1 flex items-center justify-between text-sm"><span className="font-semibold" data-step-title>{tr("Step")} {step}/{STEPS} — {STEP_TITLE[step - 1]}</span>{ro && <span className="text-xs text-muted-foreground" data-readonly>{tr("Read-only")}</span>}</div><Progress value={(step / STEPS) * 100} aria-label={tr("Progress")} />
        <ol className="mt-2 flex gap-1 overflow-x-auto" aria-label={tr("Steps")}>{STEP_TITLE.map((t, i) => <li key={i}><button type="button" onClick={() => go(i + 1)} aria-current={step === i + 1 ? "step" : undefined} aria-label={`${tr("Step")} ${i + 1}: ${t}`} className={cn("h-11 min-w-11 rounded-md border px-3 text-sm font-medium md:h-9", step === i + 1 ? "bg-primary text-primary-foreground" : "bg-card")}>{i + 1}</button></li>)}</ol></div>
      <fieldset disabled={ro} className="space-y-4 rounded-xl border bg-card p-4">
        {step === 1 && <div className="grid gap-4 sm:grid-cols-2">
          <Field id="f-name" label={tr("Official club name")}><input id="f-name" className={field} value={form.club.officialName} onChange={(e) => up({ club: { ...form.club, officialName: e.target.value } })} /></Field>
          <Field id="f-legal" label={tr("Legal name / BRN")}><input id="f-legal" className={field} value={form.club.legalName} onChange={(e) => up({ club: { ...form.club, legalName: e.target.value } })} /></Field>
          <Field id="f-reg" label={tr("MSRA registration no.")} hint={tr("Neutral label until the supervisory body is decided (DEC-IC-28).")}><input id="f-reg" className={field} value={form.club.regNo} onChange={(e) => up({ club: { ...form.club, regNo: e.target.value } })} /></Field>
          <Field id="f-addr" label={tr("Address")}><input id="f-addr" className={field} value={form.club.address} onChange={(e) => up({ club: { ...form.club, address: e.target.value } })} /></Field>
          <Field id="f-city" label={tr("City / region")}><input id="f-city" className={field} value={form.club.city} onChange={(e) => up({ club: { ...form.club, city: e.target.value } })} /></Field>
          <Field id="f-phone" label={tr("Phone")}><input id="f-phone" type="tel" className={field} value={form.club.phone} onChange={(e) => up({ club: { ...form.club, phone: e.target.value } })} /></Field>
          <Field id="f-email" label="E-mail"><input id="f-email" type="email" className={field} value={form.club.email} onChange={(e) => up({ club: { ...form.club, email: e.target.value } })} /></Field></div>}
        {step === 2 && <div className="grid gap-4 sm:grid-cols-2">
          <Field id="c-first" label={tr("First name")}><input id="c-first" className={field} value={form.contact.firstName} onChange={(e) => up({ contact: { ...form.contact, firstName: e.target.value } })} /></Field>
          <Field id="c-last" label={tr("Last name")}><input id="c-last" className={field} value={form.contact.lastName} onChange={(e) => up({ contact: { ...form.contact, lastName: e.target.value } })} /></Field>
          <Field id="c-role" label={tr("Role")}><input id="c-role" className={field} value={form.contact.role} onChange={(e) => up({ contact: { ...form.contact, role: e.target.value } })} /></Field>
          <Field id="c-phone" label={tr("Direct phone")}><input id="c-phone" type="tel" className={field} value={form.contact.phone} onChange={(e) => up({ contact: { ...form.contact, phone: e.target.value } })} /></Field>
          <Field id="c-email" label={tr("Direct e-mail")}><input id="c-email" type="email" className={field} value={form.contact.email} onChange={(e) => up({ contact: { ...form.contact, email: e.target.value } })} /></Field>
          <p className="self-end text-xs text-muted-foreground">{tr("One single contact per club. Use fictional data only in this demo.")}</p></div>}
        {step === 3 && <div><p className="mb-3 text-sm text-muted-foreground">{tr("One team maximum per club and per division (proposed rule, contradictory in the sources).")}</p><ul className="grid gap-2 sm:grid-cols-2">{Object.keys(form.divisions).map((c) => { const locked = !ro && !ed.has(c) && !!d.lines[c]; const susp = c === "D2H" && !ic.params.d2hActive; return (
          <li key={c}><label className={cn("flex min-h-14 items-center gap-3 rounded-lg border p-3", form.divisions[c] && "border-primary bg-primary/5", (locked || ro) && "opacity-70")}><input type="checkbox" className="size-5" disabled={locked} checked={form.divisions[c]} onChange={(e) => up({ divisions: { ...form.divisions, [c]: e.target.checked } })} data-division={c} /><span className="flex-1"><strong>{c}</strong> <span className="text-xs text-muted-foreground">{tr("max")} {ic.params.maxByDivision[c]} {tr("teams (proposed)")}</span>{susp && <span className="block text-xs text-amber-700 dark:text-amber-400" data-d2h-suspended>{tr("D2H is suspended in the current configuration — request kept, subject to opening.")}</span>}{locked && <span className="block text-xs text-muted-foreground">{tr("Locked: already submitted or decided.")}</span>}</span></label></li>); })}</ul></div>}
        {step === 4 && <Players form={form} up={up} ed={ed} ro={ro} clubId={clubId} />}
        {step === 5 && <div className="grid gap-4 sm:grid-cols-2">
          <Field id="h-hom" label={tr("Homologated courts")}><input id="h-hom" type="number" min={0} className={field} value={form.hosting.homologated} onChange={(e) => up({ hosting: { ...form.hosting, homologated: Math.max(0, Number(e.target.value) || 0) } })} /></Field>
          <Field id="h-fri" label={tr("Courts available on Friday evening (17:00–21:00)")} hint={tr("Existing courts are not the same as courts really available. This is not a hosting commitment.")}><input id="h-fri" type="number" min={0} className={field} value={form.hosting.fridayCourts} onChange={(e) => up({ hosting: { ...form.hosting, fridayCourts: Math.max(0, Number(e.target.value) || 0) } })} /></Field>
          <Field id="h-sim" label={tr("Simultaneous ties")}><input id="h-sim" type="number" min={0} className={field} value={form.hosting.simultaneous} onChange={(e) => up({ hosting: { ...form.hosting, simultaneous: Math.max(0, Number(e.target.value) || 0) } })} /></Field>
          <div className="space-y-3 self-end"><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-5" checked={form.hosting.lighting} onChange={(e) => up({ hosting: { ...form.hosting, lighting: e.target.checked } })} />{tr("Lighting for evening play")}</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-5" checked={form.hosting.partnerConvention} onChange={(e) => up({ hosting: { ...form.hosting, partnerConvention: e.target.checked } })} />{tr("Agreement with a partner club")}</label></div>
          <div className="sm:col-span-2"><Field id="h-cond" label={tr("Hosting conditions")}><Textarea id="h-cond" value={form.hosting.conditions} onChange={(e) => up({ hosting: { ...form.hosting, conditions: e.target.value } })} /></Field></div></div>}
        {step === 6 && <div><p className="mb-3 text-sm text-muted-foreground">{tr("Proposed calendar: J1–J6 pools, J7–J10 final phases. Dates are proposals, not approved.")}</p><ul className="space-y-2">{PROPOSED_DATES.map((dt, i) => (
          <li key={dt} className="flex flex-wrap items-center gap-3 rounded-lg border p-2"><span className="w-10 font-semibold">J{i + 1}</span><span className="min-w-32 flex-1 text-sm">{fmtDate(dt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
            <select aria-label={`J${i + 1} ${tr("Availability")}`} className={cn(sel, "w-44")} value={form.availability[i] ?? ""} onChange={(e) => { const a = [...form.availability]; a[i] = e.target.value as Avail; up({ availability: a }); }}>{(Object.keys(AVAIL_LABEL) as Avail[]).map((v) => <option key={v} value={v}>{AVAIL_LABEL[v]}</option>)}</select></li>))}</ul></div>}
        {step === 7 && <Summary form={form} up={up} d={d} issues={issues} />}
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={() => go(step - 1)} disabled={step === 1} data-prev><ChevronLeft className="mr-1 size-4" />{tr("Back")}</Button>
        <div className="flex flex-wrap gap-2">{!ro && <Button variant="outline" onClick={() => save()} data-save-draft><Save className="mr-1 size-4" />{tr("Save draft")}</Button>}
          {step < STEPS ? <Button onClick={() => go(step + 1)} data-next>{tr("Next")}<ChevronRight className="ml-1 size-4" /></Button> : !ro && <Button onClick={submit} disabled={bl.length > 0} data-submit><Send className="mr-1 size-4" />{tr("Submit to the MPL Commission")}</Button>}</div></div>
    </div>
  );
}
function Players({ form, up, ed, ro, clubId }: { form: EngForm; up: (p: Partial<EngForm>) => void; ed: Set<string>; ro: boolean; clubId: string }) {
  const { ic } = useDemo(); const opts = useMemo(demoPlayerOptions, []); const divs = wantedDivisions(form); const ctx = validationCtx({ ic }, clubId);
  const dup = duplicatePlayers(form.players); const dupIds = new Set(dup.flat().map((p) => p.id));
  const set = (id: string, patch: Partial<EngPlayer>) => up({ players: form.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const add = (division: string, playerId?: string) => { const base: EngPlayer = playerId ? { id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, playerId, name: displayName(playerById(playerId)!), rank: rankOf(playerId), pair: "", division } : { id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: "", rank: undefined, pair: "", division }; up({ players: [...form.players, base] }); };
  if (!divs.length) return <p className="text-sm text-muted-foreground">{tr("Select at least one division first (step 3).")}</p>;
  return (<div className="space-y-6"><p className="text-sm text-muted-foreground">{tr("Rank from the frozen demo snapshot (NC = unranked). Pair positions P1/P2/P3 are a proposal.")}</p>
    {divs.map((c) => { const list = form.players.filter((p) => p.division === c); const g = c.endsWith("F") ? "F" : "M"; const locked = !ed.has(c); return (
      <section key={c} data-players-division={c} className="space-y-2"><h3 className="font-semibold">{c} <span className="text-sm font-normal text-muted-foreground">— {list.length} {tr("player(s)")}</span></h3>
        <ul className="space-y-2">{list.map((p) => { const other = p.playerId ? ctx.otherClubs.get(p.playerId) : undefined; return (
          <li key={p.id} className={cn("grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_8rem_6rem_auto]", dupIds.has(p.id) && "border-destructive", other && "border-amber-500")} data-player-row>
            {p.playerId ? <span className="flex items-center text-sm font-medium">{p.name}</span> : <input aria-label={tr("Player name")} className={field} placeholder={tr("Player name")} value={p.name} onChange={(e) => set(p.id, { name: e.target.value })} disabled={ro || locked} />}
            <div className="flex items-center gap-2"><input aria-label={tr("MPL rank")} type="number" min={1} className={field} value={p.rank ?? ""} disabled={p.rank === null || ro || locked} placeholder={tr("Rank")} onChange={(e) => set(p.id, { rank: e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)) })} /><label className="flex items-center gap-1 text-xs"><input type="checkbox" className="size-5" checked={p.rank === null} disabled={ro || locked} onChange={(e) => set(p.id, { rank: e.target.checked ? null : undefined })} />NC</label></div>
            <select aria-label={tr("Pair")} className={sel} value={p.pair} disabled={ro || locked} onChange={(e) => set(p.id, { pair: e.target.value as EngPlayer["pair"] })}><option value="">—</option><option>P1</option><option>P2</option><option>P3</option></select>
            <Button type="button" variant="ghost" size="icon" aria-label={`${tr("Remove")} ${p.name || tr("player")}`} disabled={ro || locked} onClick={() => up({ players: form.players.filter((x) => x.id !== p.id) })}><Trash2 className="size-4" /></Button>
            {(dupIds.has(p.id) || other) && <p className="text-xs sm:col-span-4" data-player-warning>{dupIds.has(p.id) ? tr("Duplicate in this division.") : `${tr("Already listed by another club")}: ${clubById(other!)?.name ?? other} (${tr("exclusivity, proposed rule")}).`}</p>}
          </li>); })}</ul>
        {!ro && !locked && <div className="flex flex-wrap gap-2"><select aria-label={`${tr("Add a player")} ${c}`} className={cn(sel, "max-w-xs")} value="" onChange={(e) => e.target.value && add(c, e.target.value)}><option value="">{tr("Add a fictional player…")}</option>{opts.filter((o) => o.gender === g && !list.some((p) => p.playerId === o.id)).map((o) => <option key={o.id} value={o.id}>{o.name} — {rankLabel(o.rank)}</option>)}</select><Button type="button" variant="outline" size="sm" onClick={() => add(c)}><Plus className="mr-1 size-4" />{tr("Other player")}</Button></div>}
      </section>); })}</div>);
}
function Summary({ form, up, d, issues }: { form: EngForm; up: (p: Partial<EngForm>) => void; d: Dossier; issues: Issue[] }) {
  const { ic } = useDemo(); const D = form.declarations; const [doc, setDoc] = useState({ name: "", type: "" });
  const decl: Array<[keyof typeof D, string]> = [["rules", tr("I acknowledge the Interclub regulation referred to by the Commission (text to be confirmed).")], ["exclusivity", tr("The listed players belong exclusively to this club (proposed rule).")], ["courts", tr("The club has the required homologated courts or an agreement with a partner club (proposed rule).")], ["fee", tr("I accept the proposed registration fee (no payment is made in this demo).")]];
  const ws = wantedDivisions(form);
  return (<div className="space-y-5" data-summary>
    <div><h3 className="mb-2 font-semibold">{tr("Summary")}</h3><ul className="grid gap-2 text-sm sm:grid-cols-2"><li className="rounded-md border p-2"><strong>{tr("Club")}</strong>: {form.club.officialName || "—"}</li><li className="rounded-md border p-2"><strong>{tr("Contact")}</strong>: {form.contact.firstName} {form.contact.lastName}</li><li className="rounded-md border p-2"><strong>{tr("Divisions")}</strong>: {ws.join(", ") || "—"}</li><li className="rounded-md border p-2"><strong>{tr("Players")}</strong>: {form.players.length}</li><li className="rounded-md border p-2"><strong>{tr("Friday courts")}</strong>: {form.hosting.fridayCourts} / {form.hosting.homologated}</li><li className="rounded-md border p-2"><strong>{tr("Fee (proposed)")}</strong>: Rs {ic.params.fee} × {ws.length}</li></ul></div>
    <div><h3 className="mb-2 font-semibold">{tr("Declarations")}</h3><ul className="space-y-2">{decl.map(([k, t]) => <li key={k}><label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={D[k]} onChange={(e) => up({ declarations: { ...D, [k]: e.target.checked } })} data-declaration={k} />{t}</label></li>)}</ul></div>
    <div><h3 className="mb-1 font-semibold">{tr("Supporting documents")}</h3><p className="mb-2 text-xs text-muted-foreground">{tr("No file is uploaded: only a name and a type are recorded (demo).")} {ic.params.requiredDocs.length ? `${tr("Required")}: ${ic.params.requiredDocs.join(", ")}.` : tr("No document is required by the 2027 form (to be decided).")}</p>
      <ul className="mb-2 space-y-1">{form.docs.map((x) => <li key={x.id} className="flex items-center justify-between rounded-md border p-2 text-sm"><span>{x.name} <span className="text-xs text-muted-foreground">({x.type})</span></span><Button size="icon" variant="ghost" aria-label={`${tr("Remove")} ${x.name}`} onClick={() => up({ docs: form.docs.filter((y) => y.id !== x.id) })}><Trash2 className="size-4" /></Button></li>)}</ul>
      <div className="flex flex-wrap gap-2"><input className={cn(field, "max-w-48")} aria-label={tr("Document name")} placeholder={tr("Document name")} value={doc.name} onChange={(e) => setDoc({ ...doc, name: e.target.value })} /><input className={cn(field, "max-w-48")} aria-label={tr("Document type")} placeholder={tr("Type")} value={doc.type} onChange={(e) => setDoc({ ...doc, type: e.target.value })} /><Button type="button" variant="outline" size="sm" disabled={!doc.name.trim()} onClick={() => { up({ docs: [...form.docs, { id: `doc${Date.now().toString(36)}`, name: doc.name.trim(), type: doc.type.trim() || tr("other"), size: 0 }] }); setDoc({ name: "", type: "" }); }}>{tr("Add")}</Button></div></div>
    <div><h3 className="mb-2 font-semibold">{tr("Checks")}</h3>{issues.length === 0 ? <p className="text-sm text-emerald-700 dark:text-emerald-400" data-no-issues>{tr("No issue detected.")}</p> : <ul className="space-y-1.5" data-issues>{issues.map((i, n) => { const r = i.ruleId ? RULES.find((x) => x.id === i.ruleId) : undefined; return <WarnLine key={n} level={i.severity === "block" ? "block" : "warn"}><span data-issue={i.code} data-severity={i.severity}><strong>{i.severity === "block" ? tr("Blocking") : tr("Warning")}</strong> · {issueText(i)} {r && <span className="ml-1 inline-flex items-center gap-1"><span className="font-mono text-xs">{r.id}</span><RuleStatusBadge status={r.status} short /></span>}</span></WarnLine>; })}</ul>}
      <p className="mt-2 text-xs text-muted-foreground">{tr("Warnings come from rules that are not validated: they never block a submission.")}</p></div>
    {d.version > 0 && <p className="text-xs text-muted-foreground">{tr("Current version")}: v{d.version}</p>}
  </div>);
}
/** Historique, versions immuables et comparaison champ par champ. */
export function diffForms(a: EngForm, b: EngForm): Array<{ path: string; from: string; to: string }> {
  const out: Array<{ path: string; from: string; to: string }> = [];
  const walk = (x: unknown, y: unknown, path: string) => {
    if (Array.isArray(x) || Array.isArray(y)) { const A = (x as unknown[]) ?? [], B = (y as unknown[]) ?? []; if (path === "players") { const key = (p: EngPlayer) => `${p.division}:${p.playerId ?? p.name}`; const sa = new Set((A as EngPlayer[]).map(key)), sb = new Set((B as EngPlayer[]).map(key)); for (const p of B as EngPlayer[]) if (!sa.has(key(p))) out.push({ path: `players ${p.division}`, from: "—", to: p.name }); for (const p of A as EngPlayer[]) if (!sb.has(key(p))) out.push({ path: `players ${p.division}`, from: p.name, to: "—" }); return; } const n = Math.max(A.length, B.length); for (let i = 0; i < n; i++) walk(A[i], B[i], `${path}[${i}]`); return; }
    if (x && y && typeof x === "object" && typeof y === "object") { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k], path ? `${path}.${k}` : k); return; }
    if (x !== y && path !== "step") out.push({ path, from: x === undefined ? "—" : String(x), to: y === undefined ? "—" : String(y) });
  };
  walk(a, b, ""); return out;
}
export function HistoryPanel({ d }: { d: Dossier }) {
  const [va, setVa] = useState(d.versions[0]?.n ?? 0); const [vb, setVb] = useState(d.versions[d.versions.length - 1]?.n ?? 0);
  const A = d.versions.find((v) => v.n === va), B = d.versions.find((v) => v.n === vb); const diff = A && B ? diffForms(A.form, B.form) : [];
  return (<div className="space-y-5">
    <div><h3 className="mb-2 font-semibold">{tr("Versions")}</h3>{d.versions.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No submitted version yet.")}</p> : <ul className="space-y-1.5" data-versions>{d.versions.map((v) => <li key={v.n} className="rounded-md border p-2 text-sm"><strong>v{v.n}</strong> · {v.at} · {trDyn(v.by)} — {trDyn(v.reason)}</li>)}</ul>}
      {d.versions.length > 1 && <div className="mt-3 rounded-lg border p-3" data-compare><h4 className="mb-2 text-sm font-semibold">{tr("Compare two versions")}</h4><div className="flex flex-wrap gap-2"><select aria-label={tr("First version")} className={cn(sel, "w-28")} value={va} onChange={(e) => setVa(Number(e.target.value))}>{d.versions.map((v) => <option key={v.n} value={v.n}>v{v.n}</option>)}</select><select aria-label={tr("Second version")} className={cn(sel, "w-28")} value={vb} onChange={(e) => setVb(Number(e.target.value))}>{d.versions.map((v) => <option key={v.n} value={v.n}>v{v.n}</option>)}</select></div>
        {diff.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{tr("No difference.")}</p> : <ul className="mt-2 space-y-1 text-sm" data-diff>{diff.map((x, i) => <li key={i}><code className="text-xs">{x.path}</code>: {x.from} → <strong>{x.to}</strong></li>)}</ul>}</div>}</div>
    <div><h3 className="mb-2 font-semibold">{tr("History")}</h3><ol className="space-y-1.5" data-history>{[...d.history].reverse().map((h, i) => <li key={i} className="rounded-md border p-2 text-sm"><span className="text-xs text-muted-foreground">{h.at} · {trDyn(h.actor)}{h.division ? ` · ${h.division}` : ""}</span><br />{trDyn(h.action)}{h.note ? <span className="text-muted-foreground"> — {h.note}</span> : null}</li>)}</ol></div></div>);
}
