-- Ancienne structure : fixture de migration uniquement, dans une base de test.
CREATE TABLE users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, role VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE players (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL
);
CREATE TABLE clubs (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    name VARCHAR(150) NOT NULL, city VARCHAR(100) NOT NULL, divisions TEXT,
    status VARCHAR(10) NOT NULL DEFAULT 'pending'
        CONSTRAINT clubs_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);
CREATE TABLE ads (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    club_id INTEGER NOT NULL REFERENCES clubs(id),
    title VARCHAR(150) NOT NULL, position VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL, description TEXT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE applications (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id),
    ad_id INTEGER NOT NULL REFERENCES ads(id),
    message TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT applications_player_ad_key UNIQUE (player_id, ad_id)
);
CREATE VIEW approved_ads AS
SELECT a.id, a.club_id, c.name AS club_name, a.title, a.position,
       a.city, a.description, a.created_at
FROM ads a JOIN clubs c ON c.id = a.club_id
WHERE a.status = 'approved' AND c.status = 'approved';

INSERT INTO users(name, email, password_hash, role) VALUES
('HegenheimClub', 'hegenheim.existant@test.invalid', '!hash-conserve!', 'club'),
('SRColmar', 'colmar@mercasport.example', '!hash-conserve!', 'club'),
('FCMulhouse', 'mulhouse@mercasport.example', '!hash-conserve!', 'club'),
('AS Thomas', 'thomas.existant@test.invalid', '!hash-thomas-conserve!', 'club'),
('Joel Lopes Ribeiro', 'joel.player@mercasport.example', '!hash-joueur-conserve!', 'player');
INSERT INTO clubs(user_id, name, city, divisions, status) VALUES
(1, 'FC Hégenheim', 'Hégenheim', 'R3 / D4', 'approved'),
(2, 'SR Colmar', 'Colmar', 'R1 / R3 / D2', 'approved'),
(3, 'FC Mulhouse', 'Mulhouse', 'NAT3 / R3 / D2', 'approved'),
(4, 'AS Thomas', 'Strasbourg', 'R1', 'pending');
INSERT INTO players(user_id, first_name, last_name) VALUES (5, 'Joel', 'Lopes Ribeiro');
INSERT INTO ads(club_id, title, position, city, description, status) VALUES
(1, '[DEMO] Gardien pour la saison', 'Gardien', 'Hégenheim', 'Ancien exemple gardien.', 'approved'),
(2, '[DEMO] Milieu de terrain', 'Milieu', 'Colmar', 'Ancien exemple milieu.', 'approved'),
(1, '[DEMO] Attaquant recherche', 'Attaquant', 'Hégenheim', 'Ancien exemple attaquant.', 'pending'),
(3, '[DEMO] Defenseur recherche', 'Defenseur', 'Mulhouse', 'Ancien exemple defenseur.', 'rejected');
INSERT INTO applications(player_id, ad_id, message) VALUES (1, 1, 'Candidature existante à conserver.');
