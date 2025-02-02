<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :id="'container-div-' + mapName" :style="menuContentSize" class="container-div">
      <div :id="'first-div-' + mapName" class="first-div">
        <draggable @start="onStart" @end="onEnd" v-model="s_selectedLayers[mapName]" item-key="id" handle=".handle-div">
          <template #item="{element}">
            <div class="drag-item">

              <div class="visible-layer-div">
                <v-icon @click="toggleCheck(element)" class="clickable-icon">
                  {{ element.visibility ? 'mdi-eye' : 'mdi-eye-off' }}
                </v-icon>
              </div>

              <div class="handle-div"><i class="fa-solid fa-up-down fa-lg handle-icon hover"></i></div>
              <div class="info-div" @click="infoOpen(element,true)">
                <v-icon v-if="element.ext">mdi-cog</v-icon>
                <v-icon v-if="!element.ext">mdi-information</v-icon>
              </div>
              <div class="label-div">{{element.label}}</div>
              <div class="range-div">
<!--                <input type="range" min="0" max="1" step="0.01" class="range" v-model.number="element.opacity" @input="changeSlider(element)"/>-->
                <input type="range" min="0" max="1" step="0.01" class="range" v-model.number="element.opacity" @input="inputSlider(element)" @change="changeSlider" @mouseover="changeWatchFlg(false)" @mouseleave="changeWatchFlg(true)"/>
              </div>
              <div class="trash-div" @click="removeLayer(element.id)"><i class="fa-sharp fa-solid fa-trash-arrow-up hover"></i></div>
            </div>
          </template>
        </draggable>
        <div style="color: white;font-size: larger;text-align: center">
          下のリストから選んでください。
        </div>
      </div>

      <div :id="'center-div-' + mapName" class="center-div"></div>

      <div :id="'second-div-' + mapName" :style="s_secondDivStyle" class="second-div scrollable-content">
        <v-text-field label="地図抽出" v-model="searchText" style="margin-top: 10px"></v-text-field>
        <Tree
            :nodes="layers"
            :search-text="searchText"
            :use-checkbox="false"
            :use-icon="true"
            @nodeClick="onNodeClick"
        />
      </div>
    </div>
  </Dialog>
</template>

<script>
import DxfParser from 'dxf-parser'
import {dxfToGeoJSON} from '@/App'
import {
  addImageLayer,
  addImageLayerJpg,
  geojsonAddLayer,
  highlightSpecificFeatures,
  highlightSpecificFeaturesCity,
  simaToGeoJSON
} from "@/js/downLoad";

let infoCount = 0
import * as Layers from '@/js/layers'
import Tree from "vue3-tree"
import "vue3-tree/dist/style.css"
import draggable from "vuedraggable"
import mw5 from '@/js/mw5'
import * as turf from '@turf/turf'
import {gpx, kml} from "@tmcw/togeojson";

