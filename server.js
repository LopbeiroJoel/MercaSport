const express = require('express');
const pool = require('./backend/db');
const { configureApp, startServer } = require('./backend/app');

const app = configureApp(express(), pool);

// Vercel importe l’application ; npm start ouvre le serveur local.
module.exports = app;
if (require.main === module) startServer(app);
