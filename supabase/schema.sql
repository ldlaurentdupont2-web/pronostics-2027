-- ============================================================
-- Pronostics Présidentielle 2027 — schéma Supabase
-- À coller tel quel dans Supabase > SQL Editor > New query > Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tables ----------

create table if not exists familles (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  ordre int not null default 0
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  nom text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists ligues (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  code text not null default upper(substr(md5(random()::text), 1, 6)),
  created_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index if not exists ligues_code_unique on ligues (lower(code));

create table if not exists adhesions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  ligue_id uuid not null references ligues(id) on delete cascade,
  unique (participant_id, ligue_id)
);

create table if not exists candidats (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  famille_id uuid references familles(id) on delete set null,
  statut text not null default 'potentiel',
  photo_url text
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  ouverture timestamptz not null default now(),
  cloture timestamptz not null,
  statut text not null default 'ouverte',
  phase smallint not null default 1,
  date_evenement timestamptz
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  libelle text not null,
  type text not null,
  points numeric not null default 0,
  points_score numeric,
  penalite numeric,
  ordre int not null default 0,
  options_libres jsonb not null default '[]',
  options_candidat_ids jsonb not null default '[]',
  avec_probabilite boolean not null default false,
  bonus_famille_exacte boolean not null default false,
  numerique_entier boolean not null default false,
  numerique_exact boolean not null default false,
  resultat_attendu text
);

create table if not exists pronostics (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  reponse jsonb,
  probabilite numeric,
  date timestamptz not null default now(),
  unique (participant_id, question_id)
);

create table if not exists resultats (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade unique,
  resultat jsonb,
  date_validation timestamptz not null default now()
);

create table if not exists commentaires (
  id uuid primary key default gen_random_uuid(),
  ligue_id uuid not null references ligues(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  contenu text not null,
  created_at timestamptz not null default now()
);

create table if not exists echeances (
  id uuid primary key default gen_random_uuid(),
  libelle text not null,
  quand text not null,
  date_tri date,
  points text,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists ligues_nom_unique on ligues (lower(nom));
create unique index if not exists participants_nom_unique on participants (lower(nom));

-- ---------- Données de départ : les 6 familles politiques ----------

insert into familles (nom, ordre)
select * from (values
  ('Gauche radicale', 0),
  ('Gauche sociale-démocrate, écologiste et alliés', 1),
  ('Bloc central', 2),
  ('Droite républicaine et conservatrice', 3),
  ('Droite nationale', 4),
  ('Souverainistes et indépendants', 5)
) as v(nom, ordre)
where not exists (select 1 from familles);

-- ---------- Fonction utilitaire : suis-je admin ? ----------

create or replace function is_admin(uid uuid) returns boolean
language sql stable as $$
  select coalesce((select is_admin from participants where user_id = uid), false);
$$;

-- ---------- Row Level Security ----------

alter table participants enable row level security;
alter table ligues enable row level security;
alter table adhesions enable row level security;
alter table familles enable row level security;
alter table candidats enable row level security;
alter table sessions enable row level security;
alter table questions enable row level security;
alter table pronostics enable row level security;
alter table resultats enable row level security;
alter table commentaires enable row level security;
alter table echeances enable row level security;

-- Lecture : tout le monde connecté voit tout (jeu partagé entre joueurs), sauf les ligues
create policy "read familles" on familles for select using (auth.role() = 'authenticated');
create policy "read candidats" on candidats for select using (auth.role() = 'authenticated');
create policy "read sessions" on sessions for select using (auth.role() = 'authenticated');
create policy "read questions" on questions for select using (auth.role() = 'authenticated');
create policy "read resultats" on resultats for select using (auth.role() = 'authenticated');
create policy "read adhesions" on adhesions for select using (auth.role() = 'authenticated');
create policy "read pronostics" on pronostics for select using (auth.role() = 'authenticated');
create policy "read participants" on participants for select using (auth.role() = 'authenticated');

-- Ligues : lecture réservée aux membres, au créateur, + à l'admin (impossible de voir
-- le nom d'une ligue à laquelle on n'appartient pas et qu'on n'a pas créée)
create policy "read ligues (membre, créateur ou admin)" on ligues for select using (
  is_admin(auth.uid())
  or created_by = auth.uid()
  or id in (select ligue_id from adhesions where participant_id in (select id from participants where user_id = auth.uid()))
);

-- participants : chacun crée son propre profil ; devient admin uniquement s'il est le tout premier
create policy "insert own participant" on participants for insert with check (
  auth.uid() = user_id
  and (is_admin = false or not exists (select 1 from participants))
);
create policy "update own participant or admin" on participants for update using (
  auth.uid() = user_id or is_admin(auth.uid())
) with check (
  (auth.uid() = user_id and is_admin = (select p.is_admin from participants p where p.user_id = auth.uid()))
  or is_admin(auth.uid())
);

-- ligues : n'importe quel participant connecté peut créer une ligue (pas réservé à l'admin)
create policy "insert ligue" on ligues for insert with check (auth.role() = 'authenticated');
create policy "admin update ligues" on ligues for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin delete ligues" on ligues for delete using (is_admin(auth.uid()));

-- adhesions : on ne peut PAS s'inscrire directement dans une ligue (pas de policy insert
-- côté table) — il faut passer par la fonction join_ligue(code), qui vérifie le code
-- d'invitation avant d'insérer. Voir plus bas.
create policy "delete own adhesion" on adhesions for delete using (
  participant_id in (select id from participants where user_id = auth.uid())
);

