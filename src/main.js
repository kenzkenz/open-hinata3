import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import Dialog from '@/components/Dialog'
import Dialog2 from '@/components/Dialog2'
import VueQrcode from '@chenfengyuan/vue-qrcode'
import { auth, db } from './firebase'

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



//
//
// import { createApp } from 'vue'
// import App from './App.vue'
// import store from './store'
// import vuetify from './plugins/vuetify'
// import { loadFonts } from './plugins/webfontloader'
// import Dialog from '@/components/Dialog'
// import Dialog2 from '@/components/Dialog2'
// import VueQrcode from '@chenfengyuan/vue-qrcode'
// import { auth, db } from './firebase'
//
// // ✅ Sentry 関連の import
// import * as Sentry from '@sentry/vue'
//
// loadFonts()
//
// const app = createApp(App)
//
// // ✅ Sentry 初期化
// Sentry.init({
//     app,
//     dsn: "https://62d9662001052da1678670b81e636811@o4509202243190784.ingest.de.sentry.io/4509202251317328"
// });
//
// app.use(store)
// app.use(vuetify)
// app.component('Dialog', Dialog)
// app.component('Dialog2', Dialog2)
// app.component(VueQrcode.name, VueQrcode)
//
// app.mount('#app')
//
// // ✅ mount 後に実行
// auth.onAuthStateChanged(async user => {
//     if (user) {
//         const userDoc = await db.collection('users').doc(user.uid).get()
//         const groupIds = userDoc.exists ? userDoc.data().groups || [] : []
//
//         for (const groupId of groupIds) {
//             const groupDoc = await db.collection('groups').doc(groupId).get()
//             if (groupDoc.exists) {
//                 const groupName = groupDoc.data().name
//                 store.commit('setCurrentGroupId', groupId)
//                 store.commit('setCurrentGroupName', groupName)
//                 console.log("✅ 自動参加グループ:", groupName)
//                 break
//             }
//         }
//     }
// })


















// import { createApp } from 'vue'
// import App from './App.vue'
// import store from './store'
// import vuetify from './plugins/vuetify'
// import { loadFonts } from './plugins/webfontloader'
// import Dialog from '@/components/Dialog'
// import Dialog2 from '@/components/Dialog2'
// import VueQrcode from '@chenfengyuan/vue-qrcode'
// import { auth, db } from './firebase'  // firebase v8 対応済み
//
// loadFonts()
//
// const app = createApp(App)
// app.use(store)
// app.use(vuetify)
// app.component('Dialog', Dialog)
// app.component('Dialog2', Dialog2)
// app.component(VueQrcode.name, VueQrcode)
//
// app.mount('#app')
//
// // ✅ mount 後に書くことで globalProperties を使える
// auth.onAuthStateChanged(async user => {
//     if (user) {
//         const userDoc = await db.collection('users').doc(user.uid).get()
//         const groupIds = userDoc.exists ? userDoc.data().groups || [] : []
//
//         for (const groupId of groupIds) {
//             const groupDoc = await db.collection('groups').doc(groupId).get()
//             if (groupDoc.exists) {
//                 app.config.globalProperties.currentGroupName = groupDoc.data().name
//                 console.log("✅ 自動参加グループ:", groupDoc.data().name)
//                 break
//             }
//         }
//     }
// })

// import { createApp } from 'vue'
// import App from './App.vue'
// import store from './store'
// import vuetify from './plugins/vuetify'
// import { loadFonts } from './plugins/webfontloader'
// import Dialog from '@/components/Dialog'
// import Dialog2 from '@/components/Dialog2'
// import VueQrcode from '@chenfengyuan/vue-qrcode'
// import { auth, db } from './firebase'  // 🔸 ここで firebase を読み込む
//
// loadFonts()
//
// const app = createApp(App)
//     .use(store)
//     .use(vuetify)
//     .component('Dialog', Dialog)
//     .component('Dialog2', Dialog2)
//     .component(VueQrcode.name, VueQrcode)
//     .mount('#app')
//
// // 🔽 起動時のログイン＆グループ取得処理はここに書く
// auth.onAuthStateChanged(async user => {
//     if (user) {
//         alert(99)
//         const userDoc = await db.collection('users').doc(user.uid).get()
//         const groupIds = userDoc.exists ? userDoc.data().groups || [] : []
//
//         for (const groupId of groupIds) {
//             const groupDoc = await db.collection('groups').doc(groupId).get()
//             if (groupDoc.exists) {
//                 // グローバルに保持しておきたい場合
//                 app.config.globalProperties.currentGroupName = groupDoc.data().name
//                 console.log("自動参加グループ:", groupDoc.data().name)
//                 break
//             }
//         }
//     }
// })