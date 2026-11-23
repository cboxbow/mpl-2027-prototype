/** Règles d'inscription de la démonstration : état du bouton, divisions autorisées, partenaires proposés, éligibilité calculée. Fonctions pures. */
import type { CalendarEvent } from "@/data/calendar.generated";
import { tr } from "@/lib/i18n";
import { CALENDAR_EVENTS } from "@/data/calendar.generated";
import { CATEGORY_ACCESS_RULES, DEMO_EVENT_YEAR, JUNIOR_AGE_LIMITS, JUNIOR_AGE_RULE_CONFIRMED, JUNIOR_GROUPS } from "@/config/demo-config";
import { DIVISION_LABEL, JUNIORS, PLAYERS, RANKING_F, RANKING_M, divisionsForEvent, displayName, type Division, type Player } from "@/data/demo";
import { eventStatus, fmtRange, type EventStatus } from "@/lib/format";
import { isFull, type EntryCtx } from "@/lib/entries";
import { baseDuplicates, dupText } from "@/lib/registration-flow";
import { isHolding, type DemoRegistration } from "@/lib/demo-state";

/** État d'inscription affiché sur le bouton : ouvert, fermé, complet, annulé (+ états de date). */
export type RegState = "open" | "closed" | "full" | "cancelled" | "upcoming" | "live" | "completed";
export function registrationState(ev: CalendarEvent, ctx: EntryCtx): RegState {
  const st: EventStatus = eventStatus(ev);
  if (st !== "open") return st;
  return divisionsForEvent(ev).every((d) => isFull(ev, d, ctx)) ? "full" : "open";
}
/** Divisions complètes d'une épreuve ouverte : pour celles-ci, l'inscription se fait sur la liste d'attente (simulée). */
export function waitlistDivisions(ev: CalendarEvent, ctx: EntryCtx): Division[] {
  return eventStatus(ev) === "open" ? divisionsForEvent(ev).filter((d) => isFull(ev, d, ctx)) : [];
}
/** Règles d'âge junior (configurables) : âge atteint dans l'année de l'épreuve ≤ limite du groupe. Les dates de naissance ne sont jamais affichées. */
export interface JuniorRules { enforced?: boolean; limits?: Record<string, number>; year?: number }
export const juniorAge = (p: Pick<Player, "ageInEventYear">, year = DEMO_EVENT_YEAR) => (p.ageInEventYear ?? 0) + (year - DEMO_EVENT_YEAR);
export const juniorAgeOk = (p: Pick<Player, "ageInEventYear" | "junior">, division: Division, rules: JuniorRules = {}) => {
  const lim = (rules.limits ?? (JUNIOR_AGE_LIMITS as Record<string, number>))[division]; return lim == null ? true : juniorAge(p, rules.year ?? DEMO_EVENT_YEAR) <= lim;
};
const RANKS = new Map<string, number>([...RANKING_M, ...RANKING_F].map((r) => [r.player.id, r.rank]));
export const rankOf = (id: string) => RANKS.get(id);

