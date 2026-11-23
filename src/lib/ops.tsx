import { useMemo, type ReactNode } from "react";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { useDemo } from "@/lib/demo-store";
import { OPS_ROLES, scopedEventIds, type Role } from "@/lib/permissions";
import { tr } from "@/lib/i18n";
import { Gate } from "@/pages/player/Dashboard";

/** Accès aux écrans d'opérations de tournoi (inscriptions, tableaux, scores) selon le rôle et le périmètre de démonstration. */
export function OpsAccess({ children, noReferee = false }: { children: ReactNode; noReferee?: boolean }) {
  const { role, setRole, organizerClub, refereeId, assignments } = useDemo();
  const ids = useMemo(() => scopedEventIds(role, { clubId: organizerClub, refereeId, assignments }), [role, organizerClub, refereeId, assignments]);
  const okRole = OPS_ROLES.includes(role as Role) && !(noReferee && role === "referee");
  if (!okRole) return <Gate onSwitch={() => setRole("organizer")} label={tr("organizer")} />;
  if (ids.length === 0) return <div className="container-mpl py-10 text-center" data-no-scope><p className="font-semibold">{tr("No tournament in your scope")}</p><p className="mt-1 text-sm text-muted-foreground">{role === "referee" ? tr("No tournament is assigned to this referee. MPL administration assigns referees.") : tr("This club has no tournament yet.")}</p></div>;
  return <>{children}</>;
}
/** Événements du périmètre courant. */
export function useScopedEvents() {
  const { role, organizerClub, refereeId, assignments } = useDemo();
  return useMemo(() => { const s = new Set(scopedEventIds(role, { clubId: organizerClub, refereeId, assignments })); return CALENDAR_EVENTS.filter((e) => s.has(e.id)); }, [role, organizerClub, refereeId, assignments]);
}
