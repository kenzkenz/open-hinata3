<template>
    <div :style="menuContentSize">
      <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
      {{s_kyakusuYear}}年
      <input class="color-range" type="range" v-model.number="s_kyakusuYear" @change="update" @input="input" min="2011" max="2022" step="1"/>
      <v-select
          v-model="s_jigyousya"
          :items="items"
          label="事業者で抽出"
          outlined
          @update:modelValue="onSelectChange"
      ></v-select>      <hr>
      <a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2022.html" target="_blank">国土数値情報</a>
      <div class="legend-scale">
        <ul class="legend-labels">
          <li><span style="background:hsl(240, 100%, 50%);"></span>0 - 99人</li>
          <li><span style="background:hsl(230, 100%, 55%);"></span>100 - 299人</li>
          <li><span style="background:hsl(220, 100%, 60%);"></span>300 - 499人</li>
          <li><span style="background:hsl(210, 100%, 65%);"></span>500 - 999人</li>
          <li><span style="background:hsl(200, 100%, 70%);"></span>1000 - 4999人</li>
          <li><span style="background:hsl(180, 100%, 50%);"></span>5000 - 19999人</li>
          <li><span style="background:hsl(150, 100%, 50%);"></span>20000 - 99999人</li>
          <li><span style="background:hsl(120, 100%, 50%);"></span>100000 - 499999人</li>
          <li><span style="background:hsl(60, 100%, 50%);"></span>500000 - 1199999人</li>
          <li><span style="background:hsl(0, 100%, 50%);"></span>1200000人+</li>
        </ul>
      </div>
    </div>
</template>

<script>
export default {
  name: 'ext-kyakusu',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text','font-size':'large'},
    items: ['全て','JRの新幹線','JR在来線','公営鉄道','民営鉄道','第三セクター'],
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_kyakusuYear: {
      get() {
        return this.$store.state.kyakusuYear[this.mapName]
      },
      set(value) {
        return this.$store.state.kyakusuYear[this.mapName] = value
      }
    },
    s_jigyousya: {
      get() {
        return this.$store.state.jigyousya[this.mapName]
      },
      set(value) {
        return this.$store.state.jigyousya[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_kyakusuYear,
          this.s_jigyousya
        ]})
    },
    onSelectChange () {
      const map = this.$store.state[this.mapName]
      console.log(map)
      function getValueByItem(item) {
        switch (item) {
          case '全て':
            return 0
          case 'JRの新幹線':
            return 1
          case 'JR在来線':
            return 2
          case '公営鉄道':
            return 3
          case '民営鉄道':
            return 4
          case '第三セクター':
            return 5
        }
      }
      if (this.s_jigyousya !== '全て') {
        map.setFilter('oh-ekibetsukyakue-height', ['==', ['get', 'S12_005'], getValueByItem(this.s_jigyousya)])
      } else {
        map.setFilter('oh-ekibetsukyakue-height', null)
      }
    },
    input () {
      console.log((this.s_kyakusuYear))
      const map = this.$store.state[this.mapName]
      function getValueByYear(year) {
        switch (year) {
          case 2011:
            return 'S12_009'
          case 2012:
            return 'S12_013'
          case 2013:
            return 'S12_017'
          case 2014:
            return 'S12_021'
          case 2015:
            return 'S12_025'
          case 2016:
            return 'S12_029'
          case 2017:
            return 'S12_033'
          case 2018:
            return 'S12_037'
          case 2019:
            return 'S12_041'
          case 2020:
            return 'S12_045'
          case 2021:
            return 'S12_049'
          case 2022:
            return 'S12_053'
        }
      }
      // console.log(getValueByYear(this.s_kyakusuYear))
      function setPaint(propertyName) {
        map.setPaintProperty("oh-ekibetsukyakue-height", 'fill-extrusion-height', [
          'interpolate',
          ['linear'],
          ['get', propertyName],
          0, 50,
          1200000, 3000
        ]);
        map.setPaintProperty("oh-ekibetsukyakue-height", 'fill-extrusion-color', [
          'interpolate',
          ['linear'],
          ['get', propertyName],
          0, 'hsl(240, 100%, 50%)',    // 深い青
          100, 'hsl(230, 100%, 55%)',  // 明るめの青
          300, 'hsl(220, 100%, 60%)',  // 薄い青
          500, 'hsl(210, 100%, 65%)',  // 青
          1000, 'hsl(200, 100%, 70%)', // 青みがかったシアン
          5000, 'hsl(180, 100%, 50%)', // シアン
          20000, 'hsl(150, 100%, 50%)', // 青緑
          100000, 'hsl(120, 100%, 50%)', // 緑
          500000, 'hsl(60, 100%, 50%)',  // 黄色
          1200000, 'hsl(0, 100%, 50%)'   // 赤
        ]);
      }
      setPaint(getValueByYear(Number(this.s_kyakusuYear)))
    },
  },
  watch: {
    s_extFire () {
      this.input()
      this.onSelectChange()
    },
  }
}
</script>
<style scoped>

</style>

