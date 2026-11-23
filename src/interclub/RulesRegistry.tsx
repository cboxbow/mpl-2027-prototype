import { useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/mpl/bits";
import { useDemo } from "@/lib/demo-store";
import { CURRENT_LANG, tr, trDyn } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RULES } from "./rules-data";
import { DEFAULT_OWNER, LEVEL_LABEL, MODULES, MODULE_LABEL, STATUS_LABEL, STATUS_ORDER, blockersOf, impactCounts, isOfficial, statusCounts, type ModuleKey, type RuleDef, type RuleStatus } from "./rules";
import { ImpactDot, IcNotice, RuleStatusBadge, field, sel } from "./ui-bits";

const subjectOf = (r: RuleDef) => (CURRENT_LANG === "fr" ? r.subject : r.subjectEn);
/** D0 — Registre administratif des 33 règles DEC-IC : consultation, simulation, historique. Aucune règle ne devient officielle ici. */
export default function RulesRegistry() {
  const { ic, allowed, icAct } = useDemo(); const canEdit = allowed("rules.edit");
  const [q, setQ] = useState(""); const [st, setSt] = useState<"all" | RuleStatus>("all"); const [mod, setMod] = useState<"all" | ModuleKey>("all"); const [openId, setOpenId] = useState<string | null>(null);
  const counts = statusCounts(RULES);
  const rows = useMemo(() => RULES.filter((r) => (st === "all" || r.status === st) && (mod === "all" || r.impacts[mod].l === "red") && (!q.trim() || `${r.id} ${r.subject} ${r.subjectEn} ${r.proposal}`.toLowerCase().includes(q.trim().toLowerCase()))), [q, st, mod]);
  const open = RULES.find((r) => r.id === openId) ?? null;
  return (
    <div className="space-y-5" data-rules-registry>
      <IcNotice />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" data-rule-counts>
        {STATUS_ORDER.map((s) => <StatCard key={s} label={STATUS_LABEL[s]} value={counts[s]} tone={s === "documented" ? "good" : s === "to_decide" || s === "contradictory" ? "warn" : "default"} />)}
      </div>
      <div className="rounded-xl border bg-card p-4"><h2 className="mb-2 font-semibold">{tr("Decisions that block official go-live, per module")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{MODULES.map((m) => { const c = impactCounts(RULES, m); return (
          <div key={m} className="rounded-lg border p-3 text-sm" data-blockers={m}><p className="font-semibold">{MODULE_LABEL[m]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{tr("Blocking")}: {blockersOf(RULES, m).map((r) => r.num).join(", ") || "—"}</p>
            <p className="mt-1 flex flex-wrap gap-x-3 text-xs"><ImpactDot level="red" label={String(c.red)} /><ImpactDot level="orange" label={String(c.orange)} /><ImpactDot level="green" label={String(c.green)} /></p></div>); })}</div>
        <p className="mt-2 text-xs text-muted-foreground">{tr("No decision prevents D1 from starting: every rule is a configurable parameter.")}</p></div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1"><label htmlFor="rule-q" className="mb-1 block text-xs font-medium">{tr("Search")}</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground md:top-2.5" /><input id="rule-q" className={cn(field, "pl-9")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="DEC-IC-05, D2H…" /></div></div>
        <div><label htmlFor="rule-st" className="mb-1 block text-xs font-medium">{tr("Status")}</label><select id="rule-st" className={cn(sel, "w-56")} value={st} onChange={(e) => setSt(e.target.value as typeof st)}><option value="all">{tr("All statuses")}</option>{STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
        <div><label htmlFor="rule-mod" className="mb-1 block text-xs font-medium">{tr("Blocks")}</label><select id="rule-mod" className={cn(sel, "w-56")} value={mod} onChange={(e) => setMod(e.target.value as typeof mod)}><option value="all">{tr("Any module")}</option>{MODULES.map((m) => <option key={m} value={m}>{MODULE_LABEL[m]}</option>)}</select></div>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite" data-rule-total>{rows.length} / {RULES.length} {tr("rules")}</p>
      <ul className="space-y-2.5" data-rule-list>
        {rows.map((r) => { const rt = ic.rules[r.id]; return (
          <li key={r.id} className="rounded-xl border bg-card p-4" data-rule={r.id}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1"><p className="text-xs font-mono text-muted-foreground">{r.id}</p><p className="font-semibold">{subjectOf(r)}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.proposal}</p></div>
              <div className="flex flex-col items-end gap-2"><RuleStatusBadge status={r.status} />
                {rt?.demoValidation && <span className="rounded-full border border-amber-500 px-2 py-0.5 text-xs" data-demo-validated>{tr("Demo validation (not approval)")}</span>}
                {rt?.sim && <span className="rounded-full border px-2 py-0.5 text-xs" data-simulated>{tr("Simulated")}</span>}</div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              {MODULES.map((m) => <span key={m} className="inline-flex items-center gap-1"><span className="font-semibold">{m}</span><ImpactDot level={r.impacts[m].l} /></span>)}
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => setOpenId(r.id)} data-rule-open={r.id} aria-label={`${tr("Details")} ${r.id}`}><Eye className="mr-1 size-4" />{tr("Details")}</Button>
            </div>
          </li>); })}
      </ul>
      {open && <RuleDialog rule={open} canEdit={canEdit} onClose={() => setOpenId(null)} icAct={icAct} />}
    </div>
  );
}
function Fact({ label, children }: { label: string; children: React.ReactNode }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-0.5 text-sm">{children}</dd></div>; }
function RuleDialog({ rule: r, canEdit, onClose, icAct }: { rule: RuleDef; canEdit: boolean; onClose: () => void; icAct: ReturnType<typeof useDemo>["icAct"] }) {
  const { ic } = useDemo(); const rt = ic.rules[r.id]; const [sim, setSim] = useState(rt?.sim ?? ""); const [dnote, setDnote] = useState(rt?.demoValidation?.note ?? ""); const [owner, setOwner] = useState(rt?.owner ?? DEFAULT_OWNER);
  const official = isOfficial(r);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" data-rule-dialog={r.id}>
        <DialogHeader><DialogTitle className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm">{r.id}</span>{subjectOf(r)}</DialogTitle><DialogDescription>{tr("Rule register entry — consolidated from the documents of phase 4D.0.")}</DialogDescription></DialogHeader>
        <div className="flex flex-wrap items-center gap-2"><RuleStatusBadge status={r.status} />{CURRENT_LANG === "en" && <span className="text-xs text-muted-foreground">{tr("Source texts are in French")}</span>}</div>
        <dl className="space-y-3">
          <Fact label={tr("Proposed value")}>{r.proposal}</Fact>
          <Fact label={tr("Approved value")}>{official ? <><span data-approved-value>{r.approved!.value}</span></> : <span data-no-approved className="text-muted-foreground">{tr("None — no documented decision. Nothing is approved automatically.")}</span>}</Fact>
          <Fact label={tr("Decision date and reference")}>{official ? `${r.approved!.date} · ${r.approved!.ref}` : "—"}</Fact>
          <Fact label={tr("Documentary source")}>{r.source}</Fact>
          <Fact label={tr("Contradictions")}>{r.contradiction}</Fact>
          <Fact label={tr("Arbitration needed")}>{r.arbitration}</Fact>
          <Fact label={tr("Validation owner")}>{canEdit ? <span className="flex gap-2"><input className={field} value={owner} onChange={(e) => setOwner(e.target.value)} aria-label={tr("Validation owner")} /><Button size="sm" variant="outline" onClick={() => { icAct({ k: "ruleOwner", id: r.id, owner: owner.trim() || DEFAULT_OWNER }); toast.success(tr("Saved (demo)")); }}>{tr("Save")}</Button></span> : (official ? r.approved!.by : rt?.owner ?? DEFAULT_OWNER)}<span className="block text-xs text-muted-foreground">{tr("Proposed owner, to be confirmed by MPL.")}</span></Fact>
          <Fact label={tr("Consequences for D1 to D4")}>
            <ul className="space-y-1.5" data-consequences>{MODULES.map((m) => <li key={m} className="flex flex-wrap items-center gap-2"><strong className="w-8">{m}</strong><ImpactDot level={r.impacts[m].l} />{r.impacts[m].l ? <span className="text-xs">{LEVEL_LABEL[r.impacts[m].l as "red"]}{r.impacts[m].n ? ` — ${r.impacts[m].n}` : ""}</span> : <span className="text-xs text-muted-foreground">{tr("No impact")}</span>}</li>)}</ul>
            <p className="mt-2 text-sm text-muted-foreground">{r.devNote}</p></Fact>
        </dl>
        <RuleDrivers num={r.num} canEdit={canEdit} icAct={icAct} />
        {canEdit ? (
          <div className="space-y-3 rounded-lg border p-3" data-rule-sim>
            <h4 className="font-semibold">{tr("Simulation (demo only)")}</h4>
            <p className="text-xs text-muted-foreground">{tr("Record a value to try in the demo. The regulatory status does not change.")}</p>
            <Textarea value={sim} onChange={(e) => setSim(e.target.value)} aria-label={tr("Simulated value")} placeholder={tr("Simulated value")} />
            <div className="flex flex-wrap gap-2"><Button size="sm" disabled={!sim.trim()} onClick={() => { icAct({ k: "ruleSim", id: r.id, value: sim.trim() }); toast.success(tr("Simulation saved (status unchanged)")); }} data-rule-sim-save>{tr("Save simulation")}</Button><Button size="sm" variant="outline" disabled={!rt?.sim} onClick={() => { icAct({ k: "ruleSim", id: r.id, value: null }); setSim(""); }}>{tr("Clear")}</Button></div>
            <div className="flex items-center gap-3 border-t pt-3"><Switch id={`dv-${r.id}`} checked={!!rt?.demoValidation} onCheckedChange={(on) => icAct({ k: "ruleDemo", id: r.id, note: dnote, on })} data-rule-demo-switch /><label htmlFor={`dv-${r.id}`} className="text-sm">{tr("Demo validation")}</label></div>
            <input className={field} value={dnote} onChange={(e) => setDnote(e.target.value)} aria-label={tr("Demo validation note")} placeholder={tr("Note (optional)")} />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400" data-demo-warning>{tr("A demo validation is NOT an approval by the Committee and never changes the status.")}</p>
          </div>
        ) : rt?.sim ? <Fact label={tr("Simulated value")}>{rt.sim}</Fact> : null}
        <div><h4 className="mb-2 font-semibold">{tr("Change history")}</h4>
          <ol className="space-y-1.5 text-sm" data-rule-history>{[...(rt?.history ?? [])].reverse().map((h, i) => <li key={i} className="rounded-md border p-2"><span className="text-xs text-muted-foreground">{h.at} · {trDyn(h.actor)}</span><br />{trDyn(h.action)}{h.note ? <span className="text-muted-foreground"> — {h.note}</span> : null}</li>)}</ol></div>
      </DialogContent>
    </Dialog>
  );
}
/** Paramètres de simulation reliés aux règles qui pilotent D1 (valeurs de démonstration, non approuvées). */
function RuleDrivers({ num, canEdit, icAct }: { num: number; canEdit: boolean; icAct: ReturnType<typeof useDemo>["icAct"] }) {
  const { ic } = useDemo(); const p = ic.params; if (![2, 3, 4, 5, 7, 10].includes(num)) return null;
  const set = (patch: Partial<typeof p>) => icAct({ k: "param", patch });
  return (
    <div className="space-y-2 rounded-lg border p-3" data-rule-drivers><h4 className="font-semibold">{tr("Linked simulation parameters (D1)")}</h4>
      {num === 2 && <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">{tr("Closing date (proposed)")}<input type="date" className={field} disabled={!canEdit} value={p.closeDate} onChange={(e) => e.target.value && set({ closeDate: e.target.value })} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-5" disabled={!canEdit} checked={p.lateBlocking} onChange={(e) => set({ lateBlocking: e.target.checked })} />{tr("Late submissions are blocked")}</label></div>}
      {num === 3 && <label className="block text-sm">{tr("Minimum homologated courts (warning threshold)")}<select className={sel} disabled={!canEdit} value={p.minHomologated} onChange={(e) => set({ minHomologated: Number(e.target.value) })}><option value={1}>1</option><option value={2}>2</option></select></label>}
      {num === 4 && <label className="block text-sm">{tr("Fee per team, Rs (proposed — display only, no payment)")}<input type="number" min={0} className={field} disabled={!canEdit} value={p.fee} onChange={(e) => set({ fee: Math.max(0, Number(e.target.value) || 0) })} /></label>}
      {num === 5 && <label className="flex items-center gap-3 text-sm"><Switch checked={p.d2hActive} disabled={!canEdit} onCheckedChange={(v) => set({ d2hActive: v })} aria-label={tr("D2H open")} data-d2h-switch-rule />{p.d2hActive ? tr("D2H is open in this configuration") : tr("D2H is suspended in this configuration")}</label>}
      {num === 7 && <label className="block text-sm">{tr("Minimum players per team (warning threshold)")}<input type="number" min={1} max={12} className={field} disabled={!canEdit} value={p.minPlayersPerTeam} onChange={(e) => set({ minPlayersPerTeam: Math.max(1, Math.min(12, Number(e.target.value) || 6)) })} /></label>}
      {num === 10 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-5" disabled={!canEdit} checked={p.exclusivityBlocking} onChange={(e) => set({ exclusivityBlocking: e.target.checked })} />{tr("Exclusivity conflicts block submission")}</label>}
      {!canEdit && <p className="text-xs text-muted-foreground">{tr("Read-only for this role.")}</p>}
    </div>
  );
}
