import { createApp } from "vue";
import { createPinia } from "pinia";
import {markRaw} from "vue";

import App from "./App.vue";
//import Vue from 'vue'
import router from "./router";

import "./assets/main.css";
import "./firebase/init";
//import VueTour from "vue-tour"
//import * as styleVueTour from "vue-tour/dist/vue-tour.css"
//require('vue-tour/dist/vue-tour.css')

//import VueShepherdPlugin from 'vue-shepherd';
//import "vue-shepherd/dist/css/shepherd.css"
require('shepherd.js/dist/css/shepherd.css');

const app = createApp(App);
const pinia = createPinia()
pinia.use(({ store }) => { store.router = markRaw(router) });
app.use(pinia)

//app.use(createPinia());
app.use(router);

app.mount("#app");
