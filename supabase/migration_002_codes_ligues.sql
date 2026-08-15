-- ============================================================
-- Migration : codes d'invitation pour les ligues + verrouillage des accès
-- À coller dans Supabase > SQL Editor > New query > Run
-- Ne supprime aucune donnée existante.
-- ============================================================

-- 1) Colonne "code" sur les ligues, générée automatiquement pour les lignes déjà existantes
alter table ligues add column if not exists code text;
update ligues set code = upper(substr(md5(random()::text || id::text), 1, 6)) where code is null;
alter table ligues alter column code set default upper(substr(md5(random()::text), 1, 6));
alter table ligues alter column code set not null;
create unique index if not exists ligues_code_unique on ligues (lower(code));

-- 2) Fonction sécurisée pour rejoindre une ligue via son code
-- (tourne avec les droits du propriétaire de la table, donc peut lire "ligues"
-- même si l'appelant n'a pas le droit de lister toutes les ligues)
create or replace function join_ligue(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ligue_id uuid;
  v_participant_id uuid;
begin
  select id into v_ligue_id from ligues where lower(code) = lower(trim(p_code));
  if v_ligue_id is null then
    raise exception 'Code de ligue invalide.';
  end if;

  select id into v_participant_id from participants where user_id = auth.uid();
  if v_participant_id is null then
    raise exception 'Profil participant introuvable.';
  end if;

  insert into adhesions (participant_id, ligue_id)
  values (v_participant_id, v_ligue_id)
  on conflict (participant_id, ligue_id) do nothing;
end;
$$;

grant execute on function join_ligue(text) to authenticated;

-- 3) Création de ligue réservée à l'admin (au lieu de "n'importe quel joueur connecté")
drop policy if exists "insert ligue" on ligues;
create policy "admin write ligues" on ligues for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- 4) Lecture des ligues réservée aux membres + à l'admin (on ne peut plus voir le nom
-- d'une ligue à laquelle on n'appartient pas)
drop policy if exists "read ligues" on ligues;
create policy "read ligues (membre ou admin)" on ligues for select using (
  is_admin(auth.uid())
  or id in (select ligue_id from adhesions where participant_id in (select id from participants where user_id = auth.uid()))
);

-- 5) On retire la possibilité de s'inscrire "à la main" dans une ligue : tout passe
-- désormais par la fonction join_ligue() ci-dessus, qui vérifie le code.
drop policy if exists "insert own adhesion" on adhesions;

-- ============================================================
-- Fin de la migration.
-- ============================================================
