<template>
  <v-dialog v-model="dialogForShinsei" max-width="520">
    <v-card>
      <v-card-title class="text-h6">オンライン申請用ZIPを作成</v-card-title>
      <v-card-text>
        <p style="margin-bottom: 20px;">できあがったZIPを申請用総合ソフトにインポートして、署名・送信します。</p>
        <v-text-field
            v-model="applicantName"
            label="申請人氏名"
            clearable
            :rules="[v => !!(v||'').trim() || '氏名は必須です']"
            @blur="persistApplicant()"
        />
        <v-select
            :menu-props="{
                    maxHeight: '300px',
                    overflow: 'scroll',
                    contentClass: 'scrollable-menu elevation-8'
                  }"
            v-model="destOfficeCode"
            :items="officeOptions"
            item-title="label"
            item-value="code"
            label="提出先（登記所）"
            placeholder="提出先を選択"
            clearable
            @update:model-value="onDestChanged"
        >
          <template #selection="{ item }">
            <span v-if="item && item.raw">
              {{ item.raw.label }}（{{ item.raw.code }}）
            </span>
            <span v-else class="text-medium-emphasis">提出先を選択</span>
          </template>
        </v-select>
<!--        <div class="text-caption text-medium-emphasis mt-2">-->
<!--          ※氏名は端末に保存され、次回以降自動入力されます。-->
<!--        </div>-->
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="dialogForShinsei = false">キャンセル</v-btn>
        <v-btn :loading="busy" :disabled="busy" color="primary" @click="onClickExport">
          ZIPを作成
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-navigation-drawer
      width=400
      temporary
      :scrim="false"
      v-model="visible"
      location="right"
      class="point-info-drawer"
      touchless
  >
    <v-card flat class="bg-white drawer" style="border-radius: 0;">
      <v-card-title class="text-h6 text-white" style="background-color: var(--main-color); height: 40px; display: flex; align-items: center;">
        {{ s_rightDrawerTitle }}
        <div class="close-btn-div" style="margin-right:4px;margin-top: 0px; color:white!important; ;font-size: 30px!important;" @click="close"><i class="fa-solid fa-xmark hover"></i></div>
      </v-card-title>

      <v-card-text style="margin-top: 20px;">
        <div class="top-div">
          <h2 style="margin-bottom: 10px;">{{ `${popupFeatureProperties.市区町村名 || ''}${popupFeatureProperties.大字名 || ''}${popupFeatureProperties.大字 || ''}${popupFeatureProperties['丁目名'] || ''}${popupFeatureProperties.地番 || ''}` }}</h2>
          <p v-for="[key, value] in Object.entries(popupFeatureProperties)" :key="key" class="property-text">
            {{ key }}: {{ value }}
          </p>
        </div>
<!--        <div class="street-view-drawer" style="margin-top:10px;height: calc(100vh - 450px);width:100%;"></div>-->
        <hr style="margin-top: 10px;margin-bottom: 10px;">
<!--        <div v-if="s_rightDrawerTitle === '2025登記所地図'">-->
        <div v-if="isLowZoom && s_rightDrawerTitle !== '2025登記所地図'">
          zoom15以上で面積計算します。
        </div>
        <div v-else>
          <p v-if="s_rightDrawerTitle === '2025登記所地図'" style="margin-bottom: 8px;">{{ `${popupFeatureProperties.市区町村名 || ''}${popupFeatureProperties.大字名 || ''}${popupFeatureProperties.大字 || ''}${popupFeatureProperties['丁目名'] || ''}${popupFeatureProperties.地番 || ''}` }}の面積等</p>
          面積：{{ area }}<br>
          周長：{{ perimeter }}<br>
          境界点数：{{ vertexCount }}
          <hr style="margin-top: 10px;margin-bottom: 10px;">
          <div v-if="featuresCount > 1">
            <p style="margin-bottom: 8px;">選択した地物({{ featuresCount }})の総計（注！画面内地物に限る）</p>
            総面積：{{ totalArea }}<br>
            総境界点数：{{ totalVertexCount }}
          </div>
        </div>

