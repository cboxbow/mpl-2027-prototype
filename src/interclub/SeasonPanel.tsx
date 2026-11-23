import { useState } from "react";
import { StatCard } from "@/components/mpl/bits";
import { Switch } from "@/components/ui/switch";
import { useDemo } from "@/lib/demo-store";
import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { DEFAULT_DIVISIONS, PROPOSED_DATES } from "./capacity";
import { teamCounts } from "./engagement";
import { IcNotice, field } from "./ui-bits";
import { fmtDate } from "@/lib/format";

/** D1 — Saison Interclub 2027 de démonstration et ses sept divisions proposées. Rien n'est approuvé. */
export default function SeasonPanel() {
  const { ic, allowed, icAct } = useDemo(); const can = allowed("season.config"); const accepted = teamCounts(ic.dossiers, ["accepted"]); const pending = teamCounts(ic.dossiers, ["submitted"]);
  const [mx, setMx] = useState<Record<string, string>>({});
  const total = DEFAULT_DIVISIONS.filter((d) => d.code !== "D2H" || ic.params.d2hActive).reduce((a, d) => a + (ic.params.maxByDivision[d.code] ?? d.max), 0);
  return (
    <div className="space-y-5" data-season>
      <IcNotice />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label={tr("Season")} value={`Interclub ${ic.year}`} hint={tr("Demonstration season")} /><StatCard label={tr("Divisions")} value={DEFAULT_DIVISIONS.length} /><StatCard label={tr("Design capacity (proposed)")} value={total} hint={tr("Maximum of design, not a fact")} /><StatCard label={tr("Engagement closing (proposed)")} value={ic.params.closeDate} hint={tr("Not approved")} /></div>
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3"><Switch id="d2h" checked={ic.params.d2hActive} disabled={!can} onCheckedChange={(v) => { icAct({ k: "param", patch: { d2hActive: v } }); }} aria-label={tr("D2H open")} data-d2h-switch /><label htmlFor="d2h" className="text-sm font-medium" data-d2h-state={ic.params.d2hActive ? "open" : "suspended"}>{ic.params.d2hActive ? tr("D2H is open in this configuration") : tr("D2H is suspended in this configuration")}</label></div>
        <p className="mt-1 text-xs text-muted-foreground">{tr("Opening or suspending D2H is undecided (DEC-IC-05). This switch only changes the demo: simulator, counters and form warnings.")}{!can && " " + tr("Read-only for this role.")}</p></div>
      <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[560px] text-sm" data-divisions><caption className="sr-only">{tr("Divisions")}</caption><thead className="bg-muted/50"><tr><th scope="col" className="px-3 py-2 text-left">{tr("Division")}</th><th scope="col" className="px-3 py-2 text-left">{tr("Level")}</th><th scope="col" className="px-3 py-2 text-left">{tr("Maximum (proposed)")}</th><th scope="col" className="px-3 py-2 text-left">{tr("Submitted")}</th><th scope="col" className="px-3 py-2 text-left">{tr("Accepted (simulated)")}</th><th scope="col" className="px-3 py-2 text-left">{tr("State")}</th></tr></thead>
        <tbody>{DEFAULT_DIVISIONS.map((d) => { const susp = d.code === "D2H" && !ic.params.d2hActive; const max = ic.params.maxByDivision[d.code]; return (
          <tr key={d.code} className={cn("border-t", susp && "bg-muted/40 text-muted-foreground")} data-division-row={d.code}><td className="px-3 py-2 font-semibold">{d.code}</td><td className="px-3 py-2">{d.level}</td>
            <td className="px-3 py-1">{can ? <input type="number" min={1} max={99} className={cn(field, "w-24")} aria-label={`${d.code} ${tr("maximum")}`} value={mx[d.code] ?? String(max)} onChange={(e) => setMx({ ...mx, [d.code]: e.target.value })} onBlur={() => { const n = Number(mx[d.code]); if (mx[d.code] !== undefined && Number.isInteger(n) && n >= 1 && n !== max) icAct({ k: "divMax", code: d.code, max: n }); setMx(({ [d.code]: _, ...r }) => r); }} /> : max}</td>
            <td className="px-3 py-2 tabular-nums">{pending[d.code] ?? 0}</td><td className="px-3 py-2 tabular-nums">{accepted[d.code] ?? 0}</td><td className="px-3 py-2">{susp ? <span data-suspended>{tr("Suspended (configuration)")}</span> : tr("Open (proposal)")}</td></tr>); })}</tbody></table></div>
      <div className="rounded-xl border bg-card p-4"><h2 className="mb-2 font-semibold">{tr("Ten proposed days")}</h2><ol className="grid gap-1.5 text-sm sm:grid-cols-2 lg:grid-cols-5">{PROPOSED_DATES.map((dt, i) => <li key={dt} className="rounded-md border p-2"><strong>J{i + 1}</strong> · {fmtDate(dt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}<span className="block text-xs text-muted-foreground">{i < 6 ? tr("Pools") : tr("Final phases")}</span></li>)}</ol>
        <p className="mt-2 text-xs text-muted-foreground">{tr("Calendar proposed in CAL v2 (not approved). Holidays and Ramadan are to be verified against the official list.")}</p></div>
    </div>
  );
}
