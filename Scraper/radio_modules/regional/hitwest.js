const scrapAbstract = require('./_abstract_lesindes2.js');

const name = 'hitwest';

const getScrap = dateObj => {
  const url = 'https://www.hitwest.com/emissions';
  const description_prefix = 'https://www.hitwest.com';
  return scrapAbstract.getScrap(dateObj, url, name, description_prefix);
};

const scrapModule = {
  getName: name,
  supportTomorrow: scrapAbstract.supportTomorrow,
  getScrap
};

module.exports = scrapModule;
