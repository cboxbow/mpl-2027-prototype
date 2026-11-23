/**
 * MOTEUR ILLUSTRATIF DES TABLEAUX, DE LA PROGRAMMATION ET DES SCORES — MPL 2027 DESIGN PROTOTYPE.
 * Fonctions pures, sans réseau. Ce n'est PAS le moteur de tirage réglementaire MPL : placement des têtes de série et tirage
 * sont des simulations déterministes, clairement présentées comme telles dans l'interface.
 */
import { DRAW_SIZES, MATCH_DURATION_MIN, MAX_SETS, MIN_REST_MIN, PLAY_END, PLAY_START, SEEDS_BY_SIZE, SLOT_STEP_MIN, SUPER_TIEBREAK_POINTS } from "@/config/demo-config";

export type Slot = { t: "team"; key: string } | { t: "bye" } | { t: "winner"; m: string } | { t: "loser"; m: string } | { t: "group"; g: number; pos: number } | { t: "tbd" };
export type MatchKind = "qual" | "group" | "main" | "placement";
export interface DMatch { id: string; kind: MatchKind; round: string; roundIdx: number; order: number; a: Slot; b: Slot; group?: number; label: string }
export type DrawFormat = "knockout" | "groups";
export type Placement = "none" | "third" | "classification";
export interface DrawConfig { eventId: string; division: string; format: DrawFormat; size: number; placement: Placement; seeds: string[]; entries: string[]; nonce: number; published?: boolean; publishedAt?: string; createdAt: string; provisional?: boolean; stage?: DrawStage; grant?: string }
/** Cycle de publication : brouillon → prêt à publier → publié → verrouillé. */
export type DrawStage = "draft" | "ready" | "published" | "locked";
export const stageOf = (c: Pick<DrawConfig, "stage" | "published">): DrawStage => c.stage ?? (c.published ? "published" : "draft");
export interface Built { matches: DMatch[]; positions: (string | null)[]; qualifiers: number; seedCount: number; groups: string[][]; error?: string }

