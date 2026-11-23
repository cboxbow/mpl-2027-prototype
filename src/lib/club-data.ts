import type { CourtItem, StaffMember } from "@/lib/demo-state";
import { clubById } from "@/data/clubs";

/** Équipe fictive par défaut d'un club (aucune donnée personnelle réelle). */
export function defaultStaff(clubId: string): StaffMember[] {
  const n = clubById(clubId)?.name ?? clubId;
  return [
    { id: `${clubId}-adm`, name: `Responsable ${n} (fictif)`, role: "club_admin", email: "admin@demo.invalid" },
    { id: `${clubId}-stf`, name: `Accueil ${n} (fictif)`, role: "club_staff", email: "staff@demo.invalid" },
    { id: `${clubId}-dir`, name: `Directeur de tournoi ${n} (fictif)`, role: "director", email: "directeur@demo.invalid" },
  ];
}
/** Terrains par défaut, dérivés du nombre maximal de terrains du calendrier. */
export function defaultCourts(clubId: string): CourtItem[] {
  const max = clubById(clubId)?.courtsMax ?? 2;
  return Array.from({ length: max }, (_, i) => ({ id: `${clubId}-c${i + 1}`, name: `Court ${i + 1}`, surface: "Panoramic", covered: i % 2 === 0, active: true }));
}
export const csvOf = (rows: Array<Array<string | number>>) => rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
export function downloadCsv(name: string, rows: Array<Array<string | number>>) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csvOf(rows)], { type: "text/csv" })); a.download = name; a.click(); }
