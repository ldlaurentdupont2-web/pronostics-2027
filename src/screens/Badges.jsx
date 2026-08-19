import React, { useState } from "react";
import { Card, COLORS } from "../components/ui";
import { badgePrecision, badgeVisionnaire, badgeSerie, badgeSurprise, badgeChampion } from "../lib/badges";

const DEFINITIONS = [
  { key: "champion", emoji: "🥇", titre: "Champion de la ligue", calc: badgeChampion },
  { key: "precision", emoji: "🎯", titre: "Le plus précis", calc: badgePrecision },
  { key: "visionnaire", emoji: "🔮", titre: "Le visionnaire", calc: badgeVisionnaire },
  { key: "serie", emoji: "🔥", titre: "Meilleure série", calc: badgeSerie },
  { key: "surprise", emoji: "💥", titre: "Plus grosse surprise anticipée", calc: badgeSurprise },
];

function description(key, r) {
  if (!r) return "Pas encore assez de résultats officiels pour ce badge — reviens après la prochaine clôture.";
  switch (key) {
    case "champion":
      return `${r.participant.nom} — ${r.total} pts, en tête du classement actuel de la ligue.`;
    case "precision":
      return `${r.participant.nom} — écart moyen de ${r.moyenne.toFixed(1)} pt sur ${r.nb} question${r.nb > 1 ? "s" : ""} de score.`;
    case "visionnaire":
      return `${r.participant.nom} — sa toute première estimation était à ${r.moyenne.toFixed(1)} pt en moyenne du résultat final, sur ${r.nb} question${r.nb > 1 ? "s" : ""} suivie${r.nb > 1 ? "s" : ""} dans le temps.`;
    case "serie":
      return `${r.participant.nom} — ${r.serie} session${r.serie > 1 ? "s" : ""} d'affilée avec au moins un point marqué.`;
    case "surprise":
      return `${r.participant.nom} — ${r.nbCorrects === 1 ? "seul·e" : `parmi ${r.nbCorrects} seulement`} à avoir deviné juste sur « ${r.question.libelle} ».`;
    default:
      return "";
  }
}

export default function Badges({ data, me }) {
  const mesLigueIds = data.adhesions.filter((a) => a.participantId === me.id).map((a) => a.ligueId);
  const [ligueId, setLigueId] = useState(mesLigueIds[0] || "");

  if (mesLigueIds.length === 0) {
    return (
      <Card>
        <p className="text-sm" style={{ color: COLORS.paperDim }}>
          Rejoignez ou créez une ligue depuis l'Accueil pour voir apparaître les récompenses.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
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

      {DEFINITIONS.map(({ key, emoji, titre, calc }) => {
        const r = ligueId ? calc(ligueId, data) : null;
        return (
          <Card key={key}>
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">{emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: COLORS.paper }}>{titre}</p>
                <p className="text-xs mt-1" style={{ color: COLORS.paperDim, fontStyle: r ? "normal" : "italic" }}>{description(key, r)}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
