-- MercaSport : club -> equipes -> annonces -> candidatures.
-- Migration additive : aucun DROP TABLE et aucun compte supprime.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Comptes et profils existants conserves pour la connexion des joueurs/clubs.
CREATE TABLE IF NOT EXISTS public.users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('player', 'club', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM (VALUES ('id'), ('name'), ('email'), ('password_hash'),
            ('role'), ('created_at')) AS required(column_name)
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = 'users'
              AND c.column_name = required.column_name
        )
    ) THEN
        RAISE EXCEPTION 'Ancienne structure users incompatible : migration necessaire, aucune donnee supprimee.';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.players (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES public.users(id),
    first_name VARCHAR(100) NOT NULL CHECK (btrim(first_name) <> ''),
    last_name VARCHAR(100) NOT NULL CHECK (btrim(last_name) <> '')
);

CREATE TABLE IF NOT EXISTS public.clubs (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Colonnes historiques conservees ; teams est la reference des divisions.
    user_id INTEGER UNIQUE REFERENCES public.users(id),
    divisions TEXT
);
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.clubs ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.teams (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    club_id INTEGER NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
    division VARCHAR(20) NOT NULL CHECK (btrim(division) <> ''),
    category VARCHAR(50) NOT NULL DEFAULT 'Senior' CHECK (btrim(category) <> ''),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT teams_club_division_category_key UNIQUE (club_id, division, category)
);

-- Transformer les anciennes chaines 'R3 / D4' en deux equipes, sans doublon.
INSERT INTO public.teams (club_id, name, division, category)
SELECT c.id, 'Équipe ' || d.division, d.division, 'Senior'
FROM public.clubs c
CROSS JOIN LATERAL (
    SELECT DISTINCT CASE WHEN upper(btrim(part)) = 'NAT3' THEN 'N3'
                         ELSE upper(btrim(part)) END AS division
    FROM regexp_split_to_table(coalesce(c.divisions, ''), '/') AS parts(part)
    WHERE btrim(part) <> ''
) d
ON CONFLICT (club_id, division, category) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ads (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL CHECK (btrim(title) <> ''),
    short_description TEXT,
    position VARCHAR(100) NOT NULL CHECK (btrim(position) <> ''),
    preferred_foot VARCHAR(20) CHECK (preferred_foot IN ('Gauche', 'Droit', 'Deux pieds', 'Indifférent')),
    requirements TEXT,
    contract VARCHAR(100),
    work_time VARCHAR(150),
    salary VARCHAR(100),
    location VARCHAR(100),
    description TEXT,
    missions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Compatibilite avec les anciennes lectures : remplis depuis team_id.
    club_id INTEGER REFERENCES public.clubs(id) ON DELETE CASCADE,
    city VARCHAR(100)
);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS preferred_foot VARCHAR(20);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS requirements TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS contract VARCHAR(100);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS work_time VARCHAR(150);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS salary VARCHAR(100);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS missions TEXT;
ALTER TABLE public.ads ALTER COLUMN club_id DROP NOT NULL;
ALTER TABLE public.ads ALTER COLUMN city DROP NOT NULL;
ALTER TABLE public.ads ALTER COLUMN description DROP NOT NULL;

-- Reinstaller les regles apres la migration, dans la meme transaction.
DROP TRIGGER IF EXISTS ads_check_club ON public.ads;
-- Ancienne vue de moderation retiree ; ads_details expose toutes les annonces.
DROP VIEW IF EXISTS public.approved_ads;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ads'::regclass AND conname = 'ads_preferred_foot_check') THEN
        ALTER TABLE public.ads ADD CONSTRAINT ads_preferred_foot_check
            CHECK (preferred_foot IN ('Gauche', 'Droit', 'Deux pieds', 'Indifférent'));
    END IF;
END $$;