export default {
  name: 'Dialog-layer',
  props: ['mapName'],
  components: {
    Tree,
    draggable
  },
  data: () => ({
    flyZoom: 14.5,
    counter: 0,
    nodeClicked: false,
    isDragging:false,
    isChecked: true,
    searchText: '',
    selectedLayers: {
      map01:[],
      map02:[]
    },
    layers:[],
    menuContentSize: {'height': 'auto','margin': '10px', 'user-select': 'text'},
    // menuContentSize: {'height': 'auto','margin': '10px', 'user-select': 'text','overflow-y': 'auto'},
  }),
  computed: {
    s_watchFlg () {
      return this.$store.state.watchFlg
    },
    s_secondDivStyle: {
      get() {
        return this.$store.state.secondDivStyle
      },
      set(value) {
        this.$store.state.secondDivStyle = value
      }
    },
    s_lngRange () {
      return this.$store.state.lngRange
    },
    s_latRange () {
      return this.$store.state.latRange
    },
    s_dialogsINfo () {
      return this.$store.state.dialogsInfo
    },
    s_dialogs () {
      return this.$store.state.dialogs.layerDialog
    },
    s_selectedLayers: {
      get() {
        return this.$store.state.selectedLayers
      },
      set(value) {
        this.$store.state.selectedLayers = value
      }
    },
  },
  methods: {
    onStart () {
      this.isDragging = true
    },
    onEnd () {
      this.isDragging = false
      this.$store.state.watchFlg = !this.$store.state.watchFlg
      this.$store.state.watchFlg = true
      this.zoomOperation(500)
      this.$store.state.extFire = !this.$store.state.extFire
    },
    toggleCheck(element) {
      this.$store.state.watchFlg = true
      const map = this.$store.state[this.mapName]
      element.layers.forEach(layer0 => {
        let visible
        if (element.visibility) {
          visible = 'visible'
        } else {
          visible = 'none'
        }
        if (layer0.id === 'oh-mw-dummy') {
          const layers = map.getStyle().layers
          layers.forEach(layer => {
            if (layer.id.slice(0, 5) === 'oh-mw') {
              map.setLayoutProperty(layer.id, 'visibility', visible)
            }
          })
        } else {
          console.log(layer0.id,visible)
          map.setLayoutProperty(layer0.id, 'visibility', visible)
        }
      })
      console.log(element)
      element.visibility = !element.visibility
      // const layers = map.getStyle().layers;
      // const firstLayerId = layers.length > 0 ? layers[0].id : null;
      // map.moveLayer('sima-borders', firstLayerId)
      // map.moveLayer('sima-layer', firstLayerId)

      this.zoomOperation(1000)
      // プログラムの最後に追加
      const layers = map.getStyle().layers;
      const lastLayerId = layers.length > 0 ? layers[layers.length - 1].id : null;
      if (map.getLayer('sima-layer') && lastLayerId) {
        map.moveLayer('sima-layer',lastLayerId);
      }
    },
    infoOpen (element,isNew) {
      this.$store.commit('incrDialogMaxZindex')
      const result = this.s_dialogsINfo[this.mapName].find(el => el.id === element.id)
      const dialogEl = document.querySelector('#dialog-div-layerDialog-' + this.mapName)
      let top = dialogEl.offsetTop + 'px'
      let left
      if (window.innerWidth > 1000) {
        left = (dialogEl.offsetLeft + dialogEl.offsetWidth + 5) + 'px'
      } else {
        left = '10px'
      }

      if (top === '0px') {
        top = '100px'
        left = '10px'
      }

      const dialogDivs = document.querySelectorAll(".dialog-info-div")
      if (dialogDivs.length > 0) {
        const lastDiv = dialogDivs[dialogDivs.length - 1];
        const rect = lastDiv.getBoundingClientRect();
        top = (rect.top + 20) + 'px'
        left = (rect.left + 20) + 'px'
      } else {
        top = Number(top.replace('px','')) + (infoCount * 20) + 'px'
        left = Number(left.replace('px','')) + (infoCount * 20) + 'px'
        infoCount++
      }

      console.log(element.label,top,left)

      if (!result) {
        const infoDialog =
            {
              id: element.id,
              label: element.label,
              attribution: element.attribution,
              ext: element.ext,
              style: {
                // width: '200px',
                width: 'auto',
                display: 'block',
                top: top,
                left: left,
                'z-index': this.$store.state.dialogMaxZindex
              }
            }
        this.$store.commit('pushDialogsInfo', {mapName: this.mapName, dialog: infoDialog})
        const dialogDivs = document.querySelectorAll(".dialog-info-div")
        console.log(dialogDivs.length)

      } else {
        if (isNew) {
          result.style.display = 'block'
          result.style["z-index"] = this.$store.state.dialogMaxZindex
        }
      }


      // const lastDiv = dialogDivs[dialogDivs.length - 1]
      // lastDiv.style.top = top
      // lastDiv.style.left = left

    },
    changeWatchFlg (bool) {
      this.$store.state.watchFlg = bool
    },
    changeSlider () {
      this.zoomOperation(500)
    },
    inputSlider (element){
      const map = this.$store.state[this.mapName]
      if (element.layers) {
        element.layers.forEach(layer0 => {
          if (layer0.id === 'oh-mw-dummy') {
            const layers = map.getStyle().layers
            layers.forEach(layer => {
              if (layer.id.slice(0,5) === 'oh-mw') {
                if (layer.type === 'raster') {
                  map.setPaintProperty(layer.id, 'raster-opacity', element.opacity)
                } else if (layer.type === 'symbol') {
                  map.setPaintProperty(layer.id, 'text-opacity', element.opacity)
                }
              }
            })
          }
          // console.log(layer0.type)

          let opacity
          if (layer0['max-opacity']) {
            opacity = element.opacity * layer0['max-opacity']
          } else {
            opacity = element.opacity
          }

          if (layer0.type === 'raster') {
            map.setPaintProperty(layer0.id, 'raster-opacity', opacity)
          } else if (layer0.type === 'fill') {
            if (layer0.metadata.group === 'osm-bright' || layer0.metadata.group === 'osm-3d') {
              if (typeof layer0.paint['fill-opacity'] === 'number') {
                map.setPaintProperty(layer0.id, 'fill-opacity', layer0.paint['fill-opacity'] * opacity)
              } else {
                map.setPaintProperty(layer0.id, 'fill-opacity', opacity)
              }
            } else {
              map.setPaintProperty(layer0.id, 'fill-opacity', opacity)
            }
          } else if (layer0.type === 'line') {
            map.setPaintProperty(layer0.id, 'line-opacity', opacity)
          } else if (layer0.type === 'fill-extrusion') {
            map.setPaintProperty(layer0.id, 'fill-extrusion-opacity', opacity)
          } else if (layer0.type === 'heatmap') {
            map.setPaintProperty(layer0.id, 'heatmap-opacity', opacity)
          } else if (layer0.type === 'circle') {
            map.setPaintProperty(layer0.id, 'circle-opacity', opacity)
          } else if (layer0.type === 'symbol') {
            map.setPaintProperty(layer0.id, 'text-opacity', opacity)
          } else if (layer0.type === 'background') {
            map.setPaintProperty(layer0.id, 'background-opacity', opacity)
          }
        })
      }
    },
    zoomOperation (timeOut) {
      // なぜか一度ズームしないと最適化ベクタータイルが反映しない。
      const map = this.$store.state.map01
      const zoom = map.getZoom()
      setTimeout(() => {
        map.setZoom(12)
        map.setZoom(zoom)
        const layers = map.getStyle().layers;
        const lastLayerId = layers.length > 0 ? layers[layers.length - 1].id : null;
        if (map.getLayer('sima-layer') && lastLayerId) {
          map.moveLayer('sima-layer',lastLayerId);
          map.moveLayer('sima-borders',lastLayerId);
        }
      },timeOut)
    },
    removeLayer(id){
      this.s_selectedLayers[this.mapName] = this.s_selectedLayers[this.mapName].filter(layer => layer.id !== id)
      this.$store.state.dialogsInfo[this.mapName] = this.$store.state.dialogsInfo[this.mapName].filter(layer => layer.id !== id)
      this.$store.state.watchFlg = true
      if (id === 'oh-jpg-layer') {
        this.$store.state.uploadedImage = ''
      }
      this.zoomOperation(1000)
    },
    onNodeClick (node) {
      if (node.layers) {
        console.log(node)
        if (node.position) this.nodeClicked = true
        if (node.flyZoom) this.flyZoom = node.flyZoom
        this.$store.state.watchFlg = true
        const map = this.$store.state[this.mapName]
        if(!this.s_selectedLayers[this.mapName].find(layers => layers.id === node.id)) {
          console.log(node)
          const obj = {
            id: node.id,
            label: node.label,
            source: node.source,
            sources: node.sources,
            layer: node.layer,
            layers: node.layers,
            attribution: node.attribution,
            opacity: 1,
            visibility: true,
            ext: node.ext,
            info: node.info,
            position: node.position,
          }
          if (!this.s_selectedLayers[this.mapName]?.some(layer => layer.id === 'oh-amx-a-fude')) {
            this.s_selectedLayers[this.mapName].unshift(obj)
          } else {
            this.s_selectedLayers[this.mapName].splice(1, 0, obj)
          }
        } else {
          this.s_selectedLayers[this.mapName] = this.s_selectedLayers[this.mapName].filter(layer => layer.id !== node.id)
          map.removeLayer(node.id)
        }
        this.zoomOperation(1000)
      }
    },
    addLayers() {
      if(!this.$store.state.watchFlg && !this.isDragging) return
      // ------------------------------------------------------------------
      const map = this.$store.state[this.mapName]
      // まずレイヤーを削除-------------------------
      const layers = map.getStyle().layers
      if (layers) {
        for (let i = layers.length - 1; i >= 0; i--) {
          const layerId = layers[i].id
          if (layerId.slice(0,2) === 'oh' ) {
            map.removeLayer(layerId)
          }
        }
      }
      // -----------------------------------------
      // if (this.s_selectedLayers[this.mapName]?.some(layer => layer.id === 'oh-amx-a-fude')) {
      //   this.$store.state.watchFlg = false
      //   this.isDragging = false
      //   if (Array.isArray(this.s_selectedLayers[this.mapName])) {
      //     const layers = this.s_selectedLayers[this.mapName];
      //     const index = layers.findIndex(layer => layer.id === 'oh-amx-a-fude');
      //     if (index !== -1) {
      //       // 要素が存在する場合、先頭に移動
      //       const [targetLayer] = layers.splice(index, 1); // 指定した要素を取り除く
      //       layers.unshift(targetLayer); // 取り除いた要素を先頭に追加
      //     }
      //   }
      // }
      // -------------------------------------------------------------------------------------------
      for (let i = this.s_selectedLayers[this.mapName].length - 1; i >= 0 ; i--){
        const layer = this.s_selectedLayers[this.mapName][i]
        if (layer.layers) {
          if (layer.sources) {
            layer.sources.forEach(source => {
              if (!map.getSource(source.id)) map.addSource(source.id, source.obj)
            })
          }
          if (layer.source) {
            if (!map.getSource(layer.source.id)) map.addSource(layer.source.id, layer.source.obj)
          }
          let flyFlg = true
          layer.layers.forEach(layer0 => {
            if (layer0.id === 'oh-mw-dummy') {
              this.mw5AddLayers(map,this.mapName)
            } else {
              if (!map.getLayer(layer0.id)) {
                map.addLayer(layer0)
                if (layer0.position) {
                  if (flyFlg && this.nodeClicked) {
                    setTimeout(() => {
                      map.flyTo({
                        center: Array.from(layer0.position), // フライ先の座標（経度, 緯度）
                        zoom: this.flyZoom,                   // ズームレベル（任意）
                        speed: 1.2,                 // アニメーション速度（オプション）
                        curve: 1.42,                // アニメーションの曲線効果（オプション）
                        essential: true            // ユーザーがアニメーションを無効化していても実行
                      });
                      flyFlg = false
                      this.nodeClicked = false
                    },1000)
                  }
                }
              }
              let opacity
              if (layer0['max-opacity']) {
                opacity = layer.opacity * layer0['max-opacity']
              } else {
                opacity = layer.opacity
              }

              if (layer0.type === 'raster') {
                map.setPaintProperty(layer0.id, 'raster-opacity', opacity)
              } else if (layer0.type === 'fill') {
                if ((layer0.metadata && layer0.metadata.group === 'osm-bright') || (layer0.metadata && layer0.metadata.group === 'osm-3d')) {
                  if (typeof layer0.paint['fill-opacity'] === 'number') {
                    console.log(layer0.paint['fill-opacity'])
                    map.setPaintProperty(layer0.id, 'fill-opacity', layer0.paint['fill-opacity'] * opacity)
                  } else {
                    map.setPaintProperty(layer0.id, 'fill-opacity', opacity)
                  }
                } else {
                  map.setPaintProperty(layer0.id, 'fill-opacity', opacity)
                }
              } else if (layer0.type === 'line') {
                map.setPaintProperty(layer0.id, 'line-opacity', opacity)
              } else if (layer0.type === 'fill-extrusion') {
                map.setPaintProperty(layer0.id, 'fill-extrusion-opacity', opacity)
              } else if (layer0.type === 'heatmap') {
                map.setPaintProperty(layer0.id, 'heatmap-opacity', opacity)
              } else if (layer0.type === 'circle') {
                map.setPaintProperty(layer0.id, 'circle-opacity', opacity)
              } else if (layer0.type === 'symbol') {
                map.setPaintProperty(layer0.id, 'text-opacity', opacity)
              } else if (layer0.type === 'background') {
                map.setPaintProperty(layer0.id, 'background-opacity', opacity)
              }
              let visibility
              if (layer.visibility) {
                visibility = 'visible'
              } else {
                visibility = 'none'
              }
              if (layer.visibility === undefined) visibility = 'visible'
              // ここを修正する必要があるが、昔のリンクがなくなれば問題なくなるか？
              // console.log(layer.visibility)
              map.setLayoutProperty(layer0.id, 'visibility',visibility)
            }
          })
          // -------------------------------------------------
          if(!this.isDragging) {
            if (layer.ext) {
              if (layer.ext.values) {
                layer.ext.values.forEach((v,i) => {
                  this.$store.commit('updateParam', {
                    name: layer.ext.name,
                    mapName: this.mapName,
                    value: String(v),
                    order: i
                  })
                })
              }
              // ここを改修する。
              this.infoOpen(layer,false)
              this.$store.state.extFire = !this.$store.state.extFire
            }
          }
          // -------------------------------------------------
          if (layer.info) this.infoOpen(layer,false)
          // -------------------------------------------------
        }
      }
      if (this.counter >= 1) {
        if (map.getLayer('sima-layer')) {
          map.removeLayer('sima-layer')
          map.removeLayer('sima-borders')
          map.removeLayer('sima-label')
          map.removeLayer('sima-points')
          map.removeLayer('sima-label-point')
          map.removeLayer('sima-polygon-points')
        }
        if (this.$store.state.simaText) {
          const simaText = JSON.parse(this.$store.state.simaText).text
          const zahyokei = JSON.parse(this.$store.state.simaText).zahyokei
          const opacity = JSON.parse(this.$store.state.simaText).opacity
          this.$store.state.simaOpacity = opacity
          simaToGeoJSON(simaText,map,zahyokei,false)
          this.$store.state.snackbar = true
          this.$store.state.simaFire = !this.$store.state.simaFire
        }
        // ------------------------------------------------------------------
        if (this.$store.state.kmlText) {
          const parser = new DOMParser();
          const kmlText = this.$store.state.kmlText
          const kmlData = parser.parseFromString(kmlText, 'application/xml');
          const geojson = kml(kmlData);
          geojsonAddLayer (map, geojson, false, 'kml')
        }
        if (this.$store.state.geojsonText) {
          const geojson = JSON.parse(this.$store.state.geojsonText)
          geojsonAddLayer (map, geojson, false, 'geojson')
        }
        if (this.$store.state.dxfText) {
          const parser = new DxfParser();
          const dxf = parser.parseSync(this.$store.state.dxfText);
          const geojson = dxfToGeoJSON(dxf);
          geojsonAddLayer (map, geojson, false, 'dxf')
        }
        if (this.$store.state.gpxText) {
          const parser = new DOMParser();
          const gpxDoc = parser.parseFromString(this.$store.state.gpxText, 'application/xml');
          const geojson = gpx(gpxDoc);
          geojsonAddLayer (map, geojson, false, 'gpx')
        }
      }

      if (this.counter === 1) {
        if (this.$store.state.uploadedImage) {
          if (map.getLayer('oh-geotiff-layer')) {
            map.removeLayer('oh-geotiff-layer')
          }
          async function fetchFile(url) {
            try {
              // Fetchリクエストでファイルを取得
              const response = await fetch(url);
              // レスポンスが成功したか確認
              if (!response.ok) {
                throw new Error(`HTTPエラー! ステータス: ${response.status}`);
              }
              // Blobとしてレスポンスを取得
              const blob = await response.blob();
              // BlobをFileオブジェクトに変換
              const file = new File([blob], "downloaded_file", { type: blob.type });
              console.log("Fileオブジェクトが作成されました:", file);
              return file;
            } catch (error) {
              console.error("ファイルの取得中にエラーが発生しました:", error);
            }
          }
          async function checkImageExistsAndWidth(imageUrl) {
            try {
              // HEADリクエストで存在確認
              const response = await fetch(imageUrl, { method: 'HEAD' });
              if (!response.ok) {
                console.log('Image does not exist.');
                return false;
              }

              // Imageオブジェクトで横幅確認
              const image = new Image();
              image.src = imageUrl;

              // Promiseでロード完了を待つ
              const imageLoaded = new Promise((resolve, reject) => {
                image.onload = () => resolve(image);
                image.onerror = (error) => reject(error);
              });

              const loadedImage = await imageLoaded;

              if (loadedImage.width > 200) {
                console.log('Image exists and width is greater than 200px!');
                return true;
              } else {
                console.log('Image exists but width is 200px or less.');
                return false;
              }
            } catch (error) {
              console.error('Error checking image:', error);
              return false;
            }
          }



          if (JSON.parse(this.$store.state.uploadedImage).worldFile) {
            if (JSON.parse(this.$store.state.uploadedImage).worldFile.split('.')[1] === 'tfw' ) {
              const imageUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).image
              const worldFileUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).worldFile
              const jpgUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).jpg
              console.log(imageUrl)
              console.log(worldFileUrl)
              console.log(jpgUrl)
              // console.log(fetchFile(imageUrl))

              // Promise.all([fetchFile(imageUrl), fetchFile(worldFileUrl)]).then(files => {
              //   if (files.every(file => file)) {
              //     console.log("両方のファイルが取得されました:", files);
              //     const image = files[0]
              //     console.log(image)
              //     const worldFile = files[1]
              //     const code = JSON.parse(this.$store.state.uploadedImage).code
              //     addImageLayer(image, worldFile, code, false)
              //   } else {
              //     console.warn("一部のファイルが取得できませんでした。");
              //   }
              // }).catch(error => {
              //   console.error("Promise.allでエラーが発生しました:", error);
              // });

              checkImageExistsAndWidth(jpgUrl).then(exists => {
                if (exists) {
                  console.log('jpg画像が存在します。');
                  Promise.all([fetchFile(jpgUrl), fetchFile(worldFileUrl)]).then(files => {
                    if (files.every(file => file)) {
                      console.log("両方のファイルが取得されました:", files);
                      const image = files[0]
                      const worldFile = files[1]
                      const code = JSON.parse(this.$store.state.uploadedImage).code
                      addImageLayerJpg(image, worldFile, code, false)
                    } else {
                      console.warn("一部のファイルが取得できませんでした。");
                    }
                  }).catch(error => {
                    console.error("Promise.allでエラーが発生しました:", error);
                  });
                } else {
                  console.log('jpg画像が存在しません。');
                  Promise.all([fetchFile(imageUrl), fetchFile(worldFileUrl)]).then(files => {
                    if (files.every(file => file)) {
                      console.log("両方のファイルが取得されました:", files);
                      const image = files[0]
                      const worldFile = files[1]
                      const code = JSON.parse(this.$store.state.uploadedImage).code
                      addImageLayer(image, worldFile, code, false)
                    } else {
                      console.warn("一部のファイルが取得できませんでした。");
                    }
                  }).catch(error => {
                    console.error("Promise.allでエラーが発生しました:", error);
                  });
                }
              });
            } else if (JSON.parse(this.$store.state.uploadedImage).worldFile.split('.')[1] === 'jgw' ) {
              const imageUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).image
              const worldFileUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).worldFile
              Promise.all([fetchFile(imageUrl), fetchFile(worldFileUrl)]).then(files => {
                if (files.every(file => file)) {
                  console.log("両方のファイルが取得されました:", files);
                  const image = files[0]
                  const worldFile = files[1]
                  const code = JSON.parse(this.$store.state.uploadedImage).code
                  addImageLayerJpg(image, worldFile, code, false)
                } else {
                  console.warn("一部のファイルが取得できませんでした。");
                }
              }).catch(error => {
                console.error("Promise.allでエラーが発生しました:", error);
              });
            }
          } else {
            const imageUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).image
            Promise.all([fetchFile(imageUrl)]).then(files => {
              if (files.every(file => file)) {
                const image = files[0]
                console.log(image)
                const code = JSON.parse(this.$store.state.uploadedImage).code
                addImageLayer(image, null, code, false)
              } else {
                console.warn("一部のファイルが取得できませんでした。");
              }
            }).catch(error => {
              console.error("Promise.allでエラーが発生しました:", error);
            });
          }
        }
      }
      // map.setLayoutProperty('oh-jpg-layer', 'visibility', 'visible');

      if (map.getLayer('oh-amx-a-fude')) highlightSpecificFeatures(map, 'oh-amx-a-fude');
      if (map.getLayer('oh-chibanzu2024')) highlightSpecificFeaturesCity(map, 'oh-chibanzu2024');
      if (map.getLayer('oh-kitahiroshimachiban')) highlightSpecificFeaturesCity(map, 'oh-kitahiroshimachiban');
      if (map.getLayer('oh-narashichiban')) highlightSpecificFeaturesCity(map, 'oh-narashichiban');
      if (map.getLayer('oh-iwatapolygon')) highlightSpecificFeaturesCity(map, 'oh-iwatapolygon');
      if (map.getLayer('oh-fukushimachiban')) highlightSpecificFeaturesCity(map, 'oh-fukushimachiban');
      if (map.getLayer('oh-kitahiroshimachiban')) highlightSpecificFeaturesCity(map, 'oh-kitahiroshimachiban');
      if (map.getLayer('oh-kunitachishi')) highlightSpecificFeaturesCity(map, 'oh-kunitachishi');
      if (map.getLayer('oh-fukuokashichiban')) highlightSpecificFeaturesCity(map, 'oh-fukuokashichiban');
      if (map.getLayer('oh-chibanzu-室蘭市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-室蘭市');
      if (map.getLayer('oh-chibanzu-ニセコ町')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-ニセコ町');
      if (map.getLayer('oh-chibanzu-音更町')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-音更町');
      if (map.getLayer('oh-chibanzu-鹿角市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-鹿角市');
      if (map.getLayer('oh-chibanzu-舟形町')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-舟形町');
      if (map.getLayer('oh-chibanzu-利根町')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-利根町');
      if (map.getLayer('oh-chibanzu-小平市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-小平市');
      if (map.getLayer('oh-chibanzu-町田市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-町田市');
      if (map.getLayer('oh-chibanzu-静岡市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-静岡市');
      if (map.getLayer('oh-chibanzu-磐田市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-磐田市');
      if (map.getLayer('oh-chibanzu-半田市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-半田市');
      if (map.getLayer('oh-chibanzu-京都市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-京都市');
      if (map.getLayer('oh-chibanzu-長岡京市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-長岡京市');
      if (map.getLayer('oh-chibanzu-岸和田市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-岸和田市');
      if (map.getLayer('oh-chibanzu-泉南市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-泉南市');
      if (map.getLayer('oh-chibanzu-西宮市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-西宮市');
      if (map.getLayer('oh-chibanzu-加古川市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-加古川市');
      if (map.getLayer('oh-chibanzu-佐用町')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-佐用町');
      if (map.getLayer('oh-chibanzu-奈良市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-奈良市');
      if (map.getLayer('oh-chibanzu-坂出市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-坂出市');
      if (map.getLayer('oh-chibanzu-善通寺市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-善通寺市');
      if (map.getLayer('oh-chibanzu-長与町')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-長与町');
      if (map.getLayer('oh-chibanzu-福島市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-福島市');
      if (map.getLayer('oh-chibanzu-北広島市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-北広島市');
      if (map.getLayer('oh-chibanzu-国立市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-国立市');
      if (map.getLayer('oh-chibanzu-福岡市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-福岡市');
      if (map.getLayer('oh-chibanzu-越谷市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-越谷市');
      if (map.getLayer('oh-chibanzu-福山市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-福山市');
      if (map.getLayer('oh-chibanzu-深谷市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-深谷市');
      if (map.getLayer('oh-chibanzu-伊丹市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-伊丹市');
      if (map.getLayer('oh-chibanzu-豊中市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-豊中市');

      this.counter++
    },
    mw5AddLayers(map,mapName) {
      if (!this.s_selectedLayers[mapName].find(v => v.id === 'oh-mw5')) {
        return
      }
      // まずレイヤーを削除-------------------------
      const layers = map.getStyle().layers
      if (layers) {
        for (let i = layers.length - 1; i >= 0; i--) {
          const layerId = layers[i].id
          if (layerId.slice(0,5) === 'oh-mw' ) {
            if (map.getSource(layerId)) map.removeLayer(layerId)
          }
        }
      }

      if (map.getZoom() <= 7) return;

      mw5.forEach((value) => {
        const poly1 = turf.polygon([
          [
            [this.s_lngRange[0], this.s_latRange[0]],
            [this.s_lngRange[0], this.s_latRange[1]],
            [this.s_lngRange[1], this.s_latRange[1]],
            [this.s_lngRange[1], this.s_latRange[0]],
            [this.s_lngRange[0], this.s_latRange[0]],
          ],
        ])
        const poly2 = turf.polygon([
          [
            [value.extent[0], value.extent[3]],
            [value.extent[0], value.extent[1]],
            [value.extent[2], value.extent[1]],
            [value.extent[2], value.extent[3]],
            [value.extent[0], value.extent[3]],
          ],
        ])
        if (turf.booleanIntersects(poly1, poly2)) {
          if (!map.getSource(value.id)) map.addSource(value.id,{
            type: 'raster',
            tiles: ['https://mapwarper.h-gis.jp/maps/tile/' + value.id + '/{z}/{x}/{y}.png'],
            bounds: [value.extent[0], value.extent[3], value.extent[2], value.extent[1]],
          })

          if (!map.getLayer(value.id)) map.addLayer({
            id: 'oh-mw-' + value.id,
            source: value.id,
            type: 'raster',
            paint: {
              'raster-fade-duration': 0
            }
          })

          const opacity = this.s_selectedLayers[mapName].find(v => v.id === 'oh-mw5').opacity
          map.setPaintProperty('oh-mw-' + value.id, 'raster-opacity', opacity)
          const visibility0 = this.s_selectedLayers[mapName].find(v => v.id === 'oh-mw5').visibility
          console.log(visibility0)
          let visibility
          if (visibility0) {
            visibility = 'visible'
          } else {
            visibility = 'none'
          }
          map.setLayoutProperty('oh-mw-' + value.id, 'visibility',visibility)

        }
      })
    }
  },
  mounted() {

    if (window.innerWidth > 480) {
      this.menuContentSize.height = '600px'
    } else {
      this.menuContentSize.height = 'auto'
    }

    // ----------------------------------------------------------------------------------------------------------------
    this.layers = Layers.layers[this.mapName];
    // ----------------------------------------------------

    if (window.innerWidth > 480) {

      const handle = document.getElementById('center-div-' + this.mapName);
      const topDiv = document.getElementById('first-div-' + this.mapName);
      // const bottomDiv = document.getElementById('second-div-' + this.mapName);
      const container = document.getElementById('container-div-' + this.mapName);

      let isDragging = false;

      // マウスおよびタッチイベントの開始
      const startDrag = () => {
        isDragging = true;
      };

      const endDrag = () => {
        if (isDragging) {
          isDragging = false;
        }
      };

      // マウスおよびタッチイベントの動作
      const dragMove = (clientY) => {
        if (!isDragging) return;
        const containerRect = container.getBoundingClientRect();
        const topHeight = clientY - containerRect.top;
        const bottomHeight = containerRect.height - topHeight - handle.offsetHeight;
        if (topHeight > 0 && bottomHeight > 0) {
          topDiv.style.height = `${topHeight - 8}px`
          this.s_secondDivStyle.height = `${bottomHeight - 8}px`
        }
      };

      // マウスイベントのリスナー
      handle.addEventListener('mousedown', startDrag);
      document.addEventListener('mouseup', endDrag);
      document.addEventListener('mousemove', (e) => dragMove(e.clientY));

      // タッチイベントのリスナー
      handle.addEventListener('touchstart', startDrag);
      document.addEventListener('touchend', endDrag);
      document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          dragMove(e.touches[0].clientY);
        }
      });
    }

  },
  watch: {
    s_lngRange: {
      handler: function(){
        if (this.s_selectedLayers.map01.find(v => v.id === 'oh-mw5') || this.s_selectedLayers.map02.find(v => v.id === 'oh-mw5')) {
          this.addLayers()
        }
      },
      deep: true
    },
    s_watchFlg: {
      handler: function(){
        // alert("333333333")
      },
      deep: true
    },
    s_selectedLayers: {
      handler: function(val){
        console.log('変更を検出しました',this.$store.state.watchFlg,val)
        // ------------------------------------------------------------------
        const map01 = this.$store.state.map01
        const bounds = map01.getBounds()
        // 南西端と北東端の座標を取得
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        this.$store.state.lngRange = [sw.lng,ne.lng]
        this.$store.state.latRange = [sw.lat,ne.lat]
        // ------------------------------------------------------------------
        this.addLayers()
        // 突貫で修正。ここを改修する必要あり。
        // setTimeout(() => {
        //   this.$store.state.watchFlg = true
        //   this.isDragging = true
        // },2000)
      },
      deep: true
    },
  },
}
</script>
<style scoped>
.first-div {
  height: 200px;
  min-width: 300px;
  background-color:gray;
  border: #000 1px solid;
  overflow: auto;
  margin-bottom: 5px;
}
.center-div {
  height: 8px;
  background-color:rgba(0,60,136,0.5);
  cursor: grab;
}
.second-div {
  /*min-height: 200px;*/
  background-color: white;
}
.drag-item {
  position:relative;
  height:40px;
  font-size:larger;
  color:white;
  background-color: rgba(157,157,193,1);
  border-bottom: #fff 1px solid;
}
.trash-div{
  font-size: x-large;
  position: absolute;
  top:9px;
  right:10px;
  width:15px;
  color:rgba(0,60,136,0.5);
  cursor: pointer;
}
.hover:hover{
  color: blue;
}
.range-div {
  position:absolute;
  top:10px;
  left:80px;
  width:calc(100% - 80px);
}
.range{
  width:calc(100% - 40px);
}
.handle-div {
  width:30px;
  height:100%;
  background-color:rgba(0,60,136,0.5);
  font-size: x-large;
  padding-left: 6px;
  padding-top: 6px;
  cursor: grab;
}
.label-div{
  position:absolute;
  top:0;
  left:80px;
  width:calc(100% - 80px);
  padding-left: 5px;
}
.visible-layer-div {
  position:absolute;
  top:0;
  left:30px;
  padding-left: 5px;
}
.info-div{
  position:absolute;
  top:0;
  left:55px;
  padding-left: 5px;
}
.v-icon:hover {
  color: blue;
  transition: transform 0.3s ease;
  transform: rotate(360deg);
}
</style>

<style>
.tree-row-item {
  font-size:medium;
  color:dimgray;
}
.tree-list, .tree-row {
  gap:0!important;
}
/*スライダー*/
input[type=range] {
  height: 26px;
  -webkit-appearance: none;
  margin: 0 0;/*修正*/
  width: 100%;
  background-color: rgba(0,0,0,0);/*修正*/
}
input[type=range]:focus {
  outline: none;
}
input[type=range]::-webkit-slider-runnable-track {
  width: 100%;
  height: 5px;
  cursor: pointer;
  animate: 0.2s;
  box-shadow: 0 0 0 #000000;
  background: #B6B6B6;
  border-radius: 6px;
  border: 1px solid #8A8A8A;
}
input[type=range]::-webkit-slider-thumb {
  box-shadow: 1px 1px 1px #828282;
  border: 1px solid #8A8A8A;
  height: 18px;
  width: 18px;
  border-radius: 18px;
  background: #DADADA;
  cursor: grab;
  -webkit-appearance: none;
  margin-top: -7.5px;
}
@media screen and (max-width:480px) {
  input[type=range]::-webkit-slider-thumb {
    height: 23px;
    width: 30px;
    border-radius: 0;
    margin-top: -12.5px;
  }
  .vue-slider-dot-handle{
    width: 150%!important;
    border-radius:0!important;
  }
}
input[type=range]:focus::-webkit-slider-runnable-track {
  background: #B6B6B6;
}
input[type=range]::-moz-range-track {
  width: 100%;
  height: 5px;
  cursor: pointer;
  animate: 0.2s;
  box-shadow: 0 0 0 #000000;
  background: #B6B6B6;
  border-radius: 6px;
  border: 1px solid #8A8A8A;
}
input[type=range]::-moz-range-thumb {
  box-shadow: 1px 1px 1px #828282;
  border: 1px solid #8A8A8A;
  height: 18px;
  width: 18px;
  border-radius: 18px;
  background: #DADADA;
  cursor: grab;
}
input[type=range]::-ms-track {
  width: 100%;
  height: 5px;
  cursor: pointer;
  animate: 0.2s;
  background: transparent;
  border-color: transparent;
  color: transparent;
}
input[type=range]::-ms-fill-lower {
  background: #B6B6B6;
  border: 1px solid #8A8A8A;
  border-radius: 12px;
  box-shadow: 0 0 0 #000000;
}
input[type=range]::-ms-fill-upper {
  background: #B6B6B6;
  border: 1px solid #8A8A8A;
  border-radius: 12px;
  box-shadow: 0 0 0 #000000;
}
input[type=range]::-ms-thumb {
  margin-top: 1px;
  box-shadow: 1px 1px 1px #828282;
  border: 1px solid #8A8A8A;
  height: 18px;
  width: 18px;
  border-radius: 18px;
  background: #DADADA;
  cursor: grab;
}
input[type=range]:focus::-ms-fill-lower {
  background: #B6B6B6;
}
input[type=range]:focus::-ms-fill-upper {
  background: #B6B6B6;
}
/*スライダーここまで*/

/* スマホ用のスタイル */
/*@media screen and (max-width: 768px) {*/
/*  .container-div {*/
/*    height: 100px;*/
/*  }*/
/*}*/


</style>

