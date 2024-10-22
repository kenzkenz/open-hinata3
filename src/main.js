import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import Dialog from '@/components/Dialog'
import Dialog2 from '@/components/Dialog2'
import drag from "v-drag"

loadFonts()

createApp(App)
    .use(store)
    .use(vuetify)
    .use(drag)
    .component('Dialog', Dialog)
    .component('Dialog2', Dialog2)
    .mount('#app')