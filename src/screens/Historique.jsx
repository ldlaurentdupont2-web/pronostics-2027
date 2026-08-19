import React, { useState } from "react";
import { Card, COLORS } from "../components/ui";
import { reponsesEgales, normaliseNom, nomsRessemblent, ligueMembers, pointsEcartNumerique } from "../lib/scoring";

function afficheReponse(q, r) {
  if (r && typeof r === "object" && r.annulee) return "sans objet";
  return Array.isArray(r)
    ? r.length
      ? r.join(", ")
      : "—"
    : q.type === "numerique" && typeof r === "number"
    ? r + (q.numeriqueEntier ? "" : " %")
    : q.type === "candidat_score" && r && typeof r === "object"
    ? `${r.candidat} (${r.score} %)`
    : r === "" || r === null || r === undefined
    ? "—"
    : r;
}

// Calcule le libellé "points marqués" pour UN participant donné sur UNE question donnée,
// une fois le résultat officiel connu. Même logique que le moteur de scoring, mais reformulée
// pour un affichage lisible par question plutôt qu'un total.
function labelPoints(q, res, data, participantId, p) {
  if (!res || !p) return null;
  if (q.type === "choix_multiple" && Array.isArray(p.reponse) && Array.isArray(res.resultat)) {
    const nOk = p.reponse.filter((v) => res.resultat.includes(v)).length;
    const nErr = p.reponse.filter((v) => !res.resultat.includes(v)).length;
    const net = nOk - nErr;
    return net !== 0 ? `${net > 0 ? "+" : ""}${net * q.points} pts (${nOk} ok, ${nErr} err.)` : "0 pt";
  }
  if (q.type === "numerique") {
    if (q.numeriqueExact) {
      return typeof p.reponse === "number" && p.reponse === res.resultat ? `🏅 +${q.points} pts` : "—";
    }
    if (typeof p.reponse !== "number") return "—";
    const { pts, ecart } = pointsEcartNumerique(q.points, p.reponse, res.resultat);
    return pts > 0 ? `+${pts} pts (écart ${ecart} pt${ecart > 1 ? "s" : ""})` : `écart ${ecart} pt${ecart > 1 ? "s" : ""}, 0 pt`;
  }
  if (q.type === "candidat_score" && p.reponse) {
    const bonCandidat = res.resultat && p.reponse.candidat === res.resultat.candidat;
    if (!bonCandidat) return "mauvais candidat";
    const { pts: bonus, ecart } = pointsEcartNumerique(q.pointsScore, p.reponse.score, res.resultat.score);
    const total = q.points + bonus;
    return bonus > 0 ? `+${total} pts (bon candidat + écart ${ecart} pt${ecart > 1 ? "s" : ""})` : `bon candidat +${q.points} pts`;
  }
  if (q.type === "texte_pari") {
    if (typeof p.reponse !== "string" || !p.reponse.trim()) return "pas de pari";
    const norm = normaliseNom(p.reponse);
    const bon = Array.isArray(res.resultat) && res.resultat.some((r) => nomsRessemblent(norm, normaliseNom(r)));
    return bon ? `🏆 +${q.points} pts` : q.penalite ? `-${q.penalite} pts` : "—";
  }
  if (q.type !== "texte") {
    const bon = reponsesEgales(p.reponse, res.resultat);
    return bon ? `🏅 +${q.points} pts` : q.penalite ? `-${q.penalite} pts` : "—";
  }
  return null;
}

