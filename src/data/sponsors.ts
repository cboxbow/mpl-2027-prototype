/** Bibliothèque d'assets partenaires. AUCUN n'est affiché comme partenaire 2027 : statut « à confirmer ».
 *  Exclus volontairement : Secure Services, Padel Federation, Smart, Kabisa/Red Bull, Urban Sport (club, pas sponsor). */
export interface SponsorAsset { id: string; name: string; file: string; status: "2026-to-confirm" | "confirmed-2027" }
export const SPONSOR_ASSETS: SponsorAsset[] = [
  ["afrasia", "AfrAsia"], ["beachcomber", "Beachcomber"], ["colour-tone", "Colour Tone"], ["crystal", "Crystal"], ["dove", "Dove"],
  ["heineken", "Heineken"], ["leal", "Leal"], ["metal-concept", "Metal Concept"], ["padel-house", "Padel House"],
  ["protez-moris", "Protez Moris"], ["sanpellegrino", "San Pellegrino"], ["sis", "SIS"], ["varta", "Varta"],
].map(([id, name]) => ({ id, name, file: `/assets/sponsors/${id}.${id === "varta" ? "svg" : "png"}`, status: "2026-to-confirm" as const }));
