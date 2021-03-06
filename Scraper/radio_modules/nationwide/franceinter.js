const osmosis = require('osmosis');
let moment = require('moment-timezone');
const logger = require('../../lib/logger.js');

let scrapedData = [];

const format = dateObj => {
  const dayStr = dateObj.format('DD');

  const mains = [];
  const sections = [];

  scrapedData.forEach(function (curr) {
    const date = moment.unix(parseInt(curr['datetime_raw']));

    // filter other days
    if (date.tz('Europe/Paris').format('DD') === dayStr) {
      delete curr.datetime_raw;

      // filtering weird base64 for now
      if (typeof curr.img !== 'undefined' && curr.img.substring(0, 4) !== 'http') {
        delete curr.img;
        if (typeof curr.img_alt !== 'undefined' && curr.img_alt.substring(0, 4) === 'http') {
          curr.img = curr.img_alt;
        }
      }

      if (typeof curr.img_alt !== 'undefined') {
        delete curr.img_alt;
      }

      if (curr.main === true) {
        curr.date_time_start = date.toISOString();

        delete curr.main;
        curr.sections = [];
        mains.push(curr);
      } else {
        curr.date_time_start = date.toISOString();

        if (curr.host !== undefined && curr.host !== null) {
          curr.presenter = curr.host;
          delete curr.host;
        }

        sections.push(curr);
      }
    }
  });

  if (sections.length > 0) {
    // sort mains
    function compare(a, b) {
      momentA = moment(a.date_time_start);
      momentB = moment(b.date_time_start);

      if (momentA.isBefore(momentB))
        return -1;
      if (momentA.isAfter(momentB))
        return 1;
      return 0;
    }

    mains.sort(compare);

    sections.forEach(function (entry) {
      for (i = 0; i < mains.length; i++) {
        entryMoment = moment(entry.date_time_start);
        mainMoment = moment(mains[i].date_time_start);

        let toAdd = false;
        if (i === (mains.length - 1)) {
          if (entryMoment.isAfter(mainMoment)) {
            toAdd = true;
          }
        } else if (entryMoment.isBetween(mainMoment, moment(mains[i + 1].date_time_start))) {
          toAdd = true;
        }

        if (toAdd === true) {
          mains[i].sections.push(entry);
          break;
        }
      }
    });
  }

  return Promise.resolve(mains);
};

const fetch = (dayFormat, sections) => {
  let url = `https://www.franceinter.fr/programmes${dayFormat}`;

  logger.log('info', `fetching ${url}`);

  let findClass = 'article.rich-section-list-gdp-item';

  if (sections === true) {
    findClass = findClass + '.step';
  } else {
    findClass = findClass + ':not(.step)';
  }

  return new Promise(function (resolve, reject) {
    return osmosis
      .get(url)
      .find(findClass)
      .set({
        'datetime_raw': '@data-start-time' /* utc */
      })
      .do(
        osmosis.select('.step')
          .set({
            'main': 'div'
          })
      )
      .set({
        'img': '.rich-section-list-gdp-item-visual picture img@src',
        'img_alt': '.rich-section-list-gdp-item-visual picture img@data-dejavu-src'
      })
      .select('.rich-section-list-gdp-item-content > .rich-section-list-gdp-item-content-show')
      .set({
        'title': 'a@title',
        'description': 'a.rich-section-list-gdp-item-content-title@title',
      })
      .do(
        osmosis.select('.rich-section-list-gdp-item-content-infos-author')
          .set({
              'host': 'a@title',
            }
          )
      )
      .data(function (listing) {
        listing.main = sections !== true;
        scrapedData.push(listing);
      })
      .done(function () {
        resolve(true);
      })
  });
};

const fetchAll = dateObj => {
  /* radio schedule page has the format 3am -> 3am,
      so we get the previous day as well to get the full day and the filter the list later  */

  /* page of the day doesn't go online before 5am (maybe) so only get previous day page
      if scraper is run before that */

  // IT SEEMS TO HAVE CHANGED, LET'S SEE

/*  const now = new moment();
  now.tz('Europe/Paris');

  if (now.hour() < 5) {
    return fetch('');
  }*/

  const previousDay = moment(dateObj);
  previousDay.subtract(1, 'days');

  return fetch('/' + previousDay.format('YYYY-MM-DD'), false)
    .then(() => {
      return fetch('/' + previousDay.format('YYYY-MM-DD'), true)
        .then(() => {
          return fetch('/' + dateObj.format('YYYY-MM-DD'), false)
            .then(() => {
              return fetch('/' + dateObj.format('YYYY-MM-DD'), true)
            })
        })
    });
};

const getScrap = dateObj => {
  return fetchAll(dateObj)
    .then(() => {
      return format(dateObj);
    });
};

const scrapModule = {
  getName: 'franceinter',
  supportTomorrow: true,
  getScrap
};

module.exports = scrapModule;
