"""Tests PostgreSQL isoles : python3 database/tests/run.py (sans sudo)."""
import os
from pathlib import Path
import subprocess
import tempfile

source = Path(__file__).resolve().parents[1]
if not (source / 'schema.sql').exists():
    source = Path(__file__).resolve().parent  # preparation avant copie au depot
bin_dir = Path(subprocess.check_output(['pg_config', '--bindir'], text=True).strip())

with tempfile.TemporaryDirectory(prefix='mercasport-sql-tests-') as scratch:
    root = Path(scratch)
    data, sock = root / 'data', root / 'socket'
    sock.mkdir()
    subprocess.run([str(bin_dir / 'initdb'), '-D', str(data), '-A', 'trust',
                    '--no-locale', '--encoding=UTF8'], check=True, stdout=subprocess.DEVNULL)
    # Aucun port TCP expose : socket dans un dossier prive temporaire.
    subprocess.run([str(bin_dir / 'pg_ctl'), '-D', str(data), '-l', str(root / 'log'),
                    '-o', f"-k {sock} -p 15432 -c listen_addresses=''", '-w', 'start'],
                   check=True, stdout=subprocess.DEVNULL)
    env = os.environ | {'PGHOST': str(sock), 'PGPORT': '15432', 'PGDATABASE': 'postgres'}

    def query(sql, success=True):
        result = subprocess.run([str(bin_dir / 'psql'), '-X', '-At', '-v', 'ON_ERROR_STOP=1'],
                                input=sql, env=env, text=True, capture_output=True)
        if success and result.returncode:
            raise RuntimeError(result.stderr)
        if not success and result.returncode == 0:
            raise AssertionError('Une erreur SQL etait attendue')
        return result.stdout.strip()

    def load(name):
        return query((source / name).read_text())

    def snapshot():
        return query('''SELECT json_build_array(
            (SELECT json_agg(t ORDER BY id) FROM users t),
            (SELECT json_agg(t ORDER BY id) FROM clubs t),
            (SELECT json_agg(t ORDER BY id) FROM players t),
            (SELECT json_agg(t ORDER BY id) FROM ads t),
            (SELECT json_agg(t ORDER BY id) FROM applications t));''')

    try:
        load('schema.sql')
        load('seed.sql')
        assert query('SELECT count(*) FROM users') == '17'
        assert query('SELECT count(*) FROM clubs') == '13'
        assert query('SELECT count(*) FROM players') == '3'
        assert query('SELECT count(*) FROM ads') == '4'
        assert query('SELECT count(*) FROM approved_ads') == '2'
        assert query('SELECT count(*) FROM applications') == '1'
        assert query("SELECT string_agg(name, ', ' ORDER BY name) FROM users WHERE role='player'") == 'Joel Lopes Ribeiro, Matteo GrosBras, Thomas Lapin'
        original = snapshot()
        load('schema.sql')
        load('seed.sql')
        assert original == snapshot(), 'Un second passage a modifie les donnees'
        workflow = source / 'tests/workflow.sql'
        if not workflow.exists():
            workflow = source / 'workflow.sql'
        query(workflow.read_text())
        assert original == snapshot(), 'Le test de workflow a laisse des donnees'
        print('OK : creation, seed, noms des 3 joueurs, relance sans doublon, workflow et contraintes.')

        # Verifier les modeles pg ($1...) sans executer leurs ecritures.
        queries = '\n'.join(line for line in (source / 'queries.sql').read_text().splitlines()
                            if not line.lstrip().startswith('--'))
        for index, statement in enumerate(queries.split(';')):
            if statement.strip():
                query(f'PREPARE query_{index} AS {statement};')
        print('OK : toutes les requetes parametrees sont preparables par PostgreSQL.')

        # Une base distincte reproduit les deux tables actuelles de Joel.
        query('CREATE DATABASE existing;')
        env['PGDATABASE'] = 'existing'
        query('''CREATE TABLE users (
          id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          name varchar(100) NOT NULL, email varchar(255) UNIQUE NOT NULL,
          password_hash text NOT NULL, role varchar(10) NOT NULL CHECK(role IN ('player','club','admin')),
          created_at timestamptz NOT NULL DEFAULT current_timestamp
        ); CREATE TABLE clubs (
          id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id integer NOT NULL UNIQUE REFERENCES users(id),
          name varchar(150) NOT NULL, city varchar(100) NOT NULL, divisions text
        ); INSERT INTO users(name,email,password_hash,role)
        VALUES ('AS Thomas','thomas.existant@mercasport.example','!hash-existant!','club');
        INSERT INTO clubs(user_id,name,city,divisions) VALUES(1,'AS Thomas','Strasbourg','R1');''')
        load('schema.sql')
        load('seed.sql')
        assert query("SELECT id || ':' || user_id || ':' || status FROM clubs WHERE name='AS Thomas'") == '1:1:pending'
        assert query("SELECT password_hash FROM users WHERE email='thomas.existant@mercasport.example'") == '!hash-existant!'
        assert query("SELECT count(*) FROM users WHERE email='thomas@mercasport.example'") == '0'
        assert query('SELECT count(*) FROM players') == '3'
        # Les annonces suivent aussi le compte existant si son email change.
        query("UPDATE users SET email='hegenheim.existant@mercasport.example' WHERE email='hegenheim@mercasport.example';")
        original = snapshot()
        load('seed.sql')
        assert original == snapshot(), 'Le second import a change les comptes ou cree des doublons'
        assert query("SELECT count(*) FROM users WHERE email='hegenheim@mercasport.example'") == '0'
        print('OK : comptes de clubs avec emails personnalises conserves, trois joueurs ajoutes, relance sans doublon.')

        query('CREATE DATABASE legacy;')
        env['PGDATABASE'] = 'legacy'
        query('CREATE TABLE users (id integer PRIMARY KEY, email text, password text);')
        query((source / 'schema.sql').read_text(), success=False)
        assert query("SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name='password'") == '1'
        print('OK : ancienne structure incompatible refusee sans suppression.')
    finally:
        subprocess.run([str(bin_dir / 'pg_ctl'), '-D', str(data), '-m', 'fast', '-w', 'stop'],
                       check=True, stdout=subprocess.DEVNULL)
