<template>
  <div class="container streams-filters-container">
    <div class="row">
      <div class="col-md-4 col-sm-12">
        <button class="btn btn-primary btn-sm" type="submit"
          v-on:click="playRandom">
          <span class="glyphicon glyphicon-play-circle" aria-hidden="true"></span>
          {{ $t('message.streaming.random') }}
        </button>
      </div>
      <div class="col-select col-md-4 col-sm-6">
        <v-select
          @input="countryChange"
          :value="selectedCountry"
          :options="countriesOptions"
          :selectable="option => option.code !== code_favorites || this.favorites.length > 0"
        >
          <template v-slot:option="option">
            <img v-if="option.code === code_all || option.code === code_favorites"
                 class="gb-flag gb-flag--mini"
                 :src="'/img/' + option.code.toLowerCase() + '_streams.svg'">
            <gb-flag
                v-else
                :code="option.code"
                size="mini"
            />&nbsp;&nbsp;{{ option.label }}
          </template>
        </v-select>
      </div>
      <div class="col-select col-md-3 col-sm-6">
        <v-select
            @input="sortByChange"
            :value="selectedSortBy"
            :options="sortByOptions">
        </v-select>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex';

import Vue from 'vue';
import VueFlags from '@growthbunker/vueflags';
import vSelect from 'vue-select';

import {
  STREAMING_CATEGORY_FAVORITES,
  STREAMING_CATEGORY_ALL,
  GTAG_CATEGORY_STREAMING,
  GTAG_STREAMING_ACTION_FILTER_COUNTRY,
  GTAG_STREAMING_ACTION_FILTER_SORT,
  GTAG_ACTION_PLAY_RANDOM,
  GTAG_STREAMING_FILTER_VALUE,
  GTAG_ACTION_PLAY_VALUE,
} from '../../config/config';

Vue.component('v-select', vSelect);

Vue.use(VueFlags, {
  // Specify the path of the folder where the flags are stored.
  iconPath: '/img/flags/',
});

export default {
  data: () => (
    {
      code_all: STREAMING_CATEGORY_ALL,
      code_favorites: STREAMING_CATEGORY_FAVORITES
    }
  ),
  computed: {
    ...mapGetters([
      'countriesOptions'
    ]),
    ...mapState({
      favorites: state => state.streams.favorites,
      selectedCountry: state => state.streams.selectedCountry,
      selectedSortBy: state => state.streams.selectedSortBy,
      sortByOptions: state => state.streams.sortBy,
    })
  },
  methods: {
    countryChange(country) {
      this.$gtag.event(GTAG_STREAMING_ACTION_FILTER_COUNTRY, {
        event_category: GTAG_CATEGORY_STREAMING,
        event_label: country.code.toLowerCase(),
        value: GTAG_STREAMING_FILTER_VALUE
      });

      this.$router.push({ name: 'streaming', params: { countryOrCategory: country.code.toLowerCase() } });
    },
    sortByChange(sortBy) {
      this.$gtag.event(GTAG_STREAMING_ACTION_FILTER_SORT, {
        event_category: GTAG_CATEGORY_STREAMING,
        event_label: sortBy.code,
        value: GTAG_STREAMING_FILTER_VALUE
      });

      this.$store.dispatch('sortBySelection', sortBy);
    },
    playRandom() {
      this.$gtag.event(GTAG_ACTION_PLAY_RANDOM, {
        event_category: GTAG_CATEGORY_STREAMING,
        event_label: 'random',
        value: GTAG_ACTION_PLAY_VALUE
      });

      this.$store.dispatch('playRandom');
    }
  }
};
</script>