<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize">
      <v-text-field label="住所で検索" v-model="address" @change="sercheAdress" style="margin-top: 10px"></v-text-field>
      標高強調
      <div class="range-div">
        {{s_terrainLevel}}倍<br>
        <input type="range" min="1" max="10" step="0.1" class="range" v-model.number="s_terrainLevel" @input="terrainLevelInput"/>
      </div>
<!--      <button @click="aaa">aaa</button>-->
    </div>
  </Dialog>
</template>

<script>
import axios from "axios"
import maplibregl from 'maplibre-gl'
export default {
  name: 'Dialog-menu',
  props: ['mapName'],
  data: () => ({
    address: '',
    menuContentSize: {'height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_terrainLevel: {
      get() {
        return this.$store.state.terrainLevel
      },
      set(value) {
        this.$store.state.terrainLevel = value
      }
    },
    s_dialogs () {
      return this.$store.state.dialogs.menuDialog
    }
  },
  methods: {
    sercheAdress () {
      console.log(this.address)

      const map = this.$store.state.map01
      // const vm = this
      axios
          .get('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + this.address)
          .then(function (response) {
            const coordinates = response.data[0].geometry.coordinates
            // ユーザーの操作を一時的に無効化
            map.scrollZoom.disable();
            map.dragPan.disable();
            map.keyboard.disable();
            map.doubleClickZoom.disable();
            map.flyTo({
              center: [parseFloat(coordinates[0]), parseFloat(coordinates[1])],
              zoom: 14,
              essential: true
            })
            // flyToアニメーション完了後にユーザー操作を再度有効化
            map.once('moveend', () => {
              map.scrollZoom.enable();
              map.dragPan.enable();
              map.keyboard.enable();
              map.doubleClickZoom.enable();
            });
            // 検索結果の位置にマーカーを追加
            const marker = new maplibregl.Marker()
                .setLngLat([parseFloat(coordinates[0]), parseFloat(coordinates[1])])
                // .setPopup(new maplibregl.Popup().setHTML(`<strong>${vm.address}</strong>`)) // ポップアップに住所を表示
                .addTo(map);
            // マーカーをクリックしたときにマーカーを削除
            marker.getElement().addEventListener('click', () => {
              marker.remove(); // マーカーをマップから削除
            });
          })
    },
    terrainLevelInput () {
      this.$store.state.map01.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel })
      this.$store.state.map02.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel })
    }
  }
}
</script>
<style scoped>

</style>

