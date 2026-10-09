// Point d'entrée de démonstration : le serveur actuel n'est pas modifié.
const express = require('express');
const pool = require('../db');
const { configureApp } = require('../app');
const { createRegistrationRouter } = require('./router');

const app = express();
app.disable('x-powered-by');
app.use('/auth', createRegistrationRouter(pool));
configureApp(app, pool);

module.exports = app;
if (require.main === module) {
  const port = Number(process.env.PORT || 3001);
  app.listen(port, '127.0.0.1', () => console.log(`MercaSport avec inscription : http://localhost:${port}`));
}
