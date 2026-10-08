-- Contraintes et cascades : toutes les annonces sont utilisables sans moderation.
BEGIN;
DO $$
DECLARE test_club INTEGER; test_team INTEGER; test_ad INTEGER;
BEGIN
    INSERT INTO clubs(name, city) VALUES ('Club test SQL', 'Test') RETURNING id INTO test_club;
    INSERT INTO teams(club_id, name, division, category)
    VALUES (test_club, 'Équipe D1', 'D1', 'Senior') RETURNING id INTO test_team;
    BEGIN
        INSERT INTO teams(club_id, name, division, category)
        VALUES (test_club, 'Doublon', 'D1', 'Senior');
        RAISE EXCEPTION 'Equipe dupliquee acceptee';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    INSERT INTO ads(team_id, title, position) VALUES (test_team, 'Gardien test', 'Gardien')
    RETURNING id INTO test_ad;
    IF NOT EXISTS (SELECT 1 FROM ads_details WHERE id = test_ad) THEN
        RAISE EXCEPTION 'Annonce creee invisible';
    END IF;
    INSERT INTO applications(ad_id, name, email, phone, message)
    VALUES (test_ad, 'Test direct', ' Test@Test.invalid ', NULL, 'Sans compte obligatoire.');
    BEGIN
        INSERT INTO applications(ad_id, name, email) VALUES (test_ad, 'Doublon', 'test@test.invalid');
        RAISE EXCEPTION 'Doublon email accepte';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO applications(ad_id, email) VALUES (test_ad, 'sans-nom@test.invalid');
        RAISE EXCEPTION 'Nom absent accepte';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;
    BEGIN
        UPDATE ads SET preferred_foot = 'Inconnu' WHERE id = test_ad;
        RAISE EXCEPTION 'Pied invalide accepte';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO ads(team_id, title, position) VALUES (-1, 'Orphelin', 'Gardien');
        RAISE EXCEPTION 'Equipe absente acceptee';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    DELETE FROM clubs WHERE id = test_club;
    IF EXISTS (SELECT 1 FROM teams WHERE id = test_team)
       OR EXISTS (SELECT 1 FROM ads WHERE id = test_ad)
       OR EXISTS (SELECT 1 FROM applications WHERE ad_id = test_ad) THEN
        RAISE EXCEPTION 'Cascade club -> equipes -> annonces -> candidatures incomplete';
    END IF;
END $$;
ROLLBACK;
