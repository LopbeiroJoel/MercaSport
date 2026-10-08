// ===== 1. RÉCUPÉRER LES ÉLÉMENTS DE LA PAGE =====

const list = document.getElementById("ads-list");       // la <ul> qui contiendra les cartes d'offres
const detail = document.getElementById("ads-detail");   // le <dialog> (la modale entière)
const content = document.getElementById("ads-content"); // la zone de contenu, vidée et remplie à chaque clic
const closeBtn = document.getElementById("x-detail");   // la croix

// ===== 2. CHARGER LES OFFRES ET CRÉER LES CARTES =====

async function loadAds() {
  try {
    const response = await fetch("ads.json");           // récupère les données
    if (!response.ok) {                                 // statut 404, 500... ?
      throw new Error("Erreur " + response.status);     // saute directement au catch
    }
    const ads = await response.json();                  // convertit le JSON en tableau

    ads.forEach(ad => {                                 // pour chaque offre ; "ad" = l'offre en cours

      // --- La carte dans la liste ---
      const li = document.createElement("li");

      const title = document.createElement("h3");
      title.textContent = ad.title;

      const name = document.createElement("p");
      name.textContent = ad.club;

      const location = document.createElement("p");
      location.textContent = ad.location;

      const description = document.createElement("p");
      description.textContent = ad.description;

      li.appendChild(title);
      li.appendChild(name);
      li.appendChild(location);
      li.appendChild(description);
      list.appendChild(li);                             // accroché à la liste une seule fois

      // --- Le bouton "View details" ---
      const button = document.createElement("button");
      button.textContent = "View details";

      button.addEventListener("click", () => {          // s'exécute AU CLIC uniquement
        content.innerHTML = "";                         // vide la zone de contenu (la croix reste)

        const detailTitle = document.createElement("h2");
        detailTitle.textContent = ad.title;
        content.appendChild(detailTitle);

        const club = document.createElement("p");
        club.textContent = "Club : " + ad.club;
        content.appendChild(club);

        const place = document.createElement("p");
        place.textContent = "Location : " + ad.location;
        content.appendChild(place);

        const fullDescription = document.createElement("p");
        fullDescription.textContent = "Description : " + ad.description;
        content.appendChild(fullDescription);

        detail.showModal();                             // ouvre la modale
      });

      li.appendChild(button);                           // le bouton est accroché à la carte, en dernier
    });

  } catch (error) {
    console.error(error);                               // message pour le développeur

    const message = document.createElement("p");        // message pour le visiteur
    message.textContent = "Impossible de charger les offres. Veuillez réessayer plus tard.";
    list.appendChild(message);
  }
}

loadAds();                                              // appel de la fonction, une seule fois

// ===== 3. FERMETURE DE LA MODALE =====

closeBtn.addEventListener("click", () => {              // clic sur la croix
  detail.close();
});

detail.addEventListener("click", (event) => {           // clic n'importe où sur le <dialog>
  if (event.target === detail) {                        // seulement si c'est le fond assombri
    detail.close();
  }
});