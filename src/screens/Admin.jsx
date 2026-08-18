import React, { useEffect, useRef, useState } from "react";
import { Card, Button, Badge, Field, inputStyle, COLORS, CandidatAvatar } from "../components/ui";
import { fmtDateTime } from "../lib/format";
import { ligueMembers } from "../lib/scoring";
import { PHASES } from "../lib/phases";
import { CANDIDATOR_IMPORT } from "../lib/candidatorImport";
import {
  addLigue,
  addCandidat,
  setCandidatStatut,
  setCandidatPhoto,
  removeCandidat,
  upsertCandidatsBulk,
  createSession,
  closeSession,
  openSession,
  deleteSession,
  addQuestion,
  bulkAddQuestions,
  removeQuestion,
  reorderQuestions,
  setResultat,
  addEcheance,
  updateEcheance,
  deleteEcheance,
  fetchParticipantsWithEmail,
} from "../lib/db";

export default function Admin({ data }) {
  const [section, setSection] = useState("sessions");
  const sections = [
    ["sessions", "Sessions"],
    ["suivi", "Suivi des réponses"],
    ["candidats", "Candidats"],
    ["ligues", "Ligues"],
    ["participants", "Participants"],
    ["resultats", "Résultats"],
    ["calendrier", "Calendrier des points"],
  ];
  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {sections.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSection(k)}
            className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap"
            style={{
              background: section === k ? COLORS.gold : "transparent",
              color: section === k ? COLORS.ink800 : COLORS.paperDim,
              border: `1px solid ${section === k ? COLORS.gold : COLORS.ink600}`,
            }}
          >
            {l}
          </button>
        ))}
      </div>
      {section === "sessions" && <AdminSessions data={data} />}
      {section === "suivi" && <AdminSuivi data={data} />}
      {section === "candidats" && <AdminCandidats data={data} />}
      {section === "ligues" && <AdminLigues data={data} />}
      {section === "participants" && <AdminParticipants data={data} />}
      {section === "resultats" && <AdminResultats data={data} />}
      {section === "calendrier" && <AdminCalendrier data={data} />}
    </div>
  );
}

/* ---------- Ligues ---------- */

