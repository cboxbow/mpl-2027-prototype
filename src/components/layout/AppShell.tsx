import { NavLink, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Gavel, Swords, CalendarDays, Home, LayoutDashboard, Moon, RotateCcw, Shield, Sun, Trophy, UserRound, Building2, Languages, ChevronDown, MapPin } from "lucide-react";
import { Logo, DemoBadge } from "@/components/mpl/bits";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/theme";
import { useI18n, tr } from "@/lib/i18n";
import { useDemo, type Role } from "@/lib/demo-store";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { DEFAULT_DEMO_TODAY, DEMO_DATE_MAX, DEMO_DATE_MIN, DEMO_PROFILES, DEMO_TODAY, isIsoDate, setDemoToday } from "@/config/demo-config";
import { displayName, playerById } from "@/data/demo";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { documentTitle } from "@/lib/page-title";

/** Libellés courts de la barre mobile (≤ 10 caractères) : évitent le débordement à 320 px (audit U-05). */
const SHORT: Record<string, { en: string; fr: string }> = { "/rankings": { en: "Ranking", fr: "Classement" }, "/organizer": { en: "Organizer", fr: "Organis." }, "/admin": { en: "Admin", fr: "Admin" }, "/club": { en: "Club", fr: "Club" }, "/referee": { en: "Referee", fr: "Arbitre" } };

/** Dernière route annoncée : au premier affichage le focus reste en haut de page, ensuite il suit la navigation (WCAG 2.4.3). */
let lastAnnounced: string | null = null;

const ROLE_ICON = { visitor: Home, player: UserRound, organizer: Building2, admin: Shield, club_admin: Building2, club_staff: Building2, director: Trophy, referee: Gavel } as const;
const ROLE_HOME: Record<Role, string> = { visitor: "/", player: "/player", organizer: "/organizer", admin: "/admin", club_admin: "/club", club_staff: "/club", director: "/club", referee: "/referee" };
const MENU_ROLES: Role[] = ["visitor", "player", "organizer", "club_admin", "club_staff", "director", "referee", "admin"];

