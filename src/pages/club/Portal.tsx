import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, Download, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ClubAvatar, DemoBadge, StatCard } from "@/components/mpl/bits";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { CLUBS, clubById } from "@/data/clubs";
import { REASON_MIN_LENGTH } from "@/config/demo-config";
import { defaultCourts, defaultStaff, downloadCsv } from "@/lib/club-data";
import type { CourtItem, StaffMember, StaffRole } from "@/lib/demo-state";
import { useDemo } from "@/lib/demo-store";
import { eventStatus, fmtRange } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { refereeName, roleLabel, canonicalRole, OPS_ROLES } from "@/lib/permissions";
import { Gate } from "@/pages/player/Dashboard";
import { ActionCenter } from "@/components/mpl/ActionCenter";
import { ArrowRight, Swords } from "lucide-react";
import { dossierOf } from "@/interclub/state";
import { JourneySummary } from "@/interclub/JourneyBar";
import { deriveStatus } from "@/interclub/engagement";
import { LINE_LABEL } from "@/interclub/exports";
import { DEMO_TODAY } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_LABEL = { upcoming: tr("Upcoming"), open: tr("Open"), closed: tr("Closed"), live: tr("Live"), completed: tr("Completed"), cancelled: tr("Cancelled") } as const;
const sel = "h-11 rounded-md border border-input bg-background px-3 text-sm md:h-9";

