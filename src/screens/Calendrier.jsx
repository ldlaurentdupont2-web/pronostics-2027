import React, { useMemo, useState } from "react";
import { Card, Badge, COLORS } from "../components/ui";
import { fmtDeadline } from "../lib/format";
import { PHASES } from "../lib/phases";

function statusOf(session) {
  if (session.statut === "close") return { label: "Close", tone: "muted" };
  if (session.statut === "ouverte") return { label: "Ouverte", tone: "gold" };
  return { label: "Planifiée", tone: "verified" };
}

export default function Calendrier({ data }) {
  const sessionsByPhase = useMemo(() => {
    const map = {};
    PHASES.forEach((p) => (map[p.numero] = []));
    data.sessions.forEach((s) => {
      const num = s.phase || 1;
      if (!map[num]) map[num] = [];
      map[num].push(s);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => new Date(a.cloture) - new Date(b.cloture)));
    return map;
  }, [data.sessions]);

  // Phase dépliée par défaut : celle de la session ouverte, sinon celle de la
  // prochaine session à venir, sinon la Phase 1.
  const defaultPhase = useMemo(() => {
    const ouverte = data.sessions.find((s) => s.statut === "ouverte");
    if (ouverte) return ouverte.phase || 1;
    const future = data.sessions
      .filter((s) => s.statut !== "close" && new Date(s.cloture) > new Date())
      .sort((a, b) => new Date(a.cloture) - new Date(b.cloture))[0];
    if (future) return future.phase || 1;
    return 1;
  }, [data.sessions]);

  const [open, setOpen] = useState(defaultPhase);

  return (
    <div className="flex flex-col gap-3">
      {PHASES.map((p) => {
        const sessions = sessionsByPhase[p.numero] || [];
        const isOpenPhase = open === p.numero;
        return (
          <Card key={p.numero}>
            <button onClick={() => setOpen(isOpenPhase ? -1 : p.numero)} className="w-full text-left flex items-start justify-between gap-3">
              <div>
                <h3 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 16, fontWeight: 600 }}>{p.titre}</h3>
                <p className="text-xs mt-0.5" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace" }}>{p.periode}</p>
              </div>
              <span style={{ color: COLORS.paperDim }} className="shrink-0 text-lg leading-none mt-1">{isOpenPhase ? "–" : "+"}</span>
            </button>
            {isOpenPhase && (
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.ink700}` }}>
                {sessions.length === 0 ? (
                  <p className="text-sm" style={{ color: COLORS.paperDim }}>Aucune session programmée pour l'instant dans cette phase.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sessions.map((s) => {
                      const st = statusOf(s);
                      return (
                        <div key={s.id} className="rounded-xl px-3 py-2" style={{ background: COLORS.ink900, border: `1px solid ${COLORS.ink600}` }}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-medium" style={{ color: COLORS.paper }}>{s.titre}</span>
                            <Badge tone={st.tone}>{st.label}</Badge>
                          </div>
                          {s.statut === "ouverte" ? (
                            <p className="text-xs font-semibold" style={{ color: COLORS.gold }}>
                              Pronostics modifiables jusqu'au {fmtDeadline(s.cloture)}
                            </p>
                          ) : (
                            <p className="text-xs" style={{ color: COLORS.paperDim }}>
                              {s.statut === "close" ? "Clôturée le " : "Clôture le "}
                              {fmtDeadline(s.cloture)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
