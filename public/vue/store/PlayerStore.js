import Vue from 'vue';

import find from 'lodash/find';
import { DateTime } from 'luxon';

import * as config from '../config/config';
import AndroidApi from '../api/AndroidApi';
import StreamsApi from '../api/StreamsApi';
import PlayerUtils from '../utils/PlayerUtils';
import ScheduleUtils from '../utils/ScheduleUtils';

const VueCookie = require('vue-cookie');

Vue.use(VueCookie);

const initState = {
  playing: false,
  externalPlayer: AndroidApi.hasAndroid,
  // externalPlayer: false,
  radio: Vue.cookie.get(config.COOKIE_LAST_RADIO_PLAYED)
    ? JSON.parse(Vue.cookie.get(config.COOKIE_LAST_RADIO_PLAYED)) : null,
  radioStreamCodeName: Vue.cookie.get(config.COOKIE_LAST_RADIO_STREAM_PLAYED)
    ? JSON.parse(Vue.cookie.get(config.COOKIE_LAST_RADIO_STREAM_PLAYED)) : null,
  show: null,
  song: null,
  volume: Vue.cookie.get(config.COOKIE_VOLUME)
    ? parseInt(Vue.cookie.get(config.COOKIE_VOLUME), 10) : config.DEFAULT_VOLUME,
  muted: Vue.cookie.get(config.COOKIE_MUTED) === 'true' || false,
  sessionStart: null,
  focus: {
    icon: false,
    fader: false
  }
};

const storeGetters = {
  radioPlayingCodeName: state => (state.radio !== null ? state.radio.code_name : null),
  displayVolume: state => state.focus.icon || state.focus.fader || false,
  streamUrl: (state) => {
    if (state.radio === null) { return null; }

    if (state.radio.type === config.PLAYER_TYPE_STREAM || state.radioStreamCodeName === null) {
      return state.radio.stream_url;
    }

    return state.radio.streams[state.radioStreamCodeName].url;
  },
  currentSong: (state) => {
    if (state.song === undefined || state.song === null) {
      return null;
    }

    let song = '';
    let hasInterpreter = false;
    if (state.song.interpreter !== undefined && state.song.interpreter !== null
      && state.song.interpreter !== '') {
      song += state.song.interpreter;
      hasInterpreter = true;
    }

    if (state.song.title !== undefined && state.song.title !== null
        && state.song.title !== '') {
      if (hasInterpreter === true) {
        song += ' - ';
      }

      song += state.song.title;
    }

    return song === '' ? null : song;
  }
};

