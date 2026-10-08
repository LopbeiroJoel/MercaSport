-- DONNEES DE DEMONSTRATION LOCALES UNIQUEMENT.
-- Mot de passe PUBLIC des NOUVEAUX comptes : MercaSportDemo!2026
-- Hash bcrypt cout 12 ; aucun mot de passe clair stocke dans la base.
-- Comptes/mots de passe conserves ; annonces sans statut ni moderation.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.users, public.clubs, public.teams, public.players, public.ads,
    public.applications IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE demo_clubs (
    name TEXT, city TEXT, divisions TEXT, email TEXT
) ON COMMIT DROP;
INSERT INTO demo_clubs VALUES
('FC Hégenheim', 'Hégenheim', 'R3 / D4', 'hegenheim@mercasport.example'),
('Strasbourg SUC', 'Strasbourg', 'D1 / D6', 'strasbourg-suc@mercasport.example'),
('SR Colmar', 'Colmar', 'R1 / R3 / D2', 'colmar@mercasport.example'),
('FC Saint-Louis', 'Saint-Louis', 'R1 / R3', 'saint-louis@mercasport.example'),
('ASL Robertsau', 'Strasbourg', 'D1 / D5', 'robertsau@mercasport.example'),
('US Ittenheim', 'Ittenheim', 'R2 / R3 / D4', 'ittenheim@mercasport.example'),
('FC Mulhouse', 'Mulhouse', 'N3 / R3 / D2', 'mulhouse@mercasport.example'),
('FC Truchtersheim', 'Truchtersheim', 'D1 / D5', 'truchtersheim@mercasport.example'),
('SR Belfort', 'Belfort', 'R2 / D6', 'belfort@mercasport.example'),
('SR Hirsingue', 'Hirsingue', 'R3 / D4', 'hirsingue@mercasport.example'),
('AS Huningue', 'Huningue', 'R2 / D1', 'huningue@mercasport.example'),
('AS Thomas', 'Strasbourg', 'R1', 'thomas@mercasport.example'),
('AS Coteaux', 'Mulhouse', 'R2 / D3', 'coteaux@mercasport.example');

-- Reutiliser le compte reel d'un club deja present, meme si son email
-- differe de celui du jeu de demonstration ; ne jamais changer son proprietaire.
DO $$
DECLARE item RECORD; club_id INTEGER; matches INTEGER; owner_email TEXT; owner_role TEXT;
BEGIN
    FOR item IN SELECT * FROM demo_clubs LOOP
        SELECT count(*), min(id) INTO matches, club_id FROM public.clubs
        WHERE lower(btrim(name)) = lower(item.name)
           OR (item.name = 'AS Huningue' AND lower(btrim(name)) = 'as hunningue');
        IF matches > 1 THEN
            RAISE EXCEPTION 'Plusieurs fiches correspondent a %. Import annule.', item.name;
        END IF;
        IF matches = 1 THEN
            SELECT u.email, u.role INTO owner_email, owner_role
            FROM public.clubs c JOIN public.users u ON u.id = c.user_id
            WHERE c.id = club_id;
            IF owner_email IS NOT NULL AND owner_role IS DISTINCT FROM 'club' THEN
                RAISE EXCEPTION 'Le proprietaire de % doit etre un compte club. Import annule.', item.name;
            END IF;
            IF owner_email IS NOT NULL THEN
                UPDATE demo_clubs SET email = owner_email WHERE name = item.name;
            END IF;
        END IF;
    END LOOP;
END $$;

CREATE TEMP TABLE demo_players (first_name TEXT, last_name TEXT, email TEXT) ON COMMIT DROP;
INSERT INTO demo_players VALUES
('Joel', 'Lopes Ribeiro', 'joel.player@mercasport.example'),
('Thomas', 'Lapin', 'thomas.player@mercasport.example'),
('Matteo', 'GrosBras', 'matteo.player@mercasport.example');

