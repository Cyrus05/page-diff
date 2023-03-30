const parseCookies = (cookieStr, domain) => {
  return cookieStr
    .split(';')
    .map(cookieItemStr => cookieItemStr.trim().split('='))
    .filter(pair => pair.length === 2)
    .map(pair => {
      return {
        name: pair[0].trim(),
        value: pair[1].trim(),
        domain
      }
    })
}

// 1440x1440,768x1024 => [[1440, 1440], [768, 1024]]
const parseScreenSizes = sizesStr => {
  return sizesStr
    .split(',')
    .map(x =>
      x.trim()
        .split(/x/i)
        .map(size => Number(size))
    ).filter(sizes => sizes.length === 2)
}

const covertUrlToFileName = url => url.replaceAll(/[:/?.]+/ig, '_')

module.exports = {
  parseCookies,
  parseScreenSizes,
  covertUrlToFileName
}