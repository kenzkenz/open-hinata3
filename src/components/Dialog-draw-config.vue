<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div class="config-div">
      aaaaaaaaa
    </div>
  </Dialog>
</template>

<script>
import axios from "axios"
import maplibregl from 'maplibre-gl'
import {history} from "@/App";
import {konUrls} from "@/js/layers";
export default {
  name: 'Dialog-draw-config',
  props: ['mapName'],
  data: () => ({

  }),
  computed: {
    s_dialogs () {
      return this.$store.state.dialogs.drawConfigDialog
    },
  },
  methods: {
  },
  mounted() {

    document.querySelector('#drag-handle-shareDialog-map01').innerHTML = '<span style="font-size: large;">設定</span>'

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