INSERT INTO public.users (name, email, password_hash, role)
SELECT name, email, '$2b$12$cUOyQ8qs/XDx0mCfddZmoeoP.lIrT/h7ITxYBMG7V0PfvBSPGWrvG', 'club'
FROM demo_clubs
UNION ALL
SELECT first_name || ' ' || last_name, email,
    '$2b$12$cUOyQ8qs/XDx0mCfddZmoeoP.lIrT/h7ITxYBMG7V0PfvBSPGWrvG', 'player'
FROM demo_players
UNION ALL
SELECT 'Admin MercaSport', 'admin@mercasport.example',
    '$2b$12$cUOyQ8qs/XDx0mCfddZmoeoP.lIrT/h7ITxYBMG7V0PfvBSPGWrvG', 'admin'
ON CONFLICT (email) DO NOTHING;

DO $$
DECLARE item RECORD; account_id INTEGER; club_id INTEGER; owner_id INTEGER; matches INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM (
            SELECT email, 'club' AS role FROM demo_clubs
            UNION ALL SELECT email, 'player' FROM demo_players
            UNION ALL SELECT 'admin@mercasport.example', 'admin'
        ) expected JOIN public.users u ON u.email = expected.email
        WHERE u.role <> expected.role
    ) THEN
        RAISE EXCEPTION 'Un email de demonstration appartient a un autre role. Import annule.';
    END IF;

    FOR item IN SELECT * FROM demo_clubs LOOP
        club_id := NULL;
        SELECT id INTO STRICT account_id FROM public.users WHERE email = item.email;
        SELECT count(*), min(id) INTO matches, club_id FROM public.clubs
        WHERE lower(btrim(name)) = lower(item.name)
           OR (item.name = 'AS Huningue' AND lower(btrim(name)) = 'as hunningue');
        IF matches > 1 THEN
            RAISE EXCEPTION 'Plusieurs fiches correspondent a %. Import annule.', item.name;
        END IF;
        IF matches = 1 THEN
            SELECT user_id INTO owner_id FROM public.clubs WHERE id = club_id;
            IF owner_id IS NOT NULL AND owner_id IS DISTINCT FROM account_id THEN
                RAISE EXCEPTION 'Le club % appartient a un autre compte. Import annule.', item.name;
            END IF;
        ELSE
            INSERT INTO public.clubs (user_id, name, city, divisions)
            VALUES (account_id, item.name, item.city, item.divisions);
        END IF;
        -- Donnees de demonstration demandees : N3 et noms canoniques.
        UPDATE public.clubs SET user_id = coalesce(user_id, account_id),
            name = item.name, city = item.city, divisions = item.divisions
        WHERE user_id = account_id OR id = club_id;
        -- Le nom affiche du compte club suit son nom de club actuel.
        UPDATE public.users u SET name = c.name
        FROM public.clubs c WHERE c.user_id = u.id AND u.id = account_id;
    END LOOP;
END $$;

INSERT INTO public.players (user_id, first_name, last_name)
SELECT u.id, p.first_name, p.last_name
FROM demo_players p JOIN public.users u ON u.email = p.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.teams (club_id, name, division, category)
SELECT c.id, 'Équipe ' || btrim(part), btrim(part), 'Senior'
FROM demo_clubs d JOIN public.clubs c ON c.name = d.name
CROSS JOIN LATERAL regexp_split_to_table(d.divisions, '/') AS divisions(part)
ON CONFLICT (club_id, division, category) DO NOTHING;

CREATE TEMP TABLE demo_ads (
    club_name TEXT, division TEXT, position TEXT, preferred_foot TEXT,
    requirements TEXT, legacy_title TEXT
) ON COMMIT DROP;
INSERT INTO demo_ads VALUES
('FC Hégenheim', 'R3', 'Gardien', 'Indifférent',
 'Bons réflexes, communication avec la défense et jeu au pied propre.', '[DEMO] Gardien pour la saison'),
('FC Hégenheim', 'D4', 'Avant-centre', NULL,
 'Appels de balle et finition dans la surface.', '[DEMO] Attaquant recherche'),
