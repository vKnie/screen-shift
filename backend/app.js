const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
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

app.use(cors({
  origin: ['https://195.221.158.77', 'http://195.221.158.77', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-Content-Type-Options', 'nosniff');
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