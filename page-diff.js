const path = require('path');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const { exec } = require('child_process');
const puppeteer = require('puppeteer');
const config = require('./config');

require('./setup');

const args = process.argv.slice(2);
const [url1, url2] = args;
const pageAliasArray = ['PAGE A', 'PAGE B',]
let pageIndex = 0;

const takeSreenshot = async (browser, url) => {
  const pageAlias = pageAliasArray[pageIndex++]
  console.log(pageAlias, `loading ${url}`)

  const page = await browser.newPage();
  await page.setViewport({
    width: config.pageSize[0],
    height: config.pageSize[1]
  });
  await page.goto(url, {
    waitUntil: 'networkidle2'
  });

  console.log(pageAlias, 'scrolling...')
  await autoScroll(page);
  console.log(pageAlias, 'reached bottom.')

  console.log(pageAlias, 'wait for network idle.')
  await page.waitForNetworkIdle({ timeout: config.screenshotTimeout }).catch(() => { console.warn(pageAlias, 'wait for network idle - timeout, go ahead') });

  console.log(pageAlias, 'taking screenshot!')
  const savePath = path.join(config.resultsPath, url.replaceAll(/[:/?]/ig, '') + '.png');
  await page.bringToFront();
  await page.screenshot({ path: savePath, fullPage: true, captureBeyondViewport: false });
  await page.close();
  return savePath;
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      var totalHeight = 0;
      var distance = 200;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

const createTransparentPixels = (width, height) => {
  const pxs = new Array(width * height).fill(1).reduce((arr) => {
    arr.push(0, 0, 0, 0);
    return arr;
  }, []);

  return Buffer.from(pxs);
}

const main = async () => {
  const browser = await puppeteer.launch(config.puppeteer);

  try {
    const [png1, png2] = await Promise.all([
      takeSreenshot(browser, url1),
      takeSreenshot(browser, url2)
    ]);

    const img1 = PNG.sync.read(fs.readFileSync(png1));
    const img2 = PNG.sync.read(fs.readFileSync(png2));
    const width = img1.width;
    const height = Math.max(img1.height, img2.height);
    const diff = new PNG({ width, height });
    const targetFile = path.join(config.resultsPath, 'diff.png');

    let img1Data = img1.data;
    let img2Data = img2.data;

    if (img1.height > img2.height) {
      const extraPixels = createTransparentPixels(width, img1.height - img2.height);
      img2Data = Buffer.concat([img2Data, extraPixels], img2Data.length + extraPixels.length);
    } else if (img1.height < img2.height) {
      const extraPixels = createTransparentPixels(width, img2.height - img1.height);
      img1Data = Buffer.concat([img1Data, extraPixels], img1Data.length + extraPixels.length);
    }

    console.log(`${pageAliasArray[0]} ==> comparing <== ${pageAliasArray[1]}`);
    pixelmatch(img1Data, img2Data, diff.data, width, height, { threshold: 0.1, alpha: 0.2 });

    fs.writeFileSync(targetFile, PNG.sync.write(diff));
    exec(`open ${targetFile}`, () => {});

    console.log('result file: ', targetFile)
    console.log('done!');

  } finally {
    browser.close();
  }
}

if (url1 && url2) {
  main();
} else {
  console.log('yarn diff https://test1.com https://test2.com')
}
