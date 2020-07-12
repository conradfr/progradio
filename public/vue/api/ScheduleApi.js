import axios from 'axios';

import { CACHE_KEY_RADIOS, CACHE_KEY_COLLECTIONS, CACHE_KEY_CATEGORIES } from '../config/config';

// ------------------------- Cache -------------------------

// http://crocodillon.com/blog/always-catch-localstorage-security-and-quota-exceeded-errors
const isLocalStorageFull = (e) => {
  let quotaExceeded = false;
  if (e) {
    if (e.code) {
      switch (e.code) {
        case 22:
          quotaExceeded = true;
          break;
        case 1014:
          // Firefox
          if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            quotaExceeded = true;
          }
          break;
        default:
          // nothing
      }
    } else if (e.number === -2147024882) {
      // Internet Explorer 8
      quotaExceeded = true;
    }
  }
  return quotaExceeded;
};

const hasCache = (key) => {
  if (localStorage !== null && localStorage[key]) {
    const cached = JSON.parse(localStorage.getItem(key));
    if (!Array.isArray(cached) && typeof cached === 'object') {
      return true;
    }
  }

  return false;
};

const getCache = key => JSON.parse(localStorage.getItem(key));

const setCache = (key, data) => {
  if (localStorage === null) {
    return;
  }

  localStorage.removeItem(key);

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    if (isLocalStorageFull(e)) {
      localStorage.clear();
      setCache(key, data);
    }
  }
};

// ------------------------- API -------------------------

/* todo fix baseUrl */
/* eslint-disable arrow-body-style */
const getSchedule = (dateStr, baseUrl) => {
  return axios.get(`${baseUrl}schedule/${dateStr}`)
    .then((response) => {
      setCache(dateStr, response.data.schedule);
      return response.data.schedule;
    });
};

const getRadiosData = (baseUrl) => {
  return axios.get(`${baseUrl}radios`)
    .then((response) => {
      setCache(CACHE_KEY_RADIOS, response.data.radios);
      setCache(CACHE_KEY_COLLECTIONS, response.data.collections);
      setCache(CACHE_KEY_CATEGORIES, response.data.categories);
      return response.data;
    });
};

/* eslint-disable no-undef */
export default {
  getSchedule,
  getRadiosData,
  hasCache,
  getCache
};
