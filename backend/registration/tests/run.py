"""Vrais tests HTTP/PostgreSQL dans un cluster temporaire, jamais sur Neon/mercasport."""
import os
from pathlib import Path
import subprocess
import tempfile

repo = Path(__file__).resolve().parents[3]
fixtures = Path(__file__).resolve().parent
pg_bin = Path(subprocess.check_output(['pg_config', '--bindir'], text=True).strip())
with tempfile.TemporaryDirectory(prefix='mercasport-registration-') as scratch:
    root = Path(scratch)
    data, socket = root / 'data', root / 'socket'
    socket.mkdir()
    subprocess.run([str(pg_bin / 'initdb'), '-D', str(data), '-A', 'trust',
                    '--no-locale', '--encoding=UTF8'], check=True, stdout=subprocess.DEVNULL)
    subprocess.run([str(pg_bin / 'pg_ctl'), '-D', str(data), '-l', str(root / 'pg.log'),
                    '-o', f"-k {socket} -p 15434 -c listen_addresses=''", '-w', 'start'],
                   check=True, stdout=subprocess.DEVNULL)
    env = os.environ.copy()
    for key in ['DATABASE_URL', 'VERCEL', 'DB_PASSWORD']:
        env.pop(key, None)
    env.update(PGHOST=str(socket), PGPORT='15434', PGDATABASE='postgres',
               DB_HOST=str(socket), DB_PORT='15434', DB_NAME='postgres',
               DB_USER=subprocess.check_output(['id', '-un'], text=True).strip())
    try:
        for file in [repo / 'database/schema.sql', repo / 'database/seed.sql',
                     fixtures / 'neon-before-db-01-03.sql', fixtures / 'db-01-03-applied.sql']:
            with file.open() as stream:
                result = subprocess.run([str(pg_bin / 'psql'), '-X', '-v', 'ON_ERROR_STOP=1'],
                                        env=env, stdin=stream, text=True, capture_output=True)
            if result.returncode:
                raise RuntimeError(result.stderr)
        subprocess.run(['node', '--test', 'backend/registration/tests/register.test.js',
                        'tests/api.test.js'], cwd=repo, env=env, check=True)
    finally:
        subprocess.run([str(pg_bin / 'pg_ctl'), '-D', str(data), '-m', 'fast', '-w', 'stop'],
                       check=True, stdout=subprocess.DEVNULL)
