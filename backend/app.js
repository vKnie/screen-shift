const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Configuration pour fonctionner correctement derrière un proxy HTTPS
app.set('trust proxy', 1);

// Middleware de journalisation des requêtes
app.use((req, res, next) => {
  const ip = req.ip ||
             req.headers['x-forwarded-for'] ||
             req.connection.remoteAddress ||
             req.socket.remoteAddress;
 
  const method = req.method;
  const url = req.originalUrl || req.url;
  const protocol = req.secure ? 'HTTPS' : 'HTTP';
 
  console.log(`[${new Date().toISOString()}] IP: ${ip} | ${protocol} | ${method} ${url}`);
  next();
});

// Configuration CORS pour autoriser les requêtes cross-origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
 
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Middleware pour parser les données des requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ajout des en-têtes de sécurité pour HTTPS
app.use((req, res, next) => {
  // Strict-Transport-Security pour forcer les connexions HTTPS
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Protection contre le clickjacking
  res.header('X-Frame-Options', 'DENY');
  
  // Protection contre le sniffing MIME
  res.header('X-Content-Type-Options', 'nosniff');
  
  // Protection XSS
  res.header('X-XSS-Protection', '1; mode=block');
  
  next();
});

// Routes
const errorRoutes = require('./routes/errorRoutes');
app.use('/errors', errorRoutes);

const picturesRoutes = require('./routes/picturesRoutes');
const screensRoutes = require('./routes/screensRoutes');
const groupsRoutes = require('./routes/groupsRoutes');

app.use('/pictures', picturesRoutes);
app.use('/screens', screensRoutes);
app.use('/groups', groupsRoutes);

// Configuration pour servir les fichiers statiques
const uploadFolder = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadFolder, {
  maxAge: '1d'
}));

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error(`Erreur: ${err.message}`);
  res.status(err.status || 500).json({
    message: "Une erreur est survenue"
  });
});

module.exports = app;