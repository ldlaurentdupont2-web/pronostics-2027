-- ============================================================
-- Migration : active le temps réel (Realtime) sur toutes les tables du jeu.
-- Sans ça, une réponse s'enregistre bien en base mais l'écran ne se
-- rafraîchit pas tout seul pour le confirmer.
-- À coller dans Supabase > SQL Editor > New query > Run
-- Ne supprime aucune donnée existante. Sans danger à rejouer plusieurs fois.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array['participants','ligues','adhesions','familles','candidats','sessions','questions','pronostics','resultats']
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
-- Fin de la migration.
-- ============================================================
