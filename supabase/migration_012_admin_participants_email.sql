-- ============================================================
-- Migration : permet à l'admin (et uniquement l'admin) de récupérer la liste
-- des participants avec leur adresse email, pour la synthèse par ligue.
-- L'email n'est jamais exposé aux autres joueurs (il vit dans auth.users,
-- normalement inaccessible depuis le client) — seule cette fonction y donne
-- accès, et uniquement si l'appelant est administrateur.
-- À coller dans Supabase > SQL Editor > New query > Run.
-- ============================================================

create or replace function admin_liste_participants()
returns table(participant_id uuid, nom text, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'Réservé aux administrateurs.';
  end if;
  return query
    select p.id, p.nom, u.email::text
    from participants p
    join auth.users u on u.id = p.user_id;
end;
$$;

grant execute on function admin_liste_participants() to authenticated;

-- ============================================================
-- Fin de la migration.
-- ============================================================
