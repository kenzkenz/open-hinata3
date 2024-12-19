<template>
    <div :style="menuContentSize">
      <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
      時間がかかります。zoom=8以上で表示
      <v-select
          v-model="s_osmText"
          :items="tagOptions"
          label="選択"
          item-value="value"
          item-title="label"
          @update:modelValue="change"
      ></v-select>
      <div v-html="item.attribution"></div>
    </div>
</template>

<script>
import osmtogeojson from 'osmtogeojson'
export default {
  name: 'ext-osm',
  props: ['mapName','item'],
  data: () => ({
    selectedTag: null,
    tagOptions: [
      { key: 'highway', value: 'primary', label: '主要道路' },
      { key: 'highway', value: 'highway-all', label: '道路全て' },
      { key: 'leisure', value: 'park', label: '公園' },
      { key: 'amenity', value: 'school', label: '学校' },
      { key: 'amenity', value: 'hospital', label: '病院' },
      { key: 'natural', value: 'water', label: '水域' },
      { key: 'landuse', value: 'forest', label: '森林' },
      { key: 'highway', value: 'bus_stop', label: 'バス停' },
      { key: 'shop', value: 'supermarket', label: 'スーパーマーケット' },
      { key: 'tourism', value: 'attraction', label: '観光名所' },
      { key: 'historic', value: 'monument', label: '記念碑' },
      { key: 'railway', value: 'station', label: '駅' },
      { key: 'amenity', value: 'restaurant', label: 'レストラン' },
      { key: 'amenity', value: 'cafe', label: 'カフェ' },
      { key: 'amenity', value: 'bank', label: '銀行' },
      { key: 'amenity', value: 'library', label: '図書館' },
      { key: 'amenity', value: 'post_office', label: '郵便局' },
      { key: 'leisure', value: 'playground', label: '遊び場' },
      { key: 'natural', value: 'beach', label: 'ビーチ' },
      { key: 'leisure', value: 'swimming_pool', label: 'プール' },
      { key: 'building', value: 'apartments', label: 'アパート' },
      { key: 'aeroway', value: 'aerodrome', label: '空港' },
      { key: 'leisure', value: 'garden', label: '庭園' },
      { key: 'amenity', value: 'parking', label: '駐車場' },
      { key: 'amenity', value: 'bicycle_parking', label: '自転車駐車場' },
      { key: 'amenity', value: 'kindergarten', label: '幼稚園' },
      { key: 'amenity', value: 'university', label: '大学' },
      { key: 'natural', value: 'peak', label: '山頂' },
      { key: 'natural', value: 'spring', label: '湧水' },
      { key: 'tourism', value: 'museum', label: '博物館' },
      { key: 'tourism', value: 'zoo', label: '動物園' },
      { key: 'tourism', value: 'aquarium', label: '水族館' },
      { key: 'amenity', value: 'theatre', label: '劇場' },
      { key: 'amenity', value: 'cinema', label: '映画館' },
      { key: 'amenity', value: 'community_centre', label: 'コミュニティセンター' },
      { key: 'leisure', value: 'sports_centre', label: 'スポーツセンター' },
      { key: 'natural', value: 'wetland', label: '湿地' },
      { key: 'amenity', value: 'marketplace', label: '市場' },
      { key: 'amenity', value: 'fire_station', label: '消防署' },
      { key: 'amenity', value: 'police', label: '警察署' },
      { key: 'amenity', value: 'fountain', label: '噴水' },
      { key: 'natural', value: 'cliff', label: '崖' },
      { key: 'natural', value: 'cave_entrance', label: '洞窟入口' },
      { key: 'amenity', value: 'bar', label: 'バー' },
      { key: 'amenity', value: 'nightclub', label: 'ナイトクラブ' },
      { key: 'shop', value: 'bakery', label: 'パン屋' },
      { key: 'shop', value: 'butcher', label: '肉屋' },
      { key: 'shop', value: 'convenience', label: 'コンビニ' },
      { key: 'shop', value: 'clothes', label: '衣料品店' },
      { key: 'shop', value: 'electronics', label: '家電量販店' },
      { key: 'amenity', value: 'clinic', label: '診療所' },
      { key: 'amenity', value: 'pharmacy', label: '薬局' },
      { key: 'leisure', value: 'nature_reserve', label: '自然保護区' },
      { key: 'tourism', value: 'viewpoint', label: '展望台' },
      { key: 'tourism', value: 'theme_park', label: 'テーマパーク' },
      { key: 'tourism', value: 'castle', label: '城' },
    ],
    menuContentSize: {'width':'220px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text', 'font-size':'large'}
  }),
  computed: {
    s_extFire () {
      return this.$store.state.extFire
    },
    s_osmFire () {
      return this.$store.state.osmFire
    },
    s_osmText: {
      get() {
        return this.$store.state.osmText[this.mapName]
      },
      set(value) {
        this.$store.state.osmText[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      console.log(this.s_osmText)
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_osmText
        ]})
    },
    change () {
      const vm = this
      const map = this.$store.state[this.mapName]
      if (!this.s_osmText) return
      if (map.getZoom() < 9) {
        map.removeLayer('osm-overpass-layer-point')
        map.removeLayer('osm-overpass-layer-polygon')
        map.removeLayer('osm-overpass-layer-line')
        return
      }

      let fetchController = null; // 前回の fetch をキャンセルするためのコントローラ

      async function fetchOverpassData(tagKey, tagValue) {
        if (fetchController) {
          fetchController.abort(); // 前回のリクエストをキャンセル
        }
        fetchController = new AbortController();
        const { signal } = fetchController;
        const bounds = map.getBounds();
        const query = tagValue.includes("all")
            ? `
                [out:json];
                (
                    way["${tagKey}"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
                    node["${tagKey}"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
                );
                out body;
                >;
                out skel qt;
              `
            : `
                [out:json];
                (
                    way["${tagKey}"="${tagValue}"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
                    node["${tagKey}"="${tagValue}"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
                );
                out body;
                >;
                out skel qt;
              `;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

        try {
          document.body.style.cursor = 'wait'
          const response = await fetch(url,{ signal });
          const data = await response.json();
          const geojson = osmtogeojson(data)
          document.body.style.cursor = 'default'
          return geojson;
        } catch (error) {
          console.error('Error fetching Overpass data:', error);
        }
      }

      // MapLibreにGeoJSONレイヤーを追加
      async function addOverpassLayer(tagKey, tagValue) {
        document.body.style.cursor = 'wait'
        const geojsonData = await fetchOverpassData(tagKey, tagValue)
        if (geojsonData) {
          if (!map.getSource('osm-overpass')) {
            map.addSource('osm-overpass', {
              type: 'geojson',
              data: geojsonData
            })
          } else {
            map.removeLayer('osm-overpass-layer-point')
            map.removeLayer('osm-overpass-layer-polygon')
            map.removeLayer('osm-overpass-layer-line')
            map.removeSource('osm-overpass')
            map.addSource('osm-overpass', {
              type: 'geojson',
              data: geojsonData
            })
          }
          map.addLayer({
            id: 'osm-overpass-layer-point',
            type: 'circle',
            source: 'osm-overpass',
            filter: ['==', '$type', 'Point'],
            paint: {
              'circle-radius': 8,
              'circle-color': 'green'
            }
          })
          map.addLayer({
            id: 'osm-overpass-layer-polygon',
            type: 'fill',
            source: 'osm-overpass',
            filter: ['==', '$type', 'Polygon'],
            paint: {
              'fill-color': 'blue',
              'fill-opacity': 0.5
            }
          })
          map.addLayer({
            id: 'osm-overpass-layer-line',
            type: 'line',
            source: 'osm-overpass',
            filter: ['==', '$type', 'LineString'],
            paint: {
              'line-color': 'blue',
              'line-width': [
                'interpolate', // Zoom-based interpolation
                ['linear'],
                ['zoom'], // Use the zoom level as the input
                1, 0.1,
                18, 10,
              ]
            }
          })

          document.body.style.cursor = 'default'
        }
      }

      console.log(this.s_osmText)
      function getKeyByValue(value) {
        const option = vm.tagOptions.find(option => option.value === value);
        return option ? option.key : null; // 該当するオプションがなければ null を返す
      }
      console.log(getKeyByValue(this.s_osmText))

      addOverpassLayer(getKeyByValue(this.s_osmText),this.s_osmText)

      this.update()
    },
  },
  mounted() {
    // const script = document.createElement('script');
    // script.src = "https://cdnjs.cloudflare.com/ajax/libs/osmtogeojson/3.0.0/osmtogeojson.min.js";
    // document.head.appendChild(script);
  },
  watch: {
    s_osmFire () {
      this.change()
    },
    s_extFire () {
      this.change()
    },
  }
}
</script>
<style scoped>

</style>

