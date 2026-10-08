-- Verifications executables directement dans PostgreSQL/pgAdmin.
SELECT * FROM public.clubs ORDER BY id;
SELECT * FROM public.teams ORDER BY club_id, division;
SELECT * FROM public.ads ORDER BY id;
SELECT * FROM public.applications ORDER BY id;

SELECT c.name AS club, t.name AS team, t.division,
       a.position, a.preferred_foot, a.requirements
FROM public.ads a JOIN public.teams t ON a.team_id = t.id
JOIN public.clubs c ON t.club_id = c.id
ORDER BY c.name, t.division, a.id;

SELECT c.name, count(t.id) AS nombre_equipes
FROM public.clubs c LEFT JOIN public.teams t ON t.club_id = c.id
GROUP BY c.id, c.name ORDER BY c.name;

SELECT c.name AS club, t.division, count(a.id) AS nombre_annonces
FROM public.teams t JOIN public.clubs c ON t.club_id = c.id
LEFT JOIN public.ads a ON a.team_id = t.id
GROUP BY c.name, t.id, t.division ORDER BY c.name, t.division;

-- Ce resultat doit etre vide : aucune equipe sans annonce.
SELECT c.name AS club, t.division
FROM public.teams t JOIN public.clubs c ON c.id = t.club_id
WHERE NOT EXISTS (SELECT 1 FROM public.ads a WHERE a.team_id = t.id);

SELECT 'clubs' AS table_name, count(*) AS nombre FROM public.clubs
UNION ALL SELECT 'teams', count(*) FROM public.teams
UNION ALL SELECT 'ads', count(*) FROM public.ads
UNION ALL SELECT 'applications', count(*) FROM public.applications;
