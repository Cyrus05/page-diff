const fs = require('fs');
const config = require('./config');

try {
  require('dotenv-safe').config({
    allowEmptyValues: true
  });
} catch(e) {
  console.error(e.message);
  process.exit(1)
}

if (!fs.existsSync(config.resultsPath)) {
  fs.mkdirSync(config.resultsPath);
}
