"""Configurer la connexion PostgreSQL sans afficher ni publier le mot de passe."""
import getpass
import json
import os
from pathlib import Path
import subprocess
from urllib.parse import quote

root = Path(__file__).resolve().parents[1]
target = root / '.env'
if target.exists():
    raise SystemExit('.env existe déjà : modifier ce fichier localement dans VS Code.')

print('Connexion à PostgreSQL local (pas le compte du site ni celui de pgAdmin).')
user = input('Utilisateur PostgreSQL [postgres] : ').strip() or 'postgres'
password = getpass.getpass('Mot de passe PostgreSQL (saisie masquée) : ')
url = f'postgresql://{quote(user, safe="")}:{quote(password, safe="")}@127.0.0.1:5432/mercasport'
check = subprocess.run(['node', '-e', '''
  const pool = require('./backend/db');
  pool.query('SELECT count(*) AS n FROM public.ads_details')
    .then(r => console.log('Connexion OK : ' + r.rows[0].n + ' annonces.'))
    .catch(() => { console.error('Connexion refusée : vérifier le mot de passe PostgreSQL.'); process.exitCode = 1; })
    .finally(() => pool.end());
'''], cwd=root, env=os.environ | {'DATABASE_URL': url}, check=False)
if check.returncode:
    raise SystemExit('Configuration non enregistrée ; aucune donnée modifiée.')

# Ne jamais écraser une configuration créée entre-temps, permissions privées.
fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as stream:
    stream.write('DATABASE_URL=' + json.dumps(url) + '\nPORT=3000\n')
print('.env enregistré localement ; lancer npm start puis ouvrir http://localhost:3000.')
