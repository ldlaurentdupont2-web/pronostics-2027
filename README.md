# Pronostics Présidentielle 2027 — version site web

Migration de l'artifact Claude (React + `window.storage`) vers un vrai site : React + Supabase
(base de données + authentification) + déploiement Vercel. La logique de scoring et l'interface
sont identiques à l'artifact d'origine ; seule la persistance change.

## 1. Créer le projet Supabase (gratuit)

1. Va sur [supabase.com](https://supabase.com), crée un compte et un nouveau projet (choisis une
   région proche, ex. `eu-central`).
2. Une fois le projet créé, ouvre **SQL Editor > New query**, colle tout le contenu de
   [`supabase/schema.sql`](supabase/schema.sql), puis clique **Run**. Ça crée les tables, les
   6 familles politiques et les règles de sécurité (RLS).
3. Va dans **Authentication > Providers > Email** :
   - Laisse "Enable email provider" activé.
   - Si tu veux que tes amis puissent se connecter immédiatement sans cliquer un lien de
     confirmation envoyé par email, désactive **"Confirm email"**. Sinon, chacun devra confirmer
     son adresse avant de pouvoir se connecter.
4. Va dans **Project Settings > API** et note :
   - `Project URL`
   - `anon public` key

## 2. Configurer le projet en local

```bash
cd pronostics-2027-web
cp .env.example .env
# édite .env et colle Project URL / anon key
npm install
npm run dev
```

Ouvre l'URL locale affichée (en général `http://localhost:5173`). Crée ton premier compte : il
deviendra automatiquement administrateur.

## 3. Déployer sur Vercel (gratuit)

1. Pousse ce dossier vers un dépôt GitHub (public ou privé, peu importe).
2. Sur [vercel.com](https://vercel.com), **Add New > Project**, importe le dépôt.
3. Vercel détecte Vite automatiquement. Avant de déployer, ajoute les variables d'environnement
   (**Environment Variables**) :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique **Deploy**. Tu obtiens une URL type `pronostics-2027.vercel.app`, stable dans le temps,
   que tu peux partager à ton groupe.

Chaque fois que tu modifies le code et push sur GitHub, Vercel redéploie automatiquement.

## Différences avec l'artifact Claude

- **Authentification réelle** (email + mot de passe) au lieu du choix de nom en clair — personne
  ne peut usurper l'identité d'un autre joueur.
- **Base de données Postgres** (Supabase) au lieu de `window.storage` : export/sauvegarde
  possibles à tout moment, aucun risque de perte de données lié à une dépublication.
- **Temps réel** : les écrans se rafraîchissent automatiquement quand un autre joueur répond ou
  quand l'admin publie un résultat (abonnement Supabase Realtime), sans recharger la page.
- **Sécurité au niveau ligne (RLS)** : chacun ne peut modifier que ses propres pronostics et
  adhésions ; seul l'admin peut créer des sessions/questions/candidats et valider des résultats.

## Où retrouver quoi

- `src/lib/scoring.js` — le moteur de scoring, recopié à l'identique depuis l'artifact original.
- `src/lib/db.js` — toute la persistance Supabase (remplace `window.storage`).
- `src/screens/` — un fichier par onglet (Règles, Accueil, Pronostiquer, Historique, Classement,
  Groupe, Admin), même découpage logique que l'artifact original.
- `supabase/schema.sql` — schéma complet à rejouer si tu recrées un projet Supabase.

## Limites connues (comme dans l'artifact d'origine)

- Pas de vraie modération/appel en cas de litige sur un résultat — l'admin tranche.
- L'import "Candidator.fr" (`src/lib/candidatorImport.js`) est une liste figée à réactualiser à la
  main si besoin.
- Pas de récupération de mot de passe configurée par défaut (Supabase le permet, mais nécessite de
  configurer l'envoi d'email — voir **Authentication > Email Templates** si besoin).
