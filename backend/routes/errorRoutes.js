const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const errorLogDir = path.join(__dirname, '../logs/client-errors');
if (!fs.existsSync(errorLogDir)) {
  fs.mkdirSync(errorLogDir, { recursive: true });
}

router.post('/report', (req, res) => {
  const { message, stack, url, userAgent, timestamp } = req.body;
  const ip = req.ip || 
             req.headers['x-forwarded-for'] || 
             req.connection.remoteAddress;
  
  const errorLog = {
    timestamp: timestamp || new Date().toISOString(),
    ip,
    url,
    userAgent: userAgent || req.headers['user-agent'],
    message,
    stack
  };
  
  const logFile = path.join(errorLogDir, `client-errors-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFile(logFile, JSON.stringify(errorLog) + '\n', (err) => {
    if (err) console.error('Erreur d\'écriture dans le fichier de log:', err);
  });
  
  console.error('Erreur client reçue:', errorLog);
  
  res.status(200).json({ message: 'Erreur enregistrée' });
});

module.exports = router;