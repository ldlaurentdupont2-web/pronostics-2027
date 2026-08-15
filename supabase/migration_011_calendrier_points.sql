-- ============================================================
-- Migration : calendrier des points éditable depuis Admin (table "echeances")
-- + correction de la date de la question sur la primaire Attal/Philippe.
-- À coller dans Supabase > SQL Editor > New query > Run.
-- ============================================================

-- 1) Date précise plutôt que la formulation vague utilisée avant
update questions
set resultat_attendu = 'dim. 27 décembre 2026'
where libelle ilike 'Une primaire%Attal%Philippe%';

-- 2) Table du calendrier des points, éditable depuis Admin > Calendrier des points
create table if not exists echeances (
  id uuid primary key default gen_random_uuid(),
  libelle text not null,
  quand text not null,
  date_tri date,
  points text,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

alter table echeances enable row level security;

create policy "read echeances" on echeances for select using (auth.role() = 'authenticated');
create policy "admin write echeances" on echeances for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'echeances') then
    alter publication supabase_realtime add table echeances;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'commentaires') then
    alter publication supabase_realtime add table commentaires;
  end if;
end $$;

-- 3) Pré-remplissage avec les échéances déjà connues à ce jour
insert into echeances (libelle, quand, date_tri, points, ordre)
select 'Primaire Attal / Philippe', 'dim. 27 décembre 2026', date '2026-12-27',
       'Question oui/non de la session de fin décembre : +2 pts si une primaire commune est officiellement annoncée avant cette date.', 10
where not exists (select 1 from echeances where libelle = 'Primaire Attal / Philippe');

insert into echeances (libelle, quand, date_tri, points, ordre)
select 'Dépôt officiel des parrainages', '12 mars 2027', date '2027-03-12',
       '6 questions "candidats par famille" (±2 pts/candidat + bonus famille exacte +2/famille, +8 si les 6 familles sont exactes) + pari nominatif candidature surprise (+6/-2) + question PS adhérent (+2).', 20
where not exists (select 1 from echeances where libelle = 'Dépôt officiel des parrainages');

insert into echeances (libelle, quand, date_tri, points, ordre)
select 'Premier tour', '18 avril 2027', date '2027-04-18',
       'Questions de score par famille (numérique et tête de famille + score) : le plus proche gagne, 2 pts (+1 pt bonus score pour les questions "tête de famille + score").', 30
where not exists (select 1 from echeances where libelle = 'Premier tour');

-- ============================================================
-- Fin de la migration. Ce tableau est ensuite entièrement modifiable depuis
-- Admin > Calendrier des points, sans avoir besoin d'une nouvelle migration.
-- ============================================================
