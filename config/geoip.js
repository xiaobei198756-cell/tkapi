function getCountryCode(req) {
  const testCountry = req.query.country;
  const headers = [
    req.headers['cf-ipcountry'],
    req.headers['x-vercel-ip-country'],
    req.headers['x-country-code']
  ];
  const country = testCountry || headers.find(Boolean) || 'UNKNOWN';
  return String(country).trim().toUpperCase();
}

module.exports = { getCountryCode };
