import React, { useState } from "react";
import { Card, Button, Gauge, COLORS, inputStyle, CandidatAvatar } from "../components/ui";
import { fmtDateTime } from "../lib/format";
import { savePronostic } from "../lib/db";

export default function Pronostiquer({ data, me }) {
  const session = data.sessions.find((s) => s.statut === "ouverte");
  if (!session) return <Card><p className="text-sm" style={{ color: COLORS.paperDim }}>Aucune session ouverte.</p></Card>;

  const questions = data.questions.filter((q) => q.sessionId === session.id).sort((a, b) => a.ordre - b.ordre);

  const save = async (questionId, reponse, probabilite) => {
    await savePronostic(me.id, questionId, reponse, probabilite);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="mb-1">
        <h2 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 20, fontWeight: 600 }}>{session.titre}</h2>
        <p className="text-xs" style={{ color: COLORS.paperDim }}>Clôture le {fmtDateTime(session.cloture)} — réponses définitives après clôture</p>
      </div>
      {questions.map((q, i) =>
        q.type === "candidat_score" ? (
          <CandidatScoreCard key={q.id} q={q} index={i + 1} data={data} me={me} onSave={save} />
        ) : (
          <QuestionCard key={q.id} q={q} index={i + 1} data={data} me={me} onSave={save} />
        )
      )}
    </div>
  );
}

