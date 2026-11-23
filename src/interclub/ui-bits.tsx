import type { ReactNode } from "react";
import { AlertTriangle, FlaskConical } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LEVEL_DOT, LEVEL_LABEL, STATUS_LABEL, STATUS_SHORT, STATUS_TONE, type Level, type RuleStatus } from "./rules";
import { LINE_LABEL } from "./exports";
import type { DossierStatus } from "./engagement";

export const sel = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm md:h-9";
export const field = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm md:h-9";
export function RuleStatusBadge({ status, short = false, className }: { status: RuleStatus; short?: boolean; className?: string }) {
  return <span data-rule-status={status} className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_TONE[status], className)}>{short ? STATUS_SHORT[status] : STATUS_LABEL[status]}</span>;
}
export function ImpactDot({ level, label }: { level: Level; label?: string }) {
  if (!level) return <span className="text-muted-foreground" aria-label={tr("No impact")}>–</span>;
  return <span className="inline-flex items-center gap-1.5" title={LEVEL_LABEL[level]}><span aria-hidden className={cn("size-2.5 rounded-full", LEVEL_DOT[level])} /><span className="sr-only">{LEVEL_LABEL[level]}</span>{label && <span className="text-xs">{label}</span>}</span>;
}
const LINE_TONE: Record<string, string> = { draft: "bg-zinc-500 text-white", submitted: "bg-sky-700 text-white", to_complete: "bg-amber-700 text-white", accepted: "bg-emerald-700 text-white", refused: "bg-rose-700 text-white", partial: "bg-teal-700 text-white" };
export function LineBadge({ status }: { status: DossierStatus }) { return <span data-line-status={status} className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", LINE_TONE[status])}>{LINE_LABEL[status]}</span>; }
/** Bandeau permanent des écrans Interclub : démonstration, proposition, règle officielle. */
export function IcNotice({ children }: { children?: ReactNode }) {
  return <Alert className="border-amber-500/60" data-ic-notice><FlaskConical className="size-4" /><AlertTitle>{tr("Demonstration — proposals, not official rules")}</AlertTitle>
    <AlertDescription>{children ?? tr("Fictional data, no real payment. Values shown come from working documents and are NOT approved by the Committee. A demo validation or a simulated decision is not an official approval.")}</AlertDescription></Alert>;
}
export function WarnLine({ children, level = "warn" }: { children: ReactNode; level?: "warn" | "block" | "info" }) {
  return <li className={cn("flex items-start gap-2 rounded-md border p-2 text-sm", level === "block" ? "border-destructive/60 bg-destructive/10" : level === "warn" ? "border-amber-500/60 bg-amber-500/10" : "bg-muted/40")}>{level !== "info" && <AlertTriangle className="mt-0.5 size-4 shrink-0" />}<span>{children}</span></li>;
}
export const Tag = ({ children }: { children: ReactNode }) => <Badge variant="outline" className="font-normal">{children}</Badge>;
