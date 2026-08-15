-- ============================================================
-- Migration : bonus "famille exacte" sur les questions + ouverture de la
-- création de ligue à tous les participants (plus réservée à l'admin).
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Ne supprime aucune donnée existante.
-- ============================================================

-- 1) Nouveau champ sur les questions : active le bonus "liste exacte" (+2 pts)
-- et compte pour le super bonus "toutes les familles exactes" (+8 pts), calculés
-- côté application (src/lib/scoring.js), pas besoin de logique côté base.
alter table questions add column if not exists bonus_famille_exacte boolean not null default false;

-- L'ancienne colonne "bonus_anticipation" n'est plus utilisée par l'application
-- (le bonus d'anticipation a été retiré). On la laisse en base pour ne rien casser,
-- elle est juste ignorée désormais.

-- 2) Ligues : n'importe quel participant peut désormais en créer une (plus réservé
-- à l'admin). On trace le créateur pour qu'il puisse voir sa ligue tout de suite
-- (avant même de l'avoir rejointe), sans quoi il ne pourrait pas récupérer son
-- propre code d'invitation.
alter table ligues add column if not exists created_by uuid default auth.uid() references auth.users(id);

drop policy if exists "admin write ligues" on ligues;
create policy "insert ligue" on ligues for insert with check (auth.role() = 'authenticated');
create policy "admin update ligues" on ligues for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin delete ligues" on ligues for delete using (is_admin(auth.uid()));

drop policy if exists "read ligues (membre ou admin)" on ligues;
create policy "read ligues (membre, créateur ou admin)" on ligues for select using (
  is_admin(auth.uid())
  or created_by = auth.uid()
  or id in (select ligue_id from adhesions where participant_id in (select id from participants where user_id = auth.uid()))
);

-- ============================================================
-- Fin de la migration.
-- ============================================================
