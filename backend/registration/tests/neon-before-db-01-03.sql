-- Fixture du cluster jetable uniquement : état de Neon avant la migration DB-01/02/03.
ALTER TABLE public.users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN username VARCHAR(50);
ALTER TABLE public.users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
CREATE TABLE public.player_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100), last_name VARCHAR(100), birth_date DATE,
  position VARCHAR(50), preferred_foot VARCHAR(20), height_cm INTEGER,
  current_club VARCHAR(150),
  CONSTRAINT valid_height CHECK (height_cm >= 100 AND height_cm <= 250),
  CONSTRAINT valid_foot CHECK (preferred_foot IN ('RIGHT','LEFT','BOTH'))
);
