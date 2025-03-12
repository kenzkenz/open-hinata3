<script setup>
import { user as user1 } from "@/authState"; // グローバルの認証情報を取得
</script>

<template>
  <v-app>
    <v-main>

      <v-snackbar v-model="loadingSnackbar"
                  :timeout="-1"
                  color="primary">
        <p v-if="s_loading">処理中です。</p>
        <p v-if="s_loading2">{{s_loadingMessage}}</p>
      </v-snackbar>

      <v-snackbar
          v-model="s_snackbar"
          :timeout="-1"
          color="primary"
          top
          right
      >
        <input type="range" min="0" max="1" step="0.01" class="range" v-model.number="s_simaOpacity" @input="simaOpacityInput"/>
        <v-btn color="pink" text @click="simaDl">SIMAダウンロード</v-btn>
        <v-btn v-if="!user1" style="margin-left: 10px;" color="pink" text @click="simaDelete">削除</v-btn>
        <template v-slot:actions>
          <v-btn color="pink" text @click="simaClose">閉じる</v-btn>
        </template>
      </v-snackbar>

      <v-dialog v-model="dialogForImagePng" max-width="500px">
        <v-card>
          <v-card-title>
            求積表からSIMA作成
          </v-card-title>
          <v-card-text>
            <div v-if="s_isAndroid" class="select-container">
              <select id="selectBox" v-model="s_zahyokei" class="custom-select">
                <option value="" disabled selected>座標を選択してください。</option>
                <option v-for="number in 19" :key="number" :value="`公共座標${number}系`">
                  公共座標{{ number }}系
                </option>
              </select>
<!--              <v-select class="scrollable-content"-->
<!--                        v-model="s_ocrAccuracy"-->
<!--                        :items="[1,2,4]"-->
<!--                        label="OCR精度を選択してください。通常は1です。"-->
<!--                        outlined-->
<!--              ></v-select>-->
            </div>
            <div v-else>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="座標系を選択してください"
                        outlined
              ></v-select>
<!--              <v-select class="scrollable-content"-->
<!--                        v-model="s_ocrAccuracy"-->
<!--                        :items="[1,2,4]"-->
<!--                        label="OCR精度を選択してください。通常は1です。"-->
<!--                        outlined-->
<!--              ></v-select>-->
            </div>
            <v-btn @click="imagePngLoad">png読込開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForImagePng = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialogForShpApp" max-width="500px">
        <v-card>
          <v-card-title>
            地番選択
          </v-card-title>
          <v-card-text>
            <div v-if="s_isAndroid" class="select-container">

            </div>
            <div v-else>
              <v-text-field v-model="s_pmtilesName" type="email" placeholder="地番図名" ></v-text-field>
              <v-select class="scrollable-content"
                        v-model="s_pmtilesPropertieName"
                        :items="shpPropaties"
                        label="地番にあたるフィールドを選択してください"
                        outlined
              ></v-select>
            </div>
            <v-btn @click="shpLoad">読込開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForShpApp = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialogForDxfApp" max-width="500px">
        <v-card>
          <v-card-title>
            座標系選択
          </v-card-title>
          <v-card-text>
            <div v-if="s_isAndroid" class="select-container">
              <select id="selectBox" v-model="s_zahyokei" class="custom-select">
                <option value="" disabled selected>座標を選択してください。</option>
                <option v-for="number in 19" :key="number" :value="`公共座標${number}系`">
                  公共座標{{ number }}系
                </option>
              </select>
            </div>
            <div v-else>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="選択してください"
                        outlined
              ></v-select>
            </div>
            <v-btn @click="dxfLoad">DXF読込開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForDxfApp = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="s_dialogForPngApp" max-width="500px">
        <v-card>
          <v-card-title>
            座標系選択
          </v-card-title>
          <v-card-text>
            <div v-if="s_isAndroid" class="select-container">
              <select id="selectBox" v-model="s_zahyokei" class="custom-select">
                <option value="" disabled selected>座標を選択してください。</option>
                <option v-for="number in 19" :key="number" :value="`公共座標${number}系`">
                  公共座標{{ number }}系
                </option>
              </select>
            </div>
            <div v-else>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="選択してください"
                        outlined
              ></v-select>
            </div>
            <v-btn @click="pngDownload">PNGダウンロード開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="s_dialogForPngApp = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialogForPdfApp" max-width="500px">
        <v-card>
          <v-card-title>
            登記情報提供サービスより取得した公図PDF
          </v-card-title>
          <v-card-text>
            <div v-if="s_isAndroid" class="select-container">
              <select id="selectBox" v-model="s_zahyokei" class="custom-select">
                <option value="" disabled selected>座標を選択してください。</option>
                <option v-for="number in 19" :key="number" :value="`公共座標${number}系`">
                  公共座標{{ number }}系
                </option>
              </select>
            </div>
            <div v-else>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="選択してください"
                        outlined
              ></v-select>
              <v-select class="scrollable-content"
                        v-model="s_resolution"
                        :items="resolutions"
                        label="画像取込最大解像度"
                        outlined
                        v-if="user1"
              ></v-select>

              <v-switch style="height: 40px;margin-bottom: 20px;" v-model="s_isTransparent" label="透過処理" color="primary" />

            </div>
            <v-btn @click="pdfLoad">PDF読込開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForPdfApp = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialogForGeotiffApp1file" max-width="500px">
        <v-card>
          <v-card-title>
            画像取込最大解像度選択
          </v-card-title>
          <v-card-text>
            <div v-if="s_isAndroid" class="select-container">
              <select id="selectBox" v-model="s_zahyokei" class="custom-select">
                <option value="" disabled selected>座標を選択してください。</option>
                <option v-for="item in items" :key="item" :value="item">
                  {{item}}
                </option>
              </select>
            </div>
            <div v-else>
              <v-select class="scrollable-content"
                        v-model="s_resolution"
                        :items="resolutions"
                        label="画像取込最大解像度"
                        outlined
                        v-if="user1"
              ></v-select>
            </div>
            <v-btn @click="geoTifLoad1file">geotif読込開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForGeotiffApp1file = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="s_dialogForGeotiffApp" max-width="500px">
        <v-card>
          <v-card-title>
            座標系選択
          </v-card-title>
          <v-card-text>
            <div v-if="s_isAndroid" class="select-container">
              <select id="selectBox" v-model="s_zahyokei" class="custom-select">
                <option value="" disabled selected>座標を選択してください。</option>
                <option v-for="number in 19" :key="number" :value="`公共座標${number}系`">
                  公共座標{{ number }}系
                </option>
              </select>
            </div>
            <div v-else>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="選択してください"
                        outlined
              ></v-select>
              <v-select class="scrollable-content"
                        v-model="s_resolution"
                        :items="resolutions"
                        label="画像取込最大解像度"
                        outlined
                        v-if="user1"
              ></v-select>
            </div>
            <v-btn @click="geoTiffLoad0">geotiff読込開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="s_dialogForGeotiffApp = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="s_dialogForGeotiff2App" max-width="500px">
        <v-card>
          <v-card-title>
            座標系選択
          </v-card-title>
          <v-card-text>
            <div v-if="s_isAndroid" class="select-container">
              <select id="selectBox" v-model="s_zahyokei" class="custom-select">
                <option value="" disabled selected>座標を選択してください。</option>
                <option v-for="item in items" :key="item" :value="item">
                  {{item}}
                </option>
              </select>
            </div>
            <div v-else>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="選択してください"
                        outlined
              ></v-select>
              <v-select class="scrollable-content"
                        v-model="s_resolution"
                        :items="resolutions"
                        label="画像取込最大解像度"
                        outlined
                        v-if="user1"
              ></v-select>
            </div>
            <v-btn @click="geoTiffLoad20">geotiff読込開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="s_dialogForGeotiff2App = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="s_dialogForJpgApp" max-width="500px">
        <v-card>
          <v-card-title>
            座標系選択
          </v-card-title>
          <v-card-text>
            <div v-if="s_isAndroid" class="select-container">
              <select id="selectBox" v-model="s_zahyokei" class="custom-select">
                <option value="" disabled selected>座標を選択してください。</option>
                <option v-for="item in items" :key="item" :value="item">
                  {{item}}
                </option>
              </select>
            </div>
            <div v-else>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="選択してください"
                        outlined
              ></v-select>
              <v-select class="scrollable-content"
                        v-model="s_resolution"
                        :items="resolutions"
                        label="画像取込最大解像度"
                        outlined
                        v-if="user1"
              ></v-select>
            </div>
            <v-btn @click="jpgLoad0">jpg読込開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="s_dialogForJpgApp = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="s_dialogForPng2App" max-width="500px">
        <v-card>
          <v-card-title>
            座標系選択
          </v-card-title>
          <v-card-text>
            <div v-if="s_isAndroid" class="select-container">
              <select id="selectBox" v-model="s_zahyokei" class="custom-select">
                <option value="" disabled selected>座標を選択してください。</option>
                <option v-for="item in items" :key="item" :value="item">
                  {{item}}
                </option>
              </select>
            </div>
            <div v-else>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="選択してください"
                        outlined
              ></v-select>
              <v-select class="scrollable-content"
                        v-model="s_resolution"
                        :items="resolutions"
                        label="画像取込最大解像度"
                        outlined
                        v-if="user1"
              ></v-select>
            </div>
            <v-btn @click="pngLoad0">png読込開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="s_dialogForPng2App = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="s_dialogForSimaApp" max-width="500px">
        <v-card>
          <v-card-title>
            座標系選択
          </v-card-title>
          <v-card-text>
            <div v-if="s_isAndroid" class="select-container">
              <select id="selectBox" v-model="s_zahyokei" class="custom-select">
                <option value="" disabled selected>座標を選択してください。</option>
                <option v-for="number in 19" :key="number" :value="`公共座標${number}系`">
                  公共座標{{ number }}系
                </option>
              </select>
            </div>
            <div v-else>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="選択してください"
                        outlined
              ></v-select>
            </div>
            <v-btn @click="loadSima">SIMA読込開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="s_dialogForSimaApp = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialog" max-width="500px">
        <v-card>
          <v-card-title>
            open-hinata3 利用規約
          </v-card-title>
          <v-card-text>

          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialog = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <div id="map00">

        <img class='loadingImg' src="https://kenzkenz.xsrv.jp/open-hinata3/img/icons/loading2.gif">
        <div v-for="mapName in mapNames" :key="mapName" :id=mapName :style="mapSize[mapName]" v-show="(mapName === 'map01'|| mapName === 'map02' && s_map2Flg)" @click="btnPosition">

          <v-progress-linear  v-if="s_loading" style="z-index: 1" indeterminate color="blue"></v-progress-linear>
          <v-progress-linear  v-if="s_loading2" style="z-index: 1" indeterminate color="blue"></v-progress-linear>

          <div id="pointer1" class="pointer" v-if="mapName === 'map01'"></div>
          <div id="pointer2" class="pointer" v-if="mapName === 'map02'"></div>

          <div class="center-target"></div>
          <!--左上部メニュー-->
          <div id="left-top-div">
            <v-btn :size="isSmall ? 'small' : 'default'" icon @click="btnClickMenu(mapName)" v-if="mapName === 'map01'"><v-icon>mdi-menu</v-icon></v-btn>
            <v-btn :size="isSmall ? 'small' : 'default'" icon style="margin-left:8px;" @click="s_dialogForLogin = !s_dialogForLogin" v-if="mapName === 'map01'"><v-icon>mdi-login</v-icon></v-btn>
            <v-btn :size="isSmall ? 'small' : 'default'" icon style="margin-left:8px;" @click="btnClickSplit" v-if="mapName === 'map01'"><v-icon>mdi-monitor-multiple</v-icon></v-btn>
            <v-btn :size="isSmall ? 'small' : 'default'" v-if="user1 && mapName === 'map01'" icon style="margin-left:8px;" @click="btnClickMyroom (mapName)"><v-icon v-if="user1">mdi-home</v-icon></v-btn>
<!--            <v-btn :size="isSmall ? 'small' : 'default'" v-if="user1 && mapName === 'map01'" icon style="margin-left:8px;" @click="s_dialogForImage = !s_dialogForImage"><v-icon v-if="user1">mdi-image</v-icon></v-btn>-->
            <v-btn :size="isSmall ? 'small' : 'default'" icon style="margin-left:8px;" @click="btnClickLayer(mapName)"><v-icon>mdi-layers</v-icon></v-btn>
          </div>
          <!--右メニュー-->
          <div id="right-top-div">
            <v-btn :size="isSmall ? 'small' : 'default'" icon @click="goToCurrentLocation" v-if="mapName === 'map01'"><v-icon>mdi-crosshairs-gps</v-icon></v-btn>
            <v-btn :size="isSmall ? 'small' : 'default'" class="watch-position" :color="isTracking ? 'green' : undefined" icon @click="toggleWatchPosition" v-if="mapName === 'map01'"><v-icon>mdi-map-marker-radius</v-icon></v-btn>
            <v-btn :size="isSmall ? 'small' : 'default'" class="zoom-in" icon @click="zoomIn" v-if="mapName === 'map01'"><v-icon>mdi-plus</v-icon></v-btn>
            <v-btn :size="isSmall ? 'small' : 'default'" class="zoom-out" icon @click="zoomOut" v-if="mapName === 'map01'"><v-icon>mdi-minus</v-icon></v-btn>
            <v-btn :size="isSmall ? 'small' : 'default'" class="share" icon @click="share(mapName)" v-if="mapName === 'map01'"><v-icon>mdi-share-variant</v-icon></v-btn>
          </div>

          <DialogMenu :mapName=mapName />
          <DialogMyroom :mapName=mapName />
          <DialogLayer :mapName=mapName />
          <dialog-info :mapName=mapName />
          <dialog2 :mapName=mapName />
          <dialogShare :mapName=mapName />

          <div :id="'terrain-btn-div-' + mapName" class="terrain-btn-div">
            <div class="terrain-btn-container">
              <v-icon class="terrain-btn-close" @pointerdown="terrainBtnClos">mdi-close</v-icon>
              <v-btn type="button" class="terrain-btn-up terrain-btn" @pointerdown="upMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-up fa-lg hover'></i></v-btn>
              <v-btn type="button" class="terrain-btn-down terrain-btn" @pointerdown="downMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-down fa-lg'></i></v-btn>
              <v-btn type="button" class="terrain-btn-left terrain-btn" @pointerdown="leftMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-left fa-lg'></i></v-btn>
              <v-btn type="button" class="terrain-btn-right terrain-btn" @pointerdown="rightMousedown(mapName)" @pointerup="mouseup"><i class='fa fa-arrow-right fa-lg'></i></v-btn>
              <v-btn icon type="button" class="terrain-btn-center terrain-btn" @pointerdown="terrainReset(mapName)"><v-icon>mdi-undo</v-icon></v-btn>
            </div>
          </div>
          <div class="terrain-btn-expand-div">
            <v-btn icon type="button" @pointerdown="terrainBtnExpand"><v-icon>mdi-arrow-expand</v-icon></v-btn>
          </div>

          <div class="zoom-div">
            zoom={{zoom.toFixed(2)}} {{elevation}}<br>
            {{address}}
          </div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script>
import {mouseMoveForPopup, popup} from "@/js/popup"
import { CompassControl } from 'maplibre-gl-compass'
import shp from "shpjs"
import JSZip from 'jszip'
import * as turf from '@turf/turf'
import DxfParser from 'dxf-parser'
import proj4 from 'proj4'
import { gpx } from '@tmcw/togeojson'
import { user } from "@/authState"; // グローバルの認証情報を取得
import { MaplibreTerradrawControl,MaplibreMeasureControl } from '@watergis/maplibre-gl-terradraw';
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css'
import {
  csvGenerateForUserPng,
  ddSimaUpload,
  downloadKML,
  downloadSimaText,
  geojsonAddLayer,
  geoTiffLoad,
  geoTiffLoad2,
  getCRS,
  handleFileUpload,
  highlightSpecificFeatures,
  highlightSpecificFeaturesCity,
  jpgLoad,
  kmzLoadForUser, pmtilesGenerateForUser2,
  pngDownload,
  pngLoad,
  simaLoadForUser,
  tileGenerateForUser1file, tileGenerateForUserJpg, tileGenerateForUserPdf, tileGenerateForUserPng,
  tileGenerateForUserTfw,
  transformGeoJSONToEPSG4326, userKmzSet, userSimaSet,
  zahyokei
} from '@/js/downLoad'

