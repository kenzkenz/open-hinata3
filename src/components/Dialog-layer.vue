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
              <div class="info-div" @click="infoOpen(element,true, true)">
                <v-icon v-if="element.ext">mdi-cog</v-icon>
                <v-icon v-if="!element.ext">mdi-information</v-icon>
              </div>
<!--              <div class="label-div">{{element.label}}</div>-->
              <div class="label-div" v-html="element.label" />
<!--              <pre>{{ element.label }}</pre>-->
              <div class="range-div">
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
<!--        <Tree-->
<!--            :nodes="layers"-->
<!--            :search-text="searchText"-->
<!--            :use-checkbox="false"-->
<!--            :use-icon="true"-->
<!--            @nodeClick="onNodeClick"-->
<!--        />-->
        <Tree
            :nodes="layers"
            :search-text="searchText"
            :use-checkbox="false"
            :use-icon="true"
            @nodeClick="onNodeClick"
        >
          <!-- カスタム描画 -->
          <template #tree-node="{ node }">
            <div v-html="node.label"></div>
<!--            <pre style="display:none">{{ console.log('ラベル内容:', node.label) }}</pre>-->
          </template>
        </Tree>
      </div>
    </div>
  </Dialog>
</template>

<script>

import {escapeHTML, generateSegmentLabelGeoJSON, generateStartEndPointsFromGeoJSON} from "@/js/pyramid";

const registeredLayers = new Set()

import {
  addImageLayer,
  addImageLayerJpg,
  addImageLayerPng,
  addTileLayer,
  geojsonAddLayer,
  highlightSpecificFeatures,
  highlightSpecificFeatures2025,
  highlightSpecificFeaturesCity,
  LngLatToAddress,
  simaToGeoJSON,
  updateMeasureUnit,
  dxfToGeoJSON,
  userPmtileSet,
  highlightSpecificFeaturesSima,
  getNextZIndex,
  forseMoveLayer
} from "@/js/downLoad";
import * as Layers from '@/js/layers'
// import Tree from "vue3-tree"
import Tree from '@/components/custom-tree/Tree.vue'
// import "vue3-tree/dist/style.css"
import '@/components/custom-tree/tree-style.css'
import draggable from "vuedraggable"
import mw5 from '@/js/mw5'
import * as turf from '@turf/turf'
import {gpx, kml} from "@tmcw/togeojson";
import DxfParser from 'dxf-parser'
import {
  arrowsEndpointLabelLayer,
  arrowsEndpointLayer,
  clickCircleKeikoLineLayer,
  clickCircleLabelLayer,
  clickCircleLayer,
  clickCircleLineLayer,
  clickCirclePolygonLineLayer,
  clickCircleSource, clickCircPolygonSymbolAreaLayer,
  clickCircPolygonSymbolLayer,
  clickCircSymbolLayer,
  clickPointLayer,
  clickPointSource, dragHandleslayer, dragHandlesSource, elevationLayer, elevationSource,
  endPointSouce, freehandPreviewLayer, freehandPreviewSource,
  guideLineLayer,
  guideLineSource, guideLineVertexLayer,
  midpointLayer,
  midpointSource, segmentLabeleLayer, segmentLabelSource,
  vertexLayer,
  vertexSource,
  zenkokuChibanzuAddLayer
} from "@/js/layers";
import JSZip from "jszip";
import store from "@/store";
import {mapState} from "vuex";
import axios from "axios"


