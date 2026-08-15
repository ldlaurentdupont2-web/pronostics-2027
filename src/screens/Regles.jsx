import React, { useState } from "react";
import { Card, COLORS } from "../components/ui";
import { PHASES } from "../lib/phases";

export default function Regles() {
  const [open, setOpen] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 19, fontWeight: 600 }} className="mb-2">
          Comment fonctionne le jeu
        </h2>
        <p className="text-sm mb-3" style={{ color: COLORS.paperDim }}>
          Chaque <strong style={{ color: COLORS.paper }}>session</strong> est une photographie datée : elle regroupe quelques questions,
          s'ouvre, puis se clôture à une date fixée par l'admin. Une fois close, vos réponses ne sont plus modifiables et restent dans
          votre historique — c'est ce qui permet de mesurer qui a vu juste tôt, pas seulement qui a raison à la fin.
        </p>
        <ul className="text-sm flex flex-col gap-1.5" style={{ color: COLORS.paperDim }}>
          <li>• Sans session ouverte, l'onglet <span style={{ color: COLORS.gold }}>Pronostiquer</span> reste vide — c'est normal, pas un bug.</li>
          <li>• Le jeu avance par phases : au début on pronostique qui sera candidat, à la fin on pronostique le score du second tour.</li>
          <li>• Le socle de questions (candidats par famille + pari libre) se répète à l'identique chaque session : vous pouvez la reconfirmer ou la changer à chaque fois.</li>
        </ul>
      </Card>

      <Card>
        <h2 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 19, fontWeight: 600 }} className="mb-2">
          Qu'appelle-t-on « candidat » ?
        </h2>
        <p className="text-sm mb-2" style={{ color: COLORS.paperDim }}>
          Pour résoudre les questions sans ambiguïté, un candidat est considéré confirmé lorsqu'il obtient sa{" "}
          <strong style={{ color: COLORS.paper }}>validation officielle par le Conseil constitutionnel</strong> : au moins 500 signatures
          d'élus, provenant d'au moins 30 départements ou collectivités, sans que plus d'un dixième ne vienne du même territoire.
        </p>
        <p className="text-sm" style={{ color: COLORS.paperDim }}>
          C'est un seuil tardif (liste publiée vers mars 2027), qui sert uniquement à trancher les questions « quels seront les candidats
          de cette famille ? » une fois le moment venu.
        </p>
      </Card>

      <Card>
        <h2 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 19, fontWeight: 600 }} className="mb-3">
          Comptage des points, en détail
        </h2>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.ink600}` }}>
                <th className="text-left py-2 px-1" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>
                  Type
                </th>
                <th className="text-left py-2 px-1" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>
                  Comment les points sont comptés
                </th>
              </tr>
            </thead>
            <tbody style={{ color: COLORS.paperDim }}>
              <tr style={{ borderBottom: `1px solid ${COLORS.ink700}` }}>
                <td className="py-2 px-1 align-top" style={{ color: COLORS.paper }}>
                  Choix unique
                </td>
                <td className="py-2 px-1">Points pleins si la réponse correspond exactement au résultat officiel. Sinon 0, sauf pénalité activée.</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${COLORS.ink700}` }}>
                <td className="py-2 px-1 align-top" style={{ color: COLORS.paper }}>
                  Choix multiple
                </td>
                <td className="py-2 px-1">+points par candidat coché qui se présente, −points par candidat coché qui ne se présente pas. Score net.</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${COLORS.ink700}` }}>
                <td className="py-2 px-1 align-top" style={{ color: COLORS.paper }}>
                  Oui / non
                </td>
                <td className="py-2 px-1">Points pleins si conforme au résultat officiel. Sinon 0, sauf pénalité activée (ex. -2 pts).</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${COLORS.ink700}` }}>
                <td className="py-2 px-1 align-top" style={{ color: COLORS.paper }}>
                  Numérique
                </td>
                <td className="py-2 px-1">Seul le joueur le plus proche du résultat officiel gagne les points (ex-æquo possibles).</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${COLORS.ink700}` }}>
                <td className="py-2 px-1 align-top" style={{ color: COLORS.paper }}>
                  Tête de famille + score
                </td>
                <td className="py-2 px-1">Points "candidat" si bon candidat deviné. Points "score" en plus pour le plus proche parmi eux.</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${COLORS.ink700}` }}>
                <td className="py-2 px-1 align-top" style={{ color: COLORS.paper }}>
                  Pari nominatif
                </td>
                <td className="py-2 px-1">Points pleins si le nom correspond à un résultat accepté. Pénalité si faux. Vide = pas de pari.</td>
              </tr>
              <tr>
                <td className="py-2 px-1 align-top" style={{ color: COLORS.paper }}>
                  Texte libre
                </td>
                <td className="py-2 px-1">Non classant, 0 point dans tous les cas.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-3 mb-1.5" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>
          Bonus "familles" (sur les questions "quels seront les candidats de cette famille ?")
        </p>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <tbody style={{ color: COLORS.paperDim }}>
              <tr style={{ borderBottom: `1px solid ${COLORS.ink700}` }}>
                <td className="py-1.5 px-1">Liste exacte pour une famille (ni oubli, ni erreur)</td>
                <td className="py-1.5 px-1" style={{ color: COLORS.goldSoft }}>+2 pts</td>
              </tr>
              <tr>
                <td className="py-1.5 px-1">Super bonus : les 6 familles exactes en même temps</td>
                <td className="py-1.5 px-1" style={{ color: COLORS.goldSoft }}>+8 pts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {PHASES.map((p, i) => (
        <Card key={i}>
          <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full text-left flex items-start justify-between gap-3">
            <div>
              <h3 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 16, fontWeight: 600 }}>{p.titre}</h3>
              <p className="text-xs mt-0.5" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace" }}>{p.periode}</p>
            </div>
            <span style={{ color: COLORS.paperDim }} className="shrink-0 text-lg leading-none mt-1">{open === i ? "–" : "+"}</span>
          </button>
          {open === i && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.ink700}` }}>
              <p className="text-sm mb-3" style={{ color: COLORS.paperDim }}>{p.resume}</p>
              <p className="text-xs uppercase tracking-wide mb-1.5" style={{ color: COLORS.paper, fontFamily: "'IBM Plex Mono', monospace" }}>
                Questions typiques
              </p>
              <ul className="text-sm flex flex-col gap-1" style={{ color: COLORS.paperDim }}>
                {p.questions.map((q, j) => (
                  <li key={j}>· {q}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
