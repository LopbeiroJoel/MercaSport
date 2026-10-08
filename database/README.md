# PostgreSQL : clubs, equipes, annonces et candidatures

Modele principal : **clubs -> teams -> ads -> applications**.
Un club a plusieurs equipes ; chaque equipe joue dans une division et peut avoir plusieurs annonces.
Les annonces n'ont aucun statut ni etape de moderation : elles sont toutes consultables.

## Fichiers

| Fichier | Utilite |
|---|---|
| `schema.sql` | Tables, migration de l'existant, contraintes et relations |
| `seed.sql` | 13 clubs, 28 equipes, 28 annonces et 3 candidatures de demonstration |
| `verification.sql` | SELECT a executer dans PostgreSQL/pgAdmin |
| `queries.sql` | Liste, detail et ecritures SQL avec parametres `$1`, `$2`... |
| `tests/run.py` | Tests PostgreSQL temporaires, sans modifier mercasport |
| `tests/workflow.sql` | Contraintes et cascades, avec ROLLBACK |
| `tests/legacy.sql` | Ancienne base, seulement pour les tests de migration |

## Execution

Dans le terminal Ubuntu, depuis la racine du projet :

```bash
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -d mercasport < database/schema.sql
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -d mercasport < database/seed.sql
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -d mercasport < database/verification.sql
```

La base doit deja exister. Dans pgAdmin, executer le contenu de schema.sql puis seed.sql,
dans l'outil de requete de la base mercasport.
En cas d'erreur, faire ROLLBACK avant de recommencer.
Ne pas lancer queries.sql en bloc : ses requetes parametrees se lancent individuellement.

## Donnees de demonstration

- 13 clubs et 28 equipes Senior, une par division indiquee.
- 28 annonces sans statut, une par equipe.
- 10 postes differents, avec des qualites coherentes ; preferred_foot reste facultatif.
- 3 candidatures : Joel Lopes Ribeiro, Thomas Lapin et Matteo GrosBras.
- Les comptes/profils des joueurs et clubs restent conserves.

Les annonces sont fictives. NAT3 est normalise en N3 ; la liste donne 28 equipes.
requirements est un TEXT, sans table supplementaire de qualites.

## Migration et conservation

Aucune table ni annonce supprimee ; les anciens champs status des clubs et annonces
sont retires, ainsi que l'ancienne vue de moderation approved_ads.
La vue ads_details contient toutes les annonces avec leur club et equipe.
Les anciens comptes, hashes, IDs et candidatures restent conserves.

Les anciens champs clubs.user_id/divisions, ads.club_id/city et applications.player_id
sont conserves pour la transition. teams est la reference des divisions et team_id
est obligatoire pour une nouvelle annonce. Le club_id/city historique est rempli automatiquement.
Les candidatures utilisent name/email/phone/message ; player_id est facultatif.
Un meme email (casse/espaces ignores) ne peut candidater deux fois a la meme annonce.

Le seed normalise les 13 noms/villes/divisions de demonstration, reutilise les comptes
des clubs existants, et enrichit les quatre anciens exemples en conservant leurs IDs.
Les nouvelles connexions fictives ont le mot de passe public de test MercaSportDemo!2026
stocke seulement sous forme de hash bcrypt ; aucun hash existant n'est remplace.
Les autres donnees existantes restent conservees : leur nombre peut exceder celui du seed.

Pour une ancienne annonce, le schema utilise la division de son titre, une correspondance
explicite pour les quatre anciens exemples, ou l'unique equipe de son club.
Une annonce ambiguë bloque toute la migration sans perte ; ajouter sa division exacte au titre.
Les anciennes lectures filtrees par status doivent utiliser les nouvelles requetes sans filtre.

## Relations

- teams.club_id -> clubs.id ON DELETE CASCADE.
- ads.team_id -> teams.id ON DELETE CASCADE.
- applications.ad_id -> ads.id ON DELETE CASCADE.

Les coordonnees des candidatures sont privees ; les SELECT des annonces ne les exposent pas.
Aucun fichier frontend ou backend n'est modifie.

## Tests

```bash
python3 database/tests/run.py
```

Necessite PostgreSQL serveur, pg_config et Python 3.
Le test utilise un cluster temporaire dans un dossier prive avec socket local uniquement.
Il verifie creation, quantites, reexecution, absence de status, contraintes, cascades,
coherence des profils, requetes et migration sans perte, puis nettoie ses bases temporaires.
