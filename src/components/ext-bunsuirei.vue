<template>
    <div :style="menuContentSize">
      <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
      <v-switch class="custom-switch" v-model="s_isPaintBunsuirei" @change="changePaint" label="塗りつぶし" color="primary" />
      <v-switch class="custom-switch" v-model="s_isKasen" @change="changePaint" label="河川" color="primary" />
      <br>
      <v-text-field label="水系名、水系コードで抽出" v-model="s_suikeiText" @input="changePaint" style="margin-top: 10px"></v-text-field>
      <a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W07.html' target='_blank'>国土数値情報</a>    </div>
</template>

<script>
export default {
  name: 'ext-bunsuirei',
  props: ['mapName','item'],
  data: () => ({
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text', 'font-size':'large'}
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_isPaintBunsuirei: {
      get() {
        if (this.$store.state.isPaintBunsuirei[this.mapName] === 'true') {
          return true
        } else if (this.$store.state.isPaintBunsuirei[this.mapName] === 'false') {
          return false
        } else {
          return this.$store.state.isPaintBunsuirei[this.mapName]
        }
      },
      set(value) {
        return this.$store.state.isPaintBunsuirei[this.mapName] = value
      }
    },
    s_isKasen: {
      get() {
        if (this.$store.state.isKasen[this.mapName] === 'true') {
          return true
        } else if (this.$store.state.isKasen[this.mapName] === 'false') {
          return false
        } else {
          return this.$store.state.isKasen[this.mapName]
        }
      },
      set(value) {
        return this.$store.state.isKasen[this.mapName] = value
      }
    },
    s_suikeiText: {
      get() {
        return this.$store.state.suikeiText[this.mapName]
      },
      set(value) {
        this.$store.state.suikeiText[this.mapName] = value
      }
    },
    s_kasenCode: {
      get() {
        return this.$store.state.kasenCode[this.mapName]
      },
      set(value) {
        this.$store.state.kasenCode[this.mapName] = value
      }
    },
    s_kasenMei: {
      get() {
        return this.$store.state.kasenMei[this.mapName]
      },
      set(value) {
        this.$store.state.kasenMei[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_isPaintBunsuirei,
          this.s_isKasen,
          this.s_suikeiText,
          this.s_kasenCode,
          this.s_kasenMei
        ]})
    },
    changePaint () {
      const vm = this
      const map = this.$store.state[this.mapName]
      if (!this.s_isPaintBunsuirei) {
        map.setPaintProperty('oh-bunsuirei', 'fill-color', 'rgba(0, 0, 0, 0)')
        map.setPaintProperty("oh-bunsuirei-line", "line-color", 'red')
        map.setPaintProperty("oh-bunsuirei-line", "line-width", 4)
      } else {
        map.setPaintProperty('oh-bunsuirei', 'fill-color', ['get', 'random_color'])
        map.setPaintProperty("oh-bunsuirei-line", "line-color", 'black')
        map.setPaintProperty("oh-bunsuirei-line", "line-width", [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0,
          11, 0.5
        ]);
      }
      //----------------------------------------------------------------
      if (!this.s_isKasen) {
        map.setFilter("oh-kasen", ['==', 'nonexistent-field', true])
        map.setFilter("oh-kasen-label", ['==', 'nonexistent-field', true])
      } else {
        map.setFilter("oh-kasen", null)
        map.setFilter("oh-kasen-label", null)
      }
      //----------------------------------------------------------------
      function filterBy(text) {
        if (text) {
          let searchString = text
          searchString = searchString.replace(/\u3000/g,' ').trim()
          const words = searchString.split(" ")
          // 複数フィールドを結合する
          const combinedFields = ["concat", ["get", "suikei"], " ", ["get", "W05_004"], " ", ["get", "W07_002"], " ", ["get", "W05_001"]];
          // 各単語に対して、結合したフィールドに対する index-of チェックを実行
          const filterConditions = words.map(word => [">=", ["index-of", word, combinedFields], 0]);
          // いずれかの単語が含まれる場合の条件を作成 (OR条件)
          const matchCondition = ["any", ...filterConditions]

          // 複数フィールドを結合する
          const combinedFields1 = ["concat", ["get", "W05_004"]];
          // 各単語に対して、結合したフィールドに対する index-of チェックを実行
          const filterConditions1 = words.map(word => [">=", ["index-of", word, combinedFields1], 0]);
          // いずれかの単語が含まれる場合の条件を作成 (OR条件)
          const matchCondition1 = ["any", ...filterConditions1]

          console.log(matchCondition)
          map.setFilter('oh-bunsuirei', matchCondition)
          map.setFilter('oh-bunsuirei-line', matchCondition)
          map.setFilter('oh-kasen', matchCondition)
          map.setFilter('oh-kasen-label', matchCondition)
          if (!vm.s_isKasen) {
            map.setFilter("oh-kasen", ['==', 'nonexistent-field', true])
            map.setFilter("oh-kasen-label", ['==', 'nonexistent-field', true])
          } else {
            map.setFilter("oh-kasen", [
              'all',
              ['==', 'nonexistent-field', true],
              matchCondition1
            ])
            map.setFilter("oh-kasen-label", [
              'all',
              ['!=', 'W05_004', '名称不明'], // W05_004 が "名称不明" ではない
              [
                'any', // OR 条件
                matchCondition1
              ]
            ])
          }
        } else {
          map.setFilter('oh-bunsuirei', null)
          map.setFilter('oh-bunsuirei-line', null)
          map.setFilter('oh-kasen', null)
          map.setFilter('oh-kasen-label', ['!=', 'W05_004', '名称不明'])
          if (!vm.s_isKasen) {
            map.setFilter("oh-kasen", ['==', 'nonexistent-field', true])
            map.setFilter("oh-kasen-label", ['==', 'nonexistent-field', true])
          }
        }
      }
      filterBy(this.s_suikeiText)
      // -------------------------------------------------------------------
      if (this.s_kasenCode) {
        map.setPaintProperty('oh-kasen', 'line-color', [
          'case',
          // ['==', ['get', 'W05_002'], this.s_kasenCode],
          ['all', ['==', ['get', 'W05_002'], this.s_kasenCode], ['==', ['get', 'W05_004'], this.s_kasenMei]],
          'red',
          'blue'
        ])

        map.setPaintProperty('oh-kasen', 'line-width', [
          'interpolate',
          ['linear'],
          ['zoom'],
          1, [
            'case',
            ['all', ['==', ['get', 'W05_002'], this.s_kasenCode], ['==', ['get', 'W05_004'], this.s_kasenMei]],
            5, // 条件が一致する場合の固定値
            [
              '*',
              0.1,
              ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
            ]
          ],
          11, [
            'case',
            ['all', ['==', ['get', 'W05_002'], this.s_kasenCode], ['==', ['get', 'W05_004'], this.s_kasenMei]],
            5,
            [
              '*',
              1,
              ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
            ]
          ],
          12, [
            'case',
            ['all', ['==', ['get', 'W05_002'], this.s_kasenCode], ['==', ['get', 'W05_004'], this.s_kasenMei]],
            5,
            [
              '*',
              2,
              ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
            ]
          ],
          14, [
            'case',
            ['all', ['==', ['get', 'W05_002'], this.s_kasenCode], ['==', ['get', 'W05_004'], this.s_kasenMei]],
            5,
            [
              '*',
              3,
              ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
            ]
          ],
          16, [
            'case',
            ['all', ['==', ['get', 'W05_002'], this.s_kasenCode], ['==', ['get', 'W05_004'], this.s_kasenMei]],
            5,
            [
              '*',
              5,
              ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
            ]
          ]
        ]);

      } else {
        map.setPaintProperty('oh-kasen', 'line-color','blue')
      }
      this.update()
    },
  },
  watch: {
    s_kasenMei () {
      this.changePaint()
    },
    s_kasenCode () {
      this.changePaint()
    },
    s_suikeiText () {
      this.changePaint()
    },
    s_extFire () {
      this.changePaint()
    },
  }
}
</script>
<style scoped>

</style>