let infoCount = 0

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
    ...mapState([

    ]),
    filteredSelectedLayers() {
      return this.s_selectedLayers.map01.map(layer => ({
        id: layer.id, // 監視対象のプロパティ
        label: layer.label, // 監視対象のプロパティ
        opacity: layer.opacity,
        visibility: layer.visibility
      }));
    },
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
    infoOpen (element,isNew,isBlock) {
      // this.$store.commit('incrDialogMaxZindex')
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
      let display
      if (isBlock) {
        display = 'block'
      } else {
        display = 'none'
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
                width: 'auto',
                // display: 'block',
                display: display,
                top: top,
                left: left,
                'z-index': getNextZIndex()
              }
            }
        this.$store.commit('pushDialogsInfo', {mapName: this.mapName, dialog: infoDialog})
        const dialogDivs = document.querySelectorAll(".dialog-info-div")
        console.log(dialogDivs.length)

      } else {
        if (isNew) {
          result.style.display = 'block'
          result.style["z-index"] = getNextZIndex()
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
            if (layer0.metadata && (layer0.metadata.group === 'osm-bright' || layer0.metadata.group === 'osm-3d')) {
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
      // // なぜか一度ズームしないと最適化ベクタータイルが反映しない。
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
      console.log(this.s_selectedLayers[this.mapName])
      this.s_selectedLayers[this.mapName] = this.s_selectedLayers[this.mapName].filter(layer => layer.id !== id)
      console.log(this.s_selectedLayers[this.mapName])
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
          if (!this.s_selectedLayers[this.mapName]?.some(layer => layer.id === 'oh-amx-a-fude' || layer.id === 'oh-homusyo-2025-layer')) {
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
    async addLayers() {
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

      console.log('selectedLayers',this.s_selectedLayers)

      function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      }

      for (let i = this.s_selectedLayers[this.mapName].length - 1; i >= 0 ; i--){
        const layer = this.s_selectedLayers[this.mapName][i]
        if (layer.layers) {
          if (layer.sources) {
            layer.sources.forEach(source => {
              if (!map.getSource(source.id)) map.addSource(source.id, source.obj)
            })
          }
          if (layer.source) {
            if (isObject(layer.source)) {
              if (!map.getSource(layer.source.id)) {
                map.addSource(layer.source.id, layer.source.obj)
              }
            } else {
              if (!map.getSource(layer.source.id)) {
                const source = this.$store.state.geojsonSources.find(source => {
                  // alert(source.sourceId + '//////' + layer.source)
                  return source.sourceId === layer.source
                })
                if (source) {
                  if (!map.getSource(source.sourceId)) {
                    map.addSource(source.sourceId, source.source.obj)
                  }
                }
              }
            }
          }

          let flyFlg = true
          layer.layers.forEach(layer0 => {
            if (layer0.id === 'oh-mw-dummy') {
              this.mw5AddLayers(map,this.mapName)
            } else {
              if (!map.getLayer(layer0.id)) {
                map.addLayer(layer0)

                if (layer0.id.includes('oh-pmtiles-') && layer0.id.endsWith('-point-layer')) {
                  console.log(layer0.id)
                  const id = layer0.id.split('-')[2]
                  console.log('99999', id)

                axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtiles0SelectById.php', {
                  params: { id: id }
                }).then(function (response) {
                  const labelLaiyrId = `oh-pmtiles-${id}-label-layer`
                  const polygonLaiyrId = `oh-pmtiles-${id}-layer`
                  const vertexLaiyrId = `oh-pmtiles-${id}-vertex-layer`
                  const polygonLineLaiyrId = `oh-pmtiles-${id}-line-layer`

                  console.log(JSON.parse(response.data[0].style))
                  if (JSON.parse(response.data[0].style)) {
                    const circle = JSON.parse(response.data[0].style).circle
                    const symbol = JSON.parse(response.data[0].style).symbol
                    const polygon = JSON.parse(response.data[0].style).polygon

                    Object.entries(circle).forEach(([prop, val]) => {
                      if (val) {
                        console.log(prop,val)
                        map.setPaintProperty(layer0.id, prop, val)
                      }
                    })
                    if (symbol) {
                      map.setLayoutProperty(
                          labelLaiyrId,
                          'text-field',
                          ['get', symbol['text-field']]
                      )
                      map.setLayoutProperty(
                          labelLaiyrId,
                          'text-size',
                          symbol['text-size']
                      )
                      map.setPaintProperty(
                          labelLaiyrId,
                          'text-color',
                          symbol['text-color']
                      )
                    }
                    if (polygon) {
                      map.setPaintProperty(
                          polygonLaiyrId,
                          'fill-color',
                          polygon['fill-color']
                      )
                      map.setPaintProperty(
                          polygonLineLaiyrId,
                          'line-color',
                          polygon['line-color']
                      )
                      map.setPaintProperty(
                          polygonLineLaiyrId,
                          'line-width',
                          polygon['line-width']
                      )
                      // alert(polygon['circle-radius'])
                      // if (map.getLayer('vertexLaiyrId')) {
                      //   map.setPaintProperty(
                      //       vertexLaiyrId,
                      //       'circle-radius', [
                      //         'interpolate',
                      //         ['linear'],
                      //         ['zoom'],
                      //         15, 0,
                      //         18, polygon['circle-radius']
                      //       ]);
                      //   map.setPaintProperty(
                      //       vertexLaiyrId,
                      //       'circle-color',
                      //       polygon['circle-color']
                      //   )
                      // }
                    }
                  }
                })

                }
// console.log(layer0)
                if (layer0.position) {
                  if (flyFlg && this.nodeClicked) {
                    setTimeout(() => {
                      map.flyTo({
                        center: Array.from(layer0.position), // フライ先の座標（経度, 緯度）
                        zoom: layer0.z ? layer0.z : this.flyZoom,                   // ズームレベル（任意）
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

                if (layer0.id !== 'oh-homusyo-2025-polygon') {
                  if ((layer0.metadata && layer0.metadata.group === 'osm-bright') || (layer0.metadata && layer0.metadata.group === 'osm-3d')) {
                    if (typeof layer0.paint['fill-opacity'] === 'number') {
                      map.setPaintProperty(layer0.id, 'fill-opacity', layer0.paint['fill-opacity'] * opacity)
                    } else {
                      map.setPaintProperty(layer0.id, 'fill-opacity', opacity)
                    }
                  } else {
                    map.setPaintProperty(layer0.id, 'fill-opacity', opacity)
                  }
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
                  console.log(this.counter, layer.ext.values)
                  layer.ext.values.forEach((v,i) => {

                    // if (i === 1) {
                    //   alert(layer.id + '///' + String(v))
                    // }

                    this.$store.commit('updateParam', {
                      name: layer.ext.name,
                      mapName: this.mapName,
                      value: String(v),
                      order: i
                    })
                  })
                }


              if (this.counter <= 1) {
                if (this.$store.state.isWindow2) {
                  this.infoOpen(layer, false, true)
                } else {
                  this.infoOpen(layer, false, false)
                }
              } else {
                this.infoOpen(layer, false, true)
              }
              this.$store.state.extFire = !this.$store.state.extFire
            }
          }
          // -------------------------------------------------
          if (layer.info) this.infoOpen(layer,false, true)
          // -------------------------------------------------
        }
        if (this.counter === 0) zenkokuChibanzuAddLayer(map,map.getZoom())
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
          console.log(this.$store.state.dxfText)
          this.$store.state.zahyokei = this.$store.state.dxfText.zahyokei
          const dxf = parser.parseSync(this.$store.state.dxfText.text);
          const geojson = dxfToGeoJSON(dxf)
          geojsonAddLayer (map, geojson, false, 'dxf')
        }
        if (this.$store.state.gpxText) {
          const parser = new DOMParser();
          const gpxDoc = parser.parseFromString(this.$store.state.gpxText, 'application/xml');
          const geojson = gpx(gpxDoc);
          geojsonAddLayer (map, geojson, false, 'gpx')
        }
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

      if (this.counter === 1) {
        if (this.$store.state.uploadedVector) {
          if (JSON.parse(this.$store.state.uploadedVector).uid) {
            const vectorUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/uploads/' + JSON.parse(this.$store.state.uploadedVector).uid + '/' + JSON.parse(this.$store.state.uploadedVector).image
            const extension = vectorUrl.split('.').pop();
            switch (extension) {
              case 'kmz':
                Promise.all([fetchFile(vectorUrl)]).then(files => {
                  async function load () {
                    const zip = await JSZip.loadAsync(files[0]);
                    const kmlFile = Object.keys(zip.files).find((name) => name.endsWith('.kml'));
                    const kmlText = await zip.files[kmlFile].async('text');
                    const parser = new DOMParser();
                    const kmlData = parser.parseFromString(kmlText, 'application/xml');
                    const geojson = kml(kmlData);
                    geojsonAddLayer(map, geojson, false, 'kml')
                  }
                  load()
                })
                break
            }
          }
        }

        if (this.$store.state.uploadedImage) {
          if (map.getLayer('oh-geotiff-layer')) {
            map.removeLayer('oh-geotiff-layer')
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

          if (JSON.parse(this.$store.state.uploadedImage).tile) {
            addTileLayer (map)
          }

          if (JSON.parse(this.$store.state.uploadedImage).uid) {
            const imageUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/uploads/' + JSON.parse(this.$store.state.uploadedImage).uid + '/' + JSON.parse(this.$store.state.uploadedImage).image
            const worldFileUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/uploads/' + JSON.parse(this.$store.state.uploadedImage).uid + '/' + JSON.parse(this.$store.state.uploadedImage).worldFile
            const extension = imageUrl.split('.').pop();
            switch (extension) {
              case 'tif':
                if (worldFileUrl) {
                  Promise.all([fetchFile(imageUrl), fetchFile(worldFileUrl)]).then(files => {
                    const image = files[0]
                    const worldFile = files[1]
                    const code = JSON.parse(this.$store.state.uploadedImage).code
                    addImageLayer(image, worldFile, code, false)
                  })
                } else {
                  Promise.all([fetchFile(imageUrl)]).then(files => {
                    const image = files[0]
                    const code = JSON.parse(this.$store.state.uploadedImage).code
                    addImageLayer(image, null, code, false)
                  })
                }
                break
              case 'jpg':
                Promise.all([fetchFile(imageUrl), fetchFile(worldFileUrl)]).then(files => {
                  const image = files[0]
                  const worldFile = files[1]
                  const code = JSON.parse(this.$store.state.uploadedImage).code
                  addImageLayerJpg(image, worldFile, code, false)
                })
                break
              case 'png':
                Promise.all([fetchFile(imageUrl), fetchFile(worldFileUrl)]).then(files => {
                  const image = files[0]
                  const worldFile = files[1]
                  const code = JSON.parse(this.$store.state.uploadedImage).code
                  addImageLayerPng(image, worldFile, code, false)
                })
                break
            }

          } else {

            if (JSON.parse(this.$store.state.uploadedImage).worldFile) {
              if (JSON.parse(this.$store.state.uploadedImage).worldFile.split('.')[1] === 'tfw' ) {
                const imageUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).image
                const worldFileUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).worldFile
                const jpgUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).jpg

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
                  // if (exists) {
                  //   console.log('jpg画像が存在します。');
                  //   Promise.all([fetchFile(jpgUrl), fetchFile(worldFileUrl)]).then(files => {
                  //     if (files.every(file => file)) {
                  //       console.log("両方のファイルが取得されました:", files);
                  //       const image = files[0]
                  //       const worldFile = files[1]
                  //       const code = JSON.parse(this.$store.state.uploadedImage).code
                  //       addImageLayerJpg(image, worldFile, code, false)
                  //     } else {
                  //       console.warn("一部のファイルが取得できませんでした。");
                  //     }
                  //   }).catch(error => {
                  //     console.error("Promise.allでエラーが発生しました:", error);
                  //   });
                  // } else {
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
                  // }
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
              } else if (JSON.parse(this.$store.state.uploadedImage).worldFile.split('.')[1] === 'pgw' ) {
                const imageUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).image
                const worldFileUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).worldFile
                Promise.all([fetchFile(imageUrl), fetchFile(worldFileUrl)]).then(files => {
                  if (files.every(file => file)) {
                    console.log("両方のファイルが取得されました:", files);
                    const image = files[0]
                    const worldFile = files[1]
                    const code = JSON.parse(this.$store.state.uploadedImage).code
                    addImageLayerPng(image, worldFile, code, false)
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
      if (map.getLayer('oh-chibanzu-姫路市')) highlightSpecificFeaturesCity(map, 'oh-chibanzu-姫路市');
      this.counter++

      if (map.getSource('click-points-source')) {
        map.removeLayer('click-points-layer')
        map.removeSource('click-points-source')
      }

      if (this.$store.state.clickGeojsonText) {
        clickPointSource.obj.data = JSON.parse(this.$store.state.clickGeojsonText)
      }

      map.addSource('click-points-source', clickPointSource.obj)
      map.addLayer(clickPointLayer)
      if (this.$store.state.isClickPointsLayer) {
        map.setLayoutProperty("click-points-layer", "visibility", 'visible');
      } else {
        map.setLayoutProperty("click-points-layer", "visibility", 'none');
      }

      const fileExtension = 'kml'
      if (map.getLayer(fileExtension + '-layer')) {
        map.moveLayer(fileExtension + '-polygon-layer')
        map.moveLayer(fileExtension + '-layer')
        map.moveLayer(fileExtension + '-line-layer')
        map.moveLayer(fileExtension + '-point-layer')
        // map.moveLayer(fileExtension + '-polygon-points')
      }
      // ---------------------------------------------------------------------------------
      if (this.$store.state.clickCircleGeojsonText) {
        try {
          clickCircleSource.obj.data = JSON.parse(this.$store.state.clickCircleGeojsonText)
        }catch (e) {
          console.log(e)
        }
      }

      if (map.getSource('click-circle-source')) {
        map.removeLayer('click-circle-layer')
        map.removeLayer('click-circle-polygon-line-layer')
        map.removeLayer('click-circle-polygon-symbol-layer')
        map.removeLayer('click-circle-polygon-symbol-area-layer')
        map.removeLayer('click-circle-symbol-layer')
        map.removeLayer('click-circle-line-layer')
        map.removeLayer('click-circle-keiko-line-layer')
        map.removeLayer('click-circle-label-layer')
        map.removeSource('click-circle-source')
        map.removeLayer('arrows-endpoint-label-layer')
        map.removeLayer('arrows-endpoint-layer')
        map.removeSource('end-point-source')
        map.removeLayer('guide-line-layer')
        map.removeLayer('guide-line-vertex-layer')
        map.removeSource('guide-line-source')
        map.removeLayer('vertex-layer')
        map.removeSource('vertex-source')
        map.removeLayer('midpoint-layer')
        map.removeSource('midpoint-source')
        map.removeLayer('segment-label-layer')
        map.removeSource('segment-label-source')
        map.removeLayer('freehand-preview-layer')
        map.removeSource('freehand-preview-source')
        map.removeLayer('elevation-layer')
        map.removeSource('elevation-source')
        map.removeLayer('drag-handles-layer')
        map.removeSource('drag-handles-source')
      }
      map.addSource('end-point-source', endPointSouce.obj)
      map.addLayer(arrowsEndpointLayer)
      map.addLayer(arrowsEndpointLabelLayer)
      map.addSource('click-circle-source', clickCircleSource.obj)
      // map.removeLayer('click-circle-layer')// 逃げ
      map.addLayer(clickCircleLayer)
      map.addLayer(clickCirclePolygonLineLayer)
      map.addLayer(clickCircPolygonSymbolLayer)
      map.addLayer(clickCircPolygonSymbolAreaLayer)
      map.addLayer(clickCircSymbolLayer)
      map.addLayer(clickCircleLineLayer)
      map.addLayer(clickCircleKeikoLineLayer)
      map.setPaintProperty(clickCircleKeikoLineLayer.id, 'line-opacity', 0.3)

      map.addLayer(clickCircleLabelLayer)

      map.addSource('guide-line-source', guideLineSource.obj)
      map.addLayer(guideLineLayer)
      map.addLayer(guideLineVertexLayer)
      map.addSource('vertex-source', vertexSource.obj)
      map.addLayer(vertexLayer)
      map.addSource('midpoint-source', midpointSource.obj)
      map.addLayer(midpointLayer)
      map.addSource('segment-label-source', segmentLabelSource.obj)
      map.addLayer(segmentLabeleLayer)
      map.addSource('freehand-preview-source', freehandPreviewSource.obj)
      map.addLayer(freehandPreviewLayer)
      map.addSource('elevation-source', elevationSource.obj)
      map.addLayer(elevationLayer)
      map.addSource('drag-handles-source', dragHandlesSource.obj)
      map.addLayer(dragHandleslayer)
      //↓なぜかこうしないとレイヤー順が正しくならない。
      map.moveLayer('click-circle-polygon-line-layer');
      map.moveLayer('click-circle-label-layer');
      // map.moveLayer('clickCircleKeikoLineLayer.id');

      this.$store.state.drawFire = !this.$store.state.drawFire

      if (this.$store.state.clickCircleGeojsonText) {
        try {
          const geojson = JSON.parse(this.$store.state.clickCircleGeojsonText)
          generateSegmentLabelGeoJSON(geojson)
          generateStartEndPointsFromGeoJSON(geojson)
        }catch (e) {
          console.log(e)
        }
      }

      if (map === this.$store.state.map01) {
        setTimeout(() => {
          const targetLayers = this.$store.state.map01.getStyle().layers
              .filter(layer => layer.id.startsWith('oh-chiban-') && !registeredLayers.has(layer.id))
              .map(layer => layer.id);
          targetLayers.forEach(layer => {
            registeredLayers.add(layer)
            this.$store.state.map01.on('click', layer, (e) => {
              if (this.$store.state.isDraw) return
              // まずoh-plateau-tokyo23ku-layerの地物があったらreturn
              const map = this.$store.state.map01;
              const featuresOnPlateau = map.queryRenderedFeatures(e.point, { layers: ['oh-plateau-tokyo23ku-layer'] });
              if (featuresOnPlateau && featuresOnPlateau.length > 0) {
                return;
              }
              if (e.features && e.features.length > 0) {
                // 最小面積のポリゴンを選ぶ
                let smallestFeature = e.features[0];
                let minArea = turf.area(e.features[0]);
                for (let feature of e.features) {
                  const area = turf.area(feature);
                  if (area < minArea) {
                    smallestFeature = feature;
                    minArea = area;
                  }
                }
                const targetId = `${smallestFeature.properties['oh3id']}`;
                if (this.$store.state.highlightedChibans.has(targetId)) {
                  this.$store.state.highlightedChibans.delete(targetId);
                  store.commit('setRightDrawer', false);
                } else {
                  this.$store.state.highlightedChibans.add(targetId);
                  const lngLat = e.lngLat;
                  store.state.popupFeatureProperties = smallestFeature.properties;
                  store.state.popupFeatureCoordinates = [lngLat.lng, lngLat.lat];
                  (async () => {
                    const address = await LngLatToAddress(lngLat.lng, lngLat.lat);
                    store.state.rightDrawerTitle = address;
                  })();
                  store.commit('setChibanzuDrawer', false);
                  store.commit('setRightDrawer', true);
                }
                highlightSpecificFeaturesCity(map, layer);
              }
            });
          });
        },0)
      }

      if (map === this.$store.state.map01) {
        setTimeout(() => {
          const targetLayers = this.$store.state.map01.getStyle().layers
              .filter(layer => layer.id.startsWith('oh-sima-') && !layer.id.endsWith('-polygon-label-layer') && !registeredLayers.has(layer.id))
              .map(layer => layer.id);
          targetLayers.forEach(layer => {
            registeredLayers.add(layer)
            this.$store.state.map01.on('click', layer, (e) => {
              console.log(layer)
              if (e.features && e.features.length > 0) {
                // 最小面積のポリゴンを選ぶ
                let smallestFeature = e.features[0];
                let minArea = turf.area(e.features[0]);
                for (let feature of e.features) {
                  const area = turf.area(feature);
                  if (area < minArea) {
                    smallestFeature = feature;
                    minArea = area;
                  }
                }
                const targetId = `${smallestFeature.properties['id']}`;
                if (this.$store.state.highlightedSimas.has(targetId)) {
                  this.$store.state.highlightedSimas.delete(targetId);
                  store.commit('setRightDrawer', false);
                } else {
                  this.$store.state.highlightedSimas.add(targetId);
                }
                highlightSpecificFeaturesSima(map, layer);
              }
            });
          });
        },0)
      }

      this.$store.state.map01.getStyle().layers.forEach(layer => {
        if (layer.id.includes('-sima-')) {
          highlightSpecificFeaturesSima(map,layer.id)
          // if (this.$store.state.simaTextForUser) {
          //   this.$store.state.map01.setPaintProperty(layer.id, 'fill-opacity', JSON.parse(this.$store.state.simaTextForUser).opacity)
          // } else {
          //   this.$store.state.map01.setPaintProperty(layer.id, 'fill-opacity', 0)
          // }
        }
        if (layer.id.includes('oh-chiban-') || layer.id.includes('oh-chibanzu-')) {
          try {
            highlightSpecificFeaturesCity(map,layer.id)
          }catch (e) {
            console.log(e)
          }
        }
      })

      if (map.getLayer('td-linestring')) {
        map.moveLayer( 'td-linestring')
        map.moveLayer( 'td-polygon')
        map.moveLayer( 'td-polygon-outline')
        map.moveLayer( 'td-point')
        map.moveLayer( 'terradraw-measure-polygon-label')
        map.moveLayer( 'terradraw-measure-line-label')
        map.moveLayer( 'terradraw-measure-line-node')
        updateMeasureUnit('m')
      }
      highlightSpecificFeatures2025(map,'oh-homusyo-2025-polygon');
      // zenkokuChibanzuAddLayer(map,map.getZoom())
      forseMoveLayer(map)
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

    document.querySelector('#drag-handle-layerDialog-map01').innerHTML = '<span style="font-size: large;">レイヤー</span>'
    document.querySelector('#drag-handle-layerDialog-map02').innerHTML = '<span style="font-size: large;">レイヤー</span>'

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

    // filteredSelectedLayers: {
    //   handler: function (val) {
    //     console.log('変更を検出しました。Dialog-layer.vue', this.$store.state.watchFlg, val);
    //     try {
    //       const map01 = this.$store.state.map01;
    //       const bounds = map01.getBounds();
    //       const sw = bounds.getSouthWest();
    //       const ne = bounds.getNorthEast();
    //       this.$store.state.lngRange = [sw.lng, ne.lng];
    //       this.$store.state.latRange = [sw.lat, ne.lat];
    //
    //       this.addLayers();
    //     } catch (e) {
    //       console.log(e)
    //     }
    //
    //   },
    //   deep: false, // computed の結果なので deep: true は不要
    //   immediate: true
    // },
    //
    s_selectedLayers: {
      handler: function(val){
        // console.log('変更を検出しました',this.$store.state.watchFlg,val)
        // ------------------------------------------------------------------
        const map01 = this.$store.state.map01
        if (!map01) return  // ← これを追加
        const bounds = map01.getBounds()
        // 南西端と北東端の座標を取得
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        this.$store.state.lngRange = [sw.lng,ne.lng]
        this.$store.state.latRange = [sw.lat,ne.lat]
        // ------------------------------------------------------------------
        // map01.on('load', () => {
          // 矢印画像をロード
          // map01.loadImage('https://maplibre.org/maplibre-gl-js/docs/assets/custom_marker.png', (error, image) => {
          //   // if (error) throw error;
          //   map01.addImage('arrow', image);
          //   this.addLayers()
          //   alert(9)
          //
          // })
        // })
        // console.log(this.$store.state.clickCircleGeojsonText)
        // console.log(JSON.parse(this.$store.state.clickCircleGeojsonText))

        this.addLayers()
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
  /*background-color:rgba(0,60,136,0.5);*/
  background-color:var(--main-color);
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
  /*background-color: rgba(132,163,213,1);*/
  /*background-color:var(--main-color);*/
  /*background-color: color-mix(in srgb, var(--main-color) 60%, white);*/
  background-color: color-mix(in srgb, var(--main-color) 70%, black)!important;
  border-bottom: #fff 1px solid;

  /*color:gray;*/
  /*background-color: #ffcbef;*/
  border-bottom: #000 1px solid;
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
  background-color:var(--main-color);
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

  /*color:gray;!**!*/
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
@media screen and (max-width:500px) {
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

/*スマホ用のスタイル*/
@media screen and (max-width: 500px) {
  .drag-item {
    height: 50px!important;
    font-size: 16px!important;

  }
  .tree-row-item {
    font-size: large!important;
  }
}
</style>

