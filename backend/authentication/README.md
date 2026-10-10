# AUTH-02 — connexion

Responsable : Joel. Module ajouté séparément, sans modifier le serveur actuel ni le frontend. Aucun changement de Neon, aucun e-mail, aucune activation sur Vercel. Livraison sur la branche api/registration ; module à intégrer et à configurer avant utilisation sur le site.

## Fonctionnement simple

1. Le formulaire envoie un e-mail ou un pseudo et le mot de passe à `POST /auth/login`.
2. Le serveur cherche le compte dans `users`, avec une requête SQL paramétrée. Le pseudo et l’e-mail sont comparés sans tenir compte de la casse et des espaces autour. Un identifiant contenant `@` est traité comme un e-mail.
3. Il vérifie le mot de passe contre `password_hash`. Argon2id du module d’inscription, ancien scrypt du module et bcrypt historique sont reconnus. Aucun mot de passe n’est enregistré en clair et aucun hash existant n’est modifié.
4. Si les identifiants sont bons, il renvoie les informations publiques du compte et place un cookie de connexion dans le navigateur.
5. Le cookie contient un JWT signé, valable 30 minutes. Il est `HttpOnly`, `Secure`, `SameSite=Strict`, limité au domaine courant grâce au préfixe `__Host-`, et ne contient ni e-mail ni rôle. Le rôle ADMIN/PLAYER/CLUB reste vérifié dans la base par les modules de licences.

La connexion ne valide pas une licence. Les comptes PENDING ou REJECTED peuvent se connecter pour poursuivre leur dossier. Le statut est renvoyé ; les futures actions nécessitant une approbation devront le contrôler. La confirmation de l’e-mail reste reportée : `is_verified` n’est pas modifié.

## JSON envoyé par le formulaire

```json
{"identifier":"Joel Lopes Ribeiro","password":"le mot de passe saisi"}
```

Ou `identifier` peut contenir l’e-mail. Les noms de champs sont exactement `identifier` et `password` ; les champs supplémentaires sont refusés. Aucun ADMIN ne peut être demandé dans ce formulaire.

Réponse 200 :

```json
{"user":{"id":1,"username":"Joel Lopes Ribeiro","email":"joel@example.invalid","role":"PLAYER","is_verified":false,"status":"PENDING","created_at":"2026-10-10T10:00:00.000Z"}}
```

Le JWT n’est pas retourné dans le JSON. Le navigateur reçoit le cookie automatiquement. Ne pas stocker de jeton dans `localStorage`.

```js
const response = await fetch('/auth/login', {
  method: 'POST', credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier, password }),
});
```

## Installation et branchement futur

Node.js 22 ou supérieur ; dépendances supplémentaires isolées : jose et bcryptjs. Le module utilise aussi `backend/registration/password.js`, donc conserver les deux modules et installer leurs dépendances :

```bash
npm ci --prefix backend/registration --workspaces=false --ignore-scripts
npm ci --prefix backend/authentication --workspaces=false --ignore-scripts
```

Exemple de branchement, **à ajouter plus tard** avant les parseurs globaux et la réponse 404 :

```js
const { createLoginRouter } = require('./backend/authentication/router');
const { createSessionService } = require('./backend/authentication/session');
const sessions = createSessionService(pool, {
  secret: process.env.AUTH_SECRET,
  origins: [process.env.APP_ORIGIN],
});
app.use('/auth', createLoginRouter(pool, { sessions }));
// Si les modules de licence sont montés :
app.use('/players', createLicenseRouter(pool, {
  authenticate: sessions.authenticate, storage: privateStorage,
}));
app.use('/admin', createLicenseAdminRouter(pool, {
  authenticate: sessions.authenticate,
}));
```

Les imports `createLicenseRouter` / `createLicenseAdminRouter` et l’adaptateur `privateStorage` sont décrits dans le guide des licences. Le test vérifie le branchement de la session réelle à l’API administrateur ; il ne modifie pas le serveur de production.

Configuration :

