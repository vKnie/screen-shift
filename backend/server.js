const app = require('./app');
const port = 9999;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
