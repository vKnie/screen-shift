const express = require('express');
const cors = require('cors');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');
const fs = require('fs');

const app = express();

const logDir = path.join(__dirname, 'logs');

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

const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 204,
};


app.use(cors(corsOptions));

app.get('/logs', (req, res) => {
  const logs = [];

  try {
    const logFiles = fs.readdirSync(logDir).filter(file => file.endsWith('.log'));

    logFiles.forEach(file => {
      const filePath = path.join(logDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      logs.push(...content.split('\n').filter(line => line.trim() !== ''));
    });
  } catch (error) {
    console.error('Erreur lors de la lecture des fichiers de logs:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des logs' });
  }

  res.json(logs);
});

app.use(require('morgan')('combined', { stream: { write: message => logger.info(message.trim()) } }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const picturesRoutes = require('./routes/picturesRoutes');
const screensRoutes = require('./routes/screensRoutes');

app.use('/pictures', picturesRoutes);
app.use('/screens', screensRoutes);

const uploadFolder = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadFolder));

module.exports = app;
