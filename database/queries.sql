-- REFERENCE POUR MATTEO : executer chaque requete separement avec pg.
-- Les $1, $2... sont des parametres pg, jamais des concatenations de texte.
-- L'identifiant du compte connecte vient de la session/JWT verifie,
-- jamais d'un user_id envoye librement par le navigateur.
-- NE PAS lancer ce fichier entier avec psql : ce sont des modeles d'API.

-- GET /api/ads : $1 recherche (chaine vide pour tout), $2 limite, $3 offset.
SELECT * FROM public.approved_ads
WHERE concat_ws(' ', title, position, city, club_name) ILIKE '%' || $1 || '%'
ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3;

-- GET /api/ads/:id : $1 ID annonce. Aucune ligne = 404.
SELECT * FROM public.approved_ads WHERE id = $1;

-- Connexion : $1 email normalise (trim + minuscules lors de l'inscription).
-- Comparer le hash avec bcrypt cote serveur, ne jamais le renvoyer au front.
SELECT id, name, email, password_hash, role
FROM public.users WHERE email = $1;

-- Inscription : transaction BEGIN / COMMIT geree avec UN MEME client pg.
-- $1 nom affiche, $2 email normalise, $3 hash bcrypt, $4 player OU club.
-- Refuser admin pour l'inscription publique ; ne jamais prendre le hash du front.
INSERT INTO public.users (name, email, password_hash, role)
SELECT $1, $2, $3, $4::varchar(10)
WHERE $4::varchar(10) IN ('player', 'club') RETURNING id, name, role;

-- Profil joueur dans la meme transaction : $1 ID retourne, $2 prenom, $3 nom.
INSERT INTO public.players (user_id, first_name, last_name)
SELECT id, $2, $3 FROM public.users WHERE id = $1 AND role = 'player'
RETURNING *;

-- Profil club dans la meme transaction : $1 ID retourne, $2 nom,
-- $3 ville, $4 divisions (facultatif). Statut pending impose par defaut.
INSERT INTO public.clubs (user_id, name, city, divisions)
SELECT id, $2, $3, $4 FROM public.users WHERE id = $1 AND role = 'club'
RETURNING *;

-- Espace joueur : $1 ID du compte authentifie.
SELECT p.id, p.first_name, p.last_name, u.name
FROM public.players p JOIN public.users u ON u.id = p.user_id
WHERE u.id = $1 AND u.role = 'player';

-- Espace club : $1 ID du compte authentifie.
SELECT c.* FROM public.clubs c JOIN public.users u ON u.id = c.user_id
WHERE u.id = $1 AND u.role = 'club';

-- POST /api/club/ads : $1 compte connecte, $2 titre, $3 poste,
-- $4 ville, $5 description. Aucune ligne = club non autorise (403).
-- Le navigateur ne choisit ni le club_id ni le statut.
INSERT INTO public.ads (club_id, title, position, city, description)
SELECT c.id, $2, $3, $4, $5
FROM public.clubs c JOIN public.users u ON u.id = c.user_id
WHERE u.id = $1 AND u.role = 'club' AND c.status = 'approved'
RETURNING *;

-- GET /api/club/ads : $1 compte connecte ; tous ses statuts.
SELECT a.* FROM public.ads a JOIN public.clubs c ON c.id = a.club_id
JOIN public.users u ON u.id = c.user_id
WHERE u.id = $1 AND u.role = 'club' ORDER BY a.created_at DESC, a.id DESC;

-- POST /api/ads/:id/apply : $1 compte joueur connecte, $2 annonce,
-- $3 message (chaine vide si absent). SQLSTATE 23505 = deja candidate (409).
INSERT INTO public.applications (player_id, ad_id, message)
SELECT p.id, a.id, $3
FROM public.players p JOIN public.users u ON u.id = p.user_id
CROSS JOIN public.approved_ads a
WHERE u.id = $1 AND u.role = 'player' AND a.id = $2
RETURNING *;

-- GET /api/player/applications : $1 compte connecte.
-- L'historique reste visible pour son auteur si l'annonce est ensuite retiree.
SELECT ap.id, ap.message, ap.created_at, a.id AS ad_id, a.title,
       a.status AS ad_status, c.name AS club_name
FROM public.applications ap JOIN public.players p ON p.id = ap.player_id
JOIN public.users u ON u.id = p.user_id
JOIN public.ads a ON a.id = ap.ad_id JOIN public.clubs c ON c.id = a.club_id
WHERE u.id = $1 AND u.role = 'player' ORDER BY ap.created_at DESC, ap.id DESC;

-- GET /api/admin/clubs : $1 compte admin connecte.
SELECT c.* FROM public.clubs c
WHERE EXISTS (SELECT 1 FROM public.users WHERE id = $1 AND role = 'admin')
ORDER BY c.id;

-- PATCH /api/admin/clubs/:id/status : $1 compte admin, $2 club,
-- $3 approved ou rejected. L'API doit aussi verifier le role avant la requete.
UPDATE public.clubs SET status = $3::varchar(10)
WHERE id = $2 AND $3::varchar(10) IN ('approved', 'rejected')
  AND EXISTS (SELECT 1 FROM public.users WHERE id = $1 AND role = 'admin')
RETURNING *;

-- GET /api/admin/ads : $1 compte admin ; liste d'attente.
SELECT a.*, c.name AS club_name, c.status AS club_status
FROM public.ads a JOIN public.clubs c ON c.id = a.club_id
WHERE a.status = 'pending'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = $1 AND role = 'admin')
ORDER BY a.created_at, a.id;

-- PATCH /api/admin/ads/:id/status : $1 compte admin, $2 annonce,
-- $3 approved ou rejected. Le trigger refuse une approbation si club invalide.
UPDATE public.ads SET status = $3::varchar(10)
WHERE id = $2 AND $3::varchar(10) IN ('approved', 'rejected')
  AND EXISTS (SELECT 1 FROM public.users WHERE id = $1 AND role = 'admin')
RETURNING *;

-- Ajout de club par l'admin : reutiliser la transaction compte + profil club
-- apres controle admin ; elle exige un email et un hash bcrypt fournis par
-- le processus de creation de compte, jamais un mot de passe en clair en SQL.
