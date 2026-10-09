const count = value => [...value].length;
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function validateRegistration(body) {
  const errors = {};
  const data = {};
  if (!plainObject(body)) return { errors: { body: 'Envoyer un objet JSON.' } };
  const allowed = ['email', 'username', 'password', 'role', 'profile'];
  if (Object.keys(body).some(key => !allowed.includes(key))) {
    errors.body = 'Champs autorisés : email, username, password, role, profile.';
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const [local = '', domain = '', extra] = email.split('@');
  const labels = domain.split('.');
  if (!email || email.length > 254 || local.length > 64 || extra !== undefined
    || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)
    || local.startsWith('.') || local.endsWith('.') || local.includes('..')
    || labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
    || !/^[a-z]{2,63}$/i.test(labels.at(-1))) {
    errors.email = 'E-mail invalide (adresse ASCII, 254 caractères maximum).';
  } else data.email = email;

  const username = typeof body.username === 'string' ? body.username.trim().normalize('NFC') : '';
  if (count(username) < 3 || count(username) > 50
    || !/^[\p{L}\p{N} ._'’-]+$/u.test(username)) {
    errors.username = 'Pseudo de 3 à 50 caractères : lettres, chiffres, espaces, point, tiret, apostrophe ou underscore.';
  } else data.username = username;

  if (typeof body.password !== 'string' || count(body.password) < 15
    || count(body.password) > 128 || Buffer.byteLength(body.password, 'utf8') > 512
    || !body.password.trim() || /[\u0000-\u001f\u007f]/.test(body.password)) {
    errors.password = 'Mot de passe de 15 à 128 caractères, sans caractères de contrôle.';
  } else data.password = body.password; // Ne jamais retirer les espaces du mot de passe.

  if (!['PLAYER', 'CLUB'].includes(body.role)) {
    errors.role = 'Rôle autorisé : PLAYER ou CLUB.';
  } else data.role = body.role;

  if (!plainObject(body.profile)) {
    errors.profile = 'Un objet profile est obligatoire.';
    return { errors, data };
  }
  const profile = body.profile;
  const output = {};
  const fields = body.role === 'CLUB' ? ['name', 'city', 'divisions']
    : ['first_name', 'last_name', 'birth_date', 'position', 'preferred_foot', 'height_cm', 'current_club'];
  if (Object.keys(profile).some(key => !fields.includes(key))) {
    errors.profile = 'Un champ du profil est inconnu ou incompatible avec le rôle.';
  }
  function text(field, max, required = false) {
    const value = profile[field];
    if (!required && (value == null || value === '')) { output[field] = null; return; }
    if (typeof value !== 'string' || !value.trim() || count(value.trim()) > max
      || /[\u0000-\u001f\u007f]/.test(value)) {
      errors[`profile.${field}`] = `Texte ${required ? 'obligatoire' : 'facultatif'}, ${max} caractères maximum.`;
    } else output[field] = value.trim().normalize('NFC');
  }
  if (body.role === 'CLUB') {
    text('name', 150, true);
    text('city', 100, true);
    text('divisions', 100);
  } else if (body.role === 'PLAYER') {
    text('first_name', 100, true);
    text('last_name', 100, true);
    text('position', 100);
    text('current_club', 150);
    const foot = profile.preferred_foot;
    if (foot != null && !['RIGHT', 'LEFT', 'BOTH'].includes(foot)) {
      errors['profile.preferred_foot'] = 'Utiliser RIGHT, LEFT ou BOTH.';
    } else output.preferred_foot = foot ?? null;
    const height = profile.height_cm;
    if (height != null && (!Number.isInteger(height) || height < 100 || height > 250)) {
      errors['profile.height_cm'] = 'Taille entière entre 100 et 250 cm.';
    } else output.height_cm = height ?? null;
    const birth = profile.birth_date;
    if (birth != null) {
      const validFormat = typeof birth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(birth);
      const date = validFormat ? new Date(`${birth}T00:00:00Z`) : new Date(NaN);
      if (!Number.isFinite(date.getTime()) || Number(birth.slice(0, 4)) < 1 || date.toISOString().slice(0, 10) !== birth
        || birth > new Date().toISOString().slice(0, 10)) {
        errors['profile.birth_date'] = 'Date réelle non future au format AAAA-MM-JJ.';
      } else output.birth_date = birth;
    } else output.birth_date = null;
  }
  data.profile = output;
  return { errors, data };
}

module.exports = { validateRegistration };
