"""Vrais appels HTTP/SQL dans un cluster jetable, sans toucher à mercasport."""
import os
from pathlib import Path
import subprocess
import tempfile

repo = Path(__file__).resolve().parents[1]
pg_bin = Path(subprocess.check_output(['pg_config', '--bindir'], text=True).strip())
with tempfile.TemporaryDirectory(prefix='mercasport-api-') as scratch:
    root = Path(scratch)
    data, socket = root / 'data', root / 'socket'
    socket.mkdir()
    subprocess.run([str(pg_bin / 'initdb'), '-D', str(data), '-A', 'trust',
                    '--no-locale', '--encoding=UTF8'], check=True, stdout=subprocess.DEVNULL)
    subprocess.run([str(pg_bin / 'pg_ctl'), '-D', str(data), '-l', str(root / 'pg.log'),
                    '-o', f"-k {socket} -p 15433 -c listen_addresses=''", '-w', 'start'],
                   check=True, stdout=subprocess.DEVNULL)
    env = os.environ.copy()
    for key in ['DATABASE_URL', 'VERCEL', 'DB_PASSWORD']:
        env.pop(key, None)
    env.update(PGHOST=str(socket), PGPORT='15433', PGDATABASE='postgres',
               DB_HOST=str(socket), DB_PORT='15433', DB_NAME='postgres',
               DB_USER=subprocess.check_output(['id', '-un'], text=True).strip())
    try:
        for name in ['schema.sql', 'seed.sql']:
            with (repo / 'database' / name).open() as stream:
                result = subprocess.run([str(pg_bin / 'psql'), '-X', '-v', 'ON_ERROR_STOP=1'],
                                        env=env, stdin=stream, text=True, capture_output=True)
            if result.returncode:
                raise RuntimeError(result.stderr)
        subprocess.run(['node', '--test', 'tests/api.test.js'], cwd=repo, env=env, check=True)
        # Test navigateur optionnel : n’ajoute aucune dépendance au projet livré.
        if env.get('MERCASPORT_BROWSER_TEST'):
            subprocess.run(['node', env['MERCASPORT_BROWSER_TEST']], cwd=repo, env=env, check=True)
    finally:
        subprocess.run([str(pg_bin / 'pg_ctl'), '-D', str(data), '-m', 'fast', '-w', 'stop'],
                       check=True, stdout=subprocess.DEVNULL)
