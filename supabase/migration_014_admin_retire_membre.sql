-- ============================================================
-- Migration : autorise l'admin à retirer n'importe quel participant d'une ligue
-- (jusqu'ici, seul le joueur pouvait se retirer lui-même).
-- À coller dans Supabase > SQL Editor > New query > Run.
-- ============================================================

create policy "admin delete adhesion" on adhesions for delete using (is_admin(auth.uid()));

-- ============================================================
-- Fin de la migration.
-- ============================================================
