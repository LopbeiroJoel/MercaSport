BEGIN;
SET LOCAL lock_timeout = '5s';

-- DB-01: existing accounts are retained.
CREATE OR REPLACE FUNCTION public.normalize_registration_user()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.role := upper(btrim(NEW.role));
  NEW.username := btrim(coalesce(nullif(btrim(NEW.username), ''), NEW.name));
  RETURN NEW;
END $$;
CREATE TRIGGER users_normalize_registration
BEFORE INSERT OR UPDATE OF role, username, name ON public.users
FOR EACH ROW EXECUTE FUNCTION public.normalize_registration_user();
ALTER TABLE public.users DROP CONSTRAINT users_role_check;
UPDATE public.users SET role = upper(role), username = coalesce(username, name);
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('PLAYER','CLUB','ADMIN'));
ALTER TABLE public.users ALTER COLUMN username SET NOT NULL;
ALTER TABLE public.users ADD CONSTRAINT users_username_not_blank CHECK (btrim(username) <> '');
CREATE UNIQUE INDEX users_username_unique_ci ON public.users (lower(btrim(username)));
CREATE UNIQUE INDEX users_email_unique_ci ON public.users (lower(btrim(email)));

CREATE OR REPLACE FUNCTION public.check_application()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE player_name TEXT; player_email TEXT;
BEGIN
  IF NEW.player_id IS NOT NULL THEN
    SELECT u.name, u.email INTO player_name, player_email
    FROM public.players p JOIN public.users u ON u.id=p.user_id
    WHERE p.id=NEW.player_id AND upper(u.role)='PLAYER' FOR SHARE OF p,u;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Le profil doit appartenir a un joueur.' USING ERRCODE='23514';
    END IF;
    NEW.name := coalesce(NEW.name,player_name);
    NEW.email := coalesce(NEW.email,player_email);
  END IF;
  PERFORM 1 FROM public.ads a JOIN public.teams t ON t.id=a.team_id
  JOIN public.clubs c ON c.id=t.club_id WHERE a.id=NEW.ad_id FOR SHARE OF a,t,c;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Une candidature exige une annonce existante.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

-- DB-02: registration profiles, synchronized with the existing API tables.
ALTER TABLE public.player_profiles ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.player_profiles ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE public.player_profiles ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.player_profiles ADD CONSTRAINT player_profiles_names_not_blank
CHECK (btrim(first_name) <> '' AND btrim(last_name) <> '');

CREATE TABLE public.club_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES public.users(id),
  name VARCHAR(150) NOT NULL CHECK (btrim(name) <> ''),
  city VARCHAR(100) NOT NULL CHECK (btrim(city) <> ''),
  divisions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION public.sync_registration_profile()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_role TEXT;
BEGIN
  expected_role := CASE WHEN TG_TABLE_NAME IN ('players','player_profiles') THEN 'PLAYER' ELSE 'CLUB' END;
  IF NEW.user_id IS NOT NULL THEN
    PERFORM 1 FROM public.users WHERE id=NEW.user_id AND role=expected_role FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Role incompatible avec le profil (%).', expected_role USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_OP='UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Le proprietaire du profil ne peut pas etre remplace.' USING ERRCODE='23514';
  END IF;
  IF pg_trigger_depth()>1 OR NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='player_profiles' THEN
    INSERT INTO public.players (user_id,first_name,last_name)
    VALUES (NEW.user_id,NEW.first_name,NEW.last_name)
    ON CONFLICT (user_id) DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name;
  ELSIF TG_TABLE_NAME='players' THEN
    INSERT INTO public.player_profiles (user_id,first_name,last_name)
    VALUES (NEW.user_id,NEW.first_name,NEW.last_name)
    ON CONFLICT (user_id) DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name;
  ELSIF TG_TABLE_NAME='club_profiles' THEN
    INSERT INTO public.clubs (user_id,name,city,divisions)
    VALUES (NEW.user_id,NEW.name,NEW.city,NEW.divisions)
    ON CONFLICT (user_id) DO UPDATE SET name=EXCLUDED.name,city=EXCLUDED.city,divisions=EXCLUDED.divisions;
  ELSIF TG_TABLE_NAME='clubs' THEN
    INSERT INTO public.club_profiles (user_id,name,city,divisions,created_at)
    VALUES (NEW.user_id,NEW.name,NEW.city,NEW.divisions,NEW.created_at)
    ON CONFLICT (user_id) DO UPDATE SET name=EXCLUDED.name,city=EXCLUDED.city,divisions=EXCLUDED.divisions;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER player_profiles_sync AFTER INSERT OR UPDATE ON public.player_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_registration_profile();
