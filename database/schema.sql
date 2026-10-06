DROP TABLE IF EXISTS clubs;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE clubs (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    divisions VARCHAR(100)
);

INSERT INTO clubs (name, city, divisions)
VALUES
('FC Hégenheim', 'Hégenheim', 'R3 / D4'),
('Strasbourg SUC', 'Strasbourg', 'D1 / D6'),
('SR Colmar', 'Colmar', 'R1 / R3 / D2'),
('FC Saint-Louis', 'Saint-Louis', 'R1 / R3'),
('ASL Robertsau', 'Strasbourg', 'D1 / D5'),
('US Ittenheim', 'Ittenheim', 'R2 / R3 / D4'),
('FC Mulhouse', 'Mulhouse', 'N3 / R3 / D2'),
('FC Truchtersheim', 'Truchtersheim', 'D1 / D5'),
('SR Belfort', 'Belfort', 'R2 / D6'),
('SR Hirsingue', 'Hirsingue', 'R3 / D4'),
('AS Huningue', 'Huningue', 'R2 / D1'),
('AS Coteaux', 'Mulhouse', 'R2 / D3');

SELECT * FROM clubs;