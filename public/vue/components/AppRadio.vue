<template>
  <div class="container mb-3">
    <div v-if="radio" class="row">
      <div class="col-md-2 col-12 sticky-top">
        <div class="radio-page-side sticky-top">
            <div class="text-center mb-4">
              <img :alt="radio.name" class="radio-page-logo"
                   :src="picture" v-once>
            </div>
          <radio-streams v-if="radio.streaming_enabled" :radio="radio"></radio-streams>
        </div>
      </div>
      <div v-if="radio" class="col-md-10 col-12">
        <div class="row">
          <div class="col-md-6 col-12 text-center text-sm-start">
            <h4>{{ capitalizedDate }}</h4>
          </div>
        </div>
        <div class="row">
          <div class="col-md-12 mb-2 mt-2 mt-sm-0 text-center text-sm-start">
            <router-link v-if="collection"
              :to="'/' + locale + '/schedule/' + collection.code_name">
              {{ $t('message.radio_page.back') }}
            </router-link>
          </div>
        </div>
        <div class="row">
          <div class="col-md-12 mb-4 mt-sm-0 text-center text-sm-start">
            <a href="#media-current">{{ $t('message.radio_page.current') }}</a>
          </div>
        </div>
        <div class="radio-page-shows">
          <radio-show
            v-for="entry in schedule" :key="entry.hash"
            :show="entry">
          </radio-show>
          <div v-if="schedule.length === 0" class="alert alert-warning" role="alert">
            {{ $t('message.radio_page.no_schedule') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import find from 'lodash/find';
import orderBy from 'lodash/orderBy';
import { mapGetters, mapState } from 'vuex';
import { DateTime } from 'luxon';

import {
  TIMEZONE,
  THUMBNAIL_PAGE_PATH
} from '../config/config';

import RadioShow from './Radio/RadioShow.vue';
import RadioStreams from './Radio/RadioStreams.vue';

export default {
  compatConfig: {
    MODE: 3
  },
  components: {
    RadioShow,
    RadioStreams
  },
  /* eslint-disable no-undef */
  data() {
    return {
      locale: this.$i18n.locale,
      date: DateTime.local().setZone(TIMEZONE).setLocale(locale)
        .toLocaleString(
          {
            year: 'numeric', weekday: 'long', month: 'long', day: '2-digit'
          }
        )
    };
  },
  created() {
    this.$store.dispatch('getRadiosData');
    this.$store.dispatch('getSchedule', { radio: this.$route.params.radio });
  },
  // TODO fix this hack
  mounted() {
    const body = document.querySelector('body');
    body.classList.remove('body-app');

    const app = document.getElementById('app');
    app.classList.add('no-background');

    document.title = this.$i18n.t('message.radio_page.title', { radio: this.radio.name });
  },
  beforeUnmount() {
    const body = document.querySelector('body');
    body.classList.add('body-app');

    const app = document.getElementById('app');
    app.classList.remove('no-background');
  },
  computed: {
    ...mapState({
      radios: state => state.schedule.radios,
      collections: state => state.schedule.collections,
      currentCollection: state => state.schedule.currentCollection,
    }),
    ...mapGetters([
      'hasSchedule'
    ]),
    radio() {
      return this.radios[this.$route.params.radio] === undefined ? null
        : this.radios[this.$route.params.radio];
    },
    schedule() {
      if (this.hasSchedule === true) {
        return orderBy(this.$store.state.schedule.schedule[this.$route.params.radio],
          ['start_at'], ['asc']);
      }

      return [];
    },
    collection() {
      if (this.radio === null) {
        return null;
      }

      // find if part of current collection to go back
      if (this.collections[this.currentCollection].radios.indexOf(this.radio.code_name) !== -1) {
        return this.collections[this.currentCollection];
      }

      // find first collection to have this radio
      const collection = find(this.collections,
        c => c.radios.indexOf(this.radio.code_name) !== -1);

      return collection === undefined ? null : collection;
    },
    picture() {
      return `${THUMBNAIL_PAGE_PATH}${this.radio.code_name}.png`;
    },
    capitalizedDate() {
      if (!this.date) return '';
      const valueString = this.date.toString();

      return valueString.charAt(0).toUpperCase() + valueString.slice(1);
    }
  }
};
</script>
