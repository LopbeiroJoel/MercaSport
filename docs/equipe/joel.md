# Tâches de Joel

39 tâches issues du plan Scrum, à réaliser selon leurs dépendances.

| ID | Tâche | Responsable | Reviewer | Sprint | Priorité | Branche |
|---|---|---|---|---|---|---|
| [GOV-01](../taches/GOV-01.md) | Créer le dépôt GitHub MercaSport et vérifier les accès des 3 membres | Joel | Matteo | S1 | Must | `docs/GOV-01-depot-acces` |
| [GOV-06](../taches/GOV-06.md) | Créer le modèle d’Issue MercaSport | Joel | Matteo | S1 | Must | `docs/GOV-06-modele-issue` |
| [GOV-08](../taches/GOV-08.md) | Définir la Definition of Done | Joel | Matteo | S1 | Must | `docs/GOV-08-definition-of-done` |
| [UX-03](../taches/UX-03.md) | Lister les données nécessaires sur une carte d’annonce | Joel | Matteo | S1 | Must | `docs/UX-03-donnees-carte-annonce` |
| [UX-05](../taches/UX-05.md) | Faire le wireframe du dashboard club | Joel | Matteo | S3 | Must | `docs/UX-05-wireframe-club` |
| [UX-08](../taches/UX-08.md) | Faire le wireframe de l’administration | Joel | Matteo | S1 | Must | `docs/UX-08-wireframe-admin` |
| [DB-01](../taches/DB-01.md) | Comparer rapidement 2 ou 3 bases SQL et choisir la plus simple pour l’équipe | Joel | Matteo | S1 | Must | `docs/DB-01-choix-sql` |
| [DB-02](../taches/DB-02.md) | Dessiner le MCD/ERD des tables principales | Joel | Matteo | S1 | Must | `docs/DB-02-modele-relationnel` |
| [DB-05](../taches/DB-05.md) | Créer les tables clubs et player_profiles | Joel | Matteo | S1 | Must | `feature/DB-05-profils` |
| [AUTH-03](../taches/AUTH-03.md) | Préparer les champs d’inscription et contraintes côté base | Joel | Matteo | S2 | Must | `feature/AUTH-03-contraintes-comptes` |
| [AUTH-06](../taches/AUTH-06.md) | Créer un compte admin de seed sécurisé pour la démo | Joel | Matteo | S2 | Must | `feature/AUTH-06-admin-demo` |
| [AUTH-08](../taches/AUTH-08.md) | Implémenter connexion, déconnexion et session/token | Joel | Matteo | S2 | Must | `feature/AUTH-08-session` |
| [ADS-03](../taches/ADS-03.md) | Définir la requête SQL des annonces approuvées | Joel | Matteo | S2 | Must | `feature/ADS-03-requete-approved` |
| [ADS-06](../taches/ADS-06.md) | Créer l’endpoint de détail d’une annonce | Joel | Matteo | S2 | Must | `feature/ADS-06-detail-annonce` |
| [ADS-08](../taches/ADS-08.md) | Ajouter états chargement / vide / erreur | Joel | Matteo | S4 | Should | `feature/ADS-08-etats-interface` |
| [CLUB-04](../taches/CLUB-04.md) | Vérifier côté base que le statut initial ne peut pas être approuvé par le club | Joel | Matteo | S2 | Must | `feature/CLUB-04-statut-initial` |
| [CLUB-05](../taches/CLUB-05.md) | Créer la liste Mes annonces du club | Joel | Matteo | S3 | Must | `feature/CLUB-05-mes-annonces` |
| [CLUB-08](../taches/CLUB-08.md) | Permettre la suppression d’une annonce du club | Joel | Matteo | S3 | Must | `feature/CLUB-08-suppression-annonce` |
| [PLAYER-04](../taches/PLAYER-04.md) | Vérifier contraintes profil joueur en SQL | Joel | Matteo | S2 | Must | `feature/PLAYER-04-contraintes-profil` |
| [PLAYER-05](../taches/PLAYER-05.md) | Préremplir les données du joueur lors d’une candidature | Joel | Matteo | S3 | Must | `feature/PLAYER-05-pre-remplissage` |
| [PLAYER-08](../taches/PLAYER-08.md) | Créer requête SQL pour les candidatures du joueur | Joel | Matteo | S3 | Must | `feature/PLAYER-08-requete-candidatures` |
| [APP-01](../taches/APP-01.md) | Définir les règles métier d’une candidature | Joel | Matteo | S2 | Must | `docs/APP-01-regles-candidature` |
| [APP-05](../taches/APP-05.md) | Empêcher doublon de candidature du même joueur | Joel | Matteo | S3 | Must | `feature/APP-05-anti-doublon` |
| [APP-08](../taches/APP-08.md) | Créer requête jointe candidats + annonce + message | Joel | Matteo | S3 | Must | `feature/APP-08-requete-candidats` |
| [ADMIN-03](../taches/ADMIN-03.md) | Créer requête SQL des annonces à modérer | Joel | Matteo | S2 | Must | `feature/ADMIN-03-requete-pending` |
| [ADMIN-06](../taches/ADMIN-06.md) | Implémenter action Rejeter avec motif | Joel | Matteo | S3 | Must | `feature/ADMIN-06-rejet-motif` |
| [ADMIN-08](../taches/ADMIN-08.md) | Créer CRUD admin minimal sur users/clubs/ads/applicatio ns | Joel | Matteo | S4 | Must | `feature/ADMIN-08-crud` |
| [API-03](../taches/API-03.md) | Lister les codes HTTP attendus par route | Joel | Matteo | S1 | Must | `docs/API-03-codes-http` |
| [API-06](../taches/API-06.md) | Tester toutes les routes essentielles avec REST client | Joel | Matteo | S2 | Must | `test/API-06-tests-routes` |
| [API-08](../taches/API-08.md) | Ajouter gestion 401/403 côté front | Joel | Matteo | S3 | Must | `feature/API-08-gestion-401-403` |
| [TEST-02](../taches/TEST-02.md) | Tester reconstruction complète de la DB sur un autre poste | Joel | Matteo | S1 | Must | `test/TEST-02-reconstruction-db` |
| [TEST-05](../taches/TEST-05.md) | Tester mots de passe non stockés en clair | Joel | Matteo | S4 | Must | `test/TEST-05-mots-de-passe` |
| [TEST-08](../taches/TEST-08.md) | Tester erreurs réseau et API indisponible | Joel | Matteo | S4 | Should | `test/TEST-08-erreurs-reseau` |
| [DOC-01](../taches/DOC-01.md) | Créer le README dès le Sprint 1 | Joel | Matteo | S1 | Must | `docs/DOC-01-readme` |
| [DOC-02](../taches/DOC-02.md) | Documenter installation de la base | Joel | Matteo | S4 | Must | `docs/DOC-02-installation-db` |
| [DOC-05](../taches/DOC-05.md) | Ajouter schéma de base de données au README | Joel | Matteo | S4 | Must | `docs/DOC-05-schema-db` |
| [REL-02](../taches/REL-02.md) | Tenir la Sprint Review 1 | Joel | Matteo | S1 | Must | `docs/REL-02-review-s1` |
| [REL-05](../taches/REL-05.md) | Geler les nouvelles fonctionnalités après Sprint 4 | Joel | Matteo | S4 | Must | `docs/REL-05-gel-fonctionnalites` |
| [REL-07](../taches/REL-07.md) | Vérifier dépôt propre et secrets absents | Joel | Matteo | S4 | Must | `docs/REL-07-secrets` |
