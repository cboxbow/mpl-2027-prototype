/** DONNÉES FICTIVES DE DÉMONSTRATION — générées de façon déterministe. Jamais mélangées aux résultats officiels. */
import { CALENDAR_EVENTS, type CalendarEvent } from "./calendar.generated";
import { tr } from "@/lib/i18n";
import { CLUBS } from "./clubs";
import { DEMO_TODAY, eventStatus, shiftDate } from "@/lib/format";
import { COUNTED_RESULTS, DEFAULT_DEMO_PLAYER, JUNIOR_AGE_LIMITS, DEFAULT_ORGANIZER_CLUB, DEMO_EXPIRED_LICENCE_DATE, DEMO_EXPIRED_LICENCE_PLAYERS, DEMO_FULL_EVENTS, DEMO_LICENCE_EXPIRY_DEFAULT, RANKING_WINDOW_DAYS, REG_FEE_DEMO, TEAM_CAPACITY, UPCOMING_ENTRIES_HORIZON_DAYS, type JUNIOR_GROUPS } from "@/config/demo-config";

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const hash = (str: string) => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const MEN = ["Aurélien", "Mathis", "Kevin", "Yannick", "Anish", "Jérémy", "Rishi", "Dylan", "Sébastien", "Nicolas", "Vikash", "Julien", "Brandon", "Loïc", "Teddy", "Axel", "Ryan", "Damien", "Kishan", "Olivier", "Steven", "Hugo", "Mikael", "Jordan", "Eddy", "Samuel", "Pravin", "Thomas"];
const WOMEN = ["Camille", "Sarah", "Priya", "Océane", "Laura", "Anaïs", "Shreya", "Manon", "Julie", "Kelly", "Nadia", "Elise", "Jade", "Clara", "Roshni", "Inès", "Maëlle", "Sophie", "Anouk", "Tania"];
const SUR = ["Valmont", "Ramsamy", "Dufresne", "Beeharry", "Lagesse", "Pitot", "Soobrayen", "Arnaud", "Gopaul", "Marchand", "Hurry", "Bhugeloo", "Rivet", "Seewoo", "Antoine", "Lepoigneur", "Doorgakant", "Fontaine", "Mootoo", "Savrimootoo", "Cassim", "Ducasse", "Ragoo", "Laurent", "Jhugroo", "Perrine", "Lecordier", "Naidoo"];

