<template>
  <div class="streams-one"
       :class="{
          'streams-one-play-active': (radio.code_name === radioPlayingCodeName),
          'streams-one-play-paused': (playing === false && radio.code_name === radioPlayingCodeName)
  }">
    <div class="streams-one-img" :style="styleObject" v-on:click="playStop">
      <div class="streams-one-img-play"></div>
    </div>
    <div class="streams-one-name" :title="radio.name" v-on:click="playStop">{{ radio.name }}
    </div>
    <div class="streams-one-fav" :class="{ 'streams-one-fav-isfavorite': isFavorite() }"
         v-on:click.stop="toggleFavorite">
      <img class="streams-one-icon" src="/img/favorites_streams.svg">
    </div>
    <div
        class="streams-one-flag"
        v-on:click.stop="flagClick"
        v-if="(selectedCountry.code ===code_all || selectedCountry.code === code_favorites)
                && radio.country_code !== null">
      <gb-flag
          :code="radio.country_code"
          size="micro"
      />
    </div>
  </div>
</template>

<script>
import Vue from 'vue';
import VueFlags from '@growthbunker/vueflags';

import { mapGetters, mapState } from 'vuex';

import * as config from '../../config/config';

Vue.use(VueFlags, {
  // Specify the path of the folder where the flags are stored.
  iconPath: '/img/flags/',
});

export default {
  props: ['radio'],
  data() {
    const img = (this.radio.img === null || this.radio.img === '') ? '/img/stream-placeholder.png'
      : `${config.THUMBNAIL_STREAM_PATH}${this.radio.img}`;
    return {
      code_all: config.STREAMING_CATEGORY_ALL,
      code_favorites: config.STREAMING_CATEGORY_FAVORITES,
      styleObject: {
        backgroundImage: `url("${img}")`
      }
    };
  },
  computed: {
    ...mapState({
      playing: state => state.player.playing,
      selectedCountry: state => state.streams.selectedCountry,
      favorites: state => state.streams.favorites
    }),
    ...mapGetters([
      'radioPlayingCodeName',
    ]),
  },
  methods: {
    isFavorite() {
      return this.favorites.indexOf(this.radio.code_name) !== -1;
    },
    playStop() {
      // stop if playing
      if (this.playing === true && this.radioPlayingCodeName === this.radio.code_name) {
        this.$gtag.event(config.GTAG_ACTION_STOP, {
          event_category: config.GTAG_CATEGORY_STREAMING,
          event_label: this.radio.code_name,
          value: config.GTAG_ACTION_STOP_VALUE
        });

        this.$store.dispatch('stop');
        return;
      }

      this.$gtag.event(config.GTAG_ACTION_PLAY, {
        event_category: config.GTAG_CATEGORY_STREAMING,
        event_label: this.radio.code_name,
        value: config.GTAG_ACTION_PLAY_VALUE
      });

      this.$store.dispatch('playStream', this.radio);
    },
    flagClick() {
      this.$gtag.event(config.GTAG_STREAMING_ACTION_FILTER_COUNTRY, {
        event_category: config.GTAG_CATEGORY_STREAMING,
        event_label: this.radio.country_code.lowerCase(),
        value: config.GTAG_STREAMING_FILTER_VALUE
      });

      this.$store.dispatch('countrySelection', this.radio.country_code);
    },
    toggleFavorite() {
      this.$gtag.event(config.GTAG_ACTION_FAVORITE_TOGGLE, {
        event_category: config.GTAG_CATEGORY_SCHEDULE,
        event_label: this.radio.code_name,
        value: config.GTAG_ACTION_FAVORITE_TOGGLE_VALUE
      });

      this.$store.dispatch('toggleFavorite', this.radio);
    }
  }
};
</script>