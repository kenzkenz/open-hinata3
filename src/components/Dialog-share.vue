<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div class="share-div">
<!--      <v-text-field label="" v-model="s_url" style="margin-top: 10px"></v-text-field>-->
      <div class="btns">
        <v-btn style="margin-left: 0px;" class="tiny-btn" @click="xPost">Xにポスト</v-btn>
        <v-btn style="margin-left: 5px;" class="tiny-btn" @click="copy">URLコピー</v-btn>
        <v-btn style="margin-left: 5px;" class="tiny-btn" @click="qrcopy">QRコードDL</v-btn>
        <v-btn style="margin-left: 5px;" class="tiny-btn" @click="VDialogIframeOpen">iframe作成</v-btn>
      </div>
      <hr>
      <vue-qrcode style="cursor: pointer" @click="qrCodeClick" id="qr-code" :value="s_url" :options="{ width: 320 }"></vue-qrcode>
    </div>
  </Dialog>
</template>

<script>

import {mapState} from "vuex";
import store from "@/store";

export default {
  name: 'Dialog-share',
  props: ['mapName'],
  data: () => ({
  }),
  computed: {
    ...mapState([
      'isIOS',
      'isStandalone',
    ]),
    s_url () {
      return this.$store.state.url
    },
    s_dialogs () {
      return this.$store.state.dialogs.shareDialog
    },
  },
  methods: {
    VDialogIframeOpen() {
      this.$store.state.iframeVDIalog = true
    },
    qrcopy () {
      this.$store.state.updatePermalinkFire = ! this.$store.state.updatePermalinkFire
      setTimeout(() => {
        const canvas = document.getElementById('qr-code');
        const image = canvas.toDataURL('image/png'); // 画像データURLを取得
        // 仮想のaタグを作成してダウンロード
        const link = document.createElement('a');
        link.href = image;
        link.download = 'qrcode.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },1000)
    },
    qrCodeClick () {
      if (!this.$store.state.isSmall500) {
        this.$store.dispatch('showFloatingWindow', 'qrcode');
      }
    },
    xPost () {
      // まず今使うURLを確定（watcher待ちに依存しない）
      const shareUrl = this.s_url
      const text = `open-hinata3(OH3)です。\n\n#openhinata3 #OH3\n${shareUrl}`;
      this.$store.state.updatePermalinkFire = !this.$store.state.updatePermalinkFire;
      const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      const appUrl    = `twitter://post?message=${encodeURIComponent(text)}`;
      const openWithAnchor = (url) => {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      };
      try {
        if (this.isIOS) {
          // 1) Twitterアプリ試行 → 2) すぐWeb Intentにフォールバック
          // （最初のクリック内で a.click() を実行：ユーザー操作扱いを維持）
          openWithAnchor(appUrl);
          // 失敗してもユーザー操作中にもう一度開く（短い遅延は許容だが、念のため同イベント内で実行）
          // iOSの挙動を安定させるため、setTimeoutは使わず「即時もう一度」呼ぶ
          openWithAnchor(intentUrl);
          return;
        }
        if (this.isStandalone) {
          // ホーム画面PWAは window.open が塞がれがち：同タブ遷移
          location.href = intentUrl;
        } else {
          openWithAnchor(intentUrl);
        }
      } catch (_) {
        // 最終フォールバック
        location.href = intentUrl;
      }
    },
    async copy () {
      // 使う文字列を先に決める
      const text = this.s_url
      this.$store.state.updatePermalinkFire = !this.$store.state.updatePermalinkFire;
      // まずコピーを“即時”実行（ユーザー操作扱いを保持）
      const copyViaExecCommand = () => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      };
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text); // HTTPS + ユーザー操作内
        } else {
          const ok = copyViaExecCommand();
          if (!ok) throw new Error('execCommand failed');
        }
        this.$store.state.loadingMessage3 = 'クリップボードにコピーしました。'
        this.$store.state.loading3 = true
        setTimeout(() => {
          this.$store.state.loading3 = false
        },2000)
      } catch (e) {
        alert('コピーできませんでした。手動でコピーしてください:');
      }
    }
  },
  mounted() {

    document.querySelector('#drag-handle-shareDialog-map01').innerHTML = '<span style="font-size: large;">共有</span>'

    if (localStorage.getItem('terrainLevel')) {
      this.s_terrainLevel = Number(localStorage.getItem('terrainLevel'))
    } else {
      this.s_terrainLevel = 1
    }
    this.s_isPitch = JSON.parse(localStorage.getItem('isPitch'))
  },
  watch: {
    s_dialogs: {
      handler: function () {
         this.$store.state.updatePermalinkFire = !this.$store.state.updatePermalinkFire
      },
      deep: true
    },
  }
}
</script>
<style scoped>
.share-div {
  height: auto;
  width: 320px;
  margin: 10px;
  overflow: auto;
  user-select: text;
  font-size: larger;
  color: black;
  background-color: white;
  text-align: center;
}
/* スマホ用のスタイル */
@media screen and (max-width: 768px) {
  .share-div {
    width: 100%;
    margin: 0;
  }
  .btns {
    margin-top: 10px;
  }
}
</style>

