import React, { useMemo, useState } from "react";
import { Card, COLORS, inputStyle, Button } from "../components/ui";
import { fmtDateTime } from "../lib/format";
import { scoreForParticipant, ligueMembers } from "../lib/scoring";
import { leaveLigue, addCommentaire } from "../lib/db";

export default function Classement({ data, me }) {
  const mesLigueIds = data.adhesions.filter((a) => a.participantId === me.id).map((a) => a.ligueId);
  const [ligueId, setLigueId] = useState(mesLigueIds[0] || "");

  const members = ligueId ? ligueMembers(ligueId, data) : [];
  const ranking = members.map((p) => ({ p, ...scoreForParticipant(p.id, data) })).sort((a, b) => b.total - a.total);

  const echeances = useMemo(() => {
    return [...data.echeances].sort((a, b) => {
      if (a.dateTri && b.dateTri) return new Date(a.dateTri) - new Date(b.dateTri);
      if (a.dateTri) return -1;
      if (b.dateTri) return 1;
      return (a.ordre ?? 0) - (b.ordre ?? 0);
    });
  }, [data.echeances]);

  return (
    <div className="flex flex-col gap-3">
      {echeances.length > 0 && (
        <Card>
          <p className="text-xs mb-3" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>Calendrier des points</p>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.ink600}` }}>
                  <th className="text-left py-2 px-1" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>Échéance</th>
                  <th className="text-left py-2 px-1" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>Quand</th>
                  <th className="text-left py-2 px-1" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>Points / bonus en jeu</th>
                </tr>
              </thead>
              <tbody style={{ color: COLORS.paperDim }}>
                {echeances.map((e) => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${COLORS.ink700}` }}>
                    <td className="py-2 px-1 align-top" style={{ color: COLORS.paper }}>{e.libelle}</td>
                    <td className="py-2 px-1 align-top whitespace-nowrap" style={{ color: COLORS.gold }}>{e.quand}</td>
                    <td className="py-2 px-1 align-top">{e.points || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {mesLigueIds.length === 0 ? (
        <Card>
          <p className="text-sm" style={{ color: COLORS.paperDim }}>
            Vous n'appartenez à aucune ligue pour l'instant — rendez-vous sur l'onglet Accueil pour en rejoindre une avec un code, ou pour créer la vôtre.
          </p>
        </Card>
      ) : (
        <>
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

          {ligueId && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 18, fontWeight: 600 }}>
                  Classement — {data.ligues.find((l) => l.id === ligueId)?.nom}
                </h3>
                <button
                  onClick={async () => {
                    await leaveLigue(me.id, ligueId);
                    setLigueId("");
                  }}
                  className="text-xs shrink-0"
                  style={{ color: COLORS.danger }}
                >
                  Quitter cette ligue
                </button>
              </div>
              {ranking.length === 0 ? (
                <p className="text-sm" style={{ color: COLORS.paperDim }}>Aucun membre pour l'instant.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {ranking.map((r, i) => (
                    <div key={r.p.id} className="flex items-center justify-between py-2" style={{ borderTop: i ? `1px solid ${COLORS.ink700}` : "none" }}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg w-6 text-center">{i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
                        <span style={{ color: COLORS.paper, fontWeight: r.p.id === me.id ? 700 : 400 }} className="text-sm">
                          {r.p.nom}
                          {r.p.id === me.id && <span style={{ color: COLORS.gold }}> (vous)</span>}
                        </span>
                      </div>
                      <span style={{ color: COLORS.goldSoft, fontFamily: "'IBM Plex Mono', monospace" }} className="text-sm font-semibold">
                        {r.total} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {ligueId && <CommentairesLigue data={data} me={me} ligueId={ligueId} />}
        </>
      )}
    </div>
  );
}

function CommentairesLigue({ data, me, ligueId }) {
  const [texte, setTexte] = useState("");
  const [busy, setBusy] = useState(false);
  const messages = data.commentaires.filter((c) => c.ligueId === ligueId).sort((a, b) => new Date(a.date) - new Date(b.date));

  const nomDe = (participantId) => data.participants.find((p) => p.id === participantId)?.nom || "…";

  const envoyer = async () => {
    if (!texte.trim()) return;
    setBusy(true);
    try {
      await addCommentaire(ligueId, me.id, texte);
      setTexte("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <p className="text-xs mb-3" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>Commentaires de la ligue</p>
      {messages.length === 0 ? (
        <p className="text-sm mb-3" style={{ color: COLORS.paperDim }}>Aucun commentaire pour l'instant — soyez le premier.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-3">
          {messages.map((c) => (
            <div key={c.id} className="rounded-xl px-3 py-2" style={{ background: COLORS.ink900, border: `1px solid ${COLORS.ink600}` }}>
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className="text-xs font-semibold" style={{ color: c.participantId === me.id ? COLORS.gold : COLORS.paper }}>{nomDe(c.participantId)}</span>
                <span className="text-xs shrink-0" style={{ color: COLORS.paperDim }}>{fmtDateTime(c.date)}</span>
              </div>
              <p className="text-sm" style={{ color: COLORS.paper }}>{c.contenu}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          style={inputStyle}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") envoyer();
          }}
          placeholder="Écrire un commentaire…"
        />
        <Button onClick={envoyer} disabled={!texte.trim() || busy}>{busy ? "…" : "Envoyer"}</Button>
      </div>
    </Card>
  );
}