export type JuniorGroup = (typeof JUNIOR_GROUPS)[number];
/** Division d'une épreuve : Hommes, Dames, Mixte (1 homme + 1 femme), ou groupe junior. */
export type Division = "M" | "F" | "X" | JuniorGroup;
export interface Player { id: string; first: string; last: string; name: string; gender: "M" | "F"; clubId: string; licence: string; birth: number; licenceExpiry: string; junior?: { group: JuniorGroup }; /** Juniors fictifs : âge atteint dans l'année de l'épreuve, utilisé UNIQUEMENT par la règle d'âge configurable ; jamais affiché. */ ageInEventYear?: number; }
/** Affichage limité pour les juniors (profils fictifs) : prénom + initiale du nom, sans licence ni date de naissance. */
/** Libellé court (tableaux, plannings) : nom de famille, ou initiales pour un junior. */
export const shortLabel = (p: Pick<Player, "last" | "first" | "junior">) => (p.junior ? `${p.first[0]}.${p.last[0]}.` : p.last);
export const displayName = (p: Pick<Player, "first" | "last" | "name" | "junior">) => (p.junior ? `${p.first} ${p.last[0]}.` : p.name);
function mkPlayers(): Player[] {
  const r = rng(2027); const out: Player[] = []; const clubs = CLUBS.map((c) => c.id);
  const add = (list: string[], g: "M" | "F", n: number) => {
    for (let i = 0; i < n; i++) {
      const first = list[i % list.length]; const last = SUR[(i * 7 + (g === "F" ? 3 : 0) + Math.floor(r() * 9)) % SUR.length];
      out.push({ id: `${g}${i + 1}`, first, last, name: `${first} ${last}`, gender: g, clubId: clubs[Math.floor(r() * clubs.length)], licence: `DEMO-${g}${String(1000 + i * 7 + (g === "F" ? 300 : 0))}`, birth: 1972 + Math.floor(r() * 32), licenceExpiry: DEMO_EXPIRED_LICENCE_PLAYERS.includes(`${g}${i + 1}`) ? DEMO_EXPIRED_LICENCE_DATE : DEMO_LICENCE_EXPIRY_DEFAULT });
    }
  };
  add(MEN, "M", 56); add(WOMEN, "F", 40);
  // dédoublonnage de noms
  const seen = new Set<string>(); out.forEach((p, i) => { while (seen.has(p.name)) { p.last = SUR[(SUR.indexOf(p.last) + 1) % SUR.length]; p.name = `${p.first} ${p.last}`; } seen.add(p.name); void i; });
  return out;
}
/** Joueurs adultes fictifs (classements, résultats, tableaux Hommes / Dames / Mixte). */
export const PLAYERS: Player[] = mkPlayers();
const JFIRST_M = ["Léo", "Noah", "Ethan", "Tom", "Liam", "Enzo", "Adam", "Naël", "Lucas", "Kyan", "Evan", "Yanis"];
const JFIRST_F = ["Léa", "Mila", "Zoé", "Emma", "Lina", "Maya", "Alicia", "Inaya", "Chloé", "Jade", "Nina", "Aya"];
const JLAST = ["Maurel", "Patel", "Henri", "Bissoon", "Carrère", "Dupré", "Ramdin", "Lebon", "Joly", "Coupet", "Nunkoo", "Tellier"];
/** Juniors FICTIFS : groupes U11 / U13 / U15 du calendrier V4 (4 garçons + 4 filles par groupe). Jamais dans les classements. */
function mkJuniors(): Player[] {
  const groups: JuniorGroup[] = ["U11", "U13", "U15"]; const clubs = CLUBS.map((c) => c.id); const r = rng(1999); const out: Player[] = [];
  for (let n = 1; n <= 12; n++) for (const g of ["M", "F"] as const) {
    const group = groups[Math.floor((n - 1) / 4)]; const first = (g === "M" ? JFIRST_M : JFIRST_F)[n - 1]; const last = JLAST[(n * 5 + (g === "F" ? 3 : 0)) % JLAST.length];
    out.push({ id: `J${g}${n}`, first, last, name: `${first} ${last}`, gender: g, clubId: clubs[Math.floor(r() * clubs.length)], licence: `DEMO-J${g}${n}`, birth: 0, ageInEventYear: JUNIOR_AGE_LIMITS[group] - ((n + (g === "F" ? 1 : 0)) % 3), licenceExpiry: DEMO_LICENCE_EXPIRY_DEFAULT, junior: { group } });
  }
  return out;
}
export const JUNIORS: Player[] = mkJuniors();
const BY_ID = new Map([...PLAYERS, ...JUNIORS].map((p) => [p.id, p]));
export const playerById = (id: string) => BY_ID.get(id);
/** Profil « connecté » par défaut en rôle Joueur (modifiable dans le menu démo). */
export const DEMO_PLAYER_ID = DEFAULT_DEMO_PLAYER;
/** Club « géré » par défaut par l'organisateur de démo. */
export const DEMO_ORGANIZER_CLUB = DEFAULT_ORGANIZER_CLUB;

/** Barème démo : seuls les points du vainqueur sont connus ; les paliers intermédiaires sont des valeurs DE DÉMONSTRATION. */
export const WINNER_POINTS: Record<string, number | null> = { M25: 25, M50: 50, M100: 100, M250: 250, M500: 500, M1000: 1000, M1500: null, "MIXTE 250": null, "MIXTE 500": null, JUNIOR: null };
export const ROUND_RATIO: Record<string, number> = { W: 1, F: 0.7, SF: 0.45, QF: 0.25 };
export const ROUND_LABEL: Record<string, string> = { W: tr("Winner"), F: tr("Final"), SF: tr("Semi-final"), QF: tr("Quarter-final") };

export interface Placement { round: "W" | "F" | "SF" | "QF"; pair: [string, string]; points: number }
export interface DrawResult { eventId: string; draw: "M" | "F"; placements: Placement[] }
const isPoints = (c: string) => WINNER_POINTS[c] != null;
export const isRankedEvent = (e: CalendarEvent) => isPoints(e.category);
const draws = (e: CalendarEvent): Array<"M" | "F"> => (e.format === "HOMMES / DAMES" ? ["M", "F"] : e.format === "HOMMES" ? ["M"] : []);

