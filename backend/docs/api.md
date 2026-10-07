# API MercaSport

## GET /ads

Objectif :
récupérer les données du serveur via l'url et la méthode GET afin de pouvoir afficher les annonces

Réponse :
- id
- titre
- description courte
- club
- poste

Codes HTTP :
- 200 : OK


## GET /ads/:id

Objectif :
Récupérer les infos d'une annonce en particulier pour en afficher les détails grace l'id lorsqu'on clique sur "voir plus"

Réponse :
- id
- titre
- club
- poste
- contrat
- temps de travail
- rémunération
- lieu
- description
- missions

Codes HTTP :
- 200 : Ok
- 404 : Not found (si les infos sont inexistantes)
- 500 : le problème vient du serveur ou d’un service dont il dépend, comme PostgreSQL


## POST /applications

Objectif :
le client envoie des données pour créer quelque chose

Entrée :
- ad_id
- name
- email
- phone
- message

Codes HTTP :
- 201 : candidature créée
- 400 : données manquantes / invalides
- 404 : annonce inexistante
- 500 : erreur serveur / base de données