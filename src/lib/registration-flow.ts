/** Lot 5B-5 (P1-12) — parcours d'inscription unique : étapes communes à la page /register et à l'assistant. Fonctions pures (testées). Aucune règle d'éligibilité n'est modifiée ici. */
import { tr } from "@/lib/i18n";
import { allEntries, liveRows, type EntryCtx } from "@/lib/entries";
import { DIVISION_LABEL, displayName, type Division, type Player } from "@/data/demo";
import type { CalendarEvent } from "@/data/calendar.generated";

export const STAGES = ["tournament", "category", "player", "partner", "check", "confirmation", "tracking"] as const;
export type Stage = (typeof STAGES)[number];
export const stageLabel = (s: Stage) => ({ tournament: tr("Tournament"), category: tr("Category"), player: tr("Player"), partner: tr("Partner"), check: tr("Check"), confirmation: tr("Confirmation"), tracking: tr("Tracking") })[s];
export type StageState = "done" | "current" | "todo";
export interface FlowInput { /** 0 = choix catégorie / joueur / partenaire, 1 = vérification, 2 = conditions, 3 = confirmation ; null = page de choix du tournoi (aucun assistant ouvert). */ step: number | null; hasCategory?: boolean; playerOk?: boolean }
/** État de chacune des 7 étapes. Le tournoi est « fait » dès qu'un assistant est ouvert ; au premier écran, le partenaire reste l'étape courante tant que l'utilisateur n'a pas continué ; le suivi devient l'étape courante après la confirmation. */
export function flowStates({ step, hasCategory = false, playerOk = false }: FlowInput): Record<Stage, StageState> {
  const r = Object.fromEntries(STAGES.map((s) => [s, "todo"])) as Record<Stage, StageState>;
  if (step === null) { r.tournament = "current"; return r; }
  r.tournament = "done";
  if (step === 0) { r.category = hasCategory ? "done" : "current"; if (!hasCategory) return r; r.player = playerOk ? "done" : "current"; if (playerOk) r.partner = "current"; return r; }
  r.category = r.player = r.partner = "done";
  if (step <= 2) { r.check = "current"; return r; }
  r.check = r.confirmation = "done"; r.tracking = "current"; return r;
}
/** Étape courante (1-indexée) et son libellé, pour le texte « Étape n sur 7 ». */
export function currentStage(states: Record<Stage, StageState>): { n: number; stage: Stage } { const i = STAGES.findIndex((s) => states[s] === "current"); const k = i < 0 ? STAGES.length - 1 : i; return { n: k + 1, stage: STAGES[k] }; }

/** Doublon avec la base d'inscrits (paires fictives) : un des deux joueurs figure déjà dans une paire vivante du même tableau. Non bloquant (information) : les règles d'éligibilité existantes sont conservées. */
export function baseDuplicates(event: CalendarEvent, division: Division, players: Player[], ctx: EntryCtx): Array<{ player: Player; other: Player; status: string }> {
  const ids = new Set(players.map((p) => p.id)); const out: Array<{ player: Player; other: Player; status: string }> = [];
  for (const r of liveRows(allEntries(event, division, ctx))) { if (r.source !== "fictional") continue; for (const [p, o] of [[r.a, r.b], [r.b, r.a]] as const) if (ids.has(p.id)) out.push({ player: p, other: o, status: r.status }); }
  return out;
}
export const dupText = (d: { player: Player; other: Player; status: string }, division: Division) => `${displayName(d.player)} ${tr("already appears in a registered pair of the")} ${DIVISION_LABEL[division]} ${tr("draw")} (${displayName(d.other)}, ${d.status}). ${tr("Not blocking in this prototype.")}`;
