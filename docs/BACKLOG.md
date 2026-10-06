# Backlog MercaSport

117 fiches préparées : [Joel](equipe/joel.md), [Thomas](equipe/thomas.md), [Matteo](equipe/matteo.md).

Source : MercaSport_Plan_Scrum_Pedagogique_v2 (1).pdf, pages 8 à 20.

Les priorités et affectations sont reprises du document, sans déclarer les tâches terminées.

Attention : ADMIN-09 est « Should » dans le tableau, mais la pagination figure parmi les exigences obligatoires générales ; à clarifier en équipe.

| ID | Tâche | Responsable | Reviewer | Sprint | Priorité | Branche |
|---|---|---|---|---|---|---|
| [GOV-01](taches/GOV-01.md) | Créer le dépôt GitHub MercaSport et vérifier les accès des 3 membres | Joel | Matteo | S1 | Must | `docs/GOV-01-depot-acces` |
| [GOV-02](taches/GOV-02.md) | Définir la convention de branches : une tâche = une branche = une petite PR | Thomas | Joel | S1 | Must | `docs/GOV-02-convention-branches` |
| [GOV-03](taches/GOV-03.md) | Définir la règle de Pull Request et de revue avant main | Matteo | Thomas | S1 | Must | `docs/GOV-03-regles-pr` |
| [GOV-04](taches/GOV-04.md) | Créer le tableau Scrum GitHub Projects | Thomas | Joel | S1 | Must | `docs/GOV-04-tableau-scrum` |
| [GOV-05](taches/GOV-05.md) | Créer les labels GitHub communs | Matteo | Thomas | S1 | Should | `docs/GOV-05-labels` |
| [GOV-06](taches/GOV-06.md) | Créer le modèle d’Issue MercaSport | Joel | Matteo | S1 | Must | `docs/GOV-06-modele-issue` |
| [GOV-07](taches/GOV-07.md) | Définir la Definition of Ready | Matteo | Thomas | S1 | Must | `docs/GOV-07-definition-of-ready` |
| [GOV-08](taches/GOV-08.md) | Définir la Definition of Done | Joel | Matteo | S1 | Must | `docs/GOV-08-definition-of-done` |
| [GOV-09](taches/GOV-09.md) | Planifier Daily, mises en commun, Reviews et Rétros des 4 sprints | Thomas | Joel | S1 | Must | `docs/GOV-09-rendez-vous` |
| [UX-01](taches/UX-01.md) | Dessiner le parcours visiteur -> liste des annonces | Thomas | Joel | S1 | Must | `docs/UX-01-parcours-visiteur` |
| [UX-02](taches/UX-02.md) | Faire le wireframe de la page liste des annonces | Thomas | Joel | S1 | Must | `docs/UX-02-wireframe-liste` |
| [UX-03](taches/UX-03.md) | Lister les données nécessaires sur une carte d’annonce | Joel | Matteo | S1 | Must | `docs/UX-03-donnees-carte-annonce` |
| [UX-04](taches/UX-04.md) | Faire le wireframe connexion / inscription | Matteo | Thomas | S1 | Must | `docs/UX-04-wireframe-auth` |
| [UX-05](taches/UX-05.md) | Faire le wireframe du dashboard club | Joel | Matteo | S3 | Must | `docs/UX-05-wireframe-club` |
| [UX-06](taches/UX-06.md) | Faire le wireframe du détail d’annonce sans popup | Thomas | Joel | S1 | Must | `docs/UX-06-wireframe-detail` |
| [UX-07](taches/UX-07.md) | Faire le wireframe du dashboard joueur | Matteo | Thomas | S3 | Must | `docs/UX-07-wireframe-joueur` |
| [UX-08](taches/UX-08.md) | Faire le wireframe de l’administration | Joel | Matteo | S1 | Must | `docs/UX-08-wireframe-admin` |
| [UX-09](taches/UX-09.md) | Définir mini charte graphique MercaSport | Matteo | Thomas | S4 | Should | `docs/UX-09-charte-graphique` |
| [DB-01](taches/DB-01.md) | Comparer rapidement 2 ou 3 bases SQL et choisir la plus simple pour l’équipe | Joel | Matteo | S1 | Must | `docs/DB-01-choix-sql` |
| [DB-02](taches/DB-02.md) | Dessiner le MCD/ERD des tables principales | Joel | Matteo | S1 | Must | `docs/DB-02-modele-relationnel` |
| [DB-03](taches/DB-03.md) | Définir les contraintes et clés étrangères | Matteo | Thomas | S1 | Must | `feature/DB-03-contraintes` |
| [DB-04](taches/DB-04.md) | Créer la table users | Thomas | Joel | S1 | Must | `feature/DB-04-users` |
| [DB-05](taches/DB-05.md) | Créer les tables clubs et player_profiles | Joel | Matteo | S1 | Must | `feature/DB-05-profils` |
| [DB-06](taches/DB-06.md) | Créer la table positions / catégories | Matteo | Thomas | S1 | Must | `feature/DB-06-positions` |
| [DB-07](taches/DB-07.md) | Créer la table ads avec workflow de modération | Thomas | Joel | S1 | Must | `feature/DB-07-annonces` |
| [DB-08](taches/DB-08.md) | Créer la table applications | Matteo | Thomas | S1 | Must | `feature/DB-08-candidatures` |
| [DB-09](taches/DB-09.md) | Créer schema.sql et seed.sql versionnés | Thomas | Joel | S1 | Must | `feature/DB-09-schema-seed` |
| [AUTH-01](taches/AUTH-01.md) | Définir le contrat des endpoints d’authentification | Matteo | Thomas | S2 | Must | `docs/AUTH-01-contrat-api` |
| [AUTH-02](taches/AUTH-02.md) | Implémenter inscription joueur côté back | Matteo | Thomas | S2 | Must | `feature/AUTH-02-inscription-joueur` |
| [AUTH-03](taches/AUTH-03.md) | Préparer les champs d’inscription et contraintes côté base | Joel | Matteo | S2 | Must | `feature/AUTH-03-contraintes-comptes` |
| [AUTH-04](taches/AUTH-04.md) | Créer le formulaire inscription joueur côté front | Thomas | Joel | S2 | Must | `feature/AUTH-04-formulaire-inscription` |
| [AUTH-05](taches/AUTH-05.md) | Implémenter inscription club / entraîneur côté back | Matteo | Thomas | S2 | Must | `feature/AUTH-05-inscription-club` |
| [AUTH-06](taches/AUTH-06.md) | Créer un compte admin de seed sécurisé pour la démo | Joel | Matteo | S2 | Must | `feature/AUTH-06-admin-demo` |
| [AUTH-07](taches/AUTH-07.md) | Créer le formulaire de connexion côté front | Thomas | Joel | S2 | Must | `feature/AUTH-07-formulaire-connexion` |
| [AUTH-08](taches/AUTH-08.md) | Implémenter connexion, déconnexion et session/token | Joel | Matteo | S2 | Must | `feature/AUTH-08-session` |
| [AUTH-09](taches/AUTH-09.md) | Ajouter garde de rôle joueur/club/admin | Thomas | Joel | S3 | Must | `feature/AUTH-09-garde-roles` |
| [ADS-01](taches/ADS-01.md) | Créer le squelette de la page annonces | Thomas | Joel | S2 | Must | `feature/ADS-01-page-annonces` |
| [ADS-02](taches/ADS-02.md) | Construire le composant/carte d’annonce | Thomas | Joel | S2 | Must | `feature/ADS-02-carte-annonce` |
| [ADS-03](taches/ADS-03.md) | Définir la requête SQL des annonces approuvées | Joel | Matteo | S2 | Must | `feature/ADS-03-requete-approved` |
| [ADS-04](taches/ADS-04.md) | Créer l’endpoint de liste des annonces publiques | Matteo | Thomas | S2 | Must | `feature/ADS-04-liste-publique` |
| [ADS-05](taches/ADS-05.md) | Récupérer et afficher les annonces au chargement | Thomas | Joel | S2 | Must | `feature/ADS-05-affichage-liste` |
| [ADS-06](taches/ADS-06.md) | Créer l’endpoint de détail d’une annonce | Joel | Matteo | S2 | Must | `feature/ADS-06-detail-annonce` |
| [ADS-07](taches/ADS-07.md) | Gérer le bouton Voir les détails sans popup | Matteo | Thomas | S2 | Must | `feature/ADS-07-detail-dynamique` |
| [ADS-08](taches/ADS-08.md) | Ajouter états chargement / vide / erreur | Joel | Matteo | S4 | Should | `feature/ADS-08-etats-interface` |
| [ADS-09](taches/ADS-09.md) | Ajouter filtre simple par poste | Matteo | Thomas | S4 | Should | `feature/ADS-09-filtre-poste` |
| [CLUB-01](taches/CLUB-01.md) | Créer le dashboard club de base | Thomas | Joel | S2 | Must | `feature/CLUB-01-dashboard` |
| [CLUB-02](taches/CLUB-02.md) | Créer le formulaire de nouvelle annonce | Thomas | Joel | S2 | Must | `feature/CLUB-02-formulaire-annonce` |
| [CLUB-03](taches/CLUB-03.md) | Implémenter création d’annonce en status pending | Matteo | Thomas | S2 | Must | `feature/CLUB-03-creation-pending` |
| [CLUB-04](taches/CLUB-04.md) | Vérifier côté base que le statut initial ne peut pas être approuvé par le club | Joel | Matteo | S2 | Must | `feature/CLUB-04-statut-initial` |
| [CLUB-05](taches/CLUB-05.md) | Créer la liste Mes annonces du club | Joel | Matteo | S3 | Must | `feature/CLUB-05-mes-annonces` |
| [CLUB-06](taches/CLUB-06.md) | Créer endpoint Mes annonces | Matteo | Thomas | S3 | Must | `feature/CLUB-06-endpoint-mes-annonces` |
| [CLUB-07](taches/CLUB-07.md) | Permettre la modification d’une annonce du club | Thomas | Joel | S3 | Must | `feature/CLUB-07-modification-annonce` |
| [CLUB-08](taches/CLUB-08.md) | Permettre la suppression d’une annonce du club | Joel | Matteo | S3 | Must | `feature/CLUB-08-suppression-annonce` |
| [CLUB-09](taches/CLUB-09.md) | Afficher le motif de rejet admin au club | Matteo | Thomas | S3 | Must | `feature/CLUB-09-motif-rejet` |
| [PLAYER-01](taches/PLAYER-01.md) | Créer le dashboard joueur de base | Thomas | Joel | S3 | Must | `feature/PLAYER-01-dashboard` |
| [PLAYER-02](taches/PLAYER-02.md) | Créer le formulaire de profil joueur minimal | Thomas | Joel | S3 | Must | `feature/PLAYER-02-formulaire-profil` |
| [PLAYER-03](taches/PLAYER-03.md) | Créer/mettre à jour player_profile côté API | Matteo | Thomas | S2 | Must | `feature/PLAYER-03-api-profil` |
| [PLAYER-04](taches/PLAYER-04.md) | Vérifier contraintes profil joueur en SQL | Joel | Matteo | S2 | Must | `feature/PLAYER-04-contraintes-profil` |
| [PLAYER-05](taches/PLAYER-05.md) | Préremplir les données du joueur lors d’une candidature | Joel | Matteo | S3 | Must | `feature/PLAYER-05-pre-remplissage` |
| [PLAYER-06](taches/PLAYER-06.md) | Créer endpoint de lecture du profil connecté | Matteo | Thomas | S3 | Must | `feature/PLAYER-06-lecture-profil` |
| [PLAYER-07](taches/PLAYER-07.md) | Créer la page Mes candidatures | Thomas | Joel | S3 | Must | `feature/PLAYER-07-mes-candidatures` |
| [PLAYER-08](taches/PLAYER-08.md) | Créer requête SQL pour les candidatures du joueur | Joel | Matteo | S3 | Must | `feature/PLAYER-08-requete-candidatures` |
| [PLAYER-09](taches/PLAYER-09.md) | Créer endpoint Mes candidatures | Matteo | Thomas | S3 | Must | `feature/PLAYER-09-endpoint-candidatures` |
| [APP-01](taches/APP-01.md) | Définir les règles métier d’une candidature | Joel | Matteo | S2 | Must | `docs/APP-01-regles-candidature` |
| [APP-02](taches/APP-02.md) | Créer le formulaire Postuler | Thomas | Joel | S3 | Must | `feature/APP-02-formulaire-postuler` |
| [APP-03](taches/APP-03.md) | Implémenter POST candidature | Matteo | Thomas | S2 | Must | `feature/APP-03-creation-candidature` |
| [APP-04](taches/APP-04.md) | Empêcher candidature sur annonce non approuvée | Matteo | Thomas | S2 | Must | `feature/APP-04-annonce-approved` |
| [APP-05](taches/APP-05.md) | Empêcher doublon de candidature du même joueur | Joel | Matteo | S3 | Must | `feature/APP-05-anti-doublon` |
| [APP-06](taches/APP-06.md) | Afficher confirmation après candidature | Thomas | Joel | S3 | Must | `feature/APP-06-confirmation` |
| [APP-07](taches/APP-07.md) | Créer vue club des candidatures reçues | Thomas | Joel | S3 | Must | `feature/APP-07-vue-club` |
| [APP-08](taches/APP-08.md) | Créer requête jointe candidats + annonce + message | Joel | Matteo | S3 | Must | `feature/APP-08-requete-candidats` |
| [APP-09](taches/APP-09.md) | Créer endpoint candidatures reçues pour le club | Matteo | Thomas | S3 | Must | `feature/APP-09-endpoint-club` |
| [ADMIN-01](taches/ADMIN-01.md) | Créer la page administration protégée | Thomas | Joel | S3 | Must | `feature/ADMIN-01-page-protegee` |
| [ADMIN-02](taches/ADMIN-02.md) | Créer la liste des annonces pending | Thomas | Joel | S3 | Must | `feature/ADMIN-02-liste-pending` |
| [ADMIN-03](taches/ADMIN-03.md) | Créer requête SQL des annonces à modérer | Joel | Matteo | S2 | Must | `feature/ADMIN-03-requete-pending` |
| [ADMIN-04](taches/ADMIN-04.md) | Créer endpoint admin de modération | Matteo | Thomas | S2 | Must | `feature/ADMIN-04-endpoint-moderation` |
| [ADMIN-05](taches/ADMIN-05.md) | Implémenter action Approuver | Matteo | Thomas | S3 | Must | `feature/ADMIN-05-approbation` |
| [ADMIN-06](taches/ADMIN-06.md) | Implémenter action Rejeter avec motif | Joel | Matteo | S3 | Must | `feature/ADMIN-06-rejet-motif` |
| [ADMIN-07](taches/ADMIN-07.md) | Afficher retour de modération dans l’interface | Thomas | Joel | S3 | Must | `feature/ADMIN-07-retour-moderation` |
| [ADMIN-08](taches/ADMIN-08.md) | Créer CRUD admin minimal sur users/clubs/ads/applicatio ns | Joel | Matteo | S4 | Must | `feature/ADMIN-08-crud` |
| [ADMIN-09](taches/ADMIN-09.md) | Ajouter pagination ou pagination simple des listes admin | Matteo | Thomas | S4 | Should | `feature/ADMIN-09-pagination` |
| [API-01](taches/API-01.md) | Créer une convention de routes REST MercaSport | Matteo | Thomas | S1 | Must | `docs/API-01-conventions-rest` |
| [API-02](taches/API-02.md) | Créer format JSON commun de succès/erreur | Matteo | Thomas | S1 | Must | `docs/API-02-format-json` |
| [API-03](taches/API-03.md) | Lister les codes HTTP attendus par route | Joel | Matteo | S1 | Must | `docs/API-03-codes-http` |
| [API-04](taches/API-04.md) | Créer validation serveur des champs obligatoires | Thomas | Joel | S3 | Must | `feature/API-04-validation-serveur` |
| [API-05](taches/API-05.md) | Créer gestion globale des erreurs back | Matteo | Thomas | S3 | Must | `feature/API-05-erreurs-back` |
| [API-06](taches/API-06.md) | Tester toutes les routes essentielles avec REST client | Joel | Matteo | S2 | Must | `test/API-06-tests-routes` |
| [API-07](taches/API-07.md) | Centraliser l’URL de l’API côté front | Thomas | Joel | S3 | Must | `feature/API-07-url-api` |
| [API-08](taches/API-08.md) | Ajouter gestion 401/403 côté front | Joel | Matteo | S3 | Must | `feature/API-08-gestion-401-403` |
| [API-09](taches/API-09.md) | Faire un test E2E manuel front -> API -> DB | Thomas | Joel | S4 | Must | `test/API-09-test-parcours` |
| [TEST-01](taches/TEST-01.md) | Créer checklist smoke test quotidienne | Thomas | Joel | S1 | Must | `test/TEST-01-smoke-quotidien` |
| [TEST-02](taches/TEST-02.md) | Tester reconstruction complète de la DB sur un autre poste | Joel | Matteo | S1 | Must | `test/TEST-02-reconstruction-db` |
| [TEST-03](taches/TEST-03.md) | Tester démarrage back sur un autre poste | Matteo | Thomas | S2 | Must | `test/TEST-03-demarrage-back` |
| [TEST-04](taches/TEST-04.md) | Tester accès interdit par rôle | Matteo | Thomas | S4 | Must | `test/TEST-04-droits-roles` |
| [TEST-05](taches/TEST-05.md) | Tester mots de passe non stockés en clair | Joel | Matteo | S4 | Must | `test/TEST-05-mots-de-passe` |
| [TEST-06](taches/TEST-06.md) | Tester injections SQL basiques / requêtes paramétrées | Thomas | Joel | S4 | Must | `test/TEST-06-requetes-parametrees` |
| [TEST-07](taches/TEST-07.md) | Tester responsive desktop/tablette/mobile | Thomas | Joel | S4 | Must | `test/TEST-07-responsive` |
| [TEST-08](taches/TEST-08.md) | Tester erreurs réseau et API indisponible | Joel | Matteo | S4 | Should | `test/TEST-08-erreurs-reseau` |
| [TEST-09](taches/TEST-09.md) | Faire une session bug bash à 3 | Matteo | Thomas | S4 | Must | `test/TEST-09-bug-bash` |
| [DOC-01](taches/DOC-01.md) | Créer le README dès le Sprint 1 | Joel | Matteo | S1 | Must | `docs/DOC-01-readme` |
| [DOC-02](taches/DOC-02.md) | Documenter installation de la base | Joel | Matteo | S4 | Must | `docs/DOC-02-installation-db` |
| [DOC-03](taches/DOC-03.md) | Documenter lancement du back | Matteo | Thomas | S4 | Must | `docs/DOC-03-lancement-back` |
| [DOC-04](taches/DOC-04.md) | Documenter lancement du front | Thomas | Joel | S4 | Must | `docs/DOC-04-lancement-front` |
| [DOC-05](taches/DOC-05.md) | Ajouter schéma de base de données au README | Joel | Matteo | S4 | Must | `docs/DOC-05-schema-db` |
| [DOC-06](taches/DOC-06.md) | Ajouter tableau des routes API | Matteo | Thomas | S4 | Must | `docs/DOC-06-routes-api` |
| [DOC-07](taches/DOC-07.md) | Ajouter captures des écrans principaux | Thomas | Joel | S4 | Should | `docs/DOC-07-captures` |
| [DOC-08](taches/DOC-08.md) | Préparer scénario de démonstration de 5-7 minutes | Matteo | Thomas | S4 | Must | `docs/DOC-08-demo` |
| [DOC-09](taches/DOC-09.md) | Préparer répartition de la présentation orale | Thomas | Joel | S4 | Must | `docs/DOC-09-presentation` |
| [REL-01](taches/REL-01.md) | Faire la mise en commun et intégration de fin de Sprint 1 | Thomas | Joel | S1 | Must | `docs/REL-01-integration-s1` |
| [REL-02](taches/REL-02.md) | Tenir la Sprint Review 1 | Joel | Matteo | S1 | Must | `docs/REL-02-review-s1` |
| [REL-03](taches/REL-03.md) | Tenir la Rétrospective 1 | Matteo | Thomas | S1 | Must | `docs/REL-03-retro-s1` |
| [REL-04](taches/REL-04.md) | Créer une version candidate après Sprint 4 | Matteo | Thomas | S4 | Must | `docs/REL-04-version-candidate` |
| [REL-05](taches/REL-05.md) | Geler les nouvelles fonctionnalités après Sprint 4 | Joel | Matteo | S4 | Must | `docs/REL-05-gel-fonctionnalites` |
| [REL-06](taches/REL-06.md) | Faire une régression fonctionnelle complète | Thomas | Joel | S4 | Must | `docs/REL-06-regression` |
| [REL-07](taches/REL-07.md) | Vérifier dépôt propre et secrets absents | Joel | Matteo | S4 | Must | `docs/REL-07-secrets` |
| [REL-08](taches/REL-08.md) | Faire un clone-from-zero sur une machine propre | Matteo | Thomas | S4 | Must | `docs/REL-08-clone-propre` |
| [REL-09](taches/REL-09.md) | Préparer la livraison du 19/10 | Thomas | Joel | S4 | Must | `docs/REL-09-livraison` |
