<template>
    <div :style="menuContentSize">
      <div style="font-size: large;margin-bottom: 10px;">{{item.label}}</div>
      <v-select
          v-model="s_osmText"
          :items="tagOptions"
          label="ズーム11以上で表示"
          item-value="value"
          item-title="label"
          @update:modelValue="change"
      ></v-select>

      <v-textarea
          v-model="s_rawQueryText"
          label="クエリを貼り付け"
          outlined
          rows="3"
          placeholder="key=value形式でOSMタグを入力してください。"
      ></v-textarea>
      <v-btn style="margin-top: -10px" class="tiny-btn" @click="run">クエリ実行</v-btn>
      <v-btn style="margin-left: 5px;margin-top: -10px" class="tiny-btn" @click="reset">クエリ解除</v-btn>
      <v-btn style="margin-left: 5px;margin-top: -10px" class="tiny-btn" @click="clear">クリア</v-btn>
      <v-btn style="margin-left: 5px;margin-top: -10px" class="tiny-btn" @click="prev">prev</v-btn>
      <v-btn style="margin-left: 5px;margin-top: -10px" class="tiny-btn" @click="next">next</v-btn>
      <v-btn style="margin-left: 5px;margin-top: -10px" class="tiny-btn" @click="delete0">del</v-btn><br>
      <v-btn style="margin-top: 0px" class="tiny-btn" @click="saveGeojson">geojson保存</v-btn>
      <v-btn style="margin-left: 5px;margin-top: 0px" class="tiny-btn" @click="saveCsv">csv保存</v-btn>
      <v-btn style="margin-left: 5px;margin-top: 0px" class="tiny-btn" @click="gist">gist-geojson</v-btn>
      <v-btn style="margin-left: 5px;margin-top: 0px" class="tiny-btn" @click="gistCsv">gist-csv</v-btn>

      <div style="font-size: small;" v-html="errorLog"></div>
      <hr>
      <div v-html="item.attribution"></div>
    </div>
</template>

