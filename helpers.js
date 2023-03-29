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

module.exports = {
  parseCookies
}