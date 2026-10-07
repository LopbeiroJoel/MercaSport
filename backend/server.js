const express = require('express');
const app = express();
const PORT = 3000;

// Route de santé (Health Check)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date()
    });
});

app.get('/ads', (req, res) => {
    // Exemple de données d'annonces temporaire avant d'avoir les vrais données de la BDD
    const ads = [
        { id: 1, title: 'Annonce 1', short_description: 'Description de l\'annonce 1', club: 'Club A', position: 'attaquant' },
        { id: 2, title: 'Annonce 2', short_description: 'Description de l\'annonce 2', club: 'Club B', position: 'défenseur' },
        { id: 3, title: 'Annonce 3', short_description: 'Description de l\'annonce 3', club: 'Club C', position: 'milieu' }
    ];

    res.status(200).json(ads);
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});