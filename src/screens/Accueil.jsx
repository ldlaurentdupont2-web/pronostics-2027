import React, { useState } from "react";
import { Card, Badge, Button, Field, inputStyle, COLORS } from "../components/ui";
import { fmtDateTime } from "../lib/format";
import { joinLigueByCode, addLigue } from "../lib/db";

export default function Accueil({ data, me, setTab }) {
  const ouvertes = data.sessions.filter((s) => s.statut === "ouverte");
  const mesLigues = data.adhesions
    .filter((a) => a.participantId === me.id)
    .map((a) => data.ligues.find((l) => l.id === a.ligueId))
    .filter(Boolean);

  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [nouvNom, setNouvNom] = useState("");
  const [creerErr, setCreerErr] = useState("");
  const [creerBusy, setCreerBusy] = useState(false);
  const [dernierCode, setDernierCode] = useState(null);

  const join = async () => {
    if (!code.trim()) return;
    setErr("");
    setBusy(true);
    try {
      await joinLigueByCode(code.trim());
      setCode("");
    } catch (e) {
      setErr("Code invalide, ou ligue introuvable.");
    } finally {
      setBusy(false);
    }
  };

  const creerLigue = async () => {
    if (!nouvNom.trim()) return;
    setCreerErr("");
    setCreerBusy(true);
    try {
      const created = await addLigue(nouvNom.trim());
      await joinLigueByCode(created.code);
      setDernierCode(created.code);
      setNouvNom("");
    } catch (e) {
      setCreerErr("La création a échoué : " + (e?.message || "erreur inconnue"));
    } finally {
      setCreerBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <p className="text-sm mb-3" style={{ color: COLORS.paperDim }}>
          Bienvenue sur le jeu de pronostics de la présidentielle 2027 ! Répondez régulièrement aux questions de la session en cours (voir le calendrier
          pour le rythme exact selon la période), comparez vos scores entre amis dans une ou plusieurs ligues, et suivez le classement jusqu'au second tour.
        </p>
        <Button variant="ghost" onClick={() => setTab("calendrier")}>Voir le calendrier</Button>
      </Card>

      {ouvertes.length === 0 && (
        <Card>
          <p style={{ color: COLORS.paperDim }} className="text-sm">
            Aucune session ouverte pour le moment. Revenez plus tard.
          </p>
        </Card>
      )}
      {ouvertes.map((s) => {
        const qs = data.questions.filter((q) => q.sessionId === s.id);
        const rep = data.pronostics.filter((p) => p.participantId === me.id && qs.some((q) => q.id === p.questionId));
        const daysLeft = Math.ceil((new Date(s.cloture) - new Date()) / (1000 * 60 * 60 * 24));
        return (
          <Card key={s.id}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-xs uppercase tracking-wide" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace" }}>
                  Session ouverte
                </div>
                <h2 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 19, fontWeight: 600 }}>{s.titre}</h2>
              </div>
              <Badge tone={daysLeft <= 2 ? "danger" : "gold"}>{daysLeft > 0 ? `${daysLeft} j restants` : "clôture aujourd'hui"}</Badge>
            </div>
            <p className="text-sm mb-3" style={{ color: COLORS.paperDim }}>
              {rep.length} / {qs.length} question{qs.length > 1 ? "s" : ""} répondue{rep.length > 1 ? "s" : ""} · clôture le {fmtDateTime(s.cloture)}
            </p>
            <Button onClick={() => setTab("pronostiquer")} className="w-full">
              {rep.length === qs.length ? "Revoir mes réponses" : "Continuer le pronostic"}
            </Button>
          </Card>
        );
      })}

      <Card>
        <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.paper }}>Mes ligues</h3>
        {mesLigues.length === 0 ? (
          <p className="text-sm" style={{ color: COLORS.paperDim }}>Vous n'appartenez à aucune ligue pour l'instant.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {mesLigues.map((l) => {
              const nbMembres = data.adhesions.filter((a) => a.ligueId === l.id).length;
              return (
                <div key={l.id} className="flex items-center justify-between">
                  <Badge tone="verified">{l.nom}</Badge>
                  <span className="text-xs" style={{ color: COLORS.paperDim }}>{nbMembres} inscrit{nbMembres > 1 ? "s" : ""}</span>
                </div>
              );
            })}
          </div>
        )}
        {mesLigues.length > 0 && (
          <p className="text-xs mt-3" style={{ color: COLORS.paperDim }}>
            Retrouvez la liste complète des inscrits et leur score dans l'onglet Classement.
          </p>
        )}
      </Card>

      <Card>
        <p className="text-xs mb-1" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>Rejoindre une ligue</p>
        <p className="text-xs mb-3" style={{ color: COLORS.paperDim }}>Demande le code d'invitation à la personne qui a créé la ligue.</p>
        <div className="flex gap-2">
          <input
            style={{ ...inputStyle, textTransform: "uppercase" }}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") join();
            }}
            placeholder="Ex. A1B2C3"
          />
          <Button onClick={join} disabled={!code.trim() || busy}>{busy ? "…" : "Rejoindre"}</Button>
        </div>
        {err && <p className="text-xs mt-2" style={{ color: COLORS.danger }}>{err}</p>}
      </Card>

      <Card>
        <p className="text-xs mb-1" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>Créer ma propre ligue</p>
        <p className="text-xs mb-3" style={{ color: COLORS.paperDim }}>
          N'importe quel joueur peut créer une ligue. Les questions restent communes à tout le monde — une ligue ne sert qu'à regrouper un classement entre les personnes que tu invites.
        </p>
        <div className="flex gap-2">
          <input
            style={inputStyle}
            value={nouvNom}
            onChange={(e) => setNouvNom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") creerLigue();
            }}
            placeholder="Ex. Ligue du bureau"
          />
          <Button onClick={creerLigue} disabled={!nouvNom.trim() || creerBusy}>{creerBusy ? "…" : "Créer"}</Button>
        </div>
        {creerErr && <p className="text-xs mt-2" style={{ color: COLORS.danger }}>{creerErr}</p>}
        {dernierCode && (
          <p className="text-xs mt-2" style={{ color: COLORS.verified }}>
            Ligue créée ! Code à partager : <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: COLORS.gold, fontWeight: 600 }}>{dernierCode}</span>
          </p>
        )}
      </Card>
    </div>
  );
}