export default function Historique({ data, me }) {
  const mesLigueIds = data.adhesions.filter((a) => a.participantId === me.id).map((a) => a.ligueId);
  const [ligueId, setLigueId] = useState(mesLigueIds[0] || "");
  const [ouvertes, setOuvertes] = useState({});

  const closedSessions = data.sessions.filter((s) => s.statut === "close").sort((a, b) => new Date(b.cloture) - new Date(a.cloture));

  if (closedSessions.length === 0) return <Card><p className="text-sm" style={{ color: COLORS.paperDim }}>Aucune session close pour l'instant.</p></Card>;

  const membresLigue = ligueId ? ligueMembers(ligueId, data) : [];

  return (
    <div className="flex flex-col gap-3">
      {mesLigueIds.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.ligues
            .filter((l) => mesLigueIds.includes(l.id))
            .map((l) => (
              <button
                key={l.id}
                onClick={() => setLigueId(l.id)}
                className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap"
                style={{
                  background: ligueId === l.id ? COLORS.gold : "transparent",
                  color: ligueId === l.id ? COLORS.ink800 : COLORS.paperDim,
                  border: `1px solid ${ligueId === l.id ? COLORS.gold : COLORS.ink600}`,
                  fontWeight: ligueId === l.id ? 600 : 400,
                }}
              >
                {l.nom}
              </button>
            ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm" style={{ color: COLORS.paperDim }}>
            Rejoignez ou créez une ligue depuis l'Accueil pour comparer vos réponses avec d'autres joueurs. En attendant, seules vos propres réponses sont affichées ci-dessous.
          </p>
        </Card>
      )}

      {closedSessions.map((s) => {
        const qs = data.questions.filter((q) => q.sessionId === s.id);
        return (
          <Card key={s.id}>
            <h3 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 17, fontWeight: 600 }} className="mb-2">
              {s.titre}
            </h3>
            <div className="flex flex-col gap-2">
              {qs.map((q) => {
                const p = data.pronostics.find((x) => x.participantId === me.id && x.questionId === q.id);
                const res = data.resultats.find((r) => r.questionId === q.id);
                const affiche = (r) => afficheReponse(q, r);
                const correctLabel = labelPoints(q, res, data, me.id, p);
                const cleOuvert = s.id + "|" + q.id;
                const estOuvert = !!ouvertes[cleOuvert];
                return (
                  <div key={q.id} className="flex flex-col gap-1.5 py-2" style={{ borderTop: `1px solid ${COLORS.ink700}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs" style={{ color: COLORS.paperDim }}>{q.libelle}</p>
                        <p className="text-sm" style={{ color: COLORS.paper }}>Vous : {p ? affiche(p.reponse) : "— sans réponse —"}</p>
                        {res && <p className="text-xs" style={{ color: COLORS.gold }}>Résultat : {affiche(res.resultat)}</p>}
                      </div>
                      {correctLabel && <span className="text-xs shrink-0 whitespace-nowrap" style={{ color: COLORS.paperDim }}>{correctLabel}</span>}
                    </div>
                    {q.type !== "texte" && ligueId && (
                      <button
                        onClick={() => setOuvertes((o) => ({ ...o, [cleOuvert]: !o[cleOuvert] }))}
                        className="text-xs text-left"
                        style={{ color: COLORS.paperDim }}
                      >
                        {estOuvert ? "▾ masquer les réponses de la ligue" : "▸ voir les réponses de la ligue"}
                      </button>
                    )}
                    {estOuvert && ligueId && (
                      <div className="rounded-xl p-2 mt-1" style={{ background: COLORS.ink900, border: `1px solid ${COLORS.ink600}` }}>
                        {membresLigue.length === 0 ? (
                          <p className="text-xs" style={{ color: COLORS.paperDim }}>Aucun membre dans cette ligue.</p>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {membresLigue.map((membre) => {
                              const pr = data.pronostics.find((x) => x.participantId === membre.id && x.questionId === q.id);
                              const label = labelPoints(q, res, data, membre.id, pr);
                              return (
                                <div key={membre.id} className="flex items-center justify-between gap-2 text-xs">
                                  <span style={{ color: membre.id === me.id ? COLORS.gold : COLORS.paper }}>{membre.nom}</span>
                                  <span className="flex items-center gap-2">
                                    <span style={{ color: COLORS.paperDim }}>{pr ? affiche(pr.reponse) : "— sans réponse —"}</span>
                                    {label && <span style={{ color: COLORS.paperDim }}>· {label}</span>}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
