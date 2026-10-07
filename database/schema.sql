-- Structure MercaSport. Ne supprime aucune table ni aucune donnee.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('player', 'club', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Une ancienne table avec seulement email/password doit etre migree
-- explicitement : ne jamais transformer un mot de passe clair en faux hash.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM (VALUES ('id'), ('name'), ('email'),
            ('password_hash'), ('role'), ('created_at')) AS required(column_name)
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = 'users'
              AND c.column_name = required.column_name
        )
    ) THEN
        RAISE EXCEPTION 'Ancienne structure users detectee : migration necessaire. Aucune donnee supprimee.';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.clubs (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES public.users(id),
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    divisions TEXT,
    status VARCHAR(10) NOT NULL DEFAULT 'pending',
    CONSTRAINT clubs_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Mise a niveau des clubs deja presents chez Joel : les IDs sont conserves.
-- Les clubs existants passent en pending et devront etre valides par l'admin.
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'pending';
ALTER TABLE public.clubs ALTER COLUMN user_id SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.clubs'::regclass AND conname = 'clubs_status_check') THEN
        ALTER TABLE public.clubs ADD CONSTRAINT clubs_status_check
            CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.players (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES public.users(id),
    first_name VARCHAR(100) NOT NULL CHECK (btrim(first_name) <> ''),
    last_name VARCHAR(100) NOT NULL CHECK (btrim(last_name) <> '')
);

CREATE TABLE IF NOT EXISTS public.ads (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    club_id INTEGER NOT NULL REFERENCES public.clubs(id),
    title VARCHAR(150) NOT NULL CHECK (btrim(title) <> ''),
    position VARCHAR(100) NOT NULL CHECK (btrim(position) <> ''),
    city VARCHAR(100) NOT NULL CHECK (btrim(city) <> ''),
    description TEXT NOT NULL CHECK (btrim(description) <> ''),
    status VARCHAR(10) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.applications (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES public.players(id),
    ad_id INTEGER NOT NULL REFERENCES public.ads(id),
    message TEXT NOT NULL DEFAULT '' CHECK (char_length(message) <= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT applications_player_ad_key UNIQUE (player_id, ad_id)
);

CREATE INDEX IF NOT EXISTS clubs_status_idx ON public.clubs(status);
CREATE INDEX IF NOT EXISTS ads_club_id_idx ON public.ads(club_id);
CREATE INDEX IF NOT EXISTS ads_status_created_idx ON public.ads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS applications_ad_id_idx ON public.applications(ad_id);

-- Protection SQL complementaire : les routes Express doivent aussi verifier
-- l'identite, le role et la propriete de chaque ressource.
CREATE OR REPLACE FUNCTION public.check_ad_club() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.club_id IS DISTINCT FROM OLD.club_id
       OR NEW.status = 'approved' THEN
        PERFORM 1 FROM public.clubs c JOIN public.users u ON u.id = c.user_id
        WHERE c.id = NEW.club_id AND c.status = 'approved' AND u.role = 'club'
        FOR SHARE OF c, u;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Le club doit etre approuve et posseder un compte club.'
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER ads_check_club
BEFORE INSERT OR UPDATE OF club_id, status ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.check_ad_club();

CREATE OR REPLACE FUNCTION public.check_application() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM 1 FROM public.players p JOIN public.users u ON u.id = p.user_id
    WHERE p.id = NEW.player_id AND u.role = 'player' FOR SHARE OF p, u;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Un profil joueur avec le role player est requis.' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.ads a JOIN public.clubs c ON c.id = a.club_id
    WHERE a.id = NEW.ad_id AND a.status = 'approved' AND c.status = 'approved'
    FOR SHARE OF a, c;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La candidature exige une annonce et un club approuves.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER applications_check_public_ad
BEFORE INSERT OR UPDATE OF player_id, ad_id ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.check_application();

-- Source de lecture publique : meme une annonce approved disparait si son
-- club repasse pending/rejected. Aucune adresse email ni aucun hash exposes.
CREATE OR REPLACE VIEW public.approved_ads AS
SELECT a.id, a.club_id, c.name AS club_name, a.title, a.position,
       a.city, a.description, a.created_at
FROM public.ads a JOIN public.clubs c ON c.id = a.club_id
WHERE a.status = 'approved' AND c.status = 'approved';

COMMIT;