function QuestionCard({ q, index, data, me, onSave }) {
  const isMulti = q.type === "choix_multiple";
  const isChoice = q.type === "choix_unique" || isMulti;
  const existing = data.pronostics.find((p) => p.participantId === me.id && p.questionId === q.id);
  const [reponse, setReponse] = useState(existing?.reponse ?? (isMulti ? [] : ""));
  const [prob, setProb] = useState(existing?.probabilite ?? 50);

  const candidatOptions =
    isChoice && q.optionsCandidatIds && q.optionsCandidatIds.length
      ? q.optionsCandidatIds.map((cid) => data.candidats.find((c) => c.id === cid)).filter(Boolean)
      : null;
  const options = isChoice ? (candidatOptions ? candidatOptions.map((c) => c.nom) : q.optionsLibres || []) : q.type === "oui_non" ? ["Oui", "Non"] : [];

  const isSelected = (val) => (isMulti ? reponse.includes(val) : reponse === val);

  const commit = (val) => {
    if (isMulti) {
      setReponse((r) => (r.includes(val) ? r.filter((v) => v !== val) : [...r, val]));
    } else {
      setReponse(val);
      onSave(q.id, val, prob);
    }
  };

  const validateMulti = () => onSave(q.id, reponse, prob);

  const hasAnswer = isMulti ? reponse.length > 0 : !!reponse;
  const multiDirty = isMulti && JSON.stringify([...reponse].sort()) !== JSON.stringify([...(existing?.reponse ?? [])].sort());

  return (
    <Card>
      <div className="flex items-start gap-2 mb-3">
        <span
          className="rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style={{ width: 22, height: 22, background: COLORS.ink900, color: COLORS.gold, border: `1px solid ${COLORS.gold}55` }}
        >
          {index}
        </span>
        <div className="flex-1">
          <p style={{ color: COLORS.paper }} className="text-sm font-medium">{q.libelle}</p>
          {isMulti && <p className="text-xs mt-0.5" style={{ color: COLORS.paperDim }}>Plusieurs réponses possibles</p>}
          {q.type !== "texte" && (
            <p className="text-xs mt-1" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>
              {q.points} pts{q.resultatAttendu ? ` · résultat : ${q.resultatAttendu}` : " · résultat à la clôture de cette session"}
            </p>
          )}
        </div>
      </div>

      {q.type === "texte" ? (
        <textarea
          style={{ ...inputStyle, minHeight: 70 }}
          value={reponse}
          onChange={(e) => setReponse(e.target.value)}
          onBlur={() => onSave(q.id, reponse, null)}
          placeholder="Votre réponse (facultatif, non classant)"
        />
      ) : q.type === "texte_pari" ? (
        <div className="mb-1">
          <input
            type="text"
            style={inputStyle}
            value={reponse}
            onChange={(e) => setReponse(e.target.value)}
            onBlur={() => onSave(q.id, reponse, null)}
            placeholder="Nom du candidat (laissez vide si aucun pari)"
          />
          <p className="text-xs mt-1.5" style={{ color: COLORS.paperDim }}>
            {q.points} pts si ce nom sort effectivement{q.penalite ? `, -${q.penalite} pts sinon` : ""}. Laisser vide = pas de pari, pas de risque.
          </p>
        </div>
      ) : q.type === "numerique" ? (
        <div className="mb-3 flex items-center gap-2">
          <input
            type="number"
            step={q.numeriqueEntier ? "1" : "0.1"}
            min="0"
            max={q.numeriqueEntier ? undefined : 100}
            style={{ ...inputStyle, width: 110 }}
            value={reponse}
            onChange={(e) => setReponse(e.target.value)}
            onBlur={() => reponse !== "" && onSave(q.id, Number(reponse), null)}
            placeholder={q.numeriqueEntier ? "Ex. 6" : "Ex. 24.5"}
          />
          {!q.numeriqueEntier && <span className="text-sm" style={{ color: COLORS.paperDim }}>%</span>}
        </div>
      ) : candidatOptions ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {candidatOptions.map((c) => (
            <button
              key={c.id}
              onClick={() => commit(c.nom)}
              className="flex flex-col items-center gap-1.5 rounded-xl px-3 py-2 text-xs w-20"
              style={{
                background: isSelected(c.nom) ? COLORS.gold : COLORS.ink900,
                color: isSelected(c.nom) ? COLORS.ink800 : COLORS.paper,
                border: `1px solid ${isSelected(c.nom) ? COLORS.gold : COLORS.ink600}`,
                fontWeight: isSelected(c.nom) ? 600 : 400,
              }}
            >
              <CandidatAvatar nom={c.nom} photoUrl={c.photoUrl} size={40} />
              <span className="text-center leading-tight">{c.nom}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-3">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => commit(opt)}
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                background: isSelected(opt) ? COLORS.gold : COLORS.ink900,
                color: isSelected(opt) ? COLORS.ink800 : COLORS.paper,
                border: `1px solid ${isSelected(opt) ? COLORS.gold : COLORS.ink600}`,
                fontWeight: isSelected(opt) ? 600 : 400,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {isMulti && (
        <Button onClick={validateMulti} disabled={!multiDirty && !!existing} className="mb-2">
          {existing && !multiDirty ? "Sélection enregistrée" : `Valider ma sélection (${reponse.length})`}
        </Button>
      )}

      {q.avecProbabilite && q.type !== "texte" && q.type !== "choix_multiple" && (
        <Gauge
          value={prob}
          onChange={(v) => {
            setProb(v);
            if (hasAnswer && (!isMulti || !multiDirty)) onSave(q.id, reponse, v);
          }}
        />
      )}

      {existing && !multiDirty && <div className="mt-2 text-xs" style={{ color: COLORS.verified }}>✓ enregistré le {fmtDateTime(existing.date)}</div>}
      {multiDirty && <div className="mt-2 text-xs" style={{ color: COLORS.gold }}>Sélection modifiée, non enregistrée — cliquez sur "Valider ma sélection".</div>}
    </Card>
  );
}

function CandidatScoreCard({ q, index, data, me, onSave }) {
  const existing = data.pronostics.find((p) => p.participantId === me.id && p.questionId === q.id);
  const [candidatChoice, setCandidatChoice] = useState(existing?.reponse?.candidat ?? "");
  const [scoreValue, setScoreValue] = useState(existing?.reponse?.score ?? "");

  const candidatOptions = (q.optionsCandidatIds || []).map((cid) => data.candidats.find((c) => c.id === cid)).filter(Boolean);

  const dirty = candidatChoice !== (existing?.reponse?.candidat ?? "") || String(scoreValue) !== String(existing?.reponse?.score ?? "");
  const canValidate = candidatChoice && scoreValue !== "" && !isNaN(Number(scoreValue));

  const validate = () => {
    if (!canValidate) return;
    onSave(q.id, { candidat: candidatChoice, score: Number(scoreValue) }, null);
  };

  return (
    <Card>
      <div className="flex items-start gap-2 mb-3">
        <span
          className="rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style={{ width: 22, height: 22, background: COLORS.ink900, color: COLORS.gold, border: `1px solid ${COLORS.gold}55` }}
        >
          {index}
        </span>
        <div className="flex-1">
          <p style={{ color: COLORS.paper }} className="text-sm font-medium">{q.libelle}</p>
          <p className="text-xs mt-1" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>
            {q.points}+{q.pointsScore || 0} pts{q.resultatAttendu ? ` · résultat : ${q.resultatAttendu}` : " · résultat à la clôture de cette session"}
          </p>
        </div>
      </div>

      <p className="text-xs mb-2" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>1. Choisissez le candidat</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {candidatOptions.map((c) => (
          <button
            key={c.id}
            onClick={() => setCandidatChoice(c.nom)}
            className="flex flex-col items-center gap-1.5 rounded-xl px-3 py-2 text-xs w-20"
            style={{
              background: candidatChoice === c.nom ? COLORS.gold : COLORS.ink900,
              color: candidatChoice === c.nom ? COLORS.ink800 : COLORS.paper,
              border: `1px solid ${candidatChoice === c.nom ? COLORS.gold : COLORS.ink600}`,
              fontWeight: candidatChoice === c.nom ? 600 : 400,
            }}
          >
            <CandidatAvatar nom={c.nom} photoUrl={c.photoUrl} size={40} />
            <span className="text-center leading-tight">{c.nom}</span>
          </button>
        ))}
      </div>

      <p className="text-xs mb-2" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>2. Son score au premier tour</p>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          min="0"
          max="100"
          style={{ ...inputStyle, width: 110 }}
          value={scoreValue}
          onChange={(e) => setScoreValue(e.target.value)}
          placeholder="Ex. 24.5"
        />
        <span className="text-sm" style={{ color: COLORS.paperDim }}>%</span>
      </div>

      <Button onClick={validate} disabled={!canValidate || (!dirty && !!existing)}>
        {existing && !dirty ? "Réponse enregistrée" : "Valider ma réponse"}
      </Button>

      {existing && !dirty && <div className="mt-2 text-xs" style={{ color: COLORS.verified }}>✓ enregistré le {fmtDateTime(existing.date)}</div>}
      {dirty && existing && <div className="mt-2 text-xs" style={{ color: COLORS.gold }}>Réponse modifiée, non enregistrée.</div>}
    </Card>
  );
}
