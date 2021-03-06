const osmosis = require('osmosis');
let moment = require('moment-timezone');
const logger = require('../../lib/logger.js');

let scrapedData = {};
let referenceIndex = 0;
let cleanedData = {};

const format = (dateObj, name) => {

  // we use reduce instead of map to act as a map+filter in one pass
  cleanedData[name] = scrapedData[name].reduce(function (prev, curr, index, array) {
    let regexp = new RegExp(/^([0-9]{1,2})[:]([0-9]{2})\s-\s([0-9]{1,2})[:]([0-9]{2})/);
    let match = curr.datetime_raw.match(regexp);

    // no time = exit
    if (match === null) {
      return prev;
    }

    const startDateTime = moment(curr.dateObj);
    startDateTime.tz(dateObj.tz());
    const endDateTime = moment(curr.dateObj);
    endDateTime.tz(dateObj.tz());

    startDateTime.hour(match[1]);
    startDateTime.minute(match[2]);
    startDateTime.second(0);
    endDateTime.hour(match[3]);
    endDateTime.minute(match[4]);
    endDateTime.second(0);

    let prevMatch = null;
    // keep only relevant time from previous day page
    if (startDateTime.isBefore(dateObj, 'day')) {
      if (index === 0) {
        return prev;
      }

      prevMatch = array[0].datetime_raw.match(regexp);
      array[0].dateObj.hour(prevMatch[1]);

      if (array[0].dateObj.isBefore(startDateTime)) {
        return prev;
      }

      // update day
      startDateTime.add(1, 'days');
      endDateTime.add(1, 'days');
    }
    // remove next day schedule from day page
    else {
      if (curr.dateObj !== array[index - 1].dateObj) {
        referenceIndex = index;
      } else {
        prevMatch = array[referenceIndex].datetime_raw.match(regexp);
        let prevDate = moment(array[referenceIndex].dateObj);
        prevDate.hour(prevMatch[1]);

        if (prevDate.isAfter(startDateTime)) {
          return prev;
        }
      }

      if (startDateTime.hour() > endDateTime.hour()) {
        endDateTime.add(1, 'days');
      }
    }

    // Deal with radios on another timezone and convert to Paris time
    // @todo improves tz handling across the whole app

    if (startDateTime.tz() !== 'Europe/Paris') {
      startDateTime.tz('Europe/Paris');
    }

    let description = '';

    if (curr.hasOwnProperty('subtitle') && typeof curr['subtitle'] === 'string' && curr['subtitle'].trim().length) {
      description += curr.subtitle;
      description += ' / ';
    }

    description += curr.description;

    const newEntry = {
      'date_time_start': startDateTime.toISOString(),
      'img': curr.img,
      'title': curr.title.trim(),
      'description': description.trim()
    };

    if (curr.host !== undefined) {
      regexp = new RegExp(/^Présentation[&-z&;\s]{0,10}:\s(.*)/);
      match = curr.host.match(regexp);

      if (match !== null) {
        newEntry.host = match[1].trim();
      } else {
        newEntry.host = curr.host.trim();
      }
    }

    prev.push(newEntry);
    return prev;
  }, []);

  return Promise.resolve(cleanedData[name]);
};

const fetch = (name, dateObj) => {
  const day = dateObj.format('YYYY/MM/DD');
  const url = `https://www.rtbf.be/${name}/grille-programme/ajax/grid?date=${day}`;

  logger.log('info', `fetching ${url}`);

  return new Promise(function (resolve, reject) {
    return osmosis
      .get(url)
      .find('.radio-epg__item')
      .set({
          'img': 'img.radio-epg__item-img@data-src',
          'datetime_raw': 'span.radio-epg__item-schedule',
          'title': 'h3.radio-epg__item-title',
          'host': 'p.radio-epg__item-animator',
          'description': 'div.radio-epg__item-description',
          'subtitle': 'h4.radio-epg__item-subtitle'
        }
      )
      .data(function (listing) {
        listing.dateObj = dateObj;
        scrapedData[name].push(listing);
      })
      .done(function () {
        resolve(true);
      })
  });
};

const fetchAll = (name, dateObj) => {
  /* radio schedule page has the format 6am -> 6am,
 so we get the previous day as well to get the full day and the filter the list later  */
  const previousDay = moment(dateObj);

  previousDay.locale('fr');
  previousDay.tz('Europe/Brussels');
  previousDay.subtract(1, 'days');

  dateObj.locale('fr');
  dateObj.tz('Europe/Brussels');

  return fetch(name, previousDay)
    .then(() => {
      return fetch(name, dateObj);
    });
};

const getScrap = (dateObj, name) => {
  scrapedData[name] = [];
  return fetchAll(name, dateObj)
    .then(() => {
      return format(dateObj, name);
    });
};

const scrapModuleAbstract = {
  getScrap,
  supportTomorrow: true,
};

module.exports = scrapModuleAbstract;
