# MercaSport

Le mercato du football amateur. Organisation basée sur **MercaSport_Plan_Simple_Essentiel.pdf**, du 06 au 19 octobre 2026.

## Les quatre branches

| Branche | Responsable | Travail |
|---|---|---|
| `main` | Équipe, intégration avec Joel | Version commune |
| `front` | Thomas | HTML, CSS, JavaScript et appels API |
| `back` | Matteo | Node.js, Express, pg et API |
| `sql` | Joel | PostgreSQL, SQL, Git et README |

Chacun travaille sur sa branche et publie ses commits ; Joel aide à fusionner une partie qui fonctionne dans `main`.
Les anciennes tâches GOV/UX et les 117 branches ne font plus partie du plan courant.
L'historique précédent reste conservé dans Git.

## Se placer sur sa branche

À la racine du dépôt, après avoir enregistré le travail en cours :

```bash
git fetch --prune origin
git switch sql
git pull --ff-only
```

Thomas remplace `sql` par `front` ; Matteo la remplace par `back`.
Si la branche n'existe pas encore sur leur poste : `git switch --track origin/front` ou `git switch --track origin/back`.

Pour enregistrer et publier :

```bash
git status
git add chemin/du/fichier
git commit -m "SQL-02 Décrire le changement"
git push
```

## Fusionner une partie qui fonctionne

Exemple pour le front, à réaliser par Joel après échange avec Thomas et vérification du travail :

```bash
git fetch origin
git switch main
git pull --ff-only
git merge origin/front
```

Vérifier le fonctionnement du projet et résoudre tout conflit avant `git push`.
Pour récupérer la version commune dans sa branche :

```bash
git switch sql
git merge main
git push
```

Sur un autre poste, faire `git fetch origin`, puis `git merge origin/main` depuis sa branche propre.

## Structure

```text
frontend/
  index.html
  login.html
  register.html
  admin.html
  css/style.css
  js/app.mjs
backend/
  server.mjs
  db.mjs
  routes/
database/
  schema.sql
  seed.sql
README.md
.gitignore
```

La page `index.html` existante est conservée et son chemin CSS est actualisé.
Les autres pages et fichiers sont des points de départ à compléter, sans fonctionnalités implémentées.
Les annonces affichées actuellement sont des exemples statiques ; elles devront venir de l'API.

## Stack du plan

- Thomas : HTML, CSS et JavaScript navigateur (`.mjs`).
- Matteo : Node.js, Express et `pg`.
- Joel : PostgreSQL et SQL.

## Installation et lancement

**État actuel :** le front statique peut être ouvert ; le serveur et le schéma SQL restent à écrire.

Pour consulter la base front, ouvrir `frontend/index.html` dans un navigateur.
Quand les appels `fetch()` seront ajoutés, Thomas documentera le lancement via un serveur HTTP local.

Matteo initialise le backend lors de BACK-01/BACK-02 :

```bash
cd backend
npm init -y
npm install express pg
```

Après implémentation du serveur, la commande de lancement prévue est `node server.mjs` depuis `backend/`.
Le port, les variables d'environnement et l'URL de l'API sont à documenter par Matteo une fois définis.

Joel installe PostgreSQL et crée la base `mercasport` lors de SQL-01, puis documente la méthode utilisée sur les postes de l'équipe.
Après configuration de l'accès PostgreSQL et écriture des fichiers SQL, depuis la racine :

```bash
psql -d mercasport -f database/schema.sql
psql -d mercasport -f database/seed.sql
```

Ces commandes utilisent les paramètres locaux de connexion PostgreSQL ; les fichiers actuels contiennent seulement des indications.

## Les 17 tâches essentielles

### Joel — branche sql

| ID | Tâche | Terminé quand |
|---|---|---|
| SQL-01 | Installer PostgreSQL et créer mercasport | La base existe et Joel sait s'y connecter |
| SQL-02 | Créer schema.sql | users, clubs, players, ads et applications existent |
| SQL-03 | Ajouter relations et contraintes | Les liens entre les cinq tables sont cohérents |
| SQL-04 | Créer seed.sql | Des comptes, clubs, joueurs et annonces de test peuvent être ajoutés |
| GIT-01 | Maintenir main/front/back/sql | Les trois travaillent sans écraser le travail des autres |
| DOC-01 | Maintenir ce README | Les commandes d'installation et de lancement sont documentées |

### Thomas — branche front

| ID | Tâche | Terminé quand |
|---|---|---|
| FRONT-01 | Page des annonces | La liste affiche club, poste, ville et description courte |
| FRONT-02 | Détail d'une annonce | Voir plus charge le détail sans rechargement complet |
| FRONT-03 | Inscription et connexion | Joueur et club peuvent saisir leurs informations |
| FRONT-04 | Espaces joueur et club | Le joueur voit ses candidatures et le club ses annonces |
| FRONT-05 | Administration simple | L'admin voit les annonces pending et les actions principales |

### Matteo — branche back

| ID | Tâche | Terminé quand |
|---|---|---|
| BACK-01 | Initialiser Node.js et Express | Le serveur démarre et répond |
| BACK-02 | Connecter PostgreSQL | Le back lit les données de la base |
| BACK-03 | API des annonces | Le front liste et consulte les annonces approved |
| BACK-04 | Inscription, connexion et rôles | Joueur, club et admin sont distingués |
| BACK-05 | Annonce et modération | Le club crée une annonce pending, l'admin l'approuve ou la refuse |
| BACK-06 | Candidature joueur | Joueur, annonce, message et date sont enregistrés |

Suivi simple : **À faire / En cours / Terminé**.
La préparation des fichiers ne valide aucune fonctionnalité.

## Ordre de travail

| Dates | Priorité |
|---|---|
| 06–07 octobre | PostgreSQL et schéma ; front statique ; Express et connexion BDD |
| 08–09 octobre | Afficher les annonces SQL via l'API |
| 10–11 octobre | Corriger les blocages |
| 12–13 octobre | Comptes et rôles |
| 14–15 octobre | Création d'annonce et modération |
| 16 octobre | Candidature |
| 17–18 octobre | Assemblage, corrections, README et design minimum |
| 19 octobre | Vérification finale et livraison |

## Vérification finale

- [ ] Le projet se lance en local.
- [ ] PostgreSQL contient des données de démonstration.
- [ ] Seules les annonces approved sont publiques.
- [ ] Voir plus affiche le détail.
- [ ] Un joueur peut créer un compte et se connecter.
- [ ] Un club peut créer un compte et se connecter.
- [ ] Une annonce créée par un club arrive en pending.
- [ ] L'admin peut approuver ou refuser une annonce.
- [ ] Une annonce approved devient publique.
- [ ] Un joueur peut postuler.
- [ ] La candidature est enregistrée en base.
- [ ] L'admin accède à une gestion simple.
- [ ] Le README explique comment lancer le projet.
- [ ] Chacun sait expliquer sa partie principale.

Pas de messagerie, favoris, IA, statistiques, carte, notifications ou design avancé dans ce périmètre.