-- La FK historique ne doit pas bloquer la cascade club -> teams -> ads.
DO $$
DECLARE fk RECORD;
BEGIN
    FOR fk IN SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.ads'::regclass AND contype = 'f'
          AND confrelid = 'public.clubs'::regclass AND confdeltype <> 'c'
    LOOP
        EXECUTE format('ALTER TABLE public.ads DROP CONSTRAINT %I', fk.conname);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ads'::regclass AND contype = 'f'
          AND confrelid = 'public.clubs'::regclass AND confdeltype = 'c') THEN
        ALTER TABLE public.ads ADD CONSTRAINT ads_club_id_fkey
            FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Anciens exemples connus : rattachement explicite a une division.
-- Autres annonces : division dans le titre, ou club avec une seule equipe.
-- Une annonce ambiguë bloque la migration plutot que recevoir une equipe au hasard.
WITH candidates AS (
    SELECT a.id AS ad_id, min(t.id) AS team_id, count(*) AS matches
    FROM public.ads a JOIN public.clubs c ON c.id = a.club_id
    JOIN public.teams t ON t.club_id = c.id AND t.category = 'Senior'
    WHERE a.team_id IS NULL AND (
        (c.name = 'FC Hégenheim' AND a.title = '[DEMO] Gardien pour la saison' AND t.division = 'R3')
        OR (c.name = 'FC Hégenheim' AND a.title = '[DEMO] Attaquant recherche' AND t.division = 'D4')
        OR (c.name = 'SR Colmar' AND a.title = '[DEMO] Milieu de terrain' AND t.division = 'R1')
        OR (c.name = 'FC Mulhouse' AND a.title = '[DEMO] Defenseur recherche' AND t.division = 'R3')
        OR a.title ~* ('(^|[^[:alnum:]])' || t.division || '([^[:alnum:]]|$)')
        OR (SELECT count(*) FROM public.teams x WHERE x.club_id = c.id AND x.category = 'Senior') = 1
    ) GROUP BY a.id
)
UPDATE public.ads a SET team_id = m.team_id
FROM candidates m WHERE a.id = m.ad_id AND m.matches = 1;
DO $$
DECLARE unresolved TEXT;
BEGIN
    SELECT string_agg(id::text, ', ' ORDER BY id) INTO unresolved FROM public.ads WHERE team_id IS NULL;
    IF unresolved IS NOT NULL THEN
        RAISE EXCEPTION 'Division inconnue pour les anciennes annonces %. Ajouter la division exacte a leur titre puis relancer. Migration annulee sans perte.', unresolved;
    END IF;
END $$;
ALTER TABLE public.ads ALTER COLUMN team_id SET NOT NULL;
UPDATE public.ads a SET location = coalesce(a.location, a.city, c.city),
    short_description = coalesce(a.short_description, left(a.description, 200))
FROM public.teams t JOIN public.clubs c ON c.id = t.club_id WHERE t.id = a.team_id;

