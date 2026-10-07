-- Test fonctionnel SQL : aucune donnee de test conservee (ROLLBACK).
BEGIN;
DO $$
DECLARE owner_id INTEGER; player_user INTEGER; player_profile INTEGER;
        club_id INTEGER; ad_id INTEGER; actual_status TEXT;
BEGIN
    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Club test', 'workflow-club@test.invalid', '!test!', 'club') RETURNING id INTO owner_id;
    INSERT INTO clubs (user_id, name, city) VALUES (owner_id, 'Club test', 'Test')
    RETURNING id, status INTO club_id, actual_status;
    IF actual_status <> 'pending' THEN RAISE EXCEPTION 'Club non pending par defaut'; END IF;

    BEGIN
        INSERT INTO ads (club_id, title, position, city, description)
        VALUES (club_id, 'Test', 'Gardien', 'Test', 'Test');
        RAISE EXCEPTION 'Un club pending a pu creer une annonce';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    UPDATE clubs SET status = 'approved' WHERE id = club_id;
    INSERT INTO ads (club_id, title, position, city, description)
    VALUES (club_id, 'Test', 'Gardien', 'Test', 'Test') RETURNING id, status INTO ad_id, actual_status;
    IF actual_status <> 'pending' THEN RAISE EXCEPTION 'Annonce non pending par defaut'; END IF;
    IF EXISTS (SELECT 1 FROM approved_ads WHERE id = ad_id) THEN
        RAISE EXCEPTION 'Annonce pending visible publiquement';
    END IF;

    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Joueur test', 'workflow-player@test.invalid', '!test!', 'player') RETURNING id INTO player_user;
    INSERT INTO players (user_id, first_name, last_name)
    VALUES (player_user, 'Joueur', 'Test') RETURNING id INTO player_profile;

    BEGIN
        INSERT INTO applications (player_id, ad_id) VALUES (player_profile, ad_id);
        RAISE EXCEPTION 'Candidature autorisee sur annonce pending';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    UPDATE ads SET status = 'approved' WHERE id = ad_id;
    IF NOT EXISTS (SELECT 1 FROM approved_ads WHERE id = ad_id) THEN
        RAISE EXCEPTION 'Annonce approuvee invisible';
    END IF;
    INSERT INTO applications (player_id, ad_id, message) VALUES (player_profile, ad_id, 'Je postule.');
    BEGIN
        INSERT INTO applications (player_id, ad_id) VALUES (player_profile, ad_id);
        RAISE EXCEPTION 'Double candidature acceptee';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;

    UPDATE clubs SET status = 'rejected' WHERE id = club_id;
    IF EXISTS (SELECT 1 FROM approved_ads WHERE id = ad_id) THEN
        RAISE EXCEPTION 'Annonce dun club rejete visible';
    END IF;
    BEGIN
        UPDATE ads SET status = 'approved' WHERE id = ad_id;
        RAISE EXCEPTION 'Approbation possible pour un club rejete';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE clubs SET status = 'inconnu' WHERE id = club_id;
        RAISE EXCEPTION 'Statut invalide accepte';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO players (user_id, first_name, last_name) VALUES (-1, 'Inexistant', 'Test');
        RAISE EXCEPTION 'Cle etrangere absente';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
END $$;
ROLLBACK;
