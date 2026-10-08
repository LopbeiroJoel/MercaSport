// Les URL relatives utilisent le même serveur que la page, en local et sur Vercel.
const list = document.getElementById('ads-list');
const detail = document.getElementById('ads-detail');
const content = document.getElementById('ads-content');
const closeBtn = document.getElementById('x-detail');
let detailRequest = 0;

function paragraph(text) {
  const node = document.createElement('p');
  node.textContent = text;
  return node;
}

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
  return response.json();
}

async function showDetail(ad, button) {
  const request = ++detailRequest;
  button.disabled = true;
  content.replaceChildren(paragraph('Chargement de l’annonce…'));
  detail.showModal();
  try {
    // Le détail est relu depuis l’API au moment du clic.
    const data = await readJson(`/ads/${ad.id}`);
    if (request !== detailRequest || !detail.open) return;
    const title = document.createElement('h2');
    title.textContent = data.title;
    content.replaceChildren(title,
      paragraph(`Club : ${data.club}`),
      paragraph(`Localisation : ${data.location || 'Non précisée'}`),
      paragraph(`Description : ${data.description || data.short_description || 'Non précisée'}`));
  } catch {
    if (request === detailRequest && detail.open) {
      content.replaceChildren(paragraph('Impossible de charger cette annonce. Fermez cette fenêtre et réessayez.'));
    }
  } finally {
    button.disabled = false;
  }
}

async function loadAds() {
  list.replaceChildren();
  try {
    const ads = await readJson('/ads');
    if (!Array.isArray(ads)) throw new Error('Réponse API invalide');
    if (!ads.length) {
      const item = document.createElement('li');
      item.textContent = 'Aucune annonce pour le moment.';
      list.append(item);
    }
    for (const ad of ads) {
      const item = document.createElement('li');
      const title = document.createElement('h3');
      title.textContent = ad.title;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Voir les détails';
      button.addEventListener('click', () => showDetail(ad, button));
      item.append(title, paragraph(ad.club),
        paragraph(ad.location || 'Localisation non précisée'),
        paragraph(ad.short_description || ad.description || ''), button);
      list.append(item);
    }
  } catch {
    const item = document.createElement('li');
    item.textContent = 'Impossible de charger les offres. Veuillez réessayer plus tard.';
    list.append(item);
  }
}

closeBtn.addEventListener('click', () => detail.close());
detail.addEventListener('close', () => { detailRequest += 1; });
detail.addEventListener('click', event => {
  if (event.target === detail) detail.close();
});
loadAds();
