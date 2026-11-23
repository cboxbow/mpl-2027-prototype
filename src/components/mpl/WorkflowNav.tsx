import { Link, useLocation, useSearchParams } from "react-router-dom";
import { tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
/** 5B-3 — Parcours Organisateur en 4 étapes. Les routes existantes sont conservées ; l'événement choisi (?event=) est reporté d'une étape à l'autre. */
const STEPS = [
  { to: "/organizer", label: () => tr("Overview"), sub: () => tr("Events and checklist"), carry: false },
  { to: "/organizer/registrations", label: () => tr("Registrations"), sub: () => tr("Entries, players and teams"), carry: true },
  { to: "/organizer/draws", label: () => tr("Draws"), sub: () => tr("Draw, schedule, live, history"), carry: true },
  { to: "/organizer/scores", label: () => tr("Results"), sub: () => tr("Score entry and validation"), carry: true },
];
export function WorkflowNav() {
  const { pathname } = useLocation(); const [sp] = useSearchParams(); const ev = sp.get("event");
  return (
    <nav aria-label={tr("Organizer workflow")} data-workflow-nav className="mb-5">
      <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {STEPS.map((s, i) => { const on = pathname === s.to; return (
          <li key={s.to}>
            <Link to={s.carry && ev ? `${s.to}?event=${encodeURIComponent(ev)}` : s.to} aria-current={on ? "step" : undefined} data-step={i + 1} className={cn("flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 transition", on ? "border-primary bg-primary/5" : "bg-card hover:border-primary/50")}>
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")} aria-hidden="true">{i + 1}</span>
              <span className="min-w-0"><span className="block text-sm font-semibold">{s.label()}</span><span className="block text-xs leading-tight text-muted-foreground">{s.sub()}</span></span>
            </Link>
          </li>); })}
      </ol>
    </nav>
  );
}
