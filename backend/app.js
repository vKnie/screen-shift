const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Configuration CORS plus permissive
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Autorisation du cache pour améliorer les performances avec les écrans
// Suppression des en-têtes qui empêchent la mise en cache
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const picturesRoutes = require('./routes/picturesRoutes');
const screensRoutes = require('./routes/screensRoutes');
const groupsRoutes = require('./routes/groupsRoutes');

app.use('/pictures', picturesRoutes);
app.use('/screens', screensRoutes);
app.use('/groups', groupsRoutes);

const uploadFolder = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadFolder, {
  // Activation du cache pour les fichiers statiques
  maxAge: '1d'
}));

// Gestion d'erreur simplifiée
app.use((err, req, res, next) => {
  console.error(`Erreur: ${err.message}`);
  res.status(err.status || 500).json({
    message: "Une erreur est survenue"
  });
});

module.exports = app;