const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires, If-Modified-Since, If-None-Match, X-API-KEY');
  res.header('Access-Control-Expose-Headers', 'Content-Range, X-Total-Count, Cache-Control');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use((req, res, next) => {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const picturesRoutes = require('./routes/picturesRoutes');
const screensRoutes = require('./routes/screensRoutes');
const groupsRoutes = require('./routes/groupsRoutes');

app.use('/pictures', picturesRoutes);
app.use('/screens', screensRoutes);
app.use('/groups', groupsRoutes);

const uploadFolder = path.join(__dirname, 'uploads');
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
}, express.static(uploadFolder));

app.use((err, req, res, next) => {
  console.error(`Erreur: ${err.message}`);
  res.status(err.status || 500).json({
    message: err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

module.exports = app;