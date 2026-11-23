import { Check } from "lucide-react";
import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { STAGES, currentStage, stageLabel, type FlowInput, flowStates } from "@/lib/registration-flow";
/** 5B-5 — progression commune du parcours d'inscription (page /register et assistant) : 7 étapes, étape courante annoncée, utilisable sur mobile (pastilles + libellé courant). */
export function RegistrationStepper({ flow, className }: { flow: FlowInput; className?: string }) {
  const st = flowStates(flow); const cur = currentStage(st);
  return (
    <div className={className} data-reg-stepper data-stage={cur.stage}>
      <ol className="flex items-start justify-between gap-1" aria-label={tr("Registration steps")}>
        {STAGES.map((s, i) => (
          <li key={s} data-stage-item={s} data-state={st[s]} aria-current={st[s] === "current" ? "step" : undefined} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <span className={cn("grid size-7 place-items-center rounded-full border text-xs font-bold num", st[s] === "done" ? "border-success/60 bg-success/15 text-success" : st[s] === "current" ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}>{st[s] === "done" ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}</span>
            <span className={cn("hidden break-words text-[11px] leading-tight sm:block", st[s] === "current" ? "font-semibold text-foreground" : "text-muted-foreground")}>{stageLabel(s)}</span>
            <span className="sr-only sm:hidden">{stageLabel(s)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs font-medium text-muted-foreground sm:hidden" aria-live="polite" data-stage-text>{tr("Step")} {cur.n} {tr("of")} {STAGES.length} — {stageLabel(cur.stage)}</p>
    </div>
  );
}
