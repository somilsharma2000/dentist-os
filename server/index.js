const express = require('express');
const path = require('path');
const fs = require('fs');
const { router } = require('./api');

const app = express();
app.use(express.json());

app.use('/api', router);

// Serve built frontend in production
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Dentist OS server running on http://localhost:${PORT}`);
});