function AdminLigues({ data }) {
  const [nom, setNom] = useState("");
  const [err, setErr] = useState("");
  const [lastCreated, setLastCreated] = useState(null);
  const add = async () => {
    if (!nom.trim()) {
      setErr("Entrez un nom de ligue avant de créer.");
      return;
    }
    setErr("");
    try {
      const created = await addLigue(nom.trim());
      setLastCreated(created);
      setNom("");
    } catch (e) {
      setErr("La sauvegarde a échoué : " + (e?.message || "erreur inconnue"));
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <Field label="Nouvelle ligue">
          <input
            style={inputStyle}
            value={nom}
            onChange={(e) => {
              setNom(e.target.value);
              setErr("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="Ex. Ligue des amis"
          />
        </Field>
        {err && <p className="text-xs mb-2" style={{ color: COLORS.danger }}>{err}</p>}
        <Button onClick={add} disabled={!nom.trim()}>Créer la ligue</Button>
        {lastCreated && (
          <p className="text-xs mt-3" style={{ color: COLORS.verified }}>
            Ligue « {lastCreated.nom} » créée. Code à partager avec les joueurs concernés :{" "}
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: COLORS.gold, fontWeight: 600 }}>{lastCreated.code}</span>
          </p>
        )}
      </Card>
      <p className="text-xs -mb-1" style={{ color: COLORS.paperDim }}>
        Chaque ligue a un code d'invitation. Seuls ceux qui le connaissent peuvent la rejoindre — communique-le uniquement au bon groupe.
      </p>
      {data.ligues.map((l) => {
        const membres = ligueMembers(l.id, data);
        return (
          <Card key={l.id}>
            <div className="flex items-center justify-between mb-1">
              <span style={{ color: COLORS.paper }} className="font-medium">{l.nom}</span>
              <span className="text-xs" style={{ color: COLORS.paperDim }}>{membres.length} membre(s)</span>
            </div>
            <p className="text-xs mb-1.5" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>
              Code : <span style={{ color: COLORS.gold, fontWeight: 600 }}>{l.code}</span>
            </p>
            <p className="text-xs" style={{ color: COLORS.paperDim }}>
              {membres.length === 0 ? "Aucun membre pour l'instant." : membres.map((m) => m.nom).join(", ")}
            </p>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------- Candidats ---------- */

function AdminCandidats({ data }) {
  const [nom, setNom] = useState("");
  const [familleId, setFamilleId] = useState(data.familles[0]?.id || "");
  const [photoUrl, setPhotoUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const add = async () => {
    if (!nom.trim()) return;
    try {
      await addCandidat(nom.trim(), familleId, photoUrl.trim());
      setNom("");
      setPhotoUrl("");
    } catch (e) {
      setImportMsg("Échec de l'ajout : " + (e?.message || "erreur inconnue"));
    }
  };

  const importCandidator = async () => {
    setImporting(true);
    try {
      const rows = CANDIDATOR_IMPORT.map((entry) => ({
        nom: entry.nom,
        photoUrl: entry.photoUrl,
        familleId: data.familles[entry.familleIdx]?.id || data.familles[0]?.id,
      }));
      const { added, updated } = await upsertCandidatsBulk(rows);
      setImportMsg(`${added} candidat(s) ajouté(s), ${updated} mis à jour.`);
    } catch (e) {
      setImportMsg("Échec de l'import : " + (e?.message || "erreur inconnue"));
    } finally {
      setImporting(false);
    }
  };

  const statuts = ["potentiel", "exploratoire", "déclaré", "investi", "retiré", "qualifié"];

  const renderCandidatCard = (c) => (
    <Card key={c.id}>
      <div className="flex items-center gap-3 mb-2">
        <CandidatAvatar nom={c.nom} photoUrl={c.photoUrl} size={44} />
        <div className="flex-1">
          <span style={{ color: COLORS.paper }} className="font-medium block">{c.nom}</span>
        </div>
        <button onClick={() => removeCandidat(c.id)} className="text-xs shrink-0" style={{ color: COLORS.danger }}>retirer</button>
      </div>
      <select style={inputStyle} value={c.statut} onChange={(e) => setCandidatStatut(c.id, e.target.value)}>
        {statuts.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </Card>
  );

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <p className="text-sm font-medium mb-1" style={{ color: COLORS.paper }}>Import depuis Candidator.fr</p>
        <p className="text-xs mb-3" style={{ color: COLORS.paperDim }}>
          Importe {CANDIDATOR_IMPORT.length} candidats, leur famille politique et leur photo (récupérée directement depuis candidator.fr —
          si une photo ne charge pas, un avatar à initiales prend automatiquement le relais).
        </p>
        <Button onClick={importCandidator} disabled={importing}>{importing ? "Import en cours…" : "Importer / actualiser depuis Candidator"}</Button>
        {importMsg && <p className="text-xs mt-2" style={{ color: COLORS.verified }}>{importMsg}</p>}
      </Card>

      <Card>
        <Field label="Nom du candidat">
          <input style={inputStyle} value={nom} onChange={(e) => setNom(e.target.value)} />
        </Field>
        <Field label="Famille politique">
          <select style={inputStyle} value={familleId} onChange={(e) => setFamilleId(e.target.value)}>
            {data.familles.map((f) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </Field>
        <Field label="Lien vers une fiche (facultatif, non affiché)">
          <input style={inputStyle} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <Button onClick={add} disabled={!nom.trim()}>Ajouter</Button>
      </Card>

      {data.familles.map((f) => {
        const cands = data.candidats.filter((c) => c.familleId === f.id);
        if (cands.length === 0) return null;
        return (
          <div key={f.id}>
            <p className="text-xs uppercase tracking-wide mb-2 mt-1" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace" }}>
              {f.nom} <span style={{ color: COLORS.paperDim }}>· {cands.length}</span>
            </p>
            <div className="flex flex-col gap-3">{cands.map(renderCandidatCard)}</div>
          </div>
        );
      })}
      {data.candidats.some((c) => !data.familles.some((f) => f.id === c.familleId)) && (
        <div>
          <p className="text-xs uppercase tracking-wide mb-2 mt-1" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>Sans famille</p>
          <div className="flex flex-col gap-3">
            {data.candidats.filter((c) => !data.familles.some((f) => f.id === c.familleId)).map(renderCandidatCard)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Sessions ---------- */

function AdminSessions({ data }) {
  const [editingSession, setEditingSession] = useState(null);
  const [titre, setTitre] = useState("");
  const [phase, setPhase] = useState(1);
  const defaultCloture = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  const [cloture, setCloture] = useState(defaultCloture());
  const [err, setErr] = useState("");

  const create = async () => {
    if (!titre.trim()) {
      setErr("Donnez un titre à la session.");
      return;
    }
    if (!cloture) {
      setErr("Choisissez une date de clôture.");
      return;
    }
    setErr("");
    try {
      await createSession(titre.trim(), new Date(cloture).toISOString(), phase);
      setTitre("");
      setCloture(defaultCloture());
    } catch (e) {
      setErr("La sauvegarde a échoué : " + (e?.message || "erreur inconnue"));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <p className="text-xs mb-3" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>Nouvelle session</p>
        <Field label="Titre">
          <input style={inputStyle} value={titre} onChange={(e) => { setTitre(e.target.value); setErr(""); }} placeholder="Ex. Photographie des candidatures — été 2026" />
        </Field>
        <Field label="Phase">
          <select style={inputStyle} value={phase} onChange={(e) => setPhase(Number(e.target.value))}>
            {PHASES.map((p) => (
              <option key={p.numero} value={p.numero}>{p.titre}</option>
            ))}
          </select>
        </Field>
        <Field label="Date de clôture">
          <input type="datetime-local" style={inputStyle} value={cloture} onChange={(e) => { setCloture(e.target.value); setErr(""); }} />
        </Field>
        {err && <p className="text-xs mb-2" style={{ color: COLORS.danger }}>{err}</p>}
        <Button onClick={create} disabled={!titre.trim() || !cloture}>Créer la session</Button>
      </Card>

      {data.sessions.map((s) => {
        const statutLabel = s.statut === "ouverte" ? "ouverte" : s.statut === "close" ? "close" : "planifiée";
        const statutTone = s.statut === "ouverte" ? "gold" : s.statut === "close" ? "muted" : "verified";
        const questionsCount = data.questions.filter((q) => q.sessionId === s.id).length;
        return (
          <Card key={s.id}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p style={{ color: COLORS.paper }} className="font-medium">{s.titre}</p>
                <p className="text-xs" style={{ color: COLORS.paperDim }}>
                  Phase {s.phase || 1} · Clôture {fmtDateTime(s.cloture)}
                </p>
              </div>
              <Badge tone={statutTone}>{statutLabel}</Badge>
            </div>
            <div className="flex gap-2 mb-3 flex-wrap">
              <Button variant="ghost" onClick={() => setEditingSession(editingSession === s.id ? null : s.id)}>
                {editingSession === s.id ? "Fermer l'éditeur" : "Gérer les questions"}
              </Button>
              {s.statut === "ouverte" && <Button variant="danger" onClick={() => closeSession(s.id)}>Clôturer</Button>}
              {s.statut !== "ouverte" && s.statut !== "close" && <Button onClick={() => openSession(s.id)}>Ouvrir maintenant</Button>}
              {questionsCount === 0 && (
                <Button variant="danger" onClick={() => deleteSession(s.id)}>Supprimer (session vide)</Button>
              )}
            </div>
            {editingSession === s.id && <QuestionEditor session={s} data={data} />}
          </Card>
        );
      })}
    </div>
  );
}

function QuestionEditor({ session, data }) {
  const [libelle, setLibelle] = useState("");
  const [type, setType] = useState("choix_unique");
  const [sourceOptions, setSourceOptions] = useState("candidats");
  const [points, setPoints] = useState(10);
  const [pointsScore, setPointsScore] = useState(1);
  const [penalite, setPenalite] = useState(0);
  const [optionsLibres, setOptionsLibres] = useState("");
  const [selectedCandidatIds, setSelectedCandidatIds] = useState([]);
  const [appliedIndex, setAppliedIndex] = useState(null);
  const [numeriqueEntier, setNumeriqueEntier] = useState(false);
  const [numeriqueExact, setNumeriqueExact] = useState(false);
  const [resultatAttendu, setResultatAttendu] = useState("");
  const formRef = useRef(null);

  const qs = data.questions.filter((q) => q.sessionId === session.id).sort((a, b) => a.ordre - b.ordre);

  const toggleCandidat = (cid) => {
    setSelectedCandidatIds((ids) => (ids.includes(cid) ? ids.filter((x) => x !== cid) : [...ids, cid]));
  };

  const applySuggestion = (s, i) => {
    setLibelle(s.libelle);
    setType(s.type);
    if (s.type === "choix_unique" || s.type === "choix_multiple" || s.type === "candidat_score") {
      setSourceOptions("candidats");
      setSelectedCandidatIds(s.candidatIds);
    }
    setPoints(s.points);
    if (s.type === "candidat_score") setPointsScore(s.pointsScore ?? 1);
    setPenalite(s.penalite ?? 0);
    setNumeriqueEntier(!!s.numeriqueEntier);
    setNumeriqueExact(!!s.numeriqueExact);
    setResultatAttendu(s.resultatAttendu || "");
    setAppliedIndex(i);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const familleSuggestions = data.familles
    .map((f) => ({ famille: f, cands: data.candidats.filter((c) => c.familleId === f.id) }))
    .filter((x) => x.cands.length > 0)
    .map((x) => ({
      libelle: `Quels seront les candidats de la famille « ${x.famille.nom} » ? (±2 pts par candidat, correct ou faux)`,
      type: "choix_multiple",
      candidatIds: x.cands.map((c) => c.id),
      points: 2,
      bonusFamilleExacte: true,
      resultatAttendu: "12 mars 2027 (dépôt officiel des parrainages)",
    }));
  const candidatScoreSuggestions = data.familles
    .map((f) => ({ famille: f, cands: data.candidats.filter((c) => c.familleId === f.id) }))
    .filter((x) => x.cands.length > 0)
    .map((x) => ({
      libelle: `Qui arrivera en tête de la famille « ${x.famille.nom} » au premier tour, et avec quel score ? (2 pts bon candidat + 1 pt score le plus proche, réservé à ceux qui ont le bon candidat)`,
      type: "candidat_score",
      candidatIds: x.cands.map((c) => c.id),
      points: 2,
      pointsScore: 1,
      resultatAttendu: "18 avril 2027 (1er tour)",
    }));
  const surpriseSuggestion = [
    {
      libelle:
        "Nommez un candidat qui pourrait se présenter mais qui n'est pas encore dans notre liste (laissez vide si vous ne pensez à personne). (+6 pts si son nom sort, -2 pts si votre pari ne se réalise pas)",
      type: "texte_pari",
      candidatIds: [],
      points: 6,
      penalite: 2,
      resultatAttendu: "12 mars 2027 (dépôt officiel des parrainages)",
    },
  ];

  // Questions variables du mois : à garder, adapter ou remplacer session après session.
  const questionsVariablesSuggestions = [
    {
      libelle: "Quel sera, au premier tour, le score (%) du candidat de la famille « Droite nationale » arrivé en tête de sa famille ? (le plus proche gagne, réponse à 1 décimale)",
      type: "numerique",
      candidatIds: [],
      points: 2,
      resultatAttendu: "18 avril 2027 (1er tour)",
    },
    {
      libelle: "Quel sera, au premier tour, le score (%) du candidat de la famille « Gauche radicale » arrivé en tête de sa famille ? (le plus proche gagne, réponse à 1 décimale)",
      type: "numerique",
      candidatIds: [],
      points: 2,
      resultatAttendu: "18 avril 2027 (1er tour)",
    },
    {
      libelle: "Quel sera, au premier tour, le score (%) du candidat de la famille « Gauche sociale-démocrate, écologiste et alliés » arrivé en tête de sa famille ? (le plus proche gagne, réponse à 1 décimale)",
      type: "numerique",
      candidatIds: [],
      points: 2,
      resultatAttendu: "18 avril 2027 (1er tour)",
    },
    {
      libelle: "Le PS aura-t-il un candidat adhérent au PS au moment du dépôt de candidature ?",
      type: "oui_non",
      candidatIds: [],
      points: 2,
      resultatAttendu: "12 mars 2027 (dépôt officiel des parrainages)",
    },
    {
      libelle:
        "Une primaire (ouverte ou fermée) à laquelle participeront Gabriel Attal et Édouard Philippe sera-t-elle officiellement annoncée (annonce publique conjointe) avant la clôture de la session de fin décembre ?",
      type: "oui_non",
      candidatIds: [],
      points: 2,
      resultatAttendu: "À la clôture de la session de fin décembre 2026",
    },
  ];

  const suggestionsBrutes = [...familleSuggestions, ...candidatScoreSuggestions, ...questionsVariablesSuggestions, ...surpriseSuggestion];

  // Pré-remplissage : si une question au libellé identique existait déjà dans une session
  // précédente, on reprend ses réglages (points, pénalité, "quand le résultat sera connu"…)
  // plutôt que les valeurs par défaut ci-dessus — pratique pour ajuster juste ce qui a changé.
  const autresSessions = data.sessions.filter((s) => s.id !== session.id).sort((a, b) => new Date(b.ouverture) - new Date(a.ouverture));
  const previousQuestionFor = (libelle) => {
    for (const s of autresSessions) {
      const match = data.questions.find((q) => q.sessionId === s.id && q.libelle === libelle);
      if (match) return match;
    }
    return null;
  };
  const suggestions = suggestionsBrutes.map((s) => {
    const prev = previousQuestionFor(s.libelle);
    if (!prev) return s;
    return {
      ...s,
      points: prev.points ?? s.points,
      pointsScore: prev.pointsScore ?? s.pointsScore,
      penalite: prev.penalite ?? s.penalite,
      numeriqueEntier: prev.numeriqueEntier ?? s.numeriqueEntier,
      numeriqueExact: prev.numeriqueExact ?? s.numeriqueExact,
      resultatAttendu: prev.resultatAttendu || s.resultatAttendu,
    };
  });

  const add = async () => {
    if (!libelle.trim()) return;
    await addQuestion({
      sessionId: session.id,
      libelle: libelle.trim(),
      type,
      points: Number(points),
      pointsScore: type === "candidat_score" ? Number(pointsScore) : undefined,
      penalite: type === "choix_unique" || type === "oui_non" || type === "texte_pari" ? Number(penalite) || 0 : undefined,
      ordre: qs.length,
      optionsLibres: (type === "choix_unique" || type === "choix_multiple") && sourceOptions === "texte" ? optionsLibres.split(",").map((o) => o.trim()).filter(Boolean) : [],
      optionsCandidatIds: ((type === "choix_unique" || type === "choix_multiple") && sourceOptions === "candidats") || type === "candidat_score" ? selectedCandidatIds : [],
      avecProbabilite: false,
      numeriqueEntier: type === "numerique" ? numeriqueEntier : false,
      numeriqueExact: type === "numerique" ? numeriqueExact : false,
      resultatAttendu: resultatAttendu.trim(),
    });
    setLibelle("");
    setResultatAttendu("");
    setOptionsLibres("");
    setSelectedCandidatIds([]);
    setNumeriqueEntier(false);
    setNumeriqueExact(false);
  };

  const moveQuestionToPosition = async (qid, newIndex) => {
    const current = [...qs];
    const idx = current.findIndex((q) => q.id === qid);
    if (idx === -1 || newIndex === idx) return;
    const [item] = current.splice(idx, 1);
    current.splice(newIndex, 0, item);
    await reorderQuestions(current.map((q) => q.id));
  };

  const bulkAddFamilleCandidats = async () => {
    const already = new Set(qs.filter((q) => q.type === "choix_multiple").map((q) => (q.optionsCandidatIds || []).slice().sort().join("|")));
    const toAdd = familleSuggestions
      .filter((s) => !already.has(s.candidatIds.slice().sort().join("|")))
      .map((s, i) => ({
        sessionId: session.id,
        libelle: s.libelle,
        type: "choix_multiple",
        points: s.points,
        ordre: qs.length + i,
        optionsLibres: [],
        optionsCandidatIds: s.candidatIds,
        avecProbabilite: false,
        bonusFamilleExacte: true,
      }));
    await bulkAddQuestions(toAdd);
  };

  return (
    <div className="mt-2 pt-3" style={{ borderTop: `1px solid ${COLORS.ink700}` }}>
      <div className="flex flex-col gap-2 mb-3">
        {qs.map((q, i) => (
          <div key={q.id} className="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: COLORS.ink900, color: COLORS.paperDim }}>
            <select value={i} onChange={(e) => moveQuestionToPosition(q.id, Number(e.target.value))} className="shrink-0" style={{ ...inputStyle, width: 52, padding: "4px 6px", fontSize: 12 }}>
              {qs.map((_, pos) => (
                <option key={pos} value={pos}>{pos + 1}</option>
              ))}
            </select>
            <span className="flex-1">
              {q.libelle} <span style={{ color: COLORS.gold }}>· {q.points} pts</span>
            </span>
            <button onClick={() => removeQuestion(q.id)} className="shrink-0" style={{ color: COLORS.danger }}>supprimer</button>
          </div>
        ))}
      </div>

      {familleSuggestions.length > 0 && (
        <div className="mb-3">
          <Button variant="ghost" onClick={bulkAddFamilleCandidats} className="w-full">+ Ajouter "quels seront les candidats ?" pour toutes les familles restantes</Button>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mb-4 pb-4" style={{ borderBottom: `1px solid ${COLORS.ink700}` }}>
          <p className="text-xs mb-2" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace" }}>Suggestions (basées sur vos candidats) — cliquez pour pré-remplir</p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => applySuggestion(s, i)}
                className="text-left text-xs rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                style={{ background: appliedIndex === i ? COLORS.gold + "22" : COLORS.ink900, border: `1px solid ${appliedIndex === i ? COLORS.gold : COLORS.ink600}`, color: COLORS.paper }}
              >
                <span>{s.libelle}</span>
                {appliedIndex === i && <span className="shrink-0" style={{ color: COLORS.gold }}>✓ pré-rempli ↓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={formRef}>
        <Field label="Intitulé de la question">
          <input style={inputStyle} value={libelle} onChange={(e) => setLibelle(e.target.value)} />
        </Field>
      </div>
      <Field label="Type">
        <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="choix_unique">Choix unique</option>
          <option value="choix_multiple">Choix multiple</option>
          <option value="oui_non">Oui / non</option>
          <option value="numerique">Numérique (le plus proche gagne)</option>
          <option value="candidat_score">Tête de famille + score</option>
          <option value="texte_pari">Pari nominatif (texte libre, noté)</option>
          <option value="texte">Texte libre (non classant)</option>
        </select>
      </Field>
      {(type === "choix_unique" || type === "choix_multiple" || type === "candidat_score") && (
        <>
          {type !== "candidat_score" && (
            <Field label="Source des options">
              <select style={inputStyle} value={sourceOptions} onChange={(e) => setSourceOptions(e.target.value)}>
                <option value="candidats">Candidats existants (avatar)</option>
                <option value="texte">Texte libre</option>
              </select>
            </Field>
          )}
          {type === "candidat_score" || sourceOptions === "candidats" ? (
            data.candidats.length === 0 ? (
              <p className="text-xs mb-3" style={{ color: COLORS.paperDim }}>Aucun candidat enregistré — ajoutez-en d'abord dans l'onglet Candidats.</p>
            ) : (
              <div className="flex flex-col gap-3 mb-3">
                {data.familles.map((f) => {
                  const cands = data.candidats.filter((c) => c.familleId === f.id);
                  if (cands.length === 0) return null;
                  const allSelected = cands.every((c) => selectedCandidatIds.includes(c.id));
                  return (
                    <div key={f.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs uppercase tracking-wide" style={{ color: COLORS.gold, fontFamily: "'IBM Plex Mono', monospace" }}>{f.nom}</span>
                        <button
                          onClick={() => setSelectedCandidatIds((ids) => (allSelected ? ids.filter((id) => !cands.some((c) => c.id === id)) : [...new Set([...ids, ...cands.map((c) => c.id)])]))}
                          className="text-xs"
                          style={{ color: COLORS.paperDim }}
                        >
                          {allSelected ? "tout désélectionner" : "tout sélectionner"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cands.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => toggleCandidat(c.id)}
                            className="flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 text-xs"
                            style={{
                              background: selectedCandidatIds.includes(c.id) ? COLORS.gold : COLORS.ink900,
                              color: selectedCandidatIds.includes(c.id) ? COLORS.ink800 : COLORS.paper,
                              border: `1px solid ${selectedCandidatIds.includes(c.id) ? COLORS.gold : COLORS.ink600}`,
                            }}
                          >
                            <CandidatAvatar nom={c.nom} photoUrl={c.photoUrl} size={24} />
                            {c.nom}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <Field label="Options (séparées par virgules)">
              <input style={inputStyle} value={optionsLibres} onChange={(e) => setOptionsLibres(e.target.value)} placeholder="Candidat A, Candidat B, Autre" />
            </Field>
          )}
        </>
      )}
      {type !== "texte" && (
        <>
          <Field
            label={
              type === "choix_multiple"
                ? "Points par candidat correctement deviné"
                : type === "numerique"
                ? "Points pour l'estimation la plus proche"
                : type === "candidat_score"
                ? "Points pour le bon candidat en tête"
                : type === "texte_pari"
                ? "Points si le pari est correct"
                : "Points si correct"
            }
          >
            <input type="number" style={inputStyle} value={points} onChange={(e) => setPoints(e.target.value)} />
          </Field>
          {type === "candidat_score" && (
            <Field label="Points bonus pour le score le plus proche (réservé à ceux qui ont le bon candidat)">
              <input type="number" style={inputStyle} value={pointsScore} onChange={(e) => setPointsScore(e.target.value)} />
            </Field>
          )}
          {(type === "choix_unique" || type === "oui_non" || type === "texte_pari") && (
            <Field label="Pénalité si mauvaise réponse (0 = pas de pénalité)">
              <input type="number" style={inputStyle} value={penalite} onChange={(e) => setPenalite(e.target.value)} />
            </Field>
          )}
          <Field label="Quand le résultat sera-t-il connu ? (facultatif)">
            <input
              style={inputStyle}
              value={resultatAttendu}
              onChange={(e) => setResultatAttendu(e.target.value)}
              placeholder="Laisser vide = à la clôture de cette session"
            />
          </Field>
          {type === "numerique" && (
            <>
              <label className="flex items-center gap-2 mb-2 text-sm" style={{ color: COLORS.paper }}>
                <input type="checkbox" checked={numeriqueEntier} onChange={(e) => setNumeriqueEntier(e.target.checked)} />
                Nombre entier (pas de décimale, ex. un nombre de candidats) — sinon score en % à 1 décimale
              </label>
              <label className="flex items-center gap-2 mb-3 text-sm" style={{ color: COLORS.paper }}>
                <input type="checkbox" checked={numeriqueExact} onChange={(e) => setNumeriqueExact(e.target.checked)} />
                Points pour toute réponse exacte (au lieu de "le plus proche gagne")
              </label>
            </>
          )}
        </>
      )}
      {!libelle.trim() && <p className="text-xs mb-2" style={{ color: COLORS.paperDim }}>Saisissez d'abord un intitulé.</p>}
      <Button onClick={add} disabled={!libelle.trim()}>Ajouter la question</Button>
    </div>
  );
}

/* ---------- Résultats ---------- */

function AdminResultats({ data }) {
  const questionsSansResultat = data.questions.filter((q) => q.type !== "texte" && !data.resultats.find((r) => r.questionId === q.id));
  return (
    <div className="flex flex-col gap-3">
      {questionsSansResultat.length === 0 && <Card><p className="text-sm" style={{ color: COLORS.paperDim }}>Tous les résultats sont saisis.</p></Card>}
      {questionsSansResultat.map((q) => (
        <ResultatCard key={q.id} q={q} data={data} />
      ))}
      {data.resultats.length > 0 && (
        <Card>
          <p className="text-xs mb-2" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>Résultats déjà validés</p>
          {data.resultats.map((r) => {
            const q = data.questions.find((x) => x.id === r.questionId);
            const affiche = r.resultat && typeof r.resultat === "object" && r.resultat.annulee
              ? "sans objet (0 pt pour tout le monde)"
              : Array.isArray(r.resultat)
              ? r.resultat.join(", ")
              : r.resultat && typeof r.resultat === "object"
              ? `${r.resultat.candidat} (${r.resultat.score} %)`
              : r.resultat;
            return (
              <div key={r.id} className="text-sm py-1" style={{ color: COLORS.paper }}>
                {q?.libelle} → <span style={{ color: COLORS.gold }}>{affiche}</span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function ResultatCard({ q, data }) {
  const isMulti = q.type === "choix_multiple";
  const isNumeric = q.type === "numerique";
  const isCandidatScore = q.type === "candidat_score";
  const isTextePari = q.type === "texte_pari";
  const [selected, setSelected] = useState([]);
  const [numValue, setNumValue] = useState("");
  const [candidatChoice, setCandidatChoice] = useState("");
  const [nomsAcceptes, setNomsAcceptes] = useState("");
  const candidatOptions = q.optionsCandidatIds && q.optionsCandidatIds.length ? q.optionsCandidatIds.map((cid) => data.candidats.find((c) => c.id === cid)).filter(Boolean) : null;
  const options = q.type === "oui_non" ? ["Oui", "Non"] : q.optionsLibres || [];

  const toggle = (val) => setSelected((s) => (s.includes(val) ? s.filter((x) => x !== val) : [...s, val]));

  const OptionButton = ({ val, label, avatar }) => {
    const active = isMulti ? selected.includes(val) : false;
    return (
      <button
        onClick={() => (isMulti ? toggle(val) : setResultat(q.id, val))}
        className="flex items-center gap-2 rounded-xl pl-1 pr-3 py-1.5 text-sm"
        style={{ background: active ? COLORS.verified + "33" : COLORS.ink900, border: `1px solid ${COLORS.verified}`, color: COLORS.verified }}
      >
        {avatar}
        {isMulti ? (active ? "☑" : "☐") : "✓"} {label}
      </button>
    );
  };

  const BoutonSansObjet = () => (
    <button onClick={() => setResultat(q.id, { annulee: true })} className="text-xs mt-2" style={{ color: COLORS.paperDim }}>
      Cette question ne peut pas se résoudre (ex. aucun candidat de cette famille) → marquer sans objet, 0 pt pour tout le monde
    </button>
  );

  if (isTextePari) {
    const parsed = nomsAcceptes.split(",").map((s) => s.trim()).filter(Boolean);
    return (
      <Card>
        <p className="text-sm font-medium mb-3" style={{ color: COLORS.paper }}>{q.libelle}</p>
        <p className="text-xs mb-2" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>
          Nom(s) accepté(s) comme corrects — séparez par une virgule pour tolérer les variantes d'orthographe (ex. "Jean Dupont, J. Dupont")
        </p>
        <input type="text" style={inputStyle} value={nomsAcceptes} onChange={(e) => setNomsAcceptes(e.target.value)} placeholder="Ex. Michel Dupont" className="mb-3" />
        <Button onClick={() => setResultat(q.id, parsed)} disabled={parsed.length === 0}>Valider ce résultat officiel</Button>
        <BoutonSansObjet />
      </Card>
    );
  }

  if (isCandidatScore) {
    return (
      <Card>
        <p className="text-sm font-medium mb-3" style={{ color: COLORS.paper }}>{q.libelle}</p>
        <p className="text-xs mb-2" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>Candidat arrivé en tête</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {(candidatOptions || []).map((c) => (
            <button
              key={c.id}
              onClick={() => setCandidatChoice(c.nom)}
              className="flex items-center gap-2 rounded-xl pl-1 pr-3 py-1.5 text-sm"
              style={{ background: candidatChoice === c.nom ? COLORS.verified + "33" : COLORS.ink900, border: `1px solid ${COLORS.verified}`, color: COLORS.verified }}
            >
              <CandidatAvatar nom={c.nom} photoUrl={c.photoUrl} size={28} />
              {candidatChoice === c.nom ? "☑" : "☐"} {c.nom}
            </button>
          ))}
        </div>
        <p className="text-xs mb-2" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>Son score officiel</p>
        <div className="flex items-center gap-2 mb-3">
          <input type="number" step="0.1" style={{ ...inputStyle, width: 110 }} value={numValue} onChange={(e) => setNumValue(e.target.value)} placeholder="Ex. 24.5" />
          <span className="text-sm" style={{ color: COLORS.paperDim }}>%</span>
        </div>
        <Button onClick={() => setResultat(q.id, { candidat: candidatChoice, score: Number(numValue) })} disabled={!candidatChoice || numValue === ""}>Valider ce résultat officiel</Button>
        <BoutonSansObjet />
      </Card>
    );
  }

  if (isNumeric) {
    return (
      <Card>
        <p className="text-sm font-medium mb-3" style={{ color: COLORS.paper }}>{q.libelle}</p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            step={q.numeriqueEntier ? "1" : "0.1"}
            style={{ ...inputStyle, width: 110 }}
            value={numValue}
            onChange={(e) => setNumValue(e.target.value)}
            placeholder={q.numeriqueEntier ? "Ex. 6" : "Ex. 24.5"}
          />
          {!q.numeriqueEntier && <span className="text-sm" style={{ color: COLORS.paperDim }}>%</span>}
        </div>
        <Button onClick={() => setResultat(q.id, Number(numValue))} disabled={numValue === ""}>Valider ce résultat officiel</Button>
        <BoutonSansObjet />
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm font-medium mb-3" style={{ color: COLORS.paper }}>{q.libelle}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {candidatOptions
          ? candidatOptions.map((c) => <OptionButton key={c.id} val={c.nom} label={c.nom} avatar={<CandidatAvatar nom={c.nom} photoUrl={c.photoUrl} size={28} />} />)
          : options.map((opt) => <OptionButton key={opt} val={opt} label={opt} />)}
      </div>
      {isMulti && (
        <Button onClick={() => setResultat(q.id, selected)} disabled={selected.length === 0}>
          Valider ce résultat ({selected.length} sélectionné{selected.length > 1 ? "s" : ""})
        </Button>
      )}
      <BoutonSansObjet />
    </Card>
  );
}

/* ---------- Calendrier des points (éditable) ---------- */

function AdminCalendrier({ data }) {
  const vide = { libelle: "", quand: "", dateTri: "", points: "", ordre: 0 };
  const [form, setForm] = useState(vide);
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState("");

  const echeances = [...data.echeances].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  const startEdit = (e) => {
    setEditingId(e.id);
    setForm({ libelle: e.libelle, quand: e.quand, dateTri: e.dateTri || "", points: e.points || "", ordre: e.ordre ?? 0 });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(vide);
  };

  const valider = async () => {
    if (!form.libelle.trim() || !form.quand.trim()) {
      setErr("L'intitulé et la date/l'événement sont obligatoires.");
      return;
    }
    setErr("");
    try {
      if (editingId) {
        await updateEcheance(editingId, form);
      } else {
        await addEcheance(form);
      }
      cancelEdit();
    } catch (e) {
      setErr("Échec de l'enregistrement : " + (e?.message || "erreur inconnue"));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <p className="text-xs mb-3" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>
          {editingId ? "Modifier une échéance" : "Nouvelle échéance"}
        </p>
        <Field label="Intitulé">
          <input style={inputStyle} value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} placeholder="Ex. Dépôt officiel des parrainages" />
        </Field>
        <Field label="Quand (affiché tel quel aux joueurs)">
          <input style={inputStyle} value={form.quand} onChange={(e) => setForm((f) => ({ ...f, quand: e.target.value }))} placeholder="Ex. 12 mars 2027" />
        </Field>
        <Field label="Date réelle (facultatif, sert uniquement à trier le tableau chronologiquement)">
          <input type="date" style={inputStyle} value={form.dateTri} onChange={(e) => setForm((f) => ({ ...f, dateTri: e.target.value }))} />
        </Field>
        <Field label="Points / bonus en jeu à cette échéance">
          <textarea
            style={{ ...inputStyle, minHeight: 60 }}
            value={form.points}
            onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
            placeholder="Ex. 6 familles (±2/candidat + bonus famille exacte +2, +8 si les 6 exactes) + pari surprise (+6/-2)"
          />
        </Field>
        <Field label="Ordre d'affichage (si plusieurs échéances ont la même date)">
          <input type="number" style={inputStyle} value={form.ordre} onChange={(e) => setForm((f) => ({ ...f, ordre: Number(e.target.value) }))} />
        </Field>
        {err && <p className="text-xs mb-2" style={{ color: COLORS.danger }}>{err}</p>}
        <div className="flex gap-2">
          <Button onClick={valider} disabled={!form.libelle.trim() || !form.quand.trim()}>{editingId ? "Enregistrer les modifications" : "Ajouter au calendrier"}</Button>
          {editingId && <Button variant="ghost" onClick={cancelEdit}>Annuler</Button>}
        </div>
      </Card>

      {echeances.length === 0 ? (
        <Card><p className="text-sm" style={{ color: COLORS.paperDim }}>Aucune échéance dans le calendrier pour l'instant.</p></Card>
      ) : (
        echeances.map((e) => (
          <Card key={e.id}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-medium" style={{ color: COLORS.paper }}>{e.libelle}</p>
              <span className="text-xs shrink-0" style={{ color: COLORS.gold, fontWeight: 600 }}>{e.quand}</span>
            </div>
            {e.points && <p className="text-xs mb-2" style={{ color: COLORS.paperDim }}>{e.points}</p>}
            <div className="flex gap-3">
              <button onClick={() => startEdit(e)} className="text-xs" style={{ color: COLORS.verified }}>modifier</button>
              <button onClick={() => deleteEcheance(e.id)} className="text-xs" style={{ color: COLORS.danger }}>supprimer</button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

/* ---------- Participants (synthèse par ligue, avec email) ---------- */

function AdminParticipants({ data }) {
  const [emails, setEmails] = useState(null); // Map participantId -> email
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchParticipantsWithEmail()
      .then((rows) => {
        const map = {};
        rows.forEach((r) => (map[r.participantId] = r.email));
        setEmails(map);
      })
      .catch((e) => setErr(e.message || "Erreur"));
  }, []);

  if (err) return <Card><p className="text-sm" style={{ color: COLORS.danger }}>{err}</p></Card>;
  if (!emails) return <Card><p className="text-sm" style={{ color: COLORS.paperDim }}>Chargement…</p></Card>;

  const sansLigue = data.participants.filter((p) => !data.adhesions.some((a) => a.participantId === p.id));

  return (
    <div className="flex flex-col gap-3">
      {data.ligues.map((l) => {
        const membres = ligueMembers(l.id, data);
        return (
          <Card key={l.id}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: COLORS.paper }} className="font-medium">{l.nom}</span>
              <span className="text-xs" style={{ color: COLORS.paperDim }}>{membres.length} membre(s)</span>
            </div>
            {membres.length === 0 ? (
              <p className="text-xs" style={{ color: COLORS.paperDim }}>Aucun membre pour l'instant.</p>
            ) : (
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <tbody>
                  {membres.map((m) => (
                    <tr key={m.id} style={{ borderTop: `1px solid ${COLORS.ink700}` }}>
                      <td className="py-1.5 pr-2" style={{ color: COLORS.paper }}>{m.nom}</td>
                      <td className="py-1.5 text-right" style={{ color: COLORS.paperDim }}>{emails[m.id] || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        );
      })}
      {sansLigue.length > 0 && (
        <Card>
          <p className="font-medium mb-2" style={{ color: COLORS.paper }}>Sans ligue</p>
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <tbody>
              {sansLigue.map((p) => (
                <tr key={p.id} style={{ borderTop: `1px solid ${COLORS.ink700}` }}>
                  <td className="py-1.5 pr-2" style={{ color: COLORS.paper }}>{p.nom}</td>
                  <td className="py-1.5 text-right" style={{ color: COLORS.paperDim }}>{emails[p.id] || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ---------- Suivi des réponses (admin uniquement, sessions ouvertes incluses) ---------- */

function resumeReponseAdmin(q, r) {
  if (r === undefined || r === null || r === "") return "—";
  return Array.isArray(r)
    ? r.length
      ? r.join(", ")
      : "—"
    : q.type === "numerique" && typeof r === "number"
    ? r + (q.numeriqueEntier ? "" : " %")
    : q.type === "candidat_score" && r && typeof r === "object"
    ? `${r.candidat} (${r.score} %)`
    : r;
}

function AdminSuivi({ data }) {
  const sessionsTriees = [...data.sessions].sort((a, b) => new Date(b.ouverture) - new Date(a.ouverture));
  const [sessionId, setSessionId] = useState(sessionsTriees.find((s) => s.statut === "ouverte")?.id || sessionsTriees[0]?.id || "");
  const [ouvert, setOuvert] = useState({});

  if (sessionsTriees.length === 0) return <Card><p className="text-sm" style={{ color: COLORS.paperDim }}>Aucune session créée pour l'instant.</p></Card>;

  const questions = data.questions.filter((q) => q.sessionId === sessionId && q.type !== "texte").sort((a, b) => a.ordre - b.ordre);
  const participants = [...data.participants].sort((a, b) => a.nom.localeCompare(b.nom));

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <Field label="Session à suivre">
          <select style={inputStyle} value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            {sessionsTriees.map((s) => (
              <option key={s.id} value={s.id}>
                {s.titre} {s.statut === "ouverte" ? "(ouverte)" : s.statut === "close" ? "(close)" : "(planifiée)"}
              </option>
            ))}
          </select>
        </Field>
      </Card>

      {questions.length === 0 ? (
        <Card><p className="text-sm" style={{ color: COLORS.paperDim }}>Cette session n'a pas encore de questions.</p></Card>
      ) : (
        participants.map((p) => {
          const rep = data.pronostics.filter((x) => x.participantId === p.id && questions.some((q) => q.id === x.questionId));
          const estOuvert = !!ouvert[p.id];
          return (
            <Card key={p.id}>
              <button onClick={() => setOuvert((o) => ({ ...o, [p.id]: !o[p.id] }))} className="w-full text-left flex items-center justify-between">
                <span style={{ color: COLORS.paper }} className="font-medium">{p.nom}</span>
                <Badge tone={rep.length === questions.length ? "verified" : rep.length === 0 ? "danger" : "gold"}>
                  {rep.length} / {questions.length}
                </Badge>
              </button>
              {estOuvert && (
                <div className="mt-3 pt-3 flex flex-col gap-1.5" style={{ borderTop: `1px solid ${COLORS.ink700}` }}>
                  {questions.map((q) => {
                    const pr = data.pronostics.find((x) => x.participantId === p.id && x.questionId === q.id);
                    return (
                      <div key={q.id} className="flex items-start justify-between gap-2 text-xs">
                        <span className="flex-1" style={{ color: COLORS.paperDim }}>{q.libelle}</span>
                        <span className="shrink-0 text-right font-medium" style={{ color: pr ? COLORS.paper : COLORS.danger }}>
                          {pr ? resumeReponseAdmin(q, pr.reponse) : "sans réponse"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
