// Métadonnées des 5 phases du jeu, utilisées à la fois par l'écran Règles du jeu
// et par l'écran Calendrier. "numero" sert à faire le lien avec la colonne
// "phase" des sessions en base (1 à 5).

export const PHASES = [
  {
    numero: 1,
    titre: "Phase 1 · Construction de l'offre politique",
    periode: "Août à décembre 2026 · une session par mois",
    resume:
      "Avant même que les candidatures ne se précisent, on pronostique la structuration du jeu politique : qui portera chaque famille, y aura-t-il union, primaire ou candidatures concurrentes.",
    questions: [
      "Qui sera le candidat principal de chaque famille politique ?",
      "Score du candidat pressenti en tête d'une famille",
      "Primaire, désignation interne, union ou candidatures concurrentes ?",
      "Telle personnalité sera-t-elle effectivement candidate ?",
    ],
  },
  {
    numero: 2,
    titre: "Phase 2 · De la candidature potentielle à la liste officielle",
    periode: "Janvier 2027 → publication de la liste officielle · deux sessions par mois puis hebdo",
    resume:
      "La campagne devient factuelle : déclarations, investitures, retraits, capacité à réunir les 500 parrainages nécessaires dans au moins 30 départements.",
    questions: [
      "Ce candidat maintiendra-t-il sa candidature jusqu'à la liste officielle ?",
      "Obtiendra-t-il ses présentations (parrainages) ?",
      "Quel candidat se retirera ou se ralliera à un autre ?",
      "Quel sera le nombre total de candidats officiels ?",
    ],
  },
  {
    numero: 3,
    titre: "Phase 3 · Pronostic du premier tour",
    periode: "Liste officielle → 18 avril 2027 · hebdomadaire, puis verrouillé la dernière semaine",
    resume:
      "On passe d'un pronostic de candidatures à un pronostic électoral complet, en mode simple (qualifiés) ou expert (scores détaillés).",
    questions: [
      "Les deux candidats qualifiés pour le second tour, et leur ordre.",
      "Le candidat arrivé troisième.",
      "Mode expert : score de chaque candidat (total 100 %), abstention.",
    ],
  },
  {
    numero: 4,
    titre: "Phase 4 · Pronostic du second tour",
    periode: "Entre le 18 avril et le 2 mai 2027",
    resume: "Tout le monde travaille sur le même duel : des prévisions plus fines deviennent possibles.",
    questions: ["Vainqueur du second tour et score des deux finalistes.", "Taux d'abstention.", "Report estimé des électeurs des candidats éliminés."],
  },
  {
    numero: 5,
    titre: "Phase 5 · Bilan et palmarès",
    periode: "Après le 2 mai 2027",
    resume: "Le classement final ne suffit pas : on revisite la campagne pour voir qui a vu juste tôt, et comment le groupe a évolué face à l'actualité.",
    questions: [
      "Classement général et classements thématiques.",
      "Meilleure anticipation précoce, meilleure calibration.",
      "Comparaison pronostic individuel / prévision collective du groupe.",
    ],
  },
];