CREATE TABLE IF NOT EXISTS public.applications (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ad_id INTEGER NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL CHECK (btrim(name) <> ''),
    email VARCHAR(255) NOT NULL CHECK (btrim(email) <> ''),
    phone VARCHAR(30),
    message TEXT NOT NULL DEFAULT '' CHECK (char_length(message) <= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Facultatif : conserve le lien des candidatures des joueurs connectes.
    player_id INTEGER REFERENCES public.players(id),
    CONSTRAINT applications_player_ad_key UNIQUE (player_id, ad_id)
);
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS name VARCHAR(200);
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE public.applications ALTER COLUMN player_id DROP NOT NULL;
DROP TRIGGER IF EXISTS applications_check_public_ad ON public.applications;
UPDATE public.applications ap SET name = coalesce(ap.name, u.name), email = coalesce(ap.email, u.email)
FROM public.players p JOIN public.users u ON u.id = p.user_id WHERE p.id = ap.player_id;
ALTER TABLE public.applications ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.applications ALTER COLUMN email SET NOT NULL;
DO $$
DECLARE fk RECORD;
BEGIN
    -- Remplacer seulement l'ancienne FK vers ads pour ajouter ON DELETE CASCADE.
    FOR fk IN SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.applications'::regclass AND contype = 'f'
          AND confrelid = 'public.ads'::regclass AND confdeltype <> 'c'
    LOOP
        EXECUTE format('ALTER TABLE public.applications DROP CONSTRAINT %I', fk.conname);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.applications'::regclass AND contype = 'f'
          AND confrelid = 'public.ads'::regclass AND confdeltype = 'c') THEN
        ALTER TABLE public.applications ADD CONSTRAINT applications_ad_id_fkey
            FOREIGN KEY (ad_id) REFERENCES public.ads(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.applications'::regclass AND conname = 'applications_contact_check') THEN
        ALTER TABLE public.applications ADD CONSTRAINT applications_contact_check
            CHECK (btrim(name) <> '' AND btrim(email) <> '');
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ads_team_id_idx ON public.ads(team_id);
CREATE INDEX IF NOT EXISTS ads_created_idx ON public.ads(created_at DESC);
CREATE INDEX IF NOT EXISTS applications_ad_id_idx ON public.applications(ad_id);
CREATE UNIQUE INDEX IF NOT EXISTS applications_ad_email_key
    ON public.applications(ad_id, lower(btrim(email)));

CREATE OR REPLACE FUNCTION public.check_ad_club() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE owning_club INTEGER; club_city TEXT;
BEGIN
    SELECT c.id, c.city INTO owning_club, club_city
    FROM public.teams t JOIN public.clubs c ON c.id = t.club_id
    WHERE t.id = NEW.team_id FOR SHARE OF t, c;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Une equipe existante est obligatoire.' USING ERRCODE = '23503';
    END IF;
    IF NEW.club_id IS NOT NULL AND NEW.club_id <> owning_club THEN
        RAISE EXCEPTION 'Le club ne correspond pas a celui de l equipe.' USING ERRCODE = '23514';
    END IF;
    NEW.club_id := owning_club;
    NEW.city := coalesce(NEW.location, club_city);
    RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER ads_check_club
BEFORE INSERT OR UPDATE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.check_ad_club();

CREATE OR REPLACE FUNCTION public.check_application() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE player_name TEXT; player_email TEXT;
BEGIN
    IF NEW.player_id IS NOT NULL THEN
        SELECT u.name, u.email INTO player_name, player_email
        FROM public.players p JOIN public.users u ON u.id = p.user_id
        WHERE p.id = NEW.player_id AND u.role = 'player' FOR SHARE OF p, u;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Le profil doit appartenir a un joueur.' USING ERRCODE = '23514';
        END IF;
        NEW.name := coalesce(NEW.name, player_name);
        NEW.email := coalesce(NEW.email, player_email);
    END IF;
    PERFORM 1 FROM public.ads a JOIN public.teams t ON t.id = a.team_id
    JOIN public.clubs c ON c.id = t.club_id
    WHERE a.id = NEW.ad_id
    FOR SHARE OF a, t, c;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Une candidature exige une annonce existante.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER applications_check_ad
BEFORE INSERT OR UPDATE OF player_id, ad_id, name, email ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.check_application();

-- Lecture complete des annonces avec leur club et leur equipe.
CREATE OR REPLACE VIEW public.ads_details AS
SELECT a.id, c.id AS club_id, c.name AS club_name, a.title, a.position,
       a.city, a.description, a.created_at,
       a.team_id, t.name AS team_name, t.division, a.short_description,
       a.preferred_foot, a.requirements, a.contract, a.work_time, a.salary,
       a.location, a.missions
FROM public.ads a JOIN public.teams t ON t.id = a.team_id
JOIN public.clubs c ON c.id = t.club_id
;

-- Suppression uniquement des anciens champs de moderation, pas des annonces.
ALTER TABLE public.ads DROP COLUMN IF EXISTS status;
ALTER TABLE public.clubs DROP COLUMN IF EXISTS status;

COMMIT;
