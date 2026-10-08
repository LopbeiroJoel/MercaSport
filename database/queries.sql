-- Requetes SQL utiles : aucune route ou implementation backend dans ce fichier.
-- Executer les requetes parametrees separement avec des valeurs liees ($1...).

-- Toutes les annonces avec club et equipe.
SELECT a.id, a.title, a.short_description, c.name AS club,
       t.name AS team, t.division, a.position
FROM public.ads a JOIN public.teams t ON a.team_id = t.id
JOIN public.clubs c ON t.club_id = c.id
ORDER BY a.created_at DESC, a.id DESC;

-- Detail : $1 = identifiant de l'annonce.
SELECT a.id, a.title, a.short_description, c.name AS club,
       t.name AS team, t.division, a.position, a.preferred_foot, a.requirements,
       a.contract, a.work_time, a.salary, a.location, a.description, a.missions
FROM public.ads a JOIN public.teams t ON a.team_id = t.id
JOIN public.clubs c ON t.club_id = c.id
WHERE a.id = $1;

-- Equipes d'un club : $1 = identifiant du club.
SELECT id, name, division, category FROM public.teams
WHERE club_id = $1 ORDER BY division, id;

-- Annonces d'une equipe : $1 = identifiant de l'equipe.
SELECT * FROM public.ads WHERE team_id = $1 ORDER BY created_at DESC, id DESC;

-- Nouvelle annonce : $1 equipe, $2 titre, $3 resume, $4 poste, $5 pied,
-- $6 qualites, $7 contrat, $8 rythme, $9 salaire, $10 lieu,
-- $11 description, $12 missions.
INSERT INTO public.ads (team_id, title, short_description, position, preferred_foot,
    requirements, contract, work_time, salary, location, description, missions)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING id;

-- Candidature sans compte obligatoire : $1 annonce, $2 nom,
-- $3 email, $4 telephone facultatif, $5 message.
INSERT INTO public.applications (ad_id, name, email, phone, message)
VALUES ($1, $2, $3, $4, coalesce($5, '')) RETURNING id, created_at;

-- Candidature d'un joueur existant : $1 player_id, $2 annonce, $3 message.
-- Le trigger copie le nom/email du compte et verifie le role player.
INSERT INTO public.applications (player_id, ad_id, message)
VALUES ($1, $2, coalesce($3, '')) RETURNING id, name, email, created_at;

-- Candidatures d'une annonce : $1 identifiant d'annonce.
-- Coordonnees privees : reserver cette lecture aux personnes autorisees.
SELECT id, name, email, phone, message, created_at
FROM public.applications WHERE ad_id = $1 ORDER BY created_at DESC, id DESC;

-- Ajouter une equipe : $1 club, $2 nom, $3 division, $4 categorie.
INSERT INTO public.teams (club_id, name, division, category)
VALUES ($1, $2, $3, coalesce($4, 'Senior')) RETURNING id;

-- Connexion : compte du site, distinct du compte PostgreSQL.
SELECT id, name, email, password_hash, role FROM public.users WHERE email = $1;
