<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div class="share-div">
      <v-text-field label="" v-model="s_url" style="margin-top: 10px"></v-text-field>
      <v-btn style="margin-left: 5px;margin-top: -10px" class="tiny-btn" @click="copy">URLをコピー</v-btn>
      <v-btn style="margin-left: 5px;margin-top: -10px" class="tiny-btn" @click="qrcopy">QRコードをダウンロード</v-btn>
      <hr>
      <vue-qrcode id="qr-code" :value="s_url" :options="{ width: 320 }"></vue-qrcode>
    </div>
  </Dialog>
</template>

<script>
import axios from "axios"
import maplibregl from 'maplibre-gl'
import {history} from "@/App";
import {konUrls} from "@/js/layers";
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
    copy () {
      navigator.clipboard.writeText(this.s_url);
      alert('URLをクリップボードにコピーしました!');
    },
    qrcopy () {
      const canvas = document.getElementById('qr-code');
      const image = canvas.toDataURL('image/png'); // 画像データURLを取得

      // 仮想のaタグを作成してダウンロード
      const link = document.createElement('a');
      link.href = image;
      link.download = 'qrcode.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

