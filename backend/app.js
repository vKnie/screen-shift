const express = require('express');
const cors = require('cors');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const app = express();

// Configuration de winston pour les logs
const logDir = path.join(__dirname, 'logs'); // Dossier où les logs seront stockés

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'screenshift-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d'
    })
  ]
});

// Middleware pour logger les requêtes avec morgan et winston
app.use(require('morgan')('combined', { stream: { write: message => logger.info(message.trim()) } }));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const picturesRoutes = require('./routes/picturesRoutes');
const screensRoutes = require('./routes/screensRoutes');

app.use('/pictures', picturesRoutes);
app.use('/screens', screensRoutes);

const uploadFolder = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadFolder));

module.exports = app;
