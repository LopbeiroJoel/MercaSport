# Inscription MercaSport — guide pour Matteo

## Ce qui est livré

Le dossier ajoute un module Express pour `POST /auth/register` et ses contrôles. Aucun fichier du backend actuel, du front ou du déploiement n'est modifié. SEC-01 ajoute un package et un verrou de dépendance propres à ce dossier pour Argon2id ; les package.json et package-lock.json existants restent intacts. La route n'est donc pas encore active sur `mercasport.vercel.app`.

La mise à jour SEC-01/API-03 est locale, non commitée et non poussée. La branche distante contient encore la première version scrypt jusqu'à autorisation d'un nouveau push.

Les fichiers utiles sont :

| Fichier | Rôle |
| --- | --- |
| `router.js` | Route HTTP, contrôles des doublons, transaction SQL, réponses JSON |
| `validation.js` | Validation et nettoyage des informations envoyées |
| `password.js` | Hash Argon2id salé, comparaison Argon2id et compatibilité du précédent format scrypt |
| `package.json` / `package-lock.json` | Dépendance hash-wasm 4.12.0 propre au module, sans modification des dépendances du backend actuel |
| `server.js` | Serveur séparé pour tester le module avec les routes existantes |
| `tests/` | Tests HTTP/SQL sur une base jetable ; aucune écriture dans Neon |

## Fonctionnement en six étapes

1. Le front envoie un objet JSON avec `email`, `username`, `password`, `role` et `profile`.
2. L'API refuse les informations manquantes, les champs inconnus et le rôle `ADMIN`.
3. Elle vérifie que l'e-mail et le pseudo sont disponibles, sans tenir compte de la casse.
4. Elle transforme le mot de passe en hash Argon2id avec un sel aléatoire. Le mot de passe en clair n'est jamais enregistré.
5. Dans **une seule transaction**, elle ajoute la ligne dans `users`, puis le profil joueur ou club avec le même `user_id`. Les déclencheurs SQL existants assurent la compatibilité avec `players` et `clubs`.
6. Si les deux insertions réussissent, elle valide la transaction et renvoie `201`. Si le profil échoue, elle annule le compte : il ne reste pas de compte incomplet.

Exemple simple : le compte obtient automatiquement `users.id = 42`. Le profil reçoit `user_id = 42` ; on ne choisit ni ne transmet cet identifiant depuis le front. L'identifiant de l'ancienne table `players` ou `clubs` peut être différent.

## Contrat exact du JSON

`Content-Type: application/json` est obligatoire. Les rôles sont exactement `PLAYER` et `CLUB`, en majuscules.

| Champ commun | Obligatoire | Règle |
| --- | --- | --- |
| `email` | Oui | Adresse ASCII valide, 254 caractères maximum ; espaces extérieurs retirés, passage en minuscules ; unique |
| `username` | Oui | Pseudo de 3 à 50 caractères ; lettres, chiffres, espaces, `.`, `_`, `-` et apostrophes ; unique |
| `password` | Oui | 15 à 128 caractères, 512 octets maximum, sans caractères de contrôle ; les espaces sont conservés |
| `role` | Oui | `PLAYER` ou `CLUB` ; aucun administrateur ne peut s'inscrire par cette route |
| `profile` | Oui | Objet contenant les champs du rôle choisi |

Le pseudo reste distinct du nom du club et du prénom/nom du joueur. La colonne historique `users.name` est remplie avec le pseudo pour rester compatible avec son caractère obligatoire. Les noms complets sont conservés dans les profils.

### Exemple joueur

```json
{
  "email": "joel.nouveau@example.com",
  "username": "JoelFootball",
  "password": "Une longue phrase pour jouer au foot !",
  "role": "PLAYER",
  "profile": {
    "first_name": "Joel",
    "last_name": "Lopes Ribeiro",
    "birth_date": "2002-05-20",
    "position": "Milieu central",
    "preferred_foot": "RIGHT",
    "height_cm": 180,
    "current_club": "FC Exemple"
  }
}
```

Les seules informations obligatoires du profil joueur sont `first_name` et `last_name` (100 caractères maximum chacune). Les autres champs sont facultatifs et peuvent être omis ou envoyés avec `null` :

| Champ joueur | Règle |
| --- | --- |
| `birth_date` | Date réelle, non future, au format `AAAA-MM-JJ` |
| `position` | Texte, 50 caractères maximum (limite vérifiée dans Neon) |
| `preferred_foot` | `RIGHT` = droit ; `LEFT` = gauche ; `BOTH` = les deux |
| `height_cm` | Nombre entier de 100 à 250 ; écrire `180`, pas `"180"` |
| `current_club` | Texte, 150 caractères maximum |

### Exemple club

