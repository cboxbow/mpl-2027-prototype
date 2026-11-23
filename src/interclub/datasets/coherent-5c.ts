/**
 * JEU DE DONNÉES INTERCLUB COHÉRENT — PHASE 5C (séparé, NON appliqué).
 * ⚠ Ce module n'est importé ni par l'application ni par les fixtures des tests existants : il ne modifie ni `PLAYERS`, ni `seedDossiers()`, ni aucune affiliation.
 * Il calcule, de façon déterministe et pure, ce que serait un jeu cohérent (option A de la proposition 5B-8) :
 *   • chaque joueur listé dans un dossier est affilié au club de ce dossier (couche d'affiliation « overlay » proposée, jamais appliquée) ;
 *   • un joueur listé dans deux clubs est remplacé, dans le second dossier, par un joueur libre du même genre (ou, à défaut, par un joueur fictif ajouté) ;
 *   • les licences expirées (M9, M21, F6) sont conservées volontairement (cas de test du contrôle d'éligibilité) ;
 *   • AUCUNE règle d'affiliation n'est approuvée : l'affiliation « un joueur = un club Interclub » reste une hypothèse de démonstration soumise à la Commission.
 * Données fictives uniquement.
 */
import { PLAYERS, displayName, type Player } from "@/data/demo";
import { rankOf, seedDossiers } from "../seed";
import type { Dossier, EngPlayer } from "../engagement";

export interface FictionalPlayer { id: string; name: string; gender: "M" | "F"; clubId: string; licenceExpiry: string; fictional: true }
export interface Replacement { clubId: string; division: string; from: string; to: string; reason: "listed_in_two_clubs" }
export interface CoherentStats { dossiers: number; lines: number; distinctPlayers: number; mismatchBefore: number; mismatchAfter: number; duplicatesBefore: number; duplicatesAfter: number; reaffiliated: number; replacements: number; fictionalAdded: number; expiredKept: string[] }
export interface CoherentDataset { affiliations: Record<string, string>; dossiers: Dossier[]; replacements: Replacement[]; fictional: FictionalPlayer[]; stats: CoherentStats; officialRuleApplied: false }

const EXPIRY = "2027-12-31";
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const expired = (p: Pick<Player, "licenceExpiry">) => p.licenceExpiry < "2027-01-01";

export function buildCoherentInterclubDataset(): CoherentDataset {
  const base = seedDossiers(); const dossiers = clone(base) as Dossier[];
  const byId = new Map(PLAYERS.map((p) => [p.id, p])); const listed = new Set(base.flatMap((d) => d.form.players.map((p) => p.playerId)).filter(Boolean) as string[]);
  const owner = new Map<string, string>(); const replacements: Replacement[] = []; const fictional: FictionalPlayer[] = [];
  const pool = (g: "M" | "F") => PLAYERS.filter((p) => p.gender === g && !p.junior && !listed.has(p.id) && !expired(p));
  const used = new Set<string>(); let nextM = Math.max(...PLAYERS.filter((p) => p.gender === "M").map((p) => Number(p.id.slice(1)))) + 1; let nextF = Math.max(...PLAYERS.filter((p) => p.gender === "F").map((p) => Number(p.id.slice(1)))) + 1;
  const freePlayer = (g: "M" | "F", clubId: string): { id: string; name: string } => {
    const p = pool(g).find((x) => !used.has(x.id)); if (p) { used.add(p.id); return { id: p.id, name: displayName(p) }; }
    const n = g === "M" ? nextM++ : nextF++; const id = `${g}${n}`; const f: FictionalPlayer = { id, name: `Joueur fictif ${id}`, gender: g, clubId, licenceExpiry: EXPIRY, fictional: true }; fictional.push(f); used.add(id); return { id, name: f.name };
  };
  let lines = 0; let mismatchBefore = 0; const seen = new Map<string, Set<string>>();
  for (const d of base) for (const p of d.form.players) { lines++; if (p.playerId && byId.get(p.playerId)?.clubId !== d.clubId) mismatchBefore++; if (p.playerId) (seen.get(p.playerId) ?? seen.set(p.playerId, new Set()).get(p.playerId)!).add(d.clubId); }
  const duplicatesBefore = [...seen.values()].filter((s) => s.size > 1).length;
  for (const d of dossiers) for (let i = 0; i < d.form.players.length; i++) {
    const line = d.form.players[i]; const pid = line.playerId; if (!pid) continue; const cur = owner.get(pid);
    if (cur && cur !== d.clubId) {
      const g = byId.get(pid)?.gender ?? "M"; const r = freePlayer(g, d.clubId); const next: EngPlayer = { ...line, id: `${d.clubId}-${line.division}-${r.id}`, playerId: r.id, name: r.name, rank: rankOf(r.id) };
      d.form.players[i] = next; owner.set(r.id, d.clubId); replacements.push({ clubId: d.clubId, division: line.division, from: pid, to: r.id, reason: "listed_in_two_clubs" });
    } else owner.set(pid, d.clubId);
  }
  const affiliations: Record<string, string> = Object.fromEntries(owner);
  const finalSeen = new Map<string, Set<string>>(); let mismatchAfter = 0; let distinct = 0;
  for (const d of dossiers) for (const p of d.form.players) { if (!p.playerId) continue; if (affiliations[p.playerId] !== d.clubId) mismatchAfter++; (finalSeen.get(p.playerId) ?? finalSeen.set(p.playerId, new Set()).get(p.playerId)!).add(d.clubId); }
  distinct = finalSeen.size; const duplicatesAfter = [...finalSeen.values()].filter((s) => s.size > 1).length;
  const reaffiliated = Object.entries(affiliations).filter(([id, club]) => { const p = byId.get(id); return p ? p.clubId !== club : true; }).length;
  const expiredKept = ["M9", "M21", "F6"].filter((id) => finalSeen.has(id));
  return { affiliations, dossiers, replacements, fictional, officialRuleApplied: false, stats: { dossiers: dossiers.length, lines, distinctPlayers: distinct, mismatchBefore, mismatchAfter, duplicatesBefore, duplicatesAfter, reaffiliated, replacements: replacements.length, fictionalAdded: fictional.length, expiredKept } };
}
