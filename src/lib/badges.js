// Les badges ne créent AUCUN nouveau système de points : ils se contentent de raconter
// une histoire à partir des données déjà calculées par scoring.js. "Les points déterminent
// le classement, les badges racontent l'histoire."

import { scoreForParticipant, nomsRessemblent, normaliseNom, ligueMembers } from "./scoring";

/* ---------- 🎯 Le plus précis ----------
Écart moyen le plus faible entre pronostic et résultat officiel, sur toutes les questions
de type score (numérique non-exact, et le bonus score des questions "tête de famille"). */
export function badgePrecision(ligueId, data) {
  const membres = ligueMembers(ligueId, data);
  let meilleur = null;
  membres.forEach((m) => {
    const ecarts = [];
    data.pronostics
      .filter((p) => p.participantId === m.id)
      .forEach((p) => {
        const q = data.questions.find((x) => x.id === p.questionId);
        if (!q) return;
        const res = data.resultats.find((r) => r.questionId === q.id);
        if (!res || (res.resultat && typeof res.resultat === "object" && res.resultat.annulee)) return;
        if (q.type === "numerique" && !q.numeriqueEntier && !q.numeriqueExact && typeof p.reponse === "number" && typeof res.resultat === "number") {
          ecarts.push(Math.abs(p.reponse - res.resultat));
        }
        if (
          q.type === "candidat_score" &&
          p.reponse &&
          res.resultat &&
          p.reponse.candidat === res.resultat.candidat &&
          typeof p.reponse.score === "number" &&
          typeof res.resultat.score === "number"
        ) {
          ecarts.push(Math.abs(p.reponse.score - res.resultat.score));
        }
      });
    if (ecarts.length === 0) return;
    const moyenne = ecarts.reduce((a, b) => a + b, 0) / ecarts.length;
    if (!meilleur || moyenne < meilleur.moyenne) meilleur = { participant: m, moyenne, nb: ecarts.length };
  });
  return meilleur;
}

/* ---------- 🔮 Le visionnaire ----------
Pour les questions numériques qui se répètent d'une session à l'autre (mêmes libellés,
comme les scores de familles suivis mois après mois), on regarde la toute PREMIÈRE réponse
donnée, comparée au dernier résultat officiel connu de ce groupe — sans tenir compte des
révisions ultérieures. Récompense l'intuition la plus précoce, pas la plus tardive. */
export function badgeVisionnaire(ligueId, data) {
  const membres = ligueMembers(ligueId, data);
  const parLibelle = {};
  data.questions.forEach((q) => {
    if (q.type !== "numerique" || q.numeriqueEntier || q.numeriqueExact) return;
    parLibelle[q.libelle] = parLibelle[q.libelle] || [];
    parLibelle[q.libelle].push(q);
  });

  const groupes = [];
  Object.values(parLibelle).forEach((qs) => {
    if (qs.length < 2) return; // "se répète" suppose au moins 2 occurrences
    const avecSession = qs
      .map((q) => ({ q, session: data.sessions.find((s) => s.id === q.sessionId) }))
      .filter((x) => x.session)
      .sort((a, b) => new Date(a.session.ouverture) - new Date(b.session.ouverture));
    if (avecSession.length < 2) return;
    const premiere = avecSession[0].q;
    let dernierResultat = null;
    for (let i = avecSession.length - 1; i >= 0; i--) {
      const res = data.resultats.find((r) => r.questionId === avecSession[i].q.id);
      if (res && typeof res.resultat === "number") {
        dernierResultat = res.resultat;
        break;
      }
    }
    if (dernierResultat === null) return;
    groupes.push({ premiere, resultat: dernierResultat });
  });

  if (groupes.length === 0) return null;

  let meilleur = null;
  membres.forEach((m) => {
    const ecarts = [];
    groupes.forEach(({ premiere, resultat }) => {
      const p = data.pronostics.find((x) => x.participantId === m.id && x.questionId === premiere.id);
      if (!p || typeof p.reponse !== "number") return;
      ecarts.push(Math.abs(p.reponse - resultat));
    });
    if (ecarts.length === 0) return;
    const moyenne = ecarts.reduce((a, b) => a + b, 0) / ecarts.length;
    if (!meilleur || moyenne < meilleur.moyenne) meilleur = { participant: m, moyenne, nb: ecarts.length };
  });
  return meilleur;
}

/* ---------- 🔥 Meilleure série ----------
Plus longue suite de sessions closes CONSÉCUTIVES où au moins 1 point a été marqué. */
export function badgeSerie(ligueId, data) {
  const membres = ligueMembers(ligueId, data);
  const closedSessions = [...data.sessions].filter((s) => s.statut === "close").sort((a, b) => new Date(a.ouverture) - new Date(b.ouverture));
  if (closedSessions.length === 0) return null;

  let meilleur = null;
  membres.forEach((m) => {
    const { detail } = scoreForParticipant(m.id, data);
    const parSession = {};
    detail.forEach((d) => {
      const sid = d.question?.sessionId;
      if (!sid) return;
      parSession[sid] = (parSession[sid] || 0) + d.pts;
    });
    let courant = 0;
    let max = 0;
    closedSessions.forEach((s) => {
      const pts = parSession[s.id] || 0;
      if (pts > 0) {
        courant += 1;
        max = Math.max(max, courant);
      } else {
        courant = 0;
      }
    });
    if (max > 0 && (!meilleur || max > meilleur.serie)) meilleur = { participant: m, serie: max };
  });
  return meilleur;
}

/* ---------- 💥 Plus grosse surprise correctement anticipée ----------
Parmi les paris nominatifs (candidature surprise) gagnants, celui deviné juste par le
MOINS de monde dans la ligue est considéré comme la plus grosse surprise. */
export function badgeSurprise(ligueId, data) {
  const membres = ligueMembers(ligueId, data);
  const membreIds = new Set(membres.map((m) => m.id));
  const questionsPari = data.questions.filter((q) => q.type === "texte_pari");

  let meilleur = null;
  questionsPari.forEach((q) => {
    const res = data.resultats.find((r) => r.questionId === q.id);
    if (!res || !Array.isArray(res.resultat) || res.resultat.length === 0) return;
    const corrects = [];
    data.pronostics
      .filter((p) => membreIds.has(p.participantId) && p.questionId === q.id)
      .forEach((p) => {
        if (typeof p.reponse !== "string" || !p.reponse.trim()) return;
        const norm = normaliseNom(p.reponse);
        const bon = res.resultat.some((r) => nomsRessemblent(norm, normaliseNom(r)));
        if (bon) corrects.push(p.participantId);
      });
    if (corrects.length === 0) return;
    corrects.forEach((pid) => {
      if (!meilleur || corrects.length < meilleur.nbCorrects) {
        meilleur = { participant: membres.find((m) => m.id === pid), question: q, nbCorrects: corrects.length };
      }
    });
  });
  return meilleur;
}

/* ---------- 🥇 Champion de la ligue ----------
Simple reflet de la tête du classement actuel — juste mis en valeur visuellement. */
export function badgeChampion(ligueId, data) {
  const membres = ligueMembers(ligueId, data);
  if (membres.length === 0) return null;
  const classement = membres.map((p) => ({ participant: p, total: scoreForParticipant(p.id, data).total })).sort((a, b) => b.total - a.total);
  if (classement[0].total <= 0) return null;
  return classement[0];
}
