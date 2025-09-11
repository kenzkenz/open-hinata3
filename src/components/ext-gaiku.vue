<template>
  <div :style="menuContentSize">
    <div style="font-size: large;margin-bottom: 10px;"></div>
    <v-select
        v-if="item.id === 'oh-gaiku'"
        v-model="s_selectedGsikuItems"
        :items="gsikuItems"
        item-title="name"
        item-value="id"
        label="複数選択してください"
        multiple
        clearable
        @update:modelValue="selectItem"
    >
      <!-- 選択結果の描画を完全にスキップ -->
      <template #selection=""></template>
    </v-select>
    <div class="d-flex align-center" style="gap: 8px; margin-bottom: 15px;">
    <v-switch
        v-if="item.id === 'oh-gaiku'"
        style="margin-left: 20px;"
        v-model="s_isRadius2002"
        color="primary"
        hide-details
        density="compact"
        :label="'半径200m'"
    />
    <v-btn style="margin-top: 0px;margin-left: 0px;margin-bottom: 10px;" @click="saveSimaGaiku">sima保存</v-btn>
    </div>
<!--    <hr style="margin-bottom: 10px;">-->
    <div v-html="item.attribution"></div>
  </div>
</template>

<script>
import {
  saveGeojson,
  gistUpload,
  saveCima,
  saveCima3,
  saveDxf,
  saveCsv,
  simaToGeoJSON,
  resetFeatureColors,
  saveSima2,
  saveSimaGaiku
} from "@/js/downLoad";
import {clearRadiusHighlight} from "@/js/utils/radius-highlight";

export default {
  name: 'ext-gaiku',
  props: ['mapName','item'],
  data: () => ({
    gsikuItems: [
      { id: 'S', name: '三（街区三角点）' },
      { id: 'T', name: '多（街区多角点）' },
      { id: 'TS', name: '多節（街区多角点節点）' },
      { id: 'SS', name: '三節（街区三角点節点）' },
      { id: 'H', name: '補（補助点）' },
    ],
    fields: '',
    sourceId: '',
    layerId: '',
    dialog: false,
    dialog2: false,
    dialog3: false,
    dialog4: false,
    dialog5: false,
    selectedItem: null,
    isAndroid: false,
    items: [
      '公共座標1系', '公共座標2系', '公共座標3系',
      '公共座標4系', '公共座標5系', '公共座標6系',
      '公共座標7系', '公共座標8系', '公共座標9系',
      '公共座標10系', '公共座標11系', '公共座標12系',
      '公共座標13系', '公共座標14系', '公共座標15系',
      '公共座標16系', '公共座標17系', '公共座標18系',
      '公共座標19系'
    ],
    kei: '',
    menuContentSize: {'width':'auto','height': 'auto','margin': '10px', 'overflow': 'hidden', 'user-select': 'text', 'font-size':'large'}
  }),
  computed: {
    s_isRadius2002: {
      get() {
        return this.$store.state.isRadius2002
      },
      set(value) {
        this.$store.state.isRadius2002 = value
      }
    },
    s_extFire () {
      return this.$store.state.extFire
    },
    s_selectedGsikuItems: {
      get() {
        try {
          return JSON.parse(this.$store.state.selectedGsikuItems[this.mapName])
        }catch (e) {
          return this.$store.state.selectedGsikuItems[this.mapName]
        }
      },
      set(value) {
        this.$store.state.selectedGsikuItems[this.mapName] = value
      }
    },
    s_zahyokei: {
      get() {
        return this.$store.state.zahyokei
      },
      set(value) {
        this.$store.state.zahyokei = value
      }
    },
    s_isRenzoku: {
      get() {
        return this.$store.state.isRenzoku
      },
      set(value) {
        this.$store.state.isRenzoku = value
      }
    },
  },
  methods: {
    update () {
      // alert(JSON.stringify(this.s_selectedGsikuItems))
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          JSON.stringify(this.s_selectedGsikuItems)
        ]})
    },
    selectItem () {
      console.log(this.s_selectedGsikuItems)
      const map = this.$store.state[this.mapName]
      const filter = [
        'all',
        // 廃点情報が「廃点」でない
        ['!=', ['get', '廃点情報'], '廃点'],
        // type が this.selectedGsikuItems のいずれかに一致する
        ['match', ['get', 'type'], this.s_selectedGsikuItems, /* true の時表示 */ true, /* false の時非表示 */ false]
      ];
      map.setFilter('oh-gaiku-layer', filter);
      map.setFilter('oh-gaiku-label-layer',filter);
      map.setFilter('oh-gaiku-label',filter);

      if (this.s_selectedGsikuItems.length === 0) {
        map.setFilter('oh-gaiku-layer',['!=', ['get', '廃点情報'], '廃点'])
        map.setFilter('oh-gaiku-label-layer',['!=', ['get', '廃点情報'], '廃点'])
        map.setFilter('oh-gaiku-label',['!=', ['get', '廃点情報'], '廃点']);
      }
      this.update()
    },
    tutorial () {
      window.open("https://hackmd.io/@kenz/S1gKou9wyg", "_blank");
      history('街区チュートリアル',window.location.href)
    },
    checkDevice() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      console.log(/android/i.test(userAgent))
      this.isAndroid = /android/i.test(userAgent);
    },
    resetFeatureColors () {
      const map = this.$store.state[this.mapName]
      this.idForLayerId(this.item.id)
      console.log(this.layerId)
      resetFeatureColors(map,this.layerId)
    },
    saveSimaGaiku () {
      const map = this.$store.state[this.mapName]
      console.log(this.item.id)
      let layerId
      if (this.item.id === 'oh-toshikan') {
        layerId = 'oh-toshikan-layer'
      } else {
        layerId = 'oh-gaiku-layer'
      }
      saveSimaGaiku(map,layerId)
    },
  },
  created() {
    this.checkDevice();
  },
  mounted() {
    document.querySelector('#handle-' + this.item.id).innerHTML = '<span style="font-size: large;">' + this.item.label + '</span>'
    if (this.s_selectedGsikuItems && this.s_selectedGsikuItems.length > 0) {
      this.selectItem()
    }

  },
  watch: {
    s_isRadius2002(v) {
      if (v) {
        this.$store.state.loadingMessage3 = '地図上をクリックすると200m半径の円を書きます。<br>円内部の基準点のみSIMA保存します。'
        this.$store.state.loading3 = true
        setTimeout(() => {
          this.$store.state.loading3 = false
        },2000)
      } else {
        // 円と中心点を消し、oh200mIds を [] に
        clearRadiusHighlight(this.$store.state.map01)
        clearRadiusHighlight(this.$store.state.map02)
      }
    }
  }
}
</script>
<style scoped>
.select-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: auto;
  margin: 20px auto;
}

.select-label {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 4px;
}

.custom-select {
  appearance: none; /* ブラウザのデフォルトスタイルを無効化 */
  background: linear-gradient(to right, #f0f4ff, #e0eaff);
  border: 1px solid #a0c4ff;
  border-radius: 8px;
  padding: 10px 15px;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  outline: none;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.custom-select:hover {
  border-color: #4d94ff;
}

.custom-select:focus {
  border-color: #1a73e8;
  box-shadow: 0 0 5px rgba(26, 115, 232, 0.5);
}

.custom-select option {
  padding: 10px;
}

select {
  position: relative;
  z-index: 1000; /* 他の要素の上に表示 */
  direction: ltr; /* 左から右に展開 */
}

</style>

