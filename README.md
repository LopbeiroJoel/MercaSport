# MercaSport

Le mercato du football amateur : HTML/CSS/JavaScript de Thomas,
API Node.js/Express de Matteo et PostgreSQL de Joel.

## Ce qui est connecté

- La page charge les annonces de PostgreSQL avec `GET /ads`.
- « Voir les détails » appelle `GET /ads/:id` et ouvre la fenêtre existante.
- `POST /applications` enregistre une candidature selon le contrat API déjà prévu.
- `GET /health` vérifie la connexion à PostgreSQL.

Le front est repris de la branche `front-end`, commit `a47f680`, dans `frontend/`.
La liste n’utilise plus `ads.json` ni d’annonces fictives codées dans le serveur.
Les annonces SQL de démonstration restent fictives, mais elles sont réellement lues dans la base.
Elles sont toutes consultables, sans statut approuvé/attente/refus.

Le périmètre de cette intégration conserve l’interface existante : pas de nouvelle
authentification, de formulaire de candidature ni de modération.
Connexion/inscription/admin restent des pages à réaliser ; recherche et les liens
Actualités/Contact restent à compléter par le front.

## Lancer dans Ubuntu/WSL

Depuis la racine du dépôt, avec **Node.js 22**, npm et PostgreSQL installé :

```bash
npm ci
```

La base `mercasport` doit contenir le schéma et les données.
Si elle n’existe pas encore, la créer puis importer les fichiers :

```bash
sudo -u postgres createdb mercasport
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -d mercasport < database/schema.sql
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -d mercasport < database/seed.sql
```

Sur la base existante de Joel, ne pas refaire `createdb` ; les procédures de migration
et de conservation sont dans [database/README.md](database/README.md).

Pour configurer le mot de passe local sans l’envoyer à quelqu’un ni l’afficher :

```bash
npm run configure
```

Saisir l’utilisateur PostgreSQL (par défaut `postgres`), puis son mot de passe.
Le script vérifie la lecture des annonces et crée un `.env` privé uniquement si la connexion fonctionne.
Ce mot de passe est celui de PostgreSQL, pas celui du compte pgAdmin ou du site.
Si `.env` existe déjà, le modifier dans VS Code : le script ne l’écrase pas.
Alternative manuelle : copier `.env.example` vers `.env`, puis compléter `DB_*`.

```bash
npm start
```

Ouvrir **http://localhost:3000**, pas le fichier HTML seul ni un serveur Live Server séparé.
Le serveur sert le front et l’API ensemble ; aucun CORS à configurer pour ce lancement.
`.env` est ignoré par Git ; chacun configure sa propre connexion PostgreSQL.
Le lancement historique `cd backend && npm start` reste disponible.

## Fichiers et responsabilités

| Partie | Responsable | Fichiers |
|---|---|---|
| Front | Thomas | `frontend/index.html`, `frontend/css/`, `frontend/js/` |
| Back | Matteo | `backend/app.js`, `backend/db.js`, `backend/docs/api.md` |
| SQL | Joel | `database/schema.sql`, `seed.sql`, `queries.sql` |
| Intégration | Équipe avec Joel | `server.js`, configuration et tests |

Les branches de travail sont `front`/`front-end`, `back` et `sql` ; `main` est la version commune.
Pour récupérer la version commune sur une branche propre :

```bash
git fetch origin
git merge origin/main
npm ci
```

Contrat complet : [backend/docs/api.md](backend/docs/api.md).
Le schéma contient six tables : `users`, `players`, `clubs`, `teams`, `ads`, `applications`.
Le seed fournit 13 clubs, 28 équipes, 28 annonces et trois candidatures.

## Vérification

```bash
npm test
npm run test:sql
npm run build
```

Les tests nécessitent Ubuntu, Python 3 et les binaires serveur PostgreSQL (`pg_config`).
Ils créent des clusters temporaires privés et ne se connectent pas à `mercasport`.
Le test HTTP vérifie les annonces réelles, les détails, l’écriture d’une candidature,
les doublons/erreurs de saisie et une panne de connexion.
`npm run build` copie uniquement le front dans `public/`, ignoré par Git.

## Préparation Vercel

La racine du dépôt contient `server.js`, qui exporte l’application Express.
`vercel.json` lance `npm run build` pour préparer les fichiers statiques dans `public/`.
Les URLs `/ads` et `/ads/:id` fonctionneront sur le même domaine que la page.
Cette configuration prépare l’hébergement ; elle ne crée aucun déploiement.

Lors de l’étape d’hébergement :

1. Préparer une base **PostgreSQL hébergée**, puis y importer `schema.sql` et les données souhaitées.
2. Importer ce dépôt dans Vercel depuis sa racine, avec Node.js 22.
3. Ajouter `DATABASE_URL` aux variables privées du projet Vercel, avec l’URL/TLS du fournisseur PostgreSQL.
4. Vérifier `/health`, les annonces et un détail sur le déploiement de prévisualisation.

Le PostgreSQL de WSL (`127.0.0.1`) reste sur le PC de Joel ; Vercel doit utiliser une base hébergée.
La base distante et le déploiement ne sont pas encore créés.
Le pool est partagé entre les requêtes et associé au cycle de vie Vercel avec `attachDatabasePool`.
La validation des certificats TLS n’est pas désactivée par le code.

Références officielles : [Express sur Vercel](https://vercel.com/docs/frameworks/backend/express),
[PostgreSQL hébergé via Marketplace](https://vercel.com/docs/postgres),
[gestion des pools](https://vercel.com/kb/guide/efficiently-manage-database-connection-pools-with-fluid-compute).
