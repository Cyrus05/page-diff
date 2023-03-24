const path = require('path');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const { exec } = require('child_process');
const puppeteer = require('puppeteer');
const config = require('./config');

require('./setup');

const imgNameAlias = {};

const takeSreenshot = async (browser, url) => {
  const name = imgNameAlias[url];
  const page = await browser.newPage();

  await page.setViewport({
    width: config.pageSize[0],
    height: config.pageSize[1]
  });
  await page.goto(url, {
    waitUntil: 'networkidle2'
  });

  console.log(name, 'scrolling...')
  await autoScroll(page);
  console.log(name, 'reached bottom.')

  console.log(name, 'wait for network idle.')
  await page.waitForNetworkIdle({ timeout: config.screenshotTimeout }).catch(() => { console.warn(name, 'wait for network idle - timeout, go ahead') });

  console.log(name, 'taking screenshot!')
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

const getUrlsFromArgs = () => {
  const args = process.argv.slice(2);

  return [
    args[0],
    args[1]
  ]
}

const readPng = async (imgFielPath) => {
  return new Promise((resolve, reject) => {
    fs.createReadStream(imgFielPath)
      .pipe(new PNG())
      .on("parsed", function () {
        resolve(this);
      })
      .on("error", reject);
  })
}

const uniformizePng = (png, width, height) => {
  const newPng = new PNG({ width, height });

  png.bitblt(newPng, 0 ,0, png.width, png.height, 0, 0)
  return newPng;
}

const diffPngs = async (img1FilePath, img2FilePath) => {
  let img1 = await readPng(img1FilePath);
  let img2 = await readPng(img2FilePath);
  const width = Math.max(img1.width, img2.width);
  const height = Math.max(img1.height, img2.height);

  img1 = uniformizePng(img1, width, height),
  img2 = uniformizePng(img2, width, height)
  const diff = new PNG({ width, height });
  const targetFile = path.join(config.resultsPath, 'diff.png');

  let img1Data = img1.data;
  let img2Data = img2.data;

  console.log('comparing...');
  pixelmatch(img1Data, img2Data, diff.data, width, height, { threshold: 0.1, alpha: 0.3 });

  fs.writeFileSync(targetFile, PNG.sync.write(diff));

  return targetFile;
}

const main = async (url1, url2) => {
  const browser = await puppeteer.launch(config.puppeteer);

  try {
    const imgFilePathsPromises = [url1, url2].map(url => {
      if (url.startsWith('http')) {
        console.log(imgNameAlias[url], 'loading from browser => \t', url);
        return takeSreenshot(browser, url)
      } else {
        console.log(imgNameAlias[url], 'loading from local file => \t', url);
        return Promise.resolve(url)
      }
    })

    const [png1FilePath, png2FilePath] = await Promise.all(imgFilePathsPromises);
    const targetFile = await diffPngs(png1FilePath, png2FilePath);

    exec(`open ${targetFile}`, () => {});
    console.log('result file: ', targetFile)

  } finally {
    browser.close();
  }
}

const [url1, url2] = getUrlsFromArgs();

if (url1 && url2) {
  imgNameAlias[url1] = '[A]';
  imgNameAlias[url2] = '[B]'
  main(url1, url2);
} else {
  console.log('Example:')
  console.log('yarn diff https://test1.com https://test2.com')
}
