# MercaSport

Plateforme pédagogique de recrutement pour le football amateur : clubs, joueurs et administration.

## Bien commencer

1. Ouvrir le dossier cloné dans VS Code, avec l'extension WSL si le dépôt est dans Ubuntu.
2. Lire [le guide Git](docs/guide-git.md).
3. Trouver sa tâche : [Joel](docs/equipe/joel.md), [Thomas](docs/equipe/thomas.md), [Matteo](docs/equipe/matteo.md).
4. Depuis Bash, lancer `bash scripts/commencer-tache.sh UX-03` en remplaçant l'ID.
5. Lire la fiche dans `docs/taches`, préciser les dépendances et le test avant de coder.

## Structure

```text
.github/        Modèles d'Issue et de Pull Request
frontend/       Base HTML/CSS existante et futurs écrans
backend/        API à développer après choix de la technologie
database/       Modèle SQL, schema.sql et seed.sql à compléter
docs/           Organisation, contrats, wireframes et 117 fiches de tâches
scripts/        Aide pour démarrer une tâche et actualiser sa branche
tests/          Scénarios manuels et résultats à compléter
```

## État réel

La structure est préparée ; les fonctionnalités restent à développer et tester.
La base HTML/CSS de l'ancienne branche `front-end` est conservée dans `frontend/`.
Elle contient encore des exemples statiques et des liens à implémenter.
Le backend, la base SQL et l'authentification ne sont pas implémentés par cette préparation.
Les choix de langages, framework, base SQL et commandes de lancement sont à convenir à trois.

## Flux MVP

Club → annonce pending → validation admin → annonce publique → candidature joueur → consultation par le club.
Les données dynamiques doivent passer par l'API et être persistées en SQL.

## Organisation

`main` contient la base commune ; chaque tâche possède sa propre branche.
Les branches préparées doivent récupérer le dernier `origin/main` au moment de commencer.
Une petite PR par tâche, avec un reviewer et le [Learning Check](docs/definition-of-done.md).
La présence d'une branche ou d'un fichier ne signifie pas que la tâche est réalisée.

Source : plan Scrum pédagogique v2 et bootstrap MercaSport fournis par l'équipe.
