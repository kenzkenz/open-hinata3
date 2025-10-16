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
import Haptics from '@/js/utils/haptics'
import VDialogConfirm from '@/components/V-dialog/V-dialog-confirm.vue'

loadFonts()

// ディレクティブ
const stickBottomV3 = {
    mounted(el, binding) {
        const getOpts = (b) => ({
            threshold: (b && b.value && typeof b.value.threshold === 'number') ? b.value.threshold : 40,
            useSmooth: !!(b && b.modifiers && b.modifiers.smooth),
        });
        let opts = getOpts(binding);
        const isNearBottom = () => (el.scrollHeight - el.clientHeight - el.scrollTop) <= opts.threshold;
        const scrollToBottom = () => {
            el.scrollTo({ top: el.scrollHeight, behavior: opts.useSmooth ? 'smooth' : 'auto' });
        };
        const state = { stick: true };
        const onScroll = () => { state.stick = isNearBottom(); };
        el.addEventListener('scroll', onScroll, { passive: true });
        const mo = new MutationObserver(() => { if (state.stick) scrollToBottom(); });
        mo.observe(el, { childList: true, subtree: true });
        let ro;
        if ('ResizeObserver' in window) {
            ro = new ResizeObserver(() => { if (state.stick) scrollToBottom(); });
            ro.observe(el);
        }
        requestAnimationFrame(scrollToBottom);
        el._stickBottomCleanup = () => {
            el.removeEventListener('scroll', onScroll);
            mo.disconnect();
            ro?.disconnect();
        };
    },
    updated(el, binding) {
        const threshold = (binding.value && typeof binding.value.threshold === 'number') ? binding.value.threshold : 40;
        const useSmooth = !!(binding.modifiers && binding.modifiers.smooth);
        const atBottom = (el.scrollHeight - el.clientHeight - el.scrollTop) <= threshold;
        if (atBottom) el.scrollTo({ top: el.scrollHeight, behavior: useSmooth ? 'smooth' : 'auto' });
    },
    unmounted(el) {
        el._stickBottomCleanup?.();
    }
};


const app = createApp(App)
app.use(Haptics)
app.use(store)
app.use(vuetify)
app.component('Dialog', Dialog)
app.component('Dialog2', Dialog2)
app.component(VueQrcode.name, VueQrcode)
app.component('VDialogConfirm', VDialogConfirm)
app.directive('stick-bottom', stickBottomV3); // ディレクティブをセット

app.mount('#app')

store.state.oh3App = app

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