<script>
import osmtogeojson from 'osmtogeojson'
export default {
  name: 'ext-osm',
  props: ['mapName','item'],
  data: () => ({
    errorLog: '',
    geojsonText: '',
    counter: 0,
    query: null,
    queryText: null,
    flg: false,
    selectedTag: null,
    tagOptions: [
      { key: '', value: '', label: '無し' },
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
      { key: 'historic', value: 'historic-all', label: 'ヒストリック全て' },
      { key: 'historic', value: 'wayside_shrine', label: '地蔵' },
      { key: 'historic', value: 'monument', label: '記念碑' },
      { key: 'historic', value: 'memorial', label: '小さな記念碑' },
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
      { key: 'waterway', value: 'river', label: '河川' },
      { key: 'waterway', value: 'stream', label: '小川' },
      { key: 'waterway', value: 'canal', label: '運河' },
      { key: 'amenity', value: 'fast_food', label: 'ファストフード' },
    ],
    menuContentSize: {'width':'330px','height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text', 'font-size':'large'}
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
    s_rawQueryText: {
      get() {
        return this.$store.state.rawQueryText[this.mapName]
      },
      set(value) {
        this.$store.state.rawQueryText[this.mapName] = value
      }
    },
  },
  methods: {
    update () {
      console.log(this.s_osmText)
      this.$store.commit('updateSelectedLayers',{mapName: this.mapName, id:this.item.id, values: [
          this.s_osmText,
          this.s_rawQueryText
        ]})
    },
    run () {
      if (this.s_rawQueryText){
        this.errorLog = ''
        this.s_osmText = ''
        this.change ()

        let queryText = JSON.parse(localStorage.getItem('queryText'))
        if (!queryText) {
          queryText = []
        }
        queryText.push(this.s_rawQueryText)
        queryText = [...new Set(queryText)]
        localStorage.setItem('queryText',JSON.stringify(queryText))
        console.log(JSON.parse(localStorage.getItem('queryText')))

      }
    },
    reset () {
      this.errorLog = ''
      const map = this.$store.state[this.mapName]
      map.getSource('osm-overpass-source').setData({
        type: 'FeatureCollection',
        features: [] // 空の features 配列
      });
      this.queryText = ''
    },
    clear () {
      this.errorLog = ''
      const map = this.$store.state[this.mapName]
      map.getSource('osm-overpass-source').setData({
        type: 'FeatureCollection',
        features: [] // 空の features 配列
      });
      this.s_osmText = ''
      this.s_rawQueryText = ''
      this.queryText = ''
    },
    prev () {
      this.errorLog = ''
      const queryText = JSON.parse(localStorage.getItem('queryText'));
      // カウンタが負にならないように調整
      if (this.counter > 0) {
        this.counter--;
      }
      this.s_rawQueryText = queryText[this.counter];
    },
    next () {
      this.errorLog = ''
      const queryText = JSON.parse(localStorage.getItem('queryText'));
      // カウンタが配列の長さより大きくならないように調整
      if (this.counter < queryText.length - 1) {
        this.counter++;
      }
      this.s_rawQueryText = queryText[this.counter];
    },
    delete0 () {
      this.errorLog = ''
      let queryText = JSON.parse(localStorage.getItem('queryText'));
      queryText = queryText.filter(v => v !== this.s_rawQueryText)
      console.log(queryText)
      localStorage.setItem('queryText',JSON.stringify(queryText))
      this.s_rawQueryText = queryText[this.counter];
    },
    saveGeojson () {
      this.errorLog = ''
      // GeoJSONテキストをBlobオブジェクトに変換
      const blob = new Blob([this.geojsonText], { type: 'application/json' });

      // 一時的なダウンロード用リンクを作成
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'osm.geojson'; // ダウンロードするファイル名

      // リンクをクリックしてダウンロードを実行
      document.body.appendChild(link);
      link.click();

      // 後処理: リンクを削除してメモリを解放
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },
    convertGeoJSONToCSV(geojsonText) {
      try {
        // GeoJSONをオブジェクトに変換
        const geojson = JSON.parse(geojsonText);

        // FeatureCollectionの確認
        if (!geojson.features || !Array.isArray(geojson.features)) {
          throw new Error('GeoJSONデータが不正です。FeatureCollectionが見つかりません。');
        }

        // CSVのヘッダーを作成
        const headers = new Set();
        geojson.features.forEach(feature => {
          if (feature.properties) {
            Object.keys(feature.properties).forEach(key => headers.add(key));
          }
        });
        headers.add('中心座標緯度'); // 中心座標緯度
        headers.add('中心座標経度'); // 中心座標経度

        const headerArray = Array.from(headers);
        let csv = headerArray.join(',') + '\n';

        // 各FeatureのデータをCSV行に追加
        geojson.features.forEach(feature => {
          let centerLat = '';
          let centerLng = '';
          if (feature.geometry) {
            switch (feature.geometry.type) {
              case 'Point': {
                [centerLng, centerLat] = feature.geometry.coordinates;
                break;
              }
              case 'LineString': {
                const coords = feature.geometry.coordinates;
                const avg = coords.reduce((acc, coord) => {
                  acc[0] += coord[0];
                  acc[1] += coord[1];
                  return acc;
                }, [0, 0]);
                centerLng = avg[0] / coords.length;
                centerLat = avg[1] / coords.length;
                break;
              }
              case 'Polygon': {
                const coords = feature.geometry.coordinates[0];
                const avg = coords.reduce((acc, coord) => {
                  acc[0] += coord[0];
                  acc[1] += coord[1];
                  return acc;
                }, [0, 0]);
                centerLng = avg[0] / coords.length;
                centerLat = avg[1] / coords.length;
                break;
              }
            }
          }

          const row = headerArray.map(header => {
            if (header === '中心座標緯度') {
              return centerLat;
            } else if (header === '中心座標経度') {
              return centerLng;
            } else {
              return feature.properties?.[header] || '';
            }
          });
          csv += row.join(',') + '\n';
        });

        return csv;
      } catch (error) {
        console.error('GeoJSONをCSVに変換中にエラーが発生しました:', error.message);
        throw error;
      }
    },
    downloadCSV(csvText, fileName = 'osm.csv') {
      try {
        // Blobを作成してダウンロードリンクを生成
        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('CSVダウンロード中にエラーが発生しました:', error.message);
      }
    },
    saveCsv () {
      this.errorLog = ''
      const csvData = this.convertGeoJSONToCSV(this.geojsonText);
      this.downloadCSV(csvData);
    },
    gist () {
      this.errorLog = ''
      // GeoJSONをGitHub Gistにアップロードするプログラム
      async function uploadGeoJSONToGist(geojsonText, gistDescription = 'Uploaded GeoJSON') {

        const token = '';

        const gistAPIUrl = 'https://api.github.com/gists';

        try {
          const response = await fetch(gistAPIUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              description: gistDescription,
              public: true,
              files: {
                'data.geojson': {
                  content: geojsonText
                }
              }
            })
          });

          if (!response.ok) {
            throw new Error(`アップロード失敗: ${response.statusText}`);
          }

          const data = await response.json();
          console.log('アップロード成功:', data.html_url);
          // alert(`アップロード成功: ${data.html_url}`);
          window.open(data.html_url, '_blank'); // Gistページを新しいタブで開く
          return data.html_url;
        } catch (error) {
          console.error('GeoJSONをアップロード中にエラーが発生しました:', error.message);
          alert(`エラー: ${error.message}`);
        }
      }
      uploadGeoJSONToGist(this.geojsonText, 'GeoJSON Dataset Upload');
    },
    gistCsv () {
      // CSVをGistにアップロードする関数
      async function uploadCSVToGist(csvText, gistDescription = 'GeoJSONから変換されたCSV') {
        const token = '';
        const gistData = {
          description: gistDescription,
          public: true,
          files: {
            'osm.csv': {
              content: csvText
            }
          }
        };

        try {
          const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(gistData)
          });

          if (!response.ok) {
            throw new Error(`Gistアップロード失敗: ${response.statusText}`);
          }

          const result = await response.json();
          console.log('Gistが正常にアップロードされました:', result.html_url);
          window.open(result.html_url, '_blank');
        } catch (error) {
          console.error('Gistへのアップロード中にエラーが発生しました:', error.message);
        }
      }
      const csvData = this.convertGeoJSONToCSV(this.geojsonText);
      uploadCSVToGist(csvData);
    },
    change () {
      let dataLength
      const vm = this
      const map = this.$store.state[this.mapName]

      if (this.s_rawQueryText) {

        if (this.s_rawQueryText.includes("user")) {

          const name = this.s_rawQueryText.match(/"([^"]+)"/)[1];
          console.log(name);

          async function getChangesetQuery(userName) {
            try {
              // 現在時刻と24時間前の時刻をISO形式で取得
              const now = new Date();
              const yesterday = new Date(now.getTime() - 72 * 60 * 60 * 1000);
              const timeFilter = `${yesterday.toISOString()},${now.toISOString()}`;

              // Changeset IDを取得（過去72時間以内に絞り込み）
              const changesetUrl = `https://api.openstreetmap.org/api/0.6/changesets?display_name=${userName}&time=${timeFilter}`;
              const changesetResponse = await fetch(changesetUrl);
              const changesetData = await changesetResponse.text();

              // 正規表現でChangeset IDを抽出し、数値に変換して降順に並べ替え
              const changesetIds = [...changesetData.matchAll(/id="(\d+)"/g)]
                  .map(match => parseInt(match[1], 10))
                  .sort((a, b) => b - a)
                  .slice(0, 200); // 上位200件を取得

              if (changesetIds.length === 0) {
                throw new Error('過去24時間以内のChangeset IDが見つかりませんでした。');
              }

              // 上位1件のChangesetの詳細を取得
              const changesetId = changesetIds[0];
              const changesetDetailUrl = `https://api.openstreetmap.org/api/0.6/changeset/${changesetId}/download`;
              const detailResponse = await fetch(changesetDetailUrl);
              const detailData = await detailResponse.text();

              // 正規表現でNode、Way、RelationのIDを抽出（すべてのIDを取得）
              const nodeIds = [...detailData.matchAll(/<node id="(\d+)"/g)].map(match => match[1]);
              const wayIds = [...detailData.matchAll(/<way id="(\d+)"/g)].map(match => match[1]);
              const relationIds = [...detailData.matchAll(/<relation id="(\d+)"/g)].map(match => match[1]);

              // 地図のBBOXを取得
              const bounds = map.getBounds();
              const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
              // console.log('使用するBBOX:', bbox);

              // Overpass APIクエリを生成 (BBOXを含む)
              const query = `[out:json][timeout:60];
             (
              ${nodeIds.map(id => `node(${id})(${bbox});`).join(' ')}
              ${wayIds.map(id => `way(${id})(${bbox});`).join(' ')}
              ${relationIds.map(id => `relation(${id})(${bbox});`).join(' ')}
             );
              (._;>;);
              out body;`;

              console.log('生成されたOverpass APIクエリ:', query);

              // Overpass APIからデータを取得しMapLibreに表示 (POSTリクエスト)
              const url = `https://overpass.openstreetmap.jp/api/interpreter`;
              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `data=${encodeURIComponent(query)}`
              });

              if (!response.ok) {
                const errorText = await response.text();
                vm.errorLog = errorText
              }

              const data = await response.json();
              const geojson = osmtogeojson(data);
              vm.geojsonText = JSON.stringify(geojson, null, 2)
              map.getSource('osm-overpass-source').setData(geojson);
              map.getCanvas().style.cursor = 'default'
              console.log('MapLibreにGeoJSONレイヤーを追加しました');
            } catch (error) {
              console.error('エラー:', error.message);
              document.body.style.cursor = 'default';
              throw error;
            }
          }

          (async () => {
            try {
              await getChangesetQuery(name);
            } catch (error) {
              console.error('処理中にエラーが発生しました:', error);
            }
          })();

        } else {
          const bounds = map.getBounds();
          const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
          if (!this.s_rawQueryText.includes('\n')) {
            // キーと値を分割する関数
            function splitKeyValue(input) {
              const match = input.match(/^([\w:]+)\s*=\s*["']?([^"']+)["']?$/);
              if (match) {
                return { key: match[1], value: match[2] };
              } else {
                return { key: input, value: null };
              }
            }

            console.log(splitKeyValue('name:ja="国道134号"'))

            const {key, value} = splitKeyValue(this.s_rawQueryText);
            console.log(key, value)
            function buildOverpassQuery(key, value) {
              let rawQueryText;
              if (value === null || value === undefined) {
                // valueがnullまたはundefinedの場合、keyに一致する全てを抽出
                rawQueryText = '[out:json][timeout:60];' +
                    '(' +
                    'node[' + key + '](' + bbox + ');' +
                    'way[' + key + '](' + bbox + ');' +
                    'relation[' + key + '](' + bbox + ');' +
                    ');' +
                    'out body;' +
                    '>;' +
                    'out skel qt;';
              } else {
                rawQueryText = '[out:json][timeout:60];' +
                    '(' +
                    'node["' + key + '"="' + value + '"](' + bbox + ');' +
                    'way["' + key + '"="' + value + '"](' + bbox + ');' +
                    'relation["' + key + '"="' + value + '"](' + bbox + ');' +
                    ');' +
                    'out body;' +
                    '>;' +
                    'out skel qt;';
              }
              return rawQueryText;
            }
            this.queryText = buildOverpassQuery(key, value);
            console.log('生成されたクエリ:', this.queryText);
          } else {
            this.queryText = this.query.replace(/^\s*\/\/.*$\n?/gm, '')
            this.queryText = this.queryText.replace(/\(\s*user:[^)]*\)\s*/g, '');
            this.queryText = this.queryText.replace(/\s*\n\s*/g, ' ');
            this.queryText = this.queryText.replace(/\{\{bbox\}\}/g, bbox);
            this.queryText = this.queryText.replace(
                /\bnwr\s*\((.*?)\)\s*\((.*?)\)\s*;?/g,
                'node($1)($2);\nway($1)($2);\nrelation($1)($2);'
            );
            this.queryText = this.queryText.replace(/\{\{date:(\d+)hours\}\}/g, (_, hours) => {
              const pastDate = new Date(Date.now() - Number(hours) * 60 * 60 * 1000).toISOString();
              return pastDate;
            });
          }
        }
        console.log(this.queryText)
      }

      //
      //
      //
      //
      //
      //
      //
      //
      //

      if (!this.s_osmText && !this.s_rawQueryText) {
        map.getSource('osm-overpass-source').setData({
          type: 'FeatureCollection',
          features: [] // 空の features 配列
        });
        this.update()
        return
      }
      //
      // if (map.getZoom() <= 11) {
      //   map.getSource('osm-overpass-source').setData({
      //     type: 'FeatureCollection',
      //     features: [] // 空の features 配列
      //   });
      //   return
      // }

      async function fetchOverpassData(tagKey, tagValue) {
        // const bounds = map.getBounds();
        // const query = '[out:json];' +
        //     '(' +
        //     'node["amenity"="drinking_water"](' + bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast() + '););' +
        //     'out body;';

        // node [amenity=drinking_water]({{bbox}});out;

        const bounds = map.getBounds();

        let query = tagValue.includes("highway-all")
            ? '[out:json];' +
            '(' +
            'way["' + tagKey + '"](' +
            bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast() + ');' +
            ');' +
            'out body;' +
            '>;' +
            'out skel qt;'
            : tagValue.includes("-all")
                ? '[out:json];' +
                '(' +
                'way[' + tagKey + '](' +
                bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast() + ');' +
                'node[' + tagKey + '](' +
                bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast() + ');' +
                'relation[' + tagKey + '](' +
                bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast() + ');' +
                ');' +
                'out body;' +
                '>;' +
                'out skel qt;'
                : '[out:json];' +
                '(' +
                'way["' + tagKey + '"="' + tagValue + '"](' +
                bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast() + ');' +
                'node["' + tagKey + '"="' + tagValue + '"](' +
                bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast() + ');' +
                ');' +
                'out body;' +
                '>;' +
                'out skel qt;';

        if (vm.s_rawQueryText) {
          query = vm.queryText
        }
        console.log(query)
        // alert(query)
        const url = `https://overpass.openstreetmap.jp/api/interpreter?data=${encodeURIComponent(query)}`;

        try {
          const response = await fetch(url);

          console.log(response)

          if (!response.ok) {
            const errorText = await response.text();
            vm.errorLog = errorText
            // map.getCanvas().style.cursor = 'default'
          } else {
            vm.errorLog = ''
          }

          const data = await response.json();
          console.log(data.elements.length)
          dataLength = data.elements.length
          const geojson = osmtogeojson(data);
          return geojson;
        } catch (error) {
          console.error('Error fetching Overpass data:', error);
          map.getCanvas().style.cursor = 'default'
        }
      }

      // MapLibreにGeoJSONレイヤーを追加
      async function addOverpassLayer(tagKey, tagValue) {
        map.getCanvas().style.cursor = 'wait'
        const geojsonData = await fetchOverpassData(tagKey, tagValue)
        if (geojsonData) {
          // console.log(JSON.stringify(geojsonData))
          vm.geojsonText = JSON.stringify(geojsonData, null, 2)
          if (!map.getSource('osm-overpass-source')) {
            map.addSource('osm-overpass-source', {
              type: 'geojson',
              data: geojsonData
            })
          } else {
            map.getSource('osm-overpass-source').setData(geojsonData)
          }
          let zoom = 0
          if (dataLength < 10000) {
            zoom = 0
          } else if (dataLength < 100000) {
            zoom = 9
          } else {
            zoom = 11
          }
          if (map.getZoom() <= zoom) {
            map.getSource('osm-overpass-source').setData({
              type: 'FeatureCollection',
              features: [] // 空の features 配列
            });
            map.getCanvas().style.cursor = 'default'
            return
          }
          map.getCanvas().style.cursor = 'default'
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

