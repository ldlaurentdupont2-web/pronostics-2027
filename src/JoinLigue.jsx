import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { previewLigue, signUp, signIn, ensureParticipant, joinLigueByCode } from "./lib/db";
import { COLORS, FONT_LINK, Card, Button, Field, inputStyle, HeaderPortrait } from "./components/ui";

// Écran autonome (monté en dehors de l'arborescence principale de App.jsx, voir
// src/main.jsx) : gère tout le tunnel "je clique sur un lien d'invitation" —
// aperçu du nom de la ligue, connexion/inscription si besoin (en conservant le
// code même à travers une confirmation d'email), puis adhésion automatique via
// join_ligue() (le même mécanisme idempotent que le reste du site) et redirection.
export default function JoinLigue({ code }) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_LINK;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const [ligueNom, setLigueNom] = useState(undefined); // undefined = chargement, null = code invalide
  const [previewErr, setPreviewErr] = useState("");

  const [session, setSession] = useState(undefined);
  const [mode, setMode] = useState("signup"); // ceux qui cliquent un lien d'invitation n'ont, la plupart du temps, pas encore de compte
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [nom, setNom] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [authInfo, setAuthInfo] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [joinStatus, setJoinStatus] = useState("idle"); // idle | joining | done | error
  const [joinErr, setJoinErr] = useState("");

  // Aperçu du nom de la ligue, sans avoir besoin d'être connecté.
  useEffect(() => {
    previewLigue(code)
      .then((n) => setLigueNom(n))
      .catch((e) => {
        setLigueNom(null);
        setPreviewErr(e.message || "Erreur");
      });
  }, [code]);

  // Suivi de la session (fonctionne aussi juste après un clic sur un lien de
  // confirmation d'email, grâce à emailRedirectTo pointant vers cette même page).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Dès qu'une session est disponible, on rejoint automatiquement — sans jamais
  // redemander le code, qu'il vienne d'une connexion immédiate ou d'un retour
  // après confirmation d'email.
  useEffect(() => {
    if (!session) return;
    (async () => {
      setJoinStatus("joining");
      setJoinErr("");
      try {
        const nomEnAttente = localStorage.getItem("pronostics2027_pending_nom");
        await ensureParticipant(session.user, nomEnAttente);
        if (nomEnAttente) localStorage.removeItem("pronostics2027_pending_nom");
        await joinLigueByCode(code, "invite_link");
        setJoinStatus("done");
        setTimeout(() => {
          window.location.href = "/";
        }, 1400);
      } catch (e) {
        setJoinStatus("error");
        setJoinErr(e.message || "Erreur");
      }
    })();
  }, [session, code]);

  const redirectUrl = `${window.location.origin}/join/${code}`;

  const submitAuth = async () => {
    setAuthErr("");
    setAuthInfo("");
    setAuthBusy(true);
    try {
      if (mode === "signup") {
        if (!nom.trim()) throw new Error("Entrez votre nom.");
        if (password !== password2) throw new Error("Les deux mots de passe ne correspondent pas.");
        const res = await signUp(email.trim(), password, nom.trim(), redirectUrl);
        if (!res.session) {
          setAuthInfo("Compte créé ! Vérifiez votre boîte mail et cliquez sur le lien de confirmation — vous rejoindrez la ligue automatiquement, sans rien resaisir.");
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e) {
      setAuthErr(e.message || "Erreur");
    } finally {
      setAuthBusy(false);
    }
  };

  const peutValider = mode === "signup" ? !!email && !!password && !!password2 && !!nom.trim() : !!email && !!password;

  return (
    <div style={{ background: COLORS.ink900, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }} className="flex flex-col justify-center px-6 py-10">
      <div className="text-center mb-6">
        <div className="mb-4">
          <HeaderPortrait size={110} />
        </div>
        <div className="text-xs tracking-widest uppercase mb-2" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace" }}>
          Présidentielle 2027 · QuiAvaitRaison
        </div>
      </div>

      {ligueNom === undefined && (
        <Card><p className="text-sm text-center" style={{ color: COLORS.paperDim }}>Chargement de l'invitation…</p></Card>
      )}

      {ligueNom === null && (
        <Card>
          <p className="text-sm text-center mb-3" style={{ color: COLORS.danger }}>
            Ce lien d'invitation n'est plus valide (code inconnu).
          </p>
          {previewErr && <p className="text-xs text-center mb-3" style={{ color: COLORS.paperDim }}>{previewErr}</p>}
          <Button onClick={() => (window.location.href = "/")} className="w-full">Aller sur le site</Button>
        </Card>
      )}

      {ligueNom && (
        <>
          <div className="text-center mb-6">
            <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 24, fontWeight: 700 }}>
              Vous êtes invité·e à rejoindre
            </h1>
            <p style={{ fontFamily: "'Fraunces', serif", color: COLORS.gold, fontSize: 22, fontWeight: 700 }}>« {ligueNom} »</p>
          </div>

          {session === undefined && (
            <Card><p className="text-sm text-center" style={{ color: COLORS.paperDim }}>Un instant…</p></Card>
          )}

          {session === null && (
            <Card>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setMode("signup"); setAuthErr(""); setAuthInfo(""); }}
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: mode === "signup" ? COLORS.gold : "transparent", color: mode === "signup" ? COLORS.ink800 : COLORS.paperDim, border: `1px solid ${COLORS.ink600}` }}
                >
                  Créer un compte
                </button>
                <button
                  onClick={() => { setMode("signin"); setAuthErr(""); setAuthInfo(""); }}
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: mode === "signin" ? COLORS.gold : "transparent", color: mode === "signin" ? COLORS.ink800 : COLORS.paperDim, border: `1px solid ${COLORS.ink600}` }}
                >
                  J'ai déjà un compte
                </button>
              </div>
              {mode === "signup" && (
                <Field label="Votre nom (affiché aux autres joueurs)">
                  <input style={inputStyle} value={nom} onChange={(e) => setNom(e.target.value)} />
                </Field>
              )}
              <Field label="Email">
                <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Mot de passe">
                <input type="password" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              {mode === "signup" && (
                <Field label="Confirmez le mot de passe">
                  <input type="password" style={inputStyle} value={password2} onChange={(e) => setPassword2(e.target.value)} />
                </Field>
              )}
              {authErr && <p className="text-xs mb-3" style={{ color: COLORS.danger }}>{authErr}</p>}
              {authInfo && <p className="text-xs mb-3" style={{ color: COLORS.verified }}>{authInfo}</p>}
              <Button onClick={submitAuth} disabled={authBusy || !peutValider} className="w-full">
                {authBusy ? "Un instant…" : mode === "signup" ? `Créer mon compte et rejoindre` : "Me connecter et rejoindre"}
              </Button>
            </Card>
          )}

          {session && (
            <Card>
              {joinStatus === "joining" && <p className="text-sm text-center" style={{ color: COLORS.paperDim }}>Ajout à la ligue…</p>}
              {joinStatus === "done" && (
                <p className="text-sm text-center" style={{ color: COLORS.verified }}>
                  ✓ Vous faites désormais partie de « {ligueNom} » ! Redirection vers le jeu…
                </p>
              )}
              {joinStatus === "error" && (
                <>
                  <p className="text-sm text-center mb-3" style={{ color: COLORS.danger }}>{joinErr}</p>
                  <Button onClick={() => (window.location.href = "/")} className="w-full">Aller sur le site</Button>
                </>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
