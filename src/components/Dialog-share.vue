<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div class="share-div">
<!--      <v-text-field label="" v-model="s_url" style="margin-top: 10px"></v-text-field>-->
      <div>
        <v-btn style="margin-left: 5px;" class="tiny-btn" @click="xPost">Xにポスト</v-btn>
        <v-btn style="margin-left: 5px;" class="tiny-btn" @click="copy">URLをコピー</v-btn>
        <v-btn style="margin-left: 5px;" class="tiny-btn" @click="qrcopy">QRコードをダウンロード</v-btn>
      </div>
      <hr>
      <vue-qrcode style="cursor: pointer" @click="qrCodeClick" id="qr-code" :value="s_url" :options="{ width: 320 }"></vue-qrcode>
    </div>
  </Dialog>
</template>

<script>

export default {
  name: 'Dialog-share',
  props: ['mapName'],
  data: () => ({
  }),
  computed: {
    s_url () {
      return this.$store.state.url
    },
    s_dialogs () {
      return this.$store.state.dialogs.shareDialog
    },
  },
  methods: {
    qrCodeClick () {
      this.$store.dispatch('showFloatingWindow', 'qrcode');
    },
    xPost () {
      this.$store.state.updatePermalinkFire = ! this.$store.state.updatePermalinkFire
      setTimeout(() => {
        const intentUrl =
            "https://twitter.com/intent/tweet?text=" + encodeURIComponent('open-hinata3(OH3)です。\n\n#openhinata3 #OH3\n' + this.$store.state.url);
        window.open(intentUrl, '_blank');
      },1000)
    },
    copy () {
      this.$store.state.updatePermalinkFire = ! this.$store.state.updatePermalinkFire
      alert('URLをクリップボードにコピーしました!');
      setTimeout(() => {
        navigator.clipboard.writeText(this.s_url);
      },1000)
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
  },
  mounted() {

    document.querySelector('#drag-handle-shareDialog-map01').innerHTML = '<span style="font-size: large;">共有</span>'

    if (localStorage.getItem('terrainLevel')) {
      this.s_terrainLevel = Number(localStorage.getItem('terrainLevel'))
    } else {
      this.s_terrainLevel = 1
    }
    this.s_isPitch = JSON.parse(localStorage.getItem('isPitch'))
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
}
</style>

