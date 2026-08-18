import React, { useState } from "react";
import { Card, Button, Field, inputStyle, COLORS } from "../components/ui";
import { joinLigueByCode, addLigue, signOut } from "../lib/db";

// Écran bloquant : tant qu'un participant (non-admin) n'appartient à aucune ligue,
// il ne peut pas accéder au reste du site — évite les joueurs "orphelins" invisibles
// dans tout classement, comme ça a été le cas avant cet ajout.
export default function RequireLigueGate({ me }) {
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
      await joinLigueByCode(created.code, "creator");
      setDernierCode(created.code);
    } catch (e) {
      setCreerErr("La création a échoué : " + (e?.message || "erreur inconnue"));
    } finally {
      setCreerBusy(false);
    }
  };

  return (
    <div style={{ background: COLORS.ink900, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }} className="flex flex-col justify-center px-6">
      <div className="text-center mb-6">
        <div className="text-xs tracking-widest uppercase mb-2" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace" }}>
          Présidentielle 2027
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 26, fontWeight: 700 }}>Une dernière étape, {me.nom}</h1>
        <p className="text-sm mt-2" style={{ color: COLORS.paperDim }}>
          Pour pronostiquer, il faut d'abord rejoindre une ligue (ou en créer une). C'est ce qui permet à tes réponses de compter dans un classement.
        </p>
      </div>

      <Card className="mb-3">
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
        <p className="text-xs mb-1" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>Ou créer ma propre ligue</p>
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
            Ligue créée ! Code à partager : <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: COLORS.gold, fontWeight: 600 }}>{dernierCode}</span> — vous devriez accéder au site dans un instant.
          </p>
        )}
      </Card>

      <button onClick={() => signOut()} className="text-xs mt-4 text-center" style={{ color: COLORS.paperDim }}>
        {me.nom} · déconnexion
      </button>
    </div>
  );
}