/* ───────── utilitaires ───────── */
const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const shuffled = <T,>(xs: T[], seed: string): T[] => { const r = rng(hashStr(seed)); const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** Ordre standard d'un tableau d'élimination : valeurs de 1 à n (1 en haut, 2 en bas, 3-4 dans des quarts opposés…). */
export const bracketOrder = (n: number): number[] => (n <= 1 ? [1] : n === 2 ? [1, 2] : bracketOrder(n / 2).flatMap((s) => [s, n + 1 - s]));
export const seedCountFor = (size: number) => SEEDS_BY_SIZE[size] ?? Math.max(2, size / 4);
const roundName = (teams: number) => (teams === 2 ? "F" : teams === 4 ? "SF" : teams === 8 ? "QF" : `R${teams}`);
export const ROUND_ORDER = ["QR", "G", "R32", "R16", "QF", "SF", "F"];
/** Tailles possibles pour N équipes : le tableau doit contenir toutes les équipes directes ; qualifications si N > taille (au plus la moitié du tableau). */
export function sizeOptions(n: number): Array<{ size: number; ok: boolean; qualifiers: number; byes: number }> {
  return DRAW_SIZES.map((size) => { const q = Math.max(0, n - size); return { size, ok: n >= 2 && q <= size / 2, qualifiers: q, byes: Math.max(0, size - n) }; });
}
export const defaultSize = (n: number): number => (sizeOptions(n).find((o) => o.ok && o.qualifiers === 0)?.size ?? sizeOptions(n).find((o) => o.ok)?.size ?? 32);

/* ───────── construction ───────── */
/** Place les équipes (clés ordonnées par tête de série puis par rang) dans un tableau d'élimination de `size` cases. */
export function placeKnockout(ranked: string[], size: number, seedCount: number, nonce: number, tag: string): { positions: (string | null)[]; qualifiers: number; qualSlots: Record<number, number> } {
  const n = ranked.length, q = Math.max(0, n - size); // places de qualifiés (qualifications si plus d'équipes que de cases)
  const order = bracketOrder(size); const directCount = Math.min(n, size - q);
  // les têtes de série, et les paires qui reçoivent un exempt, sont placées à leur position standard (pas tirées au sort)
  const protectedCount = Math.min(directCount, Math.max(seedCount, size - n)); const seeds = ranked.slice(0, protectedCount); const rest = ranked.slice(seeds.length, directCount);
  const freeSlots: number[] = [], positions: (string | null)[] = Array(size).fill(null); const qualSlots: Record<number, number> = {};
  order.forEach((v, pos) => {
    if (v <= seeds.length) positions[pos] = seeds[v - 1];
    else if (v > directCount && v <= size) { if (q > 0 && v > size - q) qualSlots[pos] = v - (size - q) - 1; /* bye sinon */ }
    else freeSlots.push(pos);
  });
  const drawn = shuffled(rest, `${tag}|${nonce}`); freeSlots.forEach((pos, i) => { positions[pos] = drawn[i] ?? null; });
  return { positions, qualifiers: q, qualSlots };
}
const slotOf = (positions: (string | null)[], qualSlots: Record<number, number>, pos: number): Slot => (positions[pos] ? { t: "team", key: positions[pos]! } : qualSlots[pos] != null ? { t: "winner", m: `QR${qualSlots[pos] + 1}` } : { t: "bye" });

function knockoutMatches(first: Slot[], prefix = ""): DMatch[] {
  const out: DMatch[] = []; let cur = first; let teams = first.length; let ri = 0;
  while (teams >= 2) {
    const name = roundName(teams); const next: Slot[] = []; const count = teams / 2;
    for (let i = 0; i < count; i++) {
      const id = name === "F" ? prefix + "F" : `${prefix}${name}-${i + 1}`;
      out.push({ id, kind: "main", round: name, roundIdx: ri, order: i, a: cur[i * 2], b: cur[i * 2 + 1], label: name === "F" ? "Final" : `${name} ${i + 1}` });
      next.push({ t: "winner", m: id });
    }
    cur = next; teams = count; ri++;
  }
  return out;
}
function withPlacement(ms: DMatch[], placement: Placement): DMatch[] {
  const sf = ms.filter((m) => m.round === "SF"), qf = ms.filter((m) => m.round === "QF"); const out = [...ms];
  if (placement !== "none" && sf.length === 2) out.push({ id: "3P", kind: "placement", round: "P", roundIdx: 98, order: 0, a: { t: "loser", m: sf[0].id }, b: { t: "loser", m: sf[1].id }, label: "3rd place" });
  if (placement === "classification" && qf.length === 4) {
    out.push({ id: "C1", kind: "placement", round: "P", roundIdx: 97, order: 1, a: { t: "loser", m: qf[0].id }, b: { t: "loser", m: qf[1].id }, label: "5–8 · A" });
    out.push({ id: "C2", kind: "placement", round: "P", roundIdx: 97, order: 2, a: { t: "loser", m: qf[2].id }, b: { t: "loser", m: qf[3].id }, label: "5–8 · B" });
    out.push({ id: "5P", kind: "placement", round: "P", roundIdx: 99, order: 3, a: { t: "winner", m: "C1" }, b: { t: "winner", m: "C2" }, label: "5th place" });
    out.push({ id: "7P", kind: "placement", round: "P", roundIdx: 99, order: 4, a: { t: "loser", m: "C1" }, b: { t: "loser", m: "C2" }, label: "7th place" });
  }
  return out;
}
/** Poules (serpentin selon la tête de série) + phase finale à 2×G équipes (2 qualifiés par poule). */
export function groupCount(size: number) { return size === 8 ? 2 : size === 16 ? 4 : 8; }
export function buildGroups(ranked: string[], g: number): string[][] {
  const groups: string[][] = Array.from({ length: g }, () => []);
  ranked.forEach((k, i) => { const row = Math.floor(i / g); const idx = row % 2 === 0 ? i % g : g - 1 - (i % g); groups[idx].push(k); });
  return groups;
}
export function buildDraw(cfg: Pick<DrawConfig, "format" | "size" | "placement" | "seeds" | "entries" | "nonce" | "eventId" | "division">): Built {
  const tag = `${cfg.eventId}|${cfg.division}`; const seedKeys = cfg.seeds.filter((k) => cfg.entries.includes(k));
  const ranked = [...seedKeys, ...cfg.entries.filter((k) => !seedKeys.includes(k))]; const n = ranked.length;
  if (n < 2) return { matches: [], positions: [], qualifiers: 0, seedCount: 0, groups: [], error: "At least 2 confirmed pairs are needed." };
  if (cfg.format === "groups") {
    const g = groupCount(cfg.size); if (n < g * 2) return { matches: [], positions: [], qualifiers: 0, seedCount: 0, groups: [], error: "Not enough pairs for this number of groups." };
    const groups = buildGroups(ranked, g); const ms: DMatch[] = [];
    groups.forEach((teams, gi) => { let k = 0; for (let i = 0; i < teams.length; i++) for (let j = i + 1; j < teams.length; j++) ms.push({ id: `G${String.fromCharCode(65 + gi)}-${++k}`, kind: "group", round: "G", roundIdx: 0, order: ms.length, a: { t: "team", key: teams[i] }, b: { t: "team", key: teams[j] }, group: gi, label: `Group ${String.fromCharCode(65 + gi)} · ${k}` }); });
    const ko = 2 * g, order = bracketOrder(ko); const first: Slot[] = order.map((v) => (v <= g ? { t: "group", g: v - 1, pos: 1 } : { t: "group", g: (ko - v) ^ 1, pos: 2 }));
    return { matches: withPlacement([...ms, ...knockoutMatches(first).map((m) => ({ ...m, roundIdx: m.roundIdx + 1 }))], cfg.placement), positions: [], qualifiers: 0, seedCount: Math.min(g, n), groups };
  }
  const o = sizeOptions(n).find((x) => x.size === cfg.size);
  if (!o || !o.ok) return { matches: [], positions: [], qualifiers: 0, seedCount: 0, groups: [], error: "This draw size cannot hold all the pairs." };
  const seedCount = Math.min(seedCountFor(cfg.size), n - o.qualifiers); const { positions, qualifiers, qualSlots } = placeKnockout(ranked, cfg.size, seedCount, cfg.nonce, tag);
  const first = positions.map((_, pos) => slotOf(positions, qualSlots, pos)); const main = knockoutMatches(first).map((m) => ({ ...m, roundIdx: m.roundIdx + 1 }));
  const qual: DMatch[] = []; if (qualifiers > 0) { const qteams = ranked.slice(cfg.size - qualifiers); for (let i = 0; i < qualifiers; i++) qual.push({ id: `QR${i + 1}`, kind: "qual", round: "QR", roundIdx: 0, order: i, a: { t: "team", key: qteams[i] }, b: { t: "team", key: qteams[qteams.length - 1 - i] }, label: `Qualifier ${i + 1}` }); }
  return { matches: withPlacement([...qual, ...main], cfg.placement), positions, qualifiers, seedCount, groups: [] };
}

/* ───────── scores ───────── */
export type Set2 = [number, number];
export type ResultKind = "played" | "walkover" | "retired";
export interface MatchResult { kind: ResultKind; sets: Set2[]; winner: "A" | "B"; reason?: string }
const okSet = (a: number, b: number) => { const hi = Math.max(a, b), lo = Math.min(a, b); return (hi === 6 && lo <= 4) || (hi === 7 && (lo === 5 || lo === 6)); };
const okTie = (a: number, b: number) => Math.max(a, b) >= SUPER_TIEBREAK_POINTS && Math.abs(a - b) >= 2 && (Math.max(a, b) === SUPER_TIEBREAK_POINTS || Math.abs(a - b) === 2);
export function setsWon(sets: Set2[]) { let a = 0, b = 0; sets.forEach(([x, y], i) => { if (i === 2 ? okTie(x, y) || okSet(x, y) : okSet(x, y)) { if (x > y) a++; else b++; } }); return { a, b }; }
export type ScoreIssue = "empty" | "invalid-set" | "incomplete" | "too-many-sets" | "reason" | "winner";
/** Valide un résultat saisi ; retourne le résultat normalisé ou la liste des problèmes. */
export function validateResult(kind: ResultKind, sets: Set2[], opts: { winner?: "A" | "B"; reason?: string; reasonMin: number }): { ok: true; result: MatchResult } | { ok: false; issues: ScoreIssue[] } {
  const issues: ScoreIssue[] = []; const clean = sets.filter(([a, b]) => a !== 0 || b !== 0 || sets.length === 1);
  if (kind === "walkover") { if (!opts.winner) issues.push("winner"); if ((opts.reason ?? "").trim().length < opts.reasonMin) issues.push("reason"); return issues.length ? { ok: false, issues } : { ok: true, result: { kind, sets: [], winner: opts.winner!, reason: opts.reason!.trim() } }; }
  if (kind === "retired") {
    if (!opts.winner) issues.push("winner"); if ((opts.reason ?? "").trim().length < opts.reasonMin) issues.push("reason");
    if (clean.some(([a, b]) => a < 0 || b < 0 || a > 99 || b > 99 || !Number.isInteger(a) || !Number.isInteger(b))) issues.push("invalid-set");
    return issues.length ? { ok: false, issues } : { ok: true, result: { kind, sets: clean, winner: opts.winner!, reason: opts.reason!.trim() } };
  }
  if (clean.length === 0 || clean.every(([a, b]) => a === 0 && b === 0)) return { ok: false, issues: ["empty"] };
  let a = 0, b = 0;
  for (let i = 0; i < clean.length; i++) {
    const [x, y] = clean[i];
    if (a === 2 || b === 2) { issues.push("too-many-sets"); break; }
    if (i >= MAX_SETS) { issues.push("too-many-sets"); break; }
    if (!(i === 2 ? okSet(x, y) || okTie(x, y) : okSet(x, y))) { issues.push("invalid-set"); break; }
    if (x > y) a++; else b++;
  }
  if (!issues.length && a < 2 && b < 2) issues.push("incomplete");
  return issues.length ? { ok: false, issues } : { ok: true, result: { kind: "played", sets: clean, winner: a > b ? "A" : "B" } };
}
export const scoreText = (r: Pick<MatchResult, "kind" | "sets">) => (r.kind === "walkover" ? "W.O." : r.sets.map(([a, b]) => `${a}-${b}`).join(" ") + (r.kind === "retired" ? " ret." : ""));

/* ───────── état des matchs et résolution ───────── */
export interface MatchHist { at: string; actor: string; action: string; note?: string }
export interface Proposal extends MatchResult { correction?: boolean; by: string; at: string; queueId: string }
export interface MatchState { court?: number; day?: string; time?: string; live?: boolean; result?: MatchResult; proposal?: Proposal; history: MatchHist[]; rejectedNote?: string }
export type Team = string | "bye" | null;
export interface Resolved { id: string; m: DMatch; a: Team; b: Team; bye: boolean; winner: "A" | "B" | null; loserTeam: Team; winnerTeam: Team; st?: MatchState; status: "bye" | "waiting" | "ready" | "scheduled" | "live" | "pending" | "done" }
export type StateOf = (matchId: string) => MatchState | undefined;
export interface Standing { key: string; played: number; wins: number; losses: number; setsFor: number; setsAgainst: number; gamesFor: number; gamesAgainst: number; rank: number }
export function groupStandings(teams: string[], groupId: number, resolved: Map<string, Resolved>): { rows: Standing[]; complete: boolean } {
  const rows = new Map<string, Standing>(teams.map((k) => [k, { key: k, played: 0, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, gamesFor: 0, gamesAgainst: 0, rank: 0 }])); let complete = true;
  for (const r of resolved.values()) if (r.m.kind === "group" && r.m.group === groupId) {
    const res = r.st?.result; if (!res || !r.a || !r.b || r.a === "bye" || r.b === "bye") { complete = false; continue; }
    const A = rows.get(r.a)!, B = rows.get(r.b)!; A.played++; B.played++; const aw = res.winner === "A"; (aw ? A : B).wins++; (aw ? B : A).losses++;
    for (const [x, y] of res.sets) { A.gamesFor += x; A.gamesAgainst += y; B.gamesFor += y; B.gamesAgainst += x; if (x > y) { A.setsFor++; B.setsAgainst++; } else { B.setsFor++; A.setsAgainst++; } }
  }
  const sorted = [...rows.values()].sort((p, q) => q.wins - p.wins || (q.setsFor - q.setsAgainst) - (p.setsFor - p.setsAgainst) || (q.gamesFor - q.gamesAgainst) - (p.gamesFor - p.gamesAgainst) || teams.indexOf(p.key) - teams.indexOf(q.key));
  sorted.forEach((s, i) => { s.rank = i + 1; }); return { rows: sorted, complete };
}
/** Résout tout le tableau : équipes connues, vainqueurs (résultats VALIDÉS uniquement), avancement automatique. */
export function resolveDraw(built: Built, stateOf: StateOf): Map<string, Resolved> {
  const out = new Map<string, Resolved>(); const standings = new Map<number, { rows: Standing[]; complete: boolean }>();
  const team = (s: Slot): Team => {
    if (s.t === "team") return s.key; if (s.t === "bye") return "bye"; if (s.t === "tbd") return null;
    if (s.t === "winner") return out.get(s.m)?.winnerTeam ?? null; if (s.t === "loser") return out.get(s.m)?.loserTeam ?? null;
    let st = standings.get(s.g); if (!st) { st = groupStandings(built.groups[s.g] ?? [], s.g, out); standings.set(s.g, st); }
    return st.complete ? st.rows[s.pos - 1]?.key ?? null : null;
  };
  // les poules d'abord (les standings dépendent de leurs résolutions)
  for (const m of built.matches) {
    const st = stateOf(m.id); const a = team(m.a), b = team(m.b); const bye = a === "bye" || b === "bye";
    let winner: "A" | "B" | null = null, winnerTeam: Team = null, loserTeam: Team = null;
    if (bye) { winnerTeam = a === "bye" ? (b === "bye" ? "bye" : b) : a; loserTeam = "bye"; winner = a === "bye" ? "B" : "A"; }
    else if (st?.result) { winner = st.result.winner; winnerTeam = winner === "A" ? a : b; loserTeam = winner === "A" ? b : a; }
    const status: Resolved["status"] = bye ? "bye" : st?.result ? "done" : st?.proposal ? "pending" : st?.live ? "live" : !a || !b ? "waiting" : st?.court != null && st.time ? "scheduled" : "ready";
    out.set(m.id, { id: m.id, m, a, b, bye, winner, winnerTeam, loserTeam, st, status });
    if (m.kind === "group") standings.clear();
  }
  return out;
}
export const champion = (r: Map<string, Resolved>): Team => r.get("F")?.winnerTeam ?? null;
/** Une correction qui change le vainqueur est impossible si un match suivant dépend déjà du résultat. */
export function dependents(built: Built, id: string): string[] {
  const direct = built.matches.filter((m) => [m.a, m.b].some((s) => (s.t === "winner" || s.t === "loser") && s.m === id)).map((m) => m.id);
  return direct.flatMap((d) => [d, ...dependents(built, d)]);
}
export const canChangeWinner = (built: Built, id: string, stateOf: StateOf) => !dependents(built, id).some((d) => { const s = stateOf(d); return !!(s?.result || s?.proposal || s?.live); });

/* ───────── programmation ───────── */
export const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export const slotTimes = () => { const out: string[] = []; for (let t = toMin(PLAY_START); t + MATCH_DURATION_MIN <= toMin(PLAY_END); t += SLOT_STEP_MIN) out.push(fromMin(t)); return out; };
export type ConflictKind = "court" | "team" | "order" | "hours" | "day";
export interface Conflict { matchId: string; kind: ConflictKind; other?: string }
export interface Sched { court?: number; day?: string; time?: string }
const span = (s: Sched) => (s.day && s.time ? { day: s.day, from: toMin(s.time), to: toMin(s.time) + MATCH_DURATION_MIN } : null);
/** Conflits de programmation : même terrain chevauché, même paire trop rapprochée, match avant ses précédents, hors horaires / hors dates. */
export function scheduleConflicts(built: Built, resolved: Map<string, Resolved>, sched: (id: string) => Sched, days: string[]): Conflict[] {
  const out: Conflict[] = []; const ids = built.matches.filter((m) => !resolved.get(m.id)?.bye && sched(m.id).day && sched(m.id).time).map((m) => m.id);
  for (const id of ids) {
    const s = sched(id), sp = span(s)!;
    if (!days.includes(s.day!)) out.push({ matchId: id, kind: "day" });
    if (sp.from < toMin(PLAY_START) || sp.to > toMin(PLAY_END)) out.push({ matchId: id, kind: "hours" });
    const ra = resolved.get(id)!; const teams = [ra.a, ra.b].filter((x): x is string => !!x && x !== "bye");
    for (const o of ids) if (o > id) {
      const so = sched(o), spo = span(so)!; if (spo.day !== sp.day) continue;
      const overlap = sp.from < spo.to && spo.from < sp.to;
      if (s.court != null && s.court === so.court && overlap) out.push({ matchId: id, kind: "court", other: o }, { matchId: o, kind: "court", other: id });
      const ro = resolved.get(o)!; const tw = [ro.a, ro.b].filter((x): x is string => !!x && x !== "bye");
      if (teams.some((t) => tw.includes(t)) && sp.from < spo.to + MIN_REST_MIN && spo.from < sp.to + MIN_REST_MIN) out.push({ matchId: id, kind: "team", other: o }, { matchId: o, kind: "team", other: id });
    }
    // ordre : après la fin de ses matchs précédents (même jour : doit commencer après ; jour antérieur : conflit)
    for (const src of [built.matches.find((m) => m.id === id)!.a, built.matches.find((m) => m.id === id)!.b]) if (src.t === "winner" || src.t === "loser") {
      const ps = sched(src.m), pp = span(ps); if (!pp) continue;
      if (pp.day > sp.day || (pp.day === sp.day && pp.to > sp.from)) out.push({ matchId: id, kind: "order", other: src.m });
    }
  }
  const seen = new Set<string>(); return out.filter((c) => { const k = `${c.matchId}|${c.kind}|${c.other ?? ""}`; if (seen.has(k)) return false; seen.add(k); return true; });
}
/** Programmation automatique illustrative : tour après tour, premier créneau libre sans conflit. */
export function autoSchedule(built: Built, resolved: Map<string, Resolved>, courts: number, days: string[], keep: (id: string) => Sched): Record<string, Sched> {
  const plan: Record<string, Sched> = {}; const get = (id: string): Sched => plan[id] ?? keep(id); const times = slotTimes();
  const order = built.matches.filter((m) => !resolved.get(m.id)?.bye).sort((p, q) => p.roundIdx - q.roundIdx || p.order - q.order);
  for (const m of order) {
    const cur = keep(m.id); if (cur.day && cur.time && cur.court != null) { plan[m.id] = cur; continue; }
    let placed = false;
    for (const day of days) { for (const time of times) { for (let c = 1; c <= courts && !placed; c++) {
      plan[m.id] = { court: c, day, time };
      const bad = scheduleConflicts(built, resolved, get, days).some((x) => x.matchId === m.id);
      if (!bad) placed = true; else delete plan[m.id];
    } if (placed) break; } if (placed) break; }
  }
  return plan;
}
