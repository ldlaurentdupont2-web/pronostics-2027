-- ============================================================
-- Migration : commentaires par ligue + unicité des noms (ligues et prénoms).
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Ne supprime aucune donnée existante.
-- ATTENTION : si un nom de ligue ou un prénom est déjà en double dans tes
-- données actuelles, la création de l'index unique correspondant échouera —
-- dans ce cas, renomme d'abord le doublon (Admin ou support Supabase), puis
-- relance cette migration.
-- ============================================================

-- 1) Commentaires par ligue
create table if not exists commentaires (
  id uuid primary key default gen_random_uuid(),
  ligue_id uuid not null references ligues(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  contenu text not null,
  created_at timestamptz not null default now()
);

alter table commentaires enable row level security;

create policy "read commentaires (membre ou admin)" on commentaires for select using (
  is_admin(auth.uid())
  or ligue_id in (select ligue_id from adhesions where participant_id in (select id from participants where user_id = auth.uid()))
);

create policy "insert commentaires (membre)" on commentaires for insert with check (
  participant_id in (select id from participants where user_id = auth.uid())
  and ligue_id in (select ligue_id from adhesions where participant_id in (select id from participants where user_id = auth.uid()))
);

-- 2) Unicité des noms de ligue et des prénoms (insensible à la casse)
create unique index if not exists ligues_nom_unique on ligues (lower(nom));
create unique index if not exists participants_nom_unique on participants (lower(nom));

-- 3) Fonction pour vérifier la disponibilité d'un prénom AVANT de créer le compte
-- (appelable avant même d'être connecté, pour bloquer l'inscription proprement
-- plutôt que de laisser échouer la création du profil après coup)
create or replace function nom_disponible(p_nom text)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select not exists (select 1 from participants where lower(nom) = lower(trim(p_nom)));
$$;

grant execute on function nom_disponible(text) to anon, authenticated;

-- ============================================================
-- Fin de la migration.
-- ============================================================
