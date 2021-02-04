import Vue from 'vue';

import without from 'lodash/without';
import pick from 'lodash/pick';
import forEach from 'lodash/forEach';
import find from 'lodash/find';

import { DateTime, Interval } from 'luxon';

import * as config from '../config/config';

import router from '../router/router';
import ScheduleApi from '../api/ScheduleApi';
import ScheduleUtils from '../utils/ScheduleUtils';

const VueCookie = require('vue-cookie');

Vue.use(VueCookie);

const cursorTime = DateTime.local().setZone(config.TIMEZONE);

const initialScrollIndex = ScheduleUtils.initialScrollIndexFunction(cursorTime);

// initial state
const initState = {
  radios: ScheduleApi.hasCache(config.CACHE_KEY_RADIOS)
    ? ScheduleApi.getCache(config.CACHE_KEY_RADIOS) : [],
  categories: ScheduleApi.hasCache(config.CACHE_KEY_CATEGORIES)
    ? Object.freeze(ScheduleApi.getCache(config.CACHE_KEY_CATEGORIES)) : [],
  collections: ScheduleApi.hasCache(config.CACHE_KEY_COLLECTIONS)
    ? Object.freeze(ScheduleApi.getCache(config.CACHE_KEY_COLLECTIONS)) : {},
  schedule: {},
  scheduleDisplay: {},
  cursorTime,
  scrollIndex: initialScrollIndex,
  scrollClick: false,
  currentCollection: Vue.cookie.get(config.COOKIE_COLLECTION)
    ? Vue.cookie.get(config.COOKIE_COLLECTION) : config.DEFAULT_COLLECTION,
  categoriesExcluded: Vue.cookie.get(config.COOKIE_EXCLUDE)
    ? Vue.cookie.get(config.COOKIE_EXCLUDE).split('|') : [],
  categoryFilterFocus: {
    icon: false,
    list: false
  }
};

// getters
const storeGetters = {
  hasSchedule: state => Object.keys(state.schedule).length > 0,
  cursorIndex: (state) => {
    const startDay = state.cursorTime.startOf('day');
    const newIndex = state.cursorTime.diff(startDay).as('minutes') * config.MINUTE_PIXEL + 1;

    return `${newIndex}px`;
  },
  isToday: (state) => {
    const now = DateTime.local().setZone(config.TIMEZONE);
    return state.cursorTime.hasSame(now, 'day');
  },
  isTomorrow: (state) => {
    const tomorrow = DateTime.local().plus({ days: 1 }).setZone(config.TIMEZONE);
    return Math.floor(tomorrow.diff(state.cursorTime).as('days')) === 0;
  },
  gridIndexLeft: state => ({ left: `-${state.scrollIndex}px` }),
  gridIndexTransform: state => ({ transform: `translateX(-${state.scrollIndex}px)` }),
  radiosRanked: (state) => {
    if (Object.keys(state.collections).length === 0) {
      return [];
    }

    if (state.collections[state.currentCollection] === undefined) {
      return [];
    }

    const radios = pick(state.radios, state.collections[state.currentCollection].radios);

    return ScheduleUtils.rankCollection(state.collections[state.currentCollection],
      radios, state.categoriesExcluded);
  },
  isFavorite: state => radioCodeName => state.collections[config.COLLECTION_FAVORITES] !== undefined
      && state.collections[config.COLLECTION_FAVORITES].radios.indexOf(radioCodeName) !== -1,
  displayCategoryFilter: state => state.categoryFilterFocus.icon
    || state.categoryFilterFocus.list || false,
  currentShowOnRadio: state => (radioCodename) => {
    const currentShow = find(state.schedule[radioCodename], show => Interval
      .fromDateTimes(DateTime.fromSQL(show.start_at).setZone(config.TIMEZONE),
        DateTime.fromSQL(show.end_at).setZone(config.TIMEZONE)).contains(state.cursorTime));

    return typeof currentShow === 'undefined' ? null : currentShow;
  }
};

