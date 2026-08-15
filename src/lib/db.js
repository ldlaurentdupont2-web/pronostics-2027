import { supabase } from "./supabaseClient";

/* ---------- mapping colonnes DB (snake_case) -> objets app (camelCase) ---------- */

const mapParticipant = (r) => ({ id: r.id, userId: r.user_id, nom: r.nom, isAdmin: r.is_admin });
const mapLigue = (r) => ({ id: r.id, nom: r.nom, code: r.code });
const mapAdhesion = (r) => ({ id: r.id, participantId: r.participant_id, ligueId: r.ligue_id });
const mapFamille = (r) => ({ id: r.id, nom: r.nom });
const mapCandidat = (r) => ({ id: r.id, nom: r.nom, familleId: r.famille_id, statut: r.statut, photoUrl: r.photo_url });
const mapSession = (r) => ({ id: r.id, titre: r.titre, ouverture: r.ouverture, cloture: r.cloture, statut: r.statut, dateEvenement: r.date_evenement, phase: r.phase });
const mapQuestion = (r) => ({
  id: r.id,
  sessionId: r.session_id,
  libelle: r.libelle,
  type: r.type,
  points: r.points,
  pointsScore: r.points_score,
  penalite: r.penalite,
  ordre: r.ordre,
  optionsLibres: r.options_libres || [],
  optionsCandidatIds: r.options_candidat_ids || [],
  avecProbabilite: r.avec_probabilite,
  bonusFamilleExacte: r.bonus_famille_exacte,
  numeriqueEntier: r.numerique_entier,
  numeriqueExact: r.numerique_exact,
  resultatAttendu: r.resultat_attendu,
});
const mapPronostic = (r) => ({ id: r.id, participantId: r.participant_id, questionId: r.question_id, reponse: r.reponse, probabilite: r.probabilite, date: r.date });
const mapResultat = (r) => ({ id: r.id, questionId: r.question_id, resultat: r.resultat, dateValidation: r.date_validation });
const mapCommentaire = (r) => ({ id: r.id, ligueId: r.ligue_id, participantId: r.participant_id, contenu: r.contenu, date: r.created_at });
const mapEcheance = (r) => ({ id: r.id, libelle: r.libelle, quand: r.quand, dateTri: r.date_tri, points: r.points, ordre: r.ordre });

