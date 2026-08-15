-- ============================================================
-- Migration : crée les 19 sessions du calendrier complet (Phases 1 à 5).
-- Seule la toute première session (Phase 1, été 2026) est créée "ouverte" ;
-- les suivantes sont créées "planifiee" — utilise le bouton "Ouvrir maintenant"
-- dans Admin > Sessions le moment venu pour chacune.
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Sans danger à rejouer : chaque ligne n'est insérée que si son titre n'existe pas déjà.
-- Nécessite migration_004_phase_sessions.sql (colonne "phase") déjà exécutée.
-- ============================================================

-- ---------- Phase 1 · Construction de l'offre politique ----------
insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Cadrage — Été 2026', now(), '2026-08-30 20:00:00'::timestamp at time zone 'Europe/Paris', 'ouverte', 1
where not exists (select 1 from sessions where titre = 'Cadrage — Été 2026');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Cadrage — Septembre 2026', now(), '2026-09-27 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 1
where not exists (select 1 from sessions where titre = 'Cadrage — Septembre 2026');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Cadrage — Octobre 2026', now(), '2026-10-25 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 1
where not exists (select 1 from sessions where titre = 'Cadrage — Octobre 2026');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Cadrage — Novembre 2026', now(), '2026-11-29 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 1
where not exists (select 1 from sessions where titre = 'Cadrage — Novembre 2026');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Cadrage — Décembre 2026', now(), '2026-12-27 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 1
where not exists (select 1 from sessions where titre = 'Cadrage — Décembre 2026');

-- ---------- Phase 2 · De la candidature potentielle à la liste officielle ----------
insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Candidatures — 10 janvier 2027', now(), '2027-01-10 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 2
where not exists (select 1 from sessions where titre = 'Candidatures — 10 janvier 2027');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Candidatures — 24 janvier 2027', now(), '2027-01-24 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 2
where not exists (select 1 from sessions where titre = 'Candidatures — 24 janvier 2027');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Candidatures — 7 février 2027', now(), '2027-02-07 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 2
where not exists (select 1 from sessions where titre = 'Candidatures — 7 février 2027');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Candidatures — 21 février 2027', now(), '2027-02-21 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 2
where not exists (select 1 from sessions where titre = 'Candidatures — 21 février 2027');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Candidatures — 7 mars 2027', now(), '2027-03-07 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 2
where not exists (select 1 from sessions where titre = 'Candidatures — 7 mars 2027');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Candidatures — 14 mars 2027', now(), '2027-03-14 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 2
where not exists (select 1 from sessions where titre = 'Candidatures — 14 mars 2027');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Candidatures — 21 mars 2027', now(), '2027-03-21 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 2
where not exists (select 1 from sessions where titre = 'Candidatures — 21 mars 2027');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Verrouillage liste officielle (date tentative — à ajuster)', now(), '2027-03-23 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 2
where not exists (select 1 from sessions where titre = 'Verrouillage liste officielle (date tentative — à ajuster)');

-- ---------- Phase 3 · Pronostic du premier tour ----------
insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Premier tour — 28 mars 2027', now(), '2027-03-28 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 3
where not exists (select 1 from sessions where titre = 'Premier tour — 28 mars 2027');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Premier tour — 4 avril 2027', now(), '2027-04-04 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 3
where not exists (select 1 from sessions where titre = 'Premier tour — 4 avril 2027');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Premier tour — 11 avril 2027', now(), '2027-04-11 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 3
where not exists (select 1 from sessions where titre = 'Premier tour — 11 avril 2027');

insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Verrouillage 1er tour (veille du vote)', now(), '2027-04-17 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 3
where not exists (select 1 from sessions where titre = 'Verrouillage 1er tour (veille du vote)');

-- ---------- Phase 4 · Pronostic du second tour ----------
insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Second tour (veille du vote)', now(), '2027-04-30 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 4
where not exists (select 1 from sessions where titre = 'Second tour (veille du vote)');

-- ---------- Phase 5 · Bilan et palmarès ----------
insert into sessions (titre, ouverture, cloture, statut, phase)
select 'Bilan de la saison', now(), '2027-05-16 20:00:00'::timestamp at time zone 'Europe/Paris', 'planifiee', 5
where not exists (select 1 from sessions where titre = 'Bilan de la saison');

-- ============================================================
-- Fin de la migration. 19 sessions créées (5 + 8 + 4 + 1 + 1).
-- ============================================================