// actions
const storeActions = {

  // ---------- SCROLL ----------

  scrollToCursor: ({ state, commit }) => {
    commit('scrollSet', ScheduleUtils.initialScrollIndexFunction(state.cursorTime));
    commit('updateDisplayData');
  },
  scroll: ({ commit }, x) => {
    commit('scrollTo', x);
    commit('updateDisplayData');
  },
  scrollBackward: ({ commit }) => {
    commit('scrollTo', (-1 * config.NAV_MOVE_BY));
    commit('updateDisplayData');
  },
  scrollForward: ({ commit }) => {
    commit('scrollTo', config.NAV_MOVE_BY);
    commit('updateDisplayData');
  },
  scrollClick: ({ commit }, value) => {
    commit('scrollClickSet', value);
    commit('updateDisplayData');
  },

  // ---------- COLLECTIONS ----------

  collectionBackward: ({ state }) => {
    const nextCollection = ScheduleUtils.getNextCollection(
      state.currentCollection,
      state.collections,
      state.radios,
      'backward'
    );

    router.push({ name: 'schedule', params: { collection: nextCollection } });
  },
  collectionForward: ({ state }) => {
    const nextCollection = ScheduleUtils.getNextCollection(
      state.currentCollection,
      state.collections,
      state.radios,
      'forward'
    );

    router.push({ name: 'schedule', params: { collection: nextCollection } });
  },
  switchCollection: ({ commit }, collection) => {
    commit('collectionSwitch', collection);
  },

  // ---------- FAVORITES ----------

  toggleRadioFavorite: ({ commit }, radioCodeName) => {
    commit('toggleRadioFavorite', radioCodeName);
  },

  // ---------- CATEGORY ----------

  categoryFilterFocus: ({ commit }, params) => {
    commit('setCategoryFilterFocus', params);
  },
  toggleExcludeCategory: ({ commit }, category) => {
    commit('toggleExcludeCategory', category);
  },

  // ---------- CALENDAR ----------

  calendarToday: ({ commit, dispatch }) => {
    const newDate = DateTime.local().setZone(config.TIMEZONE);
    commit('updateCursor', newDate);

    Vue.nextTick(() => {
      dispatch('getSchedule');
    });
  },
  // calendarBackward: ({ state, commit, dispatch }) => {
  calendarBackward: ({ state, commit, dispatch }) => {
    const newDate = state.cursorTime.minus({ days: 1 });
    commit('updateCursor', newDate);

    Vue.nextTick(() => {
      dispatch('getSchedule');
    });
  },
  calendarForward: ({ state, commit, dispatch }) => {
    const newDate = state.cursorTime.plus({ days: 1 });
    commit('updateCursor', newDate);

    Vue.nextTick(() => {
      dispatch('getSchedule');
    });
  },

  // ---------- DATA & SCHEDULE ----------

  /* eslint-disable no-undef */
  getRadiosData: ({ state, commit }) => {
    setTimeout(
      () => {
        ScheduleApi.getRadiosData()
          .then(({ radios, collections, categories }) => {
            commit('updateRadios', radios);
            commit('updateCollections', collections);
            commit('updateCategories', categories);
          })
          .finally(() => commit('setLoading', false, { root: true }));
      },
      30
    );

    if (state.radios === []) {
      commit('setLoading', true, { root: true });
    }
  },
  getSchedule: ({ state, commit }, params) => {
    const dateStr = state.cursorTime.toISODate();

    // if we have cache we display it immediately and then fetch an update silently
    if (ScheduleApi.hasCache(dateStr)) {
      commit('updateSchedule', ScheduleApi.getCache(dateStr));
    } else {
      commit('setLoading', true, { root: true });
    }

    if (params !== null) {
      setTimeout(
        () => {
          ScheduleApi.getSchedule(dateStr, params)
            .then(schedule => commit('updateSchedule', schedule))
            .finally(() => commit('setLoading', false, { root: true }))
            .then(() => {
            /*              setTimeout(
                () => {
                  ScheduleApi.getSchedule(dateStr)
                    .then(schedule => commit('updateSchedule', schedule));
                },
                1000
              ); */
            });
        },
        75
      );
    } else {
      if (ScheduleApi.hasCache(dateStr)) {
        commit('updateSchedule', ScheduleApi.getCache(dateStr));
      }

      setTimeout(
        () => {
          ScheduleApi.getSchedule(dateStr)
            .then(schedule => commit('updateSchedule', schedule))
            .finally(() => commit('setLoading', false, { root: true }));
        },
        1000
      );
    }
  },
  /* eslint-disable object-curly-newline */
  tick: ({ commit, getters, rootState, dispatch }) => {
    const now = DateTime.local().setZone(config.TIMEZONE);

    if (now.hour === 0 && now.minutes === 2) {
      dispatch('getSchedule');
    }

    if (rootState.player.playing === true) {
      const { radio, radioStreamCodeName } = rootState.player;

      const show = getters.currentShowOnRadio(radio.code_name);
      commit('switchRadio', { radio, streamCodeName: radioStreamCodeName, show });
    }

    commit('updateCursor', now);
  }
};

