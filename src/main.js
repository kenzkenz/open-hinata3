import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import Dialog from '@/components/Dialog'
import Dialog2 from '@/components/Dialog2'
import VueQrcode from '@chenfengyuan/vue-qrcode'
import { auth, db } from './firebase'
import '@/registerServiceWorker';


loadFonts()

const app = createApp(App)
app.use(store)
app.use(vuetify)
app.component('Dialog', Dialog)
app.component('Dialog2', Dialog2)
app.component(VueQrcode.name, VueQrcode)

app.mount('#app')

// ✅ mount 後に実行
auth.onAuthStateChanged(async user => {
    if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get()
        const groupIds = userDoc.exists ? userDoc.data().groups || [] : []

        for (const groupId of groupIds) {
            const groupDoc = await db.collection('groups').doc(groupId).get()
            if (groupDoc.exists) {
                const groupName = groupDoc.data().name
                // ✅ Vuex にグループ名をセット
                store.commit('setCurrentGroupId', groupId)
                store.commit('setCurrentGroupName', groupName)
                console.log("✅ 自動参加グループ:", groupName)
                break
            }
        }
    }
})