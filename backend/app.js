const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use((req, res, next) => {
  const ip = req.ip || 
             req.headers['x-forwarded-for'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress;
  
  const method = req.method;
  const url = req.originalUrl || req.url;
  
  console.log(`[${new Date().toISOString()}] IP: ${ip} | ${method} ${url}`);
  next();
});


app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
 
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const errorRoutes = require('./routes/errorRoutes');
app.use('/errors', errorRoutes);

const picturesRoutes = require('./routes/picturesRoutes');
const screensRoutes = require('./routes/screensRoutes');
const groupsRoutes = require('./routes/groupsRoutes');

app.use('/pictures', picturesRoutes);
app.use('/screens', screensRoutes);
app.use('/groups', groupsRoutes);

const uploadFolder = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadFolder, {
  maxAge: '1d'
}));

app.use((err, req, res, next) => {
  console.error(`Erreur: ${err.message}`);
  res.status(err.status || 500).json({
    message: "Une erreur est survenue"
  });
});

module.exports = app;