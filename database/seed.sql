-- DONNEES DE DEMONSTRATION LOCALES UNIQUEMENT.
-- Mot de passe PUBLIC des NOUVEAUX comptes : MercaSportDemo!2026
-- Hash bcrypt cout 12 ; aucun mot de passe clair stocke dans la base.
-- Les mots de passe et les decisions de moderation existants sont conserves.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.users, public.clubs, public.players, public.ads,
    public.applications IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE demo_clubs (
    name TEXT, city TEXT, divisions TEXT, email TEXT, status TEXT
) ON COMMIT DROP;
INSERT INTO demo_clubs VALUES
('FC Hégenheim', 'Hégenheim', 'R3 / D4', 'hegenheim@mercasport.example', 'approved'),
('Strasbourg SUC', 'Strasbourg', 'D1 / D6', 'strasbourg-suc@mercasport.example', 'approved'),
('SR Colmar', 'Colmar', 'R1 / R3 / D2', 'colmar@mercasport.example', 'approved'),
('FC Saint-Louis', 'Saint-Louis', 'R1 / R3', 'saint-louis@mercasport.example', 'approved'),
('ASL Robertsau', 'Strasbourg', 'D1 / D5', 'robertsau@mercasport.example', 'approved'),
('US Ittenheim', 'Ittenheim', 'R2 / R3 / D4', 'ittenheim@mercasport.example', 'approved'),
('FC Mulhouse', 'Mulhouse', 'NAT3 / R3 / D2', 'mulhouse@mercasport.example', 'approved'),
('FC Truchtersheim', 'Truchtersheim', 'D1 / D5', 'truchtersheim@mercasport.example', 'approved'),
('SR Belfort', 'Belfort', 'R2 / D6', 'belfort@mercasport.example', 'approved'),
('SR Hirsingue', 'Hirsingue', 'R3 / D4', 'hirsingue@mercasport.example', 'approved'),
('AS Huningue', 'Huningue', 'R2 / D1', 'huningue@mercasport.example', 'approved'),
('AS Thomas', 'Strasbourg', 'R1', 'thomas@mercasport.example', 'pending'),
('AS Coteaux', 'Mulhouse', 'R2 / D3', 'coteaux@mercasport.example', 'approved');

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
            IF owner_email IS NULL OR owner_role IS DISTINCT FROM 'club' THEN
                RAISE EXCEPTION 'Le proprietaire de % doit etre un compte club. Import annule.', item.name;
            END IF;
            UPDATE demo_clubs SET email = owner_email WHERE name = item.name;
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
        SELECT id INTO STRICT account_id FROM public.users WHERE email = item.email;
        SELECT count(*), min(id) INTO matches, club_id FROM public.clubs
        WHERE lower(btrim(name)) = lower(item.name)
           OR (item.name = 'AS Huningue' AND lower(btrim(name)) = 'as hunningue');
        IF matches > 1 THEN
            RAISE EXCEPTION 'Plusieurs fiches correspondent a %. Import annule.', item.name;
        END IF;
        IF matches = 1 THEN
            SELECT user_id INTO owner_id FROM public.clubs WHERE id = club_id;
            IF owner_id IS DISTINCT FROM account_id THEN
                RAISE EXCEPTION 'Le club % appartient a un autre compte. Import annule.', item.name;
            END IF;
        ELSE
            INSERT INTO public.clubs (user_id, name, city, divisions, status)
            VALUES (account_id, item.name, item.city, item.divisions, item.status);
        END IF;
        -- Le nom affiche du compte club suit son nom de club actuel.
        UPDATE public.users u SET name = c.name
        FROM public.clubs c WHERE c.user_id = u.id AND u.id = account_id;
    END LOOP;
END $$;

INSERT INTO public.players (user_id, first_name, last_name)
SELECT u.id, p.first_name, p.last_name
FROM demo_players p JOIN public.users u ON u.email = p.email
ON CONFLICT (user_id) DO NOTHING;

-- Un jeu d'exemples incluant chaque statut ; aucun ajout pour un club
-- existant encore pending/rejected et aucune moderation existante ecrasee.
INSERT INTO public.ads (club_id, title, position, city, description, status)
SELECT c.id, d.title, d.position, c.city, d.description, d.status
FROM (VALUES
    ('FC Hégenheim', '[DEMO] Gardien pour la saison', 'Gardien',
     'Le club recherche un gardien motive pour renforcer son effectif.', 'approved'),
    ('SR Colmar', '[DEMO] Milieu de terrain', 'Milieu',
     'Rejoignez notre equipe et participez aux entrainements collectifs.', 'approved'),
    ('FC Hégenheim', '[DEMO] Attaquant recherche', 'Attaquant',
     'Annonce de demonstration attendant une validation administrateur.', 'pending'),
    ('FC Mulhouse', '[DEMO] Defenseur recherche', 'Defenseur',
     'Exemple d annonce refusee, invisible sur la liste publique.', 'rejected')
) AS d(club_name, title, position, description, status)
JOIN demo_clubs dc ON dc.name = d.club_name
JOIN public.users u ON u.email = dc.email
JOIN public.clubs c ON c.user_id = u.id
WHERE c.status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM public.ads a WHERE a.club_id = c.id AND a.title = d.title);

INSERT INTO public.applications (player_id, ad_id, message)
SELECT p.id, a.id, 'Bonjour, je souhaite participer a un essai avec votre club.'
FROM public.players p JOIN public.users u ON u.id = p.user_id
CROSS JOIN public.approved_ads a
JOIN public.clubs c ON c.id = a.club_id
JOIN public.users owner ON owner.id = c.user_id
WHERE u.email = 'joel.player@mercasport.example'
  AND owner.email = (SELECT email FROM demo_clubs WHERE name = 'FC Hégenheim')
  AND a.title = '[DEMO] Gardien pour la saison'
ON CONFLICT (player_id, ad_id) DO NOTHING;

COMMIT;

SELECT role, count(*) AS nombre FROM public.users GROUP BY role ORDER BY role;
SELECT c.id, c.name AS club, c.status, u.name AS nom_affiche
FROM public.clubs c JOIN public.users u ON u.id = c.user_id ORDER BY c.id;