- `AUTH_SECRET` : secret aléatoire de 32 octets, encodé en 64 caractères hexadécimaux, identique entre les instances du backend. À stocker dans les variables privées du serveur, jamais dans Git, la documentation, le frontend ou une variable `VITE_*` / `NEXT_PUBLIC_*`. Aucun secret réel n’a été généré ici.
- `APP_ORIGIN` : origine HTTPS exacte, par exemple `https://mercasport.vercel.app`, sans slash final. La connexion refuse un Origin absent ou différent. Plusieurs origines de confiance peuvent être fournies explicitement au service ; ne pas autoriser tous les domaines de prévisualisation par défaut.

Le cookie exige HTTPS, y compris pour un test dans le navigateur : prévoir HTTPS en développement plutôt que supprimer Secure. L’exemple suppose frontend et API sur la même origine. Les tests HTTP locaux lisent manuellement l’en-tête du cookie ; cela ne constitue pas une configuration navigateur de production.

## Protections et limites

Identifiant absent et mot de passe incorrect renvoient la même erreur 401, sans révéler l’existence du compte. Un hash Argon2id fictif est utilisé pour vérifier une tentative visant un compte inexistant. Le mot de passe n’est ni tronqué ni débarrassé des espaces. Bcrypt est limité aux coûts 4 à 14 et aux mots de passe de 72 octets maximum afin d’éviter sa troncature silencieuse ; les autres paramètres Argon2id/scrypt ne sont pas pris en charge par cette version.

Corps JSON : 4 Kio maximum ; mot de passe : 128 caractères et 512 octets maximum. Deux vérifications de mot de passe au maximum par instance. Limite par IP et par identifiant : 10 requêtes dans une fenêtre de 15 minutes, y compris les connexions réussies. Les clés d’identifiant de cette limite sont des empreintes et ne contiennent pas d’e-mail en clair.

Le limiteur est local en mémoire : ajouter un limiteur partagé / au niveau de l’hébergeur avant une exposition publique, notamment sur Vercel. Configurer les proxys de confiance avec précision pour obtenir une adresse IP fiable ; ne pas faire confiance à tout `X-Forwarded-For`. Un attaquant peut momentanément épuiser la limite d’un identifiant : surveiller et adapter ce compromis.

Le service vérifie signature, algorithme HS256, émetteur, destinataire, expiration et ancienneté du JWT. Il relit le compte dans la base. Un changement de `password_hash` invalide ses cookies existants ; la suppression du compte aussi. Les routes de licence vérifient le rôle actuel en base, indépendamment du token.

Les requêtes modifiant des données et authentifiées par cookie doivent passer par `sessions.authenticate`, qui exige une origine autorisée. Les routes du backend actuel ne sont pas automatiquement protégées par l’ajout de ce module. Une API utilisant GET pour modifier des données ne convient pas à ce mécanisme.

Pas de table de sessions, pas de refresh token, pas de route logout ni révocation d’une session isolée dans AUTH-02. Un cookie volé reste utilisable jusqu’à expiration, changement de mot de passe ou rotation du secret. La rotation du secret déconnecte tous les comptes. Prévoir les fonctions complémentaires dans des tâches ultérieures.

Erreurs : 400 champs/JSON invalides ; 401 identifiants incorrects ; 403 origine refusée ; 413 JSON trop gros ; 415 type incorrect ; 429 trop de tentatives ; 503 configuration absente, traitement occupé ou indisponibilité. Les erreurs SQL, secrets et mots de passe ne sont pas renvoyés.

## Tests et documentation

10 tests locaux réussis : connexion e-mail/pseudo, bcrypt, cookie sécurisé, mauvais identifiants, validation, origine, limitation, cookie falsifié/expiré, API administrateur avec rôle actuel et invalidation après changement de mot de passe. Données fictives et PostgreSQL embarqué ; aucun accès à Neon.

```bash
MERCASPORT_TEST_PGLITE=1 node --test backend/authentication/tests/login.test.js
```

Comme les tests des modules précédents, cette commande nécessite Express, pg et PGlite dans l’environnement de test. Sur ce poste ils sont dans l’environnement de vérification externe via NODE_PATH. PGlite n’est pas une dépendance du backend réel.

Références techniques : [jose](https://github.com/panva/jose), [bcryptjs](https://github.com/dcodeIO/bcrypt.js), [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
