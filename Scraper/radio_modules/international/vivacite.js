const scrapAbstract = require('./_abstract_rtbs.js');

const name = 'vivacite';

const getScrap = dateObj => {
  return scrapAbstract.getScrap(dateObj, name)
};

const scrapModule = {
  getName: name,
  supportTomorrow: scrapAbstract.supportTomorrow,
  getScrap
};

module.exports = scrapModule;
