const express = require('express');
const pool = require('./db');
const { configureApp, startServer } = require('./app');

const app = configureApp(express(), pool);
module.exports = app;
if (require.main === module) startServer(app);
