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
  queries.sql
  README.md
  tests/
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

La partie PostgreSQL de Joel contient les cinq tables, les validations, les
donnees de demonstration et les modeles de requetes pour le backend.
Les commandes et les comptes de test sont detailles dans [database/README.md](database/README.md).
La preparation des fichiers ne modifie pas automatiquement la base locale.

Pour une **nouvelle base de demonstration**, depuis la racine dans Ubuntu :

```bash
sudo -u postgres createdb mercasport_demo
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -d mercasport_demo < database/schema.sql
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -d mercasport_demo < database/seed.sql
```

Pour la base existante `mercasport`, suivre la section de sauvegarde et de mise
a niveau de [database/README.md](database/README.md) pour conserver les comptes et clubs.
Les anciens clubs passent en validation `pending` si la colonne status n'existait pas.

Test SQL isole, sans toucher a mercasport :

```bash
python3 database/tests/run.py
```

La demonstration contient Joel Lopes Ribeiro, Thomas Lapin et Matteo GrosBras
comme joueurs, ainsi que les clubs et un compte admin.
Le mot de passe public de demonstration ne doit jamais servir sur un site public.

Le frontend reste la partie de Thomas : ouvrir `frontend/index.html` pour la
version statique ; Thomas documentera son serveur HTTP pour les appels fetch.
Matteo garde Node.js/Express, la connexion pg et les controles de role.
Il peut utiliser [database/queries.sql](database/queries.sql) comme reference de requetes parametrees.
La commande du serveur, son port et son `.env` seront documentes avec son implementation.

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
