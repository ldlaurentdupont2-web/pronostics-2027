import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, COLORS } from "../components/ui";

// Palette pour distinguer les répondants sur les courbes (indépendante de AVATAR_PALETTE,
// pensée pour rester lisible sur fond clair avec plusieurs lignes superposées).
const LIGNE_COULEURS = [COLORS.gold, COLORS.verified, "#8B6BAF", COLORS.danger, "#5B8FB9", "#C77B3E", "#4E8C7C", "#A15C8C"];

export default function Evolution({ data }) {
  // Une question est "récurrente" si le même libellé apparaît dans au moins 2 sessions
  // différentes (ex. les questions de score au 1er tour, reposées identiques chaque mois).
  // On ne trace que les types dont la réponse est un nombre exploitable en courbe.
  const groupes = useMemo(() => {
    const byLibelle = {};
    data.questions.forEach((q) => {
      if (q.type !== "numerique" && q.type !== "candidat_score") return;
      byLibelle[q.libelle] = byLibelle[q.libelle] || [];
      byLibelle[q.libelle].push(q);
    });
    return Object.entries(byLibelle)
      .map(([libelle, qs]) => {
        const sorted = qs
          .map((q) => ({ q, session: data.sessions.find((s) => s.id === q.sessionId) }))
          .filter((x) => x.session)
          .sort((a, b) => new Date(a.session.ouverture) - new Date(b.session.ouverture));
        if (sorted.length < 2) return null;

        const participantIds = new Set();
        sorted.forEach(({ q }) => {
          data.pronostics.filter((p) => p.questionId === q.id).forEach((p) => participantIds.add(p.participantId));
        });
        const participants = [...participantIds].map((id) => data.participants.find((p) => p.id === id)).filter(Boolean);
        if (participants.length === 0) return null;

        const chartData = sorted.map(({ q, session }) => {
          const row = { session: session.titre };
          participants.forEach((part) => {
            const p = data.pronostics.find((pp) => pp.participantId === part.id && pp.questionId === q.id);
            const val = q.type === "candidat_score" ? p?.reponse?.score : p?.reponse;
            if (typeof val === "number") row[part.nom] = val;
          });
          return row;
        });

        return { libelle, participants, chartData };
      })
      .filter(Boolean);
  }, [data.questions, data.sessions, data.pronostics, data.participants]);

  if (groupes.length === 0) {
    return (
      <Card>
        <p className="text-sm" style={{ color: COLORS.paperDim }}>
          L'évolution apparaît dès qu'une question de score (numérique ou tête de famille + score) se répète à l'identique sur au moins deux sessions.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groupes.map((g) => (
        <Card key={g.libelle}>
          <p className="text-sm font-medium mb-3" style={{ color: COLORS.paper }}>{g.libelle}</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={g.chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid stroke={COLORS.ink700} strokeDasharray="3 3" />
              <XAxis dataKey="session" tick={{ fill: COLORS.paperDim, fontSize: 11 }} />
              <YAxis tick={{ fill: COLORS.paperDim, fontSize: 11 }} />
              <Tooltip contentStyle={{ background: COLORS.ink800, border: `1px solid ${COLORS.ink600}`, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {g.participants.map((part, i) => (
                <Line
                  key={part.id}
                  type="monotone"
                  dataKey={part.nom}
                  stroke={LIGNE_COULEURS[i % LIGNE_COULEURS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      ))}
    </div>
  );
}
