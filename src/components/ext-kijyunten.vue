<template>
  <div :style="menuContentSize">
    <div class="d-flex align-center" style="gap: 8px; margin-bottom: 15px;">
      <v-switch
          style="margin-left: 20px;"
          v-model="s_isRadius200"
          color="primary"
          hide-details
          density="compact"
          :label="'半径200m'"
      />
      <v-btn class="ma-0" style="margin-left: 20px;" @click="saveSimaKijyunten">
        sima保存
      </v-btn>
    </div>
    <hr>
    <div style="font-size: 16px" v-html="item.attribution"></div>
  </div>
</template>

<script>
import {
  saveSimaKijyunten
} from "@/js/downLoad";
import {clearRadiusHighlight} from "@/js/utils/radius-highlight";

export default {
  name: 'ext-kijyunten',
  props: ['mapName','item'],
  data: () => ({
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
    menuContentSize: {'width':'300px','height': 'auto','margin': '10px', 'overflow': 'hidden', 'user-select': 'text', 'font-size':'large'}
  }),
  computed: {
    s_isRadius200: {
      get() {
        return this.$store.state.isRadius200
      },
      set(value) {
        this.$store.state.isRadius200 = value
      }
    },
    s_extFire () {
      return this.$store.state.extFire
    },
    s_zahyokei: {
      get() {
        return this.$store.state.zahyokei
      },
      set(value) {
        this.$store.state.zahyokei = value
      }
    },
  },
  methods: {
    checkDevice() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      this.isAndroid = /android/i.test(userAgent);
    },
    saveSimaKijyunten () {
      const map = this.$store.state[this.mapName]
      const layerId = this.item.id
      saveSimaKijyunten(map,layerId)
    },
  },
  created() {
    this.checkDevice();
  },
  mounted() {
    document.querySelector('#handle-' + this.item.id).innerHTML = '<span style="font-size: large;">' + this.item.label + '</span>'
  },
  watch: {
    s_isRadius200(v) {
      if (v) {
        this.$store.state.isRadius2002 = false
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