function xmlToGeojson(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  const geojson = {
    type: "FeatureCollection",
    features: []
  };

  const namespaceURI = "http://www.moj.go.jp/MINJI/tizuxml";
  const zmnNamespaceURI = "http://www.moj.go.jp/MINJI/tizuzumen";
  const spatialAttributes = xmlDoc.getElementsByTagNameNS(namespaceURI, "空間属性")[0];

  if (!spatialAttributes) {
    console.error("空間属性が見つかりません");
    return geojson;
  }

  const surfaces = spatialAttributes.getElementsByTagNameNS(zmnNamespaceURI, "GM_Surface");

  for (let surface of surfaces) {
    const coordinates = parseSurfaceCoordinates(surface, xmlDoc, zmnNamespaceURI);
    if (coordinates.length > 0) {
      geojson.features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: coordinates // ネスト修正
        },
        properties: parseThematicAttributes(xmlDoc, namespaceURI)
      });
    }
  }

  return geojson;
}

function parseSurfaceCoordinates(surface, xmlDoc, namespaceURI) {
  if (!surface) return [];

  const polygons = [];
  const surfaceBoundary = surface.getElementsByTagNameNS(namespaceURI, "GM_SurfaceBoundary")[0];
  if (!surfaceBoundary) return [];

  const exterior = surfaceBoundary.getElementsByTagNameNS(namespaceURI, "GM_SurfaceBoundary.exterior")[0];
  if (!exterior) return [];

  const rings = exterior.getElementsByTagNameNS(namespaceURI, "GM_Ring");
  if (rings.length === 0) return [];

  const exteriorRing = parseRing(rings[0], xmlDoc, namespaceURI);
  if (exteriorRing.length > 0) {
    const polygon = [exteriorRing];

    const interiors = surfaceBoundary.getElementsByTagNameNS(namespaceURI, "GM_SurfaceBoundary.interior");
    for (let interior of interiors) {
      const interiorRings = interior.getElementsByTagNameNS(namespaceURI, "GM_Ring");
      for (let ring of interiorRings) {
        const hole = parseRing(ring, xmlDoc, namespaceURI);
        if (hole.length > 0) polygon.push(hole);
      }
    }

    return polygon; // ネストを修正
  }

  return [];
}

function parseRing(ring, xmlDoc, namespaceURI) {
  if (!ring) return [];

  const points = [];
  const generators = ring.getElementsByTagNameNS(namespaceURI, "GM_CompositeCurve.generator");

  for (let generator of generators) {
    const curveId = generator.getAttribute("idref");
    if (!curveId) continue;

    const curve = xmlDoc.getElementById(curveId);
    if (!curve) continue;

    const segments = curve.getElementsByTagNameNS(namespaceURI, "GM_Curve.segment");
    for (let segment of segments) {
      const controlPoints = segment.getElementsByTagNameNS(namespaceURI, "GM_LineString.controlPoint");
      for (let pointArray of controlPoints) {
        const columns = pointArray.getElementsByTagNameNS(namespaceURI, "GM_PointArray.column");
        for (let column of columns) {
          const pointRef = column.getElementsByTagNameNS(namespaceURI, "GM_PointRef.point")[0];
          if (!pointRef) continue;

          const pointId = pointRef.getAttribute("idref");
          if (!pointId) continue;

          const point = xmlDoc.getElementById(pointId);
          if (!point) continue;

          const directPos = point.getElementsByTagNameNS(namespaceURI, "DirectPosition")[0];
          if (!directPos) continue;

          const xElem = directPos.getElementsByTagNameNS(namespaceURI, "X")[0];
          const yElem = directPos.getElementsByTagNameNS(namespaceURI, "Y")[0];
          if (xElem && yElem) {
            const x = parseFloat(xElem.textContent);
            const y = parseFloat(yElem.textContent);
            if (points.length === 0 || points[points.length - 1][0] !== y || points[points.length - 1][1] !== x) {
              points.push([y, x]);
            }
          }
        }
      }
    }
  }

  if (points.length > 1 && (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1])) {
    points.push(points[0]);
  }

  return points;
}

function parseThematicAttributes(xmlDoc, namespaceURI) {
  return {
    地図名: xmlDoc.getElementsByTagNameNS(namespaceURI, "地図名")[0]?.textContent || "不明",
    座標系: xmlDoc.getElementsByTagNameNS(namespaceURI, "座標系")[0]?.textContent || "不明",
    市区町村名: xmlDoc.getElementsByTagNameNS(namespaceURI, "市区町村名")[0]?.textContent || "不明"
  };
}

export const transformCoordinates = (coordinates) => {
  const code = zahyokei.find(item => item.kei === store.state.zahyokei).code
  return proj4(code, "EPSG:4326", coordinates);
};
export function dxfToGeoJSON(dxf) {
  const features = [];
  dxf.entities.forEach((entity) => {
    if (entity.type === 'LINE') {
      const line = turf.lineString([
        transformCoordinates([entity.start.x, entity.start.y]),
        transformCoordinates([entity.end.x, entity.end.y]),
      ]);
      features.push(line);
    } else if (entity.type === 'POINT') {
      const point = turf.point(transformCoordinates([entity.position.x, entity.position.y]));
      features.push(point);
    } else if (entity.type === 'LWPOLYLINE') {
      const coordinates = entity.vertices.map(vertex => transformCoordinates([vertex.x, vertex.y]));
      const polyline = turf.lineString(coordinates);
      features.push(polyline);
    }
  });
  return {
    type: 'FeatureCollection',
    features,
  };
}

const popups = []
function closeAllPopups() {
  popups.forEach(popup => popup.remove())
  // 配列をクリア
  popups.length = 0
}
export function history (event,url) {
  const ua = navigator.userAgent
  const width = window.screen.width
  const height = window.screen.height
  const referrer = document.referrer
  axios
      .get('https://kenzkenz.xsrv.jp/open-hinata3/php/history.php',{
        params: {
          event: event,
          screen: width + ' x ' + height,
          ua: ua,
          referrer:referrer,
          url: url,
          uid: store.state.userId
        }
      })
}
// 緯度経度をタイル座標 (z, x, y) に変換
function lonLatToTile(lon, lat, zoom) {
  const n = Math.pow(2, zoom);
  const xTile = Math.floor((lon + 180.0) / 360.0 * n);
  const yTile = Math.floor(
      (1.0 - Math.log(Math.tan((lat * Math.PI) / 180.0) + 1.0 / Math.cos((lat * Math.PI) / 180.0)) / Math.PI) /
      2.0 *
      n
  );
  return { xTile, yTile };
}

// タイル内のピクセル座標を計算
function calculatePixelInTile(lon, lat, zoom, xTile, yTile, tileSize = 256) {
  const n = Math.pow(2, zoom);
  const x = ((lon + 180.0) / 360.0 * n - xTile) * tileSize;
  const y =
      ((1.0 - Math.log(Math.tan((lat * Math.PI) / 180.0) + 1.0 / Math.cos((lat * Math.PI) / 180.0)) / Math.PI) / 2.0 *
          n -
          yTile) *
      tileSize;
  return { x: Math.floor(x), y: Math.floor(y) };
}

// 修正版: RGB値を標高にデコードする関数
function decodeElevationFromRGB(r, g, b) {
  const scale = 0.01; // スケール値（仮定）
  const offset = 0;   // オフセット値（仮定）
  return (r * 256 * 256 + g * 256 + b) * scale + offset; // RGB値を計算
}

// 標高データをタイル画像から取得し、キャンバスに出力
async function fetchElevationFromImage(imageUrl, lon, lat, zoom) {
  const { xTile, yTile } = lonLatToTile(lon, lat, zoom);

  const img = new Image();
  img.crossOrigin = "Anonymous"; // クロスオリジン対応
  img.src = imageUrl;

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.style.display = "none"
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // タイル内のピクセル座標を計算
      const { x, y } = calculatePixelInTile(lon, lat, zoom, xTile, yTile, img.width);

      // ピクセルデータを取得
      const imageData = ctx.getImageData(x, y, 1, 1).data;
      const [r, g, b] = imageData; // R, G, B 値を取得
      const elevation = decodeElevationFromRGB(r, g, b); // 標高を計算

      // キャンバスに描画
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = "12px Arial";
      ctx.fillStyle = "white";
      ctx.fillText(`${elevation}m`, x + 10, y - 10);
      document.body.appendChild(canvas);

      resolve(elevation);
    };

    img.onerror = (err) => {
      reject(`画像の読み込みに失敗しました: ${err}`);
    };
  });
}

// 標高を取得する関数
async function fetchElevation(lon, lat, zoom = 15) {
  const baseUrl = "https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png";
  const { xTile, yTile } = lonLatToTile(lon, lat, zoom);
  // y と x を反転してタイルURLを生成
  const tileUrl = baseUrl.replace("{z}", zoom).replace("{x}", xTile).replace("{y}", yTile);
  try {
    const elevation = await fetchElevationFromImage(tileUrl, lon, lat, zoom);
    console.log(`標高: ${elevation}m`);
    return elevation;
  } catch (error) {
    console.error("エラー:", error);
  }
}

import axios from "axios"
import DialogMenu from '@/components/Dialog-menu'
import DialogMyroom from '@/components/Dialog-myroom'
import DialogLayer from '@/components/Dialog-layer'
import DialogInfo from '@/components/Dialog-info'
import Dialog2 from '@/components/Dialog2'
import DialogShare from "@/components/Dialog-share"
import pyramid from '@/js/pyramid'
import * as Layers from '@/js/layers'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl from 'maplibre-gl'
import { Protocol } from "pmtiles"
import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain'
import {
  extLayer,
  extSource, geotiffLayer,
  geotiffSource,
  monoLayers,
  monoSources,
  osmBrightLayers,
  osmBrightSources
} from "@/js/layers"
import muni from '@/js/muni'
import { kml } from '@tmcw/togeojson';
import store from "@/store";

