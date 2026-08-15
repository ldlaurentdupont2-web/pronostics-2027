-- ============================================================
-- Migration : ajoute deux réglages aux questions numériques.
-- - numerique_entier : true = nombre entier sans décimale (ex. un nombre de
--   candidats), false = score en % à 1 décimale (comportement par défaut,
--   inchangé pour les questions déjà créées).
-- - numerique_exact : true = points pour toute réponse strictement exacte
--   (chacun peut gagner), false = seul le plus proche du résultat gagne
--   (comportement par défaut, inchangé).
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Ne supprime aucune donnée existante.
-- ============================================================

alter table questions add column if not exists numerique_entier boolean not null default false;
alter table questions add column if not exists numerique_exact boolean not null default false;

-- ============================================================
-- Fin de la migration.
-- ============================================================
