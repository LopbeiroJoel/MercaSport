"""Tests SQL dans un cluster PostgreSQL temporaire, sans connexion a mercasport."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

source = Path(__file__).resolve().parents[1]
if not (source / 'schema.sql').exists():
    source = Path(__file__).resolve().parent
test_dir = source / 'tests' if (source / 'tests').exists() else source
bin_dir = Path(subprocess.check_output(['pg_config', '--bindir'], text=True).strip())

with tempfile.TemporaryDirectory(prefix='mercasport-teams-tests-') as scratch:
    root = Path(scratch)
    data, sock = root / 'data', root / 'socket'
    sock.mkdir()
    subprocess.run([str(bin_dir / 'initdb'), '-D', str(data), '-A', 'trust',
                    '--no-locale', '--encoding=UTF8'], check=True, stdout=subprocess.DEVNULL)
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
        return result.stdout.strip() if success else result.stderr

    def load(name):
        return query((source / name).read_text())

    def snapshot():
        return query('''SELECT json_build_array(
            (SELECT json_agg(t ORDER BY id) FROM users t),
            (SELECT json_agg(t ORDER BY id) FROM players t),
            (SELECT json_agg(t ORDER BY id) FROM clubs t),
            (SELECT json_agg(t ORDER BY id) FROM teams t),
            (SELECT json_agg(t ORDER BY id) FROM ads t),
            (SELECT json_agg(t ORDER BY id) FROM applications t));''')

    def verify_counts():
        counts = query('SELECT (SELECT count(*) FROM clubs), (SELECT count(*) FROM teams), (SELECT count(*) FROM ads), (SELECT count(*) FROM applications);')
        assert counts == '13|28|28|3', counts
        assert query('SELECT count(*) FROM teams t WHERE NOT EXISTS (SELECT 1 FROM ads a WHERE a.team_id=t.id)') == '0'
        assert query("SELECT count(*) FROM teams WHERE division='NAT3'") == '0'
        assert query('SELECT count(*) FROM ads_details') == '28'
        assert query("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('clubs','ads') AND column_name='status'") == '0'
        assert query('SELECT count(DISTINCT position) FROM ads') == '10'
        assert query("SELECT count(*) FROM ads WHERE preferred_foot IS NULL") != '0'
        assert query("SELECT count(*) FROM ads WHERE position IN ('Gardien','Défenseur central') AND requirements ~* '(coups francs|corners)'") == '0'
        assert query("SELECT count(*) FROM ads WHERE short_description IS NULL OR requirements IS NULL OR location IS NULL OR missions IS NULL") == '0'
        expected = {'FC Hégenheim': 2, 'Strasbourg SUC': 2, 'SR Colmar': 3,
                    'FC Saint-Louis': 2, 'ASL Robertsau': 2, 'US Ittenheim': 3,
                    'FC Mulhouse': 3, 'FC Truchtersheim': 2, 'SR Belfort': 2,
                    'SR Hirsingue': 2, 'AS Huningue': 2, 'AS Coteaux': 2, 'AS Thomas': 1}
        actual = json.loads(query('SELECT json_object_agg(name,n) FROM (SELECT c.name,count(t.id) n FROM clubs c LEFT JOIN teams t ON t.club_id=c.id GROUP BY c.id,c.name) s'))
        assert actual == expected, actual

    try:
        load('schema.sql')
        load('seed.sql')
        verify_counts()
        assert query('SELECT count(*) FROM users') == '17'
        assert query("SELECT string_agg(name, ', ' ORDER BY name) FROM users WHERE role='player'") == 'Joel Lopes Ribeiro, Matteo GrosBras, Thomas Lapin'
        original = snapshot()
        load('schema.sql')
        load('seed.sql')
        assert original == snapshot(), 'Relance non idempotente'
        query((test_dir / 'workflow.sql').read_text())
        assert original == snapshot(), 'Test fonctionnel non annule'
        load('verification.sql')
        print('OK : 13 clubs, 28 equipes, 28 annonces sans statut, 3 candidatures, aucun doublon ni equipe vide.')
        print('OK : postes/qualites, pieds facultatifs, candidatures, contraintes et cascades.')
        queries = '\n'.join(line for line in (source / 'queries.sql').read_text().splitlines()
                            if not line.lstrip().startswith('--'))
        for index, statement in enumerate(queries.split(';')):
            if statement.strip():
                query(f'PREPARE query_{index} AS {statement};')
        print('OK : toutes les requetes parametrees et de verification sont executables.')

        query('CREATE DATABASE migration;')
        env['PGDATABASE'] = 'migration'
        query((test_dir / 'legacy.sql').read_text())
        load('schema.sql')
        load('seed.sql')
        verify_counts()
        assert query("SELECT id || ':' || user_id FROM clubs WHERE name='AS Thomas'") == '4:4'
        assert query("SELECT password_hash FROM users WHERE email='thomas.existant@test.invalid'") == '!hash-thomas-conserve!'
        assert query("SELECT count(*) FROM users WHERE email IN ('thomas@mercasport.example','hegenheim@mercasport.example')") == '0'
        assert query("SELECT name || ':' || email || ':' || message FROM applications WHERE id=1") == 'Joel Lopes Ribeiro:joel.player@mercasport.example:Candidature existante à conserver.'
        assert query("SELECT t.division FROM ads a JOIN teams t ON t.id=a.team_id WHERE a.id=4") == 'R3'
        original = snapshot()
        load('schema.sql')
        load('seed.sql')
        assert original == snapshot(), 'Migration rejouee avec doublons/perte'
        query((test_dir / 'workflow.sql').read_text())
        print('OK : migration des 4 anciennes annonces, comptes/hashes/IDs et candidature conserves.')

        query('CREATE DATABASE ambiguous;')
        env['PGDATABASE'] = 'ambiguous'
        query((test_dir / 'legacy.sql').read_text())
        query("INSERT INTO ads(club_id,title,position,city,description) VALUES(1,'Annonce sans division','Gardien','Test','Test');")
        error = query((source / 'schema.sql').read_text(), success=False)
        assert 'Division inconnue' in error, error
        assert query('SELECT count(*) FROM ads') == '5'
        assert query("SELECT count(*) FROM information_schema.columns WHERE table_name='ads' AND column_name='team_id'") == '0'
        print('OK : annonce ambiguë refusee avec rollback, sans attribution arbitraire ni suppression.')

        query('CREATE DATABASE incompatible;')
        env['PGDATABASE'] = 'incompatible'
        query('CREATE TABLE users(id integer PRIMARY KEY, email text, password text);')
        error = query((source / 'schema.sql').read_text(), success=False)
        assert 'incompatible' in error
        assert query("SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name='password'") == '1'
        print('OK : ancienne structure de comptes incompatible refusee sans suppression.')
    finally:
        subprocess.run([str(bin_dir / 'pg_ctl'), '-D', str(data), '-m', 'fast', '-w', 'stop'],
                       check=True, stdout=subprocess.DEVNULL)
