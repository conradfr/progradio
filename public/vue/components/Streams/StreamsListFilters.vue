<template>
  <div class="container streams-filters-container mb-4">
    <div class="row">
      <div class="col-md-4 col-sm-12 pb-3 pb-sm-3 pb-md-0">
        <div class="input-group" v-if="searchActive">
          <span class="input-group-text" id="search-addon1">
            <i class="bi bi-search"></i>
          </span>
          <input type="text"
                 class="form-control"
                 :placeholder="$t('message.streaming.search_placeholder')"
                 name="searchText"
                 ref="searchText"
                 aria-describedby="search-addon1"
                 :value="searchText"
                 v-on:input="searchTextChange"
                 v-on:blur="searchDeactivate"
          />
          <i class="bi bi-x-lg form-control-feedback"
             v-on:click="searchDeactivate(true)"></i>
        </div>

        <button v-if="!searchActive" class="btn btn-primary btn-sm me-1" type="submit"
                v-on:click="searchActivate">
          <i class="bi bi-search"></i>
        </button>
        <button v-if="!searchActive" class="btn btn-primary btn-sm" type="submit"
          v-on:click="playRandom">
          <i class="bi bi-play-circle"></i>
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
      <div class="col-select col-md-3 col-sm-6 mt-2 mt-sm-0">
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

/* eslint-disable import/no-duplicates */
import Vue from 'vue';
import { nextTick } from 'vue';
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
  GTAG_ACTION_SEARCH_BUTTON
} from '../../config/config';

Vue.component('v-select', vSelect);

export default {
  compatConfig: {
    MODE: 3
  },
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
      searchText: state => state.streams.searchText,
      searchActive: state => state.streams.searchActive
    })
  },
  methods: {
    searchActivate() {
      this.$store.dispatch('setSearchActive', true)
        .then(() => {
          nextTick(() => {
            this.$refs.searchText.focus();
          });
        });

      this.$gtag.event(GTAG_ACTION_SEARCH_BUTTON, {
        event_category: GTAG_CATEGORY_STREAMING,
        value: GTAG_STREAMING_FILTER_VALUE
      });
    },
    searchDeactivate(force) {
      if (force === true || this.searchText === null || this.searchText.trim() === '') {
        this.$store.dispatch('setSearchActive', false);
      }
    },
    searchTextChange(event) {
      this.$store.dispatch('setSearchText', event.target.value)
        .then(() => {
          nextTick(() => {
            this.$store.dispatch('getStreamRadios');
          });
        });
    },
    countryChange(country) {
      this.$gtag.event(GTAG_STREAMING_ACTION_FILTER_COUNTRY, {
        event_category: GTAG_CATEGORY_STREAMING,
        event_label: country.code.toLowerCase(),
        value: GTAG_STREAMING_FILTER_VALUE
      });

      this.$router.push({ name: 'streaming', params: { countryOrCategoryOrUuid: country.code.toLowerCase() } });
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
