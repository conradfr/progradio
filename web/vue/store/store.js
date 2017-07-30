import Vue from 'vue';
import Vuex from 'vuex';
const moment = require('moment');

import * as config from '../config/config.js';

Vue.use(Vuex);

const enforceScrollIndex = function(scrollIndex) {
    if (scrollIndex < 0) { scrollIndex = 0; }
    else {
        const maxScroll = (config.MINUTE_PIXEL * 1440 * config.DAYS) - (window.innerWidth - 71) + config.GRID_VIEW_EXTRA;
        if (scrollIndex >= maxScroll) {
            scrollIndex = maxScroll;
        }
    }

    return scrollIndex;
};

const initialScrollIndex = () => {
    const initCursor = moment().diff(moment().startOf('day'), 'minutes') * config.MINUTE_PIXEL + 1;
    let initIndex = initCursor - Math.floor(window.innerWidth / 3);

    return enforceScrollIndex(initIndex);
};

const store = new Vuex.Store({
    state: {
        radios: radios ,
        schedule: schedule,
        cursorTime: moment(),
        scrollIndex: initialScrollIndex()
    },
    getters: {
        cursorIndex: state => {
            const startDay = moment().startOf('day');
            return state.cursorTime.diff(startDay, 'minutes') * config.MINUTE_PIXEL + 1;
        },
        gridIndex: state => {
            return {left: `-${state.scrollIndex}px`};
        }
    },
    mutations: {
        scroll (state, x) {
            const newIndex = state.scrollIndex + x;
             state.scrollIndex = enforceScrollIndex(newIndex);
        },
        updateCursor(state) {
            state.cursorTime = moment();
        }
    },
    actions: {
        scroll: ({commit}, x) => {
            commit('scroll', x);
        },
        tick: ({commit}) => {
            commit('updateCursor');
        }
    }
});

export default store;