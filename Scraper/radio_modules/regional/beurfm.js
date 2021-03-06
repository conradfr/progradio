const scrapAbstract = require('./_abstract_lesindes.js');

const name = 'beurfm';

const getScrap = dateObj => {
  const url = 'https://www.beurfm.net/emissions';
  const img_prefix = 'https://www.beurfm.net';
  return scrapAbstract.getScrap(dateObj, url, name, img_prefix)
};

const scrapModule = {
  getName: name,
  supportTomorrow: scrapAbstract.supportTomorrow,
  getScrap
};

module.exports = scrapModule;