-- pronostics : chacun écrit uniquement ses propres réponses
create policy "insert own pronostic" on pronostics for insert with check (
  participant_id in (select id from participants where user_id = auth.uid())
);
create policy "update own pronostic" on pronostics for update using (
  participant_id in (select id from participants where user_id = auth.uid())
);

-- candidats / sessions / questions / résultats : écriture réservée à l'admin
create policy "admin write candidats" on candidats for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin write sessions" on sessions for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin write questions" on questions for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin write resultats" on resultats for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- ---------- Rejoindre une ligue via un code d'invitation ----------
-- Fonction "security definer" : tourne avec les droits du propriétaire de la table,
-- donc peut lire "ligues" même si l'appelant n'a pas le droit de toutes les lister.
-- C'est le SEUL moyen d'insérer une ligne dans "adhesions" (pas de policy insert directe).
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

-- ---------- Commentaires par ligue ----------
create policy "read commentaires (membre ou admin)" on commentaires for select using (
  is_admin(auth.uid())
  or ligue_id in (select ligue_id from adhesions where participant_id in (select id from participants where user_id = auth.uid()))
);
create policy "insert commentaires (membre)" on commentaires for insert with check (
  participant_id in (select id from participants where user_id = auth.uid())
  and ligue_id in (select ligue_id from adhesions where participant_id in (select id from participants where user_id = auth.uid()))
);

-- ---------- Calendrier des points, éditable depuis Admin ----------
create policy "read echeances" on echeances for select using (auth.role() = 'authenticated');
create policy "admin write echeances" on echeances for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- ---------- Vérification de disponibilité d'un prénom avant inscription ----------
create or replace function nom_disponible(p_nom text)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select not exists (select 1 from participants where lower(nom) = lower(trim(p_nom)));
$$;

grant execute on function nom_disponible(text) to anon, authenticated;

-- ---------- Temps réel ----------
-- Sans ceci, les écrans ne se rafraîchissent pas automatiquement après une action
-- (réponse enregistrée, résultat publié...) : il faudrait recharger la page à la main.
do $$
declare
  t text;
begin
  foreach t in array array['participants','ligues','adhesions','familles','candidats','sessions','questions','pronostics','resultats','commentaires','echeances']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ============================================================
-- Fin du script. Pense à activer "Enable email confirmations"
-- ou à le désactiver temporairement dans Authentication > Providers > Email
-- si tu veux que tes amis puissent se connecter sans confirmer leur email.
-- ============================================================