```json
{
  "email": "contact@fc-exemple.fr",
  "username": "FC Exemple",
  "password": "Une longue phrase pour notre club !",
  "role": "CLUB",
  "profile": {
    "name": "FC Exemple",
    "city": "Strasbourg",
    "divisions": "R3 / D4"
  }
}
```

`profile.name` (150 caractères maximum) et `profile.city` (100 caractères maximum) sont obligatoires. `profile.divisions` est facultatif (100 caractères maximum). Cette inscription crée le club, mais ne publie pas automatiquement d'équipe ni d'annonce.

Les exemples utilisent des coordonnées fictives. Ne les exécuter que sur une base de test : un appel réussi enregistre réellement un compte.

## Réponses HTTP

| HTTP | Code JSON | Signification |
| --- | --- | --- |
| `201` | Pas de code d'erreur | Compte et profil créés |
| `400` | `VALIDATION_ERROR` | Champs incorrects, détails dans `fields` |
| `400` | `INVALID_JSON` / `INVALID_BODY` | Corps de requête invalide |
| `409` | `ACCOUNT_CONFLICT` | E-mail ou pseudo déjà utilisé ; même réponse si deux requêtes arrivent ensemble |
| `413` | `BODY_TOO_LARGE` | Plus de 8 Ko de JSON |
| `415` | `JSON_REQUIRED` | Mauvais type de contenu |
| `503` | `REGISTER_BUSY` | Deux calculs de hash sont déjà en cours dans cette instance ; réessayer après 5 secondes |
| `503` | `SERVICE_UNAVAILABLE` | PostgreSQL indisponible |
| `500` | `REGISTER_FAILED` | Échec interne ; détails SQL non exposés |

Exemple de succès joueur (identifiant et date illustratifs) :

```json
{
  "message": "Compte et profil créés.",
  "user": {
    "id": 42,
    "username": "JoelFootball",
    "email": "joel.nouveau@example.com",
    "role": "PLAYER",
    "is_verified": false,
    "created_at": "2026-10-09T13:00:00.000Z"
  },
  "profile": {
    "user_id": 42,
    "first_name": "Joel",
    "last_name": "Lopes Ribeiro",
    "birth_date": "2002-05-20",
    "position": "Milieu central",
    "preferred_foot": "RIGHT",
    "height_cm": 180,
    "current_club": "FC Exemple",
    "created_at": "2026-10-09T13:00:00.000Z"
  }
}
```

Pour un club, `user` garde la même structure et `profile` contient `user_id`, `name`, `city`, `divisions`, `created_at`. La réponse ne contient jamais `password` ni `password_hash`.

Exemple d'erreur :

```json
{
  "code": "VALIDATION_ERROR",
  "error": "Vérifier les informations.",
  "fields": {
    "password": "Mot de passe de 15 à 128 caractères, sans caractères de contrôle.",
    "profile.last_name": "Texte obligatoire, 100 caractères maximum."
  }
}
```

## Comment Matteo l'active

### Tester sans changer le serveur actuel

Depuis la racine du projet, avec les dépendances existantes installées, installer d'abord la dépendance du module :

```bash
npm ci --prefix backend/registration --workspaces=false --ignore-scripts
```

Puis lancer le serveur séparé :

```bash
PORT=3001 node --env-file-if-exists=.env backend/registration/server.js
```

Le `.env` privé doit pointer vers une **base de test qui possède DB-01/02/03**, via `DATABASE_URL` ou les variables `DB_*` déjà utilisées. Aucun mot de passe de base n'est à mettre dans Git.

Adresse de test : `POST http://localhost:3001/auth/register`. Le serveur habituel sur le port 3000 reste inchangé. Les formulaires HTML existants ne sont pas branchés automatiquement.

### Brancher au backend existant, quand Matteo est prêt

Dans `backend/app.js`, ajouter l'import en haut :

```js
const { createRegistrationRouter } = require('./registration/router');
```

Puis ajouter cette ligne **dans `configureApp(app, pool)`, avant le `app.use(express.json(...))` existant**, et donc avant la réponse 404 finale :

```js
app.use('/auth', createRegistrationRouter(pool));
```

Le placement avant le parseur JSON actuel garantit la limite de 8 Ko de l'inscription et sa gestion d'erreurs dédiée. Les routes `/health`, `/ads`, `/ads/:id` et `/applications` restent dans leur code actuel.

Pour un futur déploiement de ce module, l'installation doit aussi inclure sa dépendance : `npm ci && npm ci --prefix backend/registration --workspaces=false --ignore-scripts`. Cette commande pourra être définie dans la configuration du déploiement au moment de l'activation ; elle n'est pas appliquée à Vercel dans cette livraison.

**Ces deux lignes ne sont pas ajoutées automatiquement dans cette livraison**, conformément à la demande de préserver le backend actuel. Après leur ajout par Matteo et le déploiement, l'adresse publique sera `POST https://mercasport.vercel.app/auth/register`. Avant cela, cette adresse ne fournit pas cette API.

