import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { Gate } from "@/pages/player/Dashboard";
import { DemoBadge } from "@/components/mpl/bits";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clubById } from "@/data/clubs";
import { useDemo } from "@/lib/demo-store";
import { tr } from "@/lib/i18n";
import { canonicalRole } from "@/lib/permissions";
import { JourneyBar, WorkQueue } from "@/interclub/JourneyBar";

const EngagementForm = lazy(() => import("@/interclub/EngagementForm"));
const Commission = lazy(() => import("@/interclub/Commission"));
const RulesRegistry = lazy(() => import("@/interclub/RulesRegistry"));
const CapacitySim = lazy(() => import("@/interclub/CapacitySim"));
const SeasonPanel = lazy(() => import("@/interclub/SeasonPanel"));
const Compositions = lazy(() => import("@/interclub/Compositions"));
const PrepPanel = lazy(() => import("@/interclub/PrepPanel"));
const Matches = lazy(() => import("@/interclub/d3/Matches"));
const Standings = lazy(() => import("@/interclub/d4/Standings"));
const Dashboard = lazy(() => import("@/interclub/d4/Dashboard"));
/** Entrée Interclub (D0 + D1) des espaces club et administration MPL. */
export default function InterclubPage() {
  const { role, setRole, allowed, organizerClub } = useDemo(); const [sp, setSp] = useSearchParams();
  const referee = canonicalRole(role) === "referee";
  if (!allowed("interclub.view", { clubId: organizerClub }) && !(referee && allowed("sheet.view"))) return <Gate onSwitch={() => setRole("club_admin")} label={tr("club manager, referee or MPL admin")} />;
  const admin = canonicalRole(role) === "admin"; const loading = <p className="p-6 text-center text-muted-foreground">{tr("Loading…")}</p>;
  const work = referee ? ["matches"] : admin ? ["commission", "prep", "matches", "standings", "dashboard"] : ["engagement", "compositions", "matches"];
  const ref = referee ? [] : ["rules", "season", "capacity"]; const valid = [...work, ...ref]; const def = referee ? "matches" : admin ? "commission" : "engagement";
  const tab = sp.get("tab") && valid.includes(sp.get("tab")!) ? sp.get("tab")! : def;
  /** Change d'onglet en gardant l'adresse partageable (?tab=…&stage=…). `stage` ne concerne que « Rencontres ». */
  const go = (t: string, stage?: string) => { const n = new URLSearchParams(); if (t !== def || stage) n.set("tab", t); if (stage && t === "matches") n.set("stage", stage); setSp(n, { replace: false }); };
  return (
    <div className="container-mpl py-8" data-interclub-page>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{tr("Interclub 2027")}</p><h1 className="text-3xl font-bold sm:text-4xl">{referee ? tr("Interclub — referee") : admin ? tr("Interclub — MPL Commission") : `${tr("Interclub — engagement")} · ${clubById(organizerClub)?.name ?? ""}`}</h1></div><div className="flex flex-wrap items-center gap-3"><a href="#/interclub-public" className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium text-primary underline-offset-4 hover:underline md:min-h-9" data-public-link>{tr("Public championship portal")}</a><DemoBadge label={tr("DEMO · PROPOSALS")} /></div></div>
      {referee ? <WorkQueue kind="referee" onGo={go} /> : admin ? <WorkQueue kind="commission" onGo={go} /> : <JourneyBar onGo={(t) => go(t)} />}
      <Tabs value={tab} onValueChange={(v) => go(v)}>
        <TabsList className="no-scrollbar h-12 w-full justify-start overflow-x-auto">
          {!referee && (admin ? <TabsTrigger value="commission">{tr("Commission")}</TabsTrigger> : <TabsTrigger value="engagement">{tr("My engagement")}</TabsTrigger>)}
          {!referee && (admin ? <TabsTrigger value="prep">{tr("Preparation")}</TabsTrigger> : <TabsTrigger value="compositions">{tr("Team compositions")}</TabsTrigger>)}
          <TabsTrigger value="matches">{tr("Matches")}</TabsTrigger>{admin && <><TabsTrigger value="standings">{tr("Standings")}</TabsTrigger><TabsTrigger value="dashboard">{tr("Dashboard")}</TabsTrigger></>}
          {!referee && <><span role="presentation" aria-hidden className="mx-2 hidden h-6 w-px shrink-0 bg-border sm:block" data-tab-separator /><span className="sr-only">{tr("Reference and simulation")}</span><TabsTrigger value="rules">{tr("Rules register")}</TabsTrigger><TabsTrigger value="season">{tr("Season and divisions")}</TabsTrigger><TabsTrigger value="capacity">{tr("Capacity simulator")}</TabsTrigger></>}
        </TabsList>
        <Suspense fallback={loading}>
          {!referee && (admin ? <TabsContent value="commission" className="mt-5"><Commission /></TabsContent> : <TabsContent value="engagement" className="mt-5"><EngagementForm /></TabsContent>)}
          {!referee && (admin ? <TabsContent value="prep" className="mt-5"><PrepPanel /></TabsContent> : <TabsContent value="compositions" className="mt-5"><Compositions /></TabsContent>)}
          <TabsContent value="matches" className="mt-5"><Matches key={sp.get("stage") ?? ""} /></TabsContent>
          {admin && <><TabsContent value="standings" className="mt-5"><Standings /></TabsContent><TabsContent value="dashboard" className="mt-5"><Dashboard /></TabsContent></>}
          {!referee && <><TabsContent value="rules" className="mt-5"><RulesRegistry /></TabsContent><TabsContent value="season" className="mt-5"><SeasonPanel /></TabsContent><TabsContent value="capacity" className="mt-5"><CapacitySim /></TabsContent></>}
        </Suspense>
      </Tabs>
    </div>
  );
}
