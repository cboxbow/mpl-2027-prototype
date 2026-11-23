import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
/** 5B-2 — En-tête de page publique commun (surtitre, H1, description, actions) : même gabarit que le calendrier, les clubs et l'Interclub public. */
export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-3", className)} data-page-header>
      <div className="min-w-0 max-w-full">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
