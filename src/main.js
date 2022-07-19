import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faLeaf } from '@fortawesome/free-solid-svg-icons'

library.add(faLeaf)
createApp(App).use(store).mount('#app')