Exemple pour le développeur front, après activation :

```js
const response = await fetch('/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formulaire)
});
const result = await response.json();
if (response.status === 201) {
  // Afficher un succès ; aucune session de connexion n'est créée ici.
} else {
  // Afficher result.error et les erreurs result.fields si présentes.
}
```

## Mots de passe et vérification

SEC-01 utilise désormais Argon2id. Le format enregistré est `$argon2id$v=19$m=65536,t=3,p=1$SEL$HASH` : mémoire 64 Mio, 3 passes, parallélisme 1, sel aléatoire de 16 octets et hash de 32 octets. Les paramètres dépassent le minimum Argon2id indiqué par [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). L'implémentation est [hash-wasm](https://github.com/Daninet/hash-wasm), version verrouillée 4.12.0, exécutée côté serveur. Aucun mot de passe ne doit être hashé uniquement côté navigateur pour remplacer cette protection serveur.

Les anciens hashes bcrypt sont conservés. `verifyPassword()` compare les nouveaux hashes Argon2id et le format scrypt de la première version du module ; la comparaison utilise `timingSafeEqual`. Les réglages acceptés sont bornés au format produit par le module pour refuser les hashes malformés ou des coûts arbitraires. Pour la future connexion, Matteo devra aussi gérer bcrypt, qui n'est pas implémenté par cette fonction. Un ancien hash ne peut pas être converti correctement en Argon2id sans disposer du mot de passe en clair à nouveau, par exemple lors d'une connexion réussie ; aucune réécriture des comptes existants n'est faite ici.

## API-03 : transaction vers Neon

Le code de `router.js` réutilise le pool PostgreSQL actuel. Quand `DATABASE_URL` désigne Neon, les insertions de ce module sont donc envoyées à Neon. Aucune nouvelle colonne n'est nécessaire : `users.password_hash` est déjà un champ TEXT adapté au format Argon2id.

Le hash est calculé avant d'ouvrir la transaction. Ensuite, toutes les écritures utilisent **la même connexion** : `pool.connect()` → `BEGIN` → `INSERT users` → `INSERT player_profiles` ou `club_profiles` → `COMMIT`. `user.id`, renvoyé par PostgreSQL, devient la clé étrangère `profile.user_id`. En cas d'erreur avant validation, `ROLLBACK` annule les écritures ; `client.release()` rend la connexion au pool.

Cette transaction était déjà présente dans API-01 : API-03 vérifie et documente son comportement, sans ajouter une deuxième route ni une insertion en double. Une inscription fictive n'est pas envoyée à Neon pour ce test ; les essais utilisent une base jetable. L'activation de la route reste nécessaire pour que les vraies inscriptions soient enregistrées depuis le formulaire.

L'inscription fixe `is_verified=false`. Elle n'envoie pas d'e-mail, ne crée pas de session/JWT, n'ajoute pas de document dans `player_verifications` et n'approuve pas un joueur. `users.status` conserve son défaut existant `PENDING`, distinct du statut d'une demande de document.

Avant l'ouverture publique, Matteo doit prévoir une limitation des inscriptions au niveau du serveur/hébergeur. La limite de deux hashes simultanés protège la mémoire d'une instance ; elle ne remplace pas une limitation distribuée des tentatives. Le front doit utiliser HTTPS en production et ne pas journaliser le mot de passe.

## Tests et limites de validation

Douze tests HTTP/SQL du module passent avec PostgreSQL embarqué PGlite sur une base jetable : joueur, club, hash Argon2id salé et mot de passe incorrect, champs invalides, refus ADMIN, doublons, concurrence, rollback d'un profil en échec, JSON, panne de base, compatibilité scrypt, refus des hashes malformés et rollback sur une véritable erreur de contrainte SQL du profil. Aucune inscription réelle n'a été envoyée à Neon.

La suite PostgreSQL 18 native sous Ubuntu a été lancée, mais le démarrage du cluster local s'est bloqué ; elle n'est pas déclarée réussie. Pour la relancer après rétablissement d'Ubuntu :

```bash
python3 backend/registration/tests/run.py
```

Ce script prépare un cluster temporaire, applique le schéma historique, les données de démonstration et une copie de la migration DB-01/02/03, puis exécute les nouveaux tests **et** les anciens tests API. Les fichiers SQL de `tests/` sont des fixtures : ne pas les importer dans Neon et ne pas relancer la migration DB-01/02/03 déjà exécutée.

Le mode PGlite est optionnel pour les développeurs ; il n'est pas une dépendance du backend livré. Pour le reproduire avec des dépendances de test installées dans un dossier extérieur au dépôt, définir `NODE_PATH` vers ce dossier et `MERCASPORT_TEST_PGLITE=1`, puis lancer `node --test backend/registration/tests/register.test.js`. La suite native utilise les dépendances du projet et n'a pas besoin de PGlite.