export default function ClubPortal() {
  const d = useDemo(); const { role, setRole, organizerClub, setOrganizerClub, allowed } = d;
  if (!allowed("club.view", { clubId: organizerClub })) return <Gate onSwitch={() => setRole("club_admin")} label={tr("club manager")} />;
  return <Inner />;
}
function Inner() {
  const { role, organizerClub, setOrganizerClub, allowed, registrations, requests, createRequest, staff, setStaff, clubProfiles, setClubProfile, courts, setCourts, notifications, assignments, draws, matches, audit, ic } = useDemo();
  const club = clubById(organizerClub)!; const cr = canonicalRole(role); const isAdmin = role === "admin";
  const prof = clubProfiles[club.id] ?? {}; const team = staff[club.id] ?? defaultStaff(club.id); const cts = courts[club.id] ?? defaultCourts(club.id);
  const events = useMemo(() => CALENDAR_EVENTS.filter((e) => e.club === club.id), [club.id]);
  const evIds = useMemo(() => new Set(events.map((e) => e.id)), [events]);
  const regs = registrations.filter((r) => evIds.has(r.eventId));
  const myReq = requests.filter((r) => r.clubId === club.id);
  const canProfile = allowed("club.profile.edit", { clubId: club.id }); const canTeam = allowed("club.staff.manage", { clubId: club.id }); const canCourts = allowed("club.courts.edit", { clubId: club.id }); const canReq = allowed("request.create", { clubId: club.id }); const canExport = allowed("club.report.export", { clubId: club.id });
  const [p, setP] = useState({ contact: prof.contact ?? "", phone: prof.phone ?? "", email: prof.email ?? "", address: prof.address ?? "", about: prof.about ?? "" });
  const [nm, setNm] = useState(""); const [nr, setNr] = useState<StaffRole>("club_staff");
  const [reqEvent, setReqEvent] = useState(""); const [reqNote, setReqNote] = useState("");
  const openEvents = events.filter((e) => ["open", "closed", "live", "upcoming"].includes(eventStatus(e)) && !myReq.some((r) => r.eventId === e.id && r.status !== "rejected"));
  const notes = notifications.filter((n) => /request|correction|draw|referee|result/i.test(n.text)).slice(0, 12);
  const byCat = useMemo(() => { const m = new Map<string, number>(); regs.forEach((r) => { const e = events.find((x) => x.id === r.eventId); if (e) m.set(e.category, (m.get(e.category) ?? 0) + 1); }); return [...m].map(([cat, n]) => ({ cat, n })); }, [regs, events]);
  // 5B-3 : synthèse « tableau de bord » (lecture seule, aucune règle modifiée)
  const pendingRegs = regs.filter((r) => r.status === "pending").length; const waitRegs = regs.filter((r) => r.status === "waitlist").length;
  const nextHosted = useMemo(() => [...events].filter((e) => e.end >= DEMO_TODAY).sort((x, y) => x.start.localeCompare(y.start))[0], [events]);
  const icDossier = dossierOf(ic, club.id);
  const icTeams = useMemo(() => { const t = new Set((ic.d2.run?.ties ?? []).flatMap((x) => [x.home, x.away]).filter((x) => x.split("|")[0] === club.id)); return [...t].map((x) => x.split("|")[1]).sort(); }, [ic, club.id]);
  const canOps = OPS_ROLES.includes(role);
  const activeCourts = cts.filter((c) => c.active).length;
  const draftCourts = (list: CourtItem[], note: string) => setCourts(club.id, list, note);
  const addMember = () => { if (nm.trim().length < 2) return; const list: StaffMember[] = [...team, { id: `${club.id}-${Date.now()}`, name: `${nm.trim()} (fictif)`, role: nr, email: "demo@demo.invalid" }]; setStaff(club.id, list, `${nm.trim()} · ${nr}`); setNm(""); toast.success(tr("Team updated")); };
  const rmMember = (m: StaffMember) => { setStaff(club.id, team.filter((x) => x.id !== m.id), `removed ${m.name}`); };

  return (
    <div className="container-mpl py-6 md:py-10" data-club-portal data-club={club.id}>
      <div className="mb-5 flex flex-wrap items-center gap-3"><ClubAvatar club={club} size={48} /><div className="min-w-0 flex-1"><h1 className="text-2xl font-bold md:text-3xl">{tr("Club portal")}</h1><p className="text-sm text-muted-foreground">{club.name} · <span data-portal-role>{roleLabel(role)}</span></p></div><DemoBadge /></div>
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
        <Label htmlFor="portal-club" className="text-sm">{tr("Demo club")}</Label>
        <select id="portal-club" className={sel} value={club.id} onChange={(e) => setOrganizerClub(e.target.value)} data-portal-club>{CLUBS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <p className="text-xs text-muted-foreground">{isAdmin ? tr("MPL Admin sees every club.") : tr("Your demo scope is limited to this club's data. Demo scope, not production security.")}</p>
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="no-scrollbar mb-4 h-12 w-full justify-start gap-1 overflow-x-auto">{[["overview", tr("Overview")], ["profile", tr("Profile")], ["courts", tr("Courts")], ["tournaments", tr("Tournaments")], ["calendar", tr("Calendar")], ["team", tr("Managers")], ["requests", tr("Requests")], ["registrations", tr("Registrations")], ["stats", tr("Statistics")], ["reports", tr("Reports")], ["notifications", tr("Notifications")]].map(([v, l]) => <TabsTrigger key={v} value={v} data-portal-tab={v} className="min-h-11 md:min-h-8">{l}</TabsTrigger>)}</TabsList>

        <TabsContent value="overview"><div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label={tr("Tournaments")} value={events.length} /><StatCard label={tr("Courts")} value={cts.filter((c) => c.active).length} /><StatCard label={tr("Registrations")} value={regs.length} /><StatCard label={tr("Open requests")} value={myReq.filter((r) => r.status === "submitted").length} tone={myReq.some((r) => r.status === "submitted") ? "warn" : "default"} /></div>
          <p className="mt-4 text-sm text-muted-foreground">{club.locality ?? club.zone} · {tr("Role")}: {roleLabel(role)} · {cr === "club_staff" ? tr("Club Staff: view and court management only.") : cr === "club_admin" ? tr("Club Admin: profile, managers, courts, requests.") : cr === "director" ? tr("Tournament Director: requests and tournament operations.") : tr("MPL administration: read access to every club.")}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2" data-club-dashboard>
            <ActionCenter title={tr("To do")} items={[
              { key: "regs", label: tr("Registrations awaiting validation"), count: pendingRegs, tone: "warn", hint: tr("Validated by the tournament organizer"), to: canOps ? "/organizer/registrations" : undefined },
              { key: "waitlist", label: tr("Pairs on a waiting list"), count: waitRegs },
              { key: "requests", label: tr("Requests awaiting MPL administration"), count: myReq.filter((r) => r.status === "submitted").length, tone: "warn" },
            ]} />
            <section className="rounded-2xl border bg-card p-4 sm:p-5" aria-labelledby="club-next-title" data-club-next>
              <h2 id="club-next-title" className="mb-3 text-base font-bold">{tr("Next hosted tournament")}</h2>
              {nextHosted ? (<div className="space-y-2 text-sm"><p className="font-medium">{nextHosted.category} · {fmtRange(nextHosted)}</p><p className="text-muted-foreground">{STATUS_LABEL[eventStatus(nextHosted)]} · {nextHosted.courts} {tr("courts")}</p>
                <div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="outline" className="min-h-11"><Link to={`/tournaments/${nextHosted.id}`}>{tr("Public page")}</Link></Button>{canOps && <Button asChild size="sm" className="min-h-11"><Link to={`/organizer/registrations?event=${nextHosted.id}`}>{tr("Manage registrations")}<ArrowRight className="ml-1.5 size-4" /></Link></Button>}</div></div>) : <p className="text-sm text-muted-foreground" data-empty="club-next">{tr("No upcoming tournament hosted by this club.")}</p>}
            </section>
            <section className="rounded-2xl border bg-card p-4 sm:p-5" aria-labelledby="club-ic-title" data-club-ic-summary>
              <h2 id="club-ic-title" className="mb-3 text-base font-bold">{tr("Interclub teams")}</h2>
              {icTeams.length === 0 ? <p className="text-sm text-muted-foreground" data-empty="club-ic">{tr("No Interclub team is published for this club in the demonstration.")}</p> : <ul className="mb-3 flex flex-wrap gap-2">{icTeams.map((d) => <li key={d}><Link to={`/interclub-public?club=${club.id}&division=${d}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm font-medium hover:border-primary/60"><Swords className="size-4 text-primary" aria-hidden="true" />{d}</Link></li>)}</ul>}
              <JourneySummary clubId={club.id} />
              {icDossier && <p className="mb-2 text-sm" data-club-ic-engagement>{tr("Engagement file")} : <strong>{LINE_LABEL[deriveStatus(icDossier.lines)]}</strong> · v{icDossier.version}</p>}
              <p className="text-xs text-muted-foreground">{tr("Compositions, ties and results are managed in the Interclub module.")}</p>
              <Button asChild size="sm" variant="outline" className="mt-2 min-h-11"><Link to="/interclub">{tr("Open Interclub management")}<ArrowRight className="ml-1.5 size-4" /></Link></Button>
            </section>
            <section className="rounded-2xl border bg-card p-4 sm:p-5" aria-labelledby="club-courts-title" data-club-courts-summary>
              <h2 id="club-courts-title" className="mb-3 text-base font-bold">{tr("Courts")}</h2>
              <p className="text-sm"><strong className="num text-lg">{activeCourts}</strong> / {cts.length} {tr("courts available")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{tr("Availability is set in the Courts tab.")}</p>
              {notes.length > 0 && <div className="mt-3 border-t pt-3"><h3 className="mb-1 text-sm font-semibold">{tr("Latest notifications")}</h3><ul className="space-y-1 text-xs text-muted-foreground">{notes.slice(0, 3).map((n) => <li key={n.id}>{n.text}</li>)}</ul></div>}
            </section>
          </div>
</TabsContent>

        <TabsContent value="profile"><div className="grid max-w-xl gap-3" data-club-profile>
          {(["contact", "phone", "email", "address"] as const).map((k) => <div key={k}><Label htmlFor={`pf-${k}`} className="mb-1 block text-sm">{tr(k === "contact" ? "Contact person" : k === "phone" ? "Phone" : k === "email" ? "Email" : "Address")}</Label><Input id={`pf-${k}`} data-profile-field={k} disabled={!canProfile} value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })} placeholder="(demo)" /></div>)}
          <div><Label htmlFor="pf-about" className="mb-1 block text-sm">{tr("About the club")}</Label><Textarea id="pf-about" disabled={!canProfile} value={p.about} onChange={(e) => setP({ ...p, about: e.target.value })} /></div>
          {canProfile ? <Button className="min-h-11 w-fit" onClick={() => { setClubProfile(club.id, p, club.name); toast.success(tr("Profile saved (demo)")); }} data-save-profile>{tr("Save profile")}</Button> : <p className="text-sm text-muted-foreground" data-readonly-profile>{tr("Your role cannot edit the club profile (read-only).")}</p>}</div></TabsContent>

        <TabsContent value="courts"><ul className="divide-y rounded-xl border bg-card" data-courts>{cts.map((c) => <li key={c.id} className="flex flex-wrap items-center gap-3 p-3" data-court={c.id}><span className="min-w-24 font-medium">{c.name}</span><span className="text-sm text-muted-foreground">{c.surface} · {c.covered ? tr("Covered") : tr("Open air")}</span><label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" className="size-5" disabled={!canCourts} checked={c.active} onChange={(e) => draftCourts(cts.map((x) => x.id === c.id ? { ...x, active: e.target.checked } : x), `${c.name} ${e.target.checked ? "active" : "inactive"}`)} data-court-active={c.id} />{tr("Active")}</label></li>)}</ul>
          {!canCourts && <p className="mt-2 text-sm text-muted-foreground">{tr("Your role cannot edit courts (read-only).")}</p>}</TabsContent>

        <TabsContent value="tournaments"><ul className="divide-y rounded-xl border bg-card" data-club-tournaments>{events.map((e) => <li key={e.id} className="flex flex-wrap items-center gap-2 p-3" data-club-event={e.id}><span className="font-medium">{e.id}</span><span className="text-sm text-muted-foreground">{e.category} · {fmtRange(e)}</span><span className="ml-auto text-xs">{STATUS_LABEL[eventStatus(e)]}{assignments[e.id] ? ` · ${refereeName(assignments[e.id])}` : ""}</span></li>)}</ul></TabsContent>

        <TabsContent value="calendar"><ol className="space-y-2" data-club-calendar>{[...events].sort((a, b) => a.start.localeCompare(b.start)).map((e) => <li key={e.id} className="flex gap-3 rounded-lg border p-3 text-sm"><span className="w-32 shrink-0 font-medium">{fmtRange(e)}</span><span>{e.category} · {e.courts} {tr("courts")}</span></li>)}</ol></TabsContent>

        <TabsContent value="team"><ul className="divide-y rounded-xl border bg-card" data-team>{team.map((m) => <li key={m.id} className="flex flex-wrap items-center gap-3 p-3" data-member={m.role}><div className="min-w-0 flex-1"><p className="font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{roleLabel(m.role)} · {m.email}</p></div>{canTeam && <Button variant="ghost" size="icon" className="size-11 md:size-9" aria-label={`${tr("Remove")} ${m.name}`} onClick={() => rmMember(m)} data-remove-member><Trash2 className="size-4" /></Button>}</li>)}</ul>
          {canTeam ? <div className="mt-3 flex flex-wrap items-end gap-2"><div><Label htmlFor="nm" className="mb-1 block text-xs">{tr("Name")}</Label><Input id="nm" value={nm} onChange={(e) => setNm(e.target.value)} data-member-name /></div><select aria-label={tr("Role")} className={sel} value={nr} onChange={(e) => setNr(e.target.value as StaffRole)} data-member-role>{(["club_admin", "club_staff", "director"] as const).map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select><Button className="min-h-11 md:min-h-9" onClick={addMember} data-add-member><Plus className="mr-1 size-4" />{tr("Add")}</Button></div> : <p className="mt-2 text-sm text-muted-foreground" data-readonly-team>{tr("Only a Club Admin manages the team (read-only).")}</p>}</TabsContent>

        <TabsContent value="requests"><div data-requests>
          {canReq ? <div className="mb-4 grid max-w-xl gap-2 rounded-xl border bg-card p-4"><h2 className="font-semibold">{tr("Request to organise a tournament")}</h2>
            <select aria-label={tr("Tournament")} className={sel} value={reqEvent} onChange={(e) => setReqEvent(e.target.value)} data-request-event><option value="">{tr("Choose a calendar slot")}</option>{openEvents.map((e) => <option key={e.id} value={e.id}>{e.id} · {e.category} · {fmtRange(e)}</option>)}</select>
            <Textarea aria-label={tr("Note to MPL administration")} placeholder={tr("Note to MPL administration")} value={reqNote} onChange={(e) => setReqNote(e.target.value)} data-request-note />
            <Button className="min-h-11 w-fit" disabled={!reqEvent || reqNote.trim().length < REASON_MIN_LENGTH} onClick={() => { createRequest(club.id, reqEvent, reqNote.trim(), `${reqEvent} · ${club.name}`); setReqEvent(""); setReqNote(""); toast.success(tr("Request sent to MPL administration")); }} data-send-request>{tr("Send request")}</Button></div>
            : <p className="mb-3 text-sm text-muted-foreground" data-readonly-requests>{tr("Your role cannot submit requests (read-only).")}</p>}
          <ul className="divide-y rounded-xl border bg-card">{myReq.length === 0 && <li className="p-3 text-sm text-muted-foreground">{tr("No request yet.")}</li>}{myReq.map((r) => <li key={r.id} className="p-3 text-sm" data-request={r.id} data-status={r.status}><span className="font-medium">{r.id}</span> · {r.eventId} · <span className={cn(r.status === "approved" && "text-success", r.status === "rejected" && "text-destructive")}>{r.status === "submitted" ? tr("Pending MPL administration") : r.status === "approved" ? tr("Approved") : tr("Refused")}</span>{r.decisionNote && <span className="block text-xs text-muted-foreground">{r.decisionNote}</span>}</li>)}</ul></div></TabsContent>

        <TabsContent value="registrations"><div className="overflow-x-auto rounded-xl border" tabIndex={0} role="region" aria-label={tr("Registrations")}><table className="w-full min-w-[480px] text-sm" data-club-regs><caption className="sr-only">{tr("Registrations")}</caption><thead><tr className="border-b bg-secondary/40 text-left"><th scope="col" className="p-2.5">{tr("Tournament")}</th><th scope="col" className="p-2.5">{tr("Pending")}</th><th scope="col" className="p-2.5">{tr("Confirmed")}</th><th scope="col" className="p-2.5"><span className="sr-only">{tr("Actions")}</span></th></tr></thead><tbody>{events.filter((e) => ["open", "closed", "live"].includes(eventStatus(e))).map((e) => { const rr = regs.filter((r) => r.eventId === e.id); return <tr key={e.id} className="border-t"><td className="p-2.5">{e.id}</td><td className="p-2.5">{rr.filter((r) => r.status === "pending").length}</td><td className="p-2.5">{rr.filter((r) => r.status === "confirmed").length}</td><td className="p-2.5 text-right">{allowed("entries.view", { clubId: club.id, eventId: e.id }) && <Button asChild variant="outline" size="sm" className="min-h-11 md:min-h-8"><Link to={`/organizer/registrations?event=${e.id}`}>{tr("Open")}</Link></Button>}</td></tr>; })}</tbody></table></div></TabsContent>

        <TabsContent value="stats"><div className="rounded-xl border bg-card p-4" data-club-stats><h2 className="mb-2 font-semibold">{tr("Registrations by category (demo)")}</h2>{byCat.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No registration data yet.")}</p> : <div className="h-60" role="img" aria-label={tr("Registrations by category (demo)")}><ResponsiveContainer width="100%" height="100%"><BarChart data={byCat}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="cat" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="n" fill="var(--primary)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>}</div></TabsContent>

        <TabsContent value="reports"><div className="flex flex-wrap gap-2" data-reports>{canExport ? <>
          <Button variant="outline" className="min-h-11" data-export-tournaments disabled={!canExport} onClick={() => { if (!canExport) return; downloadCsv(`${club.id}-tournaments-demo.csv`, [["id", "category", "start", "end", "status", "referee"], ...events.map((e) => [e.id, e.category, e.start, e.end, eventStatus(e), refereeName(assignments[e.id])])]); toast.success(tr("Report exported")); }}><Download className="mr-1.5 size-4" />{tr("Tournaments (CSV)")}</Button>
          <Button variant="outline" className="min-h-11" data-export-regs disabled={!canExport} onClick={() => { if (!canExport) return; downloadCsv(`${club.id}-registrations-demo.csv`, [["registration", "tournament", "division", "status"], ...regs.map((r) => [r.id, r.eventId, r.division, r.status])]); toast.success(tr("Report exported")); }}><Download className="mr-1.5 size-4" />{tr("Registrations (CSV)")}</Button></> : <p className="text-sm text-muted-foreground">{tr("Your role cannot export reports.")}</p>}</div><p className="mt-3 text-xs text-muted-foreground">{tr("Fictional demo data only. No personal data is exported.")}</p></TabsContent>

        <TabsContent value="notifications"><ul className="space-y-2" data-club-notifs>{notes.length === 0 && <li className="text-sm text-muted-foreground">{tr("No notification.")}</li>}{notes.map((n) => <li key={n.id} className="rounded-lg border p-3 text-sm">{n.text}</li>)}</ul></TabsContent>
      </Tabs>
    </div>
  );
}