/* eslint-disable object-curly-newline */
const storeActions = {
  play: ({ state, commit, rootState, rootGetters }, params) => {
    const { radioCodeName, streamCodeName } = params;

    PlayerUtils.sendListeningSession(state.externalPlayer, state.playing,
      state.radio, state.radioStreamCodeName, state.sessionStart);

    commit('stop');

    const radio = find(rootState.schedule.radios, { code_name: radioCodeName });

    if (radio === undefined || radio.streaming_enabled === false) {
      return;
    }

    const stream = ScheduleUtils.getStreamFromCodeName(streamCodeName, radio);

    if (stream !== null) {
      Vue.cookie.set(config.COOKIE_LAST_RADIO_PLAYED, JSON.stringify(radio), config.COOKIE_PARAMS);
      Vue.cookie.set(config.COOKIE_LAST_RADIO_STREAM_PLAYED,
        JSON.stringify(streamCodeName), config.COOKIE_PARAMS);

      // secondary streams have no schedule
      const show = stream.main === true ? rootGetters.currentShowOnRadio(radio.code_name) : null;

      commit('switchRadio', { radio, streamCodeName, show });
      // Otherwise will be ignored
      Vue.nextTick(() => {
        commit('play');
      });
    }
  },
  stop: ({ state, commit }) => {
    PlayerUtils.sendListeningSession(state.externalPlayer, state.playing,
      state.radio, state.radioStreamCodeName, state.sessionStart);
    commit('pause');
  },
  playStream: ({ rootState, state, commit }, stream) => {
    PlayerUtils.sendListeningSession(state.externalPlayer, state.playing,
      state.radio, state.radioStreamCodeName, state.sessionStart);
    commit('stop');

    setTimeout(() => {
      StreamsApi.incrementPlayCount(stream.code_name, rootState.streams.radioBrowserApi);
    }, 500);
    Vue.cookie.set(config.COOKIE_LAST_RADIO_PLAYED, JSON.stringify(stream), config.COOKIE_PARAMS);

    commit('switchRadio', { radio: stream, show: null });

    // Otherwise will be ignored
    Vue.nextTick(() => {
      commit('play');
    });
  },
  togglePlay: ({ state, commit }) => {
    PlayerUtils.sendListeningSession(state.externalPlayer, state.playing,
      state.radio, state.radioStreamCodeName, state.sessionStart);
    commit('togglePlay');
  },
  toggleMute: ({ state, commit }) => {
    Vue.cookie.set(config.COOKIE_MUTED, !state.muted, config.COOKIE_PARAMS);
    commit('toggleMute');
  },
  playPrevious: ({ state, dispatch }) => {
    PlayerUtils.sendListeningSession(state.externalPlayer, state.playing,
      state.radio, state.radioStreamCodeName, state.sessionStart);

    dispatch('playNext', 'backward');
  },
  playNext: ({ rootState, state, dispatch }, way) => {
    if (
      (rootState.schedule.collections === null || rootState.schedule.collections.length === 0)
      || rootState.schedule.currentCollection === null
      || (state.radio === undefined || state.radio === null)
    ) {
      return;
    }

    if (state.radio.type === config.PLAYER_TYPE_RADIO) {
      const collectionToIterateOn = find(rootState.schedule.collections,
        { code_name: rootState.schedule.currentCollection });
      const radios = ScheduleUtils.rankCollection(collectionToIterateOn,
        rootState.schedule.radios, rootState.schedule.categoriesExcluded);
      const nextRadio = PlayerUtils.getNextRadio(state.radio, radios, way || 'forward');

      if (nextRadio !== null) {
        dispatch('play', nextRadio.code_name);
      }
    } else if (state.radio.type === config.PLAYER_TYPE_STREAM) {
      const nextRadio = PlayerUtils.getNextStream(state.radio, rootState.streams.streamRadios, way || 'forward');

      if (nextRadio !== null) {
        dispatch('playStream', nextRadio);
      }
    }
  },
  setSong: ({ commit }, song) => {
    commit('setSong', song);
  },
  setVolume: ({ commit }, volume) => {
    Vue.cookie.set(config.COOKIE_VOLUME, volume, config.COOKIE_PARAMS);
    commit('setVolume', volume);
  },
  volumeFocus: ({ commit }, params) => {
    commit('setFocus', params);
  },
  /* From Android app */
  updateStatusFromExternalPlayer: ({ rootState, rootGetters, commit }, params) => {
    const { playbackState, radioCodeName } = params;

    const parse = () => {
      let radio = find(rootState.schedule.radios, { code_name: radioCodeName });
      let radioStream = null;
      let show = null;

      // if not radio, maybe radio substream, or maybe stream
      // @todo better handling of types
      if (radio === undefined) {
        let found = false;
        const radios = Object.keys(rootState.schedule.radios);
        let i = 0;
        do {
          radioStream = find(rootState.schedule.radios[radios[i]].streams,
            { code_name: radioCodeName });

          if (radioStream !== undefined) {
            radio = rootState.schedule.radios[radios[i]];
            found = true;
          }
          i += 1;
        } while (found === false && i < radios.length);

        if (radio === undefined) {
          radio = find(rootState.streams.streamRadios, { code_name: radioCodeName });
        }
      } else {
        show = rootGetters.currentShowOnRadio(radio.code_name);
      }

      if (radio !== undefined /* && radio.streaming_enabled === true */
        && config.PLAYER_STATE.indexOf(playbackState) !== -1) {
        commit('updatePlayingStatus', { radio, radioStream, show, playbackState });
      }
    };

    parse();

    setTimeout(
      () => {
        parse();
      },
      1000
    );
  },
  commandFromExternalPlayer: ({ dispatch }, params) => {
    const { command } = params;
    dispatch(command);
  }
};

