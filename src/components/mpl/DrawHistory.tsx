import { useMemo, useState } from "react";
import { Archive } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BracketView } from "@/components/mpl/BracketView";
import type { CalendarEvent } from "@/data/calendar.generated";
import type { Division } from "@/data/demo";
import { drawView } from "@/lib/draws";
import { stageOf } from "@/lib/bracket";
import type { DrawArchive } from "@/lib/demo-state";
import { useDemo } from "@/lib/demo-store";
import { tr, trDyn } from "@/lib/i18n";

/** Historique consultable des versions archivées d'un tableau (avant corrections exceptionnelles). Lecture seule, jamais présenté comme résultat courant. */
export function DrawHistory({ ev, division }: { ev: CalendarEvent; division: Division }) {
  const { archives, registrations, org } = useDemo(); const [open, setOpen] = useState<string | null>(null);
  const list = archives.filter((a) => a.eventId === ev.id && a.division === division).sort((a, b) => b.version - a.version);
  const arc = list.find((a) => a.id === open);
  const view = useMemo(() => (arc ? drawView({ draws: { [`${arc.eventId}|${arc.division}`]: arc.cfg }, matches: arc.matches, registrations, org }, ev, division) : null), [arc, registrations, org, ev, division]);
  const played = (a: DrawArchive) => Object.values(a.matches).filter((m) => m.result).length;
  return (
    <div data-version-history className="space-y-3">
      <p className="text-sm text-muted-foreground">{tr("Previous versions of this draw are archived before any exceptional correction. They stay readable here and are never counted as current results.")}</p>
      {list.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground" data-no-archive>{tr("No archived version for this draw.")}</p> :
        <ol className="space-y-3">{list.map((a) => (
          <li key={a.id} className="rounded-xl border bg-card p-4" data-archive={a.id}>
            <div className="flex flex-wrap items-center gap-2"><Archive className="size-4 text-muted-foreground" /><strong>{tr("Version")} {a.version}</strong><span className="rounded-full border px-2 py-0.5 text-xs">{tr("Archived")}</span><span className="text-xs text-muted-foreground">{a.id}</span>
              <Button size="sm" variant="outline" className="ml-auto min-h-11 md:min-h-8" onClick={() => setOpen(a.id)} data-open-archive={a.id}>{tr("View this version")}</Button></div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div><dt className="inline text-muted-foreground">{tr("Archived on")} </dt><dd className="inline">{a.archivedAt}</dd></div>
              <div><dt className="inline text-muted-foreground">{tr("Author")} </dt><dd className="inline">{trDyn(a.archivedBy)}</dd></div>
              <div className="sm:col-span-2"><dt className="inline text-muted-foreground">{tr("Reason")} </dt><dd className="inline" data-archive-reason>{a.reason || "—"}</dd></div>
              <div><dt className="inline text-muted-foreground">{tr("Stage at archive")} </dt><dd className="inline">{({ draft: tr("Draft"), ready: tr("Ready to publish"), published: tr("Published"), locked: tr("Locked") })[stageOf(a.cfg)]}</dd></div>
              <div><dt className="inline text-muted-foreground">{tr("Matches / results kept")} </dt><dd className="inline">{Object.keys(a.matches).length} / {played(a)}</dd></div>
              {a.correction && <div className="sm:col-span-2" data-archive-decision><dt className="inline text-muted-foreground">{tr("MPL administration decision")} </dt><dd className="inline">{a.correction.id} · {a.correction.status === "refused" ? tr("Refused") : tr("Approved")}{a.correction.decidedAt ? ` · ${a.correction.decidedAt}` : ""}{a.correction.decisionNote ? ` — ${a.correction.decisionNote}` : ""}</dd></div>}
            </dl>
          </li>))}</ol>}
      <Dialog open={!!arc} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-auto" data-archive-dialog>
          <DialogHeader><DialogTitle>{tr("Archived version")} {arc?.version} · {arc?.id}</DialogTitle><DialogDescription>{tr("Read-only snapshot.")}</DialogDescription></DialogHeader>
          <Alert data-archive-banner><AlertTitle>{tr("Archived — not current results")}</AlertTitle><AlertDescription>{tr("This version was replaced after an approved exceptional correction. Its scores are kept for history only.")}</AlertDescription></Alert>
          {view && <BracketView v={view} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