function buildResult(e: CalendarEvent, g: "M" | "F"): DrawResult {
  const r = rng(hash(e.id + g)); const pool = PLAYERS.filter((p) => p.gender === g);
  // niveau d'épreuve : les meilleurs joueurs jouent plus souvent les M250+
  const shuffled = [...pool].map((p, i) => ({ p, k: r() + (i < 14 && WINNER_POINTS[e.category]! >= 250 ? 0.6 : 0) })).sort((a, b) => b.k - a.k).slice(0, 16).map((x) => x.p);
  const rounds: Placement["round"][] = ["W", "F", "SF", "SF", "QF", "QF", "QF", "QF"];
  const win = WINNER_POINTS[e.category]!;
  const placements: Placement[] = rounds.map((round, i) => ({ round, pair: [shuffled[i * 2].id, shuffled[i * 2 + 1].id], points: Math.round(win * ROUND_RATIO[round]) }));
  return { eventId: e.id, draw: g, placements };
}
export const COMPLETED_EVENTS = CALENDAR_EVENTS.filter((e) => eventStatus(e) === "completed");
export const DRAW_RESULTS: DrawResult[] = COMPLETED_EVENTS.filter(isRankedEvent).flatMap((e) => draws(e).map((g) => buildResult(e, g)));
export const resultsForEvent = (id: string) => DRAW_RESULTS.filter((d) => d.eventId === id);

export interface PlayerResult { eventId: string; round: Placement["round"]; points: number; date: string; partner: string; counted: boolean }
export interface RankingRow { rank: number; player: Player; points: number; played: number; counted: number; wins: number; results: PlayerResult[]; prevRank: number }
const eventById = new Map(CALENDAR_EVENTS.map((e) => [e.id, e]));
/** Règle MPL : fenêtre glissante 12 mois, les 8 meilleurs résultats comptent (Top 8). Valeur dans demo-config. */
export { COUNTED_RESULTS };
export function buildRanking(g: "M" | "F", asOf = DEMO_TODAY): RankingRow[] {
  const by = new Map<string, PlayerResult[]>();
  for (const d of DRAW_RESULTS.filter((x) => x.draw === g)) {
    const ev = eventById.get(d.eventId)!; if (ev.end > asOf || ev.end <= shift(asOf, -RANKING_WINDOW_DAYS)) continue;
    for (const pl of d.placements) for (let i = 0; i < 2; i++) {
      const id = pl.pair[i]; const partner = pl.pair[1 - i];
      (by.get(id) ?? by.set(id, []).get(id)!).push({ eventId: d.eventId, round: pl.round, points: pl.points, date: ev.end, partner, counted: false });
    }
  }
  const rows = [...by.entries()].map(([id, res]) => {
    const sorted = [...res].sort((a, b) => b.points - a.points || b.date.localeCompare(a.date));
    sorted.forEach((x, i) => (x.counted = i < COUNTED_RESULTS));
    const pts = sorted.slice(0, COUNTED_RESULTS).reduce((s, x) => s + x.points, 0);
    return { player: playerById(id)!, points: pts, played: res.length, counted: Math.min(COUNTED_RESULTS, res.length), wins: res.filter((x) => x.round === "W").length, results: sorted };
  }).sort((a, b) => b.points - a.points || a.player.name.localeCompare(b.player.name));
  // classement précédent = on retire le dernier tournoi (pour la tendance)
  const prev = prevRanks(g, asOf);
  return rows.map((r, i) => ({ ...r, rank: i + 1, prevRank: prev.get(r.player.id) ?? i + 1 }));
}
function shift(d: string, days: number) { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + days); return x.toISOString().slice(0, 10); }
const prevCache = new Map<string, Map<string, number>>();
function prevRanks(g: "M" | "F", asOf: string) {
  const key = g + asOf; if (prevCache.has(key)) return prevCache.get(key)!;
  const cutoff = shift(asOf, -14); const by = new Map<string, number[]>();
  for (const d of DRAW_RESULTS.filter((x) => x.draw === g)) { const ev = eventById.get(d.eventId)!; if (ev.end > cutoff) continue; for (const pl of d.placements) for (const id of pl.pair) (by.get(id) ?? by.set(id, []).get(id)!).push(pl.points); }
  const rows = [...by.entries()].map(([id, p]) => [id, p.sort((a, b) => b - a).slice(0, COUNTED_RESULTS).reduce((s, x) => s + x, 0)] as const).sort((a, b) => b[1] - a[1]);
  const m = new Map(rows.map(([id], i) => [id, i + 1])); prevCache.set(key, m); return m;
}
export const RANKING_M = buildRanking("M"); export const RANKING_F = buildRanking("F");