const storeMutations = {
  pause(state) {
    if (state.externalPlayer === true) {
      AndroidApi.pause();
      return;
    }

    state.playing = false;
    state.sessionStart = null;
  },
  stop(state) {
    state.playing = false;
    state.sessionStart = null;
  },
  play(state) {
    if (state.externalPlayer === true) {
      return;
    }
    if (state.radio !== null) {
    /* if (state.externalPlayer === true) {
        AndroidApi.play(state.radio, state.show);
        return;
      } */

      state.sessionStart = DateTime.local().setZone(config.TIMEZONE);
      state.playing = true;
    }
  },
  switchRadio(state, { radio, streamCodeName, show }) {
    const prevRadioCodeName = state.radio === null ? null : state.radio.code_name;
    const prevStreamCodeName = state.radioStreamCodeName;
    const prevShowHash = state.show === null ? null : state.show.hash;

    if ((radio !== null && prevRadioCodeName === radio.code_name)
      && ((streamCodeName !== undefined && streamCodeName !== null
        && streamCodeName === prevStreamCodeName)
        || (prevStreamCodeName === null
          && (streamCodeName === undefined || streamCodeName === null)))
      && ((show !== null && prevShowHash === show.hash)
        || (prevShowHash === null && show === null))) {
      // @todo fix this, probably by differentiating switchRadio & update
      if (state.externalPlayer === false || state.playing === true) {
        return;
      }
    }

    if (radio !== null && state.externalPlayer === true) {
      const stream = ScheduleUtils.getStreamFromCodeName(streamCodeName, radio);
      AndroidApi.play(radio, stream, show);
      // return;
    }

    if (state.playing === true && radio !== null
      && state.externalPlayer === false) {
      state.sessionStart = DateTime.local().setZone(config.TIMEZONE);
    }

    Vue.set(state, 'radio', radio);
    Vue.set(state, 'show', show);
    Vue.set(state, 'song', null);
    Vue.set(state, 'radioStreamCodeName', streamCodeName || null);

    if (state.externalPlayer === false) {
      PlayerUtils.showNotification(radio, streamCodeName, show);
    }
  },
  togglePlay(state) {
    if (state.playing === true) {
      if (state.externalPlayer === true) {
        AndroidApi.pause();
        return;
      }

      state.playing = false;
      PlayerUtils.sendListeningSession(state.externalPlayer, state.playing,
        state.radio, state.radioStreamCodeName, state.sessionStart);
    } else if (state.playing === false && state.radio !== undefined && state.radio !== null) {
      if (state.externalPlayer === true) {
        const stream = find(state.radio.streams, { code_name: state.radioStreamCodeName });
        AndroidApi.play(state.radio, stream, state.show);
        return;
      }

      state.playing = true;
      state.sessionStart = DateTime.local().setZone(config.TIMEZONE);
    }
  },
  toggleMute(state) {
    state.muted = !state.muted;
  },
  setVolume(state, volume) {
    state.volume = volume;
  },
  setSong(state, song) {
    if (song === null || song === undefined) {
      state.song = null;
    }

    state.song = song;
  },
  setFocus(state, params) {
    state.focus[params.element] = params.status;
  },
  /* From Android app */
  updatePlayingStatus(state, params) {
    const { playbackState, radio, radioStream, show } = params;

    Vue.set(state, 'playing', playbackState === config.PLAYER_STATE_PLAYING);
    Vue.set(state, 'radio', radio);
    Vue.set(state, 'radioStreamCodeName', radioStream !== null ? radioStream.code_name : null);
    Vue.set(state, 'show', show);
  }
};

export default {
  state: initState,
  getters: storeGetters,
  actions: storeActions,
  mutations: storeMutations
};