/** Divisions de l'épreuve ouvertes au profil du joueur (Hommes/Dames selon le genre, Mixte pour tout adulte, groupe junior pour le junior du groupe). */
export function allowedDivisions(ev: CalendarEvent, me: Player): Division[] {
  return divisionsForEvent(ev).filter((d) => {
    if (d === "M") return !me.junior && me.gender === "M";
    if (d === "F") return !me.junior && me.gender === "F";
    if (d === "X") return !me.junior;
    return me.junior?.group === d;
  });
}
/** Partenaires proposés : respectent la composition de paire de la division. */
export function partnerPool(division: Division, me: Player): Player[] {
  const base = (JUNIOR_GROUPS as readonly string[]).includes(division) ? JUNIORS.filter((p) => p.junior?.group === division) : PLAYERS;
  return base.filter((p) => {
    if (p.id === me.id) return false;
    if (division === "M") return p.gender === "M";
    if (division === "F") return p.gender === "F";
    if (division === "X") return p.gender !== me.gender;
    return true;
  });
}
export type CheckStatus = "pass" | "fail" | "info";
export interface Check { id: string; label: string; detail: string; status: CheckStatus }
export interface EligibilityInput { event: CalendarEvent; division: Division; me: Player; partner?: Player; registrations: DemoRegistration[]; ctx: EntryCtx; /** inscription sur la liste d'attente d'un tableau complet */ waitlist?: boolean; juniorRules?: JuniorRules }
const evById = new Map(CALENDAR_EVENTS.map((e) => [e.id, e]));
const overlap = (a: CalendarEvent, b: CalendarEvent) => a.start <= b.end && b.start <= a.end;
/** Éligibilité CALCULÉE à partir des données fictives du joueur, du partenaire, de l'épreuve et des règles de demo-config. */
export function checkEligibility({ event, division, me, partner, registrations, ctx, waitlist = false, juniorRules }: EligibilityInput): { checks: Check[]; ok: boolean } {
  const checks: Check[] = []; const push = (c: Check) => checks.push(c);
  const raw = registrationState(event, ctx); const state: RegState = raw === "full" && waitlist ? "open" : raw; const isJunior = (JUNIOR_GROUPS as readonly string[]).includes(division);
  push({ id: "window", label: tr("Registration window"), status: state === "open" ? "pass" : "fail", detail: state === "open" ? tr("Registration is open (J-21 to J-7).") : state === "full" ? tr("The draw is full.") : state === "cancelled" ? tr("This event is cancelled (demo scenario).") : state === "closed" ? tr("Registration is closed.") : state === "upcoming" ? tr("Registration has not opened yet.") : tr("The event has started or is over.") });
  const full = isFull(event, division, ctx);
  push({ id: "full", label: tr("Places available"), status: full ? (waitlist ? "info" : "fail") : "pass", detail: full ? (waitlist ? `The ${DIVISION_LABEL[division]} draw is full — your pair will join the waiting list.` : `The ${DIVISION_LABEL[division]} draw is full.`) : `Places remain in the ${DIVISION_LABEL[division]} draw.` });
  if (partner) {
    const pairOk = division === "M" ? me.gender === "M" && partner.gender === "M" && !me.junior && !partner.junior
      : division === "F" ? me.gender === "F" && partner.gender === "F" && !me.junior && !partner.junior
      : division === "X" ? me.gender !== partner.gender && !me.junior && !partner.junior
      : me.junior?.group === division && partner.junior?.group === division;
    const rule = division === "M" ? "two men" : division === "F" ? "two women" : division === "X" ? "one man and one woman" : `two ${division} juniors`;
    push({ id: "pair", label: tr("Pair composition"), status: pairOk ? "pass" : "fail", detail: pairOk ? `Pair is valid for ${DIVISION_LABEL[division]} (${rule}).` : `${DIVISION_LABEL[division]} requires ${rule}.` });
    for (const p of [me, partner]) { const ok = p.licenceExpiry >= event.end; push({ id: "licence-" + p.id, label: `Licence — ${displayName(p)}`, status: ok ? "pass" : "fail", detail: ok ? `Valid until ${p.licenceExpiry} (covers the event).` : `Expired on ${p.licenceExpiry}.` }); }
    const dup = registrations.find((r) => isHolding(r) && r.eventId === event.id && (r.playerId === me.id || r.partnerId === me.id || r.playerId === partner.id || r.partnerId === partner.id));
    push({ id: "dup", label: tr("Not already registered"), status: dup ? "fail" : "pass", detail: dup ? `A registration (${dup.id}) already exists for this event.` : tr("No existing registration for this event.") });
    // 5B-5 : doublon avec la base d'inscrits (information, non bloquant : les contrôles d'éligibilité existants restent inchangés).
    const bd = baseDuplicates(event, division, [me, partner], ctx); if (bd.length) push({ id: "dup-base", label: tr("Possible duplicate in the registered pairs"), status: "info", detail: bd.map((d) => dupText(d, division)).join(" ") });
    const conflict = registrations.filter((r) => isHolding(r) && r.eventId !== event.id && [me.id, partner.id].some((id) => r.playerId === id || r.partnerId === id)).map((r) => ({ r, e: evById.get(r.eventId) })).find((x) => x.e && overlap(x.e, event));
    push({ id: "conflict", label: tr("No schedule conflict"), status: conflict ? "fail" : "pass", detail: conflict?.e ? `Conflicts with ${conflict.r.eventId} (${fmtRange(conflict.e)}).` : tr("No overlapping registration for either player.") });
    const rule2 = CATEGORY_ACCESS_RULES[event.category];
    if (rule2?.maxRank) { const rk = [me, partner].map((p) => rankOf(p.id) ?? 999); const ok = rk.every((x) => x <= rule2.maxRank!); push({ id: "level", label: tr("Level for this category"), status: ok ? "pass" : "fail", detail: ok ? `Both players ranked within the top ${rule2.maxRank}.` : `Requires rank ≤ ${rule2.maxRank} for both players.` }); }
    else push({ id: "level", label: tr("Level for this category"), status: "info", detail: tr("No ranking-based access rule is configured in this prototype.") });
  }
  if (isJunior) {
    const enforced = juniorRules?.enforced ?? JUNIOR_AGE_RULE_CONFIRMED;
    if (!enforced || !partner) push({ id: "junior", label: tr("Junior age rule"), status: "info", detail: tr("Existing MPL groups (U11 / U13 / U15) are kept; exact age thresholds are to be confirmed and are not enforced here.") });
    else { const ok = [me, partner].every((p) => juniorAgeOk(p, division, juniorRules)); push({ id: "junior", label: tr("Junior age rule"), status: ok ? "pass" : "fail", detail: ok ? `Both players meet the ${division} age rule (demo value).` : `At least one player is over the ${division} age limit (demo value).` }); }
  }
  return { checks, ok: checks.every((c) => c.status !== "fail") };
}
