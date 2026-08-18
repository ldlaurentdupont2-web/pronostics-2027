-- ============================================================
-- Migration : lien d'invitation direct (/join/:code) — Lot 1.
-- Réutilise le système de code existant, ne crée aucun nouveau token.
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Ne supprime aucune donnée existante.
-- ============================================================

-- 1) Traçabilité de la méthode d'entrée dans une ligue (pour mesurer la viralité
-- plus tard) : 'invite_link', 'manual_code' ou 'creator'.
alter table adhesions add column if not exists methode_entree text not null default 'manual_code';

-- 2) join_ligue() étendu avec un paramètre de méthode (rétro-compatible : les appels
-- existants sans ce paramètre continuent de fonctionner, avec 'manual_code' par défaut).
-- Toujours idempotent (on conflict do nothing), toujours réservé à un utilisateur connecté.
-- On supprime d'abord l'ancienne version à un seul paramètre : en PostgreSQL, changer le
-- nombre de paramètres d'une fonction en crée une seconde en parallèle plutôt que de la
-- remplacer, ce qui laisserait l'ancienne active par erreur.
drop function if exists join_ligue(text);

create or replace function join_ligue(p_code text, p_methode text default 'manual_code')
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

  insert into adhesions (participant_id, ligue_id, methode_entree)
  values (v_participant_id, v_ligue_id, coalesce(p_methode, 'manual_code'))
  on conflict (participant_id, ligue_id) do nothing;
end;
$$;

grant execute on function join_ligue(text, text) to authenticated;

-- 3) Prévisualisation publique (accessible même sans être connecté) : renvoie
-- uniquement le nom de la ligue à partir d'un code, rien d'autre. C'est ce qui
-- permet d'afficher "vous êtes invité·e à rejoindre [nom]" sur /join/:code
-- avant même que la personne se connecte ou crée son compte.
create or replace function preview_ligue(p_code text)
returns table(nom text)
language sql
stable
security definer
set search_path = public
as $$
  select nom from ligues where lower(code) = lower(trim(p_code));
$$;

grant execute on function preview_ligue(text) to anon, authenticated;

-- ============================================================
-- Fin de la migration.
-- ============================================================
