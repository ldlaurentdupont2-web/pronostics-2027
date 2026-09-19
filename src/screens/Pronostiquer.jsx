import React, { useState } from "react";
import { Card, Button, Gauge, COLORS, inputStyle, CandidatAvatar } from "../components/ui";
import { fmtDateTime, fmtDeadline } from "../lib/format";
import { savePronostic } from "../lib/db";

function resumeReponse(q, r) {
  if (r === undefined || r === null || r === "") return null;
  return Array.isArray(r)
    ? r.length
      ? r.join(", ")
      : null
    : q.type === "numerique" && typeof r === "number"
    ? r + (q.numeriqueEntier ? "" : " %")
    : q.type === "candidat_score" && r && typeof r === "object"
    ? `${r.candidat} (${r.score} %)`
    : r;
}

// Cherche la réponse donnée par le joueur à une question IDENTIQUE (même libellé, même
// type) dans la session close la plus récente qui précède celle-ci. Sert uniquement à
// pré-remplir le formulaire : rien n'est enregistré tant que le joueur n'a pas validé.
// Le lien entre deux mois se fait par le libellé : s'il change, la reprise ne se fait plus.
function reponsePrecedente(q, data, me, session) {
  if (!q.libelle) return null;
  const sessionsAvant = data.sessions
    .filter((s) => s.id !== session.id && new Date(s.cloture) < new Date(session.cloture))
    .sort((a, b) => new Date(b.cloture) - new Date(a.cloture));
  for (const s of sessionsAvant) {
    const qPrec = data.questions.find((x) => x.sessionId === s.id && x.libelle === q.libelle && x.type === q.type);
    if (!qPrec) continue;
    const p = data.pronostics.find((x) => x.participantId === me.id && x.questionId === qPrec.id);
    if (p && p.reponse !== null && p.reponse !== undefined && p.reponse !== "") return { pronostic: p, session: s };
  }
  return null;
}

// Une option proposée le mois dernier peut avoir disparu ce mois-ci : on ne reprend que
// ce qui existe encore dans la question actuelle, sinon on laisse le champ vide.
function reponseCompatible(q, reponse, options) {
  if (reponse === null || reponse === undefined) return null;
  if (q.type === "choix_multiple") {
    if (!Array.isArray(reponse)) return null;
    const garde = reponse.filter((v) => options.includes(v));
    return garde.length ? garde : null;
  }
  if (q.type === "choix_unique" || q.type === "oui_non") {
    return options.includes(reponse) ? reponse : null;
  }
  if (q.type === "numerique") {
    return typeof reponse === "number" ? reponse : null;
  }
  if (q.type === "texte" || q.type === "texte_pari") {
    return typeof reponse === "string" ? reponse : null;
  }
  return null;
}

