const fs = require('fs');
const path = require('path');
const DiffMatchPatch = require('diff-match-patch');
const puppeteer = require('puppeteer');
const config = require('./config');
const { exec } = require('child_process');
const pretty = require('pretty');
const { parseCookies } = require('./helpers');

require('./setup');

const withTemplate = (str, data) => {
  return str.replace(/\{\{(.*?)\}\}/gi, (match, p1) => {
    return isNaN(p1) ? data[p1.trim()] : ''
  })
}

function createDiffHtml(diff) {
  let html = '';
  let domIdIndex = 1;

  diff.forEach(part => {
    let [flag, value] = part;
    value = value.replaceAll('<', '&lt;').replaceAll('>', '&gt;');

    if (flag !== 0) {
      const tag = flag === -1 ? 'del' : 'span';
      const color = flag === -1 ? 'red' : 'green';
      const bgColor = flag === -1 ? 'rgba(255, 0, 0, 0.15)' : 'rgba(0, 255, 0, 0.25)';
      const extraAttrs = flag === -1 ? 'data-removed' : 'data-added';
      html += `<${tag} id="id_${domIdIndex++}" ${extraAttrs} style="color: ${color}; background: ${bgColor}">${value}</${tag}>`
    } else {
      html += value
    }
  })

  return html;
}

async function htmlDiff(page1, page2) {
  console.log('diff...');
  const html1 = await page1.content();
  const html2 = await page2.content();
  const dmp = new DiffMatchPatch();
  const diff = dmp.diff_main(pretty(html1), pretty(html2));

  const content = createDiffHtml(diff);
  const tpl = fs.readFileSync('./templates/diff.html.tpl').toString();

  const html = withTemplate(tpl, { content });

  const filePath = path.join(config.resultsPath, 'diff.html');
  fs.writeFileSync(filePath, html, { encoding: 'utf-8' });

  return filePath;
}

async function createPage(browser, url) {
  console.log('loading ' + url);
  const page = await browser.newPage();
  await page.setViewport({
    width: config.pageSize[0],
    height: config.pageSize[1]
  });
  await page.goto(url, {
    waitUntil: 'domcontentloaded'
  });

  return page;
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

async function main(tasks) {
  const browser = await puppeteer.launch(config.puppeteer);

  try {
    const [page1, page2] = await Promise.all([
      createPage(browser, tasks[0].url),
      createPage(browser, tasks[1].url)
    ]);

    const targetFile = await htmlDiff(page1, page2);

    exec(`open ${targetFile}`, () => {});
    console.log('result file: ', targetFile);

  } finally {
    browser.close();
  }
}

const tasks = getDiffTasks();

if (tasks.length === 2) {
  main(tasks);
} else {
  console.log('Example:')
  console.log('yarn html-diff https://test1.com https://test2.com')
}