async function selOrThrow(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/* ---------- lecture complète (équivalent du gros objet JSON de window.storage) ---------- */

export async function fetchAllData() {
  const [participants, ligues, adhesions, familles, candidats, sessions, questions, pronostics, resultats, commentaires, echeances] = await Promise.all([
    selOrThrow(supabase.from("participants").select("*")),
    selOrThrow(supabase.from("ligues").select("*")),
    selOrThrow(supabase.from("adhesions").select("*")),
    selOrThrow(supabase.from("familles").select("*").order("ordre")),
    selOrThrow(supabase.from("candidats").select("*")),
    selOrThrow(supabase.from("sessions").select("*").order("ouverture")),
    selOrThrow(supabase.from("questions").select("*").order("ordre")),
    selOrThrow(supabase.from("pronostics").select("*")),
    selOrThrow(supabase.from("resultats").select("*")),
    selOrThrow(supabase.from("commentaires").select("*").order("created_at")),
    selOrThrow(supabase.from("echeances").select("*").order("ordre")),
  ]);
  return {
    participants: participants.map(mapParticipant),
    ligues: ligues.map(mapLigue),
    adhesions: adhesions.map(mapAdhesion),
    familles: familles.map(mapFamille),
    candidats: candidats.map(mapCandidat),
    sessions: sessions.map(mapSession),
    questions: questions.map(mapQuestion),
    pronostics: pronostics.map(mapPronostic),
    resultats: resultats.map(mapResultat),
    commentaires: commentaires.map(mapCommentaire),
    echeances: echeances.map(mapEcheance),
  };
}

/* ---------- temps réel : recharge les données à chaque changement d'un autre joueur ---------- */

export function subscribeToChanges(onChange) {
  const tables = ["participants", "ligues", "adhesions", "candidats", "sessions", "questions", "pronostics", "resultats", "commentaires", "echeances"];
  const channel = supabase.channel("pronostics-2027-changes");
  tables.forEach((t) => {
    channel.on("postgres_changes", { event: "*", schema: "public", table: t }, onChange);
  });
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}

/* ---------- authentification ---------- */

export async function signUp(email, password, nom) {
  // Vérifie la disponibilité du prénom avant de créer le compte, pour éviter de bloquer
  // plus tard sur la contrainte d'unicité (voir migration_009) sans pouvoir corriger facilement.
  if (nom) {
    const disponible = await nomDisponible(nom);
    if (!disponible) throw new Error("Ce prénom est déjà utilisé par un autre joueur — choisissez-en un autre.");
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // On garde le nom choisi de côté : si la confirmation par email est activée,
  // la session n'existe pas encore ici, et c'est App.jsx qui créera le profil
  // participant plus tard (après confirmation) en le relisant depuis localStorage.
  if (nom) localStorage.setItem("pronostics2027_pending_nom", nom);
  if (data.user && data.session) {
    await ensureParticipant(data.user, nom);
    localStorage.removeItem("pronostics2027_pending_nom");
  }
  return data;
}

export async function nomDisponible(nom) {
  const { data, error } = await supabase.rpc("nom_disponible", { p_nom: nom });
  if (error) return true; // en cas de doute (ex. hors-ligne), on ne bloque pas la création
  return !!data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function ensureParticipant(user, nomSiNouveau) {
  const { data: existing } = await supabase.from("participants").select("*").eq("user_id", user.id).maybeSingle();
  if (existing) return mapParticipant(existing);
  const { count } = await supabase.from("participants").select("*", { count: "exact", head: true });
  const nomBase = nomSiNouveau || user.email;
  // Filet de sécurité si le prénom a été pris entre-temps (rare, ex. deux inscriptions
  // simultanées) : on essaie avec un suffixe plutôt que de bloquer la création du profil.
  for (let tentative = 0; tentative < 5; tentative++) {
    const nom = tentative === 0 ? nomBase : `${nomBase} (${tentative + 1})`;
    const { data, error } = await supabase
      .from("participants")
      .insert({ user_id: user.id, nom, is_admin: (count || 0) === 0 })
      .select()
      .single();
    if (!error) return mapParticipant(data);
    if (error.code !== "23505") throw error; // autre erreur que "déjà pris" : on remonte tel quel
  }
  throw new Error("Impossible de créer le profil : ce prénom est déjà pris, réessayez avec un autre nom.");
}

/* ---------- ligues / adhésions ---------- */

// Ouvert à tout participant connecté (pas réservé à l'admin) : chacun peut créer sa
// propre ligue. Le créateur n'est pas automatiquement membre — voir joinLigueByCode
// juste après l'appel à cette fonction pour l'y inscrire.
export async function addLigue(nom) {
  const { data, error } = await supabase.from("ligues").insert({ nom }).select().single();
  if (error) {
    if (error.code === "23505") throw new Error("Ce nom de ligue existe déjà — choisissez-en un autre.");
    throw error;
  }
  return { id: data.id, nom: data.nom, code: data.code };
}

export async function leaveLigue(participantId, ligueId) {
  const { error } = await supabase.from("adhesions").delete().eq("participant_id", participantId).eq("ligue_id", ligueId);
  if (error) throw error;
}

export async function addCommentaire(ligueId, participantId, contenu) {
  const { error } = await supabase.from("commentaires").insert({ ligue_id: ligueId, participant_id: participantId, contenu: contenu.trim() });
  if (error) throw error;
}

/* ---------- calendrier des points (éditable depuis Admin) ---------- */

export async function addEcheance(e) {
  const { error } = await supabase
    .from("echeances")
    .insert({ libelle: e.libelle, quand: e.quand, date_tri: e.dateTri || null, points: e.points || null, ordre: e.ordre ?? 0 });
  if (error) throw error;
}

export async function updateEcheance(id, e) {
  const { error } = await supabase
    .from("echeances")
    .update({ libelle: e.libelle, quand: e.quand, date_tri: e.dateTri || null, points: e.points || null, ordre: e.ordre ?? 0 })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEcheance(id) {
  const { error } = await supabase.from("echeances").delete().eq("id", id);
  if (error) throw error;
}

// Rejoindre une ligue par son code passe par une fonction Postgres sécurisée (join_ligue) :
// impossible d'insérer une adhésion directement sans connaître le bon code.
export async function joinLigueByCode(code) {
  const { error } = await supabase.rpc("join_ligue", { p_code: code });
  if (error) throw error;
}

/* ---------- pronostics ---------- */

export async function savePronostic(participantId, questionId, reponse, probabilite) {
  const { error } = await supabase
    .from("pronostics")
    .upsert(
      { participant_id: participantId, question_id: questionId, reponse, probabilite, date: new Date().toISOString() },
      { onConflict: "participant_id,question_id" }
    );
  if (error) throw error;
}

/* ---------- candidats ---------- */

export async function addCandidat(nom, familleId, photoUrl) {
  const { error } = await supabase.from("candidats").insert({ nom, famille_id: familleId || null, statut: "potentiel", photo_url: photoUrl || null });
  if (error) throw error;
}

export async function setCandidatStatut(id, statut) {
  const { error } = await supabase.from("candidats").update({ statut }).eq("id", id);
  if (error) throw error;
}

export async function setCandidatPhoto(id, photoUrl) {
  const { error } = await supabase.from("candidats").update({ photo_url: photoUrl }).eq("id", id);
  if (error) throw error;
}

export async function removeCandidat(id) {
  const { error } = await supabase.from("candidats").delete().eq("id", id);
  if (error) throw error;
}

// Import/actualisation en masse (ex. depuis candidator.fr) : met à jour si le nom existe déjà, sinon crée.
export async function upsertCandidatsBulk(rows) {
  let added = 0;
  let updated = 0;
  for (const r of rows) {
    const { data: existing } = await supabase.from("candidats").select("id").ilike("nom", r.nom).maybeSingle();
    if (existing) {
      await supabase.from("candidats").update({ photo_url: r.photoUrl }).eq("id", existing.id);
      updated++;
    } else {
      await supabase.from("candidats").insert({ nom: r.nom, famille_id: r.familleId, statut: "potentiel", photo_url: r.photoUrl });
      added++;
    }
  }
  return { added, updated };
}

/* ---------- sessions / questions ---------- */

export async function createSession(titre, cloture, phase) {
  const { error } = await supabase.from("sessions").insert({ titre, cloture, statut: "ouverte", ouverture: new Date().toISOString(), phase: phase || 1 });
  if (error) throw error;
}

export async function closeSession(id) {
  const { error } = await supabase.from("sessions").update({ statut: "close" }).eq("id", id);
  if (error) throw error;
}

export async function openSession(id) {
  const { error } = await supabase.from("sessions").update({ statut: "ouverte" }).eq("id", id);
  if (error) throw error;
}

// Suppression réservée aux sessions vides (sans questions) : évite de risquer de
// supprimer des réponses de joueurs par erreur (la suppression est en cascade).
export async function deleteSession(id) {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

function questionToRow(q) {
  return {
    session_id: q.sessionId,
    libelle: q.libelle,
    type: q.type,
    points: q.points,
    points_score: q.pointsScore ?? null,
    penalite: q.penalite ?? null,
    ordre: q.ordre,
    options_libres: q.optionsLibres || [],
    options_candidat_ids: q.optionsCandidatIds || [],
    avec_probabilite: !!q.avecProbabilite,
    bonus_famille_exacte: !!q.bonusFamilleExacte,
    numerique_entier: !!q.numeriqueEntier,
    numerique_exact: !!q.numeriqueExact,
    resultat_attendu: q.resultatAttendu?.trim() || null,
  };
}

export async function addQuestion(q) {
  const { error } = await supabase.from("questions").insert(questionToRow(q));
  if (error) throw error;
}

export async function bulkAddQuestions(rows) {
  if (rows.length === 0) return;
  const { error } = await supabase.from("questions").insert(rows.map(questionToRow));
  if (error) throw error;
}

export async function removeQuestion(id) {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderQuestions(orderedIds) {
  await Promise.all(orderedIds.map((id, ordre) => supabase.from("questions").update({ ordre }).eq("id", id)));
}

/* ---------- résultats ---------- */

export async function setResultat(questionId, resultat) {
  const { error } = await supabase
    .from("resultats")
    .upsert({ question_id: questionId, resultat, date_validation: new Date().toISOString() }, { onConflict: "question_id" });
  if (error) throw error;
}