('Strasbourg SUC', 'D1', 'Milieu central', NULL,
 'Bonne qualité de passe et capacité à jouer sous pression.', NULL),
('Strasbourg SUC', 'D6', 'Latéral droit', NULL,
 'Joueur sérieux, disponible et solide défensivement.', NULL),
('SR Colmar', 'R1', 'Milieu offensif', 'Deux pieds',
 'Technique, vision du jeu et dernière passe. Tireur de coups francs ; sait tirer les corners.', '[DEMO] Milieu de terrain'),
('SR Colmar', 'R3', 'Défenseur central', NULL,
 'Solide dans les duels, bon jeu de tête et bonne relance.', NULL),
('SR Colmar', 'D2', 'Ailier gauche', 'Droit',
 'Rapide et bon en un contre un, capable de rentrer dans l axe sur son pied droit.', NULL),
('FC Saint-Louis', 'R1', 'Avant-centre', 'Deux pieds',
 'Finition des deux pieds, jeu dos au but et appels de balle.', NULL),
('FC Saint-Louis', 'R3', 'Milieu défensif', NULL,
 'Récupération, placement et qualité de passe pour la première relance.', NULL),
('ASL Robertsau', 'D1', 'Latéral gauche', 'Gauche',
 'Profil gaucher avec un bon volume de jeu et une bonne qualité de centre.', NULL),
('ASL Robertsau', 'D5', 'Gardien', NULL,
 'Placement fiable et communication avec ses défenseurs.', NULL),
('US Ittenheim', 'R2', 'Ailier droit', 'Gauche',
 'Profil gaucher, technique et bon en un contre un pour rentrer intérieur.', NULL),
('US Ittenheim', 'R3', 'Milieu central', 'Deux pieds',
 'Bonne vision du jeu, qualité de passe et aisance des deux pieds.', NULL),
('US Ittenheim', 'D4', 'Avant-centre', 'Deux pieds',
 'Efficace dans la surface, bon jeu de tête et finition des deux pieds.', NULL),
('FC Mulhouse', 'N3', 'Gardien', 'Indifférent',
 'Réflexes, sorties aériennes, communication et qualité du jeu au pied.', NULL),
('FC Mulhouse', 'R3', 'Défenseur central', 'Gauche',
 'Défenseur gaucher solide dans les duels, bon dans le jeu aérien et propre à la relance.', '[DEMO] Defenseur recherche'),
('FC Mulhouse', 'D2', 'Avant-centre', NULL,
 'Puissance, jeu dos au but et finition.', NULL),
('FC Truchtersheim', 'D1', 'Milieu offensif', NULL,
 'Créativité et dernière passe. Savoir tirer les corners est un plus.', NULL),
('FC Truchtersheim', 'D5', 'Latéral droit', 'Droit',
 'Endurance et bonne qualité de centre du pied droit.', NULL),
('SR Belfort', 'R2', 'Ailier gauche', 'Gauche',
 'Rapide, capable de déborder et de centrer du pied gauche.', NULL),
('SR Belfort', 'D6', 'Milieu défensif', NULL,
 'Placement et impact dans les duels.', NULL),
('SR Hirsingue', 'R3', 'Défenseur central', NULL,
 'Bon jeu de tête, puissance et placement.', NULL),
('SR Hirsingue', 'D4', 'Milieu central', NULL,
 'Joueur technique avec une bonne qualité de passe ; sait tirer les corners.', NULL),
('AS Huningue', 'R2', 'Latéral gauche', 'Gauche',
 'Rapidité, endurance et capacité à répéter les efforts sur le côté gauche.', NULL),
('AS Huningue', 'D1', 'Ailier droit', 'Droit',
 'Rapide et bon en un contre un, avec une bonne qualité de centre.', NULL),
('AS Coteaux', 'R2', 'Milieu offensif', 'Deux pieds',
 'Technique, créativité et aisance des deux pieds. Tireur de coups francs apprécié.', NULL),
