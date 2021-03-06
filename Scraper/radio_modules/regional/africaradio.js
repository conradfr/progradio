const scrapAbstract = require('./_abstract_lesindes.js');

const name = 'africaradio';

const getScrap = dateObj => {
  dateObj.tz('GMT');
  const url = 'https://www.africaradio.com/emissions';
  const img_prefix = 'https://www.africaradio.com';
  return scrapAbstract.getScrap(dateObj, url, name, img_prefix)
};

const scrapModule = {
  getName: name,
  supportTomorrow: scrapAbstract.supportTomorrow,
  getScrap
};

module.exports = scrapModule;
