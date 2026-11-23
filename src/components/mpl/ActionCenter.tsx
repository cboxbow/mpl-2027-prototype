import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
export type ActionItem = { key: string; label: string; count: number; to?: string; hint?: string; tone?: "warn" | "default"; /** 5B-4 : action locale (ex. changer d'onglet sans quitter la page). */ onSelect?: () => void };
/** 5B-3 — « À traiter » : interface commune aux espaces Club et Organisateur (même composant, aucune fusion des routes). Une ligne par tâche en attente, avec accès direct. */
export function ActionCenter({ title, items, className }: { title: string; items: ActionItem[]; className?: string }) {
  const todo = items.filter((i) => i.count > 0);
  return (
    <section aria-labelledby="action-center-title" data-action-center className={cn("rounded-2xl border bg-card p-4 sm:p-5", className)}>
      <h2 id="action-center-title" className="mb-3 text-base font-bold">{title}</h2>
      {todo.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" data-empty="actions"><CheckCircle2 className="size-4 text-success" aria-hidden="true" />{tr("Nothing waiting for you right now.")}</p>
      ) : (
        <ul className="divide-y">
          {todo.map((i) => {
            const body = (<><span className={cn("grid min-w-8 place-items-center rounded-full px-2 py-0.5 text-xs font-bold num", i.tone === "warn" ? "bg-warning/15 text-warning" : "bg-primary/10 text-foreground")}>{i.count}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{i.label}</span>{i.hint && <span className="block text-xs text-muted-foreground">{i.hint}</span>}</span></>);
            return <li key={i.key} data-action={i.key}>{i.onSelect ? <button type="button" onClick={i.onSelect} className="flex min-h-11 w-full items-center gap-3 py-2 text-left hover:text-primary">{body}</button> : i.to ? <Link to={i.to} className="flex min-h-11 items-center gap-3 py-2 hover:text-primary">{body}</Link> : <div className="flex min-h-11 items-center gap-3 py-2">{body}</div>}</li>;
          })}
        </ul>
      )}
    </section>
  );
}
