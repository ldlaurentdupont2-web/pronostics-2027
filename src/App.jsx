import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabaseClient";
import { fetchAllData, subscribeToChanges, signUp, signIn, signOut, ensureParticipant, resetPasswordForEmail, updatePassword } from "./lib/db";
import { COLORS, FONT_LINK, Card, Button, Field, inputStyle, HeaderPortrait } from "./components/ui";
import { fmtDeadline } from "./lib/format";
import Regles from "./screens/Regles";
import Accueil from "./screens/Accueil";
import Calendrier from "./screens/Calendrier";
import Pronostiquer from "./screens/Pronostiquer";
import Historique from "./screens/Historique";
import ClassementGroupe from "./screens/ClassementGroupe";
import RequireLigueGate from "./screens/RequireLigueGate";
import Admin from "./screens/Admin";

export default function App() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_LINK;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const [session, setSession] = useState(undefined); // undefined = en cours de vérification, null = pas connecté
  const [data, setDataState] = useState(null);
  const [tab, setTab] = useState("accueil");
  const [loadError, setLoadError] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);

  const reload = useCallback(async () => {
    try {
      const d = await fetchAllData();
      setDataState(d);
      setLoadError("");
    } catch (e) {
      setLoadError(e.message || "Erreur de chargement des données.");
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Déclenché quand on arrive sur le site via le lien "mot de passe oublié" reçu par email.
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    reload();
    const unsubscribe = subscribeToChanges(() => reload());
    return unsubscribe;
  }, [session, reload]);

  // Filet de sécurité : on recharge aussi les données à chaque changement d'onglet,
  // au cas où une notification en temps réel aurait été manquée.
  useEffect(() => {
    if (session) reload();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filet de sécurité : si la confirmation par email est activée, la fiche "participant"
  // n'a pas pu être créée au moment du signUp (pas de session à ce moment-là). On la crée
  // ici dès qu'on détecte une session connectée sans profil participant correspondant.
  useEffect(() => {
    if (!session || !data) return;
    const already = data.participants.find((p) => p.userId === session.user.id);
    if (already) return;
    const nomEnAttente = localStorage.getItem("pronostics2027_pending_nom");
    ensureParticipant(session.user, nomEnAttente)
      .then(() => {
        localStorage.removeItem("pronostics2027_pending_nom");
        reload();
      })
      .catch((e) => setLoadError(e.message || "Échec de création du profil."));
  }, [session, data, reload]);

  if (session === undefined) return <Loading />;
  if (recoveryMode) return <ResetPasswordScreen onDone={() => setRecoveryMode(false)} />;
  if (!session) return <AuthScreen />;
  if (loadError) return <Loading error={loadError} />;
  if (!data) return <Loading />;

  const me = data.participants.find((p) => p.userId === session.user.id);
  if (!me) return <Loading text="Création de votre profil…" />;

  const isAdmin = !!me.isAdmin;

  // Impossible de jouer sans appartenir à au moins une ligue (sauf l'admin, qui doit
  // pouvoir configurer sessions/candidats/ligues avant que qui que ce soit ne rejoigne).
  const appartientAUneLigue = data.adhesions.some((a) => a.participantId === me.id);
  if (!isAdmin && !appartientAUneLigue) return <RequireLigueGate me={me} />;

  const tabs = [
    ["accueil", "Accueil"],
    ["calendrier", "Calendrier"],
    ["regles", "Règles du jeu"],
    ["pronostiquer", "Pronostiquer"],
    ["historique", "Historique"],
    ["classement", "Classement"],
    ...(isAdmin ? [["admin", "Admin"]] : []),
  ];

  const sessionOuverte = data.sessions.find((s) => s.statut === "ouverte");

  return (
    <div style={{ background: COLORS.ink900, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <header className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${COLORS.ink700}` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs tracking-widest uppercase" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace" }}>
              Présidentielle 2027
            </div>
            <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 22, fontWeight: 600 }}>Pronostics</h1>
          </div>
          <button onClick={() => signOut()} className="text-xs" style={{ color: COLORS.paperDim }}>
            {me.nom} · déconnexion
          </button>
        </div>
      </header>

      {sessionOuverte && (
        <button
          onClick={() => setTab("calendrier")}
          className="w-full px-5 py-2 text-left text-xs flex items-center justify-between gap-2 flex-wrap"
          style={{ background: COLORS.gold + "18", borderBottom: `1px solid ${COLORS.ink700}`, color: COLORS.paper }}
        >
          <span>
            <strong>{sessionOuverte.titre}</strong> — pronostics modifiables jusqu'au {fmtDeadline(sessionOuverte.cloture)}
          </span>
          <span style={{ color: COLORS.gold, fontWeight: 600 }}>Voir le calendrier →</span>
        </button>
      )}

      <nav className="flex gap-1 px-3 pt-3 overflow-x-auto" style={{ borderBottom: `1px solid ${COLORS.ink700}` }}>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-3 py-2 text-sm whitespace-nowrap rounded-t-lg"
            style={{
              color: tab === key ? COLORS.gold : COLORS.paperDim,
              borderBottom: tab === key ? `2px solid ${COLORS.gold}` : "2px solid transparent",
              fontWeight: tab === key ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="p-4 pb-10">
        {tab === "accueil" && <Accueil data={data} me={me} setTab={setTab} />}
        {tab === "calendrier" && <Calendrier data={data} />}
        {tab === "regles" && <Regles />}
        {tab === "pronostiquer" && <Pronostiquer data={data} me={me} />}
        {tab === "historique" && <Historique data={data} me={me} />}
        {tab === "classement" && <ClassementGroupe data={data} me={me} />}
        {tab === "admin" && isAdmin && <Admin data={data} />}
      </main>
    </div>
  );
}

function Loading({ text = "chargement…", error }) {
  return (
    <div style={{ background: COLORS.ink900, minHeight: "100vh" }} className="flex items-center justify-center px-6 text-center">
      <span style={{ color: error ? COLORS.danger : COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>{error || text}</span>
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [nom, setNom] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const changeMode = (m) => {
    setMode(m);
    setErr("");
    setInfo("");
  };

  const submit = async () => {
    setErr("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!nom.trim()) throw new Error("Entrez votre nom.");
        if (password !== password2) throw new Error("Les deux mots de passe ne correspondent pas.");
        const res = await signUp(email.trim(), password, nom.trim());
        if (!res.session) setInfo("Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.");
      } else if (mode === "forgot") {
        await resetPasswordForEmail(email.trim());
        setInfo("Si un compte existe avec cette adresse, un email pour choisir un nouveau mot de passe vient d'être envoyé.");
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const peutValider = mode === "forgot" ? !!email : mode === "signup" ? !!email && !!password && !!password2 && !!nom.trim() : !!email && !!password;

  return (
    <div style={{ background: COLORS.ink900, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }} className="flex flex-col justify-center px-6">
      <div className="text-center mb-8">
        <div className="mb-4">
          <HeaderPortrait size={140} />
        </div>
        <div className="text-xs tracking-widest uppercase mb-2" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace" }}>
          Présidentielle 2027
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 28, fontWeight: 700 }}>
          Pronostics
        </h1>
      </div>
      <Card>
        {mode !== "forgot" && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => changeMode("signin")}
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ background: mode === "signin" ? COLORS.gold : "transparent", color: mode === "signin" ? COLORS.ink800 : COLORS.paperDim, border: `1px solid ${COLORS.ink600}` }}
            >
              Se connecter
            </button>
            <button
              onClick={() => changeMode("signup")}
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ background: mode === "signup" ? COLORS.gold : "transparent", color: mode === "signup" ? COLORS.ink800 : COLORS.paperDim, border: `1px solid ${COLORS.ink600}` }}
            >
              Créer un compte
            </button>
          </div>
        )}
        {mode === "forgot" && (
          <p className="text-sm mb-4" style={{ color: COLORS.paper }}>Mot de passe oublié</p>
        )}
        {mode === "signup" && (
          <Field label="Votre nom (affiché aux autres joueurs)">
            <input style={inputStyle} value={nom} onChange={(e) => setNom(e.target.value)} />
          </Field>
        )}
        <Field label="Email">
          <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {mode !== "forgot" && (
          <Field label="Mot de passe">
            <input type="password" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        )}
        {mode === "signup" && (
          <Field label="Confirmez le mot de passe">
            <input type="password" style={inputStyle} value={password2} onChange={(e) => setPassword2(e.target.value)} />
          </Field>
        )}
        {mode === "signin" && (
          <button onClick={() => changeMode("forgot")} className="text-xs mb-3" style={{ color: COLORS.paperDim }}>
            Mot de passe oublié ?
          </button>
        )}
        {err && <p className="text-xs mb-3" style={{ color: COLORS.danger }}>{err}</p>}
        {info && <p className="text-xs mb-3" style={{ color: COLORS.verified }}>{info}</p>}
        <Button onClick={submit} disabled={busy || !peutValider} className="w-full">
          {busy ? "Un instant…" : mode === "signup" ? "Créer mon compte" : mode === "forgot" ? "Envoyer le lien" : "Se connecter"}
        </Button>
        {mode === "signup" && (
          <p className="text-xs mt-3" style={{ color: COLORS.paperDim }}>
            Le tout premier compte créé devient automatiquement administrateur.
          </p>
        )}
        {mode === "forgot" && (
          <button onClick={() => changeMode("signin")} className="text-xs mt-3" style={{ color: COLORS.paperDim }}>
            ← Retour à la connexion
          </button>
        )}
      </Card>
    </div>
  );
}

function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const valider = async () => {
    setErr("");
    if (password.length < 6) {
      setErr("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (password !== password2) {
      setErr("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      onDone();
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: COLORS.ink900, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }} className="flex flex-col justify-center px-6">
      <div className="text-center mb-8">
        <div className="text-xs tracking-widest uppercase mb-2" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace" }}>
          Présidentielle 2027
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 26, fontWeight: 700 }}>Choisir un nouveau mot de passe</h1>
      </div>
      <Card>
        <Field label="Nouveau mot de passe">
          <input type="password" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirmez le nouveau mot de passe">
          <input type="password" style={inputStyle} value={password2} onChange={(e) => setPassword2(e.target.value)} />
        </Field>
        {err && <p className="text-xs mb-3" style={{ color: COLORS.danger }}>{err}</p>}
        <Button onClick={valider} disabled={busy || !password || !password2} className="w-full">
          {busy ? "Un instant…" : "Valider le nouveau mot de passe"}
        </Button>
      </Card>
    </div>
  );
}
