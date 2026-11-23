/** Dossiers d'engagement FICTIFS de démonstration (aucune donnée réelle). Clubs du prototype ; joueurs fictifs ; classements du snapshot fictif. */
import { PLAYERS, RANKING_F, RANKING_M, displayName } from "@/data/demo";
import { clubById } from "@/data/clubs";
import { emptyForm, newLines, type Dossier, type EngPlayer, type LineState, type LineStatus } from "./engagement";

const AT = "2026-11-18 10:00";
/** Joueurs fictifs disponibles pour un club (menu de sélection) avec rang du snapshot (null = NC). */
export const rankOf = (id: string): number | null => (RANKING_M.find((r) => r.player.id === id) ?? RANKING_F.find((r) => r.player.id === id))?.rank ?? null;
export const demoPlayerOptions = () => PLAYERS.map((p) => ({ id: p.id, name: displayName(p), gender: p.gender, rank: rankOf(p.id) }));
const pick = (g: "M" | "F", from: number, n: number) => PLAYERS.filter((p) => p.gender === g).slice(from, from + n);
const mk = (clubKey: string, division: string, g: "M" | "F", from: number, n: number): EngPlayer[] => pick(g, from, n).map((p, i) => ({ id: `${clubKey}-${division}-${p.id}`, playerId: p.id, name: displayName(p), rank: rankOf(p.id), pair: (["P1", "P1", "P2", "P2", "P3", "P3", "", ""][i] ?? "") as EngPlayer["pair"], division }));

interface SeedSpec { club: string; lines: Record<string, LineStatus>; men: number; women: number; note?: string }
/** Statuts variés pour la file de traitement. Le joueur M7 est volontairement listé dans deux clubs (démonstration du contrôle d'exclusivité). */
const SPECS: SeedSpec[] = [
  { club: "urban-sport-grand-baie", lines: { D1H: "submitted", D3H: "submitted" }, men: 0, women: 0 },
  { club: "rm-club-hennessy", lines: { D2H: "accepted", D4H: "to_complete" }, men: 18, women: 0, note: "Rank column to be checked against the frozen snapshot." },
  { club: "cana-beau-plan", lines: { D1H: "accepted", D1F: "accepted", D3F: "refused" }, men: 30, women: 0, note: "Court declaration incomplete (demo)." },
  { club: "isla-padel-grand-baie", lines: { D4H: "submitted", D2F: "submitted", D3F: "submitted" }, men: 38, women: 12 },
  { club: "sparc-cascavelle", lines: { D3H: "draft" }, men: 8, women: 0 },
  { club: "rm-club-port-chambly", lines: { D3H: "accepted", D4H: "accepted" }, men: 46, women: 24 },
];
function build(spec: SeedSpec, i: number): Dossier {
  const c = clubById(spec.club)!; const divs = Object.keys(spec.lines); let men = spec.men, women = spec.women; const players: EngPlayer[] = [];
  for (const d of divs) { const f = d.endsWith("F"); const n = 7; if (f) { players.push(...mk(spec.club, d, "F", women, n)); women += n; } else { players.push(...mk(spec.club, d, "M", men, n)); men += n; } }
  /** Exclusivité : le joueur M7 (déjà listé par le 1er club) est aussi listé par le 4e club. */
  if (i === 3) { const dv = divs.find((x) => !x.endsWith("F")); const m7 = PLAYERS.find((p) => p.id === "M7"); if (dv && m7) players.splice(0, 1, { id: `${spec.club}-${dv}-M7`, playerId: "M7", name: displayName(m7), rank: rankOf("M7"), pair: "P1", division: dv }); }
  const form = emptyForm(c.name, {
    club: { officialName: c.name, legalName: `${c.name} Ltd (fictive)`, regNo: `DEMO-${String(100 + i)}`, address: "Adresse fictive", city: c.locality ?? "Maurice", phone: "+230 5000 0000", email: `contact@${spec.club}.demo.invalid` },
    contact: { lastName: "Responsable", firstName: "Fictif", role: "Responsable Interclub", phone: "+230 5000 0001", email: `interclub@${spec.club}.demo.invalid` },
    divisions: Object.fromEntries(["D1H", "D2H", "D3H", "D4H", "D1F", "D2F", "D3F"].map((x) => [x, divs.includes(x)])), players,
    hosting: { homologated: Math.max(2, c.courtsMax), fridayCourts: Math.max(1, Math.floor(c.courtsMax / 2)), simultaneous: 1, lighting: true, conditions: "", partnerConvention: false },
    availability: ["yes", "yes", "maybe", "yes", "yes", "no", "yes", "yes", "maybe", "yes"], declarations: { rules: true, exclusivity: true, courts: true, fee: true }, step: 7,
  });
  const lines: Record<string, LineState> = {}; for (const [d, st] of Object.entries(spec.lines)) lines[d] = { status: st, note: st === "to_complete" ? spec.note : st === "refused" ? "Hosting declaration incomplete (demo)." : undefined, decidedAt: st === "accepted" || st === "refused" || st === "to_complete" ? "2026-11-19 09:30" : undefined, decidedBy: st === "accepted" || st === "refused" || st === "to_complete" ? "MPL Admin (DEMO)" : undefined };
  const submitted = Object.values(lines).some((l) => l.status !== "draft");
  return { id: `ENG-${spec.club}-2027`, clubId: spec.club, season: 2027, form, lines: { ...newLines(form), ...lines }, version: submitted ? 1 : 0, versions: submitted ? [{ n: 1, at: AT, by: "Club Admin (DEMO)", reason: "Initial submission", form: JSON.parse(JSON.stringify(form)), lines: JSON.parse(JSON.stringify(Object.fromEntries(Object.keys(lines).map((d) => [d, { status: "submitted" }])))) }] : [], history: [{ at: AT, actor: "Club Admin (DEMO)", action: submitted ? "Submitted (version 1)" : "Draft created" }, ...Object.entries(lines).filter(([, l]) => l.decidedAt).map(([d, l]) => ({ at: l.decidedAt!, actor: "MPL Admin (DEMO)", action: l.status === "accepted" ? "Line accepted (simulated decision — not an official validation)" : l.status === "refused" ? "Line refused (simulated decision — not an official validation)" : "More information requested (simulated decision)", division: d, note: l.note }))], createdAt: AT, updatedAt: AT, seeded: true };
}
export const seedDossiers = (): Dossier[] => SPECS.filter((s) => !!clubById(s.club)).map(build);
