# API MercaSport

Le front et l’API partagent la même origine : `http://localhost:3000` en local,
le domaine du projet sur Vercel. Les appels navigateur utilisent `/ads` et `/ads/:id`.
Les annonces viennent de PostgreSQL, via `public.ads_details` ; aucun filtre de statut.

## GET /health

Vérifie aussi la connexion PostgreSQL : `200` avec `{ "status": "OK", "timestamp": "..." }`.
Une connexion indisponible renvoie `503`. Aucun mot de passe ni détail SQL dans la réponse.

## GET /ads

`200` : tableau JSON, ordonné par date puis ID décroissants, `[]` si aucune annonce.
Chaque objet contient les mêmes champs que le détail :

```json
{
  "id": 1,
  "club_id": 1,
  "club": "FC Hégenheim",
  "team_id": 1,
  "team": "Équipe R3",
  "division": "R3",
  "title": "Recherche de joueur",
  "short_description": "Résumé de l’annonce",
  "position": "Gardien",
  "preferred_foot": null,
  "requirements": "Qualités recherchées",
  "contract": "À préciser",
  "work_time": "À préciser",
  "salary": "À préciser",
  "location": "Hégenheim",
  "description": "Description complète",
  "missions": "Missions du joueur",
  "created_at": "2026-10-08T10:00:00.000Z"
}
```

Exemple de forme, les titres et IDs réels dépendent de la base.
Les champs facultatifs peuvent être `null`.
Les emails, mots de passe et candidatures ne sont jamais inclus dans cette lecture.

## GET /ads/:id

`200` : un objet de la forme ci-dessus.
`400` : ID invalide ; `404` : ID valide mais annonce absente.
La requête SQL utilise `$1`, pas une concaténation de l’ID fourni.

## POST /applications

Route existante documentée, maintenant reliée à PostgreSQL ; aucun formulaire ajouté au front.
Envoyer `Content-Type: application/json` :

```json
{
  "ad_id": 1,
  "name": "Prénom Nom",
  "email": "joueur@example.invalid",
  "phone": "+33 600 000 000",
  "message": "Je souhaite rejoindre cette équipe."
}
```

`ad_id`, `name` et `email` sont obligatoires ; `phone` et `message` sont facultatifs.
Longueurs maximales : nom 200, email 255, téléphone 30, message 2000.
Aucun `user_id` ou `player_id` à inventer : cette route utilise la candidature sans compte
prévue dans le schéma SQL. Les autres propriétés ne sont pas enregistrées.

- `201` : `{ "id": 4, "created_at": "..." }`, après insertion effective.
- `400` : champs ou JSON invalides.
- `404` : annonce absente.
- `409` : cet email a déjà candidaté à cette annonce (casse/espaces ignorés).
- `413` : corps trop volumineux.
- `415` : format autre que JSON.
- `503` : connexion PostgreSQL indisponible ; `500` : autre erreur serveur.

Les erreurs ont la forme `{ "error": "Message lisible" }`.
La liste des candidatures et leurs coordonnées n’est pas exposée par une route publique.
