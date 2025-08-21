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

store.state.isIphone = /iPhone/i.test(navigator.userAgent)
store.state.isAndroid = /Android/i.test(navigator.userAgent)
store.state.isSmall1000 = window.innerWidth < 1000
store.state.isSmall500 = window.innerWidth < 500

async function checkVersion() {
    try {
        const response = await fetch("https://kenzkenz.xsrv.jp/open-hinata3/php/appconfig_select.php", {
            method: "POST"
        });
        const result = await response.json();
        if (result.success) {
            const appVersion = Number(result.row.version);
            console.log(appVersion);
            if (appVersion > store.state.clientVersion) {
                const diff = appVersion - store.state.clientVersion;
                console.log(`バージョンが${diff}古いです。`);
                store.state.updatePermalinkFire = !store.state.updatePermalinkFire
                store.state.dialogForVersion = true;
            }
        }
    } catch (e) {
        console.error("バージョンチェックに失敗:", e);
    }
}
// 初回実行
checkVersion();
// 10分おきに実行
setInterval(checkVersion, 10 * 60 * 1000);







// // どこか起動時に一度だけ
// store.watch(
//     state => state.saveHistoryFire,
//     (newVal, oldVal) => {
//         console.group('★ saveHistoryFire changed ★');
//         console.log('old → new:', oldVal, '→', newVal);
//         console.trace();  // コールスタックを出力
//         console.groupEnd();
//     }
// );