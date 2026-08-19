// Toutes ces fonctions travaillent sur l'objet "data" assemblé par fetchAllData() :
// { participants, ligues, adhesions, familles, candidats, sessions, questions, pronostics, resultats }

// Une question "choix multiple" est considérée comme une question de "bloc famille" (éligible
// au bonus "familles exactes") si toutes ses options de candidats appartiennent à une seule et
// même famille politique. Automatique : rien à cocher ni à configurer, ça se déduit des données.
function isFamilyBlockQuestion(q, data) {
  if (q.type !== "choix_multiple") return false;
  const ids = q.optionsCandidatIds || [];
  if (ids.length === 0) return false;
  const familyIds = new Set(ids.map((cid) => data.candidats.find((c) => c.id === cid)?.familleId).filter(Boolean));
  return familyIds.size === 1;
}

export function reponsesEgales(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return [...a].sort().join("|") === [...b].sort().join("|");
  }
  return a === b;
}

// Normalise un nom pour comparer un pari en texte libre (accents, casse, espaces ignorés)
export function normaliseNom(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

// Barème progressif pour une estimation numérique (score en %) : chaque joueur est évalué
// indépendamment des autres, en fonction de l'écart entre son pronostic et le résultat officiel.
// Deux paliers selon que le résultat officiel est un "petit" score (<10 %) ou non, pour rester
// équitable envers les petits candidats (un écart de 2 points n'a pas le même sens sur un score
// de 2 % que sur un score de 25 %).
const PALIERS_GRAND_SCORE = [
  [0.5, 1],
  [1, 0.75],
  [2, 0.5],
  [3, 0.25],
];
const PALIERS_PETIT_SCORE = [
  [0.2, 1],
  [0.4, 0.75],
  [0.8, 0.5],
  [1.5, 0.25],
];

export function coeffEcartNumerique(ecart, resultatOfficiel) {
  const paliers = Math.abs(resultatOfficiel) < 10 ? PALIERS_PETIT_SCORE : PALIERS_GRAND_SCORE;
  for (const [seuil, coeff] of paliers) {
    if (ecart <= seuil) return coeff;
  }
  return 0;
}

// Calcule l'écart (arrondi au dixième, pour éviter les soucis d'arithmétique flottante sur les
// bornes exactes comme 0,5 ou 1) et les points obtenus pour une estimation numérique donnée.
// pointsMax est le nombre de points pleins de la question (ou du bonus score, selon le contexte).
export function pointsEcartNumerique(pointsMax, reponseValeur, resultatValeur) {
  if (typeof reponseValeur !== "number" || typeof resultatValeur !== "number") {
    return { pts: 0, ecart: null, coeffEcart: 0 };
  }
  const ecart = Math.round(Math.abs(reponseValeur - resultatValeur) * 10) / 10;
  const coeffEcart = coeffEcartNumerique(ecart, resultatValeur);
  const pts = Math.round((pointsMax || 0) * coeffEcart);
  return { pts, ecart, coeffEcart };
}

export function scoreForParticipant(participantId, data) {
  let total = 0;
  const detail = [];
  data.pronostics
    .filter((p) => p.participantId === participantId)
    .forEach((p) => {
      const q = data.questions.find((x) => x.id === p.questionId);
      if (!q) return;
      const res = data.resultats.find((r) => r.questionId === q.id);
      if (!res) return;
      if (res.resultat && typeof res.resultat === "object" && res.resultat.annulee) return; // question sans objet : 0 pt pour tout le monde
      if (q.type === "texte") return;
      // Le bonus d'anticipation a été retiré : les points sont ceux de la question, sans multiplicateur.
      const coeff = 1;

      if (q.type === "choix_multiple") {
        if (!Array.isArray(res.resultat) || !Array.isArray(p.reponse)) return;
        const correctCount = p.reponse.filter((v) => res.resultat.includes(v)).length;
        const wrongCount = p.reponse.filter((v) => !res.resultat.includes(v)).length;
        const net = correctCount - wrongCount;
        if (net === 0) return;
        const pts = Math.round(q.points * net * coeff * 10) / 10;
        total += pts;
        detail.push({ question: q, pts, coeff, note: `${correctCount} correct(s), ${wrongCount} erreur(s)` });
        return;
      }

      if (q.type === "numerique") {
        if (q.numeriqueExact) {
          // Points pour tout le monde en cas de correspondance exacte (pas de comparaison
          // entre joueurs), utile pour un dénombrement plutôt qu'un score en %.
          if (typeof p.reponse !== "number" || p.reponse !== res.resultat) return;
          const pts = Math.round(q.points * coeff * 10) / 10;
          total += pts;
          detail.push({ question: q, pts, coeff, note: "réponse exacte" });
          return;
        }
        const { pts: ptsBase, ecart } = pointsEcartNumerique(q.points, p.reponse, res.resultat);
        if (ptsBase === 0) return;
        const pts = Math.round(ptsBase * coeff);
        total += pts;
        detail.push({ question: q, pts, coeff, note: `écart ${ecart} pt${ecart > 1 ? "s" : ""}` });
        return;
      }

      if (q.type === "candidat_score") {
        if (!res.resultat || !p.reponse) return;
        const bonCandidat = p.reponse.candidat === res.resultat.candidat;
        if (!bonCandidat) return;
        let pts = Math.round((q.points || 0) * coeff);
        let note = "bon candidat en tête";
        const { pts: bonus, ecart } = pointsEcartNumerique(q.pointsScore, p.reponse.score, res.resultat.score);
        if (bonus > 0) {
          pts += Math.round(bonus * coeff);
          note += ` + bonus score (écart ${ecart} pt${ecart > 1 ? "s" : ""})`;
        }
        if (pts === 0) return;
        total += pts;
        detail.push({ question: q, pts, coeff, note });
        return;
      }

      if (q.type === "texte_pari") {
        if (typeof p.reponse !== "string" || !p.reponse.trim()) return; // laissé vide = pas de pari, pas de pénalité
        if (!Array.isArray(res.resultat)) return;
        const norm = normaliseNom(p.reponse);
        const correct = res.resultat.some((r) => normaliseNom(r) === norm);
        if (correct) {
          const pts = Math.round((q.points || 0) * coeff * 10) / 10;
          total += pts;
          detail.push({ question: q, pts, coeff, note: "bon pari" });
        } else if (q.penalite) {
          const pts = -Math.round(q.penalite * coeff * 10) / 10;
          total += pts;
          detail.push({ question: q, pts, coeff, note: "mauvais pari" });
        }
        return;
      }

      const correct = reponsesEgales(p.reponse, res.resultat);
      if (correct) {
        const pts = Math.round(q.points * coeff * 10) / 10;
        total += pts;
        detail.push({ question: q, pts, coeff });
      } else if (q.penalite) {
        const pts = -Math.round(q.penalite * coeff * 10) / 10;
        total += pts;
        detail.push({ question: q, pts, coeff, note: "mauvaise réponse" });
      }
    });

  // Bonus "familles exactes" : pour chaque question choix_multiple marquée bonusFamilleExacte
  // (typiquement les 6 questions "quels seront les candidats de la famille X"), +2 pts si la
  // liste donnée est EXACTEMENT le résultat officiel (ni oubli, ni erreur), en plus du score net
  // habituel ±2/candidat. Si TOUTES les questions ainsi marquées d'une même session sont exactes,
  // +8 pts de super bonus supplémentaire.
  const familyQuestions = data.questions.filter((q) => isFamilyBlockQuestion(q, data));
  const bySession = {};
  familyQuestions.forEach((q) => {
    bySession[q.sessionId] = bySession[q.sessionId] || [];
    bySession[q.sessionId].push(q);
  });
  Object.values(bySession).forEach((qs) => {
    let allExact = true;
    let anyResolved = false;
    qs.forEach((q) => {
      const res = data.resultats.find((r) => r.questionId === q.id);
      if (!res) {
        allExact = false;
        return;
      }
      anyResolved = true;
      const p = data.pronostics.find((pp) => pp.participantId === participantId && pp.questionId === q.id);
      const exact = p && reponsesEgales(p.reponse, res.resultat);
      if (exact) {
        total += 2;
        detail.push({ question: q, pts: 2, coeff: 1, note: "liste de candidats exacte pour cette famille" });
      } else {
        allExact = false;
      }
    });
    if (anyResolved && allExact && qs.length > 0) {
      total += 8;
      detail.push({ question: qs[0], pts: 8, coeff: 1, note: "super bonus : toutes les familles exactes" });
    }
  });

  return { total: Math.round(total * 10) / 10, detail };
}

export function ligueMembers(ligueId, data) {
  const ids = data.adhesions.filter((a) => a.ligueId === ligueId).map((a) => a.participantId);
  return data.participants.filter((p) => ids.includes(p.id));
}
