const scrapAbstract = require('./_abstract_alpes1');

const name = 'alpes1_grenoble';

const getScrap = dateObj => {
    const url = 'https://grandgrenoble.alpes1.com/radio/emissions';
    return scrapAbstract.getScrap(dateObj, url, name)
};

const scrapModule = {
    getName: name,
    getScrap
};

module.exports = scrapModule;
