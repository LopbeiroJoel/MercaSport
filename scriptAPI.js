// ===== 1. RÉCUPÉRER LES ÉLÉMENTS DE LA PAGE =====
// (une seule fois, tout en haut)

const list = document.getElementById("ads-list");       // la <ul> qui contiendra les cartes d'offres
const detail = document.getElementById("ads-detail");   // le <dialog> (la modale entière)
const content = document.getElementById("ads-content"); // la <div> dans la modale, vidée et remplie à chaque clic
const closeBtn = document.getElementById("x-detail");   // la croix, qui reste en place dans la modale
const maModale = document.getElementById("ads-detail"); // le <dialog> (la modale entière)
const API_URL = "http://localhost:3000";


// ===== 3. LA BOUCLE : UNE CARTE PAR OFFRE =====
async function loadAds() {
  try {
    const response = await fetch(API_URL + "/ads");
    if (!response.ok) { 
     throw new Error("Erreur " + response.status); 
} 
    const ads = await response.json();

    ads.forEach(ad => {                                     // pour chaque offre du tableau ; "ad" = l'offre en cours

    // --- La carte dans la liste ---
    const li = document.createElement("li");              // crée le <li> (le parent de la carte)

    const title = document.createElement("h3");           // crée le titre de la carte
    title.textContent = ad.title;                         // lui donne le titre de l'offre

    const name = document.createElement("p");             // crée un paragraphe pour le club
    name.textContent = ad.club;                           // lui donne le nom du club

    const location = document.createElement("p");         // crée un paragraphe pour la localisation
    location.textContent = ad.location;                   // lui donne la localisation

    const description = document.createElement("p");     // crée un paragraphe pour la description
    description.textContent = ad.description;             // lui donne la description

    li.appendChild(title);                                // le titre va dans le <li> (en premier)
    li.appendChild(name);                                 // puis le club
    li.appendChild(location);                             // puis la localisation
    li.appendChild(description);                          // puis la description
    list.appendChild(li);                                 // le <li> rempli est accroché à la liste (une seule fois)

    // --- Le bouton "View details" ---
    const button = document.createElement("button");      // crée le bouton
    button.textContent = "View details";                  // son texte

    button.addEventListener("click", async () => {              
        try {
            const response = await fetch(API_URL + "/ads/" + ad.id);
            if (!response.ok) { 
                throw new Error("Erreur " + response.status); 
            } 
            const data = await response.json();
      
            content.innerHTML = "";                             // vide la zone de contenu (la croix, elle, n'est pas touchée)

            const detailTitle = document.createElement("h2");   // crée le titre du détail
            detailTitle.textContent = data.title;                 // lui donne le titre de CETTE offre
            content.appendChild(detailTitle);                   // l'ajoute dans la zone de contenu

            const club = document.createElement("p");           // crée la ligne du club
            club.textContent = "Club : " + data.club;             // texte avec un préfixe
            content.appendChild(club);                          // ajout dans la zone de contenu

            const place = document.createElement("p");          // crée la ligne de la localisation
            place.textContent = "Location : " + data.location;    // texte avec un préfixe
            content.appendChild(place);                         // ajout dans la zone de contenu

            const fullDescription = document.createElement("p"); // crée la ligne de la description
            fullDescription.textContent = "Description : " + data.description; // texte avec un préfixe
            content.appendChild(fullDescription);               // ajout dans la zone de contenu

            detail.showModal();
              } catch (error) {
            console.error(error);
        }                                 
    });

    li.appendChild(button); 
                                  // le bouton est accroché à la carte, en dernier
    });
      } catch (error) {
    console.error(error);

    const message = document.createElement("p");
    message.textContent = "Impossible de charger les offres. Veuillez réessayer plus tard.";
    list.appendChild(message);
  }
}
loadAds();                                                 

// ===== 4. LA CROIX : EN DEHORS DE LA BOUCLE =====

closeBtn.addEventListener("click", () => {              // au clic sur la croix...
  detail.close();                                       // ...on ferme le <dialog> (même élément que showModal)
});
maModale.addEventListener("click", (event) => {
    if (event.target === maModale) {
        maModale.close();
    }
});