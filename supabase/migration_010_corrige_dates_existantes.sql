-- ============================================================
-- Migration : corrige "quand le résultat sera connu" sur les questions déjà
-- créées avant l'ajout de ce champ (elles avaient été créées avec l'ancienne
-- valeur par défaut "à la clôture de cette session", incorrecte pour la
-- plupart d'entre elles).
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Utilise ilike (motif large) plutôt qu'une correspondance exacte, pour
-- rester robuste même si le libellé a légèrement varié entre deux versions.
-- ============================================================

-- Questions "candidats par famille" + pari nominatif : résolues au dépôt
-- officiel des parrainages
update questions
set resultat_attendu = '12 mars 2027 (dépôt officiel des parrainages)'
where libelle ilike 'Quels seront les candidats de la famille%'
   or libelle ilike 'Nommez un candidat qui pourrait se présenter%'
   or libelle ilike 'Le PS aura-t-il un candidat%';

-- Questions de score au premier tour (candidat_score et numérique) : résolues
-- au vrai 1er tour
update questions
set resultat_attendu = '18 avril 2027 (1er tour)'
where libelle ilike 'Quel sera, au premier tour, le score%'
   or libelle ilike 'Qui arrivera en tête de la famille%';

-- Question sur la primaire Attal/Philippe : résolue à la clôture de la
-- session de fin décembre
update questions
set resultat_attendu = 'À la clôture de la session de fin décembre 2026'
where libelle ilike 'Une primaire%Attal%Philippe%';

-- Question "Combien de candidats du Bloc central seront encore en lice" :
-- retirée du jeu (remplacée par la question de score Gauche sociale-démocrate).
-- ATTENTION : si des joueurs y ont déjà répondu, leurs réponses à CETTE
-- question précise seront supprimées avec (suppression en cascade). Commente
-- ces deux lignes si tu préfères la garder telle quelle.
delete from questions
where libelle ilike 'Combien de candidats de la famille « Bloc central »%';

-- ============================================================
-- Fin de la migration. Les nouvelles questions créées désormais auront
-- directement la bonne date grâce à la mise à jour du site — plus besoin de
-- ce genre de correctif à l'avenir.
-- ============================================================