('AS Coteaux', 'D3', 'Défenseur central', NULL,
 'Solide dans les duels et capable de relancer simplement.', NULL),
('AS Thomas', 'R1', 'Avant-centre', NULL,
 'Appels de balle, bon jeu de tête et efficacité devant le but.', NULL);

-- Enrichir les quatre anciens exemples sans supprimer leur ID/candidatures.
UPDATE public.ads a SET
    title = c.name || ' recherche : ' || d.position || ' (' || t.division || ')',
    short_description = c.name || ' recrute un profil ' || lower(d.position) || ' pour son équipe ' || t.division || '.',
    position = d.position, preferred_foot = d.preferred_foot, requirements = d.requirements,
    contract = 'Licence joueur', work_time = 'Entraînements + matchs', salary = 'Selon profil',
    location = c.city,
    description = 'Dans le cadre du renforcement de son effectif, ' || c.name ||
        ' recherche un profil ' || lower(d.position) || ' pour son équipe Senior évoluant en ' || t.division || '.',
    missions = 'Participer aux entraînements et aux matchs officiels ; contribuer aux objectifs sportifs du groupe.'
FROM demo_ads d JOIN public.clubs c ON c.name = d.club_name
JOIN public.teams t ON t.club_id = c.id AND t.division = d.division AND t.category = 'Senior'
WHERE a.team_id = t.id AND a.title = d.legacy_title;

INSERT INTO public.ads (
    team_id, title, short_description, position, preferred_foot, requirements,
    contract, work_time, salary, location, description, missions
)
SELECT t.id, c.name || ' recherche : ' || d.position || ' (' || t.division || ')',
    c.name || ' recrute un profil ' || lower(d.position) || ' pour son équipe ' || t.division || '.',
    d.position, d.preferred_foot, d.requirements,
    'Licence joueur', 'Entraînements + matchs', 'Selon profil', c.city,
    'Dans le cadre du renforcement de son effectif, ' || c.name ||
        ' recherche un profil ' || lower(d.position) || ' pour son équipe Senior évoluant en ' || t.division || '.',
    'Participer aux entraînements et aux matchs officiels ; contribuer aux objectifs sportifs du groupe.'
FROM demo_ads d JOIN public.clubs c ON c.name = d.club_name
JOIN public.teams t ON t.club_id = c.id AND t.division = d.division AND t.category = 'Senior'
WHERE NOT EXISTS (
    SELECT 1 FROM public.ads a WHERE a.team_id = t.id
      AND a.title = c.name || ' recherche : ' || d.position || ' (' || t.division || ')'
);

-- Les trois joueurs gardent leurs comptes ; exemples de candidature distincts.
INSERT INTO public.applications (player_id, ad_id, name, email, phone, message)
SELECT p.id, a.id, u.name, u.email, NULL,
    'Bonjour, je souhaite participer à un essai avec votre équipe ' || t.division || '.'
FROM (VALUES
    ('joel.player@mercasport.example', 'FC Hégenheim', 'R3'),
    ('thomas.player@mercasport.example', 'AS Thomas', 'R1'),
    ('matteo.player@mercasport.example', 'FC Mulhouse', 'N3')
) AS d(email, club_name, division)
JOIN public.users u ON u.email = d.email
JOIN public.players p ON p.user_id = u.id
JOIN public.clubs c ON c.name = d.club_name
JOIN public.teams t ON t.club_id = c.id AND t.division = d.division AND t.category = 'Senior'
JOIN public.ads a ON a.team_id = t.id
JOIN demo_ads da ON da.club_name = d.club_name AND da.division = d.division
WHERE a.title = c.name || ' recherche : ' || da.position || ' (' || t.division || ')'
ON CONFLICT DO NOTHING;

COMMIT;

SELECT 'clubs' AS table_name, count(*) AS nombre FROM public.clubs
UNION ALL SELECT 'teams', count(*) FROM public.teams
UNION ALL SELECT 'ads', count(*) FROM public.ads
UNION ALL SELECT 'applications', count(*) FROM public.applications;
