import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import Dialog from '@/components/Dialog'
import drag from "v-drag"

loadFonts()

createApp(App)
    .use(store)
    .use(vuetify)
    .use(drag)
    .component('Dialog', Dialog)
    .mount('#app')