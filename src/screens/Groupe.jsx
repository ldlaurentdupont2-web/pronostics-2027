import React from "react";
import { Card, COLORS } from "../components/ui";

export default function Groupe({ data }) {
  const closedQuestions = data.questions.filter((q) => {
    const s = data.sessions.find((x) => x.id === q.sessionId);
    return s?.statut === "close" && q.type !== "texte" && q.type !== "numerique" && q.type !== "candidat_score" && q.type !== "texte_pari";
  });

  if (closedQuestions.length === 0)
    return <Card><p className="text-sm" style={{ color: COLORS.paperDim }}>Les tendances du groupe apparaissent une fois les sessions closes, pour ne pas influencer les réponses en cours.</p></Card>;

  return (
    <div className="flex flex-col gap-3">
      {closedQuestions.map((q) => {
        const reps = data.pronostics.filter((p) => p.questionId === q.id);
        const counts = {};
        reps.forEach((r) => {
          counts[r.reponse] = (counts[r.reponse] || 0) + 1;
        });
        const total = reps.length || 1;
        return (
          <Card key={q.id}>
            <p className="text-sm font-medium mb-3" style={{ color: COLORS.paper }}>{q.libelle}</p>
            <div className="flex flex-col gap-2">
              {Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([opt, n]) => (
                  <div key={opt}>
                    <div className="flex justify-between text-xs mb-1" style={{ color: COLORS.paperDim }}>
                      <span>{opt}</span>
                      <span>{Math.round((n / total) * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: COLORS.ink900 }}>
                      <div className="h-full rounded-full" style={{ width: `${(n / total) * 100}%`, background: COLORS.verified }} />
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
