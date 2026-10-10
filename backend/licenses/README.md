# LIC-01 — envoi privé d’une licence

Responsable : Joel. Module séparé, non branché au serveur actuel, non déployé et non poussé. AUTH-01 (e-mail de confirmation) reste à faire, conformément à la demande de Joel.

## Ce qui est ajouté

- `router.js` : prépare `POST /players/license`. L’identité vient d’une fonction qui vérifie la connexion. Le client ne choisit pas `user_id`. Seuls les comptes PLAYER avec un `player_profiles` existant sont acceptés.
- `upload.js` : reçoit un seul fichier multipart nommé `license`, PDF, JPEG ou PNG, maximum 5 Mio. Vérifie extension, MIME, signature et certains marqueurs de fin. Aucun autre champ n’est accepté. Temps d’envoi limité à 30 secondes, deux traitements simultanés par instance.
- `storage.js` : adaptateur de stockage privé sur disque pour le développement, hors du dépôt et des dossiers servis par le site. Nom UUID généré par le serveur, sans reprendre le nom fourni par l’utilisateur. Modes Linux : dossier 0700, fichier 0600.
- La table existante `player_verifications` reçoit `player_user_id`, `document_key`, `status=PENDING` et `submitted_at`. Les dates de décision et l’administrateur restent vides. Aucune nouvelle table et aucun changement de Neon.
- Les dépendances sont isolées dans `backend/licenses/package.json` et son lockfile : Busboy et file-type. Express et pg sont déjà des dépendances de l’application.

`users.is_verified` n’est pas modifié. Une licence ne confirme pas une adresse e-mail et n’approuve pas automatiquement un joueur.

## Installer les dépendances du module

Node.js 22 ou supérieur :

```bash
npm ci --prefix backend/licenses --workspaces=false --ignore-scripts
```

Cette installation devra aussi être incluse dans la procédure de build lors du branchement du module. Elle n’a pas été ajoutée au build existant.

## Branchement futur par Joel

Ce code est un exemple d’intégration : `verifyExistingSession` doit provenir d’un véritable système de connexion, qui n’existe pas encore dans ces modules. Ne jamais le remplacer par une lecture directe de `req.body.user_id`, d’un en-tête d’identifiant ou d’un jeton non vérifié.

```js
const { createLicenseRouter } = require('./backend/licenses/router');
const { createPrivateDiskStorage } = require('./backend/licenses/storage');

app.use('/players', createLicenseRouter(pool, {
  authenticate: async req => {
    const session = await verifyExistingSession(req);
    return session ? { userId: session.userId } : null;
  },
  storage: createPrivateDiskStorage(process.env.LICENSE_PRIVATE_DIR),
}));
```

Placer le montage avant la réponse 404, les fichiers statiques et tout parseur consommant les corps multipart. Sans `authenticate`, l’API refuse toujours avec 401. Sans stockage privé, elle refuse avec 503.

Exemple de dossier local Ubuntu : `/home/Joel/mercasport-private/licenses` ; Windows : un dossier protégé en dehors du dépôt. Le dossier doit être réservé au service, sans lien symbolique et sans serveur de fichiers dessus. Sur Windows, protéger les fichiers par les droits NTFS ; les modes POSIX ne suffisent pas.

Si la connexion utilise des cookies, vérifier l’origine et mettre une protection CSRF avant cette route. Ajouter une limite de fréquence par utilisateur au niveau du service. La limite de deux traitements par instance protège la mémoire, pas contre tous les abus. Aucune authentification fictive des tests ne doit être utilisée en production.

## Envoi depuis le futur formulaire

```js
const form = new FormData();
form.append('license', fichierChoisi);
const response = await fetch('/players/license', {
  method: 'POST', body: form, credentials: 'same-origin',
});
```

Ne pas définir `Content-Type` manuellement : le navigateur ajoute la frontière multipart. Le formulaire devra aussi envoyer le jeton CSRF ou l’autorisation selon le système de connexion retenu.

Réponse 201 :

```json
{"verification":{"id":1,"status":"PENDING","submitted_at":"2026-10-10T10:00:00.000Z"}}
```

L’API ne retourne ni URL publique ni chemin ni clé de document. Erreurs : 400 envoi incorrect, 401 connexion nécessaire, 403 compte non PLAYER, 409 profil absent ou licence déjà en attente, 408 délai dépassé, 413 fichier trop gros, 415 mauvais format, 503 stockage absent/occupé/indisponibilité.

## Transactions, pannes et hébergement

Une transaction SQL verrouille le compte pour empêcher deux demandes simultanées. Le fichier est stocké, la ligne est créée puis la transaction est validée. Si l’insertion échoue, le SQL est annulé et le fichier supprimé. Un adaptateur externe doit garantir qu’un `put` échoué ne laisse pas d’objet partiel.

Si la connexion se coupe pendant COMMIT, on ne peut pas savoir immédiatement si Neon a validé. Le fichier est conservé et un incident `LICENSE_COMMIT_UNCERTAIN` est journalisé. Vérifier en privé la présence de sa `document_key` dans `player_verifications` avant toute suppression. Prévoir également un nettoyage des fichiers orphelins après arrêt brutal et des règles de conservation lors de suppressions de comptes. Ne pas publier les journaux contenant les clés.

Le disque local est refusé sur Vercel : il faudra un stockage objet durable privé avec un adaptateur `private: true`, `put({key, buffer, contentType})` et `remove(key)`. Adapter la taille maximale à la plateforme d’hébergement avant le déploiement. Ne jamais placer une licence dans le frontend, Git ou une URL publique.

Les contrôles de format ne constituent pas un antivirus ni une validation complète du contenu PDF/image. Aucun antivirus, téléchargement, consultation administrateur ou processus de décision n’a été ajouté. Prévoir l’analyse du document avant d’autoriser sa consultation.

## Vérifications locales

Les tests utilisent PostgreSQL embarqué PGlite, des fichiers fictifs et un dossier temporaire supprimé en fin de test. Ils ne contactent pas Neon. Le test d’identité est un bouchon réservé aux tests.

```bash
MERCASPORT_TEST_PGLITE=1 node --test backend/licenses/tests/license.test.js
```

Pour cette commande, Express, pg et `@electric-sql/pglite` doivent être disponibles. PGlite est une dépendance de test uniquement ; sur ce poste, elle est installée dans l’environnement de vérification séparé, via NODE_PATH. Les tests couvrent accès refusé, PDF/PNG acceptés, compte CLUB refusé, formats erronés, champs interdits, taille, doublon concurrent, panne de stockage, rollback SQL, stockage hors dépôt et résultat COMMIT incertain. Le format JPEG est contrôlé dans le module mais n’a pas de test d’acceptation de bout en bout dans cette série.

Documentation des bibliothèques : https://github.com/mscdex/busboy ; https://github.com/sindresorhus/file-type . Principes de contrôle : https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html .
