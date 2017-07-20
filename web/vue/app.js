import Vue from 'vue';
import Vuex from 'vuex';

const moment = require('moment');
const VueCookie = require('vue-cookie');

Vue.use(Vuex);
Vue.use(VueCookie);

/* ----- CONFIG ----- */

const MINUTE_PIXEL = 6;
const DAYS = 1;
const GRID_VIEW_EXTRA = 50;

const NAV_MOVE_BY = 30 * MINUTE_PIXEL;
const TICK_INTERVAL = 60000; /*one minute in  ms */

/* ----- STORE ----- */

const initialScrollIndex = () => {
    const currentHour = moment().hour();
    let initIndex = 0;

    if (currentHour > 3) {
        initIndex = (currentHour - 2) * 60 * MINUTE_PIXEL;

        const gridScreenWidth = window.innerWidth - 71;
        const gridFullWidth = ((MINUTE_PIXEL * 1440 * DAYS) + GRID_VIEW_EXTRA);

        if (initIndex + gridScreenWidth >= gridFullWidth) {
            initIndex = gridFullWidth - gridScreenWidth;
        }
    }

    return initIndex;
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
            return state.cursorTime.diff(startDay, 'minutes') * MINUTE_PIXEL + 1;
        },
        gridIndex: state => {
            return {left: `-${state.scrollIndex}px`};
        }
    },
    mutations: {
        scroll (state, x) {
            const newIndex = state.scrollIndex + x;
            const gridWidth = window.innerWidth - 71;

            // cancel move if outside current day
            if (newIndex < 0) {
                state.scrollIndex = 0;
                return;
            } else if (newIndex >= ((MINUTE_PIXEL * 1440 * DAYS) - gridWidth + GRID_VIEW_EXTRA)) {
                state.scrollIndex = ((MINUTE_PIXEL * 1440 * DAYS) - gridWidth + GRID_VIEW_EXTRA);
                return;
            }
            state.scrollIndex = state.scrollIndex + x;
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

/* ----- COMPONENTS ----- */

/* Global */

const scheduleContainer = Vue.component('scheduleContainer', {
    template: '#scheduleContainerTpl',
    computed: Vuex.mapState({
        radios: state => state.radios,
        schedule: state => state.schedule
    })
});

/* Timeline */

const timeline = Vue.component('timeline', {
    template: '#timelineTpl',
    filters: {
        toTime: function (value) {
            return `${("0" + (value - 1)).slice(-2)}h00`
        }
    },
    computed: Vuex.mapState({
        styleObject: function() { return this.$store.getters.gridIndex; }
    }),
    methods: {
        clickBackward: function () {
            this.$store.dispatch('scroll', (-1 * NAV_MOVE_BY));
        },
        clickForward: function () {
            this.$store.dispatch('scroll', NAV_MOVE_BY);
        }
    }
});

const timelineCursor = Vue.component('timelineCursor', {
    template: '#timelineCursorTpl',
    computed: {
        styleObject: function() {
            return {left: `${this.$store.getters.cursorIndex}px`};
        }
    },
    methods: {
        tick: function () {
            this.$store.dispatch('tick');
        }
    },
    mounted: function() {
        setInterval(this.tick, TICK_INTERVAL);
    }
});

/* Radio list */

const ScheduleRadioList = Vue.component('scheduleRadioList', {
    template: '#scheduleRadioListTpl',
    computed: Vuex.mapState({
        radios: state => state.radios
    })
});

const ScheduleRadioListOne = Vue.component('scheduleRadioListOne', {
    template: '#scheduleRadioListOneTpl',
    props: ['radio'],
    data: function () {
        return {
            styleObject: {
                backgroundImage: `url("img/radio/${this.radio.code_name}_icon.png")`
            }
        }
    }
});

/* Grid */

const scheduleRadioGrid = Vue.component('scheduleRadioGrid', {
    template: '#scheduleRadioGridTpl',
    data: function () {
        return {
            mousedown: false,
            clickX: null
        }
    },
    computed: Vuex.mapState({
        radios: state => state.radios,
        styleObject: function() {
            const styleObject = this.$store.getters.gridIndex;
            if (this.mousedown === true) { styleObject['transition'] = 'none'; }

            return styleObject;
        }
    }),
    /* @note scroll inspired by https://codepen.io/pouretrebelle/pen/cxLDh */
    methods: {
        dragClick: function (event) {
            this.clickX = event.pageX;
            this.mousedown = true;
        },
        dragOff: function (event) {
            this.mousedown = false;
        },
        dragMove: function (event) {
            if (this.mousedown === false) { return; }

            const xDiff = this.clickX - event.pageX;
            this.$store.dispatch('scroll', xDiff);
            this.clickX = event.pageX;
        }
    }
});

const scheduleRadioGridRow = Vue.component('scheduleRadioGridRow', {
    template: '#scheduleRadioGridRowTpl',
    props: ['radio'],
    computed: Vuex.mapState({
        noProgramStyleObject(state) {
            return {left: `${state.scrollIndex}px`};
        },
        schedule(state) {
            return state.schedule[this.radio];
        },
        hasSchedule(state) {
            return (state.schedule[this.radio] && state.schedule[this.radio].length > 0) || false;
        }
    })
});

const scheduleRadioGridProgram = Vue.component('scheduleRadioGridProgram', {
    template: '#scheduleRadioGridProgramTpl',
    props: ['program'],
    data: function () {
        const width = `${this.program.duration * MINUTE_PIXEL}px`;

        return {
            styleObject: {
                minWidth: width,
                maxWidth: width
            }
        }
    }
});

/* ----- APP ----- */

const app = new Vue({
    el: '#app',
    store,
    components: {
    }
});



