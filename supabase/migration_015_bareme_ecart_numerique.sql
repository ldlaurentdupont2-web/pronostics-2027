-- ============================================================
-- Migration : nouveau barème dégressif pour les questions numériques et le bonus
-- "tête de famille + score" — corrige les textes déjà enregistrés en base qui
-- décrivaient encore l'ancien système "le joueur le plus proche gagne, les
-- autres ont 0". Le calcul des points, lui, est fait côté application (aucune
-- fonction SQL de scoring existante à modifier) — voir src/lib/scoring.js.
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Sans danger à rejouer plusieurs fois (les remplacements ne trouvent plus rien
-- une fois déjà appliqués).
-- ============================================================

-- 1) Questions de score (numérique) déjà créées avec l'ancienne formulation
update questions
set libelle = replace(
  libelle,
  '(le plus proche gagne, réponse à 1 décimale)',
  '(points progressifs selon l''écart au résultat, réponse à 1 décimale)'
)
where libelle ilike '%le plus proche gagne%réponse à 1 décimale%';

-- 2) Questions "tête de famille + score" déjà créées avec l'ancienne formulation
update questions
set libelle = replace(
  libelle,
  '1 pt score le plus proche, réservé',
  'jusqu''à 1 pt de bonus selon la précision du score, réservé'
)
where libelle ilike '%score le plus proche, réservé%';

-- 3) Ligne "Premier tour" du calendrier des points (Admin > Calendrier des points),
-- qui décrivait aussi l'ancien système
update echeances
set points = 'Questions de score par famille (numérique et tête de famille + score) : barème dégressif selon l''écart au résultat officiel (voir Règles du jeu), 2 pts + jusqu''à 1 pt de bonus score pour les questions "tête de famille + score".'
where libelle = 'Premier tour';

-- ============================================================
-- Fin de la migration.
-- ============================================================
