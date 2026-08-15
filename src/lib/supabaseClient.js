import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Ce message apparaît dans la console si le fichier .env n'est pas configuré.
  console.error(
    "Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes. Copiez .env.example vers .env et remplissez-le avec les valeurs de votre projet Supabase (Project Settings > API)."
  );
}

export const supabase = createClient(url, anonKey);
