/* GÉNÉRÉ depuis DECISIONS_REGLEMENTAIRES_2027_FINALISATION.md (phase 4D.0). Lecture seule : aucune règle n'est approuvée sauf DEC-IC-33 (décision documentée N0). */
import type { RuleDef } from "./rules";
export const RULES: RuleDef[] = [
 {
  "id": "DEC-IC-01",
  "num": 1,
  "subject": "Source réglementaire qui fait foi",
  "subjectEn": "Governing regulatory source",
  "proposal": "La lettre joint le « Référentiel réglementaire MPL v3.0 » ; le formulaire renvoie au « Référentiel réglementaire MPL Interclub » ; D-037 et le classeur calendrier parlent du « format Référentiel v3.0 ».",
  "source": "LETTRE p.2 (pièces jointes) ; FORM p.3 §6 ; N0 D-037 ; classeur CAL, onglet CALENDRIER (bandeau)",
  "contradiction": "Deux documents distincts s'appellent v3.0 (RR du 30/06 et RIC du 22/07/2026). Le RR v3.1 (07/07) est archivé et renvoie ses chiffres à un CHB absent. Hiérarchie « N2 » jamais ratifiée.",
  "status": "contradictory",
  "devNote": "Chaque règle porte `ruleSource` (document + article + niveau). Aucun libellé « règlement officiel ». Non bloquant pour le démarrage.",
  "arbitration": "Désigner le texte de référence 2027 et la procédure pour le compléter (Référentiel v4.0 ou CHB 2027).",
  "impacts": {
   "D1": {
    "l": "red",
    "n": "le formulaire cite le texte de référence"
   },
   "D2": {
    "l": "orange",
    "n": ""
   },
   "D3": {
    "l": "orange",
    "n": ""
   },
   "D4": {
    "l": "orange",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-02",
  "num": 2,
  "subject": "Dates de saison et calendrier",
  "subjectEn": "Season dates and calendar",
  "proposal": "10 vendredis 17h00–21h00 : J1 19/02, J2 19/03, J3 16/04, J4 21/05, J5 18/06, J6 16/07, pause en août, J7 17/09, J8 15/10, J9 12/11, J10 26/11. Inscriptions 15/11 → 11/12/2026, publication 18/12, capitaines 09/01/2027. Lancement officiel « début février, à fixer ».",
  "source": "CAL v2 (tableau et frise) ; DECK 6/14 et 8/14 ; LETTRE p.1–2 ; N0 D-037 (13/11/2026, « DECIDED » pour l'option A, dates « PROVISIONAL ») ; classeur CAL, onglet CONTRÔLES",
  "contradiction": "RIC §7.1 (J1 16/10/2026) OBSOLÈTE ; D-015 (« janvier → juillet ») remplacé ; J1 29/01 encore dans le dossier sponsor v9 et dans les notes du .pptx ; J9 et J10 ne sont pas des 3es vendredis ; J1 tombe pendant le Ramadan ; ouverture du 15/11 déjà passée.",
  "status": "proposed",
  "devNote": "Calendrier en données configurables (journées, dates, pause, statut), jamais en constantes. Import du calendrier v2 comme jeu « proposé ». Non bloquant.",
  "arbitration": "Valider les 10 dates, le lancement début février, J1 pendant le Ramadan, la pause réduite à août.",
  "impacts": {
   "D1": {
    "l": "green",
    "n": ""
   },
   "D2": {
    "l": "red",
    "n": "hôtes et dates à publier"
   },
   "D3": {
    "l": "green",
    "n": ""
   },
   "D4": {
    "l": "green",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-03",
  "num": 3,
  "subject": "Conditions d'engagement d'un club",
  "subjectEn": "Club engagement conditions",
  "proposal": "Une équipe maximum par club et par division ; engagement par formulaire signé ; le club certifie « disposer d'au moins 2 terrains homologués, ou d'une convention avec un club partenaire ».",
  "source": "FORM p.1 §2 et p.3 §6",
  "contradiction": "RIC §3.1 : 2 terrains ; RIC §11.1 et RR §3.1 : 1 terrain ; la « convention avec un club partenaire » n'existe dans aucun règlement ; CDC v3 §2.4 autorise 2 équipes dans 2 divisions (OBSOLÈTE).",
  "status": "contradictory",
  "devNote": "Contrôle « 1 équipe par club et division » paramétrable ; minimum de terrains et alternative « convention » = paramètres.",
  "arbitration": "Minimum de terrains ; reconnaissance d'une convention de partenariat ; possibilité de deux équipes dans deux divisions.",
  "impacts": {
   "D1": {
    "l": "red",
    "n": ""
   },
   "D2": {
    "l": "green",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-04",
  "num": 4,
  "subject": "Tarif par équipe",
  "subjectEn": "Fee per team",
  "proposal": "Rs 5 000 par équipe, à régler après la publication des poules (« proposés »).",
  "source": "FORM p.3 §6 ; LETTRE p.2 ; DECK 14/14 ; RIC §8.1",
  "contradiction": "RR §7.2 « Voir CHB » ; CDC v3 : Rs 20 000 → 6 500 ou Rs 15 000 + caution (OBSOLÈTE) ; cumul avec l'affiliation MTF non tranché (CONTRADICTIONS F1).",
  "status": "proposed",
  "devNote": "Champ « droits d'inscription » configurable ; statut « à régler » simulé ; aucun paiement réel ; pas de caution.",
  "arbitration": "Montant définitif, caution éventuelle, cumul avec l'affiliation MTF, qui encaisse.",
  "impacts": {
   "D1": {
    "l": "green",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-05",
  "num": 5,
  "subject": "Divisions, niveaux et nombre d'équipes",
  "subjectEn": "Divisions, levels and number of teams",
  "proposal": "7 divisions : D1H Masters 6, D2H Challenger 12, D3H Open 12, D4H Rising 16, D1F Masters 4, D2F Challenger 6, D3F Open 8 = 64 « maximum de conception » ; les effectifs sont des maximums.",
  "source": "DECK 3/14 ; LETTRE p.1 ; FORM p.1 §2 ; N0 D-015 (64 = PROVISIONAL MAXIMUM) ; D-012",
  "contradiction": "26 équipes seulement affectées en juin 2026 ; D2H « suspendue » (note Comité 22/06, sans vote ; CDC v4, OBSOLÈTE) contre 12 équipes (RIC) ; RR « Voir CHB » ; nomenclature Élite/National/Régional (CDC v2–v4, OBSOLÈTE) contre Masters/Challenger/Open/Rising.",
  "status": "proposed",
  "devNote": "Table de divisions configurable (code, nom, maximum, active/suspendue). Jamais « 64 équipes » présenté comme un fait (D-019).",
  "arbitration": "Ouverture ou suspension de D2H ; plafond d'équipes ; nomenclature définitive.",
  "impacts": {
   "D1": {
    "l": "red",
    "n": "publication des poules"
   },
   "D2": {
    "l": "orange",
    "n": "charge par vendredi"
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "orange",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-06",
  "num": 6,
  "subject": "Format d'une division (poules, aller-retour)",
  "subjectEn": "Division format (pools, home and away)",
  "proposal": "D1H poule de 6 aller-retour ; D2H et D3H 3 poules de 4 ; D4H 4 poules de 4 ; D1F poule de 4 ; D2F poule de 6 ; D3F 2 poules de 4. « Le format définitif de chaque division est arrêté par la Commission MPL après les inscriptions. » ½ finales J7, finales J8.",
  "source": "DECK 3/14 et 5/14 ; LETTRE p.1 ; RIC §2.1 ; classeur CAL, onglet PAR DIVISION",
  "contradiction": "RIC §2.1 : « plus de 6 équipes → deux poules » contredit les 3 et 4 poules du tableau ; EN v2.1 : seuil « plus de 8 » ; 3 poules → 4 places en ½ finale : règle « à écrire dans le Référentiel » (DECK 5/14) ; alternative « 2 poules de 6 en aller simple ».",
  "status": "contradictory",
  "devNote": "Poules, aller-retour, nombre de journées, qualifiés = paramètres par division, recalculés selon les équipes réellement engagées.",
  "arbitration": "Règle de création des poules ; qualifiés en ½ finale quand le nombre de poules n'est pas 2 ou 4.",
  "impacts": {
   "D1": {
    "l": "orange",
    "n": ""
   },
   "D2": {
    "l": "orange",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "orange",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-07",
  "num": 7,
  "subject": "Équipes : effectif et capitaine",
  "subjectEn": "Teams: squad and captain",
  "proposal": "Une rencontre se joue en 3 paires ; « 6 joueurs minimum et 9 maximum par rencontre » ; un responsable officiel unique par club (capitaine ou responsable Interclub) ; liste de joueurs à remplir (12 lignes, tableau complémentaire au-delà).",
  "source": "FORM p.2–3 §3 et §5 ; RIC §4.3, §6.1",
  "contradiction": "RIC §4.3 précise que 6–9 vaut « exclusivement pour la Saison Fondatrice » ; CDC v4 §4.1 : 4 à 8 joueurs (OBSOLÈTE) ; V1 : 5/4/4/3 paires (OBSOLÈTE) ; les 12 lignes du formulaire ne sont pas un plafond d'effectif.",
  "status": "proposed",
  "devNote": "Plafond de la feuille 6–9 en paramètre ; effectif total sans plafond par défaut, plafond configurable.",
  "arbitration": "Effectif minimum et maximum d'une équipe ; capitaine distinct du responsable officiel ?",
  "impacts": {
   "D1": {
    "l": "green",
    "n": ""
   },
   "D2": {
    "l": "orange",
    "n": ""
   },
   "D3": {
    "l": "green",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-08",
  "num": 8,
  "subject": "Seuils d'éligibilité par division",
  "subjectEn": "Eligibility thresholds per division",
  "proposal": "Aucun seuil chiffré dans les documents 2027. Le formulaire demande le « rang MPL à la clôture, NC si non classé ».",
  "source": "FORM p.2 §5 ; RIC §4.2 ; RR §4.2",
  "contradiction": "RIC §4.2 ambigu (« 1 – / 41 – / 151 – / 300 et + ») ; RR « Voir CHB » ; CDC v3 §3.3 : D2H 51 ; grille P1/P2/P3 de la Simulation v3 (CDC v4 §3) ; note Comité #2 sans vote.",
  "status": "to_decide",
  "devNote": "Table de seuils avec 3 jeux de valeurs sélectionnables, aucun actif par défaut ; l'éligibilité affiche des avertissements, sans blocage.",
  "arbitration": "Jeu de seuils pour 2027 et règle d'interprétation (plancher, plafond, par paire).",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "red",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-09",
  "num": 9,
  "subject": "Rang de référence et date de figement",
  "subjectEn": "Reference ranking and freeze date",
  "proposal": "Le classement officiel est figé à la clôture des inscriptions (11/12/2026) pour constituer les divisions ; « Rang MPL » demandé par joueur.",
  "source": "LETTRE p.2 (tableau d'inscription) ; DECK 8/14 ; FORM p.2 §5 ; classeur CAL, POINTS À VALIDER n°10",
  "contradiction": "RIC §4.1 « date de clôture » ou « 31 août » dans la même page (CONTRADICTIONS C2) ; ranking mensuel publié par ailleurs.",
  "status": "proposed",
  "devNote": "Date de snapshot configurable ; classement figé versionné (copie datée) ; données fictives dans le prototype.",
  "arbitration": "Confirmer le 11/12/2026 ; que devient un joueur dont le rang change ensuite ?",
  "impacts": {
   "D1": {
    "l": "green",
    "n": ""
   },
   "D2": {
    "l": "red",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-10",
  "num": 10,
  "subject": "Licence, rattachement, transferts",
  "subjectEn": "Licence, club attachment, transfers",
  "proposal": "Un joueur n'appartient qu'à un seul club pour la saison ; les joueurs listés appartiennent exclusivement au club pour la Saison 1.",
  "source": "FORM p.2 (intro §5) et p.3 §6 ; RIC §3.2–3.3",
  "contradiction": "RIC §3.3 : exclusivité « définitive dès la première rencontre » (le formulaire la place dès l'engagement) ; fenêtres de transfert V1 (janvier) et CAP v2.1 (juin) OBSOLÈTES ; licence MTF Multi-Racket non tranchée.",
  "status": "proposed",
  "devNote": "Contrôle d'exclusivité entre engagements ; date de verrouillage en paramètre ; aucun transfert en saison par défaut.",
  "arbitration": "Moment du verrouillage (engagement ou 1re rencontre) ; exceptions de force majeure ; licence MTF.",
  "impacts": {
   "D1": {
    "l": "green",
    "n": ""
   },
   "D2": {
    "l": "orange",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-11",
  "num": 11,
  "subject": "Non-classés, étrangers, juniors",
  "subjectEn": "Unranked, foreign and junior players",
  "proposal": "Le formulaire accepte « NC » (non classé). Aucune règle 2027 pour les étrangers ni pour les juniors.",
  "source": "FORM p.2 §5 ; RIC §4.1",
  "contradiction": "RIC §4.1 : NC en Paire 3 uniquement, à partir de D3 ; RIC §6.2 : composition « libre ».",
  "status": "contradictory",
  "devNote": "Contrôle NC configurable ; aucune règle étrangers ou juniors dans le prototype.",
  "arbitration": "Statut des NC, des étrangers et des juniors.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "orange",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-12",
  "num": 12,
  "subject": "Composition des paires P1/P2/P3",
  "subjectEn": "Pair composition P1/P2/P3",
  "proposal": "Chaque club aligne 3 paires (P1, P2, P3) ; match 1 : P1 contre P1, match 2 : P2 contre P2, match 3 : P3 contre P3. Le formulaire demande la paire (P1/P2/P3) de chaque joueur.",
  "source": "DECK 4/14 ; FORM p.2–3 §5 ; RIC §4.3, §6.2",
  "contradiction": "RIC : « ordre des paires : aléatoire », « composition libre » ; CDC v3 §4.3 : poids cumulé P1 ≥ P2 ≥ P3 ; CDC v4 : seuils par paire (OBSOLÈTE).",
  "status": "contradictory",
  "devNote": "Mode de contrôle configurable (« libre », « poids cumulé », « seuils P1-P2-P3 ») ; avertissements non bloquants. Structurant pour la feuille de match.",
  "arbitration": "Une paire est-elle liée à une position (P1/P2/P3) ? Ordre libre ou hiérarchique ?",
  "impacts": {
   "D1": {
    "l": "green",
    "n": "formulaire"
   },
   "D2": {
    "l": "red",
    "n": ""
   },
   "D3": {
    "l": "orange",
    "n": "feuille de match"
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-13",
  "num": 13,
  "subject": "Remise de composition et remplacements",
  "subjectEn": "Lineup submission and replacements",
  "proposal": "Composition remise 15 minutes avant la rencontre ; forfait partiel signalé 2 h avant ; capitaine remplaçant désigné 24 h avant.",
  "source": "RIC §5.2, §6.1, §6.2 ; classeur CAL, POINTS À VALIDER n°13",
  "contradiction": "T−15 min tombe à 16h45, avant la fenêtre 17h00 ; V1 et CAP v2.1 : H−20 (OBSOLÈTE) ; remplacement en cours de rencontre : CDC v3 seulement (OBSOLÈTE).",
  "status": "proposed",
  "devNote": "Échéances (15 min, 2 h, 24 h) en paramètres.",
  "arbitration": "Heure d'accueil ou premier échauffement à 17h15.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "green",
    "n": ""
   },
   "D3": {
    "l": "green",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-14",
  "num": 14,
  "subject": "Joueur dans plusieurs équipes (brûlage)",
  "subjectEn": "Player in several teams (burn rule)",
  "proposal": "Mobilité ascendante ; dès 2 rencontres jouées en division supérieure, inéligible en division inférieure pour la saison ; dérogation « blessures multiples » sous 48 h.",
  "source": "RIC §4.4 ; RR §4.4 ; CDC v3 §4.4 (archivé)",
  "contradiction": "Aucune contradiction trouvée, mais absente des documents 2027 (formulaire et présentation silencieux) : présente dans trois documents 2026, jamais approuvée.",
  "status": "proposed",
  "devNote": "Compteur automatique par joueur ; seuil « 2 » et dérogation paramétrables.",
  "arbitration": "Confirmer la règle pour 2027.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "orange",
    "n": ""
   },
   "D3": {
    "l": "green",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-15",
  "num": 15,
  "subject": "Aller-retour et Journées Interclub",
  "subjectEn": "Home and away legs and Interclub days",
  "proposal": "Poules en aller-retour ; plusieurs sites en simultané ; Friday Nights de 17h00 à 21h00 ; un club hôte reçoit environ une rencontre sur deux.",
  "source": "DECK 3/14, 4/14, 10/14 ; CAL v2 ; N0 D-015 (base de travail) ; RR §16",
  "contradiction": "Classeur : « Équipe A = club hôte » contre LETTRE « clubs hôtes désignés après le tirage » ; aller simple en D2–D4 (CDC v3, OBSOLÈTE) ; « 8h–10h » (EN v2.1, OBSOLÈTE).",
  "status": "proposed",
  "devNote": "Rencontre = date + site + équipes ; le site n'est pas forcément le club de l'équipe A.",
  "arbitration": "Règle de désignation du club hôte (club de l'équipe A ou désigné par MPL).",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "red",
    "n": "affectation des hôtes"
   },
   "D3": {
    "l": "green",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-16",
  "num": 16,
  "subject": "Report ou avance d'une rencontre",
  "subjectEn": "Postponing or advancing a tie",
  "proposal": "Aucune règle 2027. Les anciens CDC prévoyaient un report dans les 14 jours avec accord de la Commission technique.",
  "source": "CDC v3 §8.3 (archivé) ; V1 Art. 4 (72 h) ; RIC et RR silencieux",
  "contradiction": "Aucune règle de référence à opposer.",
  "status": "to_decide",
  "devNote": "Flux « demande de report → décision MPL » avec délai paramétrable ; valeurs CDC v3 présentées comme ancienne proposition.",
  "arbitration": "Règle de report, délais, pénalités.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "orange",
    "n": ""
   },
   "D3": {
    "l": "green",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-17",
  "num": 17,
  "subject": "Format des matchs (sets, 3e set)",
  "subjectEn": "Match format (sets, 3rd set)",
  "proposal": "Format de match de référence : 2 sets de 6 et super tie-break, environ 90 minutes ; D4H et D3F : Format A ou C à trancher.",
  "source": "DECK 4/14 et 13/14 ; RIC §5.1 ; RR §5.1 ; CDC v3 §7.1",
  "contradiction": "RIC : Format A seul, D4H et D3F non définis ; RR : A et B pour D2H/D2F/D3H, C « 2×6 jeux + GTB » ; CDC v3 et note Comité : C = 2 sets de 4 jeux ; GTB à 10 ou tie-break à 7.",
  "status": "contradictory",
  "devNote": "Règle de match par division : sets, jeux par set, mode du 3e set. Structurant : le nombre de sets saisis varie.",
  "arbitration": "Formats A, B, C ; format de D4H et D3F ; 3e set.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "red",
    "n": ""
   },
   "D4": {
    "l": "orange",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-18",
  "num": 18,
  "subject": "Arbitrage",
  "subjectEn": "Refereeing",
  "proposal": "Aucune règle 2027. Référentiels : arbitrage et discipline confiés à la Commission Technique ; désignation des arbitres avant la journée.",
  "source": "RIC §1.3 ; RR §1.3, §16.1",
  "contradiction": "CDC v3 : arbitre en D1H seulement ; CDC v4 : pas d'arbitre officiel en saison 1 ; EN v2.1 : 1 arbitre par rencontre.",
  "status": "to_decide",
  "devNote": "Rôle « responsable de rencontre » facultatif ; saisie possible sans arbitre.",
  "arbitration": "Arbitre obligatoire par division ? Qui désigne ?",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "orange",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-19",
  "num": 19,
  "subject": "Feuille de match",
  "subjectEn": "Match sheet",
  "proposal": "Feuille officielle 2026 : division, journée, date, lieu, clubs, 3 paires (joueurs, 3 sets, vainqueur), observations, signatures des capitaines et d'un délégué MPL.",
  "source": "FEUILLE_MATCH_Officielle_Interclub2026 (22/06/2026) ; RIC §6.2",
  "contradiction": "Ordre P1 / P2 / P3 imposé par la feuille contre ordre « aléatoire » du RIC ; la feuille porte « 2026 ».",
  "status": "proposed",
  "devNote": "Feuille numérique calquée sur le modèle ; signatures simulées.",
  "arbitration": "Reprendre la feuille 2026 pour 2027 (renommage).",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "green",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-20",
  "num": 20,
  "subject": "Validation des résultats",
  "subjectEn": "Result validation",
  "proposal": "Résultats saisis puis homologués par le Secrétariat MPL sous 48 h ; seuls les résultats validés sont publiés.",
  "source": "RIC §1.3 ; RR §15.1, §16.3",
  "contradiction": "Procédure de contestation 48 h / 7 j / 14 j (RIC §10.3) contre 24 h / 72 h (CDC v3, OBSOLÈTE). Absent des documents 2027.",
  "status": "proposed",
  "devNote": "Statuts « brouillon → à valider → validé » ; délai de 48 h paramétrable.",
  "arbitration": "Confirmer le délai et le rôle de validation.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "orange",
    "n": ""
   },
   "D4": {
    "l": "green",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-21",
  "num": 21,
  "subject": "Barème de points de rencontre",
  "subjectEn": "Tie points scale",
  "proposal": "3-0 : 3 points au vainqueur, 0 au perdant ; 2-1 : 2 points au vainqueur, 1 au perdant.",
  "source": "RIC §5.3 ; RR §5.3 ; CDC v3 §7.3",
  "contradiction": "« Victoire = 3 points » (README dashboard et CLASSEMENTS) ; 2 points (CAP v2.1) ; 6/4/3 (V1, OBSOLÈTE) ; absent des documents 2027.",
  "status": "proposed",
  "devNote": "Barème en paramètres ; classement toujours calculé.",
  "arbitration": "Confirmer le barème.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "green",
    "n": ""
   },
   "D4": {
    "l": "orange",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-22",
  "num": 22,
  "subject": "Critères de départage",
  "subjectEn": "Tie-break criteria",
  "proposal": "Victoires, puis paires gagnées, différence de sets, différence de jeux, confrontation directe, puis barrage ou tirage au sort.",
  "source": "RIC §5.4 ; RR §5.4 ; CDC v3 §7.4",
  "contradiction": "CDC v4 §7.2 : confrontation directe en premier (OBSOLÈTE) ; le classement « aux points » n'est pas écrit comme premier critère.",
  "status": "proposed",
  "devNote": "Liste ordonnée de critères configurable ; barrage et tirage = décisions humaines.",
  "arbitration": "Ordre définitif des critères.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "orange",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-23",
  "num": 23,
  "subject": "Phases finales et qualification",
  "subjectEn": "Finals and qualification",
  "proposal": "½ finales J7 (D2H, D3H, D4H, D3F), finales J8 ; D1H et D2F : champion au classement en J10 ; D1F : champion en J6. 3 poules pour 4 places : « règle du meilleur 2e (ou 2 poules de 6 en aller simple) », « à écrire dans le Référentiel ».",
  "source": "DECK 5/14, 13/14 ; CAL v2 ; classeur CAL, POINTS À VALIDER n°6 et 7",
  "contradiction": "D3F : ½ finales + finale (27 rencontres) ou finale seule (25) ; libellés « phase finale » en J9 et J10 pour D1H et D2F ; barrage CDC v3 §12.4.",
  "status": "to_decide",
  "devNote": "Phase finale paramétrée par division (aucune, finale, ½ + finale) ; qualifiés configurables avec option « meilleur 2e ». Structurant pour D4.",
  "arbitration": "Règle de qualification pour 3 poules ; D3F.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "red",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-24",
  "num": 24,
  "subject": "Programme et lieu des finales",
  "subjectEn": "Finals programme and venue",
  "proposal": "Finales D2H, D3H, D4H, D3F le 15/10 ; D1H et D2F les 12 et 26/11 ; lieu non défini.",
  "source": "CAL v2 ; N0 D-037 ; classeur CAL, onglet VARIANTE 7 VENDREDIS",
  "contradiction": "Dossier sponsor v8 : Grande Finale le samedi 20/11 (conflit avec le M1500 Moka Rangers 19–20/11, OBSOLÈTE par D-037) ; variante « 7 vendredis + Grande Finale un samedi d'octobre » non retenue.",
  "status": "proposed",
  "devNote": "Site de finale = champ libre ; aucun lieu présumé.",
  "arbitration": "Lieu, horaires, formule (vendredi ou Grande Finale).",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "orange",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-25",
  "num": 25,
  "subject": "Forfaits : délai et déclaration",
  "subjectEn": "Forfeits: deadline and declaration",
  "proposal": "Moins de 6 joueurs : forfait ; forfait partiel signalé 2 h avant ; forfait déclaré moins de 48 h avant : Rs 2 000 ; non-présentation : Rs 5 000.",
  "source": "RIC §4.3, §6.2, §10.2 ; RR §10.2",
  "contradiction": "RR : montants « Voir CHB » ; aucune règle pour un forfait déclaré plus de 48 h avant ; absent des documents 2027.",
  "status": "proposed",
  "devNote": "Flux de déclaration horodaté ; montants affichés « à confirmer », sans paiement.",
  "arbitration": "Confirmer délais et montants.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "green",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-26",
  "num": 26,
  "subject": "Forfaits : score attribué",
  "subjectEn": "Forfeits: score awarded",
  "proposal": "Forfait partiel : 0-6 0-6 pour la paire absente. Forfait total : « 3 points par WO et −1 point au classement » ou « résultat 0-3 attribué ».",
  "source": "RIC §5.3 et §10.2 ; RR idem ; CDC v3 §7.3 ; EN v2.1",
  "contradiction": "Contradiction dans le même document (CONTRADICTIONS C11) ; CDC v2–v4 : 0 point.",
  "status": "contradictory",
  "devNote": "Deux modes configurables, aucun actif tant que non tranché. Structurant pour le classement.",
  "arbitration": "Choisir le score et les points d'un forfait total.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "red",
    "n": ""
   },
   "D4": {
    "l": "orange",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-27",
  "num": 27,
  "subject": "Forfaits : sanctions",
  "subjectEn": "Forfeits: sanctions",
  "proposal": "Deux forfaits dans la saison : exclusion de la division ; joueur non éligible : résultat de la paire annulé ; grille disciplinaire.",
  "source": "RIC §10.1–10.2 ; RR §10.1–10.2",
  "contradiction": "Montants et caution « Voir CHB » (RR) ; CDC v3 : perte de la caution ; conséquences d'une exclusion non décrites.",
  "status": "proposed",
  "devNote": "Compteur de forfaits automatique ; décision de sanction toujours humaine.",
  "arbitration": "Montants ; effet d'une exclusion sur la division et le calendrier.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "green",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-28",
  "num": 28,
  "subject": "Gouvernance, tutelle et organe d'appel",
  "subjectEn": "Governance, supervisory body and appeal body",
  "proposal": "La lettre est émise par MPL et MSRA ; la tutelle « MSRA ou MTF » est un point à trancher ; l'accord-cadre MTF / MPL du 31/10 est « dépassé : à décider, bloquant ».",
  "source": "LETTRE p.1 et signature ; DECK 13/14 ; classeur CAL, onglet CALENDRIER et POINTS À VALIDER n°3 ; RIC §1.3, §10.3",
  "contradiction": "Circulaire MTF du 31/08/2026 (padel sous la MTF), absente du dossier ; appel final MSRA (RIC) contre commission d'appel ou MTF (CONTRADICTIONS E13, H1).",
  "status": "contradictory",
  "devNote": "« Autorité de tutelle » et « organe d'appel » = textes configurables, neutres par défaut.",
  "arbitration": "Tutelle, organe d'appel, nom de la compétition.",
  "impacts": {
   "D1": {
    "l": "red",
    "n": "libellés officiels"
   },
   "D2": {
    "l": "orange",
    "n": ""
   },
   "D3": {
    "l": "orange",
    "n": "appel"
   },
   "D4": {
    "l": "orange",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-29",
  "num": 29,
  "subject": "Correction d'un résultat validé",
  "subjectEn": "Correction of a validated result",
  "proposal": "Aucune règle dans les référentiels ni dans les documents 2027.",
  "source": "Recherche dans RIC, RR, CDC v2–v4, V1, DECK, FORM, LETTRE : rien",
  "contradiction": "Sans objet.",
  "status": "to_decide",
  "devNote": "Réutiliser le mécanisme du prototype (demande → décision MPL → archivage), étiqueté « démonstration, non réglementaire ».",
  "arbitration": "Qui peut corriger, dans quel délai, avec quelle trace.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "red",
    "n": ""
   },
   "D4": {
    "l": "",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-30",
  "num": 30,
  "subject": "Délais de publication",
  "subjectEn": "Publication deadlines",
  "proposal": "Résultats saisis sous 24 h ; club hôte informe le visiteur ≥ 7 jours avant ; poules communiquées ≥ 4 semaines avant la saison ; publication des divisions le 18/12/2026.",
  "source": "RIC §11.2, §2.1 ; DECK 8/14 ; LETTRE p.2",
  "contradiction": "V1 : 2 h ; CDC v3 §14.1 : 48 h (OBSOLÈTES). La publication du 18/12 est à 9 semaines de J1, la règle des 4 semaines est donc respectée.",
  "status": "proposed",
  "devNote": "Délais en paramètres ; alertes de retard non sanctionnantes.",
  "arbitration": "Confirmer les délais.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "green",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-31",
  "num": 31,
  "subject": "Données publiques et données personnelles",
  "subjectEn": "Public data and personal data",
  "proposal": "Classements, résultats et décisions publiés (transparence). Le formulaire collecte noms, rangs et paires de joueurs.",
  "source": "RR « Principes fondamentaux », §12.2, §15 ; FORM p.2–3 §5",
  "contradiction": "Le formulaire ne mentionne ni finalité ni consentement pour les données de joueurs ; fichiers de listes de joueurs marqués « ne pas diffuser » (DOCUMENT_INDEX).",
  "status": "proposed",
  "devNote": "Pages publiques = classements et résultats validés ; effectifs détaillés réservés au club et à MPL ; noms fictifs.",
  "arbitration": "Politique de données personnelles et publication des effectifs (à faire valider juridiquement).",
  "impacts": {
   "D1": {
    "l": "orange",
    "n": "données des joueurs"
   },
   "D2": {
    "l": "orange",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "red",
    "n": "pages publiques"
   }
  }
 },
 {
  "id": "DEC-IC-32",
  "num": 32,
  "subject": "Nomenclature et points de ranking",
  "subjectEn": "Nomenclature and ranking points",
  "proposal": "Masters, Challenger, Open, Rising dans tous les documents 2027. Aucun barème de points de ranking en 2027.",
  "source": "DECK 3/14 ; RR §2.2 et §8.1 ; CDC v3 §7.5",
  "contradiction": "RR : D1F = M500 (§2.2) et M1000 (§8.1) ; CDC v3 : M500 = 120/80 points ; double nomenclature Élite/National (CDC, OBSOLÈTE).",
  "status": "contradictory",
  "devNote": "Correspondance division / niveau et barème en paramètres, sans effet sur un classement réel.",
  "arbitration": "Valorisation de l'Interclub dans le ranking.",
  "impacts": {
   "D1": {
    "l": "",
    "n": ""
   },
   "D2": {
    "l": "",
    "n": ""
   },
   "D3": {
    "l": "",
    "n": ""
   },
   "D4": {
    "l": "orange",
    "n": ""
   }
  }
 },
 {
  "id": "DEC-IC-33",
  "num": 33,
  "subject": "Langage externe et mode prévisionnel (hors périmètre)",
  "subjectEn": "External wording and forecast mode (out of scope)",
  "proposal": "Le projet reste en Forecast Mode ; langage externe « jusqu'à 64 équipes », « format provisoire », « sous réserve des inscriptions » ; la règle du cas LOW est une règle de modélisation, pas un règlement.",
  "source": "N0 D-014, D-019, D-022 (30/09/2026)",
  "contradiction": "Aucune.",
  "status": "documented",
  "devNote": "Libellés « provisoire / prévisionnel » dans toute l'interface ; aucun paiement, licence, authentification ou donnée personnelle réels (consigne du projet).",
  "arbitration": "Aucun.",
  "impacts": {
   "D1": {
    "l": "green",
    "n": ""
   },
   "D2": {
    "l": "green",
    "n": ""
   },
   "D3": {
    "l": "green",
    "n": ""
   },
   "D4": {
    "l": "green",
    "n": ""
   }
  },
  "approved": {
   "value": "Mode prévisionnel : langage externe « jusqu'à 64 équipes », « format provisoire », « sous réserve des inscriptions ».",
   "ref": "N0 D-014, D-019, D-022",
   "by": "Porteur du projet MPL (DECISIONS.md)",
   "date": "2026-09-30"
  }
 }
];
