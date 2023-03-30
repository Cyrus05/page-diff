const fs = require('fs');
const { parseScreenSizes } = require('./helpers');

try {
  require('dotenv-safe').config({
    allowEmptyValues: true
  });
} catch(e) {
  console.error(e.message);
  process.exit(1)
}

const resultsPath = process.env.RESULTS_PATH || './.results/';
if (!fs.existsSync(resultsPath)) {
  fs.mkdirSync(resultsPath);
}

const env = {
  screenSizes: parseScreenSizes(process.env.SCREEN_SIZE || '1440x1440'),
  screenshotTimeout: Number(process.env.SCREENSHOT_TIMEOUT) || 10000,
  resultsPath: process.env.RESULTS_PATH || './.results',
  cookie1: process.env.COOKIE1 || '',
  cookie2: process.env.COOKIE2 || '',
  puppeteerConfig: {
    headless: process.env.PUPPETEER_HEADLESS === 'false' ? false : true,
    timeout: Number(process.env.PUPPETEER_TIMEOUT)
  }
}

console.log('env:')
console.log(env)
console.log('\n')

exports.env = env;