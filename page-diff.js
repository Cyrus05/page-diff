const path = require('path');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const { exec } = require('child_process');
const puppeteer = require('puppeteer');
const config = require('./config');
const { parseCookies } = require('./helpers');

require('./setup');

const takeSreenshot = async (browser, task) => {
  const {
    name,
    url,
    cookies
  } = task;
  const page = await browser.newPage();

  await page.setViewport({
    width: config.pageSize[0],
    height: config.pageSize[1]
  });

  if (cookies && cookies.length > 0) {
    await page.setCookie(...cookies);
  }

  await page.goto(url, {
    waitUntil: 'networkidle2'
  });

  const cookiesFromPage = await page.cookies(url);
  console.log(name, 'cookies: ', cookiesFromPage);

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

const getDiffTasks = () => {
  const args = process.argv.slice(2);

  if (!args[0] || !args[1]) {
    return []
  }

  const getDomain = url => {
    if (url.startsWith('http')) {
      return new URL(url).hostname
    }

    return ''
  }

  return [
    {
      url: args[0],
      cookies: parseCookies(process.env.cookie1, getDomain(args[0])),
      name: '[A]',
    },
    {
      url: args[1],
      cookies: parseCookies(process.env.cookie2, getDomain(args[1])),
      name: '[B]'
    }
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

const main = async ([task1, task2]) => {
  const browser = await puppeteer.launch(config.puppeteer);

  try {
    const imgFilePathsPromises = [task1, task2].map(task => {
      const { name, url } = task;
      if (url.startsWith('http')) {
        console.log(name, 'loading from browser => \t', url);
        return takeSreenshot(browser, task)
      } else {
        console.log(name, 'loading from local file => \t', url);
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

const tasks = getDiffTasks();

if (tasks.length === 2) {
  main(tasks);
} else {
  console.log('Example:')
  console.log('yarn diff https://test1.com https://test2.com')
}
