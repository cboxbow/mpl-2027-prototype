# MPL 2027 — DESIGN PROTOTYPE

Prototype visuel interactif de la future plateforme **Mauritius Padel League 2027**.
**Données 100 % fictives (sauf calendrier V4 et noms des 18 clubs). Aucun backend, aucun paiement réel, aucun déploiement.**

## Lancer sur Windows (Node.js 20+ requis)

```bash
cd mpl-2027-prototype
npm install
npm run dev        # http://localhost:5273
```

Autres commandes : `npm run build` (compilation), `npm run preview` (test du build), `npm run typecheck`, `npm run data` (régénère le calendrier depuis `data-source/MPL_2027_CALENDRIER_V4.csv`).

## Écrans du premier lot (7)

| # | Écran | Route |
|---|-------|-------|
| 1 | Accueil | `/#/` |
| 2 | Calendrier (liste, mois, filtres, export CSV) | `/#/calendar` |
| 3 | Fiche tournoi (infos, inscrits, tableau, planning, résultats, assistant d'inscription) | `/#/tournaments/RMT-M500-2` |
| 4 | Classements (Hommes, Dames, Mixte) + fiche joueur | `/#/rankings` |
| 5 | Espace joueur | `/#/player` |
| 6 | Espace organisateur | `/#/organizer` |
| 7 | Administration MPL | `/#/admin` |

Pas d'authentification : le **sélecteur de rôle** (menu en haut à droite) bascule Visiteur / Joueur / Organisateur / Admin MPL. « Reset demo data » remet l'état initial. La date de démonstration est fixée au **10 mars 2027** (`src/lib/format.ts`).

## Garde-fous respectés

- Aucune connexion Supabase, aucune clé, aucune donnée personnelle réelle, aucun appel réseau applicatif (seules les tuiles OpenStreetMap de la carte sont chargées).
- Aucun fichier de WEB OFFICIAL MPL modifié ; seuls les éléments nécessaires ont été **copiés** (logos, CSV, composants UI).
- Bandeau permanent « MPL 2027 — DESIGN PROTOTYPE » ; badges DEMO sur toute donnée fictive.
- Classement : règle **Top 8** (jamais Best 10). Moteur de tirage réglementaire **non** simulé comme opérationnel.
- Partenaires : aucun présenté comme partenaire 2027 (emplacements « à confirmer »). Exclus : Secure Services, Padel Federation, Smart, Kabisa, Urban Sport (club).

## Structure

```
src/pages/            écrans (Home, Calendar, Tournament, Rankings, player/, organizer/, admin/)
src/components/ui/    shadcn/ui (copiés du site 2027, Radix)
src/components/mpl/   composants métier (badges, cartes, carte Leaflet, assistant d'inscription)
src/data/             calendrier généré, clubs, données de démo déterministes, bibliothèque partenaires
src/lib/              thème, i18n EN/FR, store de démo, formats et règles de statut
docs/                 design system, plan des pages, parcours, simulé / restant à faire
```
Documents détaillés : `docs/DESIGN_SYSTEM.md`, `docs/PAGE_MAP.md`, `docs/USER_JOURNEYS.md`, `docs/SIMULATED_FEATURES.md`, `docs/REMAINING_FEATURES.md`.

## Vague C — Portail club et espace juge-arbitre
Écrans 13 (`/#/club`) et 15 (`/#/referee`), matrice de permissions (Admin MPL → Permissions), cycle de publication des tableaux et corrections exceptionnelles. Documentation : `docs/ux-review/12_VAGUE_C.md`. Permissions de démonstration, pas une sécurité de production.
