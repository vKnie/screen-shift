const app = require('./app');
const http = require('http');

const port = process.env.PORT || 9999;
app.set('port', port);

const server = http.createServer(app);

server.listen(port);

server.on('error', (error) => {
  console.error('Erreur de serveur:', error);
});

server.on('listening', () => {
  const addr = server.address();
  console.log(`Serveur démarré sur le port ${addr.port}`);
});