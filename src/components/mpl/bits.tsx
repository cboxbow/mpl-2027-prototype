import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { eventStatus, fmtRange, type EventStatus } from "@/lib/format";
import { useI18n, tr } from "@/lib/i18n";
import { clubById, type Club } from "@/data/clubs";
import type { CalendarEvent } from "@/data/calendar.generated";
import { ArrowUpRight, Minus, TrendingDown, TrendingUp } from "lucide-react";

export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  // Le logo MPL a du texte blanc : en thème clair il est posé sur une pastille sombre pour rester lisible (contraste ≥ 4.5:1).
  return <span className="inline-flex shrink-0 items-center rounded-lg bg-brand px-2 py-0.5"><img src={mark ? "/assets/brand/mpl-logo-only.png" : "/assets/brand/mpl-logo.png"} alt={tr("Mauritius Padel League")} className={cn("h-9 w-auto", className)} /></span>;
}
export function DemoBadge({ className, label = "DEMO" }: { className?: string; label?: string }) {
  return <span className={cn("inline-flex items-center rounded border border-gold/50 bg-gold/10 px-1.5 py-0.5 text-xs font-semibold tracking-wider text-gold", className)}>{label}</span>;
}
const CAT: Record<string, string> = {
  M25: "bg-slate-500/15 text-slate-800 ring-slate-600/40 dark:text-slate-300 dark:ring-slate-400/30",
  M50: "bg-sky-500/15 text-sky-800 ring-sky-600/40 dark:text-sky-300 dark:ring-sky-400/30",
  M100: "bg-emerald-500/15 text-emerald-800 ring-emerald-600/40 dark:text-emerald-300 dark:ring-emerald-400/30",
  M250: "bg-teal-500/15 text-teal-800 ring-teal-600/40 dark:text-teal-300 dark:ring-teal-400/30",
  M500: "bg-violet-500/15 text-violet-800 ring-violet-600/40 dark:text-violet-300 dark:ring-violet-400/30",
  M1000: "bg-amber-500/20 text-amber-900 ring-amber-600/50 dark:text-amber-300 dark:ring-amber-400/40",
  M1500: "bg-rose-500/20 text-rose-800 ring-rose-600/50 dark:text-rose-300 dark:ring-rose-400/40",
  "MIXTE 250": "bg-fuchsia-500/15 text-fuchsia-800 ring-fuchsia-600/40 dark:text-fuchsia-300 dark:ring-fuchsia-400/30",
  "MIXTE 500": "bg-fuchsia-500/20 text-fuchsia-800 ring-fuchsia-600/50 dark:text-fuchsia-300 dark:ring-fuchsia-400/40",
  JUNIOR: "bg-orange-500/15 text-orange-900 ring-orange-600/40 dark:text-orange-300 dark:ring-orange-400/30",
};
export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset num", CAT[category] ?? "bg-muted text-foreground ring-border", className)}>{category.replace("MIXTE ", tr("Mixed "))}</span>;
}
const ST: Record<EventStatus, string> = {
  upcoming: "bg-muted text-muted-foreground", open: "bg-success/15 text-success ring-1 ring-success/40", closed: "bg-warning/15 text-warning ring-1 ring-warning/40",
  live: "bg-info/15 text-info ring-1 ring-info/40", completed: "bg-secondary text-secondary-foreground", cancelled: "bg-destructive/15 text-destructive ring-1 ring-destructive/40",
};
export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  const { t } = useI18n();
  return <Badge variant="outline" className={cn("border-transparent font-medium", ST[status], className)}>{status === "live" && <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-info" />}{t("status." + status)}</Badge>;
}
/** Logos de club à texte blanc : posés sur fond sombre dans les deux thèmes. */
const LIGHT_LOGOS = new Set(["mont-choisy"]);
export function ClubAvatar({ club, size = 36, className }: { club?: Club; size?: number; className?: string }) {
  if (!club) return null;
  const initials = club.name.replace(/[^A-Za-zÀ-ÿ ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return club.logo
    ? <img src={club.logo} alt={club.name} style={{ width: size, height: size }} className={cn("shrink-0 rounded-lg object-contain p-1", LIGHT_LOGOS.has(club.id) ? "bg-brand" : "bg-white", className)} />
    : <div aria-label={club.name} style={{ width: size, height: size }} className={cn("grid shrink-0 place-items-center rounded-lg bg-secondary text-xs font-bold text-secondary-foreground ring-1 ring-border", className)}>{initials}</div>;
}
export function PlayerAvatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const ini = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const hue = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return <div style={{ width: size, height: size, background: `oklch(0.42 0.09 ${hue})`, fontSize: size * 0.36 }} className={cn("grid shrink-0 place-items-center rounded-full font-semibold text-white", className)}>{ini}</div>;
}
export function SectionHeader({ eyebrow, title, action, className }: { eyebrow?: string; title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0 max-w-full">{eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}<h2 className="text-2xl font-bold sm:text-3xl">{title}</h2></div>{action}
    </div>
  );
}
export function StatCard({ label, value, hint, icon, tone }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; tone?: "default" | "warn" | "good" }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs font-medium uppercase tracking-wide">{label}</span>{icon}</div>
      <div className={cn("mt-2 text-3xl font-bold num", tone === "warn" && "text-warning", tone === "good" && "text-success")}>{value}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
export function Trend({ now, prev }: { now: number; prev: number }) {
  const d = prev - now;
  if (d === 0) return <span className="inline-flex items-center text-muted-foreground"><Minus className="size-3.5" /></span>;
  return d > 0
    ? <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success"><TrendingUp className="size-3.5" />{d}</span>
    : <span className="inline-flex items-center gap-0.5 text-xs font-medium text-destructive"><TrendingDown className="size-3.5" />{-d}</span>;
}
export function EventCard({ e, compact, hideClub }: { e: CalendarEvent; compact?: boolean; hideClub?: boolean }) {
  const club = clubById(e.club); const st = eventStatus(e);
  const [, m, day] = e.start.split("-"); const mon = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(e.start + "T00:00:00Z"));
  return (
    <Link to={`/tournaments/${e.id}`} className="group flex min-w-0 items-stretch gap-3 rounded-xl border bg-card p-3 transition hover:border-primary/60 hover:bg-accent/30 focus-visible:outline-2">
      <div className="grid w-14 shrink-0 place-items-center rounded-lg bg-secondary text-center"><div><div className="text-xl font-bold leading-none num">{day}</div><div className="mt-0.5 text-xs font-semibold uppercase text-muted-foreground">{mon}</div></div></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5"><CategoryBadge category={e.category} /><span className="break-words text-xs text-muted-foreground">{e.format.replace(" / ", " · ")}</span></div>
        {hideClub ? <p className="mt-1 text-sm font-semibold">{fmtRange(e)}</p> : <p className="mt-1 break-words font-semibold">{club?.name}</p>}
        {!compact && <p className="text-xs text-muted-foreground">{club?.locality ? club.locality + " · " : ""}{e.courts} {tr("courts ·")} {e.zone.charAt(0) + e.zone.slice(1).toLowerCase()}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between"><StatusBadge status={st} /><ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-primary" /></div>
      <span className="sr-only">{m}</span>
    </Link>
  );
}