export default function Pronostiquer({ data, me }) {
  const session = data.sessions.find((s) => s.statut === "ouverte");
  if (!session) return <Card><p className="text-sm" style={{ color: COLORS.paperDim }}>Aucune session ouverte.</p></Card>;

  const questions = data.questions.filter((q) => q.sessionId === session.id).sort((a, b) => a.ordre - b.ordre);

  const save = async (questionId, reponse, probabilite) => {
    await savePronostic(me.id, questionId, reponse, probabilite);
  };

  const mesReponses = questions
    .map((q) => ({ q, p: data.pronostics.find((x) => x.participantId === me.id && x.questionId === q.id) }))
    .filter(({ q, p }) => q.type !== "texte" && resumeReponse(q, p?.reponse) !== null);

  // Questions pré-remplies avec la réponse du mois dernier mais pas encore validées :
  // on le signale en haut, sinon le joueur peut croire qu'il a déjà tout répondu.
  const nbReprises = questions.filter(
    (q) =>
      !data.pronostics.find((x) => x.participantId === me.id && x.questionId === q.id) &&
      reponsePrecedente(q, data, me, session)
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="mb-1">
        <h2 style={{ fontFamily: "'Fraunces', serif", color: COLORS.paper, fontSize: 20, fontWeight: 600 }}>{session.titre}</h2>
        <p className="text-xs" style={{ color: COLORS.paperDim }}>Clôture le {fmtDateTime(session.cloture)} — réponses définitives après clôture</p>
      </div>

      {nbReprises > 0 && (
        <Card>
          <p className="text-sm" style={{ color: COLORS.gold }}>
            {nbReprises} question{nbReprises > 1 ? "s sont pré-remplies" : " est pré-remplie"} avec votre réponse du mois dernier.
          </p>
          <p className="text-xs mt-1" style={{ color: COLORS.paperDim }}>
            Rien n'est enregistré tant que vous n'avez pas cliqué sur « Confirmer et valider ». Modifiez ce que vous voulez avant de valider.
          </p>
        </Card>
      )}

      {questions.map((q, i) =>
        q.type === "candidat_score" ? (
          <CandidatScoreCard key={q.id} q={q} index={i + 1} data={data} me={me} session={session} onSave={save} />
        ) : (
          <QuestionCard key={q.id} q={q} index={i + 1} data={data} me={me} session={session} onSave={save} />
        )
      )}

      {mesReponses.length > 0 && (
        <Card>
          <p className="text-xs mb-1" style={{ color: COLORS.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>Récapitulatif de vos réponses</p>
          <p className="text-xs mb-3" style={{ color: COLORS.paperDim }}>
            Modifiable jusqu'à la clôture, le {fmtDeadline(session.cloture)}.
          </p>
          <div className="flex flex-col gap-1.5">
            {mesReponses.map(({ q, p }) => (
              <div key={q.id} className="flex items-start justify-between gap-2 text-sm" style={{ borderTop: `1px solid ${COLORS.ink700}`, paddingTop: 6 }}>
                <span className="flex-1" style={{ color: COLORS.paperDim }}>{q.libelle}</span>
                <span className="shrink-0 text-right font-medium" style={{ color: COLORS.paper }}>{resumeReponse(q, p.reponse)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function QuestionCard({ q, index, data, me, session, onSave }) {
  const isMulti = q.type === "choix_multiple";
  const isChoice = q.type === "choix_unique" || isMulti;
  const existing = data.pronostics.find((p) => p.participantId === me.id && p.questionId === q.id);

  const candidatOptions =
    isChoice && q.optionsCandidatIds && q.optionsCandidatIds.length
      ? q.optionsCandidatIds.map((cid) => data.candidats.find((c) => c.id === cid)).filter(Boolean)
      : null;
  const options = isChoice ? (candidatOptions ? candidatOptions.map((c) => c.nom) : q.optionsLibres || []) : q.type === "oui_non" ? ["Oui", "Non"] : [];

  // Reprise du mois dernier, seulement si le joueur n'a pas déjà répondu ce mois-ci.
  const precedent = existing ? null : reponsePrecedente(q, data, me, session);
  const reprise = precedent ? reponseCompatible(q, precedent.pronostic.reponse, options) : null;

  const [reponse, setReponse] = useState(reprise ?? existing?.reponse ?? (isMulti ? [] : ""));
  const [prob, setProb] = useState(existing?.probabilite ?? precedent?.pronostic.probabilite ?? 50);

  const isSelected = (val) => (isMulti ? reponse.includes(val) : reponse === val);

  const commit = (val) => {
    if (isMulti) {
      setReponse((r) => (r.includes(val) ? r.filter((v) => v !== val) : [...r, val]));
    } else {
      setReponse(val); // ne sauvegarde pas tout de suite : il faudra cliquer sur "Valider ma réponse"
    }
  };

  const valider = () => {
    if (q.type === "numerique") {
      if (reponse === "") {
        onSave(q.id, null, prob); // passe explicitement : "je ne pense pas que ce scénario se produira"
        return;
      }
      if (isNaN(Number(reponse))) return;
      onSave(q.id, Number(reponse), prob);
    } else {
      onSave(q.id, reponse, prob);
    }
  };

  const dirty = isMulti
    ? JSON.stringify([...reponse].sort()) !== JSON.stringify([...(existing?.reponse ?? [])].sort())
    : q.type === "numerique"
    ? (reponse === "" ? null : Number(reponse)) !== (existing?.reponse ?? null)
    : reponse !== (existing?.reponse ?? "");
  const peutValider = isMulti
    ? reponse.length > 0
    : q.type === "numerique"
    ? reponse === "" || !isNaN(Number(reponse)) // vide accepté : "je passe, ce scénario ne se produira pas selon moi"
    : q.type === "texte" || q.type === "texte_pari"
    ? true
    : !!reponse;

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
          placeholder="Votre réponse (facultatif, non classant)"
        />
      ) : q.type === "texte_pari" ? (
        <div className="mb-1">
          <input
            type="text"
            list={`suggestions-${q.id}`}
            style={inputStyle}
            value={reponse}
            onChange={(e) => setReponse(e.target.value)}
            placeholder="Nom du candidat (laissez vide si aucun pari)"
          />
          <datalist id={`suggestions-${q.id}`}>
            {data.candidats.map((c) => (
              <option key={c.id} value={c.nom} />
            ))}
          </datalist>
          <p className="text-xs mt-1.5" style={{ color: COLORS.paperDim }}>
            {q.points} pts si ce nom sort effectivement{q.penalite ? `, -${q.penalite} pts sinon` : ""}. Laisser vide = pas de pari, pas de risque.
          </p>
        </div>
      ) : q.type === "numerique" ? (
        <div className="mb-1">
          <div className="flex items-center gap-2 mb-1.5">
            <input
              type="number"
              step={q.numeriqueEntier ? "1" : "0.1"}
              min="0"
              max={q.numeriqueEntier ? undefined : 100}
              style={{ ...inputStyle, width: 110 }}
              value={reponse}
              onChange={(e) => setReponse(e.target.value)}
              placeholder={q.numeriqueEntier ? "Ex. 6" : "Ex. 24.5"}
            />
            {!q.numeriqueEntier && <span className="text-sm" style={{ color: COLORS.paperDim }}>%</span>}
          </div>
          <p className="text-xs" style={{ color: COLORS.paperDim }}>
            Laissez vide et validez si vous ne pensez pas que ce scénario se produira — vous ne serez ni pénalisé, ni exclu du reste du jeu.
          </p>
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

      <Button onClick={valider} disabled={!peutValider || (!!existing && !dirty)} className="mb-2">
        {existing && !dirty ? "✓ Réponse enregistrée" : isMulti ? `Confirmer et valider (${reponse.length})` : "Confirmer et valider"}
      </Button>

      {q.avecProbabilite && q.type !== "texte" && q.type !== "choix_multiple" && (
        <Gauge value={prob} onChange={(v) => setProb(v)} />
      )}

      {existing && !dirty && <div className="mt-2 text-xs" style={{ color: COLORS.verified }}>✓ enregistré le {fmtDateTime(existing.date)}</div>}
      {dirty && existing && <div className="mt-2 text-xs" style={{ color: COLORS.gold }}>Réponse modifiée, non enregistrée — cliquez sur "Confirmer et valider".</div>}
      {!existing && reprise !== null && (
        <div className="mt-2 text-xs" style={{ color: COLORS.gold }}>
          Repris de « {precedent.session.titre} » — non enregistré tant que vous n'avez pas validé.
        </div>
      )}
    </Card>
  );
}

function CandidatScoreCard({ q, index, data, me, session, onSave }) {
  const existing = data.pronostics.find((p) => p.participantId === me.id && p.questionId === q.id);

  const candidatOptions = (q.optionsCandidatIds || []).map((cid) => data.candidats.find((c) => c.id === cid)).filter(Boolean);

  // Reprise du mois dernier : uniquement si le candidat choisi figure encore dans la liste.
  const precedent = existing ? null : reponsePrecedente(q, data, me, session);
  const repriseObj =
    precedent && precedent.pronostic.reponse && typeof precedent.pronostic.reponse === "object" && candidatOptions.some((c) => c.nom === precedent.pronostic.reponse.candidat)
      ? precedent.pronostic.reponse
      : null;

  const [candidatChoice, setCandidatChoice] = useState(repriseObj?.candidat ?? existing?.reponse?.candidat ?? "");
  const [scoreValue, setScoreValue] = useState(repriseObj?.score ?? existing?.reponse?.score ?? "");

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
        {existing && !dirty ? "✓ Réponse enregistrée" : "Confirmer et valider"}
      </Button>

      {existing && !dirty && <div className="mt-2 text-xs" style={{ color: COLORS.verified }}>✓ enregistré le {fmtDateTime(existing.date)}</div>}
      {dirty && existing && <div className="mt-2 text-xs" style={{ color: COLORS.gold }}>Réponse modifiée, non enregistrée.</div>}
      {!existing && repriseObj && (
        <div className="mt-2 text-xs" style={{ color: COLORS.gold }}>
          Repris de « {precedent.session.titre} » — non enregistré tant que vous n'avez pas validé.
        </div>
      )}
    </Card>
  );
}