<!--        <v-btn v-if="s_rightDrawerTitle === '2025登記所地図'" style="width: 100%; margin-top: 20px;" @click="openDialog">-->
<!--          オンライン申請用ZIPを作成（検証中）-->
<!--        </v-btn>-->

<!--        <v-btn v-if="s_rightDrawerTitle === '2025登記所地図'" style="width: 100%; margin-top: 20px;" @click="openToki">-->
<!--          地番をコピーして登記情報提供サービスを開く-->
<!--        </v-btn>-->

      </v-card-text>

    </v-card>
  </v-navigation-drawer>
</template>

<script>
import { exportShinseiZip } from '@/js/utils/shinseiExport'
import { mapState, mapMutations } from 'vuex';
import {
  chibanzuCalculatePolygonMetrics,
  getHighlightedChibanFeaturesOnScreen,
  homusyoCalculatePolygonMetrics,
  openToukiFromProps
} from "@/js/downLoad";

export default {
  name: 'RightDrawer',
  components: {},
  data() {
    return {
      tab: '0',
      area: '',
      perimeter: '',
      vertexCount: 0,
      featuresCount: 0,
      totalArea: '',
      totalVertexCount: 0,
      isLowZoom: false,

      dialogForShinsei: false,

      // 入力（例）：法務省XMLレイヤーから拾った行配列をここに入れる
      houmuRows: [],

      applicantName: localStorage.getItem('oh3.applicantName') || '',
      destOfficeCode: localStorage.getItem('oh3.destOfficeCode') || '',
      officeOptions: [],

      // 都道府県コード→名称
      prefMap: {
        '01':'北海道','02':'青森県','03':'岩手県','04':'宮城県','05':'秋田県','06':'山形県','07':'福島県',
        '08':'茨城県','09':'栃木県','10':'群馬県','11':'埼玉県','12':'千葉県','13':'東京都','14':'神奈川県',
        '15':'新潟県','16':'富山県','17':'石川県','18':'福井県','19':'山梨県','20':'長野県','21':'岐阜県',
        '22':'静岡県','23':'愛知県','24':'三重県','25':'滋賀県','26':'京都府','27':'大阪府','28':'兵庫県',
        '29':'奈良県','30':'和歌山県','31':'鳥取県','32':'島根県','33':'岡山県','34':'広島県','35':'山口県',
        '36':'徳島県','37':'香川県','38':'愛媛県','39':'高知県','40':'福岡県','41':'佐賀県','42':'長崎県',
        '43':'熊本県','44':'大分県','45':'宮崎県','46':'鹿児島県','47':'沖縄県'
      },

      busy: false
    };
  },
  computed: {
    ...mapState([
      'isAndroid',
      'userId',
      'map01',
      'showRightDrawer',
      'selectedPointFeature',
      'popupFeatureProperties',
      'rightDrawerTitle'
    ]),
    s_rightDrawerTitle () {
      return this.$store.state.rightDrawerTitle
    },
    s_popupFeatureProperties () {
      return this.$store.state.popupFeatureProperties
    },
    s_isAndroid () {
      return this.$store.state.isAndroid
    },
    visible: {
      get() { return this.showRightDrawer; },
      set(val) {
        this.setRightDrawer(val);
        if (!val) {
          this.title = '';
        }
      }
    },
  },
  methods: {
    ...mapMutations([
      'setRightDrawer',
      'saveSelectedPointFeature',
      'setSelectedPointFeature',
    ]),
    onDestChanged(v) {
      const code = String(v ?? '').padStart(4,'0')
      this.destOfficeCode = code
      if (/^\d{4}$/.test(code)) {
        localStorage.setItem('oh3.destOfficeCode', code)
      } else {
        localStorage.removeItem('oh3.destOfficeCode')
      }
    },
    async openDialog () {
      this.dialogForShinsei = true
      // if (this.officeOptions.length) return
      try {
        const res = await fetch('https://kenzkenz.net/myphp/office_codes_local.php', { cache: 'no-store' })
        const arr = await res.json()
        console.log(arr)
        this.officeOptions = (arr || []).map(x => ({
          code: String(x.code).padStart(4,'0'),
          label: String(x.label || '').trim()
        }))
      } catch (e) {
        console.error('office codes load failed', e)
      }
    },
    persistApplicant () {
      const v = (this.applicantName || '').trim()
      if (v) localStorage.setItem('oh3.applicantName', v)
    },

    // 全角→半角（数字とハイフンのみ）＋空白除去
    toHankakuNumHyphen (s) {
      const str = String(s || '')
      return str
          .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
          .replace(/[－ー―−–—]/g, '-')
          .replace(/\s+/g, '')
    },
    // 地番の正規化（例: "１２３−４ 枝３"→"123-4-3"）
    normalizeChiban (raw) {
      const v = this.toHankakuNumHyphen(raw)
      return v.replace(/枝(\d+)/, '-$1')
    },
    // 大字名と丁目名を連結（空は結合しない）
    normalizeOoaza (daimei, chome) {
      const a = String(daimei || '').trim()
      const b = String(chome || '').trim()
      return [a, b].filter(Boolean).join('')
    },
    // 重複判定キー
    keyOf (p) {
      return [p.todofuken, p.shikuchoson, p.ooaza, p.chiban].join('|')
    },
    // 法務省XML由来の行配列 → Parcel[] へ整形（this.*のみで完結）
    buildParcelsFromHoumuRows (rows) {
      const out = []
      const seen = new Set()
      for (const r of (rows || [])) {
        const cityCode   = String(r['市区町村コード'] || '').padStart(5, '0')
        const prefCode2  = cityCode.slice(0, 2)
        const todofuken  = this.prefMap[prefCode2] || ''
        const shikuchoson = String(r['市区町村名'] || '').trim()
        const ooaza       = this.normalizeOoaza(r['大字名'], r['丁目名'])
        const chiban      = this.normalizeChiban(r['地番'])
        if (!todofuken || !shikuchoson || !chiban) continue
        const parcel = { todofuken, shikuchoson, ooaza, chiban }
        const key    = this.keyOf(parcel)
        if (seen.has(key)) continue
        seen.add(key)
        out.push(parcel)
      }
      return out
    },
    async exportZip(parcels) {
      const vm = this
      await exportShinseiZip({
        applications: [{
          procedureId: 'FTH000000000001',
          destOfficeCode: this.destOfficeCode || '1234',
          title: `表題_${new Date().toISOString().slice(0,10)}`,
          applicant: { name: this.applicantName || '' },
          parcels,
          attachments: []
        }],
        userDir:vm.userId
      })
    },

    async onClickExport () {
      if (!this.applicantName || !this.destOfficeCode) {
        alert('必須項目の入力がされていません。')
        return
      }
      this.dialogForShinsei = false
      if (this.busy) return
      // ① 選択フィーチャ取得
      const feats = getHighlightedChibanFeaturesOnScreen(this.map01) || []
      this.houmuRows = feats.map(f => f.properties || {})
      // ② 整形
      const parcels = this.buildParcelsFromHoumuRows(this.houmuRows)
      if (!parcels.length) { alert('筆がありません'); return }
      // ③ 実行
      this.busy = true
      try {
        console.log('[parcels]', parcels)
        await this.exportZip(parcels)
      } catch (e) {
        console.error(e)
        alert('ZIP出力に失敗しました')
      } finally {
        this.busy = false
      }
    },
    // クリックイベントから呼ぶだけ（this経由で完結）
    // async onClickExport () {
    //   if (this.busy) return
    //   this.houmuRows = getHighlightedChibanFeaturesOnScreen(this.map01).map(f => f.properties)
    //   const parcels = this.buildParcelsFromHoumuRows(this.houmuRows)
    //   if (!parcels.length) { alert('筆がありません'); return }
    //   this.busy = true
    //   console.log(parcels)
    //   try {
    //     // import は <script> 冒頭などで: import { exportShinseiZip } from '@/js/utils/shinseiExport'
    //     await this.$options.exportZip(this, parcels) // ← 下の静的関数で this 受け渡し
    //   } catch (e) {
    //     console.error(e)
    //     alert('ZIP出力に失敗しました')
    //   } finally {
    //     this.busy = false
    //   }
    // },
    openToki() {
      const propsArray = getHighlightedChibanFeaturesOnScreen(this.map01).map(f => f.properties)
      console.log(propsArray)
      openToukiFromProps(propsArray)
    },
    close() {
      this.setRightDrawer(false);
    },
  },
  mounted() {
    if (this.isAndroid) {
      const stopOnMenu = (e) => {
        const content = e.target.closest('.v-overlay__content.scrollable-menu');
        if (content) e.stopPropagation();   // ← スクロールはネイティブに任せる
      };
      // 伝播を止めるには capture: true で早期にフック
      window.addEventListener('touchstart', stopOnMenu, { capture: true, passive: true });
      window.addEventListener('touchmove',  stopOnMenu, { capture: true, passive: true });
      window.addEventListener('touchend',   stopOnMenu, { capture: true, passive: true });
    }
  },
  watch: {
    async popupFeatureProperties (newVal) {
      if (this.s_rightDrawerTitle === '2025登記所地図') {
        const calc = await homusyoCalculatePolygonMetrics([newVal.筆ID])
        this.area = calc.area
        this.perimeter = calc.perimeter
        this.vertexCount = calc.vertexCount
        // ---------------------------------------------------------------------------------------
        const fudeIds = Array.from(this.$store.state.highlightedChibans).map(h => h.split('_')[0])
        this.featuresCount = fudeIds.length
        const totalCalc = await homusyoCalculatePolygonMetrics(fudeIds)
        this.totalArea = totalCalc.area
        this.totalVertexCount = totalCalc.vertexCount
      } else {
        const map01 = this.$store.state.map01
        const zoom = map01.getZoom()
        if (zoom < 15) {
          this.area = ''
          this.perimeter = ''
          this.vertexCount = 0
          this.featuresCount = 0
          this.totalArea = ''
          this.totalVertexCount = 0
          this.isLowZoom = true
          return
        } else {
          this.isLowZoom = false
        }
        const calc = await chibanzuCalculatePolygonMetrics([this.$store.state.popupFeature])
        this.area = calc.area
        this.perimeter = calc.perimeter
        this.vertexCount = calc.vertexCount
        /**
         注！下のコードは完全に動作する。選択地物の総面積を計算する。重いのではずした。
        // ---------------------------------------------------------------------------------------
        const oh3ids = Array.from(this.$store.state.highlightedChibans).map(h => Number(h.split('_')[0]))
        console.log(oh3ids)
        const allFeatures = map01.queryRenderedFeatures();
        const chibanLayerId = allFeatures
                  .map(f => f.layer.id)
                  .find(id => id.includes('oh-chiban'))
        const features = map01.queryRenderedFeatures(
            map01.getCanvas().getBoundingClientRect(),
            { layers: [chibanLayerId] }
        );
        console.log(chibanLayerId)
        const idString = chibanLayerId.includes('oh-chibanzu') ? 'id' : 'oh3id'
        const filteredFeatures = features.filter(f => oh3ids.includes(f.properties[idString]));
        this.featuresCount = filteredFeatures.length
        const totalCalc = await chibanzuCalculatePolygonMetrics(filteredFeatures)
        this.totalArea = totalCalc.area
        this.totalVertexCount = totalCalc.vertexCount
         */
      }
    },
  },
};
</script>

<style scoped>
.drawer {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: auto;
}
.point-info-drawer {
  z-index: 2500;
}
.close-btn {
  position: absolute;
  top: -10px;
  right: 10px;
  color: black;
  border: none;
  cursor: pointer;
  padding: 5px;
  font-size: 30px;
}
.close-btn:hover {
  color: red;
}
/* フェードアニメーション */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
