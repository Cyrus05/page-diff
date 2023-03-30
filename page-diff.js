const path = require('path');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const { exec } = require('child_process');
const puppeteer = require('puppeteer');
const {
  parseCookies,
  covertUrlToFileName
} = require('./helpers');

const { env } = require('./setup');

const takeSreenshots = async (browser, task) => {
  const {
    name,
    url,
    cookies
  } = task;
  const page = await browser.newPage();

  await page.setViewport({
    width: 1440,
    height: 1440
  });

  if (cookies && cookies.length > 0) {
    await page.setCookie(...cookies);
  }

  await page.goto(url, {
    waitUntil: 'networkidle2'
  });

  console.log(name, 'scrolling...')
  await autoScroll(page);
  console.log(name, 'reached bottom.')

  console.log(name, 'wait for network idle.')
  await page.waitForNetworkIdle({ timeout: env.screenshotTimeout }).catch(() => { console.warn(name, 'wait for network idle - timeout, go ahead') });

  const paths = [];
  for( let i = 0; i < env.screenSizes.length; i++ ) {
    const size = env.screenSizes[i];

    console.log(name, 'taking screenshot, screen size:', size)
    await page.setViewport({
      width: size[0],
      height: size[1]
    });
    const savePath = path.join(env.resultsPath, `${covertUrlToFileName(url)}-${i + 1}.png`);
    await page.screenshot({ path: savePath, fullPage: true, captureBeyondViewport: false });
    paths.push(savePath);
  }

  await page.close();
  return paths;
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
      cookies: parseCookies(env.cookie1, getDomain(args[0])),
      name: '[A]',
    },
    {
      url: args[1],
      cookies: parseCookies(env.cookie2, getDomain(args[1])),
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

const uniformizePng = (png, width, height, offsetX = 0, offsetY = 0) => {
  const newPng = new PNG({ width, height });

  png.bitblt(newPng, 0 ,0, png.width, png.height, offsetX, offsetY)
  return newPng;
}

const diffTwoPngs = async (img1FilePath, img2FilePath) => {
  let img1 = await readPng(img1FilePath);
  let img2 = await readPng(img2FilePath);
  const width = Math.max(img1.width, img2.width);
  const height = Math.max(img1.height, img2.height);

  img1 = uniformizePng(img1, width, height),
  img2 = uniformizePng(img2, width, height)
  const resultPng = new PNG({ width, height });

  let img1Data = img1.data;
  let img2Data = img2.data;

  pixelmatch(img1Data, img2Data, resultPng.data, width, height, { threshold: 0.1, alpha: 0.3 });
  return resultPng;
}

const diffPngGroups = async (img1FilePaths, img2FilePaths) => {
  const groupCount = Math.max(img1FilePaths.length, img2FilePaths.length);
  const resultPngs = [];

  for (let i = 0; i < groupCount; i++ ) {
    const resultPng = await diffTwoPngs(img1FilePaths[i], img2FilePaths[i]);
    resultPngs.push(resultPng);
  }

  let mergedPng = resultPngs[0];

  if (resultPngs.length > 1) {
    const gap = 60;
    const width = resultPngs.reduce((sum, png) => sum + png.width + gap, 0);
    const height = Math.max(...resultPngs.map(png => png.height));
    let offsetX = 0;
    mergedPng = new PNG({ width, height });

    for (let i = 0; i < groupCount; i++ ) {
      const png = resultPngs[i];
      png.bitblt(mergedPng, 0, 0, png.width, png.height, offsetX, 0);
      offsetX += png.width + gap;
    }
  }

  const targetFile = path.join(env.resultsPath, 'diff.png');
  fs.writeFileSync(targetFile, PNG.sync.write(mergedPng));
  return targetFile
}

const main = async ([task1, task2]) => {
  const browser = await puppeteer.launch(env.puppeteerConfig);

  try {
    const imgFilePathsPromises = [task1, task2].map(task => {
      const { name, url } = task;
      if (url.startsWith('http')) {
        console.log(name, 'loading from browser => \t', url);
        return takeSreenshots(browser, task)
      } else {
        console.log(name, 'loading from local file => \t', url);
        return Promise.resolve([url])
      }
    })

    const [png1FilePaths, png2FilePaths] = await Promise.all(imgFilePathsPromises);
    const targetFile = await diffPngGroups(png1FilePaths, png2FilePaths);

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
