-- ============================================================
-- Migration : ajoute une colonne "phase" (1 à 5) aux sessions, pour le calendrier.
-- À coller dans Supabase > SQL Editor > New query > Run
-- Ne supprime aucune donnée existante. Les sessions déjà créées passent en Phase 1.
-- ============================================================

alter table sessions add column if not exists phase smallint not null default 1;

-- ============================================================
-- Fin de la migration.
-- ============================================================