CREATE TRIGGER players_sync_profile AFTER INSERT OR UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.sync_registration_profile();
CREATE TRIGGER club_profiles_sync AFTER INSERT OR UPDATE ON public.club_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_registration_profile();
CREATE TRIGGER clubs_sync_profile AFTER INSERT OR UPDATE ON public.clubs
FOR EACH ROW EXECUTE FUNCTION public.sync_registration_profile();

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role <> 'PLAYER' AND (EXISTS (SELECT 1 FROM public.player_profiles WHERE user_id=NEW.id) OR EXISTS (SELECT 1 FROM public.players WHERE user_id=NEW.id)) THEN
    RAISE EXCEPTION 'Ce compte possede deja un profil joueur.' USING ERRCODE='23514';
  END IF;
  IF NEW.role <> 'CLUB' AND (EXISTS (SELECT 1 FROM public.club_profiles WHERE user_id=NEW.id) OR EXISTS (SELECT 1 FROM public.clubs WHERE user_id=NEW.id)) THEN
    RAISE EXCEPTION 'Ce compte possede deja un profil club.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER users_protect_profile_role BEFORE UPDATE OF role ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- DB-03: document references only; documents must be stored privately by the backend.
CREATE TABLE public.player_verifications (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  player_user_id INTEGER NOT NULL REFERENCES public.player_profiles(user_id),
  status VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  document_key TEXT NOT NULL CHECK (btrim(document_key) <> ''),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMPTZ,
  reviewed_by INTEGER REFERENCES public.users(id),
  rejection_reason TEXT,
  CHECK ((status='PENDING' AND reviewed_at IS NULL AND reviewed_by IS NULL AND rejection_reason IS NULL)
    OR (status='APPROVED' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND rejection_reason IS NULL)
    OR (status='REJECTED' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND btrim(rejection_reason) <> '' AND rejection_reason IS NOT NULL)),
  CHECK (reviewed_at IS NULL OR reviewed_at >= submitted_at)
);
CREATE UNIQUE INDEX player_verifications_one_pending ON public.player_verifications(player_user_id) WHERE status='PENDING';
CREATE INDEX player_verifications_player_date ON public.player_verifications(player_user_id,submitted_at DESC);
CREATE OR REPLACE FUNCTION public.check_verification_reviewer()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reviewed_by IS NOT NULL THEN
    PERFORM 1 FROM public.users WHERE id=NEW.reviewed_by AND role='ADMIN' FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Un administrateur est obligatoire pour la decision.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER player_verifications_check_reviewer BEFORE INSERT OR UPDATE ON public.player_verifications
FOR EACH ROW EXECUTE FUNCTION public.check_verification_reviewer();
COMMIT;

SELECT 'users' AS table_name,count(*) AS rows FROM public.users
UNION ALL SELECT 'player_profiles',count(*) FROM public.player_profiles
UNION ALL SELECT 'club_profiles',count(*) FROM public.club_profiles
UNION ALL SELECT 'player_verifications',count(*) FROM public.player_verifications
UNION ALL SELECT 'ads',count(*) FROM public.ads
UNION ALL SELECT 'applications',count(*) FROM public.applications;