export default function AppShell() {
  const { theme, toggle } = useTheme(); const { t, lang, setLang } = useI18n(); const { role, setRole, reset, playerId, setPlayer } = useDemo(); const loc = useLocation(); const navigate = useNavigate(); const [dateOpen, setDateOpen] = useState(false); const [resetOpen, setResetOpen] = useState(false); const [dateVal, setDateVal] = useState(DEMO_TODAY);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  const mgmt = ["club_admin", "club_staff", "director", "admin"].includes(role);
  type NavItem = { to: string; label: string; short?: string; icon: typeof Home; end?: boolean; desktopOnly?: boolean };
  const links: NavItem[] = [
    { to: "/", label: t("nav.home"), icon: Home, end: true }, { to: "/calendar", label: t("nav.calendar"), icon: CalendarDays },
    { to: "/rankings", label: t("nav.rankings"), icon: Trophy },
    // 5B-2 : annuaire public des clubs (menu bureau ; sur mobile, accessible depuis l'accueil et le pied de page — la barre reste à 5 entrées).
    { to: "/clubs", label: tr("Clubs"), icon: MapPin, desktopOnly: true },
    // 5B-1 (U-01) : le portail Interclub public est directement accessible ; les rôles de gestion gardent « Interclub » (gestion) et gagnent un lien public sur grand écran.
    ...(!mgmt ? [{ to: "/interclub-public", label: t("nav.interclub"), icon: Swords }] : []),
    ...(role === "player" ? [{ to: "/player", label: t("nav.player"), icon: UserRound }] : []),
    ...(role === "organizer" ? [{ to: "/organizer", label: t("nav.organizer"), icon: Building2 }] : []),
    ...(["club_admin", "club_staff", "director"].includes(role) ? [{ to: "/club", label: t("nav.club"), icon: Building2 }] : []),
    ...(mgmt ? [{ to: "/interclub", label: t("nav.interclub"), icon: Swords }, { to: "/interclub-public", label: tr("Public Interclub"), icon: Swords, desktopOnly: true }] : []),
    ...(role === "referee" ? [{ to: "/referee", label: t("nav.referee"), icon: Gavel }] : []),
    ...(role === "admin" ? [{ to: "/admin", label: t("nav.admin"), icon: LayoutDashboard }] : []),
  ];
  const mobileLinks = links.filter((l) => !l.desktopOnly);
  const shortLabel = (l: NavItem) => SHORT[l.to]?.[lang] ?? l.label;
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { document.title = documentTitle(loc.pathname); }, [loc.pathname, lang]);
  useEffect(() => {
    const first = lastAnnounced === null; lastAnnounced = loc.pathname; if (first) return;
    let tries = 0; const id = window.setInterval(() => { // les pages sont chargées à la demande : on attend leur H1
      const h1 = mainRef.current?.querySelector("h1"); tries++;
      if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); window.clearInterval(id); } else if (tries > 30) window.clearInterval(id);
    }, 50);
    return () => window.clearInterval(id);
  }, [loc.pathname]);
  const RoleIcon = ROLE_ICON[role];
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus({ preventScroll: false }); mainRef.current?.scrollIntoView(); }} className="fixed left-3 top-3 z-[100] inline-flex min-h-11 -translate-y-[200%] items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg focus:translate-y-0" data-skip-link>{tr("Skip to main content")}</a>
      <div role="note" className="bg-[oklch(0.84_0.14_85)] text-[oklch(0.2_0.04_85)]">
        <div className="container-mpl flex flex-wrap items-center justify-center gap-x-3 py-1.5 text-center text-xs font-bold tracking-wide">
          <span>{t("banner")}</span><span className="font-medium">{tr("· Demo date:")} {fmtDate(DEMO_TODAY, { day: "numeric", month: "short", year: "numeric" })}</span><span className="hidden font-medium md:inline">· {t("banner.sub")}</span>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-lg">
        <div className="container-mpl flex h-16 items-center gap-2 lg:gap-3">
          <Link to="/" aria-label={tr("MPL 2027 home")} className="flex items-center gap-2"><Logo className="h-10" /></Link>
          <nav className="ml-1 hidden items-center gap-0.5 md:flex lg:ml-4 lg:gap-1" aria-label={tr("Main")}>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn("rounded-lg px-2 py-2 text-sm lg:px-3 font-medium transition", l.desktopOnly && "hidden lg:block", isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>{l.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2" aria-label={tr("Switch demo role")}><RoleIcon className="size-4" /><span className="hidden sm:inline">{t("role." + role)}</span><ChevronDown className="size-3.5 opacity-60" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex items-center justify-between">{tr("Demo role")} <DemoBadge /></DropdownMenuLabel>
                <DropdownMenuSeparator />
                {MENU_ROLES.map((r) => { const I = ROLE_ICON[r]; return (
                  <DropdownMenuItem key={r} onSelect={() => { setRole(r); const home = ROLE_HOME[r]; if (home !== loc.pathname) navigate(home); toast.success(`${tr("Role:")} ${t("role." + r)}`); }} className={cn(role === r && "bg-accent")}><I className="mr-2 size-4" />{t("role." + r)}</DropdownMenuItem>
                ); })}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{tr("Demo player profile")}</DropdownMenuLabel>
                {DEMO_PROFILES.map((id) => { const p = playerById(id)!; return <DropdownMenuItem key={id} onSelect={() => { setPlayer(id); toast.success(`${tr("Player profile:")} ${displayName(p)}`); }} className={cn(playerId === id && "bg-accent")}><UserRound className="mr-2 size-4" />{displayName(p)}<span className="ml-auto text-xs text-muted-foreground">{p.junior ? `Junior ${p.junior.group}` : p.gender === "M" ? tr("Men") : tr("Women")}</span></DropdownMenuItem>; })}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => { setDateVal(DEMO_TODAY); setDateOpen(true); }}><CalendarDays className="mr-2 size-4" />{tr("Demo date…")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setResetOpen(true)} data-reset-demo><RotateCcw className="mr-2 size-4" />{tr("Reset demo data")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* 5B-3 : accès mobile direct à l'annuaire des clubs (la barre du bas reste à 5 entrées) */}
            <Button variant="ghost" size="icon" asChild className="md:hidden"><Link to="/clubs" aria-label={tr("Clubs")} data-mobile-clubs><MapPin className="size-4" /></Link></Button>
            <Button variant="ghost" size="icon" onClick={() => setLang(lang === "en" ? "fr" : "en")} aria-label={tr("Language")}><Languages className="size-4" /><span className="sr-only">{lang}</span></Button>
            <span className="hidden text-xs font-semibold uppercase text-muted-foreground lg:inline" aria-hidden="true">{lang}</span>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label={tr("Toggle theme")}>{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button>
          </div>
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none pb-[calc(var(--mobile-nav-h)+1rem)] md:pb-0"><Outlet /></main>
      <Footer />
      <nav aria-label={tr("Mobile")} className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
        <ul className="grid h-16" style={{ gridTemplateColumns: `repeat(${mobileLinks.length}, minmax(0,1fr))` }}>
          {mobileLinks.map((l) => (
            <li key={l.to}><NavLink to={l.to} end={l.end} className={({ isActive }) => cn("flex h-16 flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[11px] font-medium leading-tight", isActive ? "text-primary" : "text-muted-foreground")}><l.icon className="size-5" aria-hidden="true" /><span>{shortLabel(l)}</span></NavLink></li>
          ))}
        </ul>
      </nav>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}><DialogContent className="sm:max-w-md" data-reset-dialog><DialogHeader><DialogTitle>{tr("Reset demo data?")}</DialogTitle><DialogDescription>{tr("This erases the registrations, scores, notifications, preferences and audit entries created in this browser during the demo, and restores the initial fictional data. Nothing outside this browser is affected.")}</DialogDescription></DialogHeader>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setResetOpen(false)}>{tr("Cancel")}</Button><Button variant="destructive" onClick={() => { reset(); setResetOpen(false); navigate("/"); toast(tr("Demo data reset")); }}>{tr("Reset")}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={dateOpen} onOpenChange={setDateOpen}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>{tr("Demo date")}</DialogTitle><DialogDescription>{tr("The reference “today” of the prototype. It drives registration windows (J-21 / J-7), statuses, results and rankings. Default:")} {fmtDate(DEFAULT_DEMO_TODAY, { day: "numeric", month: "long", year: "numeric" })}{tr(". The page reloads.")}</DialogDescription></DialogHeader>
        <div><Label htmlFor="demo-date" className="mb-1.5 block">{tr("Date")}</Label><Input id="demo-date" type="date" min={DEMO_DATE_MIN} max={DEMO_DATE_MAX} value={dateVal} onChange={(e) => setDateVal(e.target.value)} /></div>
        <DialogFooter className="gap-2"><Button variant="ghost" onClick={() => setDemoToday(null)}>{tr("Reset to default")}</Button><Button disabled={!isIsoDate(dateVal) || dateVal < DEMO_DATE_MIN || dateVal > DEMO_DATE_MAX} onClick={() => setDemoToday(dateVal)}>{tr("Apply")}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
function Footer() {
  return (
    <footer className="border-t bg-card/50">
      <div className="container-mpl grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div><span className="inline-flex rounded-lg bg-white px-3 py-2" data-footer-logo data-footer-federation-logo><img src="/assets/brand/padel-federation-mpl.png" alt="Padel Federation × Mauritius Padel League" className="h-14 w-auto" /></span><p className="mt-3 max-w-sm text-sm text-muted-foreground">{tr("Mauritius Padel League, under the aegis of the Padel Federation.")}</p></div>
        <div className="text-sm"><p className="mb-2 font-semibold">{tr("Platform")}</p><ul className="text-muted-foreground"><li><Link className="inline-flex min-h-11 items-center hover:text-foreground" to="/calendar">{tr("Calendar 2027")}</Link></li><li><Link className="inline-flex min-h-11 items-center hover:text-foreground" to="/rankings">{tr("Rankings")}</Link></li><li><Link className="inline-flex min-h-11 items-center hover:text-foreground" to="/clubs">{tr("Clubs")}</Link></li><li><Link className="inline-flex min-h-11 items-center hover:text-foreground" to="/interclub-public">{tr("Interclub portal")}</Link></li></ul></div>
        <div className="text-sm"><p className="mb-2 font-semibold">{tr("About this prototype")}</p><p className="text-muted-foreground"><strong className="text-foreground">{tr("MPL 2027 — DESIGN PROTOTYPE.")}</strong> {tr("Visual design prototype. All players, results, rankings and fees are")} <strong className="text-foreground">{tr("fictional")}</strong> {tr("and never to be mixed with official MPL results. Calendar and club names follow calendar V4.")}</p></div>
      </div>
    </footer>
  );
}
export { ROLE_HOME };
