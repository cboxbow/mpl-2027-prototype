/**
 * CONFIGURATION CENTRALE DE LA DÉMONSTRATION — MPL 2027 DESIGN PROTOTYPE
 * ----------------------------------------------------------------------
 * Tout ce qui est « réglable » pour la démo est ici. Rien de tout cela n'est une règle officielle MPL
 * (sauf mention contraire) : ce sont des valeurs de démonstration, clairement identifiées comme telles.
 *
 * Changer la date de référence de la démo :
 *   1. depuis l'interface : menu du rôle démo → « Demo date… » ;
 *   2. via l'URL : /?demoDate=2027-05-01#/calendar ;
 *   3. en changeant DEFAULT_DEMO_TODAY ci-dessous.
 * La date est lue une seule fois au chargement (la page se recharge quand on la change).
 */
export const DEFAULT_DEMO_TODAY = "2027-03-10";
export const DEMO_DATE_STORAGE_KEY = "mpl27-demo-date";
export const DEMO_DATE_MIN = "2027-01-01";
export const DEMO_DATE_MAX = "2027-12-31";
export const isIsoDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));

function resolveDemoToday(): string {
  try {
    const q = new URLSearchParams(window.location.search).get("demoDate");
    if (isIsoDate(q)) return q;
    const s = window.localStorage.getItem(DEMO_DATE_STORAGE_KEY);
    if (isIsoDate(s)) return s;
  } catch { /* environnement sans window (tests unitaires) */ }
  return DEFAULT_DEMO_TODAY;
}
/** « Aujourd'hui » dans la démonstration. */
export const DEMO_TODAY: string = resolveDemoToday();
/** Change la date de démonstration (null = retour à la valeur par défaut) et recharge la page. */
export function setDemoToday(date: string | null) {
  try {
    if (date && isIsoDate(date) && date !== DEFAULT_DEMO_TODAY) window.localStorage.setItem(DEMO_DATE_STORAGE_KEY, date); else window.localStorage.removeItem(DEMO_DATE_STORAGE_KEY);
    const url = new URL(window.location.href); url.searchParams.delete("demoDate"); window.location.assign(url.toString()); window.location.reload();
  } catch { /* ignore */ }
}

/** Règle confirmée (revue Phase 2) : ouvert à J-21, clos à J-7 (jour du tirage). */
export const REG_OPEN_DAYS_BEFORE = 21;
export const REG_CLOSE_DAYS_BEFORE = 7;
/** Frais d'inscription — valeur DEMO, pas le tarif officiel. */
export const REG_FEE_DEMO = 900;
/** Capacité de démonstration (équipes par tableau). */
export const TEAM_CAPACITY = 20;
/** Épreuves forcées « complet » / « annulé » pour pouvoir démontrer ces états du bouton d'inscription (scénarios fictifs). */
export const DEMO_FULL_EVENTS: readonly string[] = ["USB-M500-1"];
export const DEMO_CANCELLED_EVENTS: readonly string[] = ["SPA-M25-1"];
/** Horizon (jours après aujourd'hui) au-delà duquel une épreuve « à venir » n'a pas encore d'inscrits fictifs. */
export const UPCOMING_ENTRIES_HORIZON_DAYS = 51;

/** Barème : seuls les points du vainqueur sont connus. Paliers intermédiaires = valeurs DE DÉMONSTRATION. Règle historique Top 8 inchangée. */
export const COUNTED_RESULTS = 8;
export const RANKING_WINDOW_DAYS = 365;

/** Licences fictives : date d'expiration par joueur de démo (par défaut : fin 2027). Les ids listés ont une licence expirée fin 2026. */
export const DEMO_LICENCE_EXPIRY_DEFAULT = "2027-12-31";
export const DEMO_EXPIRED_LICENCE_PLAYERS: readonly string[] = ["M9", "M21", "F6"];
export const DEMO_EXPIRED_LICENCE_DATE = "2026-12-31";

/**
 * Règles d'accès par catégorie (niveau). AUCUNE restriction officielle n'est connue : le moteur d'éligibilité sait les appliquer
 * (rang maximal requis par catégorie) mais la configuration par défaut est vide.
 * Exemple pour tester : { M1000: { maxRank: 40 } }.
 */
export const CATEGORY_ACCESS_RULES: Record<string, { maxRank?: number }> = {};

/**
 * Juniors : on conserve les règles MPL existantes (groupes U11 / U13 / U15 dans le calendrier V4).
 * Les seuils d'âge exacts ne sont PAS officiels : ils ne sont pas appliqués dans le prototype. On ne copie pas les règles FFT.
 */
export const JUNIOR_GROUPS = ["U11", "U13", "U15"] as const;
export const JUNIOR_AGE_RULE_CONFIRMED = false;
/**
 * Règles d'âge configurables (VALEURS DE DÉMONSTRATION, non officielles) : âge maximal atteint dans l'année de l'épreuve, par groupe.
 * Elles ne sont APPLIQUÉES que si JUNIOR_AGE_RULE_CONFIRMED vaut true (ou si un test fournit ses propres règles).
 */
export const JUNIOR_AGE_LIMITS: Record<(typeof JUNIOR_GROUPS)[number], number> = { U11: 11, U13: 13, U15: 15 };
export const DEMO_EVENT_YEAR = 2027;
/** Liste d'attente : promotion manuelle par l'organisateur, aucun remboursement automatique (décision Phase 4A). */
export const WAITLIST_AUTO_PROMOTE = false;
export const REFUND_AUTOMATIC = false;
/** Longueur minimale d'un motif de refus ou de désistement. */
export const REASON_MIN_LENGTH = 5;

/** Profils de démonstration pouvant être « connectés » en rôle Joueur. */
export const DEMO_PROFILES = ["M3", "F3", "JM1"] as const;
export const DEFAULT_DEMO_PLAYER = "M3";
/** Club « géré » par défaut par l'organisateur de démo. */
export const DEFAULT_ORGANIZER_CLUB = "rm-club-tamarin";
/** Base d'inscriptions fictives affichée dans l'administration. */
export const FICTIONAL_REGISTRATIONS_BASE = 214;

/* ───────── Vague B : tableaux, programmation, scores (VALEURS DE DÉMONSTRATION, pas des règles officielles MPL) ───────── */
/** Tailles de tableau proposées. */
export const DRAW_SIZES = [8, 16, 32] as const;
/** Nombre de têtes de série par taille de tableau (démo). */
export const SEEDS_BY_SIZE: Record<number, number> = { 8: 2, 16: 4, 32: 8 };
/** Programmation : durée d'un match, repos minimal d'une paire entre deux matchs, horaires d'exploitation et pas de 30 min. */
export const MATCH_DURATION_MIN = 90;
export const MIN_REST_MIN = 30;
export const PLAY_START = "08:00";
export const PLAY_END = "21:00";
export const SLOT_STEP_MIN = 30;
/** Score : meilleur des 3 sets ; le 3e set peut être un super tie-break à 10 points (démo, non officiel). */
export const SUPER_TIEBREAK_POINTS = 10;
export const MAX_SETS = 3;
