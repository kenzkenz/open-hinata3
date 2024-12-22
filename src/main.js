import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import Dialog from '@/components/Dialog'
import Dialog2 from '@/components/Dialog2'
import VueQrcode from '@chenfengyuan/vue-qrcode'

loadFonts()

createApp(App)
    .use(store)
    .use(vuetify)
    .component('Dialog', Dialog)
    .component('Dialog2', Dialog2)
    .component(VueQrcode.name, VueQrcode)
    .mount('#app')