/** Divisions proposées par une épreuve (format du calendrier V4). */
export function divisionsForEvent(e: Pick<CalendarEvent, "category" | "format">): Division[] {
  if (e.category === "JUNIOR") return ["U11", "U13", "U15"];
  if (e.format === "MIXTE" || e.category.startsWith("MIXTE")) return ["X"];
  if (e.format === "HOMMES / DAMES") return ["M", "F"];
  return ["M"];
}
export const DIVISION_LABEL: Record<Division, string> = { M: tr("Men"), F: tr("Women"), X: tr("Mixed"), U11: tr("Junior U11"), U13: tr("Junior U13"), U15: tr("Junior U15") };
export interface EntryPair { a: Player; b: Player; status: "confirmed" | "pending" | "waitlist" }
const ENTRY_CACHE = new Map<string, EntryPair[]>();
/** Participants FICTIFS pour les épreuves ouvertes / à venir (déterministes). Les inscriptions de la démo s'y ajoutent via lib/entries.ts. */
export function entriesForEvent(e: CalendarEvent, division: Division = "M"): EntryPair[] {
  const key = e.id + "|" + division + "|" + DEMO_TODAY; const hit = ENTRY_CACHE.get(key); if (hit) return hit;
  const st = eventStatus(e); let out: EntryPair[] = [];
  if (st !== "cancelled" && !(st === "upcoming" && e.start > shiftDate(DEMO_TODAY, UPCOMING_ENTRIES_HORIZON_DAYS))) {
    const r = rng(hash("entries" + e.id + division)); const forceFull = DEMO_FULL_EVENTS.includes(e.id);
    const n = forceFull ? TEAM_CAPACITY : st === "upcoming" ? 4 + Math.floor(r() * 6) : st === "open" ? 8 + Math.floor(r() * 10) : 16 + Math.floor(r() * 4);
    const stat = (): EntryPair["status"] => (forceFull ? "confirmed" : r() < 0.82 ? "confirmed" : r() < 0.7 ? "pending" : "waitlist");
    const shuffle = (xs: Player[]) => [...xs].sort(() => r() - 0.5);
    const pairs: EntryPair[] = [];
    if (division === "M" || division === "F") {
      const picks = shuffle(PLAYERS.filter((p) => p.gender === division)).slice(0, Math.min(n * 2, 40));
      for (let i = 0; i + 1 < picks.length; i += 2) pairs.push({ a: picks[i], b: picks[i + 1], status: stat() });
      const rank = new Map((division === "M" ? RANKING_M : RANKING_F).map((x) => [x.player.id, x.rank]));
      pairs.sort((x, y) => Math.min(rank.get(x.a.id) ?? 999, rank.get(x.b.id) ?? 999) - Math.min(rank.get(y.a.id) ?? 999, rank.get(y.b.id) ?? 999));
    } else if (division === "X") {
      const m = shuffle(PLAYERS.filter((p) => p.gender === "M")); const f = shuffle(PLAYERS.filter((p) => p.gender === "F"));
      for (let i = 0; i < Math.min(n, m.length, f.length); i++) pairs.push({ a: m[i], b: f[i], status: stat() });
    } else {
      const pool = shuffle(JUNIORS.filter((p) => p.junior?.group === division));
      for (let i = 0; i + 1 < pool.length && i / 2 < n; i += 2) pairs.push({ a: pool[i], b: pool[i + 1], status: stat() });
    }
    out = pairs;
  }
  ENTRY_CACHE.set(key, out); return out;
}
export { REG_FEE_DEMO, TEAM_CAPACITY };
export const eventsByStatus = (s: ReturnType<typeof eventStatus>) => CALENDAR_EVENTS.filter((e) => eventStatus(e) === s);
export { DEMO_TODAY };
