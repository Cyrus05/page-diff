const fs = require('fs');
const config = require('./config');

if (!fs.existsSync(config.resultsPath)) {
  fs.mkdirSync(config.resultsPath);
}