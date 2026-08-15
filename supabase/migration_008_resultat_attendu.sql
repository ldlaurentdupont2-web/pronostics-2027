-- ============================================================
-- Migration : ajoute un champ texte libre "quand le résultat sera connu"
-- sur chaque question (ex. "à la clôture de cette session", "au 1er tour réel").
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Ne supprime aucune donnée existante. Vide = comportement par défaut
-- inchangé ("à la clôture de cette session").
-- ============================================================

alter table questions add column if not exists resultat_attendu text;

-- ============================================================
-- Fin de la migration.
-- ============================================================