export default {
  name: 'App',
  components: {
    DialogLayer,
    DialogMenu,
    DialogMyroom,
    DialogInfo,
    Dialog2,
    DialogShare,
  },
  data: () => ({
    mapNames: ['map01','map02'],
    mapSize: {
      map01: {top: 0, left: 0, width: '100%', height: '100%'},
      map02: {top: 0, right: 0, width: '50%', height: '100%'},
    },
    permalink: '',
    param:'',
    dbparams:'',
    mapName: '',
    pitch:{map01:0,map02:0},
    bearing:0,
    zoom:0,
    address:'',
    elevation:'',
    watchId: null,
    centerMarker: null,
    currentMarker: null,
    isTracking: false,
    compass: null,
    dialog: false,
    dialogForSima: false,
    ddSimaText: '',
    items: [
      'WGS84',
      '公共座標1系', '公共座標2系', '公共座標3系',
      '公共座標4系', '公共座標5系', '公共座標6系',
      '公共座標7系', '公共座標8系', '公共座標9系',
      '公共座標10系', '公共座標11系', '公共座標12系',
      '公共座標13系', '公共座標14系', '公共座標15系',
      '公共座標16系', '公共座標17系', '公共座標18系',
      '公共座標19系'
    ],
    dialogForDxfApp: false,
    windowWidth: window.innerWidth,
    resolutions: [13,14,15,16,17,18,19,20,21,22,23,24,25,26],
    dialogForGeotiffApp1file: false,
    dialogForPdfApp: false,
    dialogForShpApp: false,
    dialogForImagePng: false,
    shpPropaties: [],
    shpGeojson: [],
    loadingSnackbar: false,
  }),
  computed: {
    s_pmtilesName: {
      get() {
        return this.$store.state.pmtilesName
      },
      set(value) {
        this.$store.state.pmtilesName = value
      }
    },
    s_pmtilesPropertieName: {
      get() {
        return this.$store.state.pmtilesPropertieName
      },
      set(value) {
        this.$store.state.pmtilesPropertieName = value
      }
    },
    s_shpPropertieName: {
      get() {
        return this.$store.state.shpPropertieName
      },
      set(value) {
        this.$store.state.shpPropertieName = value
      }
    },
    s_isTransparent: {
      get() {
        return this.$store.state.isTransparent
      },
      set(value) {
        this.$store.state.isTransparent = value
      }
    },
    s_loadingMessage: {
      get() {
        return this.$store.state.loadingMessage
      },
      set(value) {
        this.$store.state.loadingMessage = value
      }
    },
    s_isSmartPhone: {
      get() {
        return this.$store.state.isSmartPhone
      },
      set(value) {
        this.$store.state.isSmartPhone = value
      }
    },
    s_isWindow: {
      get() {
        return this.$store.state.isWindow
      },
      set(value) {
        this.$store.state.isWindow = value
      }
    },
    s_loading2: {
      get() {
        return this.$store.state.loading2
      },
      set(value) {
        this.$store.state.loading2 = value
      }
    },
    s_loading: {
      get() {
        return this.$store.state.loading
      },
      set(value) {
        this.$store.state.loading = value
      }
    },
    s_resolution: {
      get() {
        return this.$store.state.resolution
      },
      set(value) {
        this.$store.state.resolution = value
        localStorage.setItem('resolution',value)
      }
    },
    s_drawGeojsonText: {
      get() {
        return this.$store.state.drawGeojsonText
      },
      set(value) {
        this.$store.state.drawGeojsonText = value
      }
    },
    isSmall() {
      return this.windowWidth <= 500;
    },
    s_map2Flg: {
      get() {
        return this.$store.state.map2Flg
      },
      set(value) {
        this.$store.state.map2Flg = value
      }
    },
    s_dialogForLink: {
      get() {
        return this.$store.state.dialogForLink
      },
      set(value) {
        this.$store.state.dialogForLink = value
      }
    },
    s_dialogForImage: {
      get() {
        return this.$store.state.dialogForImage
      },
      set(value) {
        this.$store.state.dialogForImage = value
      }
    },
    s_isAndroid () {
      return this.$store.state.isAndroid
    },
    s_simaOpacity: {
      get() {
        return this.$store.state.simaOpacity
      },
      set(value) {
        this.$store.state.simaOpacity = value
      }
    },
    s_dialogForLogin: {
      get() {
        return this.$store.state.dialogForLogin
      },
      set(value) {
        this.$store.state.dialogForLogin = value
      }
    },
    s_dialogForPngApp: {
      get() {
        return this.$store.state.dialogForPngApp
      },
      set(value) {
        this.$store.state.dialogForPngApp = value
      }
    },
    s_dialogForPng2App: {
      get() {
        return this.$store.state.dialogForPng2App
      },
      set(value) {
        this.$store.state.dialogForPng2App = value
      }
    },
    s_dialogForJpgApp: {
      get() {
        return this.$store.state.dialogForJpgApp
      },
      set(value) {
        this.$store.state.dialogForJpgApp = value
      }
    },
    s_dialogForGeotiffApp: {
      get() {
        return this.$store.state.dialogForGeotiffApp
      },
      set(value) {
        this.$store.state.dialogForGeotiffApp = value
      }
    },
    s_dialogForGeotiff2App: {
      get() {
        return this.$store.state.dialogForGeotiff2App
      },
      set(value) {
        this.$store.state.dialogForGeotiff2App = value
      }
    },
    s_dialogForSimaApp: {
      get() {
        return this.$store.state.dialogForSimaApp
      },
      set(value) {
        this.$store.state.dialogForSimaApp = value
      }
    },
    s_ocrAccuracy: {
      get() {
        return this.$store.state.ocrAccuracy
      },
      set(value) {
        this.$store.state.ocrAccuracy = value
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
    s_snackbar: {
      get() {
        return this.$store.state.snackbar
      },
      set(value) {
        this.$store.state.snackbar = value
      }
    },
    s_terrainLevel: {
      get() {
        return this.$store.state.terrainLevel
      },
      set(value) {
        this.$store.state.terrainLevel = value
      }
    },
    s_selectedLayers: {
      get() {
        return this.$store.state.selectedLayers
      },
      set(value) {
        this.$store.state.selectedLayers = value
      }
    },
    s_simaFire () {
      return this.$store.state.simaFire
    },
  },
  methods: {
    simaClose () {
      this.s_snackbar = false
      // ここを修正
      // this.$store.state.simaTextForUser = ''
    },
    myRoom () {
      this.s_dialogForLink = !this.s_dialogForLink
      if (this.s_isAndroid){
        let startY;
        let isTouching = false;
        let currentTarget = null;
        let initialScrollTop = 0;
        document.addEventListener('touchstart', (e) => {
          const target = e.target.closest('.scrollable-content, .v-overlay-container .v-select__content');
          if (target) {
            startY = e.touches[0].clientY; // タッチ開始位置を記録
            initialScrollTop = target.scrollTop; // 初期スクロール位置を記録
            isTouching = true;
            currentTarget = target;
            target.style.overflowY = 'auto'; // スクロールを強制的に有効化
            target.style.touchAction = 'manipulation';
            // **イベント伝播を防ぐ**
            e.stopPropagation();
          }
        }, { passive: true, capture: true });

        // タッチ移動時の処理
        document.addEventListener('touchmove', (e) => {
          if (!isTouching || !currentTarget) return; // タッチが開始されていなければ処理しない
          const moveY = e.touches[0].clientY;
          const deltaY = startY - moveY; // 移動量を計算
          // スクロール位置を更新
          currentTarget.scrollTop += deltaY;
          startY = moveY; // 開始位置を現在の位置に更新
          // **Android でスクロールが無視されないようにする**
          e.preventDefault();
          e.stopPropagation();

        }, { passive: true, capture: true });

        // タッチ終了時の処理
        document.addEventListener('touchend', () => {
          if (currentTarget) {
            currentTarget.style.overflowY = ''; // スクロール設定をリセット
          }
          currentTarget = null; // 現在のターゲットをリセット
          isTouching = false; // タッチ中フラグをOFF
          initialScrollTop = 0; // 初期スクロール位置をリセット
        });
      }
    },
    updateSnackbar() {
      this.loadingSnackbar = this.s_loading || this.s_loading2;
    },
    onResize() {
      this.windowWidth = window.innerWidth;
    },
    simaDelete () {
      const geoJSON = {
        type: 'FeatureCollection',
        features: []
      };
      const map01 = this.$store.state.map01
      if (map01.getSource('sima-data')) {
        map01.getSource('sima-data').setData(geoJSON)
      } else {
        alert('レイヤーから削除してください。')
      }
      this.$store.state.simaText = ''
    },
    pngDownload () {
      pngDownload()
      this.$store.state.dialogForPngApp = false
    },
    dxfLoad () {
      const map01 = this.$store.state.map01
      const map02 = this.$store.state.map02
      const parser = new DxfParser();
      this.$store.state.dxfText.zahyokei = this.$store.state.zahyokei
      const dxf = parser.parseSync(this.$store.state.dxfText.text);
      const geojson = dxfToGeoJSON(dxf);
      geojsonAddLayer (map01, geojson, true, 'dxf')
      geojsonAddLayer (map02, geojson, true, 'dxf')
      this.dialogForDxfApp = false
    },
    shpLoad () {
      if (!this.s_pmtilesName || !this.s_pmtilesPropertieName) {
        alert("入力されていません。")
        return
      }
      pmtilesGenerateForUser2 (this.shpGeojson,'',store.state.pmtilesPropertieName)
      this.dialogForShpApp = false
    },
    imagePngLoad () {
      csvGenerateForUserPng()
      this.dialogForImagePng = false
    },
    pdfLoad () {
      if (this.$store.state.userId) {
        tileGenerateForUserPdf()
        this.dialogForPdfApp = false
      } else {
        alert('ログイン専用です。')
      }
    },
    pngLoad0 () {
      const map01 = this.$store.state.map01
      const map02 = this.$store.state.map02
      if (this.$store.state.userId) {
        // pngLoadForUser (map01,'map01', true)
        // pngLoadForUser (map02,'map02', false)
        tileGenerateForUserPng()
      } else {
        pngLoad (map01,'map01', true)
        pngLoad (map02,'map02', false)
      }
      this.s_dialogForPng2App = false
    },
    jpgLoad0 () {
      const map01 = this.$store.state.map01
      const map02 = this.$store.state.map02
      if (this.$store.state.userId) {
        tileGenerateForUserJpg()
      } else {
        jpgLoad (map01,'map01', true)
        jpgLoad (map02,'map02', false)
      }
      this.s_dialogForJpgApp = false
    },
    geoTiffLoad0 () {
      const map01 = this.$store.state.map01
      const map02 = this.$store.state.map02
      if (this.$store.state.userId) {
        tileGenerateForUserTfw()
      } else {
        geoTiffLoad (map01,'map01', true)
        geoTiffLoad (map02,'map02', false)
      }
      this.s_dialogForGeotiffApp = false
    },
    geoTifLoad1file () {
      const map01 = this.$store.state.map01
      const map02 = this.$store.state.map02
      if (this.$store.state.userId) {
        tileGenerateForUser1file()
      } else {
        geoTiffLoad2 (map01,'map01', true)
        geoTiffLoad2 (map02,'map02', false)
      }
      this.dialogForGeotiffApp1file = false
    },
    simaOpacityInput () {
      const map1 = this.$store.state.map01
      const map2 = this.$store.state.map02
      const maps = [map1, map2]
      if (this.$store.state.simaText) {
        map1.setPaintProperty('sima-layer', 'fill-opacity', this.s_simaOpacity)
        map2.setPaintProperty('sima-layer', 'fill-opacity', this.s_simaOpacity)
        const parsed = JSON.parse(this.$store.state.simaText)
        parsed['opacity'] = this.s_simaOpacity
        this.$store.state.simaText = JSON.stringify(parsed)
      }
      if (this.$store.state.simaTextForUser) {
        maps.forEach(map => {
          map.getStyle().layers.forEach(layer => {
            if (layer.id.includes('-sima-') && layer.id.includes('polygon')) {
              map1.setPaintProperty(layer.id, 'fill-opacity', this.s_simaOpacity)
            }
          })
        })
        const parsed = JSON.parse(this.$store.state.simaTextForUser)
        parsed['opacity'] = this.s_simaOpacity
        this.$store.state.simaTextForUser = JSON.stringify(parsed)
        // console.log(this.$store.state.simaTextForUser)
      }
    },
    loadSima () {
      if (!this.s_zahyokei) {
        alert('座標系を選択してください。')
        return
      }
      if (this.$store.state.isMenu) {
        document.querySelector('#simaFileInput').click()
        this.$store.state.isMenu = false
        this.s_dialogForSimaApp = false
      } else {
        if (this.$store.state.userId) {
          const map1 = this.$store.state.map01
          simaLoadForUser (map1,true, this.ddSimaText)
        } else {
          ddSimaUpload(this.ddSimaText)
        }
        this.s_dialogForSimaApp = false
      }
    },
    simaDl () {
      if (this.$store.state.simaText) {
        downloadSimaText(false)
      }
      if (this.$store.state.simaTextForUser) {
        downloadSimaText(true)
      }
    },
    share(mapName) {
      if (this.$store.state.dialogs.shareDialog[mapName].style.display === 'none') {
        this.$store.commit('incrDialogMaxZindex')
        this.$store.state.dialogs.shareDialog[mapName].style['z-index'] = this.$store.state.dialogMaxZindex
        this.$store.state.dialogs.shareDialog[mapName].style.display = 'block'
        if (window.innerWidth < 450) {
          this.$store.state.dialogs.shareDialog[mapName].style.left = '0px'
        } else {
          if (this.s_map2Flg) {
            this.$store.state.dialogs.shareDialog[mapName].style.left = (window.innerWidth / 2 - 360) + 'px'
          } else {
            this.$store.state.dialogs.shareDialog[mapName].style.left = (window.innerWidth - 360) + 'px'
          }
        }
      } else {
        this.$store.state.dialogs.shareDialog[mapName].style.display = 'none'
      }
    },
    zoomIn() {
      const map = this.$store.state.map01
      map.zoomIn({duration: 500})
    },
    zoomOut() {
      const map = this.$store.state.map01
      map.zoomOut({duration: 500})
    },
    startWatchPosition () {
      if (this.watchId === null && navigator.geolocation) {
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
              this.updateLocationAndCoordinates(position);
            },
            (error) => {
              console.error('Geolocation error:', error);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
      }
    },
    toggleWatchPosition () {
      if (this.watchId === null) {
        this.startWatchPosition()
        this.isTracking = true
        // this.compass.turnOn()
        if (this.currentMarker) this.currentMarker.remove();
        history('現在位置継続取得スタート',window.location.href)
      } else {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
        this.centerMarker.remove()
        this.centerMarker = null
        this.isTracking = false
        this.currentMarker = null
        // this.compass.turnOff()
        history('現在位置継続取得ストップ',window.location.href)
      }
    },
    updateLocationAndCoordinates(position) {
      const map = this.$store.state.map01
      let longitude, latitude;
      if (position) {
        ({latitude, longitude} = position.coords);
        // map.setCenter([longitude, latitude]);
        // map.setZoom(15);
        map.flyTo({ center: [longitude, latitude], zoom: map.getZoom() });
      } else {
        const center = map.getCenter();
        longitude = center.lng;
        latitude = center.lat;
      }
      // 中心を示すマーカーを追加・更新
      if (!this.centerMarker) {
        this.centerMarker = new maplibregl.Marker({ color: 'green' })
            .setLngLat([longitude, latitude])
            .addTo(map);
      } else {
        this.centerMarker.setLngLat([longitude, latitude]);
      }
    },
    goToCurrentLocation () {
      const map = this.$store.state.map01
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLongitude = position.coords.longitude;
              const userLatitude = position.coords.latitude;
              // ユーザーの操作を一時的に無効化
              map.scrollZoom.disable();
              map.dragPan.disable();
              map.keyboard.disable();
              map.doubleClickZoom.disable();
              // 現在位置にマップを移動
              map.flyTo({
                center: [userLongitude, userLatitude],
                zoom: 15.01,
                essential: true // アニメーションを有効にする
              });
              // flyToアニメーション完了後にユーザー操作を再度有効化
              map.once('moveend', () => {
                map.scrollZoom.enable();
                map.dragPan.enable();
                map.keyboard.enable();
                map.doubleClickZoom.enable();
              });
              // 現在位置にマーカーを追加
              this.currentMarker = new maplibregl.Marker()
                  .setLngLat([userLongitude, userLatitude])
                  // .setPopup(new maplibregl.Popup().setHTML("<strong>現在位置</strong>"))
                  .addTo(map);
              // マーカーをクリックしたときにマーカーを削除
              this.currentMarker.getElement().addEventListener('click', () => {
                this.currentMarker.remove(); // マーカーをマップから削除
              });
            },
            (error) => {
              console.error("現在位置の取得に失敗しました:", error);
            }
        );
      } else {
        console.error("Geolocationはこのブラウザでサポートされていません。");
      }
      history('現在位置取得',window.location.href)
    },
    btnPosition() {
      if (document.querySelector('#map01').clientWidth < Number(document.querySelector('.terrain-btn-div').style.left.replace('px',''))) {
        document.querySelector('.terrain-btn-div').style.left = ''
        document.querySelector('.terrain-btn-div').style.right = '10px'
      }
    },
    terrainBtnClos () {
      document.querySelectorAll('.terrain-btn-div').forEach(elm => {
        elm.style.display = 'none'
      })
      document.querySelectorAll('.terrain-btn-expand-div').forEach(elm => {
        elm.style.display = 'block'
      })
    },
    terrainBtnExpand () {
      document.querySelectorAll('.terrain-btn-div').forEach(elm => {
        elm.style.display = 'block'
      })
      document.querySelectorAll('.terrain-btn-expand-div').forEach(elm => {
        elm.style.display = 'none'
      })
    },
    terrainReset (mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      function pitch () {
        vm.pitch[mapName] = map.getPitch()
        if (vm.pitch[mapName] !==0) {
          map.setPitch(map.getPitch() - 5)
          requestAnimationFrame(pitch)
        } else {
          map.setPitch(0)
          vm.pitch[mapName] = map.getPitch()
          // console.log(vm.pitch)
          vm.updatePermalink()
          cancelAnimationFrame(pitch)
        }
      }
      function bearing () {
        vm.bearing = map.getBearing()
        let step = -5
        if(vm.bearing < 0) step = 5

        if (step !== 5) {
          if (vm.bearing >= 5) {
            vm.$store.state.map01.setBearing(map.getBearing() + step)
            vm.$store.state.map02.setBearing(map.getBearing() + step)
            requestAnimationFrame(bearing)
          } else {
            vm.bearing = map.getBearing()
            vm.updatePermalink()
            cancelAnimationFrame(bearing)
          }
        } else {
          if (vm.bearing <= -5) {
            vm.$store.state.map01.setBearing(map.getBearing() + step)
            vm.$store.state.map02.setBearing(map.getBearing() + step)
            requestAnimationFrame(bearing)
          } else {
            vm.bearing = map.getBearing()
            vm.updatePermalink()
            cancelAnimationFrame(bearing)
          }
        }
      }
      if (window.innerWidth < 1000) {
        map.setPitch(0)
        this.$store.state.map01.setBearing(0)
        this.$store.state.map02.setBearing(0)
      } else {
        pitch ()
        bearing ()
      }
      this.$store.state[mapName].setTerrain(null)
    },
    mouseup () {
      this.mouseDown = false
    },
    leftMousedown(mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      vm.mouseDown = true
      function bearing () {
        vm.bearing = map.getBearing()
        if (vm.mouseDown) {
          map.setBearing(map.getBearing() + 2)
          // vm.$store.state.map01.setBearing(map.getBearing() + 2)
          // vm.$store.state.map02.setBearing(map.getBearing() + 2)
          requestAnimationFrame(bearing)
        } else {
          vm.bearing = map.getBearing()
          cancelAnimationFrame(bearing)
        }
      }
      bearing()
    },
    rightMousedown(mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      vm.mouseDown = true
      function bearing () {
        vm.bearing = map.getBearing()
        if (vm.mouseDown) {
          map.setBearing(map.getBearing() - 2)
          // vm.$store.state.map01.setBearing(map.getBearing() - 2)
          // vm.$store.state.map02.setBearing(map.getBearing() - 2)
          requestAnimationFrame(bearing)
        } else {
          vm.bearing = map.getBearing()
          cancelAnimationFrame(bearing)
        }
      }
      bearing()
    },
    upMousedown(mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      vm.mouseDown = true
      function pitch () {
        vm.pitch[mapName] = map.getPitch()
        if (vm.mouseDown) {
          map.setPitch(map.getPitch() + 2)
          requestAnimationFrame(pitch)
        } else {
          vm.pitch[mapName] = map.getPitch()
          cancelAnimationFrame(pitch)
        }
      }
      pitch()
    },
    downMousedown(mapName) {
      const vm = this
      const map = this.$store.state[mapName]
      vm.mouseDown = true
      function pitch () {
        vm.pitch[mapName] = map.getPitch()
        if (vm.mouseDown) {
          map.setPitch(map.getPitch() - 2)
          requestAnimationFrame(pitch)
        } else {
          vm.pitch[mapName] = map.getPitch()
          cancelAnimationFrame(pitch)
        }
      }
      pitch()
    },
    btnClickMyroom (mapName) {
      if (this.$store.state.dialogs.myroomDialog[mapName].style.display === 'none') {
        this.$store.commit('incrDialogMaxZindex')
        this.$store.state.dialogs.myroomDialog[mapName].style['z-index'] = this.$store.state.dialogMaxZindex
        this.$store.state.dialogs.myroomDialog[mapName].style.display = 'block'
      } else {
        this.$store.state.dialogs.myroomDialog[mapName].style.display = 'none'
      }
      if (this.s_isAndroid){
        let startY;
        let isTouching = false;
        let currentTarget = null;
        let initialScrollTop = 0;
        document.addEventListener('touchstart', (e) => {
          const target = e.target.closest('.myroom-div');
          if (target) {
            startY = e.touches[0].clientY; // タッチ開始位置を記録
            initialScrollTop = target.scrollTop; // 初期スクロール位置を記録
            isTouching = true;
            currentTarget = target;
            target.style.overflowY = 'auto'; // スクロールを強制的に有効化
            target.style.touchAction = 'manipulation';
            // **イベント伝播を防ぐ**
            e.stopPropagation();
          }
        }, { passive: true, capture: true });

        // タッチ移動時の処理
        document.addEventListener('touchmove', (e) => {
          if (!isTouching || !currentTarget) return; // タッチが開始されていなければ処理しない
          const moveY = e.touches[0].clientY;
          const deltaY = startY - moveY; // 移動量を計算
          // スクロール位置を更新
          currentTarget.scrollTop += deltaY;
          startY = moveY; // 開始位置を現在の位置に更新
          // **Android でスクロールが無視されないようにする**
          e.preventDefault();
          e.stopPropagation();

        }, { passive: true, capture: true });

        // タッチ終了時の処理
        document.addEventListener('touchend', () => {
          if (currentTarget) {
            currentTarget.style.overflowY = ''; // スクロール設定をリセット
          }
          currentTarget = null; // 現在のターゲットをリセット
          isTouching = false; // タッチ中フラグをOFF
          initialScrollTop = 0; // 初期スクロール位置をリセット
        });
      }
    },
    btnClickMenu (mapName) {
      if (this.$store.state.dialogs.menuDialog[mapName].style.display === 'none') {
        this.$store.commit('incrDialogMaxZindex')
        this.$store.state.dialogs.menuDialog[mapName].style['z-index'] = this.$store.state.dialogMaxZindex
        this.$store.state.dialogs.menuDialog[mapName].style.display = 'block'
      } else {
        this.$store.state.dialogs.menuDialog[mapName].style.display = 'none'
      }
    },
    btnClickLayer (mapName) {
      if (this.$store.state.dialogs.layerDialog[mapName].style.display === 'none') {
        this.$store.commit('incrDialogMaxZindex')
        this.$store.state.dialogs.layerDialog[mapName].style['z-index'] = this.$store.state.dialogMaxZindex
        this.$store.state.dialogs.layerDialog[mapName].style.display = 'block'
      } else {
        this.$store.state.dialogs.layerDialog[mapName].style.display = 'none'
      }
    },
    btnClickSplit () {
      if (this.s_map2Flg) {
        this.mapSize.map01.width = '100%'
        this.mapSize.map01.height = '100%'
        this.s_map2Flg = false
      } else {
        if (window.innerWidth > 1000) {
          document.querySelector('.terrain-btn-div').style.left = ''
          document.querySelector('.terrain-btn-div').style.right = '10px'
          this.mapSize.map01.width = '50%'
          this.mapSize.map01.height = '100%'
        } else {
          this.mapSize.map01.width = '100%'
          this.mapSize.map01.height = '50%'
          this.mapSize.map02.width = '100%'
          this.mapSize.map02.height = '50%'
          this.mapSize.map02.top = '50%'
        }
        this.s_map2Flg = true
        if (popups.length > 0) {
          closeAllPopups()
        }
      }
    },
    updatePermalink() {
      const map = this.$store.state.map01
      const center = map.getCenter()
      const zoom = map.getZoom()
      const { lng, lat } = center
      const split = this.s_map2Flg
      const pitch01 = !isNaN(this.pitch.map01) ? this.pitch.map01: 0
      const pitch02 = !isNaN(this.pitch.map02) ? this.pitch.map02: 0
      let terrainLevel = this.s_terrainLevel
      if (isNaN(terrainLevel)) terrainLevel = 1
      // console.log(this.bearing)
      let bearing = 0
      if (isNaN(this.bearing)) {
        bearing = 0
      } else {
        if (this.bearing > -5 && this.bearing < 5 ) {
          console.log('0に修正')
          bearing = 0
          this.bearing = 0
        } else {
          bearing = this.bearing
        }
      }
      function removeKeys(obj, keysToRemove) {
        if (Array.isArray(obj)) {
          return obj.map(item => removeKeys(item, keysToRemove))
        } else if (typeof obj === 'object' && obj !== null) {
          const newObj = {}
          for (const [key, value] of Object.entries(obj)) {
            if (!keysToRemove.includes(key)) {
              newObj[key] = removeKeys(value, keysToRemove)
            }
          }
          return newObj
        }
        return obj
      }

      const keysToRemove = ['label', 'source', 'layers', 'sources', 'attribution','info']
      let copiedSelectedLayers = JSON.parse(JSON.stringify(this.$store.state.selectedLayers))
      copiedSelectedLayers = removeKeys(copiedSelectedLayers, keysToRemove)
      // console.log(JSON.stringify(copiedSelectedLayers))
      const selectedLayersJson = JSON.stringify(copiedSelectedLayers)
      // console.log(this.$store.state.highlightedChibans)
      const chibans = []
      this.$store.state.highlightedChibans.forEach(h => {
        chibans.push(h)
      })
      const simaText = this.$store.state.simaText
      const image = this.$store.state.uploadedImage
      const extLayer = {layer:this.$store.state.extLayer,name:this.$store.state.extLayerName}
      const kmlText = this.$store.state.kmlText
      const geojsonText = this.$store.state.geojsonText
      const dxfText = JSON.stringify(this.$store.state.dxfText)
      const gpxText = this.$store.state.gpxText
      const drawGeojsonText = this.$store.state.drawGeojsonText
      const clickGeojsonText = this.$store.state.clickGeojsonText
      const vector = this.$store.state.uploadedVector
      const isWindow = this.$store.state.isWindow
      const simaTextForUser = this.$store.state.simaTextForUser
      // パーマリンクの生成
      this.param = `?lng=${lng}&lat=${lat}&zoom=${zoom}&split=${split}&pitch01=
      ${pitch01}&pitch02=${pitch02}&bearing=${bearing}&terrainLevel=${terrainLevel}
      &slj=${selectedLayersJson}&chibans=${JSON.stringify(chibans)}&simatext=${simaText}&image=${JSON.stringify(image)}&extlayer=${JSON.stringify(extLayer)}&kmltext=${kmlText}&geojsontext=${geojsonText}&dxftext=${dxfText}&gpxtext=${gpxText}&drawgeojsontext=${drawGeojsonText}&clickgeojsontext=${clickGeojsonText}&vector=${JSON.stringify(vector)}&iswindow=${JSON.stringify(isWindow)}&simatextforuser=${simaTextForUser}`
      // console.log(this.param)
      // this.permalink = `${window.location.origin}${window.location.pathname}${this.param}`
      // URLを更新
      // window.history.pushState({ lng, lat, zoom }, '', this.permalink)
      this.createShortUrl()
      this.zoom = zoom
      const vm = this
      axios
          .get('https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress', {
            params: {
              lon: lng,
              lat: lat
            }
          })
          .then(function (response) {
            if (response.data.results) {
              try {
                const splitMuni = muni[Number(response.data.results.muniCd)].split(',')
                vm.address = splitMuni[1] + splitMuni[3] + response.data.results.lv01Nm
                console.log(splitMuni[0])
                vm.$store.state.prefId = splitMuni[0]
              }catch (e){
                console.log(e)
              }
            }
          })
      history('updatePermalink',window.location.href)
    },
    createShortUrl() {
      let params = new URLSearchParams()
      params.append('parameters', this.param)
      axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/shortUrl.php', params)
          .then(response => {
            window.history.pushState(null, 'map', "?s=" + response.data.urlid)
            console.log(window.location.pathname)
            let pathName = ''
            if (window.location.pathname !== '/') {
              pathName = window.location.pathname
            }
            this.$store.state.url = window.location.protocol + '//' + window.location.host + pathName + "/?s=" + response.data.urlid
            console.log('保存成功')
          })
          .catch(error => {
            console.log(error)
          })
    },
    parseUrlParams() {
      let params
      if (this.dbparams) {
        params = new URLSearchParams(this.dbparams)
        // console.log(this.dbparams)
      } else {
        params = new URLSearchParams(window.location.search)
      }
      console.log(params)
      const lng = parseFloat(params.get('lng'))
      const lat = parseFloat(params.get('lat'))
      const zoom = parseFloat(params.get('zoom'))
      const split = params.get('split')
      const pitch = parseFloat(params.get('pitch'))// 以前のリンクをいかすため---------------------------------
      const pitch01 = parseFloat(params.get('pitch01'))
      const pitch02 = parseFloat(params.get('pitch02'))
      const bearing = parseFloat(params.get('bearing'))
      const terrainLevel = parseFloat(params.get('terrainLevel'))
      const slj = JSON.parse(params.get('slj'))
      const chibans = params.get('chibans')
      const simaText = params.get('simatext')
      const image = params.get('image')
      const extLayer = params.get('extlayer')
      const kmlText = params.get('kmltext')
      const geojsonText = params.get('geojsontext')
      const dxfText = params.get('dxftext')
      const gpxText = params.get('gpxtext')
      const drawGeojsonText = params.get('drawgeojsontext')
      const clickGeojsonText = params.get('clickgeojsontext')
      const vector = params.get('vector')
      const isWindow = params.get('iswindow')
      const simaTextForUser = params.get('simatextforuser')
      this.pitch.map01 = pitch01
      this.pitch.map02 = pitch02
      this.bearing = bearing
      this.s_terrainLevel = terrainLevel
      return {lng,lat,zoom,split,pitch,pitch01,pitch02,bearing,terrainLevel,slj,chibans,simaText,image,extLayer,kmlText,geojsonText,dxfText,gpxText,drawGeojsonText,clickGeojsonText,vector,isWindow,simaTextForUser}// 以前のリンクをいかすためpitchを入れている。
    },
    init() {

// HTML要素を追加
      const uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.id = 'simaFileInput';
      uploadInput.accept = '.sim';
      uploadInput.style.display = 'none';
      uploadInput.addEventListener('change', handleFileUpload);
      document.body.appendChild(uploadInput);


// 複数の.scrollable-content要素やVuetifyのv-selectに対応したタッチスクロール処理

// グローバルイベントリスナーを使用して動的要素にも対応
      let startY;
      let isTouching = false;
      let currentTarget = null;
      let initialScrollTop = 0;

      function watchSelectMenu() {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
              const menuContent = document.querySelector('.v-overlay__content');
              if (menuContent) {
                observer.disconnect(); // 監視を終了
                menuContent.scrollTop = 200; // スクロール位置を調整
              }
            }
          });
        });

        observer.observe(document.body, { childList: true, subtree: true });
      }
      watchSelectMenu()

      // Android向けにタッチイベントの挙動を調整
      const isAndroid = /Android/i.test(navigator.userAgent);

      // タッチ開始時の処理
      document.addEventListener('touchstart', (e) => {
        const target = e.target.closest('.scrollable-content, .v-overlay-container .v-select__content');
        if (target) {
          startY = e.touches[0].clientY; // タッチ開始位置を記録
          initialScrollTop = target.scrollTop; // 初期スクロール位置を記録
          isTouching = true;
          currentTarget = target;
          target.style.overflowY = 'auto'; // スクロールを強制的に有効化
        }
      }, { passive: false });

      // タッチ移動時の処理
      document.addEventListener('touchmove', (e) => {
        if (!isTouching || !currentTarget) return; // タッチが開始されていなければ処理しない
        const moveY = e.touches[0].clientY;
        const deltaY = startY - moveY; // 移動量を計算
        // スクロール位置を更新
        currentTarget.scrollTop += deltaY;
        startY = moveY; // 開始位置を現在の位置に更新
        e.preventDefault(); // デフォルトのスクロールを防止
      }, { passive: false });

      // タッチ終了時の処理
      document.addEventListener('touchend', () => {
        if (currentTarget) {
          currentTarget.style.overflowY = ''; // スクロール設定をリセット
        }
        currentTarget = null; // 現在のターゲットをリセット
        isTouching = false; // タッチ中フラグをOFF
        initialScrollTop = 0; // 初期スクロール位置をリセット
      });


      // ======================================================================
      let protocol = new Protocol();
      maplibregl.addProtocol("pmtiles",protocol.tile)
      // protocol.setCacheSize(50) // タイルキャッシュサイズを設定（単位: タイル数）
      // ======================================================================

      // maplibregl.addProtocol('cleanpmtiles', async (params, callback) => {
      //   params.url = params.url.replace('cleanpmtiles://', 'pmtiles://');
      //   try {
      //     const result = await protocol.tile(params, params.tile);
      //     callback(null, result.data, result.cacheControl, result.expires);
      //   } catch (error) {
      //     callback(error);
      //   }
      // });




      // class CleanProtocol extends Protocol {
      //   constructor() {
      //     super();
      //   }
      //
      //   async tile(params, callback) {
      //     super.tile(params, (error, data, cacheControl, expires) => {
      //       if (error) {
      //         callback(error);
      //         return;
      //       }
      //
      //       const modifiedData = data;
      //
      //       if (modifiedData && modifiedData.data && modifiedData.data.features) {
      //         modifiedData.data.features = modifiedData.data.features.map((feature) => {
      //           const newProperties = {};
      //           for (const key in feature.properties) {
      //             const value = feature.properties[key];
      //             newProperties[key] = typeof value === 'string' ? value.replace(/_/g, '') : value;
      //           }
      //           return {
      //             ...feature,
      //             properties: newProperties,
      //           };
      //         });
      //       }
      //
      //       callback(null, modifiedData, cacheControl, expires);
      //     });
      //   }
      // }
      //
      // const cleanProtocol = new CleanProtocol();
      // maplibregl.addProtocol("cleanpmtiles", cleanProtocol.tile.bind(cleanProtocol));

      // ======================================================================

      maplibregl.addProtocol("transparentBlack", (params) => {
        return new Promise((resolve, reject) => {
          try {
            const url = params.url.replace("transparentBlack://", "");
            fetch(url)
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                  }
                  return response.blob();
                })
                .then(blob => createImageBitmap(blob))
                .then(image => {
                  const canvas = document.createElement("canvas");
                  canvas.width = image.width;
                  canvas.height = image.height;
                  const ctx = canvas.getContext("2d");

                  ctx.drawImage(image, 0, 0);
                  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const data = imgData.data;

                  for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    if ((r === 0 && g === 0 && b === 0) || (r === 0 && g === 0 && b >= 254) || (r === 255 && g === 255 && b === 255)) {
                      data[i + 3] = 0;
                    }
                  }
                  ctx.putImageData(imgData, 0, 0);

                  canvas.toBlob((blob) => {
                    if (!blob) {
                      reject(new Error("Blob creation failed"));
                      return;
                    }

                    const reader = new FileReader();
                    reader.onload = function () {
                      resolve({ data: reader.result, contentType: "image/png" });
                    };
                    reader.onerror = function () {
                      reject(new Error("FileReader error while reading blob"));
                    };
                    reader.readAsArrayBuffer(blob);
                  }, "image/png");
                })
                .catch(error => {
                  reject(new Error(`Processing error: ${error.message}`));
                });
          } catch (error) {
            reject(new Error(`Unexpected error: ${error.message}`));
          }
        });
      });

      maplibregl.addProtocol("transparentWhite", (params) => {
        return new Promise((resolve, reject) => {
          try {
            const url = params.url.replace("transparentWhite://", "");
            fetch(url)
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                  }
                  return response.blob();
                })
                .then(blob => createImageBitmap(blob))
                .then(image => {
                  const canvas = document.createElement("canvas");
                  canvas.width = image.width;
                  canvas.height = image.height;
                  const ctx = canvas.getContext("2d");

                  ctx.drawImage(image, 0, 0);
                  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const data = imgData.data;

                  for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    if (r === 255 && g === 255 && b === 255) {
                      data[i + 3] = 0; // アルファ値を0にして透過
                    }
                  }
                  ctx.putImageData(imgData, 0, 0);

                  canvas.toBlob((blob) => {
                    if (!blob) {
                      reject(new Error("Blob creation failed"));
                      return;
                    }

                    const reader = new FileReader();
                    reader.onload = function () {
                      resolve({ data: reader.result, contentType: "image/png" });
                    };
                    reader.onerror = function () {
                      reject(new Error("FileReader error while reading blob"));
                    };
                    reader.readAsArrayBuffer(blob);
                  }, "image/png");
                })
                .catch(error => {
                  reject(new Error(`Processing error: ${error.message}`));
                });
          } catch (error) {
            reject(new Error(`Unexpected error: ${error.message}`));
          }
        });
      });


      const params = this.parseUrlParams()
      this.mapNames.forEach(mapName => {
        // 2画面-----------------------------------------------------------
        if (mapName === 'map02') {
          if (params.split === 'true') {
            this.s_map2Flg = true
            if (window.innerWidth > 1000) {
              this.mapSize.map01.width = '50%'
              this.mapSize.map01.height = '100%'
            } else {
              this.mapSize.map01.width = '100%'
              this.mapSize.map01.height = '50%'
              this.mapSize.map02.width = '100%'
              this.mapSize.map02.height = '50%'
              this.mapSize.map02.top = '50%'
            }
          }
        }
        // --------------------------------------------------------------
        let center = [139.84267451046338,38.36453863570733]
        let zoom = 5
        let pitch= {map01:0,map02:0}
        let bearing = 0
        if (params.lng) {
          center = [params.lng,params.lat]
          zoom = params.zoom
          pitch = {map01:params.pitch01,map02:params.pitch02}
          bearing = params.bearing
        }
        // 以前のリンクをいかすため---------------------------------
        if (params.pitch || params.pitch === 0) {
          if (isNaN(params.pitch)) {
            pitch = {map01:0,map02:0}
          } else {
            pitch = {map01:params.pitch,map02:params.pitch}
          }
        }
        // 以前のリンクをいかすため---------------------------------
        // const maptilerApiKey = 'CDedb3rcFcdaYuHkD9zR'

        // const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol, {
        //   tileUrl: 'https://mapdata.qchizu2.xyz/03_dem/51_int/all_9999/int_01/{z}/{x}/{y}.png',
        //   // tileUrl: 'https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png',
        //   maxzoom: 19,
        // })

        const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol, {
          tileUrl: 'https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png',
          maxzoom: 17,
          attribution: '<a href="https://gbank.gsj.jp/seamless/elev/">産総研シームレス標高タイル</a>'
        });


        const map = new maplibregl.Map({
          container: mapName,
          localIdeographFontFamily: ['sans-serif'], // 日本語を表示するための設定
          center: center,
          zoom: zoom,
          maxZoom: 25.99,
          pitch: pitch[mapName],
          bearing:bearing,
          maxPitch: 85, // 最大の傾き85、デフォルトは60
          attributionControl: false,
          // style: 'https://raw.githubusercontent.com/gsi-cyberjapan/optimal_bvmap/52ba56f645334c979998b730477b2072c7418b94/style/std.json',
          // style:require('@/assets/json/std.json')
          // style:"https://kenzkenz.xsrv.jp/open-hinata3/json/std.json",
          // style: {
          //   version: 8,
          //   // sprite: 'https://kenzkenz.xsrv.jp/open-hinata3/json/spritesheet',
          //   glyphs: "https://glyphs.geolonia.com/{fontstack}/{range}.pbf",
          //   // "glyphs": "https://gsi-cyberjapan.github.io/optimal_bvmap/glyphs/{fontstack}/{range}.pbf",
          //   sources: {
          //     "background-osm-raster": {
          //       type: "raster",
          //       tiles: ["https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png"],
          //       tileSize: 256,
          //       attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank'>© OpenStreetMap contributors</a>",
          //     },
          //   },
          //   layers: [
          //     {
          //       id: "background-osm-raster",
          //       type: "raster",
          //       source: "background-osm-raster",
          //     },
          //     ]
          // },

          // style: `https://api.maptiler.com/maps/streets/style.json?key=${maptilerApiKey}`, // MapTilerのスタイルURL

          // style:require('@/assets/json/basic.json')

          style: {
            'version': 8,
            // glyphs: "https://glyphs.geolonia.com/{fontstack}/{range}.pbf",
            "glyphs": "https://tile.openstreetmap.jp/fonts/{fontstack}/{range}.pbf",
            // "glyphs": "https://gsi-cyberjapan.github.io/optimal_bvmap/glyphs/{fontstack}/{range}.pbf",
            "sprite": "https://gsi-cyberjapan.github.io/optimal_bvmap/sprite/std",
            'sources': {
              terrain: gsiTerrainSource,
            },
            'layers': []
          },
        })
        this.$store.state[mapName] = map

      })
      // --------------------------------
      const map = this.$store.state.map01
      const vm = this
      //----------------------------------

      // const draw = new MaplibreTerradrawControl({
      //   modes: ['render', 'point', 'linestring', 'polygon', 'rectangle', 'circle', 'freehand', 'select', 'delete-selection', 'delete']
      // });
      // map.addControl(draw, 'bottom-right');

      const drawControl = new MaplibreMeasureControl({
        modes: [
          'render',
          'point',
          'linestring',
          'polygon',
          'circle',
          'freehand',
          'select',
          'delete-selection',
          'delete',
          'download'
        ],
        open: false,
      });
      map.addControl(drawControl, 'bottom-right');
      const drawInstance = drawControl.getTerraDrawInstance()

      function observeToolbar() {
        const observer = new MutationObserver(() => {
          const toolbarContainer = document.querySelector(".maplibregl-ctrl-bottom-right");
          if (toolbarContainer) {
            const toolbar = toolbarContainer.querySelector(".maplibregl-ctrl-group");
            if (toolbar && !toolbar.querySelector(".custom-button")) {
              observer.disconnect(); // 一度検出したら監視を停止
              addCustomButton(toolbar);
            }
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }

      function addCustomButton(toolbar) {
        const customButton = document.createElement("button");
        customButton.className = "custom-button maplibregl-terradraw-add-control hidden maplibregl-terradraw-download-button";
        customButton.title = 'KML-Download'
        customButton.setAttribute("type", "button");
        customButton.innerHTML = '<p style="margin-top: -18px;">KML</p>';
        customButton.onclick = () => {
          const features = drawInstance.getSnapshot();
          const geojson = {
            "type": "FeatureCollection",
            "features": features
          }
          downloadKML(null, null, geojson)
        };
        toolbar.appendChild(customButton);
      }
      // MapLibre のロード完了後に監視開始
      map.on("load", observeToolbar);

      drawInstance.on('finish', (e) => {
        const snapshot = drawInstance.getSnapshot();
        const geojsonText = JSON.stringify(snapshot, null, 2);
        this.$store.state.drawGeojsonText = geojsonText
        this.updatePermalink()
      });

      map.on('click', (e) => {
        const latitude = e.lngLat.lat
        const longitude = e.lngLat.lng
        console.log(JSON.stringify([longitude, latitude]))
      })

      map.on('moveend', () => {
        this.$store.state.watchFlg = true
        const bounds = map.getBounds()
        // 南西端と北東端の座標を取得
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        this.$store.state.lngRange = [sw.lng,ne.lng]
        this.$store.state.latRange = [sw.lat,ne.lat]
      })

      // 画面同期----------------------------------------------------------------------------------------------------------
      // スロットリング用のヘルパー関数
      function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function(...args) {
          if (!lastRan) {
            func(...args);
            lastRan = Date.now();
          } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
              if ((Date.now() - lastRan) >= limit) {
                func(...args);
                lastRan = Date.now();
              }
            }, limit - (Date.now() - lastRan));
          }
        };
      }

      let syncing = false
      function syncMaps(mapA, mapB) {
        // iphoneのtきmoveではフリーズする。moveendではフリーズしない。
        let m = 'move'
        if (window.innerWidth < 1000) {
          m = 'moveend'
        }
        mapA.on(m, () => {
          // throttle(() => {
          if (!syncing) {
            syncing = true
            mapB.setCenter(mapA.getCenter())
            mapB.setZoom(mapA.getZoom())
            mapB.setBearing(mapA.getBearing())
            if (vm.$store.state.isPitch) mapB.setPitch(mapA.getPitch())
            syncing = false
          }
          // }, 100); // 100msの間隔で発火
        })
        mapB.on(m, () => {
          // throttle(() => {
          if (!syncing) {
            syncing = true
            mapA.setCenter(mapB.getCenter())
            mapA.setZoom(mapB.getZoom())
            mapA.setBearing(mapB.getBearing())
            if (vm.$store.state.isPitch) mapA.setPitch(mapB.getPitch())
            syncing = false
          }
          // }, 100); // 100msの間隔で発火
        })
      }
      syncMaps(this.$store.state.map01, this.$store.state.map02)
      // --------------
      const pointer1 = document.getElementById('pointer1')
      const pointer2 = document.getElementById('pointer2')
      // マップ1のマウス移動イベントでポインターを同期
      const map1 = this.$store.state.map01
      const map2 = this.$store.state.map02
      map1.on('mousemove', (e) => {
        const bounds = map1.getContainer().getBoundingClientRect()
        const x = e.originalEvent.clientX - bounds.left
        const y = e.originalEvent.clientY - bounds.top

        // map1のポインター位置を更新
        pointer1.style.left = `${x}px`
        pointer1.style.top = `${y}px`
        pointer1.style.display = 'none'

        // 同じ位置をmap2に変換
        const lngLat = map1.unproject([x, y])
        const projectedPoint = map2.project(lngLat)
        pointer2.style.left = `${projectedPoint.x}px`
        pointer2.style.top = `${projectedPoint.y}px`
        pointer2.style.display = 'block'
      })

      // マップ2のマウス移動イベントでポインターを同期
      map2.on('mousemove', (e) => {
        const bounds = map2.getContainer().getBoundingClientRect()
        const x = e.originalEvent.clientX - bounds.left
        const y = e.originalEvent.clientY - bounds.top

        // map2のポインター位置を更新
        pointer2.style.left = `${x}px`
        pointer2.style.top = `${y}px`
        pointer2.style.display = 'none'

        // 同じ位置をmap1に変換
        const lngLat = map2.unproject([x, y])
        const projectedPoint = map1.project(lngLat)
        pointer1.style.left = `${projectedPoint.x}px`
        pointer1.style.top = `${projectedPoint.y}px`
        pointer1.style.display = 'block'
      })

      // map1のクリックイベント
      // map1.on('click', (e) => {
      //   if (syncing) return  // 同期中の場合は再帰呼び出しを防ぐ
      //   syncing = true
      //   const coordinates = e.lngLat
      //   // map2のクリックイベントをプログラムで発生させる
      //   map2.fire('click', { lngLat: coordinates })
      //   syncing = false
      // })
      //
      // // map2のクリックイベント
      // map2.on('click', (e) => {
      //   if (syncing) return  // 同期中の場合は再帰呼び出しを防ぐ
      //   syncing = true
      //   const coordinates = e.lngLat
      //   // map1のクリックイベントをプログラムで発生させる
      //   map1.fire('click', { lngLat: coordinates })
      //   syncing = false
      // })

      map.on("zoom", () => {
        if (map.getZoom() <= 4.5) {
          document.querySelector('#map00').style.backgroundColor = 'black'
        } else {
          document.querySelector('#map00').style.backgroundColor = 'rgb(194,210,251)'
        }
      });
      // -----------------------------------------------------------------------------------------------------------------
      // on load
      this.mapNames.forEach(mapName => {
        const map = this.$store.state[mapName]
        const params = this.parseUrlParams()
        map.on('load', () => {

          // map.on("mousemove", "oh-amx-a-fude", (e) => {
          //   if (e.features.length > 0) {
          //     let feature = e.features[0];
          //     let newProperties = {};
          //
          //     Object.keys(feature.properties).forEach(key => {
          //       console.log(key,feature.properties[key].replace(/_/gi, ""))
          //       newProperties[key] = feature.properties[key].replace(/_/gi, "");
          //     });
          //
          //     // feature.id がない場合、プロパティのハッシュを一意キーとして使用
          //     let featureKey = JSON.stringify(feature.properties);
          //
          //     console.log("Feature Key:", featureKey); // 取得されたキーを確認
          //
          //     map.setFeatureState(
          //         { source: "amx-a-2024-pmtiles", sourceLayer: "fude", id: featureKey },
          //         newProperties
          //     );
          //     // 確認用: 状態が適用されたか取得する
          //     setTimeout(() => {
          //       let state = map.getFeatureState({
          //         source: "amx-a-2024-pmtiles",
          //         sourceLayer: "fude",
          //         id: featureKey
          //       });
          //       console.log("Updated Feature State:", state);
          //     }, 100); // 少し待ってから取得
          //   }
          // });
          //
          // map.on("mouseleave", "oh-amx-a-fude", () => {
          //   map.removeFeatureState({ source: "amx-a-2024-pmtiles", sourceLayer: "fude" });
          // });



          map.setProjection({"type": "globe"})
          map.resize()

          // const attributionButton = document.querySelector('#' + mapName +' .maplibregl-ctrl-attrib-button');
          // if (attributionButton) {
          //   attributionButton.click(); // 初期状態で折りたたむ
          // }

          // // 二画面-----------------------------------------------------------
          // if (mapName === 'map02') {
          //   if (params.split === 'true') {
          //     this.mapFlg.map02 = true
          //     if (window.innerWidth > 1000) {
          //       this.mapSize.map01.width = '50%'
          //       this.mapSize.map01.height = '100%'
          //     } else {
          //       this.mapSize.map01.width = '100%'
          //       this.mapSize.map01.height = '50%'
          //       this.mapSize.map02.width = '100%'
          //       this.mapSize.map02.height = '50%'
          //       this.mapSize.map02.top = '50%'
          //     }
          //   }
          // }
          // ----------------------------------------------------------------
          if (params.simaTextForUser) {
            this.$store.state.simaTextForUser = params.simaTextForUser
          }

          if (params.isWindow) {
            this.$store.state.isWindow2 = JSON.parse(params.isWindow)
          }
          if (params.vector) {
            this.$store.state.uploadedVector = JSON.parse(params.vector)
          }

          if (params.clickGeojsonText) {
            this.$store.state.clickGeojsonText = params.clickGeojsonText
          }

          if (params.drawGeojsonText) {
            this.$store.state.drawGeojsonText = params.drawGeojsonText
            const geojson = JSON.parse(this.$store.state.drawGeojsonText);
            drawInstance.addFeatures(geojson);
            drawControl.recalc()
          }

          if (params.gpxText) {
            this.$store.state.gpxText = params.gpxText
          }

          if (params.dxfText) {
            this.$store.state.dxfText = JSON.parse(params.dxfText)
          }

          if (params.geojsonText) {
            this.$store.state.geojsonText = params.geojsonText
          }

          if (params.kmlText) {
            this.$store.state.kmlText = params.kmlText
          }

          try {
            this.$store.state.extLayer = JSON.parse(params.extLayer).layer
            this.$store.state.extLayerName = JSON.parse(params.extLayer).name
          } catch (e) {
            console.log(e)
          }

          if (params.image) {
            this.$store.state.uploadedImage = JSON.parse(params.image)
          }

          if (params.simaText) {
            this.$store.state.simaText = params.simaText
          }

          if (params.chibans) {
            JSON.parse(params.chibans).forEach(c => {
              this.$store.state.highlightedChibans.add(c)
            })
          }

          if (params.slj) {
            const mapNames = ['map01', 'map02']
            mapNames.forEach(mapName => {
              params.slj[mapName].forEach(slj => {
                const layerNames = []
                let count = 0;
                // レイヤーを探索して必要な情報を取得する関数
                function traverseLayers(layers, slj) {
                  layers.forEach(layer => {
                    if (layer.nodes) {
                      // 子ノードがある場合は再帰的に処理
                      layer.nodes.forEach(node => {
                        if (node.nodes) {
                          traverseLayers([node], slj); // 再帰処理
                        } else {
                          // 子ノードがない場合の処理
                          if (node.id === slj.id) {
                            slj.label = node.label
                            slj.source = node.source
                            slj.sources = node.sources
                            slj.layers = node.layers
                            slj.attribution = node.attribution
                            slj.info = node.info
                          }
                          layerNames.push(node.label)
                          count++
                        }
                      });
                    } else {
                      // 子ノードがない場合の処理
                      if (layer.id === slj.id) {
                        slj.label = layer.label
                        slj.source = layer.source
                        slj.sources = layer.sources
                        slj.layers = layer.layers
                        slj.attribution = layer.attribution
                        slj.info = layer.info
                      }
                      layerNames.push(layer.label)
                      count++;
                    }
                  });
                }
                // レイヤーの探索を開始
                const layers = Layers.layers[mapName];
                traverseLayers(layers, slj);
                // 必要であれば処理結果のログを出力
                // console.log(layerNames)
                const uniqueLayerNames = [...new Set(layerNames)]
                // console.log(uniqueLayerNames.join('\n'));
                console.log(`Processed ${count} layers for map: ${mapName}`);
              });
              const result = params.slj[mapName].find(v => v.id === 'oh-extLayer')
              if (result) {
                extSource.obj.tiles = [this.$store.state.extLayer]
                result.sources = [extSource]
                result.layers = [extLayer]
                result.label = this.$store.state.extLayerName
              }
            });
          } else {
            this.s_selectedLayers[mapName].unshift(
                // {
                //   id: 'oh-vector-layer-mono',
                //   label: '地理院ベクター・モノクロ',
                //   sources: monoSources,
                //   layers: monoLayers,
                //   opacity: 1,
                //   visibility: true,
                // }
                {
                  id: 'oh-vector-layer-osm-bright',
                  label: 'OSMベクター',
                  sources: osmBrightSources,
                  layers: osmBrightLayers,
                  opacity: 1,
                  visibility: true,
                  attribution: '© <a href="https://wiki.openstreetmap.org/wiki/Japan/OSMFJ_Tileserver" target="_blank">OpenStreetMap</a> contributors',
                }
            )
          }

          let fetchFlg = false;
          async function processUserLayers(mapArray) {
            const promises = mapArray.map(async (v) => {
              console.log(v.id);

              if (v.id.includes('usertile')) {
                fetchFlg = true;
                const layerId = v.id.split('-')[2];
                try {
                  const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userTileSelectById.php', {
                    params: { id: layerId }
                  });
                  if (response.data.error) {
                    console.error('エラー:', response.data.error);
                    alert(`エラー: ${response.data.error}`);
                  } else {
                    const source = {
                      id: response.data[0].name + '-source',
                      obj: { type: 'raster', tiles: [response.data[0].url] }
                    };
                    const layer = {
                      id: 'oh-' + response.data[0].name + '-layer',
                      type: 'raster',
                      source: response.data[0].name + '-source'
                    };
                    v.sources = [source];
                    v.layers = [layer];
                    v.label = response.data[0].name;
                  }
                } catch (error) {
                  console.error('フェッチエラー:', error);
                }
              }

              if (v.id.includes('oh-sima-')) {
                fetchFlg = true;
                const layerId = v.id.split('-')[2];
                try {
                  const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userSimaSelectById.php', {
                    params: { id: layerId }
                  });
                  if (response.data.error) {
                    console.error('エラー:', response.data.error);
                    alert(`エラー: ${response.data.error}`);
                  } else {
                    const name = response.data[0].name;
                    const id = response.data[0].id;
                    const url = response.data[0].url;
                    const zahyokei = response.data[0].zahyokei;
                    const simaText = response.data[0].simatext;
                    // alert(simaText)
                    async function aaa() {
                      const sourceAndLayers = await userSimaSet(name, url, id, zahyokei, simaText)
                      store.state.geojsonSources.push({
                        sourceId: sourceAndLayers.source.id,
                        source: sourceAndLayers.source
                      })
                      console.log(sourceAndLayers.layers)
                      v.source = sourceAndLayers.source.id;
                      v.layers = sourceAndLayers.layers;
                      v.label = name;
                      vm.$store.state.simaTextForUser = JSON.stringify({
                        text: simaText,
                        opacity:JSON.parse(vm.$store.state.simaTextForUser).opacity
                      })
                      vm.s_simaOpacity = JSON.parse(vm.$store.state.simaTextForUser).opacity
                      vm.$store.state.snackbar = true
                    }
                    await aaa()
                  }
                } catch (error) {
                  console.error('フェッチエラー:', error);
                }
              }

              if (v.id.includes('oh-kmz-')) {
                fetchFlg = true;
                const layerId = v.id.split('-')[2];
                try {
                  const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userKmzSelectById.php', {
                    params: { id: layerId }
                  });
                  if (response.data.error) {
                    console.error('エラー:', response.data.error);
                    alert(`エラー: ${response.data.error}`);
                  } else {
                    const name = response.data[0].name;
                    const id = response.data[0].id;
                    const url = response.data[0].url;
                    async function aaa() {
                      const sourceAndLayers = await userKmzSet(name, url, id)
                      store.state.geojsonSources.push({
                        sourceId: sourceAndLayers.source.id,
                        source: sourceAndLayers.source
                      })
                      v.source = sourceAndLayers.source.id;
                      v.layers = sourceAndLayers.layers;
                      v.label = name;
                    }
                    await aaa()
                  }
                } catch (error) {
                  console.error('フェッチエラー:', error);
                }
              }

              if (v.id.includes('oh-vpstile-')) {
                fetchFlg = true;
                const layerId = v.id.split('-')[2];
                try {
                  const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userXyztileSelectById.php', {
                    params: { id: layerId }
                  });
                  if (response.data.error) {
                    console.error('エラー:', response.data.error);
                    alert(`エラー: ${response.data.error}`);
                  } else {
                    const name = response.data[0].name;
                    const id = response.data[0].id;
                    const url = response.data[0].url;
                    const bbox = JSON.parse(response.data[0].bbox);
                    const bounds = [bbox[0], bbox[1], bbox[2], bbox[3]];
                    const transparent = JSON.parse(response.data[0].transparent);
                    let tile = ''
                    if (transparent !== 0) {
                      tile = 'transparentBlack://' + url
                    } else {
                      tile = url
                    }
                    const source = {
                      id: 'oh-vpstile-' + id + '-' + name + '-source',
                      obj: { type: 'raster', tiles: [tile], bounds: bounds, maxzoom: 26 }
                    };
                    const layer = {
                      id: 'oh-vpstile-' + id + '-' + name + '-layer',
                      type: 'raster',
                      source: 'oh-vpstile-' + id + '-' + name + '-source'
                    };
                    v.sources = [source];
                    v.layers = [layer];
                    v.label = response.data[0].name;
                  }
                } catch (error) {
                  console.error('フェッチエラー:', error);
                }
              }

              if (v.id.includes('oh-chiban-')) {
                fetchFlg = true
                const layerId = v.id.split('-')[2];
                try {
                  const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtilesSelectById.php', {
                    params: { id: layerId }
                  });
                  if (response.data.error) {
                    console.error('エラー:', response.data.error);
                    alert(`エラー: ${response.data.error}`);
                  } else {
                    console.log('取得データ:', response.data);
                    console.log(JSON.stringify(response.data, null, 2));

                    const name = response.data[0].name
                    const id = response.data[0].id
                    const url = response.data[0].url
                    const chiban = response.data[0].chiban

                    const source = {
                      id: 'oh-chiban-' + id + '-' + name + '-source',obj: {
                        type: 'vector',
                        url: "pmtiles://" + url
                      }
                    };
                    const polygonLayer = {
                      id: 'oh-chiban-' + id + '-' + name + '-layer',
                      type: 'fill',
                      source: 'oh-chiban-' + id + '-' + name + '-source',
                      "source-layer": 'oh3',
                      'paint': {
                        'fill-color': 'rgba(0,0,0,0)',
                      },
                    }
                    const lineLayer = {
                      id: 'oh-chibanL-' + name + '-line-layer',
                      source: 'oh-chiban-' + id + '-' + name + '-source',
                      type: 'line',
                      "source-layer": "oh3",
                      paint: {
                        'line-color': 'navy',
                        'line-width': [
                          'interpolate',
                          ['linear'],
                          ['zoom'],
                          1, 0.1,
                          16, 2
                        ]
                      },
                    }
                    const labelLayer = {
                      id: 'oh-chibanL-' + name + '-label-layer',
                      type: "symbol",
                      source: 'oh-chiban-' + id + '-' + name + '-source',
                      "source-layer": "oh3",
                      'layout': {
                        'text-field': ['get', chiban],
                        'text-font': ['NotoSansJP-Regular'],
                      },
                      'paint': {
                        'text-color': 'navy',
                        'text-halo-color': 'rgba(255,255,255,1)',
                        'text-halo-width': 1.0,
                      },
                      'minzoom': 17
                    }
                    const pointLayer = {
                      id: 'oh-chibanL-' + name + '-point-layer',
                      type: "circle",
                      source: 'oh-chiban-' + id + '-' + name + '-source',
                      "source-layer": "oh3",
                      filter: ["==", "$type", "Point"],
                      paint: {
                        'circle-color': 'rgba(255,0,0,1)',
                        'circle-radius': 5,
                        'circle-opacity': 1,
                        'circle-stroke-width': 1,
                        'circle-stroke-color': '#fff'
                      },
                    };
                    const vertexLayer = {
                      id: 'oh-chibanL-' + name + '-vertex-layer',
                      type: "circle",
                      source: 'oh-chiban-' + id + '-' + name + '-source',
                      filter: ["==", "$type", "Polygon"],
                      "source-layer": "oh3",
                      paint: {
                        'circle-radius': [
                          'interpolate', ['linear'], ['zoom'],
                          15, 0,
                          18,4
                        ],
                        'circle-color': 'red',
                      }
                    };
                    v.sources = [source];
                    v.layers = [polygonLayer,lineLayer,labelLayer,vertexLayer,pointLayer]
                    v.label = response.data[0].name;
                  }
                } catch (error) {
                  console.error('フェッチエラー:', error);
                }
              }
            });
            return Promise.all(promises);
          }

          async function fetchAllUserLayers() {
            await Promise.all([
              processUserLayers(params.slj.map01),
              processUserLayers(params.slj.map02)
            ]);
            vm.s_selectedLayers = params.slj;
          }

          // 非同期関数を実行
          if (params.slj) fetchAllUserLayers();
          if (params.slj) {
            if (!fetchFlg) this.s_selectedLayers = params.slj
          }

          this.s_selectedLayers.map01 = this.s_selectedLayers.map01.filter(layer => layer.id !== 'oh-konzyaku-layer')

          // ----------------------------------------------------------------

          // const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol, {
          //   tileUrl: 'https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png',
          //   maxzoom: 17,
          //   attribution: '<a href="https://gbank.gsj.jp/seamless/elev/">産総研シームレス標高タイル</a>'
          // });
          // const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);
          // map.addSource(gsiTerrainSource)




          // 標高タイルソース---------------------------------------------------
          // map.addSource("gsidem-terrain-rgb", {
          //   type: 'raster-dem',
          //   tiles: ['https://xs489works.xsrv.jp/raster-tiles/gsi/gsi-dem-terrain-rgb/{z}/{x}/{y}.png'],
          //   // tiles: ['https://mapdata.qchizu2.xyz/03_dem/51_int/all_9999/int_01/{z}/{x}/{y}.png'],
          //   attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html#dem" target="_blank">地理院タイル(標高タイル)</a>',
          //   tileSize: 256,
          // })
          // 標高タイルセット
          // map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel });
          const vm = this
          if (isNaN(vm.s_terrainLevel)) vm.s_terrainLevel = 1

          // document.querySelector('#' + mapName + ' .terrain-btn-up,terrain-btn-down').addEventListener('mouseover', function() {
          //   const layers = map.getStyle().layers
          //   if (!layers.find(layer => {
          //         return layer.id.indexOf('height') !== -1
          //       }
          //   )) {
          //     map.setTerrain({'source': 'terrain', 'exaggeration': vm.s_terrainLevel})
          //   } else {
          //     map.setTerrain(null)
          //   }
          // }, false);
          document.querySelector('#' + mapName + ' .terrain-btn-up,terrain-btn-down').addEventListener('pointerdown', function() {
            const layers = map.getStyle().layers
            if (!layers.find(layer => {
                  return layer.id.indexOf('height') !== -1
                }
            )) {
              map.setTerrain({'source': 'terrain', 'exaggeration': vm.s_terrainLevel})
            } else {
              map.setTerrain(null)
            }
          }, false);


          // document.querySelector('.terrain-btn-up,terrain-btn-down').addEventListener('mouseover', function() {
          //   map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': vm.s_terrainLevel })
          // }, false);
          // document.querySelector('.terrain-btn-up,terrain-btn-down').addEventListener('pointerdown', function() {
          //   map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': vm.s_terrainLevel })
          // }, false);



          // addEventListener('keydown', function () {
          //   map.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': vm.s_terrainLevel })
          // })
          // 標高タイルソース---------------------------------------------------
          // map.addSource("aws-terrain", {
          //   type: "raster-dem",
          //   minzoom: 1,
          //   maxzoom: 15,
          //   // このソースが使用するエンコーディング。terrarium（Terrarium形式のPNGタイル）、mapbox（Mapbox Terrain RGBタイル）、custom のいずれか
          //   encoding: "terrarium",
          //   tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
          // })
          // // 標高タイルセット
          // map.setTerrain({ 'source': 'aws-terrain', 'exaggeration': this.s_terrainLevel });

          // Skyレイヤ
          if (mapName === 'map01') {
            map.setSky({
              "sky-color": "#199EF3",
              "sky-horizon-blend": 0.7,
              "horizon-color": "#f0f8ff",
              "horizon-fog-blend": 0.8,
              "fog-color": "#2c7fb8",
              "fog-ground-blend": 0.9,
              "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 0]
            })
          } else {
            map.setSky({
              "sky-color": "#199EF3",
              "sky-horizon-blend": 0.71,//少し変えるとskayが反映するようになる。謎。
              "horizon-color": "#f0f8ff",
              "horizon-fog-blend": 0.8,
              "fog-color": "#2c7fb8",
              "fog-ground-blend": 0.9,
              "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 0]
            })
          }
          // -----------------------------------------------------------------------------------------------------------
          // ここを改善
          // map.on('moveend', this.updatePermalink)
          map.on('click', this.updatePermalink)
          map.on('dragend', this.updatePermalink)
          // map.on('zoomend', this.updatePermalink)
          map.on('idle', this.updatePermalink)

          // map.on('dragend', () => {
          //   this.$store.state.osmFire = !this.$store.state.osmFire
          // })
          // map.on('zoomend', () => {
          //   this.$store.state.osmFire = !this.$store.state.osmFire
          // })

          // let previousBounds = null;

          // デバウンス関数
          function debounce(func, delay) {
            let timer;
            return function (...args) {
              clearTimeout(timer);
              timer = setTimeout(() => func.apply(this, args), delay);
            };
          }

          // マップ範囲の変更を処理
          let previousBounds = null;
          let previousZoom = map.getZoom(); // 初期ズームレベルを取得

          const handleBoundsChange = () => {
            const currentBounds = map.getBounds();
            const currentZoom = map.getZoom();

            // ズームイン時は発火しない
            if (currentZoom > previousZoom) {
              console.log('Zoomed in - No action taken');
              previousZoom = currentZoom;
              previousBounds = currentBounds;
              return;
            }

            if (
                !previousBounds ||
                currentBounds.getNorth() > previousBounds.getNorth() ||
                currentBounds.getSouth() < previousBounds.getSouth() ||
                currentBounds.getEast() > previousBounds.getEast() ||
                currentBounds.getWest() < previousBounds.getWest()
            ) {
              // マップの範囲が拡大または移動した場合のみ発火
              console.log('Bounds expanded or moved:', currentBounds);
              this.$store.state.osmFire = !this.$store.state.osmFire;
            }

            // 現在の範囲とズームレベルを保存
            previousBounds = currentBounds;
            previousZoom = currentZoom;
          };

          // デバウンス版の関数を作成（遅延を500msに設定）
          const debouncedHandleBoundsChange = debounce(handleBoundsChange, 500);

          // イベントリスナーにデバウンス関数を適用
          map.on('dragend', debouncedHandleBoundsChange);
          map.on('zoomend', debouncedHandleBoundsChange);




          // let previousBounds = null;
          // map.on('dragend', () => {
          //   const currentBounds = map.getBounds();
          //   if (!previousBounds ||
          //       currentBounds.getNorth() > previousBounds.getNorth() ||
          //       currentBounds.getSouth() < previousBounds.getSouth() ||
          //       currentBounds.getEast() > previousBounds.getEast() ||
          //       currentBounds.getWest() < previousBounds.getWest()) {
          //     // マップの範囲が拡大または移動した場合のみ発火
          //     console.log('Bounds expanded or moved:', currentBounds);
          //     this.$store.state.osmFire = !this.$store.state.osmFire
          //   }
          //   // 現在の範囲を保存
          //   previousBounds = currentBounds;
          // });
          //
          // map.on('zoomend', () => {
          //   const currentBounds = map.getBounds();
          //   if (!previousBounds ||
          //       currentBounds.getNorth() > previousBounds.getNorth() ||
          //       currentBounds.getSouth() < previousBounds.getSouth() ||
          //       currentBounds.getEast() > previousBounds.getEast() ||
          //       currentBounds.getWest() < previousBounds.getWest()) {
          //     // マップの範囲が拡大または移動した場合のみ発火
          //     // console.log('Bounds expanded or moved:', currentBounds);
          //     this.$store.state.osmFire = !this.$store.state.osmFire
          //   }
          //   // 現在の範囲を保存
          //   previousBounds = currentBounds;
          // });

          // スマートフォンのとき
          if (this.s_isSmartPhone) {
            map.dragRotate.disable()
            map.touchZoomRotate.disableRotation()
          }

          map.on('move', async () => {
            const center = map.getCenter(); // マップの中心座標を取得
            const lon = center.lng; // 経度
            const lat = center.lat; // 緯度
            // const zoom = Math.round(map.getZoom()); // 現在のズームレベル

            // 標高を取得
            const elevation = await fetchElevation(lon, lat);

            // 標高を画面に表示
            if (elevation !== null) {
              if (elevation <= 4000) {
                // console.log(`画面の中心標高: ${elevation.toFixed(2)}m`)
                this.elevation = `中心の標高: ${elevation.toFixed(2)}m`
              } else {
                this.elevation = ''
              }
            } else {
              this.elevation = ''
            }
          });

          //------------------------------------------------------------------------------------------------------------
          map.on('mousemove', (e) => {
            // console.log(e)
            // クリック可能なすべてのレイヤーからフィーチャーを取得
            const features = map.queryRenderedFeatures(e.point);
            if (features.length) {
              const feature = features[0]; // 最初のフィーチャーのみ取得
              const layerId = feature.layer.id;
              // console.log(layerId)
              if (layerId.indexOf('vector') !== -1) {
                if (map.getCanvas().style.cursor !== 'wait') {
                  map.getCanvas().style.cursor = 'default';
                }
              } else {
                if (map.getCanvas().style.cursor !== 'wait') {
                  map.getCanvas().style.cursor = 'pointer';
                }
              }
            } else {
              map.getCanvas().style.cursor = 'default';
              if (map.getCanvas().style.cursor !== 'wait') {
                map.getCanvas().style.cursor = 'default';
              }
            }
          });
          //------------------------------------------------------------------------------------------------------------
          // ポップアップ
          map.on('click', (e) => {
            popup(e,map,mapName,this.s_map2Flg)
          })
          map.on('mousemove', function (e) {
            mouseMoveForPopup(e,map)
          })
          //------------------------------------------------------------------------------------------------------------
          // PLATEAU建物東京都23区
          map.on('mousemove', 'oh-plateau-tokyo23ku-layer', function (e) {
            map.getCanvas().style.cursor = 'pointer'
            map.setPaintProperty(
                'oh-plateau-tokyo23ku-layer',
                'fill-extrusion-color',
                [
                  'case',
                  ['==', ['get', '建物ID'], e.features[0].properties['建物ID']],
                  'rgba(255, 0, 0, 1)', // カーソルが当たったフィーチャーの色
                  [
                    "interpolate",
                    ["linear"],
                    ["get", "measuredHeight"],
                    0, "#d9d9d9",       // 0m: グレー
                    10, "#a6bddb",      // 10m: 明るいブルー
                    30, "#74a9cf",      // 30m: 中間ブルー
                    60, "#2b8cbe",      // 60m: 濃いブルー
                    100, "#045a8d"      // 100m以上: 非常に濃いブルー
                  ]
                ]
            )
          })
          map.on('mouseleave', 'oh-plateau-tokyo23ku-layer', function () {
            map.getCanvas().style.cursor = ''
            map.setPaintProperty(
                'oh-plateau-tokyo23ku-layer',
                'fill-extrusion-color',
                [
                  "interpolate",
                  ["linear"],
                  ["get", "measuredHeight"],
                  0, "#d9d9d9",       // 0m: グレー
                  10, "#a6bddb",      // 10m: 明るいブルー
                  30, "#74a9cf",      // 30m: 中間ブルー
                  60, "#2b8cbe",      // 60m: 濃いブルー
                  100, "#045a8d"      // 100m以上: 非常に濃いブルー
                ]
            )
          })
          // -----------------------------------------------------------------------------------------------------------
          const pitch = !isNaN(this.pitch[mapName]) ? this.pitch[mapName]: 0
          if (pitch !== 0) {
            // this.$store.state[mapName].setTerrain({ 'source': 'terrain', 'exaggeration': this.s_terrainLevel })
            if (!this.s_selectedLayers[mapName].find(layer => {
                  // return layer.id === 'oh-bakumatsu-kokudaka-height'
                  return layer.id.indexOf('height') !== -1
                }
            )) {
              this.$store.state[mapName].setTerrain({ 'source': 'terrain', 'exaggeration': this.s_terrainLevel })
            } else {
              map.setTerrain(null)
            }
          }

          // -----------------------------------------------------------------------------------------------------------
          // ドラッグ&ドロップ用の要素
          const dropzone = document.getElementById('map00');
          // ドラッグイベントのリスナー追加
          document.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropzone.classList.add('active');
          });
          document.addEventListener('dragleave', (event) => {
            event.preventDefault();
            dropzone.classList.remove('active');
          });

          if (mapName === 'map01') {
            dropzone.addEventListener('drop', async(e) => {
              e.preventDefault();
              const files = e.dataTransfer.files;
              if (files.length === 0) return;
              const file = files[0]
              const fileName = file.name;
              const fileExtension = fileName.split('.').pop().toLowerCase();
              history(fileExtension + 'をDD',window.location.href)
              const reader = new FileReader();
              switch (fileExtension) {
                case 'kml':
                {
                  reader.onload = (event) => {
                    const parser = new DOMParser();
                    const kmlText = event.target.result
                    this.$store.state.kmlText = kmlText
                    const kmlData = parser.parseFromString(kmlText, 'application/xml');
                    const geojson = kml(kmlData);
                    geojsonAddLayer(map, geojson,true, fileExtension)
                  }
                  reader.readAsText(file);
                  break
                }
                case 'kmz':
                {
                  if (this.$store.state.userId) {
                    const map01 = this.$store.state.map01
                    const map02 = this.$store.state.map02
                    this.$store.state.tiffAndWorldFile = Array.from(e.dataTransfer.files);
                    reader.onload = async (event) => {
                      kmzLoadForUser (map01, true)
                      kmzLoadForUser (map02, false)
                    }
                    reader.readAsArrayBuffer(file);
                  } else {
                    reader.onload = async (event) => {
                      const zip = await JSZip.loadAsync(event.target.result);
                      const kmlFile = Object.keys(zip.files).find((name) => name.endsWith('.kml'));
                      const kmlText = await zip.files[kmlFile].async('text');
                      const parser = new DOMParser();
                      const kmlData = parser.parseFromString(kmlText, 'application/xml');
                      const geojson = kml(kmlData);
                      this.$store.state.kmlText = kmlText
                      geojsonAddLayer(map, geojson, true, fileExtension)
                    }
                    reader.readAsArrayBuffer(file);
                  }
                  break
                }
                case 'sim':
                {
                  this.$store.state.tiffAndWorldFile = Array.from(e.dataTransfer.files);
                  console.log(this.$store.state.tiffAndWorldFile)
                  reader.onload = (event) => {
                    const arrayBuffer = event.target.result; // ArrayBufferとして読み込む
                    const text = new TextDecoder("shift-jis").decode(arrayBuffer); // Shift JISをUTF-8に変換
                    // if (!this.$store.state.userId) this.ddSimaText = text
                    this.ddSimaText = text
                    this.s_dialogForSimaApp = true
                  }
                  reader.readAsArrayBuffer(file);
                  break
                }
                case 'tiff':
                case 'tif':
                case 'tfw':
                {
                  if (files.length > 1) {
                    this.$store.state.tiffAndWorldFile = Array.from(e.dataTransfer.files);
                    this.s_dialogForGeotiffApp = true
                  } else if (files.length === 1){
                    this.$store.state.tiffAndWorldFile = Array.from(e.dataTransfer.files);
                    const zahyokei = await getCRS(Array.from(e.dataTransfer.files)[0])
                    if (zahyokei) {
                      this.$store.state.zahyokei = zahyokei
                      this.dialogForGeotiffApp1file = true
                    } else {
                      this.s_dialogForGeotiff2App = true
                    }
                  }
                  break
                }
                case 'jpg':
                case 'jgw':
                {
                  if (files.length > 1) {
                    this.$store.state.tiffAndWorldFile = Array.from(e.dataTransfer.files);
                    this.s_dialogForJpgApp = true
                  } else if (files.length === 1){
                    alert('ワールドファイルが必要です。')
                  }
                  break
                }
                case 'png':
                case 'pgw':
                {
                  if (files.length > 1) {
                    this.$store.state.tiffAndWorldFile = Array.from(e.dataTransfer.files);
                    this.s_dialogForPng2App = true
                  } else if (files.length === 1){
                    if (this.$store.state.userId) {
                      this.$store.state.tiffAndWorldFile = Array.from(e.dataTransfer.files);
                      this.dialogForImagePng = true
                    } else {
                      alert('ログイン専用です。')
                    }
                  }
                  break
                }
                case 'pdf':
                {
                  if (this.$store.state.userId) {
                    this.$store.state.tiffAndWorldFile = Array.from(e.dataTransfer.files);
                    this.dialogForPdfApp = true
                  } else {
                    alert('ログイン専用です。')
                  }
                  break
                }

                case 'geojson':
                {
                  reader.onload = (event) => {
                    const geojsonText = event.target.result
                    try {
                      const geojson = JSON.parse(geojsonText);
                      if (this.$store.state.userId) {
                        const firstFeature = geojson.features[0];
                        this.shpPropaties = Object.keys(firstFeature.properties)
                        this.shpGeojson = geojson
                        this.dialogForShpApp = true
                      } else {
                        this.$store.state.geojsonText = geojsonText
                        geojsonAddLayer (map, geojson, true, fileExtension)
                      }
                    }catch (e) {
                      console.log(e)
                      alert('失敗しました。' + e)
                    }
                  }
                  reader.readAsText(file);
                  break
                }
                case 'zip':
                {
                  const files = e.dataTransfer.files;
                  for (const file of files) {
                    try {
                      this.loadingSnackbar = true
                      this.s_loading = true
                      const arrayBuffer = await file.arrayBuffer();
                      const geojson = await shp(arrayBuffer);
                      const firstFeature = geojson.features[0];
                      this.shpPropaties = Object.keys(firstFeature.properties)
                      this.shpGeojson = geojson
                      this.loadingSnackbar = false
                      this.s_loading = false
                      this.dialogForShpApp = true
                    }catch (e) {
                      alert('シェイプファイルをgeojsonに変換できませんでした。')
                      this.loadingSnackbar = false
                      this.s_loading = false
                    }
                  }
                  break
                }
                case 'dxf':
                {
                  reader.onload = async (event) => {
                    const dxfText = event.target.result;
                    // this.$store.state.dxfText = dxfText
                    this.$store.state.dxfText = {
                      text: dxfText,
                      zahyokei: ''
                    }
                    this.dialogForDxfApp = true
                  };
                  reader.readAsText(file);
                  break
                }
                case 'gpx':
                {
                  const file = e.dataTransfer.files[0];
                  const gpxText = await file.text();
                  this.$store.state.gpxText = gpxText
                  const parser = new DOMParser();
                  const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
                  const geojson = gpx(gpxDoc);
                  geojsonAddLayer (map, geojson, true, fileExtension)
                  break
                }
                case 'xml':
                {
                  const file = e.dataTransfer.files[0];
                  if (file && file.type === 'text/xml') {
                    const xmlText = await file.text();
                    let geojson = xmlToGeojson(xmlText);
                    geojson = transformGeoJSONToEPSG4326(geojson)
                    geojsonAddLayer (map, geojson, true, fileExtension)
                  } else {
                    alert('XMLファイルをドロップしてください');
                  }
                  break
                }
                default:
                  alert(fileExtension + 'は対応していません。')
              }
            });
          }

          let isCursorOnFeature = false;
          let isDragging = false;
          let draggedFeatureId = null;

          map.on('mousemove', function (e) {
            const features = map.queryRenderedFeatures(e.point, { layers: ['click-points-layer'] });
            if (features.length > 0) {
              isCursorOnFeature = true;
              map.getCanvas().style.cursor = 'pointer';
            } else {
              isCursorOnFeature = false;
              // map.getCanvas().style.cursor = '';
            }
          });

          map.on('mousedown', function (e) {
            const features = map.queryRenderedFeatures(e.point, { layers: ['click-points-layer'] });
            if (features.length > 0) {
              isDragging = true;
              draggedFeatureId = features[0].id;
              map.getCanvas().style.cursor = 'grabbing';
              e.preventDefault();
            }
          });

          map.on('mousemove', async function (e) {
            if (!isDragging || draggedFeatureId === null) return;

            const source = map.getSource('click-points-source');
            if (!source) return;

            const currentData = source._data;
            if (!currentData) return;

            let elevation = await fetchElevation(e.lngLat.lng, e.lngLat.lat);
            if (!elevation) elevation = 0

            const feature = currentData.features.find(f => f.id === draggedFeatureId);
            if (feature) {
              feature.geometry.coordinates = [e.lngLat.lng, e.lngLat.lat, elevation];
              source.setData(currentData);
              map.getCanvas().style.cursor = 'grabbing';
              vm.$store.state.clickGeojsonText = JSON.stringify(currentData)
            }
          });

          map.on('mouseup', function () {
            if (isDragging) {
              isDragging = false;
              draggedFeatureId = null;
              map.getCanvas().style.cursor = 'pointer';
            }
          });

          map.on('click', async function (e) {
            if (isDragging) return; // ドラッグ中のクリックを防止
            const visibility = map.getLayoutProperty('click-points-layer', 'visibility');
            if (visibility === 'none') {
              return;
            }
            const source = map.getSource('click-points-source');
            if (!source) return;
            if (isCursorOnFeature) return;
            const currentData = source._data || {
              type: 'FeatureCollection',
              features: []
            };
            const clickedLng = e.lngLat.lng
            const clickedLat = e.lngLat.lat

            let elevation = await fetchElevation(e.lngLat.lng, e.lngLat.lat);
            if (!elevation) elevation = 0

            const newFeature = {
              type: 'Feature',
              id: currentData.features.length,
              geometry: {
                type: 'Point',
                coordinates: [clickedLng, clickedLat, elevation]
              },
              properties: {
                id: Math.random().toString().slice(2, 6),
              }
            };
            currentData.features.push(newFeature);
            source.setData(currentData);
            vm.$store.state.clickGeojsonText = JSON.stringify(currentData)
          });

          // -----------------------------------------------------------------------------------------------------------
          map.addSource('zones-source', {
            type: 'vector',
            url: 'pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/zahyokei/zahyokei.pmtiles',
          });

          map.addLayer({
            id: 'zones-layer',
            type: 'fill',
            source: 'zones-source',
            'source-layer': 'polygon',
            paint: {
              'fill-color': '#0080',
              'fill-opacity': 0
            }
          });

          setTimeout(() => {
            const center = map.getCenter();
            const centerPoint = map.project([center.lng, center.lat]);
            // 画面中心地点でのフィーチャークエリ
            const features = map.queryRenderedFeatures(centerPoint, {
              layers: ['zones-layer']
            });
            if (features.length > 0) {
              const zoneFeature = features[0];
              const zone = zoneFeature.properties.zone;
              this.$store.state.zahyokei = '公共座標' + zone + '系';
              console.log(this.$store.state.zahyokei);
            }
          },1000)
          map.on('moveend', () => {
            const center = map.getCenter();
            const centerPoint = map.project([center.lng, center.lat]);
            // 画面中心地点でのフィーチャークエリ
            const features = map.queryRenderedFeatures(centerPoint, {
              layers: ['zones-layer']
            });
            if (features.length > 0) {
              const zoneFeature = features[0];
              const zone = zoneFeature.properties.zone;
              this.$store.state.zahyokei = '公共座標' + zone + '系';
            } else {
              // console.log('画面中心地点は座標系ゾーンに該当しません。');
              this.$store.state.zahyokei = '';
            }
          });

          // -----------------------------------------------------------------------------------------------------------
          // マップ上でポリゴンをクリックしたときのイベントリスナー
          let highlightCounter = 0;
          map.on('click', 'oh-amx-a-fude', (e) => {
            console.log(this.$store.state.highlightedChibans)
            // this.$store.state.highlightedChibans = new Set()
            if (e.features && e.features.length > 0) {
              // const targetId = `${e.features[0].properties['丁目コード']}_${e.features[0].properties['小字コード']}_${e.features[0].properties['地番']}`;
              const targetId = `${e.features[0].properties['地番区域']}_${e.features[0].properties['地番']}`;
              console.log(targetId);
              console.log(this.$store.state.highlightedChibans)
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeatures(map,'oh-amx-a-fude');
            }
          });
          map.on('click', 'oh-chibanzu2024', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['id']}`;
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,'oh-chibanzu2024');
            }
          });
          map.on('click', 'oh-fukushimachiban', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['X']}_${e.features[0].properties['Y']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
                console.log(this.$store.state.highlightedChibans)
              }
              highlightSpecificFeaturesCity(map,'oh-fukushimachiban');
            }
          });
          map.on('click', 'oh-iwatapolygon', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['SKSCD']}_${e.features[0].properties['AZACD']}_${e.features[0].properties['TXTCD']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,'oh-iwatapolygon');
            }
          });
          map.on('click', 'oh-narashichiban', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['土地key']}_${e.features[0].properties['大字cd']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,'oh-narashichiban');
            }
          });
          map.on('click', 'oh-kitahiroshimachiban', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['Aza']}_${e.features[0].properties['Chiban']}_${e.features[0].properties['Edaban']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,'oh-kitahiroshimachiban');
            }
          });
          map.on('click', 'oh-kunitachishi', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['id']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,'oh-kunitachishi');
            }
          });
          map.on('click', 'oh-fukuokashichiban', (e) => {
            if (e.features && e.features.length > 0) {
              const targetId = `${e.features[0].properties['id']}`;
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,'oh-fukuokashichiban');
            }
          });


          console.log(this.$store.state.uploadedImage)

          if (this.$store.state.uploadedImage) {

            // async function fetchFile(url) {
            //   try {
            //     // Fetchリクエストでファイルを取得
            //     const response = await fetch(url);
            //     // レスポンスが成功したか確認
            //     if (!response.ok) {
            //       throw new Error(`HTTPエラー! ステータス: ${response.status}`);
            //     }
            //     // Blobとしてレスポンスを取得
            //     const blob = await response.blob();
            //     // BlobをFileオブジェクトに変換
            //     const file = new File([blob], "downloaded_file" + mapName, { type: blob.type });
            //     console.log("Fileオブジェクトが作成されました:", file);
            //     return file;
            //   } catch (error) {
            //     console.error("ファイルの取得中にエラーが発生しました:", error);
            //   }
            // }
            //
            // const imageUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).image
            // const worldFileUrl = 'https://kenzkenz.xsrv.jp/open-hinata3/php/image/' + JSON.parse(this.$store.state.uploadedImage).worldFile
            // console.log(imageUrl)
            // console.log(worldFileUrl)
            // // console.log(fetchFile(imageUrl))
            // Promise.all([fetchFile(imageUrl), fetchFile(worldFileUrl)]).then(files => {
            //   if (files.every(file => file)) {
            //     console.log("両方のファイルが取得されました:", files);
            //     const image = files[0]
            //     console.log(image)
            //     const worldFile = files[1]
            //     const code = JSON.parse(this.$store.state.uploadedImage).code
            //     // alert(8888)
            //     addImageLayer(map, mapName, image, worldFile, code, false)
            //   } else {
            //     console.warn("一部のファイルが取得できませんでした。");
            //   }
            // }).catch(error => {
            //   console.error("Promise.allでエラーが発生しました:", error);
            // });
          }
        })
        // on loadここまで-------------------------------------------------------------
        const layers = ['oh-chibanzu-室蘭市', 'oh-chibanzu-ニセコ町', 'oh-chibanzu-音更町',
          'oh-chibanzu-鹿角市', 'oh-chibanzu-舟形町', 'oh-chibanzu-利根町','oh-chibanzu-小平市',
          'oh-chibanzu-町田市','oh-chibanzu-静岡市','oh-chibanzu-磐田市','oh-chibanzu-半田市',
          'oh-chibanzu-京都市','oh-chibanzu-長岡京市','oh-chibanzu-岸和田市','oh-chibanzu-泉南市',
          'oh-chibanzu-西宮市','oh-chibanzu-加古川市','oh-chibanzu-佐用町','oh-chibanzu-奈良市',
          'oh-chibanzu-坂出市','oh-chibanzu-善通寺市','oh-chibanzu-長与町','oh-chibanzu-福島市',
          'oh-chibanzu-北広島市','oh-chibanzu-国立市','oh-chibanzu-福岡市','oh-chibanzu-越谷市',
          'oh-chibanzu-福山市','oh-chibanzu-深谷市','oh-chibanzu-伊丹市','oh-chibanzu-豊中市',
          'oh-chibanzu-姫路市','oh-chibanzu-仙台市','oh-chibanzu-高崎市'];
        layers.forEach(layer => {
          map.on('click', layer, (e) => {
            if (e.features && e.features.length > 0) {
              let targetId
              if (e.features[0].properties['id'] !== undefined) {
                targetId = `${e.features[0].properties['id']}`;
              } else {
                targetId = `${e.features[0].properties['oh3id']}`;
              }
              console.log('Clicked ID', targetId);
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                vm.$store.state.highlightedChibans.delete(targetId);
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
              }
              highlightSpecificFeaturesCity(map,layer);
            }
          });
        });

      //   map.on('sourcedata', (e) => {
      //     console.log(77777777777777777)
      //     // if (e.sourceId && map.getStyle().layers) {
      //     //   const targetLayers = map.getStyle().layers
      //     //       .filter(layer => layer.id.startsWith('oh-chiban-') && !registeredLayers.has(layer.id))
      //     //       .map(layer => layer.id);
      //     //   console.log(targetLayers)
      //     //   targetLayers.forEach(layer => {
      //     //     console.log(`Adding click event to layer: ${layer}`);
      //     //     map.on('click', layer, (e) => {
      //     //       console.log(6666666666)
      //     //       if (e.features && e.features.length > 0) {
      //     //         console.log(555555555)
      //     //         const targetId = `${e.features[0].properties['oh3id']}`;
      //     //         console.log('Clicked ID', targetId);
      //     //         if (this.$store.state.highlightedChibans.has(targetId)) {
      //     //           // すでに選択されている場合は解除
      //     //           this.$store.state.highlightedChibans.delete(targetId);
      //     //         } else {
      //     //           // 新しいIDを追加
      //     //           this.$store.state.highlightedChibans.add(targetId);
      //     //         }
      //     //         highlightSpecificFeaturesCity(map, layer);
      //     //       }
      //     //     });
      //     //   });
      //     // }
      //   });
      // // すでに登録されたレイヤーを追跡するセット
      //   const registeredLayers = new Set();

        this.compass = new CompassControl({
          visible: false // ボタンを非表示にする
        })
        map.addControl(this.compass)




        //on load終了----------------------------------------------------------------------------------------------------
      })
    }
  },
  created() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    console.log(/android/i.test(userAgent))
    this.$store.state.isAndroid = /android/i.test(userAgent);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.onResize);
  },
  mounted() {
    // this.$store.state.highlightedChibans = new Set()
    const vm = this

    window.addEventListener("resize", this.onResize);

    if (window.innerWidth < 500) {
      this.s_isSmartPhone = true
      this.terrainBtnClos()
    }


    // -----------------------------------------------------------------------------------------------------------------
    this.mapNames.forEach(mapName => {
      const myDiv = document.getElementById("terrain-btn-div-" + mapName)
      let startY = 0;      // マウスまたはタッチの初期Y座標
      let startX = 0;      // マウスまたはタッチの初期X座標
      let startBottom = 0; // divの初期bottom位置
      let startRight = 0;  // divの初期right位置
      let isDragging = false;

      // ドラッグ開始（マウスまたはタッチ）
      function startDrag(e) {
        isDragging = true;
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        startY = clientY;
        startX = clientX;
        startBottom = parseInt(window.getComputedStyle(myDiv).bottom, 10);
        startRight = parseInt(window.getComputedStyle(myDiv).right, 10);
        myDiv.style.cursor = "grabbing";
        e.preventDefault(); // タッチ時のスクロール防止
      }

      // ドラッグ中（マウスまたはタッチ）
      function drag(e) {
        if (isDragging) {
          const clientX = e.clientX || e.touches[0].clientX;
          const clientY = e.clientY || e.touches[0].clientY;
          const deltaY = startY - clientY;
          const deltaX = startX - clientX;
          myDiv.style.bottom = `${startBottom + deltaY}px`;
          myDiv.style.right = `${startRight + deltaX}px`;
        }
      }

      // ドラッグ終了（マウスまたはタッチ）
      function endDrag() {
        isDragging = false;
        myDiv.style.cursor = "grab";
      }

      // イベントリスナーの追加（マウスとタッチの両方に対応）
      myDiv.addEventListener("mousedown", startDrag);
      document.addEventListener("mousemove", drag);
      document.addEventListener("mouseup", endDrag);

      myDiv.addEventListener("touchstart", startDrag);
      document.addEventListener("touchmove", drag);
      document.addEventListener("touchend", endDrag);
    })
    // -----------------------------------------------------------------------------------------------------------------
    pyramid()
    //------------------------------------------------------------------------------------------------------------------
    document.addEventListener('touchmove', function (event) {
      if (event.scale !== 1) {
        event.preventDefault();
      }
    }, { passive: false });
    //------------------------------------------------------------------------------------------------------------------
    const params = new URLSearchParams(window.location.search)
    let urlid = params.get('s')
    if (urlid === 'jIdukg') urlid = '2O65Hr' //以前のリンクを活かす
    if (urlid === 'da0J4l') urlid = 'W8lFo4' //以前のリンクを活かす
    // https://kenzkenz.xsrv.jp/open-hinata3/?s=da0J4l
    axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/shortUrlSelect.php',{
      params: {
        urlid: urlid
      }
    }).then(function (response) {
      vm.dbparams = response.data
      vm.init()
      const url = new URL(window.location.href) // URLを取得
      window.history.replaceState(null, '', url.pathname + window.location.hash) //パラメータを削除 FB対策
    })
    if (localStorage.getItem('resolution')) {
      this.s_resolution = localStorage.getItem('resolution')
    }
    // -----------------------------------------------------------------------------------------------------------------
  },
  watch: {
    s_isWindow () {
      try {
        this.updatePermalink()
      }catch (e) {
        console.log(e)
      }
    },
    s_loading(val) {
      this.updateSnackbar();
    },
    s_loading2(val) {
      this.updateSnackbar();
    },
    s_simaFire () {
      this.simaOpacityInput()
    },
    s_selectedLayers: {
      handler: function () {
        console.log('変更を検出しました。URLを作成します。App.vue')
        this.updatePermalink()
        history('selectedLayers',window.location.href)
      },
      deep: false
    },
    pitch: {
      handler: function () {
        // console.log('変更を検出しました')
        // this.updatePermalink()
        // this.$store.state.map01.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel })
      },
      deep: true
    },
  }
}
</script>
<style scoped>
#map00 {
  background-color: rgb(194,210,251);
  /*background-color: black;*/
  height: 100%;
}
#map01 {
  border: #000 1px solid;
  height: 100%;
}
#map02 {
  border: #000 1px solid;
  position:absolute;
}
.pointer {
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 50%;
  border: #fff 1px solid;
  position: absolute;
  pointer-events: none;
  z-index: 10;
  display: none;
}
.center-target{
  position: absolute;
  background-image:url('@/assets/images/target.gif');
  background-repeat:  no-repeat;
  width:24px;
  height:24pX;
  pointer-events: none;
  top: calc(50% - 12px);
  left: calc(50% - 12px);
  z-index: 1;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
#left-top-div {
  position:absolute;
  top:10px;
  left:10px;
  z-index:1;
}
#right-top-div {
  position:absolute;
  top:10px;
  right:10px;
  z-index:1;
}
.zoom-div {
  position: absolute;
  left: 10px;
  bottom: 10px;
  font-size: large;
  z-index: 2;
  text-shadow:
      -1px -1px 0 #ffffff,
      1px -1px 0 #ffffff,
      -1px  1px 0 #ffffff,
      1px  1px 0 #ffffff;
}
.watch-position {
  position: absolute;
  top: 60px;
  left: 0;
}
.zoom-in {
  position: absolute;
  top: 120px;
  left: 0;
}
.zoom-out {
  position: absolute;
  top: 180px;
  left: 0;
}
.share {
  position: absolute;
  top: 240px;
  left: 0;
}
/*3Dのボタン-------------------------------------------------------------*/
.terrain-btn-expand-div {
  position:absolute;
  bottom: 10px;
  right:45px;
  z-index:2;
  display: none;
}
.terrain-btn {
  background-color: rgb(50,101,186);
}
.terrain-btn-div{
  position:absolute;
  /*top:60%;*/
  bottom: 20px;
  right:45px;
  z-index:2;
  /*display:none;*/
  height:180px;
  width:180px;
  margin-left:-90px;
  margin-top:20px;
  background:rgba(0,0,0,0.1);
  /*border-radius:180px 0 0 180px;*/
  border-radius:180px;
  -moz-user-select:none;
  -webkit-user-select:none;
  -ms-user-select:none;
  cursor:move;
}
/*@media screen and (max-width:480px) {*/
/*  .terrain-btn-div {*/
/*    top:calc(50% - 73px);*/
/*  }*/
/*}*/
.terrain-btn-container{
  position:relative;
  height:100%;
}
.terrain-btn-close {
  position: absolute;
  top:25px;
  left:25px;
  font-size: x-large;
}
.terrain-btn-up{
  position:absolute;
  top:10px;
  left:50%;
  padding:0;
  width: 50px;
  min-width: 50px;
  height:50px;
  margin-left:-25px;
  color: white;
  border-radius:8px;
}
.terrain-btn-down{
  position:absolute;
  bottom:10px;
  left:50%;
  padding:0;
  width: 50px;
  min-width: 50px;
  height:50px;
  margin-left:-25px;
  color: white;
  border-radius:8px;
}
.terrain-btn-left{
  position:absolute;
  top:50%;
  left:10px;
  padding:0;
  width: 50px;
  min-width: 50px;
  height:50px;
  margin-top:-25px;
  color: white;
  border-radius:8px;
}
.terrain-btn-right{
  position:absolute;
  top:50%;
  right:10px;
  padding:0;
  width: 50px;
  min-width: 50px;
  height:50px;
  margin-top:-25px;
  color: white;
  border-radius:8px;
}
.terrain-btn-center{
  position:absolute;
  top:50%;
  right:calc(50% - 25px);
  padding:0;
  width:50px;
  height:50px;
  margin-top:-25px;
  color: white;
  border-radius:50px;
}
.terrain-reset{
  position:absolute;
  top:80px;
  left:50%;
  padding:0;
  width:40px;
  height:20px;
  margin-left:-20px;
  text-align:center;
  font-size: larger;
  color: white;
  /*-webkit-text-stroke: 1px #FFF;*/
  /*text-stroke: 1px #FFF;*/
}
.terrain-btn-div .ui-spinner{
  font-size:10px;
  width:30px;
  background:rgba(0,0,0,0);
  border:none;
}
.loadingImg {
  width:80px;
  display:none;
  position: absolute;
  top:calc(50% - 40px);
  left:calc(50% - 40px);
  z-index:1;
}
</style>

<style>
html, body {
  overscroll-behavior: none;

  overflow: hidden;
  touch-action: none;

  -webkit-overflow-scrolling: touch;
  height: 100%;
}
#app {
  height: 100%; /* 親要素が100%の高さを持つ */
}
.maplibregl-popup-content {
  padding: 10px 20px 10px 20px;

}
.maplibregl-popup-close-button{
  font-size: 40px;
}
.popup-html-div {
  max-height: 500px;
  overflow: auto;
}
font {
  pointer-events: none;
}
.pyramid-btn {
  margin-top: 5px;
  height: 20px;
  line-height: 20px;
  width: 100%;
  background-color: rgb(50,101,186);
  color: white;
  border-radius:8px;
}
.maplibregl-popup {
  z-index: 1;
}
.popup-table {
  margin-bottom: 10px;
  width: 100%;
}

.popup-table, .popup-table th, .popup-table td {
  border: 1px solid darkgray;
  border-collapse: collapse;
  font-size: large;
  padding: 5px;
}
.popup-table th {
  text-align: center;
  font-weight: normal;
}

.popup-table td:nth-of-type(3) {
  text-align: right;
}
.popup-btn {
  cursor: pointer;
  background-color: rgb(50,101,186);
  color: white;
  padding: 3px 10px 3px 10px;
  border-radius:8px;
}
.maplibregl-popup-content hr {
  margin-top: 10px;
  margin-bottom: 10px;
}
.break-hr {
  border: solid 2px rgb(50,101,186);
}
.layer-label-div {
  color: white;
  background-color: rgb(50,101,186);
  text-align: right;
  padding-left: 5px;
  padding-right: 5px;
  margin-bottom: 10px;
}
.layer-label-div-red {
  color: white;
  background-color: red;
  text-align: right;
  padding-left: 5px;
  padding-right: 5px;
  margin-bottom: 10px;
}
.tiny-btn {
  font-size: 10px; /* フォントサイズを小さく */
  padding: 2px 6px; /* パディングを小さく */
  min-width: 24px; /* ボタンの最小幅 */
  height: 24px; /* ボタンの高さ */
  line-height: 24px; /* 中央揃え */
  margin-bottom: 10px;
}
.style01 {
  background: linear-gradient(transparent 85%, #ffd700 80%);
}

.carousel {
  position: relative;
  width: 80%;
  /*max-width: 600px;*/
  width: 200px;
  overflow: hidden;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;
}
.carousel-images {
  display: flex;
  transition: transform 0.5s ease-in-out;
}
.carousel-images img {
  display: block;
  width: 200px; /* Ensures consistent width */
  height: auto; /* Maintains aspect ratio */
  flex-shrink: 0;
  object-fit: contain; /* Prevents stretching */
}
.carousel-buttons {
  position: absolute;
  top: 50%;
  width: 100%;
  display: flex;
  justify-content: space-between;
  transform: translateY(-50%);
}
.carousel-button {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 5px;
}
.carousel-button:hover {
  background-color: rgba(0, 0, 0, 0.7);
}
.carousel-buttons.hidden {
  display: none;
}
.carousel-button.disabled {
  background-color: rgba(0, 0, 0, 0.2);
  cursor: not-allowed;
}
.custom-switch {
  height: 34px; /* 全体の高さを調整 */
}
.custom-switch .v-switch__control {
  height: 18px; /* スイッチ部分の高さ */
  width: 32px;  /* スイッチ部分の幅 */
}
.custom-switch .v-switch__thumb {
  height: 18px; /* スイッチの丸部分の高さ */
  width: 18px;  /* スイッチの丸部分の幅 */
}
.v-overlay-container .v-select__content {
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
  max-height: 300px; /* 必要に応じて調整 */
  touch-action: pan-y !important; /* 縦方向のタッチスクロールを有効化 */
}
.maplibregl-ctrl-compass-heading {
  display: none!important;
}
.color-container {
  margin-top: 15px;
  display: flex; /* 横並びにする */
  gap: 10px; /* ボックス間の余白 */
  height: 25px;
}
.color-container .box {
  width: 100px;
  height: 25px;
  text-align: center;
  line-height: 100px;
  font-weight: bold;
  color: white;
  border-radius: 6px; /* 角を少し丸く */
  cursor: pointer; /* ポインターアイコン */
  transition: transform 0.1s, box-shadow 0.1s; /* スムーズなアニメーション */
}
.color-container .circle {
  width: 25px;
  height: 25px;
  border-radius: 25px; /* 角を少し丸く */
  cursor: pointer; /* ポインターアイコン */
  transition: transform 0.1s, box-shadow 0.1s; /* スムーズなアニメーション */
}
.box:hover {
  filter: brightness(1.2); /* 明るさを少しアップ */
}
.box:active {
  transform: translateY(2px); /* クリック時に少し下がる */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* 影をつける */
}
.color-container2 {
  margin-top: 5px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between; /* 均等に配置 */
  align-items: center; /* 垂直方向で中央揃え */
}
.color-container2 .circle {
  margin-right: 5px;
  margin-left: 5px;
  width: 25px; /* 真円の幅 */
  height: 25px; /* 真円の高さ */
  border-radius: 100%; /* 真円にする */
  cursor: pointer; /* ポインターに変更 */
  transition: transform 0.1s, box-shadow 0.1s; /* スムーズなアニメーション */
}
.circle:hover {
  filter: brightness(1.2); /* 明るさを少しアップ */
}
.circle:active {
  transform: translateY(2px); /* クリック時に少し下がる */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* 影をつける */
}
.box1 { background-color: red; }
.box2 { background-color: black; }
.box3 { background-color: blue; }
.box4 { background-color: green; }
.box5 { background-color: orange; }
.box6 {
  border: 1px solid #a0c4ff;
  background-color: rgba(0,0,0,0);
}
.swich .v-input__control {
  height: 20px!important;
}
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