// mutations
const storeMutations = {
  updateDisplayData(state) {
    if (state.scrollClick === true) {
      return;
    }

    const update = ScheduleUtils.getUpdatedProgramText(state);

    forEach(update, (data, key) => {
      Vue.set(state.scheduleDisplay[key], 'textLeft', data);
    });
  },
  scrollSet(state, x) {
    Vue.set(state, 'scrollIndex', x);
  },
  scrollTo(state, x) {
    const newIndex = state.scrollIndex + x;
    Vue.set(state, 'scrollIndex', ScheduleUtils.enforceScrollIndex(newIndex));
  },
  updateCursor(state, value) {
    Vue.set(state, 'cursorTime', value);
  },
  scrollClickSet: (state, value) => {
    Vue.set(state, 'scrollClick', value);
  },
  collectionSwitch(state, collection) {
    Vue.set(state, 'currentCollection', collection);

    setTimeout(() => {
      Vue.cookie.set(config.COOKIE_COLLECTION, collection, config.COOKIE_PARAMS);
    }, 300);
  },
  toggleRadioFavorite(state, radioCodeName) {
    const favorites = state.collections[config.COLLECTION_FAVORITES] === undefined
      ? [] : state.collections[config.COLLECTION_FAVORITES].radios;
    const radioIndex = favorites.indexOf(radioCodeName);

    // Is favorite
    if (radioIndex !== -1) {
      favorites.splice(radioIndex, 1);
    } else {
      favorites.push(radioCodeName);
    }

    Vue.set(state.collections[config.COLLECTION_FAVORITES], 'radios', favorites);

    setTimeout(() => {
      if (logged === true) {
        ScheduleApi.toggleFavoriteRadio(radioCodeName);
        return;
      }

      const favoritesAsString = favorites.join('|');
      Vue.cookie.set(config.COOKIE_RADIO_FAVORITES, favoritesAsString, config.COOKIE_PARAMS);
    }, 500);
  },
  setCategoryFilterFocus(state, params) {
    state.categoryFilterFocus[params.element] = params.status;
  },
  toggleExcludeCategory(state, category) {
    if (state.categoriesExcluded.indexOf(category) === -1) {
      state.categoriesExcluded.push(category);
    } else {
      Vue.set(state, 'categoriesExcluded', without(state.categoriesExcluded, category));
    }

    setTimeout(() => {
      Vue.cookie.set(config.COOKIE_EXCLUDE, state.categoriesExcluded.join('|'),
        config.COOKIE_PARAMS);
    }, 500);
  },
  updateSchedule: (state, value) => {
    const updatedSchedule = { ...{ ...state.schedule }, ...value };
    const scheduleDisplay = ScheduleUtils.getScheduleDisplay(
      updatedSchedule, state.cursorTime, initialScrollIndex
    );

    Object.freeze(updatedSchedule);
    Vue.set(state, 'schedule', updatedSchedule);
    Vue.set(state, 'scheduleDisplay', scheduleDisplay);
  },
  updateRadios: (state, value) => {
    Vue.set(state, 'radios', value);
  },
  updateCollections: (state, collections) => {
    forEach(collections, (collection, key) => {
      if (key !== config.COLLECTION_FAVORITES) {
        Object.freeze(collection);
      }
    });

    Vue.set(state, 'collections', collections);
  },
  updateCategories: (state, value) => {
    Object.freeze(value);
    Vue.set(state, 'categories', value);
  }
};

export default {
  state: initState,
  getters: storeGetters,
  actions: storeActions,
  mutations: storeMutations
};
