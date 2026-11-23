import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/mpl/bits";
import { clubById } from "@/data/clubs";
import { useDemo } from "@/lib/demo-store";
import { fmtDate } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { DEFAULT_DIVISIONS, FORMAT_MINUTES, MPL_COURTS_REFERENCE, PROPOSED_DATES, computeCapacity, defaultInputs, divisionTies, scenarioDivisions, teamsByDivision, wavesFor, type CapacityInputs, type ClubCourts, type DivisionPlan, type MatchFormat, type RiskItem, type ScenarioKey } from "./capacity";
import { fmtMsg } from "./EngagementForm";
import { teamCounts } from "./engagement";
import { XLSX_REFERENCE } from "./xlsx-reference";
import { IcNotice, field, sel } from "./ui-bits";

const RISK_TEXT: Record<RiskItem["code"], string> = {
  above_theoretical: tr("Load of {load} ties per Friday is above the theoretical capacity ({cap}): the calendar cannot be hosted."),
  above_recommended: tr("Load of {load} ties per Friday is above the recommended capacity ({cap}): overload risk."),
  tight: tr("Load of {load} is close to the recommended capacity ({cap}): very little margin."),
  odd_pool: tr("Pools of uneven size in {divisions}: the load per Friday is approximate."),
  full_availability: tr("100% of the existing courts are assumed to be free on Friday evening: this is the most favourable case, not a commitment."),
  no_host_commitment: tr("No club has committed to host: availability is a hypothesis to be collected."),
  weekday_unconfirmed: tr("Friday evening play, 17:00–21:00, is a proposal; the courts used by members and other events are not modelled."),
  date_overload: tr("Overload on {dates} with the date-by-date availability entered."),
};
/** Simulateur interactif — SIMULATION : aucune règle officielle, aucun engagement d'hôte. */
export default function CapacitySim() {
  const { ic } = useDemo(); const [scenario, setScenario] = useState<ScenarioKey>("s64"); const [divs, setDivs] = useState<DivisionPlan[]>(scenarioDivisions("s64"));
  const [format, setFormat] = useState<MatchFormat>("A"); const [start, setStart] = useState("17:00"); const [end, setEnd] = useState("21:00"); const [share, setShare] = useState(100); const [reserve, setReserve] = useState(75);
  const [clubs, setClubs] = useState<ClubCourts[]>(MPL_COURTS_REFERENCE.map((c) => ({ ...c }))); const [factors, setFactors] = useState<number[]>(PROPOSED_DATES.map(() => 100)); const [source, setSource] = useState<"reference" | "engagements">("reference");
  const waves = wavesFor(format, start, end);
  const inputs: CapacityInputs = { divisions: divs, share: share / 100, waves, reserve: reserve / 100, matchesPerTie: 3, clubs, dateFactors: factors.map((f) => f / 100) };
  const res = useMemo(() => computeCapacity(inputs), [divs, share, waves, reserve, clubs, factors]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (k: ScenarioKey) => { setScenario(k); if (k !== "custom") setDivs(scenarioDivisions(k)); };
  const setDiv = (code: string, patch: Partial<DivisionPlan>) => { setScenario("custom"); setDivs(divs.map((d) => (d.code === code ? { ...d, ...patch } : d))); };
  const fromEngagements = () => { const c = teamCounts(ic.dossiers, ["submitted", "accepted"]); setScenario("custom"); setDivs(teamsByDivision(c, DEFAULT_DIVISIONS).map((d) => ({ ...d, active: d.code === "D2H" ? ic.params.d2hActive : true }))); const hosts = ic.dossiers.filter((d) => d.form.hosting.fridayCourts > 0); setClubs(hosts.map((d) => ({ name: clubById(d.clubId)?.name ?? d.clubId, courts: d.form.hosting.homologated, available: d.form.hosting.fridayCourts }))); setSource("engagements"); };
  const reset = () => { pick("s64"); setClubs(MPL_COURTS_REFERENCE.map((c) => ({ ...c }))); setShare(100); setReserve(75); setFormat("A"); setStart("17:00"); setEnd("21:00"); setFactors(PROPOSED_DATES.map(() => 100)); setSource("reference"); };
  const matchesRef = scenario === "s64" ? XLSX_REFERENCE.s64_100 : scenario === "s52" ? XLSX_REFERENCE.s52_100 : null;
  const atRef = share === 100 && reserve === 75 && waves === 2 && source === "reference" && factors.every((f) => f === 100) && clubs.every((c, i) => c.available === undefined && c.courts === MPL_COURTS_REFERENCE[i]?.courts) && clubs.length === 18;
  const check = matchesRef && atRef ? [[tr("Ties per Friday"), res.loadPerFriday, matchesRef.load], [tr("Total ties"), res.totalTies, matchesRef.totalTies], [tr("Total matches"), res.totalMatches, matchesRef.totalMatches], [tr("Theoretical capacity"), res.theoretical, matchesRef.theoretical], [tr("Recommended capacity"), res.recommended, matchesRef.recommended], [tr("Host clubs needed"), res.clubsNeeded, matchesRef.clubs], [tr("Courts mobilised"), res.courtsNeeded, matchesRef.courts]] as const : null;
  const VIcon = res.verdict === "ok" ? CheckCircle2 : res.verdict === "overload" ? AlertTriangle : XCircle;
  const th = "px-2 py-1.5 text-left text-xs font-semibold"; const num = cn(field, "w-20 px-2");
  return (
    <div className="space-y-5" data-capacity-sim>
      <IcNotice>{tr("Simulation only. Existing courts (MPL list) are not the courts really available on Friday evening; no club has committed to host.")}</IcNotice>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr("Scenario")}>{([["s64", tr("64 teams")], ["s52", tr("52 teams, no D2H")], ["custom", tr("Custom")]] as const).map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={scenario === k} onClick={() => pick(k)} data-scenario={k} className={cn("h-11 rounded-md border px-4 text-sm font-medium md:h-9", scenario === k ? "bg-primary text-primary-foreground" : "bg-card")}>{l}</button>)}
        <Button variant="outline" onClick={fromEngagements} data-use-engagements>{tr("Use the engagement files")}</Button><Button variant="ghost" onClick={reset} data-sim-reset>{tr("Reset")}</Button></div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[1.1fr_1fr] [&>*]:min-w-0">
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-semibold">{tr("Hypotheses")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">{tr("Match format")}<select className={sel} value={format} onChange={(e) => setFormat(e.target.value as MatchFormat)} data-format><option value="A">{tr("Format A")} ({FORMAT_MINUTES.A.match} min)</option><option value="C">{tr("Format C")} ({FORMAT_MINUTES.C.match} min)</option></select></label>
              <div className="grid min-w-0 grid-cols-2 gap-2 [&_label]:min-w-0"><label className="text-sm">{tr("From")}<input type="time" className={field} value={start} onChange={(e) => setStart(e.target.value || "17:00")} data-start /></label><label className="text-sm">{tr("To")}<input type="time" className={field} value={end} onChange={(e) => setEnd(e.target.value || "21:00")} data-end /></label></div>
              <label className="text-sm">{tr("Share of courts freed on Friday")}: <strong data-share-val>{share}%</strong><input type="range" min={0} max={100} step={5} value={share} onChange={(e) => setShare(Number(e.target.value))} className="h-11 w-full" data-share /></label>
              <label className="text-sm">{tr("Recommended reserve")}: <strong>{reserve}%</strong><input type="range" min={30} max={100} step={5} value={reserve} onChange={(e) => setReserve(Number(e.target.value))} className="h-11 w-full" data-reserve /></label></div>
            <p className="mt-2 text-sm" data-waves>{tr("Waves per evening")}: <strong>{waves}</strong> · {tr("A tie = 3 doubles matches played at the same time on 3 courts.")}</p></section>
          <section className="rounded-xl border bg-card p-4"><h3 className="mb-2 font-semibold">{tr("Divisions")}</h3>
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm" data-div-table><caption className="sr-only">{tr("Divisions")}</caption><thead><tr><th scope="col" className={th}>{tr("Division")}</th><th scope="col" className={th}>{tr("Active")}</th><th scope="col" className={th}>{tr("Teams")}</th><th scope="col" className={th}>{tr("Pools")}</th><th scope="col" className={th}>{tr("Semi-finals")}</th><th scope="col" className={th}>{tr("Finals")}</th><th scope="col" className={th}>{tr("Ties")}</th></tr></thead>
              <tbody>{divs.map((d) => <tr key={d.code} className="border-t" data-div-row={d.code}><td className="px-2 py-1 font-semibold">{d.code}</td>
                <td className="px-2"><input type="checkbox" className="size-5" checked={d.active} onChange={(e) => setDiv(d.code, { active: e.target.checked })} aria-label={`${d.code} ${tr("active")}`} data-div-active={d.code} /></td>
                <td className="px-1"><input type="number" min={0} max={d.max} className={num} aria-label={`${d.code} ${tr("teams")}`} value={d.teams} onChange={(e) => setDiv(d.code, { teams: Math.max(0, Math.min(d.max, Number(e.target.value) || 0)) })} /></td>
                <td className="px-1"><input type="number" min={0} className={num} aria-label={`${d.code} ${tr("pools")}`} value={d.pools} onChange={(e) => setDiv(d.code, { pools: Math.max(0, Number(e.target.value) || 0) })} /></td>
                <td className="px-1"><input type="number" min={0} className={num} aria-label={`${d.code} ${tr("semi-finals")}`} value={d.semis} onChange={(e) => setDiv(d.code, { semis: Math.max(0, Number(e.target.value) || 0) })} /></td>
                <td className="px-1"><input type="number" min={0} className={num} aria-label={`${d.code} ${tr("finals")}`} value={d.finals} onChange={(e) => setDiv(d.code, { finals: Math.max(0, Number(e.target.value) || 0) })} /></td>
                <td className="px-2 tabular-nums" data-div-ties={d.code}>{divisionTies(d)}</td></tr>)}</tbody></table></div>
            <p className="mt-2 text-xs text-muted-foreground">{tr("Maximums are proposals (not approved). Home-and-away pools; load per Friday = teams ÷ 2 for J1–J6.")}</p></section>
          <section className="rounded-xl border bg-card p-4"><h3 className="mb-2 font-semibold">{tr("Courts per club")} <span className="text-xs font-normal text-muted-foreground">({source === "engagements" ? tr("declared in the engagement files") : tr("MPL list: existing courts")})</span></h3>
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm" data-club-table><caption className="sr-only">{tr("Club")}</caption><thead><tr><th scope="col" className={th}>{tr("Club")}</th><th scope="col" className={th}>{tr("Existing courts")}</th><th scope="col" className={th}>{tr("Really available on Friday")}</th><th scope="col" className={th}>{tr("Ties hosted")}</th></tr></thead>
              <tbody>{clubs.map((c, i) => { const row = res.clubRows.find((r) => r.name === c.name); return <tr key={c.name} className="border-t"><td className="px-2 py-1">{c.name}</td><td className="px-2">{c.courts}</td>
                <td className="px-1"><input type="number" min={0} max={c.courts} className={num} aria-label={`${c.name} ${tr("courts available on Friday")}`} value={c.available ?? ""} placeholder={String(Math.floor(c.courts * (share / 100) + 1e-6))} onChange={(e) => setClubs(clubs.map((x, j) => (j === i ? { ...x, available: e.target.value === "" ? undefined : Math.max(0, Math.min(c.courts, Number(e.target.value))) } : x)))} /></td><td className="px-2 tabular-nums">{row?.ties ?? 0}</td></tr>; })}</tbody></table></div>
            <p className="mt-2 text-xs text-muted-foreground">{tr("Leave “really available” empty to apply the share above to the existing courts.")}</p></section>
          <section className="rounded-xl border bg-card p-4"><h3 className="mb-2 font-semibold">{tr("Availability by date")}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">{PROPOSED_DATES.map((dt, i) => <li key={dt} className="rounded-md border p-2 text-sm"><label className="block">J{i + 1} · {fmtDate(dt, { day: "numeric", month: "short" })} — <strong>{factors[i]}%</strong><input type="range" min={0} max={100} step={5} className="h-9 w-full" value={factors[i]} onChange={(e) => setFactors(factors.map((f, j) => (j === i ? Number(e.target.value) : f)))} aria-label={`J${i + 1} ${tr("availability")}`} /></label></li>)}</ul></section>
        </div>
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className={cn("rounded-xl border-2 p-4", res.verdict === "ok" ? "border-emerald-600" : res.verdict === "overload" ? "border-amber-500" : "border-rose-600")} data-result aria-live="polite">
            <p className="flex items-center gap-2 text-lg font-bold" data-verdict={res.verdict}><VIcon className="size-5" />{res.verdict === "ok" ? tr("Within the recommended capacity") : res.verdict === "overload" ? tr("OVERLOAD: above the recommended capacity") : tr("IMPOSSIBLE: above the theoretical capacity")}</p>
            <div className="mt-3 grid grid-cols-2 gap-3"><StatCard label={tr("Teams")} value={res.teams} /><StatCard label={tr("Ties per Friday (J1–J6)")} value={res.loadPerFriday} /><StatCard label={tr("Matches per Friday")} value={res.matchesPerFriday} /><StatCard label={tr("Total ties / matches")} value={`${res.totalTies} / ${res.totalMatches}`} />
              <StatCard label={tr("Theoretical capacity")} value={res.theoretical} /><StatCard label={tr("Recommended capacity")} value={res.recommended} /><StatCard label={tr("Host clubs needed")} value={res.clubsNeeded ?? "—"} hint={res.clubsNeeded === null ? tr("Impossible") : undefined} /><StatCard label={tr("Courts mobilised")} value={res.courtsNeeded === null ? "—" : `${res.courtsNeeded} / ${res.totalCourts}`} /></div>
            <p className="mt-2 text-xs text-muted-foreground">{tr("Load / recommended")}: {res.ratioRecommended === null ? "—" : Math.round(res.ratioRecommended * 100) + "%"} · {tr("Load / theoretical")}: {res.ratioTheoretical === null ? "—" : Math.round(res.ratioTheoretical * 100) + "%"} · {tr("Phase ties (J7–J10)")}: {res.phaseTies}</p></section>
          <section className="rounded-xl border bg-card p-4"><h3 className="mb-2 font-semibold">{tr("Capacity by date")}</h3>
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm" data-date-table><caption className="sr-only">{tr("Day")}</caption><thead><tr><th scope="col" className={th}>{tr("Day")}</th><th scope="col" className={th}>{tr("Date")}</th><th scope="col" className={th}>{tr("Capacity")}</th><th scope="col" className={th}>{tr("Load")}</th><th scope="col" className={th}>{tr("Status")}</th></tr></thead>
              <tbody>{res.perDate.map((d) => <tr key={d.n} className="border-t" data-date-row={d.n}><td className="px-2 py-1 font-semibold">J{d.n}</td><td className="px-2">{fmtDate(d.date, { day: "numeric", month: "short" })}</td><td className="px-2 tabular-nums">{d.theoretical} / {d.recommended}</td><td className="px-2 tabular-nums">{d.load ?? "—"}</td><td className="px-2 text-xs" data-date-verdict={d.verdict}>{d.verdict === "ok" ? tr("OK") : d.verdict === "overload" ? tr("Overload") : d.verdict === "impossible" ? tr("Impossible") : tr("Finals: split to be set (D2)")}</td></tr>)}</tbody></table></div>
            <p className="mt-1 text-xs text-muted-foreground">{tr("Capacity = theoretical / recommended. Finals-day loads are not modelled: the split of the phase ties over J7–J10 is a D2 decision.")}</p></section>
          <section className="rounded-xl border bg-card p-4"><h3 className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" />{tr("Risks")}</h3><ul className="space-y-1.5 text-sm" data-risks>{res.risks.map((r, i) => <li key={i} data-risk={r.code} className={cn("flex gap-2 rounded-md border p-2", r.level === "high" ? "border-destructive/60 bg-destructive/10" : r.level === "medium" ? "border-amber-500/60 bg-amber-500/10" : "bg-muted/40")}>{r.level === "info" ? <Info className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}<span>{fmtMsg(RISK_TEXT[r.code], r.params)}</span></li>)}</ul></section>
          <section className="rounded-xl border bg-card p-4"><h3 className="mb-2 font-semibold">{tr("Calculation assumptions")}</h3><ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground" data-assumptions>
            <li>{tr("Courts freed per club = existing courts × share (rounded down), unless the really available number is entered.")}</li><li>{tr("Ties hosted per club = waves × freed courts ÷ 3 (rounded down).")}</li><li>{tr("Recommended capacity = theoretical × reserve (assumption of the model).")}</li><li>{tr("Each team plays at every pool day: load = teams ÷ 2.")}</li><li>{tr("Host clubs needed: largest clubs first.")}</li></ul></section>
          <section className="rounded-xl border bg-card p-4" data-xlsx-check><h3 className="mb-1 font-semibold">{tr("Cross-check with the Excel model")}</h3>
            {check ? <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><caption className="sr-only">{tr("Indicator")}</caption><thead><tr><th scope="col" className={th}>{tr("Indicator")}</th><th scope="col" className={th}>{tr("Simulator")}</th><th scope="col" className={th}>Excel</th><th scope="col" className={th} /></tr></thead><tbody>{check.map(([l, a, b]) => <tr key={String(l)} className="border-t"><td className="px-2 py-1">{l}</td><td className="px-2 tabular-nums">{a}</td><td className="px-2 tabular-nums">{b}</td><td className="px-2" data-check={a === b ? "ok" : "ko"}>{a === b ? "✓" : "✗"}</td></tr>)}</tbody></table></div>
              : <p className="text-sm text-muted-foreground">{tr("Select the 64-team or 52-team scenario with the default hypotheses (100% of courts, 75% reserve, format A) to compare with MODELE_CAPACITE_INTERCLUB_2027.xlsx.")}</p>}</section>
        </div>
      </div>
    </div>
  );
}
