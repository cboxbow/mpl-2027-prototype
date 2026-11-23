/**
 * D2 — PRÉPARATION DES POULES (fonctions pures). Formats = HYPOTHÈSES modifiables ; la qualification pour les phases finales n'est PAS figée.
 * Le tirage est une SIMULATION déterministe (graine) : pas un tirage réglementaire.
 */
import { CLUBS } from "@/data/clubs";
import { DEFAULT_DIVISIONS } from "./capacity";
import type { Dossier } from "./engagement";

export type TeamSource = "accepted" | "accepted_submitted" | "demo_full";
export const teamId = (clubId: string, division: string) => `${clubId}|${division}`;
export const parseTeam = (id: string) => { const [clubId, division] = id.split("|"); return { clubId, division }; };
/** Hypothèses de travail du cahier D2 : pools par division. */
export const DEFAULT_FORMATS: Record<string, number> = Object.fromEntries(DEFAULT_DIVISIONS.map((d) => [d.code, d.pools]));

/** Équipes candidates d'une division depuis les engagements D1 (aucune base d'équipes parallèle) ; « demo_full » = scénario fictif complet à partir des clubs du prototype. */
export function teamsFor(division: string, dossiers: Dossier[], source: TeamSource, max: number): string[] {
  if (source === "demo_full") { const idx = Math.max(0, DEFAULT_DIVISIONS.findIndex((d) => d.code === division)); return Array.from({ length: Math.min(max, CLUBS.length) }, (_, i) => teamId(CLUBS[(idx * 3 + i) % CLUBS.length].id, division)); }
  const ok = source === "accepted" ? ["accepted"] : ["accepted", "submitted"];
  return dossiers.filter((d) => ok.includes(d.lines[division]?.status ?? "")).map((d) => teamId(d.clubId, division));
}
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Nombre de poules effectif : jamais plus de poules que n/2 (au moins 2 équipes par poule). */
export const effectivePools = (n: number, configured: number) => (n <= 0 ? 0 : Math.max(1, Math.min(configured, Math.floor(n / 2))));
export const poolSizes = (n: number, k: number) => (k <= 0 ? [] : Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0)));
/** Tirage simulé : mélange à graine puis distribution en serpentin. */
export function drawPools(teams: string[], pools: number, seed: number): string[][] {
  const k = effectivePools(teams.length, pools); if (!k) return []; const r = rng(seed); const a = [...teams];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const out: string[][] = Array.from({ length: k }, () => []); const sizes = poolSizes(a.length, k); let p = 0;
  for (const t of a) { while (out[p].length >= sizes[p]) p = (p + 1) % k; out[p].push(t); p = (p + 1) % k; }
  return out;
}
export interface PoolVersion { n: number; at: string; by: string; note: string; assignment: string[][]; removed: string[]; seed: number }
export interface PoolPlan { division: string; pools: number; source: TeamSource; /** Équipes candidates au moment de la génération. */ teams: string[]; removed: string[]; assignment: string[][]; seed: number; version: number; versions: PoolVersion[]; history: Array<{ at: string; actor: string; action: string; note?: string }>; updatedAt: string }
export type PoolIssueCode = "over_max" | "duplicate_team" | "duplicate_club" | "unassigned" | "removed_assigned" | "stale_list" | "small_pool" | "uneven" | "no_teams" | "unknown_team";
export interface PoolIssue { code: PoolIssueCode; severity: "block" | "warn"; params?: Record<string, string | number> }
export function poolIssues(plan: PoolPlan, current: string[], max: number): PoolIssue[] {
  const out: PoolIssue[] = []; const all = plan.assignment.flat(); const active = plan.teams.filter((t) => !plan.removed.includes(t));
  if (!active.length) out.push({ code: "no_teams", severity: "block" });
  if (active.length > max) out.push({ code: "over_max", severity: "warn", params: { n: active.length, max } });
  const seen = new Set<string>(); for (const t of all) { if (seen.has(t)) out.push({ code: "duplicate_team", severity: "block", params: { team: t } }); seen.add(t); }
  const clubs = new Map<string, string>(); for (const t of all) { const c = parseTeam(t).clubId; if (clubs.has(c)) out.push({ code: "duplicate_club", severity: "block", params: { club: c } }); clubs.set(c, t); }
  for (const t of active) if (!seen.has(t)) out.push({ code: "unassigned", severity: "block", params: { team: t } });
  for (const t of all) { if (plan.removed.includes(t)) out.push({ code: "removed_assigned", severity: "block", params: { team: t } }); else if (!plan.teams.includes(t)) out.push({ code: "unknown_team", severity: "block", params: { team: t } }); }
  const sig = (a: string[]) => [...a].sort().join(","); if (sig(current) !== sig(plan.teams)) out.push({ code: "stale_list", severity: "warn" });
  const sizes = plan.assignment.map((p) => p.length); if (sizes.some((s) => s < 3 && s > 0)) out.push({ code: "small_pool", severity: "warn", params: { n: Math.min(...sizes) } });
  if (sizes.length > 1 && Math.max(...sizes) - Math.min(...sizes) > 1) out.push({ code: "uneven", severity: "warn" });
  return out;
}
