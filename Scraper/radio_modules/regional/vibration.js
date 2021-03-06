const scrapAbstract = require('./_abstract_lesindes.js');

const name = 'vibration';

const getScrap = dateObj => {
  const url = 'https://www.vibration.fr/programs';
  const img_prefix = 'https://www.vibration.fr';
  return scrapAbstract.getScrap(dateObj, url, name, img_prefix)
};

const scrapModule = {
  getName: name,
  supportTomorrow: scrapAbstract.supportTomorrow,
  getScrap
};

module.exports = scrapModule;
