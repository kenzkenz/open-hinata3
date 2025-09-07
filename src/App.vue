<script setup>
import { user as user1 } from "@/authState"; // グローバルの認証情報を取得
import SakuraEffect from './components/SakuraEffect.vue';

</script>

<template>
  <v-app>
    <v-main>

      <!-- マピラリフィルター -->
      <FloatingWindow
          windowId = "mapillary-filter"
          title = "mapillaryフィルタ"
          type="normal"
          :default-top = "10"
          :default-left = "mlyDefaultLeft"
          :default-width = "isSmall500 ? 350 : 500"
          :default-height = "isSmall500 ? 350 : 370"
          :keepAspectRatio = "false"
          :showMaxRestore="false"
          @close = "mapillaryClose"
      >
        <MapillaryFilter
            :observe-width="true"
            :show-close="true"
            :close-on-esc="true"
            :reset-key="resetKeyForMly"
            @mousedown.stop
            @pointerdown.stop
            @touchstart.stop
            @year-range-input="onYearInput"
            @year-range-change="onYearChange"
            @only360-change="onOnly360"
            @categories-change="onCats"
            @creators-input="onCreatorsInput"
            @creators-change="onCreatorsChange"
            @reset="onReset"
            @filters-changed="onFiltersChanged"
        />
      </FloatingWindow>
      <!-- マピラリビューワー -->
      <FloatingWindow
          windowId = "mapillary"
          :title-is-html="true"
          :title = "mapillaryTytle"
          type="normal"
          :default-top = "70"
          :default-left = "10"
          :default-width = "isSmall500 ? 200 : 400"
          :default-height = "isSmall500 ? 300 : 300"
          :keepAspectRatio = "false"
          :showMaxRestore="true"
          @width-changed ="onWidthChangedForMapillary"
          @close = "mapillaryClose"
      >
        <div class="mapillary-div" :style="{height:'calc(100% - 102px)',width:'100%',background:'color-mix(in srgb, var(--main-color) 60%, black)',color:'white'}">
        </div>
        <div class="toolbar-row">
          <v-btn @click="mapillaryFilterOpen">フィルター</v-btn>
<!--          <v-text-field-->
<!--              v-model="s_mapillaryUserName"-->
<!--              label="ユーザー名"-->
<!--              hide-details-->
<!--              density="compact"-->
<!--              variant="outlined"-->
<!--              style="width:150px;"-->
<!--              @mousedown.stop-->
<!--              @pointerdown.stop-->
<!--              @touchstart.stop-->
<!--              @input="mapillaryUserNameInput"-->
<!--          />-->
<!--          <v-text-field-->
<!--              v-model="s_mapillaryStartDate"-->
<!--              label="始"-->
<!--              type="date"-->
<!--              hide-details-->
<!--              density="compact"-->
<!--              variant="outlined"-->
<!--              @mousedown.stop-->
<!--              @pointerdown.stop-->
<!--              @touchstart.stop-->
<!--              @input="mapillaryUserNameInput"-->
<!--          />-->
<!--          <v-text-field-->
<!--              v-model="s_mapillaryEndDate"-->
<!--              label="終"-->
<!--              type="date"-->
<!--              hide-details-->
<!--              density="compact"-->
<!--              variant="outlined"-->
<!--              @mousedown.stop-->
<!--              @pointerdown.stop-->
<!--              @touchstart.stop-->
<!--              @input="mapillaryUserNameInput"-->
<!--          />-->
<!--          <v-switch-->
<!--              v-model="s_is360Pic"-->
<!--              label="360画像"-->
<!--              color="primary"-->
<!--              inset-->
<!--              hide-details-->
<!--              density="compact"-->
<!--              @mousedown.stop-->
<!--              @pointerdown.stop-->
<!--              @touchstart.stop-->
<!--          />-->
<!--          <div class="mapillary-qry-result d-flex align-center"></div>-->
        </div>
      </FloatingWindow>
      <!-- EXドロー -->
      <FloatingWindow
          windowId="exdraw"
          :title="`EXドロー`"
          type="normal"
          :default-top="20"
          :default-right="150"
          :default-width="400"
          :default-height="400"
          :keepAspectRatio="false"
      >
        <ExDraw
            :id="Number(s_pmtiles0Id)"
            @update:paint="onPaintUpdate"
        />
      </FloatingWindow>
      <!-- QRコード -->
      <FloatingWindow
          windowId="qrcode"
          type="simple"
          :default-width=200
          :default-height=200
          :keepAspectRatio="true"
          @width-changed="onWidthChanged"
      >
        <vue-qrcode :value="s_url" :options="{ width: qrCodeWidth }"></vue-qrcode>
      </FloatingWindow>
      <!-- ペイントエディター -->
      <FloatingWindow
          windowId="painteditor"
          :title="`スタイル変更（id=${s_pmtiles0Id}-${s_pmtiles0Name}）`"
          type="normal"
          :default-width=400
          :default-height=600
          :keepAspectRatio="false"
      >
        <PaintEditor
            :id="Number(s_pmtiles0Id)"
            :initialPaint="paintSettings"
            @update:paint="onPaintUpdate"
        />
      </FloatingWindow>


      <!-- registry にある id を全部ホスト -->
      <message-dialog
          v-for="id in dialogIds"
          :key="id"
          :use-store="true"
          :store-module="'messageDialog'"
          :dialog-id="id"
      />


      <VDialogIframe></VDialogIframe>

      <div v-show="showDrawConfrim" id="floating-buttons">
        <MiniTooltip text="この状態で確定" :offset-x="0" :offset-y="2">
          <v-btn :color="confirmBtnColor" id="confirm-btn">確定</v-btn>
        </MiniTooltip>
        <MiniTooltip :text="undoBtnMiniTooltip" :offset-x="0" :offset-y="2">
          <v-btn :disabled="isUndoBtnDisabled" style="margin-left: 10px;" id="undo-btn">戻</v-btn>
        </MiniTooltip>
        <MiniTooltip :text="cancelBtnMiniTooltip" :offset-x="0" :offset-y="2">
          <v-btn style="margin-left: 10px;" color="error" id="cancel-btn">キャンセル</v-btn>
        </MiniTooltip>
      </div>

      <DialogDrawConfig
          :mapName="'map01'"
          @open-floating="openWindow"
      />

      <div v-if="s_isLassoSelected && isDraw" class="features-rotate-div my-div" @click="setMaxZIndex($event.currentTarget)">
        <div class="features-rotate-div-close" @click="s_isLassoSelected = false">
          ×
        </div>
        回転
        <v-btn
            class="tiny-icon-btn"
            icon
            @mousedown="startAngleMinus"
            @mouseup="stopAngleMinus"
            @mouseleave="stopAngleMinus"
            @touchstart.prevent="startAngleMinus"
            @touchend="stopAngleMinus"
        >←</v-btn>
        <!--        回転-->
        <input
            step="1"
            style="width: 70px;margin: 0 4px;"
            type="number"
            class="oh-cool-input-number"
            v-model="angleValue"
            @input="onRotateInput($event.target.value)"
        />
        <v-btn
            class="tiny-icon-btn"
            icon
            @mousedown="startAnglePlus"
            @mouseup="stopAnglePlus"
            @mouseleave="stopAnglePlus"
            @touchstart.prevent="startAnglePlus"
            @touchend="stopAnglePlus"
        >→</v-btn>
        <!-- 拡大／縮小 -->
        <div class="my-2"></div>
        拡大
        <v-btn
            class="tiny-icon-btn"
            icon
            @mousedown="startScaleUp"
            @mouseup="stopScaleUp"
            @mouseleave="stopScaleUp"
            @touchstart.prevent="startScaleUp"
            @touchend="stopScaleUp"
        >+</v-btn>
        <!--        拡大-->
        <input
            step="1"
            min="1"
            style="width: 70px;margin: 0 4px;"
            type="number"
            class="oh-cool-input-number"
            v-model="scaleValue"
            @input="onScaleInput($event.target.value)"
        />
        <v-btn
            class="tiny-icon-btn"
            icon
            @mousedown="startScaleDown"
            @mouseup="stopScaleDown"
            @mouseleave="stopScaleDown"
            @touchstart.prevent="startScaleDown"
            @touchend="stopScaleDown"
        >-</v-btn>
      </div>

      <div id="print-div" class="fan-menu-rap">
          <v-btn class="fan-menu-print" :size="isSmall ? 'small' : 'default'" icon @click="handlePrint(true)" >戻る</v-btn>
          <v-btn class="print-print" :size="isSmall ? 'small' : 'default'" icon style="font-size: 16px;" @click="print">印刷</v-btn>
          <v-btn class="print-config" :size="isSmall ? 'small' : 'default'" icon style="font-size: 16px;" @click="drawConfig()">設定</v-btn>
          <v-btn class="print-png" :size="isSmall ? 'small' : 'default'" icon style="font-size: 16px;" @click="pngDl0">PNG</v-btn>

          <FanMenu class="fan-menu" layout="vertical" :offset-x="fanMenuOffsetX" :column-break-index="10">
            <template v-slot:center>
              <MiniTooltip text="ドロー" :offset-x="0" :offset-y="2">
                <v-btn
                    id="centerDrawBtn"
                    :size="isSmall ? 'small' : 'default'"
                    :color="s_isDraw ? 'green' : undefined"
                    icon
                    @click="toggleLDraw"
                >
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
              </MiniTooltip>
            </template>
            <template v-slot:default>
              <div>
                <div v-for="btn in buttons1" :key="btn.key">
                  <MiniTooltip :text="btn.text" :offset-x="0" :offset-y="2">
                    <v-btn
                        class="sub-btn"
                        :icon="true"
                        :color="btn.color"
                        @click="btn.click"
                        :style="btn.style"
                    >
                      <template v-if="btn.icon">
                        <v-icon>{{ btn.icon }}</v-icon>
                      </template>
                      <template v-else>
                        <b>{{ btn.label }}</b>
                      </template>
                    </v-btn>
                  </MiniTooltip>
                </div>
              </div>
            </template>
          </FanMenu>

      </div>

      <div
          ref="indicator"
          v-show="isDrawing && !s_isCursorOnPanel"
          class="draw-indicator"
      ><div id="draw-indicato-text" style="margin-top: 20px;margin-left: 10px;"></div></div>

      <DrawDrawer
          :value="showDrawDrawer"
          :feature="selectedPointFeature"
      />
      <DrawListDrawer
          :value="showDrawListDrawer"
          :feature="selectedPointFeature"
      />

      <ChibanzuDrawer
          :value="showChibanzuDrawer"
      />

      <RightDrawer
          :value="showRightDrawer"
          :feature="selectedPointFeature"
      />

      <PointInfoDrawer
          :value="showPointInfoDrawer"
          :feature="selectedPointFeature"
          @input="setDrawerVisible"
          @save="savePointDescription"
      />

      <v-snackbar v-model="snackbar" :timeout="3000" color="primary">
        {{ snackbarText }}
      </v-snackbar>

      <v-snackbar v-model="loadingSnackbar"
                  :timeout="-1"
                  color="primary"
                  location="top"
                  class="my-snackbar"
      >
        <p v-if="s_loading">処理中です。</p>
        <p v-if="s_loading2"><span v-html="s_loadingMessage"></span></p>
        <p v-if="s_loading3"><span v-html="s_loadingMessage3"></span></p>
      </v-snackbar>


      <v-snackbar :v-model="true"
                  :timeout="-1"
                  color="primary"
      >
        <p v-if="s_loading3"><span v-html="s_loadingMessage3"></span></p>
      </v-snackbar>

      <v-snackbar v-model="s_snackbarForGroup" :timeout="3000" color="primary">
        {{ s_snackbarForGroupText }}
      </v-snackbar>

      <v-snackbar
          v-model="s_snackbar"
          :timeout="-1"
          color="primary"
          top
          right
      >
        <input v-if="!user1" type="range" min="0" max="1" step="0.01" class="range" v-model.number="s_simaOpacity" @input="simaOpacityInput"/>
        <v-btn color="pink" class="tiny-btn" style="margin-bottom: 0px!important;" text @click="simaDl">SIMAダウンロード</v-btn>
        <v-btn v-if="user1" color="pink" class="tiny-btn" style="margin-left: 10px;margin-bottom: 0px!important;" text @click="simaPartDl">部分ダウンロード</v-btn>
        <v-btn v-if="!user1" style="margin-left: 10px;" color="pink" text @click="simaDelete">削除</v-btn>
        <template v-slot:actions>
          <v-btn color="white" text @click="simaClose">閉じる</v-btn>
        </template>
      </v-snackbar>

      <v-dialog v-model="s_dialogForVersion" max-width="500px">
        <v-card>
          <v-card-title>
            バージョンが古くなっています。
          </v-card-title>
          <v-card-text>
            <p style="margin-bottom: 20px;">アップデートしてください。現在のレイヤーを記憶したままアップデートします。</p>
            <v-btn @click="appUpdate">アップデート実行</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="s_dialogForVersion = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog class="exclude-overlay" v-model="s_dialogForPicture" max-width="400px" :style="{zIndex: dialogForPictureZindex}">
        <v-card>
          <v-card-title>
            画像、動画アップロード
          </v-card-title>
          <v-card-text style="padding-bottom: 0">

              <div class="media-picker-row">
                <!-- iPhone のとき：カメラ(アイコン) + ライブラリ選択 を横並び -->
                <template v-if="isIphone">
                  <!-- ネイティブ input は非表示。ボタンで click() を発火 -->
                  <input
                      id="iosCamInput"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      class="sr-only"
                      @change="onCameraPicked"
                  />
                  <v-btn
                      icon
                      class="camera-btn"
                      @click="triggerCamera"
                      :ripple="false"
                      aria-label="カメラで撮影"
                  >
                    <v-icon>mdi-camera</v-icon>
                  </v-btn>
                  <v-file-input
                      v-model="s_selectedFile"
                      accept="image/*,video/*"
                      :multiple="false"
                      density="comfortable"
                      variant="solo-filled"
                      hide-details
                      :show-size="true"
                      prepend-inner-icon="mdi-image-multiple"
                      label="フォトライブラリから選択"
                      @update:model-value="onFileSelected"
                      class="library-input"
                  />
                </template>
                <!-- それ以外（iPhone以外）：通常の v-file-input のみ -->
                <template v-else>
                  <v-file-input
                      v-model="s_selectedFile"
                      label="画像・動画を選択"
                      accept="image/*,video/*"
                      :multiple="false"
                      density="comfortable"
                      variant="solo-filled"
                      hide-details
                      :show-size="true"
                      prepend-inner-icon="mdi-file-image"
                      @update:model-value="onFileSelected"
                      class="w-full"
                  />
                </template>
              </div>
<!--              <v-file-input-->
<!--                  v-model="s_selectedFile"-->
<!--                  label="画像、動画を選択"-->
<!--                  accept="image/*,video/*"-->
<!--                  show-size-->
<!--                  @change="onFileSelected"-->
<!--              ></v-file-input>-->
              <div style="max-height: 300px; margin-top: -20px; margin-bottom: 20px; overflow: auto">
                <div v-if="s_previewUrl" class="mt-4 text-center" style="margin-bottom: 10px;">
                  <img
                      v-if="isImage"
                      :src="s_previewUrl"
                      alt="プレビュー"
                      style="max-width: 100%; transition: transform 0.3s;"
                      :style="{ transform: 'rotate(' + imgRotation + 'deg)' }"
                  />
                  <video v-if="isVideo" controls style="max-width: 100%;">
                    <source :src="s_previewUrl" type="video/mp4" />
                    お使いのブラウザは video タグに対応していません。
                  </video>
                </div>
              </div>

              <v-row v-if="isImage || isVideo">
                <v-col cols="5">
                  <MiniTooltip text="サムネイルの形を選択します" :offset-x="0" :offset-y="-18">

                  <v-select
                      v-model="thumbnailType"
                      :items="thumbnailTypes"
                      item-title="label"
                      item-value="value"
                      label="サムネイルを選択"
                      outlined
                      @update:modelValue="isDisabledChange"
                      :menu-props="{
                        maxHeight: '300px',
                        overflow: 'scroll',
                        contentClass: 'scrollable-menu'
                      }"
                  ></v-select>
                  </MiniTooltip>
                </v-col>
                <v-col cols="5">
                  <v-select
                      v-model="containerColor"
                      :items="containerColors"
                      item-title="label"
                      item-value="value"
                      label="縁の色を選択"
                      outlined
                      @update:modelValue="isDisabledChange"
                      :menu-props="{
                        maxHeight: '300px',
                        overflow: 'scroll',
                        contentClass: 'scrollable-menu'
                      }"
                  ></v-select>
                </v-col>
                <v-col cols="2">
                  <MiniTooltip text="画像を回転します" :offset-x="0" :offset-y="2">
                    <div
                        @click="imgRotation += -90; isDisabled2 = false"
                        class="rotate-btn"
                    >
                      <v-icon>mdi-rotate-left</v-icon>
                    </div>
                  </MiniTooltip>
                </v-col>
              </v-row>
              <v-row>
                <v-col cols="6">
                  <v-btn :disabled="(!s_selectedFile || isDisabled) && isDisabled2" style="width: 200px;" @click="savePicture">サーバー更新</v-btn>
                </v-col>
                <v-col cols="6">
                  <v-btn :disabled="!s_pictureUrl" @click="deletePicture" style="margin-left: 10px;">サーバーから削除</v-btn>
                </v-col>
              </v-row>
          </v-card-text>
          <v-card-actions>
            <v-btn color="blue-darken-1" text @click="s_dialogForPicture = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="s_dialogForOffline2" max-width="500px">
        <v-card>
          <v-card-title>
            オフライン設定その２
          </v-card-title>
          <v-card-text>
            <p style="margin-bottom: 10px;"></p>
            <v-btn @click="downloadTiles">データダウンロード</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="s_dialogForOffline2 = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="s_dialogForOffline" max-width="500px">
        <v-card>
          <v-card-title>
            オフライン設定
          </v-card-title>
          <v-card-text>
            <p style="margin-bottom: 10px;">ドロー機能と併用できません。ドロー機能を使用中の場合、閉じてください。一辺10kmの四角を移動してクリックしてください。</p>
            <v-btn @click="bboxPolygon">範囲指定</v-btn>
            <v-btn style="margin-left: 10px;" @click="cachesCrear">これまでのタイルをクリアする</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="s_dialogForOffline = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialogForDrawCsv" max-width="500px">
        <v-card>
          <v-card-title>
            CSV 列選択
          </v-card-title>
          <v-card-text>
            <p v-if="!csvLonLat" style="margin-bottom: 20px;">ジオコーディングします。精度はあまり高くありません。</p>

            <v-select v-if="!csvLonLat"
                      v-model="csvAddressColumn"
                      :items="csvColumns"
                      label="アドレスの列を選択"
                      outlined
            ></v-select>
            <v-select v-model="csvLabelColumn"
                      :items="csvColumns"
                      label="ラベルに表示する列を選択（必須）"
                      outlined
            ></v-select>
            <v-select v-model="csvColorColumn"
                      :items="csvColumns"
                      label="アイコンの色の列を選択（あれば）"
                      outlined
            ></v-select>
            <v-select v-model="csvLongTextColumn"
                      :items="csvColumns"
                      label="長文の列を選択（あれば）"
                      outlined
            ></v-select>
            <v-select v-model="csvPictureUrlColumn"
                      :items="csvColumns"
                      label="画像URLの列を選択（あれば）"
                      outlined
            ></v-select>


            <v-btn style="margin-left: 0px;" @click="uploadDrawCsv"><span v-if="!csvLonLat">ジオコーディング＆</span>ドロー追加</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForDrawCsv = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialogForDraw" max-width="500px">
        <v-card>
          <v-card-title>
            選択
          </v-card-title>
          <v-card-text>
            <p style="margin-bottom: 20px;">2MB以上は「マイルームのマイレイヤーに追加」を選んでください。</p>
            <v-btn @click="uploadMyroomKml">マイルームのマイレイヤーに追加</v-btn>
            <v-btn style="margin-left: 10px;" @click="uploadDrawKml">ドロー追加</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForDraw = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>


<!--      <v-dialog v-model="dialogForDraw" max-width="500px">-->
<!--        <v-card>-->
<!--          <v-card-title>-->
<!--            ラベル選択-->
<!--          </v-card-title>-->
<!--          <v-card-text>-->
<!--            <v-select class="scrollable-content"-->
<!--                      v-model="geojsonForDrawLabelColumn"-->
<!--                      :items="geojsonForDrawColumns"-->
<!--                      label="ラベルに表示する列を選択"-->
<!--                      outlined-->
<!--            ></v-select>-->
<!--            <v-btn @click="uploadDrawKml">ドロー追加</v-btn>-->
<!--          </v-card-text>-->
<!--          <v-card-actions>-->
<!--            <v-spacer></v-spacer>-->
<!--            <v-btn color="blue-darken-1" text @click="dialogForDraw = false">Close</v-btn>-->
<!--          </v-card-actions>-->
<!--        </v-card>-->
<!--      </v-dialog>-->

      <v-dialog v-model="dialogForChibanzyOrDraw" max-width="510px">
        <v-card>
          <v-card-title>
            アップロード先を選択
          </v-card-title>
          <v-card-text>
            <p style="margin-bottom: 20px;">選択してください。</p>
            <v-btn :disabled="!user1" @click="uploadChibanzu">地番図アップロード</v-btn>
            <v-btn :disabled="!user1" style="margin-left: 10px;" @click="dialogForLayerName = true,dialogForChibanzyOrDraw = false">マイレイヤー追加</v-btn>

            <v-btn style="margin-left: 10px;" @click="uploadDraw">ドロー追加</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForChibanzyOrDraw = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialogForLayerName" max-width="510px">
        <v-card>
          <v-card-title>
            レイヤー名を記入
          </v-card-title>
          <v-card-text>
            <v-text-field v-model="s_gazoName" placeholder="レイヤー名" ></v-text-field>

            <v-select v-model="s_pmtilesMaximum"
                      :items="[16,17,18,19,20,21,22,23,24]"
                      label="最大ズームを選択。注！原則16です。"
                      outlined
            ></v-select>

            <v-btn style="margin-left: 0px;" @click="uploadMyLayer">追加</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForLayerName = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>


      <v-dialog v-model="dialogForDl" max-width="500px">
        <v-card>
          <v-card-title>
            各種ダウンロード
          </v-card-title>
          <v-card-text>
            <v-btn @click="saveSima">SIMA</v-btn>
            <v-btn style="margin-left: 10px;" @click="saveGpx">GPX</v-btn>
            <v-btn style="margin-left: 10px;" @click="saveKml">kML</v-btn>
            <v-btn style="margin-left: 10px;" @click="saveGeojson">GEOJSON</v-btn>
            <v-btn style="margin-left: 10px;" @click="dialogForSaveDXFOpen">DXF</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForDl = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog
          v-model="showTileDialog"
          max-width="400"
          persistent
      >
        <v-card>
          <v-card-title class="headline">アップロード</v-card-title>
          <v-card-text>
            <v-text-field v-model="s_gazoName" placeholder="名称" ></v-text-field>
            <v-select class="scrollable-content"
                      v-model="s_resolution"
                      :items="resolutions"
                      label="画像取込最大解像度"
                      outlined
                      v-if="user1"
            ></v-select>
            <v-btn @click="startTiling">アップロード</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="showTileDialog = false">閉じる</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog attach="#map01" v-model="s_popupDialog" max-width="500" persistent>
        <v-card>
          <div class="dialog-close" @click="popupDialogClose">×</div>
          <v-card-text>
            <!-- ここに既存のhtml文字列を表示 -->
            <div v-html="s_popupHtml"></div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="popupDialogClose">閉じる</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="s_pointSima" max-width="400">
        <v-card>
          <v-card-title>各種出力</v-card-title>
          <v-card-text style="margin-bottom: -5px;padding-bottom: 0">
            <v-text-field
                v-model="segments"
                type="number"
                label="区切り数を入力"
                :min="0"
                :max="500"
                :step="1"
            />
            <v-btn @click="pointSimaCreate">SIMA作成</v-btn>
            <v-btn style="margin-left: 10px" @click="pointCsvCreate">CSV作成</v-btn>
            <v-btn style="margin-left: 10px" @click="elevationCreate">標高図作成</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="s_pointSima = false">閉じる</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialogForSaveDXF2" max-width="500px">
        <v-card>
          <v-card-title>
            DXF作成
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
                        label="座標系を選択してください"
                        outlined
              ></v-select>
            </div>
            <v-btn @click="saveDxf">DXF出力開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForSaveDXF2 = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

<!--      <v-dialog v-model="printDialog" max-width="500px">-->
<!--        <v-card>-->
<!--          <v-card-title>-->
<!--            印刷設定-->
<!--          </v-card-title>-->
<!--          <v-card-text>-->
<!--            <v-textarea-->
<!--                v-model="s_printTitleText"-->
<!--                label="タイトル"-->
<!--                auto-grow-->
<!--                rows="3"-->
<!--                outlined-->
<!--                @input="configChange('title-text',s_printTitleText)"-->
<!--            />-->
<!--            <v-text-field-->
<!--                v-model="s_textPx"-->
<!--                label="フォントサイズ"-->
<!--                type="number"-->
<!--                variant="outlined"-->
<!--                min="0"-->
<!--                max="100"-->
<!--                @input="configChange('font-size',s_textPx)"-->
<!--            />-->
<!--            <v-select-->
<!--                v-model="s_titleColor"-->
<!--                :items="titleColors"-->
<!--                item-title="label"-->
<!--                item-value="color"-->
<!--                label="色を選択してください"-->
<!--                @update:modelValue="configChange('fill-color',s_titleColor)"-->
<!--            />-->
<!--            <v-select-->
<!--                v-model="titleScale"-->
<!--                :items="titleScales"-->
<!--                item-title="label"-->
<!--                item-value="zoom"-->
<!--                label="縮尺率固定"-->
<!--                @update:modelValue="setZoom()"-->
<!--            />-->
<!--            <v-select-->
<!--                v-model="s_titleDirection"-->
<!--                :items="titleDirections"-->
<!--                item-title="label"-->
<!--                item-value="direction"-->
<!--                label="印刷方向を選択してください"-->
<!--                @update:modelValue="configChange('direction',s_titleDirection)"-->
<!--            />-->
<!--          </v-card-text>-->
<!--          <v-card-actions>-->
<!--            <v-spacer></v-spacer>-->
<!--            <v-btn color="blue-darken-1" text @click="printDialog = false">Close</v-btn>-->
<!--          </v-card-actions>-->
<!--        </v-card>-->
<!--      </v-dialog>-->

<!--      <v-dialog v-model="s_mapillaryDialog" fullscreen>-->
<!--        <v-card>-->
<!--&lt;!&ndash;          <v-card-title style="height: 0">&ndash;&gt;-->
<!--&lt;!&ndash;            <div class="close-btn-div" @click="s_mapillaryDialog = false" style="z-index: 101!important; color: #0d47a1; margin-top: -10px!important;"><i class="fa-solid fa-xmark hover close-btn"></i></div>&ndash;&gt;-->
<!--&lt;!&ndash;          </v-card-title>&ndash;&gt;-->
<!--          <v-card-text style="padding: 0">-->
<!--            <div class="close-btn-div" @click="s_mapillaryDialog = false" style="z-index: 101!important; color: #0d47a1; position: absolute;top:10px;right:15px;"><i class="fa-solid fa-xmark hover close-btn"></i></div>-->
<!--            <div class="mapillary-container2" :width="mapillaryWidth" :style="`height: ${mapillarHeight}`"></div>-->
<!--            <div style="position: absolute;bottom: 10px;left: 10px;z-index: 100">-->
<!--              <span class="attribution-date" style="margin-left: 20px;"></span><span class="attribution-username" style="margin-left: 10px;"></span>-->
<!--            </div>-->
<!--          </v-card-text>-->
<!--&lt;!&ndash;          <v-card-actions style="height: 20px!important;">&ndash;&gt;-->
<!--&lt;!&ndash;            <div style="margin-bottom: 10px;">&ndash;&gt;-->
<!--&lt;!&ndash;              <span class="attribution-date" style="margin-left: 20px;"></span><span class="attribution-username" style="margin-left: 10px;"></span>&ndash;&gt;-->
<!--&lt;!&ndash;            </div>&ndash;&gt;-->
<!--&lt;!&ndash;            <v-spacer></v-spacer>&ndash;&gt;-->
<!--&lt;!&ndash;            <v-btn color="blue-darken-1" text @click="s_mapillaryDialog = false">Close</v-btn>&ndash;&gt;-->
<!--&lt;!&ndash;          </v-card-actions>&ndash;&gt;-->
<!--        </v-card>-->
<!--      </v-dialog>-->

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
            </div>
            <div v-else>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="座標系を選択してください"
                        outlined
              ></v-select>
            </div>
            <v-btn @click="imagePngLoad">png読込開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="dialogForImagePng = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="s_showChibanzuDialog" max-width="500px">
        <v-card>
          <v-card-title>
            地番図アップロード
          </v-card-title>
          <v-card-text>
            <div v-if="s_isAndroid" class="select-container">

            </div>
            <div v-else>
              <v-text-field v-model="s_pmtilesName" type="email" placeholder="地番図名" ></v-text-field>
              <v-select class="scrollable-content"
                        v-model="s_pmtilesPropertieName"
                        :items="s_chibanzuPropaties"
                        label="地番にあたるフィールドを選択してください"
                        outlined
              ></v-select>
              <v-select
                  v-model="s_chibanzuPrefCode"
                  :items="prefItems"
                  item-title="prefName"
                  item-value="prefCode"
                  label="都道府県名を選択してください"
                  outlined
              ></v-select>
              <v-select
                  v-model="s_chibanzuCityCode"
                  :items="cityItems"
                  item-title="cityName"
                  item-value="cityCode"
                  label="市区町村名を選択してください"
                  outlined
              ></v-select>
              <v-select
                  v-model="s_selectedPublic"
                  :items="publicItems"
                  item-title="label"
                  item-value="public"
                  label="公開方法を選択してください"
                  outlined
              ></v-select>
              <v-select
                  v-model="s_selectedKaiji2"
                  :items="kaiji2s"
                  item-title="label"
                  item-value="kaiji2"
                  label="２次開示確認"
                  outlined
              ></v-select>
            </div>
            <v-btn @click="shpLoad">読込開始</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" text @click="s_showChibanzuDialog = false">Close</v-btn>
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
              <v-text-field v-model="s_gazoName" placeholder="名称" ></v-text-field>
              <v-select class="scrollable-content"
                        v-model="s_resolution"
                        :items="resolutions"
                        label="画像取込最大解像度"
                        outlined
                        v-if="user1"
              ></v-select>
<!--              <v-select class="scrollable-content"-->
<!--                        v-model="s_transparent"-->
<!--                        :items="transparentType"-->
<!--                        item-title="label"-->
<!--                        item-value="value"-->
<!--                        label="透過方法を選択してください"-->
<!--                        outlined-->
<!--                        v-if="user1"-->
<!--              ></v-select>-->
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
            画像アップロード
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
              <v-text-field v-model="s_gazoName" placeholder="名称" ></v-text-field>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="座標系を選択してください"
                        outlined
              ></v-select>
              <v-select class="scrollable-content"
                        v-model="s_transparent"
                        :items="transparentType"
                        item-title="label"
                        item-value="value"
                        label="透過方法を選択してください"
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
            画像アップロード
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
              <v-text-field v-model="s_gazoName" placeholder="名称" ></v-text-field>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="選択してください"
                        outlined
              ></v-select>
<!--              <v-select class="scrollable-content"-->
<!--                        v-model="s_resolution"-->
<!--                        :items="resolutions"-->
<!--                        label="画像取込最大解像度"-->
<!--                        outlined-->
<!--                        v-if="user1"-->
<!--              ></v-select>-->
              <v-select class="scrollable-content"
                        v-model="s_transparent"
                        :items="transparentType"
                        item-title="label"
                        item-value="value"
                        label="透過方法を選択してください"
                        outlined
                        v-if="user1"
              ></v-select>
            </div>
            <v-btn @click="geoTifLoad1file">geotiff読込開始</v-btn>
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
            画像アップロード
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
              <v-text-field v-model="s_gazoName" placeholder="名称" ></v-text-field>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="選択してください"
                        outlined
              ></v-select>
<!--              <v-select class="scrollable-content"-->
<!--                        v-model="s_resolution"-->
<!--                        :items="resolutions"-->
<!--                        label="画像取込最大解像度"-->
<!--                        outlined-->
<!--                        v-if="user1"-->
<!--              ></v-select>-->
              <v-select class="scrollable-content"
                        v-model="s_transparent"
                        :items="transparentType"
                        item-title="label"
                        item-value="value"
                        label="透過方法を選択してください"
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
            画像アップロード
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
              <v-text-field v-model="s_gazoName" placeholder="名称" ></v-text-field>
              <v-select class="scrollable-content"
                        v-model="s_zahyokei"
                        :items="items"
                        label="選択してください"
                        outlined
              ></v-select>
              <v-select class="scrollable-content"
                        v-model="s_transparent"
                        :items="transparentType"
                        item-title="label"
                        item-value="value"
                        label="透過方法を選択してください"
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

      <!-- @update:modelValue="onMapChange" -->
      <div v-if="s_isPrint" class="map-radio d-flex justify-center">
        <div style="margin-left: -30px!important;">
        <v-chip-group
            v-model="printMap"
            mandatory
            row
            column
            class="mt-4"
        >
          <v-chip @click="printMap01" value="map01" variant="flat">map01</v-chip>
          <v-chip @click="printMap02" value="map02" variant="flat">map02</v-chip>
          <v-chip @click="printMap03" value="map03" variant="flat">map03</v-chip>

        </v-chip-group>
        </div>
      </div>

      <div id="map00">

<!--        <div class="my-speed-dial">-->
<!--        <v-speed-dial-->
<!--            location="top center"-->
<!--            transition="scale-transition"-->
<!--        >-->
<!--          <template v-slot:activator="{ props: activatorProps }">-->
<!--            <v-fab-->
<!--                v-bind="activatorProps"-->
<!--                size="large"-->
<!--                icon="$vuetify"-->
<!--            ></v-fab>-->
<!--          </template>-->

<!--          <v-btn key="1" icon="$success"></v-btn>-->
<!--          <v-btn key="2" icon="$info"></v-btn>-->
<!--          <v-btn key="3" icon="$warning"></v-btn>-->
<!--          <v-btn key="4" icon="$error"></v-btn>-->
<!--        </v-speed-dial>-->
<!--        </div>-->

        <v-icon
            v-if="isUsingServerGeojson && !s_isPrint"
            color="info"
            size="32"
            class="pulse"
        >
          mdi-server-network
        </v-icon>

<!--        <v-btn @click="openPaintEditorWindow">test</v-btn>-->

<!--        <v-btn @click="test">test</v-btn>-->

<!--        <div class="test" style="height: 100px; width: 100px;">-->
<!--          aaaaaa-->
<!--        </div>-->



        <!--        <img class='loadingImg' src="https://kenzkenz.xsrv.jp/open-hinata3/img/icons/loading2.gif">-->
        <div v-for="mapName in mapNames" :key="mapName" :id=mapName :style="mapSize[mapName]" v-show="(mapName === 'map01'|| mapName === 'map02' && s_map2Flg)" @click="btnPosition">
          <v-progress-linear  v-if="s_loading && !noProgress" style="z-index: 1" indeterminate color="blue"></v-progress-linear>
          <v-progress-linear  v-if="s_loading2 && !noProgress" style="z-index: 1" indeterminate color="blue"></v-progress-linear>
          <v-progress-linear  v-if="s_loading3 && !noProgress" style="z-index: 1" indeterminate color="primary"></v-progress-linear>
          <!-- <SakuraEffect />-->
          <div>
            <div id="pointer1" class="pointer" v-if="mapName === 'map01'"></div>
            <div id="pointer2" class="pointer" v-if="mapName === 'map02'"></div>
          </div>

          <!-- コンパス -->
          <div class="compassDiv"  v-if="s_isPrint">
            <svg class="compass-icon" viewBox="0 0 100 100" width="40" height="40">
              <circle cx="50" cy="50" r="45" stroke="black" stroke-width="4" fill="white"/>
              <polygon points="50,10 60,50 50,40 40,50" fill="red"/>
              <text x="50" y="95" font-size="16" text-anchor="middle" fill="black">N</text>
            </svg>
          </div>
          <div class="scale-ratio" v-if="s_isPrint">{{scaleText}}</div>

          <div
              v-if="showFloatingImage && mapName === 'map01'"
              class="floating-image-panel"
              style="
              position: absolute;
              top: 60px;
              left: 60px;
              z-index: 10;
              background: #ffffff;
              border: 1px solid #ccc;
              padding: 4px;
              border-radius: 8px;
              pointer-events: auto;"
          >
            <div style="position: relative; display: inline-block; pointer-events: auto;">
              <!-- 画像 -->
              <img
                  id="warp-image"
                  class="floating-image"
                  ref="floatingImage"
                  @load="onImageLoad"
                  :src="uploadedImageUrl"
                  :style="{ maxWidth: '50vw', maxHeight: '50vh', opacity: showOriginal ? 0.9 : 0, display: 'block' }"
                  @click="onImageClick"
              />
              <!-- 上：仮ワープした画像を描くCanvas -->
              <canvas
                  ref="warpCanvas"
                  id="warp-canvas"
                  :style="{ maxWidth: '50vw', maxHeight: '50vh', opacity: showWarpCanvas ? 1 : 0, position: 'absolute', top: 0, left: 0 }"
                  @click="onImageClick"
              ></canvas>

              <!-- マーカー -->
              <div
                  v-for="item in gcpWithImageCoord"
                  :key="'image-marker-' + item.index"
                  class="image-marker"
                  :style="getImageMarkerStyle(item.gcp.imageCoord)"
                  @mousedown="startDragging($event, item.index)"
                  style="pointer-events: auto;"
              >
                {{ item.index + 1 }}
              </div>
            </div>

            <!-- ✅ 改良GCP一覧テーブル -->
            <div class="gcp-list-table" style="margin-top: 10px; max-height: 180px; overflow-y: auto;">
              <table style="font-size: 13px; width: 100%; border-collapse: collapse;">
                <thead>
                <tr :style="{ background: primaryColor, color: 'white' }">
                  <th style="padding: 6px;">#</th>
                  <th style="padding: 6px;">画像X</th>
                  <th style="padding: 6px;">画像Y</th>
                  <th style="padding: 6px;">経度Lng</th>
                  <th style="padding: 6px;">緯度Lat</th>
                  <th style="padding: 6px;"></th>
                </tr>
                </thead>
                <tbody>
                <tr
                    v-for="(gcp, i) in gcpList"
                    :key="i"
                    style="border-bottom: 1px solid #e0e0e0; background: #ffffff;"
                    @mouseover="hoveredRow = i"
                    @mouseleave="hoveredRow = null"
                    :style="{ background: hoveredRow === i ? '#f9f9f9' : '#ffffff' }"
                >
                  <td style="padding: 6px; text-align: center;">{{ i + 1 }}</td>
                  <td style="padding: 6px;">
                    <input type="number" style="width: 70px;" :value="gcp.imageCoord?.[0] ?? ''"
                           @input="updateImageCoordX(i, $event.target.value)">
                  </td>
                  <td style="padding: 6px;">
                    <input type="number" style="width: 70px;" :value="gcp.imageCoord?.[1] ?? ''"
                           @input="updateImageCoordY(i, $event.target.value)">
                  </td>
                  <td style="padding: 6px;">
                    <input type="number" style="width: 90px;" :value="gcp.mapCoord?.[0] ?? ''"
                           @input="updateMapCoordLng(i, $event.target.value)">
                  </td>
                  <td style="padding: 6px;">
                    <input type="number" style="width: 90px;" :value="gcp.mapCoord?.[1] ?? ''"
                           @input="updateMapCoordLat(i, $event.target.value)">
                  </td>
                  <td style="padding: 6px; text-align: center;">
                    <button @click="removeGcp(i)" style="
                      background: none;
                      border: none;
                      color: black;
                      font-weight: bold;
                      font-size: 20px;
                      cursor: pointer;
                      line-height: 1;
                    ">×</button>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
            <div style="margin-top: 4px; text-align: left; padding: 10px;">
              <v-btn class="tiny-btn" small color="red" @click="removeFloatingImage">画像を消す</v-btn>
              <v-btn class="tiny-btn" style="margin-left: 5px;" small color="primary" @click="resetGcp">GCPリセット</v-btn>
              <v-btn class="tiny-btn" style="margin-left: 5px;" small color="primary" @click="saveGcpToLocal">GCP保存</v-btn>
              <v-btn class="tiny-btn" style="margin-left: 5px;" small color="primary" @click="loadGcpFromLocal">GCP復元</v-btn>
              <v-btn
                  style="margin-left: 5px;"
                  v-if="(() => {
                    const imageCount = gcpList.filter(gcp =>
                      Array.isArray(gcp.imageCoord) &&
                      gcp.imageCoord.length === 2 &&
                      typeof gcp.imageCoord[0] === 'number' &&
                      typeof gcp.imageCoord[1] === 'number'
                    ).length;

                    const mapCount = gcpList.filter(gcp =>
                      Array.isArray(gcp.mapCoord) &&
                      gcp.mapCoord.length === 2 &&
                      typeof gcp.mapCoord[0] === 'number' &&
                      typeof gcp.mapCoord[1] === 'number'
                    ).length;

                    const bothCount = gcpList.filter(gcp =>
                      Array.isArray(gcp.imageCoord) &&
                      Array.isArray(gcp.mapCoord) &&
                      gcp.imageCoord.length === 2 &&
                      gcp.mapCoord.length === 2 &&
                      typeof gcp.imageCoord[0] === 'number' &&
                      typeof gcp.imageCoord[1] === 'number' &&
                      typeof gcp.mapCoord[0] === 'number' &&
                      typeof gcp.mapCoord[1] === 'number'
                    ).length;

                    return imageCount === bothCount &&
                           mapCount === bothCount &&
                           (bothCount === 2 || bothCount >= 4);
                  })()"
                  class="tiny-btn"
                  small
                  color="primary"
                  @click="previewAffineWarp"
              >
                変&nbsp;&nbsp;換
              </v-btn>
              <v-btn
                  v-if="showWarpCanvas"
                  class="tiny-btn"
                  style="margin-left: 5px;"
                  small
                  color="grey"
                  @click="clearWarp"
              >
                クリア
              </v-btn>
              <v-btn
                  v-if="showUploadButton"
                  class="tiny-btn"
                  style="margin-left: 5px;"
                  color="primary"
                  @click="openTileUploadDialog"
              >
                アップロード
              </v-btn>
            </div>
          </div>

          <div :style="{fontSize: textPx + 'px', color: titleColor}" class="print-title">
            <MiniTooltip text="click me" :offset-x="0" :offset-y="4">
              <span
                  @click="drawConfig"
                  v-if="printTitleText && printTitleText.trim().length > 0"
                  class="print-title-bg"
                  v-html="printTitleText.replace(/\n/g, '<br>')"
              ></span>
              <span v-else class="dot" @click="drawConfig"></span>
            </MiniTooltip>
          </div>
          <div v-if="isIframe" id="iframe-div">
              <MiniTooltip text="全画面表示" :offset-x="0" :offset-y="2">
                <v-btn :size="isSmall ? 'small' : 'default'" icon @click="fullscreenForIframe" v-if="mapName === 'map01'"><v-icon>mdi-fullscreen</v-icon></v-btn>
              </MiniTooltip>
          </div>
          <div v-if="!s_isPrint" class="center-target"></div>
          <!--左上部メニュー-->
          <div v-if="!isIframe" id="left-top-div">
            <span v-if="!s_isPrint">
              <MiniTooltip text="メニュー">
                <v-btn :size="isSmall ? 'small' : 'default'" icon @click="btnClickMenu(mapName)" v-if="mapName === 'map01'"><v-icon>mdi-menu</v-icon></v-btn>
              </MiniTooltip>
              <MiniTooltip text="ログイン">
                <v-btn :size="isSmall ? 'small' : 'default'" icon style="margin-left:8px;" @click="s_dialogForLogin = !s_dialogForLogin" v-if="mapName === 'map01'"><v-icon>mdi-login</v-icon></v-btn>
              </MiniTooltip>
                <MiniTooltip text="2画面表示">
              <v-btn :size="isSmall ? 'small' : 'default'" icon style="margin-left:8px;" @click="btnClickSplit" v-if="mapName === 'map01'"><v-icon>mdi-monitor-multiple</v-icon></v-btn>
              </MiniTooltip>
                <MiniTooltip text="マイ ルーム">
              <v-btn :size="isSmall ? 'small' : 'default'" v-if="user1 && mapName === 'map01'" icon style="margin-left:8px;" @click="btnClickMyroom (mapName)"><v-icon v-if="user1">mdi-home</v-icon></v-btn>
              </MiniTooltip>
              <MiniTooltip text="グループ機能">
                <v-btn :size="isSmall ? 'small' : 'default'" v-if="user1 && mapName === 'map01'" icon style="margin-left:8px;" @click="s_dialogForGroup = !s_dialogForGroup"><v-icon v-if="user1">mdi-account-supervisor</v-icon></v-btn>
              </MiniTooltip>
              <MiniTooltip text="レイヤー選択">
                <v-btn :size="isSmall ? 'small' : 'default'" icon style="margin-left:8px;" @click="btnClickLayer(mapName)"><v-icon>mdi-layers</v-icon></v-btn>
              </MiniTooltip>
            </span>
          </div>
          <!--右メニュー-->
          <div id="right-top-div" v-show="mapName === 'map01' && !isIframe">
            <span v-if="!s_isPrint">
              <div v-if="isRightDiv">
<!--                <div v-if="isRightDiv2">-->
                  <div v-for="btn in buttons0" :key="btn.key" style="margin-bottom:10px;">
                    <MiniTooltip :text="btn.text" :offset-x="0" :offset-y="2">
                      <v-btn
                          :disabled="btn.disabled"
                          class="right-btn"
                          :icon="true"
                          :color="btn.color"
                          @click="btn.click"
                          :style="btn.style"
                          :size="isSmall ? 'small' : 'default'"
                          :id="btn.key"
                      >
                        <template v-if="btn.icon">
                          <v-icon>{{ btn.icon }}</v-icon>
                        </template>
                        <template v-else>
                          <b>{{ btn.label }}</b>
                        </template>
                      </v-btn>
                    </MiniTooltip>
<!--                  </div>-->
                </div>
                <FanMenu class="fan-menu-0" layout="vertical" :offset-x="fanMenuOffsetX" :column-break-index="10">
                  <template v-slot:center>
                    <MiniTooltip text="ドロー!" :offset-x="0" :offset-y="2">
                      <v-btn
                          id="centerDrawBtn2"
                          :size="isSmall ? 'small' : 'default'"
                          :color="s_isDraw ? 'green' : undefined"
                          icon
                          @click="toggleLDraw"
                      >
                        <v-icon>mdi-pencil</v-icon>
                      </v-btn>
                    </MiniTooltip>
                  </template>
                  <template v-slot:default>
                    <div>
                      <div v-for="btn in buttons1" :key="btn.key">
                        <MiniTooltip :text="btn.text" :offset-x="0" :offset-y="2">
                          <v-btn
                              class="sub-btn"
                              :icon="true"
                              :color="btn.color"
                              @click="btn.click"
                              :style="btn.style"
                          >
                            <template v-if="btn.icon">
                              <v-icon>{{ btn.icon }}</v-icon>
                            </template>
                            <template v-else>
                              <b>{{ btn.label }}</b>
                            </template>
                          </v-btn>
                        </MiniTooltip>
                      </div>
                    </div>
                  </template>
                </FanMenu>



              </div>
            </span>
          </div>

          <span class="terrain-btn-span" v-show="mapName === 'map01' || (mapName === 'map02' && !s_isPrint)">
          <div :id="'terrain-btn-div-' + mapName"
               class="terrain-btn-div"
               @mouseenter="onPanelEnter"
               @mouseleave="onPanelLeave">
            <div class="terrain-btn-container">
              <v-icon class="terrain-btn-close" @pointerdown="terrainBtnClos">mdi-close</v-icon>
              <v-btn type="button" class="terrain-btn-up terrain-btn" @pointerdown="pressPitchUp(mapName)" @pointerup="releaseOrientationButtons"><i class='fa fa-arrow-up fa-lg hover'></i></v-btn>
              <v-btn type="button" class="terrain-btn-down terrain-btn" @pointerdown="pressPitchDown(mapName)" @pointerup="releaseOrientationButtons"><i class='fa fa-arrow-down fa-lg'></i></v-btn>
              <v-btn type="button" class="terrain-btn-left terrain-btn" @pointerdown="pressRotateRight(mapName)" @pointerup="releaseOrientationButtons"><i class='fa fa-arrow-left fa-lg'></i></v-btn>
              <v-btn type="button" class="terrain-btn-right terrain-btn" @pointerdown=" pressRotateLeft(mapName)" @pointerup="releaseOrientationButtons"><i class='fa fa-arrow-right fa-lg'></i></v-btn>
              <v-btn icon type="button" class="terrain-btn-center terrain-btn" @pointerdown="terrainReset(mapName)"><v-icon>mdi-undo</v-icon></v-btn>
            </div>
          </div>
          <div class="terrain-btn-expand-div">
            <v-btn icon type="button" @pointerdown="terrainBtnExpand"><v-icon>mdi-arrow-expand</v-icon></v-btn>
          </div>

          <div class="zoom-div" v-if="!s_isPrint && !isSmall500">
            zoom={{zoom.toFixed(2)}} {{elevation}}<br>
            {{s_address}}
            <br>
            {{s_zahyokei}}
            {{s_jdpCoordinates}}
          </div>
          </span>

          <DialogMenu v-if="mapName === 'map01'" :mapName=mapName />
          <DialogMyroom v-if="mapName === 'map01'" :mapName=mapName />
          <DialogLayer :mapName=mapName />
          <dialog-info :mapName=mapName />
          <dialog2 :mapName=mapName />
          <dialogShare v-if="mapName === 'map01'" :mapName=mapName @open-floating="openWindow" />
<!--          <DialogChibanzuList :mapName=mapName />-->
<!--          <DialogDrawConfig v-if="mapName === 'map01'" :mapName=mapName />-->

        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script>
import firebase, { db } from '@/firebase'
import store from '@/store'
import { toRaw } from 'vue'
import {closeAllPopups, mouseMoveForPopup, popup} from "@/js/popup"
import { CompassControl } from 'maplibre-gl-compass'
import shp from "shpjs"
import JSZip from 'jszip'
import * as turf from '@turf/turf'
import DxfParser from 'dxf-parser'
import proj4 from 'proj4'
import { gpx } from '@tmcw/togeojson'
import { user } from "@/authState"; // グローバルの認証情報を取得
import PointInfoDrawer from '@/components/PointInfoDrawer.vue'
import RightDrawer from '@/components/rightDrawer.vue'
import DrawDrawer from '@/components/drawer/DrawDrawer.vue'
import DrawListDrawer from '@/components/drawer/DrawLisiDrawer'
import ChibanzuDrawer from '@/components/chibanzuDrawer.vue'
import { mapState, mapMutations, mapActions} from 'vuex'
import { mdiMapMarker } from '@mdi/js'
import { registerMdiIcon } from '@/js/utils/icon-registry'
import { attachViewOrientationPair } from '@/js/utils/view-orientation-tracker'
import { startHoldRotate, startHoldPitch, resetOrientation } from '@/js/utils/view-orientation-anim'
import MessageDialog from '@/components/Message-Dialog'
import MapillaryFilter from '@/components/floatingwindow/MapillaryFilter.vue'

import {
  addDraw,
  addSvgAsImage,
  animateRelocate,
  bakeRotationToBlob,
  bindMoveendFor360,
  buildCandidates,
  capture,
  changePrintMap03,
  compressImageToUnder10MB,
  convertFromEPSG4326,
  convertGsiTileJson2,
  csvGenerateForUserPng,
  ddSimaUpload,
  dedupeCoords,
  delay0,
  detectLatLonColumns,
  diffGeoJSON,
  downloadGeoJSONAsCSV,
  downloadKML,
  downloadSimaText,
  downloadTextFile,
  DXFDownload,
  dxfToGeoJSON,
  enableDragHandles,
  extractFirstFeaturePropertiesAndCheckCRS,
  extractSimaById,
  featureCollectionAdd,
  featuresRestore,
  fetchGsiTileTest,
  fetchMapillaryPanosInViewport, fitClickCircleAll,
  fncPngDl,
  geocode,
  geojsonAddLayer,
  geojsonDownload,
  geoJSONToSIMA,
  geoTiffLoad,
  geoTiffLoad2,
  getBBoxFromPolygon,
  getCRS,
  getNextZIndex,
  getNowFileNameTimestamp,
  gpxDownload,
  handleFileUpload,
  highlightSpecificFeatures,
  highlightSpecificFeatures2025,
  highlightSpecificFeaturesCity,
  hitExcludedLayers,
  installDrawerStabilizer,
  installSafePicking,
  isImageFile,
  isVideoFile,
  japanCoord,
  jpgLoad,
  kmlDownload,
  kmzLoadForUser,
  LngLatToAddress,
  loadBitmap,
  loadImageRobust,
  mapFeatureToImageId,
  mapillaryCreate,
  mapillaryFilterRiset,
  mapillaryViewer,
  mapillaryWindowOpen,
  mapillaryWindowOpenDebounced,
  markaersRemove,
  markerAddAndRemove,
  parseCSV,
  pmtilesGenerate,
  pmtilesGenerateForUser2,
  pngDownload,
  pngLoad,
  printDirectionChange,
  queryMapillaryByUserDatesViewport,
  removeAllWhitespace,
  removeThumbnailMarkerByKey,
  sanitizeLongText,
  saveDrowFeatures,
  scaleAndRotateLassoSelected,
  setFllter360,
  setVertex,
  simaLoadForUser,
  splitLineStringIntoPoints,
  startPolling,
  stopDrawerAnimations,
  tileGenerateForUser,
  tileGenerateForUserPdf,
  transformGeoJSONToEPSG4326,
  updateDragHandles,
  userKmzSet,
  userSimaSet,
  vertexAndMidpoint,
  zahyokei,
  zipDownloadSimaText
} from '@/js/downLoad'


function onLineClick(e,map,map2Flg) {
  popup(e,map,'map01',map2Flg)
}

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

const popups = []
// function closeAllPopups() {
//   popups.forEach(popup => popup.remove())
//   // 配列をクリア
//   popups.length = 0
// }
export function history (event,url,thumbnail) {
  const ua = navigator.userAgent
  const width = window.screen.width
  const height = window.screen.height
  const referrer = document.referrer
  // alert(store.state.address)
  if (!thumbnail) thumbnail = ''
  axios
      .get('https://kenzkenz.xsrv.jp/open-hinata3/php/history.php',{
        params: {
          event: event,
          screen: width + ' x ' + height,
          ua: ua,
          referrer:referrer,
          url: url,
          uid: store.state.userId,
          address: store.state.address,
          thumbnail: thumbnail
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
export async function fetchElevation(lon, lat, zoom = 15) {
  const baseUrl = "https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png";
  const { xTile, yTile } = lonLatToTile(lon, lat, zoom);
  // y と x を反転してタイルURLを生成
  const tileUrl = baseUrl.replace("{z}", zoom).replace("{x}", xTile).replace("{y}", yTile);
  try {
    const elevation = await fetchElevationFromImage(tileUrl, lon, lat, zoom);
    // console.log(`標高: ${elevation}m`);
    return elevation;
  } catch (error) {
    // console.error("エラー:", error);
  }
}

function computeAffineMatrix(from, to) {
  const A = math.matrix([
    [from[0][0], from[0][1], 1],
    [from[1][0], from[1][1], 1],
    [from[2][0], from[2][1], 1]
  ]);
  const Bx = math.matrix([to[0][0], to[1][0], to[2][0]]);
  const By = math.matrix([to[0][1], to[1][1], to[2][1]]);
  const Ainv = math.inv(A);
  const coeffX = math.multiply(Ainv, Bx);
  const coeffY = math.multiply(Ainv, By);
  return {
    a: coeffX.get([0]),
    b: coeffX.get([1]),
    c: coeffX.get([2]),
    d: coeffY.get([0]),
    e: coeffY.get([1]),
    f: coeffY.get([2])
  };
}

function ensureOpenCvReady(callback) {
  if (window.cv && window.cv.imread) {
    callback();
  } else {
    setTimeout(() => ensureOpenCvReady(callback), 100);
  }
}

function autoCompleteGcpToRectangle(gcpList) {
  if (gcpList.length !== 2) return gcpList;

  const [gcp1, gcp2] = gcpList;
  const [x1, y1] = gcp1.imageCoord;
  const [x2, y2] = gcp2.imageCoord;
  const [mx1, my1] = gcp1.mapCoord;
  const [mx2, my2] = gcp2.mapCoord;

  return [
    gcp1, // A: 左上
    gcp2, // C: 右下
    {     // B: 右上
      imageCoord: [x2, y1],
      mapCoord: [mx2, my1]
    },
    {     // D: 左下
      imageCoord: [x1, y2],
      mapCoord: [mx1, my2]
    }
  ];
}

function convertLngLatToImageXY(lngLat, map, imageElement) {
  const { lng, lat } = { lng: lngLat[0], lat: lngLat[1] };
  const projected = map.project([lng, lat], map.getZoom());
  const bounds = map.getBounds();
  const topLeft = map.project([bounds.getWest(), bounds.getNorth()], map.getZoom());
  const bottomRight = map.project([bounds.getEast(), bounds.getSouth()], map.getZoom());

  const scaleX = imageElement.clientWidth / (bottomRight.x - topLeft.x);
  const scaleY = imageElement.clientHeight / (bottomRight.y - topLeft.y);

  const x = (projected.x - topLeft.x) * scaleX;
  const y = (projected.y - topLeft.y) * scaleY;

  const clampedX = Math.max(0, Math.min(x, imageElement.clientWidth - 1));
  const clampedY = Math.max(0, Math.min(y, imageElement.clientHeight - 1));

  console.log('Input LngLat:', { lng, lat }, 'Projected:', projected, 'Bounds:', { topLeft, bottomRight }, 'Scale:', { scaleX, scaleY }, 'Output XY:', { x, y, clampedX, clampedY });

  return [clampedX, clampedY];
}
import axios from "axios"
import DialogMenu from '@/components/Dialog-menu'
import DialogMyroom from '@/components/Dialog-myroom'
import DialogLayer from '@/components/Dialog-layer'
import DialogInfo from '@/components/Dialog-info'
import Dialog2 from '@/components/Dialog2'
import DialogShare from "@/components/Dialog-share"
import DialogDrawConfig from "@/components/Dialog-draw-config"
import pyramid, {
  autoCloseAllPolygons,
  colorNameToRgba, createSquarePolygonAtCenter,
  deleteAll, featuresDelete, generateSegmentLabelGeoJSON, generateStartEndPointsFromGeoJSON,
  geojsonCreate,
  geojsonUpdate, getAllVertexPoints, lavelUpdate, setAllMidpoints,
} from '@/js/pyramid'
import glouplayer from '@/js/glouplayer'
import * as Layers from '@/js/layers'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl from 'maplibre-gl'
import { Protocol, PMTiles } from "pmtiles"
import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain'
import {
  chibanzuSources, cityGeojsonLabelLayer, cityGeojsonLineLayer, cityGeojsonPolygonLayer,
  cityGeojsonSource,
  clickCircleSource,
  extLayer,
  extSource, geotiffLayer,
  geotiffSource,
  monoLayers,
  monoSources,
  osmBrightLayers,
  osmBrightSources, paleLayer, paleSource, publicSources, vertexSource, zenkokuChibanzuAddLayer
} from "@/js/layers"
import muni from '@/js/muni'
import { kml } from '@tmcw/togeojson';
import MiniTooltip from '@/components/MiniTooltip'
import FanMenu from '@/components/FanMenu'
import html2canvas from 'html2canvas'
import debounce from 'lodash/debounce'
import * as math from 'mathjs'
import FloatingWindow from '@/components/floatingwindow/FloatingWindow';
import PaintEditor from '@/components/floatingwindow/PaintEditor'
import ExDraw from '@/components/floatingwindow/ExDraw'
import VDialogIframe from "@/components/V-dialog/V-dialog-Iframe";
import drawMethods, {
  drawCancel,
  drawConfirm,
  drawRedo,
  drawUndo,
  finishDrawing,
  pushSnapshotDebounced,
  removeLastVertex
} from "@/js/draw";
import {haptic} from "@/js/utils/haptics";
import attachMapRightClickMenu, {
  applyRightClickRefocusPatch, applyRightClickRefocusPatchStrong,
  buildGoogleAndGsvMenuItems,
  buildGoogleMapsSearchUrl,
  buildMapillaryUrl,
  buildPinDeleteMenuItems,
  buildStreetViewUrl,
  buildSVUrlSimple,
  buildUtilityMenuItems, menuItemOpenSVWithPinRefocusStrong,
  openStreetViewPopup,
  openTopRightWindow,
  openTopRightWindowFlushFullHeight,
  openTopRightWindowFlushHalfWidthFullHeight,
  openTopRightWindowSimple,
  pointFeature,
  pushFeatureToGeoJsonSource, refocusOH3,
  removePointUnderCursor, setSvPin
} from "@/js/utils/context-menu";
import {setupEmbedMode} from "@/js/utils/embed";

export default {
  name: 'App',
  components: {
    DialogLayer,
    DialogMenu,
    DialogMyroom,
    DialogInfo,
    Dialog2,
    DialogShare,
    DialogDrawConfig,
    DrawDrawer,
    DrawListDrawer,
    PointInfoDrawer,
    RightDrawer,
    ChibanzuDrawer,
    MiniTooltip,
    FloatingWindow,
    PaintEditor,
    ExDraw,
    VDialogIframe,
    MessageDialog,
    MapillaryFilter,
  },
  data: () => ({
    isRightDiv: true,
    fanMenuOffsetX: -60,
    segments: 100,
    mainGeojson: { type: 'FeatureCollection', features: [] },
    history: [],
    redoStack: [],
    snackbar: false,
    snackbarText: '',
    tempFreehandCoords: [],
    tempPolygonCoords: [],
    tempLineCoords: [],
    tempLineCoordsGuide: [],
    isDrawingLine: false,
    isDrawingFree: false,
    isDrawing: false,
    isCursorOnPanel: false,
    panelHoverCount: 0, // ←複数パネル対策
    showXDialog: false,
    imgUrl: null,
    mapDivId: "map01", // ← MapLibreのDIVのID
    tweetText: "入力可能になりました。画像が表示されない場合もう一回やりなおしてください。\n\n#openhinata3 #OH3",
    attributionControl: null,
    printDialog: false,
    originalStyle: null,
    file: null,
    mapillaryWidth: '0px',
    mapillarHeight: '0px',
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
    // transparent: 1,
    transparentType: [
      { label: '透過する。（処理遅い）', value: '1' },
      { label: '透過なし。（処理早い）', value: '0' }
    ],
    thumbnailType: {borderRadius:'10px',containerSize:100},
    thumbnailTypes: [
      { label: '四角大', value: {borderRadius:'10px',containerSize:100} },
      { label: '四角中', value: {borderRadius:'10px',containerSize:50} },
      { label: '四角小', value: {borderRadius:'10px',containerSize:30} },
      { label: '丸大', value: {borderRadius:'50%',containerSize:100} },
      { label: '丸中', value: {borderRadius:'50%',containerSize:50} },
      { label: '丸小', value: {borderRadius:'50%',containerSize:30} },
      { label: '無し', value: {borderRadius:'0%',containerSize:1} },
    ],
    containerColor: 'white',
    containerColors: [
      { label: '白', value: 'white' },
      { label: '黒', value: 'black' },
      { label: '赤', value: 'red' },
      { label: '青', value: 'blue' },
      { label: '黄', value: 'yellow' },
      { label: '緑', value: 'green' },
      { label: '橙', value: 'orange' },
      { label: '紫', value: 'violet' },
      { label: 'ピンク', value: 'pink' },

    ],
    resolutions: [13,14,15,16,17,18,19,20,21,22,23,24],
    dialogForGeotiffApp1file: false,
    dialogForPdfApp: false,
    dialogForImagePng: false,
    shpPropaties: [],
    shpGeojson: [],
    loadingSnackbar: false,
    publicItems: [{public:-1,label:'オープンデータ（マップ上は緑色、詳細は表示）'},{public:0,label:'完全非公開（マップ上は透明、詳細は非表示）'},{public:3,label:'非公開（マップ上は灰色、詳細は非表示）'},{public:1,label:'公開（マップ上は青色、詳細は表示）'}],
    kaiji2s: [{kaiji2:1,label:'自分で自治体へ確認する'},{kaiji2:2,label:'運営者（復代理人含む）に一任する'},{kaiji2:3,label:'開示を希望しない'}],
    isPublic: false,
    drawControl: null,
    showDrawUI: false,
    tDraw: false,
    drawInstance: false,
    geojon: null,
    intervalId: null,
    preUrl: '',
    historyCount: 0,
    drawerVisible: false,
    selectedFeature: null,
    showLayerDialog: false,
    dialogForSaveDXF2: false,
    // -----------------------------------------
    uploadedImageUrl: null,
    showFloatingImage: false,
    gcpList: [],  // ← GCP座標リスト
    mapCoordMarkers: [], // 地図上に置いたマーカー一覧
    hoveredRow: null,
    primaryColor: '#1976d2',
    showWarpCanvas: false,
    cvReady: false,
    imageLoaded: false,
    showOriginal: true,
    showTileDialog: false,
    originalEnable: null,
    scaleText: '',
    isRightDiv2: true,
    dialogForDl: false,
    dialogForChibanzyOrDraw: false,
    angleValue:0,
    plusInterval: null,
    minusInterval: null,
    plusStep: 1,
    minusStep: 1,
    // 拡大／縮小操作用ステップやインターバルID
    scaleUpStep: 1,
    scaleDownStep: -1,
    scaleUpInterval: null,
    scaleDownInterval: null,
    scaleValue: 100,
    printMap: 'map01',
    dialogForDrawCsv: false,
    csvColumns: [],
    csvAddressColumn: '',
    csvLabelColumn: '',
    csvColorColumn: '',
    csvLongTextColumn: '',
    csvPictureUrlColumn: '',
    csvRecords: [],
    geojsonForDraw: null,
    dialogForDraw: false,
    csvLonLat: null,
    tileUrl: '',
    tileCount: 0,
    totalTileCount: 0,
    minZoom: 1,
    maxZoom: 17,
    tileTemplates: [
      'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',
      // 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
    ],
    pmtilesTemplates: [
        'https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025final3.pmtiles'
    ],
    windowlTitle: '',
    qrCodeWidth: 200,
    paintSettings: {},
    dialogForLayerName: false,
    isDisabled: false,
    isDisabled2: true,
    isNewPicture: false,
    imgRotation: 0,
    dialogForPictureZindex: 0,
    zIndex: 0,
    confirmBtnColor: 'info',
    drawTool: null,
    isUndoBtnDisabled: false,
    cancelBtnMiniTooltip: "描きかけ中の全ポイントを削除",
    undoBtnMiniTooltip: "直前のポイントを削除",
    map01Tracker: null,
    map02Tracker: null,
    stopSpin: null,
    stopPitch: null,
    resetKeyForMly: 0,   // ← これを増やすと子がリセット
  }),
  computed: {
    ...mapState([
      'isFromIframe',
      'isIframe',
      'showDrawConfrim',
      'mapillaryTytle',
      'mapillaryType',
      'noProgress',
      'map01',
      'map02',
      'is360Pic',
      'popupDialog',
      'drawFeatureId',
      'isIphone',
      'isSmall500',
      'isDraw',
      'showDrawDrawer',
      'showDrawListDrawer',
      'showPointInfoDrawer',
      'showRightDrawer',
      'selectedPointFeature',
      'showChibanzuDrawer',
      'clickCircleGeojsonText',
      'printTitleText',
      'textPx',
      'titleColor',
      'titleDirection',
      'drawGeojsonId',
      'isUsingServerGeojson',
      'drawFeature',
    ]),
    filterWidth(){ return this.isSmall500 ? 350 : 500 },
    mlyDefaultLeft() {
      const vw = (typeof window !== 'undefined' ? window.innerWidth : 1280)
      return Math.max(10, vw - this.filterWidth - 10)  // 右10px
    },
    dialogIds () {
      return Object.keys(this.$store.state.messageDialog.registry)
    },
    s_prevGeojsons: {
      get() {
        return this.$store.prevGeojsons
      },
      set(value) {
        this.$store.state.prevGeojsons = value
      }
    },
    s_mapillaryEndDate: {
      get() {
        return this.$store.state.mapillaryEndDate
      },
      set(value) {
        this.$store.state.mapillaryEndDate = value
      }
    },
    s_mapillaryStartDate: {
      get() {
        return this.$store.state.mapillaryStartDate
      },
      set(value) {
        this.$store.state.mapillaryStartDate = value
      }
    },
    s_mapillaryUserName: {
      get() {
        return this.$store.state.mapillaryUserName
      },
      set(value) {
        this.$store.state.mapillaryUserName = value
      }
    },
    s_is360Pic: {
      get() {
        return this.$store.state.is360Pic
      },
      set(value) {
        this.$store.state.is360Pic = value
      }
    },
    s_dialogForVersion: {
      get() {
        return this.$store.state.dialogForVersion
      },
      set(value) {
        this.$store.state.dialogForVersion = value
      }
    },
    isImage() {
      if (this.s_selectedFile) {
        return this.s_selectedFile && this.s_selectedFile.type.startsWith("image/");
      } else {
        return isImageFile(this.s_previewUrl)
      }
    },
    isVideo() {
      if (this.s_selectedFile) {
        return this.s_selectedFile && this.s_selectedFile.type.startsWith("video/");
      } else {
        return isVideoFile(this.s_previewUrl)      }
    },
    s_selectedFile: {
      get() {
        return this.$store.state.selectedFile
      },
      set(value) {
        this.$store.state.selectedFile = value
      }
    },
    s_previewUrl: {
      get() {
        return this.$store.state.previewUrl
      },
      set(value) {
        this.$store.state.previewUrl = value
      }
    },
    s_pictureUrl: {
      get() {
        return this.$store.state.pictureUrl
      },
      set(value) {
        this.$store.state.pictureUrl = value
      }
    },
    s_drawGeojsonId: {
      get() {
        return this.$store.state.drawGeojsonId
      },
      set(value) {
        this.$store.state.drawGeojsonId = value
      }
    },
    s_dialogForPicture: {
      get() {
        this.isNewPicture = false
        return this.$store.state.dialogForPicture
      },
      set(value) {
        this.$store.state.dialogForPicture = value
      }
    },
    s_pmtilesMaximum: {
      get() {
        return this.$store.state.pmtilesMaximum
      },
      set(value) {
        this.$store.state.pmtilesMaximum = value
      }
    },
    s_url () {
      return this.$store.state.url
    },
    s_propnames: {
      get() {
        return this.$store.state.propnames
      },
      set(value) {
        this.$store.state.propnames = value
      }
    },
    s_pmtiles0Name: {
      get() {
        return this.$store.state.pmtiles0Name
      },
      set(value) {
        this.$store.state.pmtiles0Name = value
      }
    },
    s_pmtiles0Id: {
      get() {
        return this.$store.state.pmtiles0Id
      },
      set(value) {
        this.$store.state.pmtiles0Id = value
      }
    },
    s_dialogForOffline2: {
      get() {
        return this.$store.state.dialogForOffline2
      },
      set(value) {
        this.$store.state.dialogForOffline2 = value
      }
    },
    s_dialogForOffline: {
      get() {
        return this.$store.state.dialogForOffline
      },
      set(value) {
        this.$store.state.dialogForOffline = value
      }
    },
    s_isPrint: {
      get() {
        return this.$store.state.isPrint
      },
      set(value) {
        return this.$store.state.isPrint = value
      }
    },
    s_isLassoSelected: {
      get() {
        return this.$store.state.isLassoSelected
      },
      set(value) {
        return this.$store.state.isLassoSelected = value
      }
    },
    s_finishLineFire () {
      return this.$store.state.finishLineFire
    },
    gcpWithImageCoord() {
      return this.gcpList
          .map((gcp, index) => ({ gcp, index }))
          .filter(item => item.gcp.imageCoord !== null);
    },
    buttons0() {
      const btns =
          [
            { key: 'print', text: '印刷', icon: 'mdi-printer', color: 'primary', disabled: this.isSmall500,  click: this.handlePrint },
            { key: 'currentPosition', text: '現在地取得', icon: 'mdi-crosshairs-gps', click: this.goToCurrentLocation },
            { key: 'watchPosition', text: '現在地連続取得', icon: 'mdi-map-marker-radius', color: this.isTracking ? 'green' : 'primary', click: this.toggleWatchPosition },
            { key: 'share', text: '共有', icon: 'mdi-share-variant', color: 'primary', click: this.share },
            { key: 'help', text: 'ヘルプ', icon: 'mdi-help', color: 'primary', click: this.help },
            { key: 'drawList', text: 'ドローリスト', icon: 'mdi-view-list', color: 'primary', click: this.drawListOpen, style: 'margin-top: 200px;' },
          ]
      return btns
    },
    buttons1() {
      let btns =
      [
        { key: 'point', text: '点、画像', label: '点', color: this.s_isDrawPoint ? 'green' : 'blue', click: this.toggleDrawPoint },
        { key: 'circle', text: '円', label: '円', color: this.s_isDrawCircle ? 'green' : 'blue', click: this.toggleDrawCircle },
        { key: 'line', text: '線', label: '線', color: this.s_isDrawLine ? 'green' : 'blue', click: this.toggleLDrawLine },
        { key: 'polygon', text: '多角形', label: '多角', color: this.s_isDrawPolygon ? 'green' : 'blue', click: this.toggleLDrawPolygon },
        { key: 'free', text: '自由に描く', label: '自由', color: this.s_isDrawFree ? 'green' : 'blue', click: this.toggleLDrawFree},
        { key: 'lasso', text: '投げ縄', label: '投げ縄', color: this.s_isDrawLasso ? 'green' : 'blue', click: this.toggleDrawLasso,style: 'font-size:12px;' },
        // { key: 'finish', text: '編集が終わったクリック！', label: '確定', click: this.finishDrawing, style: 'background-color: orange!important;' },
        { key: 'edit', text: '変形と移動', label: '編集', color: this.s_editEnabled ? 'green' : undefined, click: this.toggleEditEnabled },
        // { key: 'rotate', text: '回転', label: '回転',  click: this.drawRotate },
        { key: 'undo', text: '元に戻す', icon: 'mdi-undo', label: '元戻', click: this.undo },
        { key: 'redo', text: 'やり直す', icon: 'mdi-redo', label: 'やり直', click: this.redo },
        // { key: 'fix', text: '画面固定', label: '固定', color: this.s_isDrawFix ? 'green' : 'blue', click: this.toggleDrawFix },
        { key: 'config', text: '各種設定', label: '設定', color: 'blue', click: this.drawConfig },
        { key: 'dl', text: '各種ダウンロード', label: 'DL', style: 'background-color: navy!important;', click: this.dialogForDlOpen },
        // { key: 'ex', text: 'ex', label: 'ex', style: 'background-color: navy!important;', click: this.exDrawOpen },
        { key: 'delete', text: '全削除', icon: 'mdi-delete', color: 'error', click: this.deleteAllforDraw },

        { key: 'close', text: '閉じる', color: 'green', icon: 'mdi-close',  click: this.drawClose }
      ]
      if (this.isSmall500) {
        // btns = btns.filter(btn => btn.key !== 'free')
        // btns = btns.filter(btn => btn.key !== 'lasso')
        btns = btns.filter(btn => btn.key !== 'dl')
        btns = btns.filter(btn => btn.key !== 'ex')
      }
      return btns
    },
    s_popupDialog: {
      get() {
        return this.$store.state.popupDialog
      },
      set(value) {
        return this.$store.state.popupDialog = value
      }
    },
    s_popupHtml: {
      get() {
        return this.$store.state.popupHtml
      },
      set(value) {
        return this.$store.state.popupHtml = value
      }
    },
    s_pointSima: {
      get() {
        return this.$store.state.pointSima
      },
      set(value) {
        return this.$store.state.pointSima = value
      }
    },
    s_saveHistoryFire () {
      return this.$store.state.saveHistoryFire
    },
    s_jdpCode () {
      return this.$store.state.jdpCode
    },
    s_jdpCoordinates () {
      if (this.$store.state.jdpCoordinates) {
        if (this.$store.state.jdpCoordinates[0]) {
          return `${this.$store.state.jdpCoordinates[1].toFixed(3)}, ${this.$store.state.jdpCoordinates[0].toFixed(3)}`
        } else {
          return ''
        }
      } else {
        return ''
      }
    },
    s_isDrawAll() {
      return this.s_isDrawCircle || this.s_isDrawPoint || this.s_isDrawLine;
    },
    // s_isDrawCircle_and_Point() {
    //   return [this.s_isDrawCircle, this.s_isDrawPoint];
    // },
    s_updatePermalinkFire: {
      get() {
        return this.$store.state.updatePermalinkFire
      },
      set(value) {
        return this.$store.state.updatePermalinkFire = value
      }
    },
    s_gazoName: {
      get() {
        return this.$store.state.gazoName
      },
      set(value) {
        return this.$store.state.gazoName = value
      }
    },
    s_isDraw: {
      get() {
        return this.$store.state.isDraw
      },
      set(value) {
        return this.$store.state.isDraw = value
      }
    },
    s_editEnabled: {
      get() {
        return this.$store.state.editEnabled
      },
      set(value) {
        return this.$store.state.editEnabled = value
      }
    },
    s_isDrawLasso: {
      get() {
        return this.$store.state.isDrawLasso
      },
      set(value) {
        return this.$store.state.isDrawLasso = value
      }
    },
    s_isDrawFix: {
      get() {
        return this.$store.state.isDrawFix
      },
      set(value) {
        return this.$store.state.isDrawFix = value
      }
    },
    s_isDrawFree: {
      get() {
        return this.$store.state.isDrawFree
      },
      set(value) {
        return this.$store.state.isDrawFree = value
      }
    },
    s_isDrawPolygon: {
      get() {
        return this.$store.state.isDrawPolygon
      },
      set(value) {
        return this.$store.state.isDrawPolygon = value
      }
    },
    s_isDrawLine: {
      get() {
        return this.$store.state.isDrawLine
      },
      set(value) {
        return this.$store.state.isDrawLine = value
      }
    },
    s_isDrawCircle: {
      get() {
        return this.$store.state.isDrawCircle
      },
      set(value) {
        return this.$store.state.isDrawCircle = value
      }
    },
    s_isDrawPoint: {
      get() {
        return this.$store.state.isDrawPoint
      },
      set(value) {
        return this.$store.state.isDrawPoint= value
      }
    },
    s_selectedPublic: {
      get() {
        return this.$store.state.selectedPublic
      },
      set(value) {
        return this.$store.state.selectedPublic = value
      }
    },
    s_selectedKaiji2: {
      get() {
        return this.$store.state.selectedKaiji2
      },
      set(value) {
        return this.$store.state.selectedKaiji2 = value
      }
    },
    s_geojsonFile: {
      get() {
        return this.$store.state.geojsonFile
      },
      set(value) {
        return this.$store.state.geojsonFile = value
      }
    },
    s_chibanzuPrefCode: {
      get() {
        return this.$store.state.chibanzuPrefCode
      },
      set(value) {
        return this.$store.state.chibanzuPrefCode = value
      }
    },
    s_chibanzuCityCode: {
      get() {
        return this.$store.state.chibanzuCityCode
      },
      set(value) {
        return this.$store.state.chibanzuCityCode = value
      }
    },
    s_chibanzuPropaties: {
      get() {
        return this.$store.state.chibanzuPropaties
      },
      set(value) {
        return this.$store.state.chibanzuPropaties = value
      }
    },
    s_chibanzuGeojson: {
      get() {
        return this.$store.state.chibanzuGeojson
      },
      set(value) {
        return this.$store.state.chibanzuGeojson = value
      }
    },
    s_showChibanzuDialog: {
      get() {
        return this.$store.state.showChibanzuDialog
      },
      set(value) {
        return this.$store.state.showChibanzuDialog = value
      }
    },
    s_mapillaryDialog: {
      get() {
        return this.$store.state.mapillaryDialog
      },
      set(value) {
        this.$store.state.mapillaryDialog = value
      }
    },
    s_currentGroupId() {
      return this.$store.state.currentGroupId
    },
    selectedLayers () {
      return this.$store.state.selectedLayers
    },
    cityItems() {
      const filteredCities = Object.entries(muni)
          .filter(([_, value]) => value.startsWith(`${Number(this.s_chibanzuPrefCode)},`))
          .map(([cityCode, value]) => {
            const parts = value.split(',');
            return { prefCode: parts[0].padStart(5, '0'), cityCode: parts[2], cityName: parts[3] };
          });
      return filteredCities
    },
    prefItems() {
      // 都道府県を重複なく抽出
      const prefsSet = new Set();
      Object.values(muni).forEach(item => {
        const [prefCode, prefName] = item.split(',');
        prefsSet.add(`${prefCode},${prefName}`);
      });
      // 配列を作成
      const result = Array.from(prefsSet).map(item => {
        const [prefCode, prefName] = item.split(',');
        return { prefCode: prefCode.padStart(2, '0'), prefName };
      });
      return result
    },
    s_addressMini: {
      get() {
        return this.$store.state.addressMini
      },
      set(value) {
        this.$store.state.addressMini = value
      }
    },
    s_address: {
      get() {
        return this.$store.state.address
      },
      set(value) {
        this.$store.state.address = value
      }
    },
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
    s_loadingMessage3: {
      get() {
        return `<div style="text-align: center;">${this.$store.state.loadingMessage3}</div>`
        // return this.$store.state.loadingMessage3
      },
      set(value) {
        this.$store.state.loadingMessage3 = value
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
    s_loading3: {
      get() {
        return this.$store.state.loading3
      },
      set(value) {
        this.$store.state.loading3 = value
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
    s_transparent: {
      get() {
        return this.$store.state.transparent
      },
      set(value) {
        this.$store.state.transparent = value
        // localStorage.setItem('transparent',value)
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
      return this.windowWidth <= 720;
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
    s_dialogForGroup: {
      get() {
        return this.$store.state.dialogForGroup
      },
      set(value) {
        this.$store.state.dialogForGroup = value
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
    s_snackbarForGroup: {
      get() {
        return this.$store.state.snackbarForGroup
      },
      set(value) {
        this.$store.state.snackbarForGroup = value
      }
    },
    s_snackbarForGroupText: {
      get() {
        return this.$store.state.snackbarForGroupText
      },
      set(value) {
        this.$store.state.snackbarForGroupText = value
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
    s_isCursorOnPanel () {
      return this.$store.state.isCursorOnPanel
    },
    showUploadButton() {
      // アップロードボタンの表示条件
      return this.gcpList && this.gcpList.length >= 4 && this.showWarpCanvas;
    },
  },
  methods: {
    mapillaryFilterOpen() {
      this.$store.dispatch('showFloatingWindow', 'mapillary-filter')
    },
    fullscreenForIframe() {
      // 1) クリック直後に空タブを開く（ここが超重要：同期・即時）
      const win = window.open('', '_blank'); // sandboxで許可が無いと null になる

      // 2) 状態更新（これで gesture を壊さない）
      this.$store.state.isFromIframe = true;
      this.updatePermalink(); // ここでURLが確定する想定

      // 3) 少し待って確定したURLを空タブに流し込む
      setTimeout(() => {
        const oh3Url = this.$store?.state?.url || location.href;
        if (win && !win.closed) {
          try {
            win.location.href = oh3Url; // iOSでもOK
            return;
          } catch (_) { /* 無視してフォールバックへ */ }
        }

        // 4) フォールバック：トップへ遷移（iframeのsandbox許可が必要）
        try {
          const a = document.createElement('a');
          a.href = oh3Url;
          a.target = '_top'; // 親タブで開く
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click(); // ※ 同期クリックでないため、ここは通らない場合あり
          a.remove();
        } catch (_) {
          // どうしてもダメな環境向け：最後の手段（多くの環境で無効）
          try { window.top.location.href = oh3Url; } catch (_) {}
        }
      }, 60); // できるだけ短く
    },

    // fullscreenForIframe() {
    //   this.$store.state.isFromIframe = true
    //   this.updatePermalink()
    //   setTimeout(() => {
    //     const oh3Url = location.href
    //     const a = document.createElement('a');
    //     a.href = oh3Url;
    //     a.target = '_blank';
    //     a.rel = 'noopener noreferrer';
    //     // 一部ブラウザはDOM上にある必要がある
    //     document.body.appendChild(a);
    //     a.click();
    //     a.remove();
    //   },1000)
    // },
    waitForMap(mapKey = 'map01', { loaded = true, interval = 50, timeout = 10000 } = {}) {
      return new Promise((resolve, reject) => {
        const t0 = Date.now();
        const iv = setInterval(() => {
          const map = this.$store.state[mapKey];
          if (map) {
            if (!loaded || map.loaded?.()) {
              clearInterval(iv); resolve(map);
            } else {
              map.once('idle', () => { clearInterval(iv); resolve(map); });
            }
          } else if (Date.now() - t0 > timeout) {
            clearInterval(iv); reject(new Error(`waitForMap('${mapKey}') timeout`));
          }
        }, interval);
      });
    },
    // --- 汎用ヘルパ ---
    targets(mapName, syncBoth) {
      const m1 = store.state.map01
      const m2 = store.state.map02
      const active = store.state[mapName]
      return syncBoth ? [m1, m2] : [active]
    },
    // --- 回転（押している間）---
    pressRotateRight(mapName, { speed = 150, syncBoth = false } = {}) {
      const targets = this.targets(mapName, syncBoth)
      this.stopSpin?.()
      this.stopSpin = startHoldRotate(targets[0], { direction: +1, speed, targets })
    },
    pressRotateLeft(mapName, { speed = 150, syncBoth = false } = {}) {
      const targets = this.targets(mapName, syncBoth)
      this.stopSpin?.()
      this.stopSpin = startHoldRotate(targets[0], { direction: -1, speed, targets })
    },
    // --- ピッチ（押している間）---
    pressPitchUp(mapName, { speed = 100, syncBoth = false } = {}) {
      const targets = this.targets(mapName, syncBoth)
      this.stopPitch?.()
      this.stopPitch = startHoldPitch(targets[0], { direction: +1, speed, targets })
    },
    pressPitchDown(mapName, { speed = 100, syncBoth = false } = {}) {
      const targets = this.targets(mapName, syncBoth)
      this.stopPitch?.()
      this.stopPitch = startHoldPitch(targets[0], { direction: -1, speed, targets })
    },
    // --- 離したら停止（mouseup / touchend などで呼ぶ）---
    releaseOrientationButtons() {
      this.stopSpin?.(); this.stopSpin = null
      this.stopPitch?.(); this.stopPitch = null
    },
    // --- リセット---
    terrainReset (mapName) {
      const map    = this.$store.state[mapName]
      const other  = mapName === 'map01' ? this.$store.state.map02 : this.$store.state.map01
      resetOrientation({
        targetMap: map,
        syncMaps: [other],      // もう片方も同時に
        // syncPitch は既定で true（両方 pitch=0 & bearing=0）
        duration: 600,
        zeroTerrain: true,
        afterMoveEnd: () => this.updatePermalink()
      })
    },
    drawToolSet() {
      const vm = this
      class DrawTool {
        constructor(map) {
          this.map = map;
          this.minPolygonPoints = 3
          this.minLinePoints = 2

          // フローティングボタン要素（HTMLで作成済みと仮定）
          this.floatingGroup = document.getElementById('floating-buttons');
          this.confirmButton = document.getElementById('confirm-btn');
          this.undoButton = document.getElementById('undo-btn');
          this.cancelButton = document.getElementById('cancel-btn');

          // イベントバインド
          this.map.on('click', this.handleClick.bind(this));
          this.map.on('mousemove', this.handleMouseMove.bind(this));

          // ボタンイベント
          this.confirmButton.addEventListener('click', this.handleConfirm.bind(this));
          this.undoButton.addEventListener('click', this.handleUndo.bind(this));
          this.cancelButton.addEventListener('click', this.handleCancel.bind(this));
        }

        handleClick(e) {
          vm.cancelBtnMiniTooltip = '描きかけ中の全ポイントを削除'
          vm.undoBtnMiniTooltip = '直前のポイントを削除'
          vm.isUndoBtnDisabled = false
          if (!vm.s_isDrawLine && !vm.s_isDrawPolygon) return;
          const lng = e.lngLat.lng;
          const lat = e.lngLat.lat;
          vm.tempLineCoordsGuide.push([lng, lat]);
          vm.isDrawingLine = true;
          vm.confirmBtnColor = 'info'
          // UI位置追従: 最後のポイントにボタンを移動
          if (vm.tempLineCoordsGuide.length >= 2) {
            this.updateFloatingPosition(e.lngLat);
          }
        }

        handleMouseMove(e) {
        }

        updateFloatingPosition(lngLat) {
          // マップ座標を画面ピクセルに変換
          const map01Width = document.querySelector('#map01').clientWidth
          const pixel = this.map.project(lngLat);
          const panelW = this.floatingGroup.offsetWidth
          const M = 10; // マージン
          // 画面左半分: 右に余白 +M / 右半分: パネル幅ぶん左へ引く
          let left = (pixel.x <= map01Width / 2)
              ? pixel.x + M
              : pixel.x - panelW - M;
          // this.floatingGroup.style.left = `${left}px`;
          // this.floatingGroup.style.top = `${pixel.y + M}px`;
          animateRelocate(this.floatingGroup, left, pixel.y + M, { duration: 200, easing: 'ease-out' });
          vm.$store.state.showDrawConfrim = true
        }

        handleConfirm() {
          drawConfirm()
          // let minPoints
          // if (vm.s_isDrawPolygon) {
          //   minPoints = this.minPolygonPoints
          // } else if (vm.s_isDrawLine) {
          //   minPoints = this.minLinePoints
          // }
          // vm.tempLineCoordsGuide = dedupeCoords(vm.tempLineCoordsGuide)
          // if (vm.tempLineCoordsGuide.length < minPoints) {
          //   store.state.loadingMessage3 = `ポイントが足りません。最低${minPoints}点必要です。`
          //   store.state.loading3 = true
          //   setTimeout(() => {
          //     store.state.loading3 = false
          //   }, 2000)
          //   return
          // }
          // vm.finishDrawing()
          // this.resetDraw();
        }

        handleUndo() {
          // if (vm.tempLineCoordsGuide.length > 0) {
          //   vm.removeLastVertex()
          // }
          removeLastVertex()
        }

        handleCancel() {
          drawCancel()
          // this.resetDraw();
          // if (vm.s_editEnabled) {
          //   vm.map01.getSource('click-circle-source').setData(vm.prevGeojson)
          //   vm.finishDrawing()
          //   vm.clickCircleGeojsonText = JSON.stringify(vm.prevGeojson)
          //   vm.prevGeojson = null
          // }
        }

        resetDraw() {
          vm.finishLine()
          vm.$store.state.showDrawConfrim = false
        }
      }
      // DrawToolインスタンス化
      this.drawTool = new DrawTool(this.map01);
    },
    mapillaryClose() {
      mapillaryFilterRiset()
    },
    async mapillaryUserNameInput() {
      // if (!this.s_mapillaryUserName) {
      //   alert('ユーザー名を記入してください。')
      //   return
      // }
      const map01 = this.$store.state.map01
      this.$store.state.filter360 = null
      this.$store.state.targetSeq = null
      map01.setFilter('oh-mapillary-images', this.$store.state.filter360)
      map01.setPaintProperty('oh-mapillary-images', 'circle-color', '#35AF6D');
      await queryMapillaryByUserDatesViewport(map01, {
        username: this.s_mapillaryUserName,
        start: this.s_mapillaryStartDate,
        end: this.s_mapillaryEndDate
      })
    },
    exDrawOpen() {
      this.$store.dispatch('showFloatingWindow', 'exdraw');
    },
    drawListOpen() {
      if (this.showDrawListDrawer) {
        this.$store.commit('setDrawListDrawer', false)
      } else {
        this.$store.commit('setDrawListDrawer', true)
      }
    },
    popupDialogClose() {
      // const map01 = this.$store.state.map01
      // const id = store.state.drawFeatureId
      // const tgtProp = 'label'
      // const value = document.querySelector('.point-text').value
      // this.$store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
      const id = store.state.drawFeatureId
      lavelUpdate(null, id)
      this.s_popupDialog = false;
    },
    appUpdate() {
      location.reload(true)
      this.s_dialogForVersion = false
    },
    isDisabledChange() {
      this.isDisabled2 = false
    },
    drawGeojsonAddPicture() {
      const map01 = this.$store.state.map01
      if (!this.$store.state.drawGeojsonId) {
        alert('必要な引数がたりません')
        return
      }
      const id = this.$store.state.drawGeojsonId
      const tgtProp = 'pictureUrl'
      const borderRadius = this.thumbnailType.borderRadius
      const pictureUrl = this.s_pictureUrl
      const containerSize = this.thumbnailType.containerSize
      const containerColor = this.containerColor
      // const labelType = '0'
      const value = {pictureUrl, borderRadius, containerSize, containerColor}
      this.$store.state.clickCircleGeojsonText = geojsonUpdate(map01,null,clickCircleSource.iD,id,tgtProp,value)
    },
    triggerCamera() {
      const el = document.getElementById('iosCamInput')
      if (el) el.click()
    },
    onCameraPicked(e) {
      const file = e.target?.files?.[0] || null
      if (file) {
        this.s_selectedFile = file
        this.onFileSelected()
      }
      // 同じファイルを連続で選んでも change が発火するようにリセット
      e.target.value = ''
    },
    async savePicture() {
      store.state.loading2 = true
      store.state.loadingMessage = '保存中です。'
      if (this.isNewPicture) {
        let file = this.s_selectedFile
        if (!file) {
          alert("写真を選択してください");
          return;
        }
        const maxSize = 1 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          this.isDisabled = true
          store.state.loadingMessage = '<span style="color: red;">1mbを超えています。</span><br>圧縮しますので時間がかかります。'
        }

        if (isImageFile(file.name)) {
          // 画像サイズチェック
          if (file.size > maxSize) {
            // 10MB超え → 圧縮処理
            try {
              const blob = await compressImageToUnder10MB(file, file.type === 'image/png' ? 'image/png' : 'image/jpeg');
              if (blob.size > 1 * 1024 * 1024) {
                alert("10MB以下に圧縮できませんでした");
                return;
              }
              file = new File([blob], file.name, { type: blob.type });
              console.log('圧縮成功')
            } catch (err) {
              console.error("圧縮失敗:", err);
              alert("画像圧縮中にエラーが発生しました");
              return
            }
          }
          if (this.imgRotation !== 0) {
            const blob = await bakeRotationToBlob(file, this.imgRotation)
            const name = file.name
            file = new File([blob], name, { type: blob.type })
          }
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("dir", this.$store.state.userId || '0000notLoggedIn');
        try {
          const response = await fetch("https://kenzkenz.net/myphp/upload_picture.php", {
            method: "POST",
            body: formData,
          });
          const result = await response.json();
          if (result.success) {
            this.s_pictureUrl = result.webUrl
            this.drawGeojsonAddPicture()
            closeAllPopups()
            if (!this.$store.state.isUsingServerGeojson) {
              featureCollectionAdd()
              markerAddAndRemove()
            }
            // alert("更新成功。");
          } else {
            this.s_pictureUrl = null
            alert("更新失敗: " + result.message);
          }
        } catch (error) {
          console.error("更新エラー:", error);
          this.s_pictureUrl = null
          alert("通信エラー");
        }
        this.s_dialogForPicture = false
        // 更新されたので該当のキーを削除する。
        const geojson = this.map01.getSource(clickCircleSource.iD)._data
        const targetFeature = geojson.features.find(f => {
          return f.properties.id === this.$store.state.drawGeojsonId
        })
        const key = targetFeature.geometry.coordinates.join()
        removeThumbnailMarkerByKey(key)
      } else {
        if (this.imgRotation !== 0) {
          let file
          const response = await fetch(this.s_pictureUrl);
          let blob = await response.blob();
          file = new File([blob], this.s_pictureUrl, {type: blob.type});
          blob = await bakeRotationToBlob(file, this.imgRotation)
          const name = file.name
          file = new File([blob], name, {type: blob.type})
          const formData = new FormData();
          formData.append("file", file);
          formData.append("dir", this.$store.state.userId || '0000notLoggedIn');
          try {
            const response = await fetch("https://kenzkenz.net/myphp/upload_picture.php", {
              method: "POST",
              body: formData,
            });
            const result = await response.json();
            if (result.success) {
              this.s_pictureUrl = result.webUrl
              this.drawGeojsonAddPicture()
              closeAllPopups()
              if (!this.$store.state.isUsingServerGeojson) {
                featureCollectionAdd()
                markerAddAndRemove()
              }
              this.s_previewUrl = result.webUrl
              // alert("更新成功。");
            } else {
              this.s_pictureUrl = null
              alert("更新失敗: " + result.message);
            }
          } catch (error) {
            console.error("更新エラー:", error);
            this.s_pictureUrl = null
            alert("通信エラー");
          }
        } else {
          this.s_pictureUrl = null
          this.drawGeojsonAddPicture()
        }
        this.s_dialogForPicture = false
        setTimeout(() => {
          this.imgRotation = 0
        },100)
      }
      markerAddAndRemove()
      store.state.loading2 = false
      this.isDisabled = false
    },
    async deletePicture() {
      if (!this.s_pictureUrl) return
      if (!this.s_pictureUrl.includes(this.$store.state.userId)) {
        alert('他の人がアップした写真なので削除できません')
        return
      }
      if (!confirm("削除しますか？")) {
        return
      }
      const serverUrl = this.s_pictureUrl.replace('https://kenzkenz.net/','/var/www/html/public_html/')
      const formData = new FormData();
      formData.append("serverUrl", serverUrl);
      const response = await fetch("https://kenzkenz.net/myphp/unlink_picture.php", {
        method: "POST",
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        this.s_previewUrl = ''
        this.s_pictureUrl = ''
        const map01 = this.$store.state.map01
        const id = this.$store.state.drawGeojsonId
        const tgtProp = 'pictureUrl'
        const value = {pictureUrl: 'delete'}
        this.$store.state.clickCircleGeojsonText = geojsonUpdate(map01,null,clickCircleSource.iD,id,tgtProp,value)
        closeAllPopups()
        this.s_selectedFile = null

        // markaersRemove()
        // this.savePicture()

        alert("削除成功！");
      } else {
        alert("削除失敗！: " + result.message);
      }
    },
    onFileSelected() {
      if (this.s_selectedFile) {
        // 古いURLを解放（メモリリーク防止）
        if (this.s_previewUrl) {
          URL.revokeObjectURL(this.s_previewUrl);
          this.s_previewUrl = null
        }
        setTimeout(() => {
          this.s_previewUrl = URL.createObjectURL(this.s_selectedFile);
        },0)
        this.isNewPicture = true
      } else {
        this.s_previewUrl = null
      }
    },
    async test () {
      const tileJson = await fetchGsiTileTest()
      console.log(tileJson)
      const converTileJson = convertGsiTileJson2(tileJson)
      console.log(converTileJson)
    },
    openPaintEditorWindow() {
      this.$store.dispatch('showFloatingWindow', 'painteditor');
    },
    onPaintUpdate({ circle, symbol }) {
      console.log(circle)
      // Circle 設定反映
      // Object.entries(circle).forEach(([prop, val]) => {
      //   this.map.setPaintProperty('oh-point-circle-layer', prop, val)
      // })
      // // Symbol 設定反映
      // this.map.setLayoutProperty(
      //     'oh-point-symbol-layer',
      //     'text-field',
      //     symbol['text-field']
      // )
      // this.map.setPaintProperty(
      //     'oh-point-symbol-layer',
      //     'text-size',
      //     symbol['text-size']
      // )
      // this.map.setPaintProperty(
      //     'oh-point-symbol-layer',
      //     'text-color',
      //     symbol['text-color']
      // )
    },
    onWidthChangedForMapillary() {
      try {
        mapillaryViewer.resize()
      }catch (e) {
        console.log(e)
      }
    },
    onWidthChanged(newWidth) {
      this.qrCodeWidth = newWidth
    },
    openWindow() {
      this.$store.dispatch('showFloatingWindow', 'qrcode');
    },
    closeWindow() {
      this.$refs.floating.close();
    },
    async cachesCrear() {
        await caches.delete('raster-tile-cache');
        await caches.delete('vector-tile-cache');
        alert('クリアしました。')
    },
    async downloadTiles() {
      this.s_dialogForOffline2 = false
      const vm = this
      store.state.loading2 = true
      store.state.loadingMessage = 'タイルダウンロード中'
      // キャッシュを毎回クリア
      // if ('caches' in window) {
      //   await caches.delete('raster-tile-cache');
      //   await caches.delete('vector-tile-cache');
      // }
      // 1) ポリゴンから BBOX を取得
      let bbox = getBBoxFromPolygon(this.$store.state.featureForOfflineBbox)

      if (!navigator.serviceWorker.controller) {
        alert('サービスワーカーがアクティブではありません。ページをリロードしてください。');
        return;
      }

      const pmtilesUrl = 'https://kenzkenz3.xsrv.jp/pmtiles/homusyo/2025/2025final3.pmtiles'; // ベースURL（末尾に /z/x/y.pbf が付く想定）
      const rasterUrl = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'

      /** BBOX＋ズーム範囲内のタイル枚数を計算 */
      function countRasterTiles(bbox, minZoom, maxZoom) {
        let count = 0;
        for (let z = minZoom; z <= maxZoom; z++) {
          const [minX, minY] = lngLatToTile([bbox[0], bbox[3]], z);
          const [maxX, maxY] = lngLatToTile([bbox[2], bbox[1]], z);
          const tilesInZ = (maxX - minX + 1) * (maxY - minY + 1);
          console.log(`z=${z}: ${tilesInZ} tiles`);
          count += tilesInZ;
        }
        return count;
      }
      /**
       * 緯度経度 → Google XYZ タイル座標に変換
       */
      function lngLatToTile([lng, lat], z) {
        const n = 2 ** z;
        const x = Math.floor((lng + 180) / 360 * n);
        const y = Math.floor(
            (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) /
            2 *
            n
        );
        return [x, y];
      }

      /**
       * BBOX＋ズーム範囲だけ GSI のラスタータイルをキャッシュ
       * @param bbox [minLng, minLat, maxLng, maxLat]
       * @param minZoom 最小ズーム（例: 14）
       * @param maxZoom 最大ズーム（例: 16）
       * @param template URL テンプレート（デフォルトは GSI の標準地図）
       */
      async function cacheRasterTiles(
          bbox,
          minZoom,
          maxZoom,
          template = 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
      ) {
        // Service Worker 側と合わせたキャッシュ名
        const CACHE_NAME = 'raster-tile-cache';
        const cache = await caches.open(CACHE_NAME);
        for (let z = minZoom; z <= maxZoom; z++) {
          // BBOX の NW→SE でタイル範囲を算出
          const [minX, minY] = lngLatToTile([bbox[0], bbox[3]], z);
          const [maxX, maxY] = lngLatToTile([bbox[2], bbox[1]], z);

          for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
              // URL を生成
              const url = template
                  .replace('{z}', z)
                  .replace('{x}', x)
                  .replace('{y}', y);
              try {
                // fetch すると SW の CacheFirst 戦略で自動キャッシュ
                const res = await fetch(url);
                if (!res.ok) {
                  console.warn(`タイル取得失敗 ${z}/${x}/${y}`, res.status);
                  continue;
                }
                // 必要なら明示的に put しても OK
                await cache.put(url, res.clone());
                console.log(`Cached raster ${z}/${x}/${y}`);
                vm.tileCount++
                store.state.loadingMessage = `${vm.tileCount}/${vm.totalTileCount}`
              } catch (e) {
                console.error(`Error fetching raster ${z}/${x}/${y}`, e);
              }
            }
          }
        }
        console.log(`ラスター BBOX z:${minZoom}–${maxZoom} のキャッシュ完了。`);
      }
      this.totalTileCount = countRasterTiles(bbox, 2, 17)
      await cacheRasterTiles(bbox, 2, 17,rasterUrl)

      /**
       * BBOX＋ズーム範囲だけ pmtiles を部分キャッシュ
       * @param pmtilesUrl: PMTiles ファイルの URL
       * @param bbox: [minLng, minLat, maxLng, maxLat]
       * @param minZoom: 最小ズーム
       * @param maxZoom: 最大ズーム
       */
      async function cachePmtilesBuffers(pmtilesUrl, bbox, minZoom, maxZoom) {
        const pmtiles = new PMTiles(pmtilesUrl);

        // 必要ならヘッダを先読み（内部でインデックスを準備）
        await pmtiles.getHeader(); // ※open() は不要 :contentReference[oaicite:2]{index=2}

        // Service Worker 側と同じキャッシュ名
        const cache = await caches.open("vector-tile-cache");

        for (let z = minZoom; z <= maxZoom; z++) {
          // BBOX からタイルの x,y 範囲を算出
          const [minX, minY] = lngLatToTile([bbox[0], bbox[3]], z);
          const [maxX, maxY] = lngLatToTile([bbox[2], bbox[1]], z);

          for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
              // タイルデータを取得
              const tileResp = await pmtiles.getZxy(z, x, y);
              if (!tileResp) continue; // タイル未存在ならスキップ

              // ArrayBuffer → Response に変換してキャッシュへ登録
              const tileRequest = new Request(`${pmtilesUrl}/${z}/${x}/${y}.pbf`);
              const tileResponse = new Response(tileResp.data, {
                headers: { "Content-Type": "application/x-protobuf" }
              });
              await cache.put(tileRequest, tileResponse);
              console.log(`Cached tile ${z}/${x}/${y}`);
              vm.tileCount++
              store.state.loadingMessage = `${vm.tileCount}/${vm.totalTileCount}`
            }
          }
        }
        console.log(`PMTiles の BBOX z:${minZoom}–${maxZoom} 部分キャッシュ完了。`);
      }
      vm.tileCount = 0
      this.totalTileCount = countRasterTiles(bbox, 14, 16)
      await cachePmtilesBuffers(pmtilesUrl, bbox, 14, 16)

      store.state.loading2 = false
      alert('タイルのダウンロードが完了しました！');
    },
    bboxPolygon() {
      this.s_dialogForOffline = false
      const properties = {
        id: 'offlineBbox',
        color: 'rgba(0,0,0,0.1)'
      }
      createSquarePolygonAtCenter(10, properties)
      updateDragHandles(true)
      const map01 = this.$store.state.map01
      map01.easeTo({
        zoom: 10,
        duration: 1000,       // ミリ秒（例：1秒）
        easing: t => t        // イージング関数（ここでは線形）
      });
    },
    setMaxZIndex (targetEl) {
      targetEl.style.zIndex = getNextZIndex()
    },
    // ─── 連続拡大 ───
    startScaleUp() {
      this.scaleUpStep = 1;
      this.scaleUpInterval = setInterval(() => {
        this.scaleUpStep += 1;
        this.scaleValue = this.scaleValue + this.scaleUpStep
        this.onScaleInput(this.scaleValue)
      }, 100);
    },
    stopScaleUp() {
      if (this.scaleUpInterval) {
        clearInterval(this.scaleUpInterval);
        this.scaleUpInterval = null;
      }
      this.scaleUpStep = 1;
    },
    // ─── 連続縮小 ───
    startScaleDown() {
      this.scaleDownStep = -1;
      this.scaleDownInterval = setInterval(() => {
        this.scaleDownStep += -1;
        this.scaleValue = this.scaleValue + this.scaleDownStep
        this.onScaleInput(this.scaleValue)
      }, 100);
    },
    stopScaleDown() {
      if (this.scaleDownInterval) {
        clearInterval(this.scaleDownInterval);
        this.scaleDownInterval = null;
      }
      this.scaleDownStep = -1;
    },
    // ─── スライダーや入力ボックス連動用 ───
    onScaleInput(value) {
      scaleAndRotateLassoSelected(Number(value),Number(this.angleValue));
    },
    // ---------------------------------------------------------------------
    startAnglePlus() {
      this.plusStep = 1
      this.plusInterval = setInterval(() => {
        this.plusStep++
        this.angleValue = this.angleValue + this.plusStep
        this.onRotateInput(this.angleValue);
      }, 100)
    },
    stopAnglePlus() {
      if (this.plusInterval) {
        clearInterval(this.plusInterval)
        this.plusInterval = null
      }
      this.plusStep = 1
    },
    startAngleMinus() {
      this.minusStep = -1
      this.minusInterval = setInterval(() => {
        this.minusStep--
        this.angleValue = this.angleValue + this.minusStep
        this.onRotateInput(this.angleValue);
      }, 100)
    },
    stopAngleMinus() {
      if (this.minusInterval) {
        clearInterval(this.minusInterval)
        this.minusInterval = null
      }
      this.minusStep = -1
    },
    // ─── スライダーや入力ボックス連動用 ───
    onRotateInput(angle) {
      scaleAndRotateLassoSelected(Number(this.scaleValue),Number(angle));
    },
    // Backspace/Delete 押下で頂点削除
    onKeydown(e) {
      if (!this.s_isDrawLine && !this.s_isDrawPolygon) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        // e.preventDefault();
        removeLastVertex();
      }
    },
    // // 最後の頂点を一つ削除してプレビューを更新
    // removeLastVertex() {
    //   if (this.s_isDrawLine) {
    //     if (!this.tempLineCoords.length) return;
    //     const coords = this.tempLineCoords;
    //     if (!coords.length) return;
    //     // 最後の頂点がカーソル位置と重なっている場合は2回削除
    //     if (this.lastMouseLngLat && coords.length >= 1) {
    //       const [lastLng, lastLat] = coords[coords.length - 1];
    //       if (lastLng === this.lastMouseLngLat.lng && lastLat === this.lastMouseLngLat.lat) {
    //         // カーソル重なり頂点を2回削除
    //         coords.pop();
    //         if (coords.length) coords.pop();
    //         this.tempLineCoordsGuide = this.tempLineCoords
    //         this.updateDynamicLinePreview();
    //         return;
    //       }
    //     }
    //     // それ以外は1回だけ削除
    //     coords.pop();
    //     this.tempLineCoordsGuide = this.tempLineCoords
    //     this.updateDynamicLinePreview();
    //
    //   } else if (this.s_isDrawPolygon) {
    //     const coords = this.tempPolygonCoords;
    //     if (!coords.length) return;
    //     // 最後の頂点がカーソル位置と重なっている場合は2回削除
    //     if (this.lastMouseLngLat && coords.length >= 1) {
    //       const [lastLng, lastLat] = coords[coords.length - 1];
    //       if (lastLng === this.lastMouseLngLat.lng && lastLat === this.lastMouseLngLat.lat) {
    //         // カーソル重なり頂点を2回削除
    //         coords.pop();
    //         // guideCoords.pop()
    //         if (coords.length) coords.pop();
    //         this.tempLineCoordsGuide = this.tempPolygonCoords
    //         this.updateDynamicPolygonPreview();
    //         return;
    //       }
    //     }
    //     // それ以外は1回だけ削除
    //     console.log(this.tempPolygonCoords)
    //     coords.pop();
    //     this.tempLineCoordsGuide = this.tempPolygonCoords
    //     this.updateDynamicPolygonPreview();
    //   }
    // },
    // // 動的ラインプレビュー
    // updateDynamicLinePreview() {
    //   const map = this.$store.state.map01;
    //   const coords = this.tempLineCoords
    //   // if (coords.length && this.lastMouseLngLat) {
    //   //   coords.push([this.lastMouseLngLat.lng, this.lastMouseLngLat.lat]);
    //   // }
    //   map.getSource('guide-line-source').setData({
    //     type: 'FeatureCollection',
    //     features: [{
    //       type: 'Feature',
    //       geometry: { type: 'LineString', coordinates: coords },
    //       properties: {}
    //     }]
    //   });
    // },
    // // 動的ポリゴンプレビュー
    // updateDynamicPolygonPreview() {
    //   const map = this.$store.state.map01;
    //   const coords = this.tempPolygonCoords
    //
    //   // if (coords.length && this.lastMouseLngLat) {
    //   //   coords.push([this.lastMouseLngLat.lng, this.lastMouseLngLat.lat]);
    //   // }
    //
    //   map.getSource('guide-line-source').setData({
    //     type: 'FeatureCollection',
    //     features: [{
    //       type: 'Feature',
    //       geometry: { type: 'LineString', coordinates: coords },
    //       properties: {}
    //     }]
    //   });
    // },

    // マウス移動で動的プレビュー更新
    // onLineMouseMove(e) {
    //   if (!this.s_isDrawLine) return;
    //   const map = this.$store.state.map01;
    //   this.lastMouseLngLat = e.lngLat;
    //   const coords = this.tempLineCoords.slice();
    //   if (coords.length) coords.push([e.lngLat.lng, e.lngLat.lat]);
    //   map.getSource('guide-line-source').setData({
    //     type: 'FeatureCollection',
    //     features: [{
    //       type: 'Feature',
    //       geometry: { type: 'LineString', coordinates: coords },
    //       properties: {}
    //     }]
    //   });
    // },
    //
    // // マウス移動で動的プレビュー更新
    // onPolygonMouseMove(e) {
      // if (!this.s_isDrawPolygon) return;
      // const map = this.$store.state.map01;
      // this.lastMouseLngLat = e.lngLat;
      // const coords = this.tempPolygonCoords.slice();
      // if (coords.length) coords.push([e.lngLat.lng, e.lngLat.lat]);
      // map.getSource('guide-line-source').setData({
      //   type: 'FeatureCollection',
      //   features: [{
      //     type: 'Feature',
      //     geometry: { type: 'LineString', coordinates: coords },
      //     properties: {}
      //   }]
      // });
    // },

    uploadChibanzu () {
      this.dialogForChibanzyOrDraw = false
      const vm = this
      async function aaa () {
        vm.s_chibanzuPropaties = await extractFirstFeaturePropertiesAndCheckCRS(vm.s_geojsonFile)
        vm.s_showChibanzuDialog = true
      }
      aaa()
    },
    uploadMyroomKml () {
      this.dialogForDraw = false
      const layerName = this.s_geojsonFile.name.split('.')[0]
      const label = 'name'
      pmtilesGenerate (
          this.geojsonForDraw,
          layerName,
          label
      )
    },
    uploadDrawKml () {
      this.dialogForDraw = false
      this.geojsonForDraw.features.forEach(feature => {
        const geoType = feature.geometry.type
        const props = feature.properties
        props.label = props.name
        geoType === 'Polygon' ? props.color = 'rgba(0,0,0,0.1)' :  props.color = 'black'
        props.offsetValue = [0.6, 0]
        props.textAnchor = 'left'
        props.textJustify = 'left'
      })
      addDraw(this.geojsonForDraw,true)
    },
    async uploadDrawCsv () {
      if (!this.csvLabelColumn) {
        alert('必須項目が選択されていません。')
        return
      }
      if (this.csvLonLat) {
        this.dialogForDrawCsv = false
        const features = [];
        const len = this.csvRecords.length
        for (let i = 0; i < len; i++) {
          const row = this.csvRecords[i];
          const props = Object.fromEntries(
              this.csvColumns.map(col => [col, row[col]])
          );
          const pointColor = row[this.csvColorColumn] || 'black'
          props.label = row[this.csvLabelColumn] || ''
          props.longText = sanitizeLongText(row[this.csvLongTextColumn]) || ''
          props.color = 'black'
          props.offsetValue = [0.6, 0]
          props.textAnchor = 'left'
          props.textJustify = 'left'
          props['point-color'] = pointColor
          if (row[this.csvPictureUrlColumn]) {
            props.pictureUrl = row[this.csvPictureUrlColumn]
          }
          features.push({
            type: 'Feature',
            properties: props,
            geometry: {
              type: 'Point',
              coordinates: [row[this.csvLonLat.lon], row[this.csvLonLat.lat]]
            }
          });
        }
        const geojson = { type: 'FeatureCollection', features };
        addDraw(geojson,true)
      } else {
        store.state.loading2 = true
        store.state.loadingMessage = 'ジオコーディング中'
        this.dialogForDrawCsv = false
        const features = [];
        const len = this.csvRecords.length
        for (let i = 0; i < len; i++) {
          const row = this.csvRecords[i];
          const address = (row[this.csvAddressColumn] || '').replace(/^〒\d{3}-\d{4}\s*/, '').trim();
          if (!address) continue;
          const geo = await geocode(address);
          if (geo) {
            const props = Object.fromEntries(
                this.csvColumns.map(col => [col, row[col]])
            );
            const pointColor = row[this.csvColorColumn] || 'black'
            props.label = row[this.csvLabelColumn]
            props.color = 'black'
            props.offsetValue = [0.6, 0]
            props.textAnchor = 'left'
            props.textJustify = 'left'
            props['point-color'] = pointColor
            features.push({
              type: 'Feature',
              properties: props,
              geometry: {
                type: 'Point',
                coordinates: geo.geometry.coordinates
              }
            });
          }
          store.state.loadingMessage = i + '/' + len + ' ' + row[this.csvLabelColumn] + ' ' + (geo? '成功' : '失敗')
          await delay0(10);
        }
        const geojson = { type: 'FeatureCollection', features };
        addDraw(geojson,true)
        store.state.loading2 = false
      }
    },
    async uploadMyLayer () {
      if (!this.s_gazoName) {
        alert('レイヤー名を記入してください')
        return
      }
      this.dialogForChibanzyOrDraw = false
      this.dialogForLayerName = false
      this.s_propnames = await extractFirstFeaturePropertiesAndCheckCRS(this.s_geojsonFile)
      console.log(this.s_geojsonFile)
      // const layerName = this.s_geojsonFile.name.split('.')[0]
      const layerName = this.s_gazoName
      const label = 'name'
      const id = await pmtilesGenerate (
          null,
          layerName,
          '',
          this.s_geojsonFile,
      )
      this.s_pmtiles0Id = id
      this.s_pmtiles0Name = this.s_gazoName
      this.$store.state.pmtilesFirstSave = true
      this.openPaintEditorWindow()
    },
    uploadDraw () {
      this.dialogForChibanzyOrDraw = false
      const reader = new FileReader();
      const map = this.$store.state.map01
      reader.onload = (event) => {
        const geojson = JSON.parse(event.target.result)
        addDraw(geojson,true)
      }
      reader.readAsText(this.s_geojsonFile);
    },
    startTiling () {
      this.transparentType = '1'
      tileGenerateForUser('png','pgw',true)
      this.showTileDialog = false
    },
    onImageLoad() {
      this.imageLoaded = true;
      console.log('Image loaded');
    },
    openTileUploadDialog() {
      // ダイアログを開く前に変換後の画像とワールドファイルをstoreに保存
      if (this.showWarpCanvas) {
        const canvas = document.querySelector("#warp-canvas");
        if (!canvas || !canvas.toBlob) {
          console.error('Canvas or toBlob is not available. Canvas:', canvas);
          return;
        }

        // キャンバスの準備を確認
        if (canvas.width === 0 || canvas.height === 0) {
          console.error('Canvas dimensions are invalid:', { width: canvas.width, height: canvas.height });
          return;
        }

        canvas.toBlob(blob => {
          if (!blob) {
            console.error('Failed to create blob from canvas');
            return;
          }
          const baseName = this.gazoNameFromStore || 'converted'; // デフォルト名を考慮
          const convertedImage = new File([blob], `${baseName}.png`, { type: 'image/png' });
          const worldFileContent = this.generateWorldFile();
          if (!worldFileContent) {
            console.error('World file generation failed');
            return;
          }
          // ワールドファイルを同名.pgwとして保存
          const worldFile = new File([worldFileContent], `${baseName}.pgw`, { type: 'text/plain' });

          // storeに保存
          this.$store.commit('setTiffAndWorldFile', [convertedImage, worldFile]);

          // ワールドファイルの内容をコンソールログで表示
          console.log('World File Content:', worldFileContent);
          console.log('Saved Files:', { image: convertedImage.name, world: worldFile.name }); // デバッグ用
        }, 'image/png');
      }
      this.showTileDialog = true;
    },
    generateWorldFile() {
      if (this.gcpList.length < 4) {
        console.warn('GCPが4点以上必要です');
        return null;
      }

      const gcpImageCoords = this.gcpList.map(gcp => gcp.imageCoord);
      const gcpMapCoords = this.gcpList.map(gcp => {
        const [lng, lat] = gcp.mapCoord;
        // WGS84 → Webメルカトル
        const x = lng * 20037508.34 / 180;
        const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
        const yMeters = y * 20037508.34 / 180;
        return [x, yMeters];
      });

      const N = gcpImageCoords.length;
      const M = 6; // アフィン係数6個

      const A = new Array(M).fill(0).map(() => new Array(M).fill(0));
      const b = new Array(M).fill(0);

      for (let i = 0; i < N; i++) {
        const [x, y] = gcpImageCoords[i];
        const [X, Y] = gcpMapCoords[i];

        const rowX = [x, y, 1, 0, 0, 0]; // X = Ax + By + C
        const rowY = [0, 0, 0, x, y, 1]; // Y = Dx + Ey + F

        for (let j = 0; j < M; j++) {
          for (let k = 0; k < M; k++) {
            A[j][k] += rowX[j] * rowX[k] + rowY[j] * rowY[k];
          }
          b[j] += rowX[j] * X + rowY[j] * Y;
        }
      }

      // 解く（ガウス消去法）
      const solve = (A, b) => {
        const n = b.length;
        for (let i = 0; i < n; i++) {
          // Pivot
          let maxRow = i;
          for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
              maxRow = k;
            }
          }
          [A[i], A[maxRow]] = [A[maxRow], A[i]];
          [b[i], b[maxRow]] = [b[maxRow], b[i]];

          // Eliminate
          for (let k = i + 1; k < n; k++) {
            const factor = A[k][i] / A[i][i];
            for (let j = i; j < n; j++) {
              A[k][j] -= factor * A[i][j];
            }
            b[k] -= factor * b[i];
          }
        }

        // Back substitution
        const x = new Array(n);
        for (let i = n - 1; i >= 0; i--) {
          let sum = 0;
          for (let j = i + 1; j < n; j++) {
            sum += A[i][j] * x[j];
          }
          x[i] = (b[i] - sum) / A[i][i];
        }

        return x;
      };

      const coeffs = solve(A, b);
      const [A_, B_, C_, D_, E_, F_] = coeffs;

      // デバッグ表示
      console.log('Affine Coefficients:', coeffs);

      const worldFileContent = `
            ${A_.toFixed(10)}
            ${D_.toFixed(10)}
            ${B_.toFixed(10)}
            ${E_.toFixed(10)}
            ${C_.toFixed(10)}
            ${F_.toFixed(10)}
            `.trim();

      return worldFileContent;
    },
    previewAffineWarp() {
      let gcpListToUse;

      if (this.gcpList.length === 2) {
        this.gcpList = autoCompleteGcpToRectangle(this.gcpList);
      } else if (this.gcpList.length >= 4) {
        // gcpListToUse = this.gcpList;
        console.log()
      } else {
        console.warn('GCPは2点または4点以上が必要です（3点は不可）');
        return;
      }
      this.showOriginal = false;
      this.showWarpCanvas = true;
      this.$nextTick(() => {
        ensureOpenCvReady(() => {
          const canvas = document.getElementById('warp-canvas');
          const map = this.$store.state.map01;
          const img = document.getElementById('warp-image');

          if (!canvas || !img || !map || typeof window.cv === 'undefined') {
            console.warn('必要な要素またはOpenCVが読み込まれていません');
            return;
          }

          if (!img.complete) {
            img.onload = () => this.previewAffineWarp();
            return;
          }

          const src = window.cv.imread('warp-image');

          if (src.empty() || src.cols === 0 || src.rows === 0) {
            console.error('Failed to load image into Mat');
            src.delete();
            return;
          }
          console.log('Image size:', src.cols, src.rows);

          if (this.gcpList.length < 4) {
            console.warn('GCPが4点以上必要です');
            return;
          }

          const from = this.gcpList.slice(0, 4).map(gcp => gcp.imageCoord);
          const to = this.gcpList.slice(0, 4).map(gcp => convertLngLatToImageXY(gcp.mapCoord, map, img));

          console.log('From points:', from);
          console.log('To points:', to);

          const minX = Math.min(...to.map(p => p[0]));
          const maxX = Math.max(...to.map(p => p[0]));
          const minY = Math.min(...to.map(p => p[1]));
          const maxY = Math.max(...to.map(p => p[1]));

          const scaleX = src.cols / (maxX - minX);
          const scaleY = src.rows / (maxY - minY);
          const scaledTo = to.map(p => [
            (p[0] - minX) * scaleX,
            (p[1] - minY) * scaleY
          ]);
          console.log('Scaled To points:', scaledTo);

          canvas.width = src.cols;
          canvas.height = src.rows;
          const size = new window.cv.Size(src.cols, src.rows);

          try {
            const dst = new window.cv.Mat();
            const srcQuad = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
              from[0][0], from[0][1],
              from[1][0], from[1][1],
              from[2][0], from[2][1],
              from[3][0], from[3][1]
            ].map(Number));
            const dstQuad = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
              scaledTo[0][0], scaledTo[0][1],
              scaledTo[1][0], scaledTo[1][1],
              scaledTo[2][0], scaledTo[2][1],
              scaledTo[3][0], scaledTo[3][1]
            ].map(Number));

            const warpMat = window.cv.getPerspectiveTransform(srcQuad, dstQuad);
            if (warpMat.empty()) {
              console.error('Invalid transformation matrix');
              srcQuad.delete();
              dstQuad.delete();
              src.delete();
              dst.delete();
              return;
            }

            window.cv.warpPerspective(src, dst, warpMat, size, window.cv.INTER_LINEAR, window.cv.BORDER_CONSTANT, new window.cv.Scalar());

            if (dst.empty()) {
              console.error('Transformation failed, output Mat is empty');
            } else {
              window.cv.imshow('warp-canvas', dst);
              console.log('Transformation applied');

              // ✅ 黒っぽいピクセルを透過（Canvas操作）
              const ctx = canvas.getContext('2d');
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              const threshold = 50; // ← ここを変えると検出の厳しさが変わる

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const avg = (r + g + b) / 3;
                if (avg < threshold) {
                  data[i + 3] = 0; // alpha = 0 に
                }
              }

              ctx.putImageData(imageData, 0, 0);
            }

            src.delete();
            dst.delete();
            srcQuad.delete();
            dstQuad.delete();
            warpMat.delete();
          } catch (e) {
            console.error('OpenCV処理中にエラーが発生しました:', e);
          }
        });
      });
    },

    clearWarp() {
      this.showOriginal = true;
      this.showWarpCanvas = false;
      const canvas = document.getElementById('warp-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); // キャンバスをクリア
      }
      this.showOriginal = true; // 変換前を表示
      this.showWarpCanvas = false; // 変換後を非表示
      this.showWarpCanvas = false;
    },
    // previewAffineWarp() {
    //   this.$nextTick(() => {
    //     ensureOpenCvReady(() => {
    //       const canvas = document.getElementById('warp-canvas');
    //       const map = this.$store.state.map01;
    //       const img = document.getElementById('warp-image');
    //
    //       if (!canvas || !img || !map || typeof window.cv === 'undefined') {
    //         console.warn('必要な要素またはOpenCVが読み込まれていません');
    //         return;
    //       }
    //
    //       if (!img.complete) {
    //         img.onload = () => this.previewAffineWarp();
    //         return;
    //       }
    //
    //       const src = window.cv.imread('warp-image');
    //       if (src.empty() || src.cols === 0 || src.rows === 0) {
    //         console.error('Failed to load image into Mat');
    //         src.delete();
    //         return;
    //       }
    //       console.log('Image size:', src.cols, src.rows);
    //
    //       if (this.gcpList.length < 4) {
    //         console.warn('GCPが4点以上必要です');
    //         return;
    //       }
    //
    //       const from = this.gcpList.slice(0, 4).map(gcp => gcp.imageCoord);
    //       const to = this.gcpList.slice(0, 4).map(gcp => convertLngLatToImageXY(gcp.mapCoord, map, img));
    //
    //       console.log('From points:', from);
    //       console.log('To points:', to);
    //
    //       const minX = Math.min(...to.map(p => p[0]));
    //       const maxX = Math.max(...to.map(p => p[0]));
    //       const minY = Math.min(...to.map(p => p[1]));
    //       const maxY = Math.max(...to.map(p => p[1]));
    //
    //       const scaleX = src.cols / (maxX - minX);
    //       const scaleY = src.rows / (maxY - minY);
    //       const scaledTo = to.map(p => [
    //         (p[0] - minX) * scaleX,
    //         (p[1] - minY) * scaleY
    //       ]);
    //       console.log('Scaled To points:', scaledTo);
    //
    //       canvas.width = src.cols; // 580
    //       canvas.height = src.rows; // 506
    //       const size = new window.cv.Size(src.cols, src.rows);
    //
    //       try {
    //         const dst = new window.cv.Mat();
    //         const srcQuad = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
    //           from[0][0], from[0][1],
    //           from[1][0], from[1][1],
    //           from[2][0], from[2][1],
    //           from[3][0], from[3][1]
    //         ].map(Number));
    //         const dstQuad = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
    //           scaledTo[0][0], scaledTo[0][1],
    //           scaledTo[1][0], scaledTo[1][1],
    //           scaledTo[2][0], scaledTo[2][1],
    //           scaledTo[3][0], scaledTo[3][1]
    //         ].map(Number));
    //
    //         const warpMat = window.cv.getPerspectiveTransform(srcQuad, dstQuad);
    //         if (warpMat.empty()) {
    //           console.error('Invalid transformation matrix');
    //           srcQuad.delete();
    //           dstQuad.delete();
    //           src.delete();
    //           dst.delete();
    //           return;
    //         }
    //
    //         window.cv.warpPerspective(src, dst, warpMat, size, window.cv.INTER_LINEAR, window.cv.BORDER_CONSTANT, new window.cv.Scalar());
    //
    //         if (dst.empty()) {
    //           console.error('Transformation failed, output Mat is empty');
    //         } else {
    //           window.cv.imshow('warp-canvas', dst);
    //           console.log('Transformation applied');
    //         }
    //
    //         src.delete();
    //         dst.delete();
    //         srcQuad.delete();
    //         dstQuad.delete();
    //         warpMat.delete();
    //         this.showWarpCanvas = true;
    //       } catch (e) {
    //         console.error('OpenCV処理中にエラーが発生しました:', e);
    //       }
    //     });
    //   });
    // },
    // clearWarpCanvas() {
    //   const canvas = document.querySelector('#warp-canvas');
    //   if (!canvas) return;
    //   const ctx = canvas.getContext('2d');
    //   if (ctx) {
    //     ctx.clearRect(0, 0, canvas.width, canvas.height);
    //   }
    //   this.showWarpCanvas = false;
    // },

    removeFloatingImage() {
      if (!confirm('本当に画像とGCPをすべて削除しますか？')) return;
      this.clearWarp()
      // アップロード画像とGCP関連
      this.uploadedImageUrl = null;
      this.gcpList = [];
      this.hoveredRow = null;

      // マーカー類の削除（存在する場合に限り）
      this.removeImageMarkers?.();
      this.removeMapMarkers?.();

      // 保存済みローカルデータの削除
      localStorage.removeItem('savedGcp');
      localStorage.removeItem('savedImage');

      // 仮ワープCanvasの消去（サイズは維持し、クリアのみ）
      const canvas = document.querySelector('#warp-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        // 👇 サイズは0にしないことで次回の描画が可能になる
        // canvas.width = 0;
        // canvas.height = 0;
      }

      // Blobや一時ファイルがあればnullにして明示的に削除（例: Vuexに保持している場合）
      this.$store.commit('setTiffAndWorldFile', null);

      // 自分自身の表示も消す
      this.showFloatingImage = false;

      console.log('画像・GCP・Canvas・一時データをすべて削除しました');
    },


    // removeFloatingImage() {
    //   if (!confirm('本当に画像とGCPをすべて削除しますか？')) return;
    //
    //   // アップロード画像とGCP関連
    //   this.uploadedImageUrl = null;
    //   this.gcpList = [];
    //   this.hoveredRow = null;
    //
    //   // マーカー類の削除（存在する場合に限り）
    //   this.removeImageMarkers?.();
    //   this.removeMapMarkers?.();
    //
    //   // 保存済みローカルデータの削除
    //   localStorage.removeItem('savedGcp');
    //   localStorage.removeItem('savedImage');
    //
    //   // 仮ワープCanvasの消去
    //   const canvas = document.querySelector('#warp-canvas');
    //   if (canvas) {
    //     const ctx = canvas.getContext('2d');
    //     ctx?.clearRect(0, 0, canvas.width, canvas.height);
    //     canvas.width = 0; // サイズを0にして明示的に無効化
    //     canvas.height = 0;
    //   }
    //
    //   // Blobや一時ファイルがあればnullにして明示的に削除（例: Vuexに保持している場合）
    //   this.$store.commit('setTiffAndWorldFile', null);
    //
    //   // 自分自身の表示も消す
    //   this.showFloatingImage = false;
    //
    //   console.log('画像・GCP・Canvas・一時データをすべて削除しました');
    // },

    // removeFloatingImage() {
    //   if (!confirm('本当に画像とGCPをすべて削除しますか？')) return;
    //
    //   this.uploadedImageUrl = null;
    //   this.gcpList = [];
    //   this.hoveredRow = null;
    //
    //   // マーカー類の削除（関数が分かれていると仮定）
    //   this.removeImageMarkers?.();
    //   this.removeMapMarkers?.();
    //
    //   // 保存済みデータもクリア
    //   localStorage.removeItem('savedGcp');
    //   localStorage.removeItem('savedImage');
    //
    //   // 仮ワープ表示を消す処理があるならここで（例）
    //   this.removeWarpPreview?.();
    //
    //   console.log('画像とGCPをすべて削除しました');
    // },
    removeImageMarkers() {
      // 画像側のマーカーDOMを全て削除
      const container = this.$el.querySelector('.floating-image-panel');
      const markers = container?.querySelectorAll('.image-marker');
      markers?.forEach(marker => marker.remove());
    },
    removeMapMarkers() {
      if (this.mapCoordMarkers && this.mapCoordMarkers.length > 0) {
        this.mapCoordMarkers.forEach(marker => marker.remove());
        this.mapCoordMarkers = [];
      }
    },
    // ✅ GCPをlocalStorageに保存
    saveGcpToLocal() {
      try {
        localStorage.setItem('oh3_gcp_backup', JSON.stringify(this.gcpList));
        alert('GCPを保存しました');
      } catch (e) {
        alert('保存に失敗しました');
      }
    },
    // ✅ localStorageから復元
    loadGcpFromLocal() {
      const raw = localStorage.getItem('oh3_gcp_backup');
      if (!raw) {
        alert('保存されたGCPが見つかりません');
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error();
        this.gcpList = parsed;
        // 地図マーカーを再描画（画像マーカーは自動）
        this.updateMapMarkers?.();
        alert('GCPを復元しました');
      } catch (e) {
        alert('復元に失敗しました');
      }
    },
    resetGcp() {
      if (!confirm('GCPをリセットしてよろしいですか？')) return;
      // GCP一覧を初期化
      this.gcpList = [];
      // 地図側マーカーが存在すれば削除
      if (this.mapCoordMarkers && Array.isArray(this.mapCoordMarkers)) {
        this.mapCoordMarkers.forEach(marker => marker.remove());
        this.mapCoordMarkers = [];
      }
      // ※画像側マーカーは gcpList が空になれば v-for 側で自動的に非表示になる
    },
    removeGcp(index) {
      this.gcpList.splice(index, 1);
      this.updateMapMarkers(); // 地図側更新
    },
    updateImageCoordX(i, val) {
      const num = parseFloat(val);
      if (!this.gcpList[i].imageCoord) this.gcpList[i].imageCoord = [0, 0];
      this.gcpList[i].imageCoord[0] = isNaN(num) ? 0 : num;
    },
    updateImageCoordY(i, val) {
      const num = parseFloat(val);
      if (!this.gcpList[i].imageCoord) this.gcpList[i].imageCoord = [0, 0];
      this.gcpList[i].imageCoord[1] = isNaN(num) ? 0 : num;
    },
    updateMapCoordLng(i, val) {
      const num = parseFloat(val);
      if (!this.gcpList[i].mapCoord) this.gcpList[i].mapCoord = [0, 0];
      this.gcpList[i].mapCoord[0] = isNaN(num) ? 0 : num;
      this.updateMapMarkers(); // 地図マーカー再描画（オプション）
    },
    updateMapCoordLat(i, val) {
      const num = parseFloat(val);
      if (!this.gcpList[i].mapCoord) this.gcpList[i].mapCoord = [0, 0];
      this.gcpList[i].mapCoord[1] = isNaN(num) ? 0 : num;
      this.updateMapMarkers(); // 地図マーカー再描画（オプション）
    },
    startDragging(event, index) {
      const imgBox = event.target.closest('.floating-image-panel');
      if (!imgBox) return;

      const onMouseMove = (e) => {
        const rect = imgBox.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.gcpList[index].imageCoord = [x, y];

        // 👇 ここでログ出す（ドラッグ中リアルタイム）
        console.log(`GCP[${index}].imageCoord = [${x.toFixed(1)}, ${y.toFixed(1)}]`);
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        const [x, y] = this.gcpList[index].imageCoord;
        // 👇 ドラッグ終了後に最終位置をログ出す
        console.log(`GCP[${index}] ドラッグ完了 → [${x.toFixed(1)}, ${y.toFixed(1)}]`);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    updateMapMarkers() {
      const map = this.$store.state.map01;

      // 既存マーカーを削除
      this.mapCoordMarkers.forEach(marker => marker.remove());
      this.mapCoordMarkers = [];

      this.gcpList.forEach((gcp, index) => {
        if (!gcp.mapCoord) return;

        // 番号付きの要素を作る
        const el = document.createElement('div');
        el.innerText = String(index + 1);
        el.style.cssText = `
        background: blue;
        color: white;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        text-align: center;
        line-height: 22px;
        font-size: 12px;
        font-weight: bold;
        box-shadow: 0 0 2px rgba(0,0,0,0.6);
        cursor: move;
      `;

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
          draggable: true  // ← ドラッグ可能に
        })
            .setLngLat(gcp.mapCoord)
            .addTo(map);

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          gcp.mapCoord = [lngLat.lng, lngLat.lat];  // 🔥 GCPを更新！
          console.log('新しい座標:', lngLat);
        });

        this.mapCoordMarkers.push(marker);
      });
    },
    getImageMarkerStyle([x, y]) {
      return {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)',
      };
    },
    onMapClick(e) {
      if (!this.gcpList.length) {
        return;
      }
      const last = this.gcpList.find(gcp => gcp.mapCoord === null);
      if (!last) {
        alert("先に画像側で対応点をクリックしてください");
        return;
      }
      const lngLat = [e.lngLat.lng, e.lngLat.lat];
      last.mapCoord = lngLat;
      console.log(`地図クリック: [${lngLat[0].toFixed(6)}, ${lngLat[1].toFixed(6)}] をセット`);

    },
    onImageClick(event) {
      const imgEl = event.target;
      const rect = imgEl.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.gcpList.push({
        imageCoord: [x, y],
        mapCoord: null
      });
      console.log(`画像クリック: [${x.toFixed(1)}, ${y.toFixed(1)}] を追加`);
      // GCP登録時に次の操作を明示
      // if (this.gcpList.length === 0 || this.gcpList[this.gcpList.length - 1].mapCoord !== null) {
      //   this.gcpStep = 'image'; // 次は画像をクリックしてください
      // } else {
      //   this.gcpStep = 'map'; // 次は地図をクリックしてください
      // }
    },
    test0 () {
      const vm = this
      const map = this.$store.state.map01
      this.$store.state.isMoveMode = !this.$store.state.isMoveMode;
      // 初期化時に移動モードに応じてインタラクションを設定
      function updateMapInteractions() {
        if (vm.$store.state.isMoveMode) {
          map.dragPan.disable(); // パンを無効化
          map.touchZoomRotate.disable(); // タッチでのズーム/回転を無効化
          map.scrollZoom.disable(); // スクロールズームを無効化
        } else {
          alert('pan')
          map.dragPan.enable(); // パンを有効化
          map.touchZoomRotate.enable(); // タッチでのズーム/回転を有効化
          map.scrollZoom.enable(); // スクロールズームを有効化
        }
      }
      updateMapInteractions()
    },
    elevationCreate () {
      const vm = this
      this.$store.state.pointSima = false
      const pointGeojson = splitLineStringIntoPoints(this.$store.state.tgtFeature, this.segments)
      async function updateAllElevations() {
        await Promise.all(pointGeojson.features.map(async (feature) => {
          const [lon, lat] = feature.geometry.coordinates;
          const z = await fetchElevation(lon, lat);
          feature.geometry.coordinates[2] = Number(z);
        }));
        vm.$store.state.elevationGeojson = pointGeojson
        store.commit('incrDialog2Id');
        store.commit('incrDialogMaxZindex');
        let left
        if (window.innerWidth < 600) {
          left = (window.innerWidth / 2 - 175) + 'px'
        } else {
          left = (document.querySelector('#map01').clientWidth - 660) + 'px'
        }
        const diialog =
            {
              id: store.state.dialog2Id,
              name: 'elevation',
              style: {
                display: 'block',
                top: '60px',
                left: left,
                'z-index': store.state.dialogMaxZindex
              }
            }
        store.commit('pushDialogs2', {mapName: 'map01', dialog: diialog})
      }
      updateAllElevations();
    },
    pointCsvCreate (){
      this.$store.state.pointSima = false
      const pointGeojson = splitLineStringIntoPoints(this.$store.state.tgtFeature, this.segments)
      async function updateAllElevations() {
        await Promise.all(pointGeojson.features.map(async (feature) => {
          const [lon, lat] = feature.geometry.coordinates;
          const z = await fetchElevation(lon, lat);
          feature.geometry.coordinates[2] = Number(z);
        }));
        const epsg = zahyokei.find(item => item.kei === store.state.zahyokei).code
        const convertedGeojson = convertFromEPSG4326(pointGeojson, epsg)
        console.log(convertedGeojson)
        downloadGeoJSONAsCSV(convertedGeojson,getNowFileNameTimestamp() + '.csv')
      }
      updateAllElevations();
    },
    pointSimaCreate () {
      this.$store.state.pointSima = false
      const pointGeojson = splitLineStringIntoPoints(this.$store.state.tgtFeature, this.segments)
      async function updateAllElevations() {
        await Promise.all(pointGeojson.features.map(async (feature) => {
          const [lon, lat] = feature.geometry.coordinates;
          const z = await fetchElevation(lon, lat);
          feature.geometry.coordinates[2] = Number(z);
        }));
        const epsg = zahyokei.find(item => item.kei === store.state.zahyokei).code
        const convertedGeojson = convertFromEPSG4326(pointGeojson, epsg)
        const simaText = geoJSONToSIMA(convertedGeojson)
        downloadTextFile(`${getNowFileNameTimestamp()}.sim`, simaText, 'shift-jis')
      }
      updateAllElevations();
    },
    dialogForDlOpen () {
      this.dialogForDl = true
    },
    dialogForSaveDXFOpen () {
      this.dialogForSaveDXF2 = true
    },
    saveGpx() {
      gpxDownload(JSON.parse(this.$store.state.clickCircleGeojsonText))
      this.dialogForDl = false
    },
    saveSima() {
      const geojson = JSON.parse(this.$store.state.clickCircleGeojsonText)
      const epsg = zahyokei.find(item => item.kei === store.state.zahyokei).code
      const convertedGeojson = convertFromEPSG4326(geojson, epsg)
      const simaText = geoJSONToSIMA(convertedGeojson)
      downloadTextFile(`${getNowFileNameTimestamp()}.sim`, simaText, 'shift-jis')
      this.dialogForDl = false
    },
    saveGeojson() {
      const geojson = JSON.parse(this.$store.state.clickCircleGeojsonText)
      geojsonDownload(geojson)
      this.dialogForDl = false
    },
    saveKml() {
      kmlDownload(JSON.parse(this.$store.state.clickCircleGeojsonText))
      this.dialogForDl = false
    },
    saveDxf() {
      DXFDownload()
      this.dialogForSaveDXF2 = false
    },
    saveHistory() {
      // ディープコピーで保存！
      const map = this.$store.state.map01
      let mainSourceGeojson
      try {
        if (map.getSource('click-circle-source')) {
          mainSourceGeojson = map.getSource('click-circle-source')._data;
        } else {
          mainSourceGeojson = JSON.parse(store.state.clickCircleGeojsonText)
        }
        this.history.push(JSON.parse(JSON.stringify(mainSourceGeojson)));
        // Undo後の新編集はredo履歴クリア
        this.redoStack = [];
      }catch (e) {
        console.log(e)
      }
    },
    async undo() {
      drawUndo()
      // if (!this.$store.state.isEditable && !this.$store.state.isMine) {
      //   alert('編集不可です！！')
      //   return
      // }
      // const map = this.$store.state.map01
      // const mainSourceGeojson = map.getSource('click-circle-source')._data;
      // if (this.history.length > 0) {
      //   this.redoStack.push(JSON.parse(JSON.stringify(mainSourceGeojson)));
      //   this.mainGeojson = this.history.pop();
      //
      //   /**
      //    *注意 不安定
      //    */
      //   const { added, removed, modified } = diffGeoJSON(this.mainGeojson, mainSourceGeojson)
      //   console.log('新規:', added);
      //   console.log('削除:', removed);
      //   console.log('変更:', modified);
      //   if (modified.length > 0) {
      //     await saveDrowFeatures(modified)
      //   }
      //   // 新規の時は逆に削除
      //   if (added.length > 0) {
      //     const ids = added.map(f => f.properties.id)
      //     await featuresDelete(ids)
      //   }
      //   // removedのときは復活
      //   if (removed.length > 0) {
      //     const ids = removed.map(f => f.properties.id)
      //     console.log(ids)
      //     await featuresRestore(ids)
      //     // const configFeature = removed.find(f => f.properties.id === 'config')
      //     // if (configFeature) {
      //     //   this.mainGeojson.features = [...this.mainGeojson.features,configFeature]
      //     // }
      //   }
      //   /**
      //    * ここまで
      //    */
      //
      //   // 反映
      //   map.getSource('click-circle-source').setData(this.mainGeojson);
      //   store.state.clickCircleGeojsonText = JSON.stringify(this.mainGeojson)
      //   this.updatePermalink()
      //   if (this.s_editEnabled) {
      //     getAllVertexPoints(map, this.mainGeojson);
      //     setAllMidpoints(map, this.mainGeojson);
      //   }
      //   generateSegmentLabelGeoJSON(this.mainGeojson)
      //   generateStartEndPointsFromGeoJSON(this.mainGeojson)
      //
      // }
      // markaersRemove()
      // this.updatePermalink()

    },
    async redo() {
      drawRedo()
      // if (!this.$store.state.isEditable && !this.$store.state.isMine) {
      //   alert('編集不可です！！')
      //   return
      // }
      // if (this.redoStack.length > 0) {
      //   const map = this.$store.state.map01
      //   const mainSourceGeojson = map.getSource('click-circle-source')._data;
      //   this.history.push(JSON.parse(JSON.stringify(mainSourceGeojson)));
      //   this.mainGeojson = this.redoStack.pop();
      //
      //   /**
      //    *注意 不安定
      //    */
      //   const { added, removed, modified } = diffGeoJSON(mainSourceGeojson, this.mainGeojson);
      //   console.log('新規:', added);
      //   console.log('削除:', removed);
      //   console.log('変更:', modified);
      //   if (modified.length > 0) {
      //     await saveDrowFeatures(modified)
      //   }
      //   // addedのときは復活
      //   if (added.length > 0) {
      //     const ids = added.map(f => f.properties.id)
      //     console.log(ids)
      //     await featuresRestore(ids)
      //     // const configFeature = removed.find(f => f.properties.id === 'config')
      //     // if (configFeature) {
      //     //   this.mainGeojson.features = [...this.mainGeojson.features,configFeature]
      //     // }
      //   }
      //   // removedのときは削除
      //   if (removed.length > 0) {
      //     const ids = removed.map(feature => feature.properties.id)
      //     await featuresDelete(ids)
      //   }
      //   /**
      //    * ここまで
      //    */
      //
      //   // 反映
      //   map.getSource('click-circle-source').setData(this.mainGeojson);
      //
      //   this.$store.state.clickCircleGeojsonText = JSON.stringify(this.mainGeojson)
      //   if (this.s_editEnabled) {
      //     getAllVertexPoints(map, this.mainGeojson);
      //     setAllMidpoints(map, this.mainGeojson);
      //   }
      //   generateSegmentLabelGeoJSON(this.mainGeojson)
      //   generateStartEndPointsFromGeoJSON(this.mainGeojson)
      //   generateSegmentLabelGeoJSON(this.mainGeojson)
      //   markaersRemove()
      //   this.updatePermalink()
      // }
    },
    finishLine () {
      this.isDrawingLine = false;
      this.isDrawingFree = false;
      const map01 = this.$store.state.map01
      // ガイドライン消去
      if (map01.getSource('guide-line-source')) {
        map01.getSource('guide-line-source').setData({
          type: 'FeatureCollection',
          features: []
        });
      }
      // フリーハンドプレビューレイヤー消去
      if (map01.getSource('freehand-preview-source')) {
        map01.getSource('freehand-preview-source').setData({
          type: 'FeatureCollection',
          features: []
        });
      }
      this.tempLineCoords = []
      this.tempLineCoordsGuide = []
      this.tempFreehandCoords = []
      this.tempPolygonCoords = []
      this.tempLineCoordsCoords = []
    },

    startDraw() {
      this.isDrawing = true
      // すぐマウス座標反映
      document.body.style.cursor = ''
    },
    endDraw() {
      this.isDrawing = false
      document.body.style.cursor = ''
    },
    async captureAndPostToX() {

      if (window.innerWidth < 1000) {
        this.openX()
        return
      }

      // 1. ローディング表示
      store.state.loading2 = true;
      store.state.loadingMessage = '画面をキャプチャ中です。';

      // 2. 地図DIV取得
      const mapDiv = document.getElementById(this.mapDivId);
      if (!mapDiv) {
        alert("地図が見つかりません");
        store.state.loading2 = false;
        return;
      }

      // 3. 地図を微妙に動かしてレンダリング強制
      const map01 = this.$store.state.map01;
      const currentZoom = map01.getZoom();
      map01.zoomTo(currentZoom + 0.00000000000000000000000000001);

      // 4. idleになったらキャプチャ〜アップロード
      map01.once('idle', async () => {
        // --- canvas生成・描画・画像化 ---
        // MapLibreのcanvas要素取得
        const canvas = map01.getCanvas();
        const imageData = canvas.toDataURL("image/png");
        // PNGファイルを追加
        const blob = await fetch(imageData).then(res => res.blob());

        // アップロード
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('spaUrl', window.location.href);

        // サーバーにアップロード
        const res = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/x-upload.php', { method: 'POST', body: formData });
        const data = await res.json();
        const shareUrl = data.shareUrl;

        // 5. intent/tweetを2回開く
        const tweetText = this.tweetText || "";
        const intentUrl = "https://twitter.com/intent/tweet?text=" +
            encodeURIComponent('少々おまちください。まだ入力できません。' + "\n\n" + shareUrl);
        const intentUrl2 = "https://twitter.com/intent/tweet?text=" +
            encodeURIComponent(tweetText + "\n" + shareUrl);

        // 1回目
        setTimeout(() => {
          let win = window.open(intentUrl, '_blank');
          // 4秒後に閉じて再度開く
          setTimeout(() => {
            if (win) win.close();
            setTimeout(() => {
              window.open(intentUrl2, '_blank');
              store.state.loading2 = false;
            }, 500);
          }, 3000);
        },4000)
      });
    },
    openDialog() {
      this.showXDialog = true;
      this.captureAndPreview();
    },
    async captureAndPreview() {

      store.state.loading2 = true
      store.state.loadingMessage = 'キャプチャ中です。'
      const mapDiv = document.getElementById(this.mapDivId);
      if (!mapDiv) {
        alert("地図が見つかりません");
        return;
      }
      const map01 = this.$store.state.map01
      const map02 = this.$store.state.map02
      const currentZoom = map01.getZoom();
      map01.zoomTo(currentZoom + 0.00000000000000000000000000001);
      // map02.zoomTo(currentZoom + 0.00000000000000000000000000001);
      map01.once('idle', async () => {
        const canvas = await html2canvas(mapDiv, {useCORS: true});
        this.imgUrl = canvas.toDataURL("image/png");
        // サーバーへアップロード
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('spaUrl', window.location.href);

        const res = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/x-upload.php', { method: 'POST', body: formData });
        const data = await res.json();
        this.$store.state.urlForX = data.shareUrl;
        // alert(this.$store.state.urlForX)
        store.state.loading2 = false;
      });
      // map02.once('idle',async () => {
      //   const canvas = await html2canvas(mapDiv, { useCORS: true });
      //   this.imgUrl = canvas.toDataURL("image/png");
      //   store.state.loading2 = false;
      // });

    },
    downloadImage() {
      // ファイル名
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const fileName = `oh3capture_${y}${m}${day}.png`;
      if (!this.imgUrl) return;
      const link = document.createElement("a");
      link.download = fileName;
      link.href = this.imgUrl;
      link.click();
    },
    openX() {
      const intentUrl =
          "https://twitter.com/intent/tweet?text=" +
          encodeURIComponent('#openhinata3 #OH3' + "\n" + this.$store.state.url);
      // window.open(intentUrl, "_blank");
      // 1回目
      const win = window.open(intentUrl, '_blank');
    },
    deleteAllforDraw () {
      this.s_editEnabled = false
      if (!this.$store.state.isEditable && !this.$store.state.isMine) {
        alert('編集不可です!')
        return
      }
      this.saveHistory()
      deleteAll()
      setTimeout(() => {
        if (!this.$store.state.isUsingServerGeojson) {
          featureCollectionAdd()
        }
        markerAddAndRemove()
        markaersRemove()
      },100)

    },
    pngDl0 () {
      fncPngDl(this.printMap)
    },
    print () {
      // 印刷ダイアログ表示
      setTimeout(() => {
        window.print()
      }, 200)
    },
    printMap01 () {
      this.printMap = 'map01'
      const map01Div = document.getElementById('map01');
      const map02Div = document.getElementById('map02');
      setTimeout(() => {
        map01Div.style.display = 'block'
        map02Div.style.position = 'absolute'
      },10)
    },
    printMap02 () {
      this.printMap = 'map02'
      const map01Div = document.getElementById('map01');
      const map02Div = document.getElementById('map02');
      setTimeout(() => {
        map01Div.style.display = 'none'
        map02Div.style.display = 'block'
        map02Div.style.width = '100%'
        map02Div.style.position = 'relative'
      }, 10)
    },
    printMap03 () {
      this.printMap = 'map03'
      changePrintMap03(this.titleDirection)
    },
    handlePrint(isClose) {
      const map00Div = document.getElementById('map00');
      const map01Div = document.getElementById('map01');
      const map02Div = document.getElementById('map02');
      map01Div.style.display = 'block'
      map02Div.style.position = 'absolute'
      const isMap02Block = map02Div.style.display === 'block'
      setTimeout(() => {
        if (isClose === true) {
          if (isMap02Block) {
            this.btnClickSplit()
          }
        }
      },100)

      // if (isClose) {
      //   this.s_map2Flg = !this.s_map2Flg
      //   this.btnClickSplit()
      // }
        // this.s_isDraw = false
      this.attributionControl = new maplibregl.AttributionControl()
      this.$store.state.map01.addControl(this.attributionControl, 'bottom-right')
      const el = document.getElementById('terrain-btn-div-map01');
      const parent = el.parentNode;
      const next   = el.nextSibling;               // 元の“次”を覚えておく
      const grandParent = parent.parentNode.parentNode || document.body;
      if (isClose === true) {
        document.querySelectorAll('.maplibregl-ctrl-scale').forEach(scale => scale.style.display = 'none')
        document.querySelector('.fan-menu-rap').style.display = 'none'
        // this.isRightDiv2 = false
        if (next) {
          parent.insertBefore(el, next);             // 元の “次Sibling” の前に挿入
        } else {
          parent.appendChild(el);                    // 末尾だったら親の最後に戻す
        }
      } else {
        document.querySelectorAll('.maplibregl-ctrl-scale').forEach(scale => scale.style.display = 'block')
        document.querySelector('.fan-menu-rap').style.display = 'block'

        // this.isRightDiv2 = true
        parent.removeChild(el);
        grandParent.appendChild(el);
      }

      // 2. attributionコントロールのDOM取得
      const attribDom = document.querySelector('.maplibregl-ctrl-attrib')

      if (attribDom) {
        // 3. 好きな右下用のコンテナ（例えばbody直下や専用div）に移動
        const customContainer = document.getElementById('my-attrib-container')
        if (customContainer) {
          customContainer.appendChild(attribDom)
        } else {
          // 無ければ自作してbodyに追加
          const div = document.createElement('div')
          div.id = 'my-attrib-container'
          // CSSで右下に配置
          div.style.position = 'fixed'
          div.style.right = '16px'
          div.style.bottom = '16px'
          div.style.zIndex = '1000'
          div.appendChild(attribDom)
          document.body.appendChild(div)
        }
      }

      this.s_map2Flg = true
      this.btnClickSplit ()

      if (this.originalStyle) {
        map00Div.style.width  = this.originalStyle.width
        map00Div.style.height = this.originalStyle.height
        this.s_isPrint = false
        this.originalStyle = null
        this.$store.state.map01.removeControl(this.attributionControl)
        const customContainer = document.getElementById('my-attrib-container')
        if (customContainer) {
          customContainer.remove()
        }
        return
      }
      // 元のサイズを保存
      this.originalStyle = {
        width: map00Div.style.width,
        height: map00Div.style.height
      }
      this.s_isPrint = true

      function hideAllDialogs(dialogs) {
        for (const dialogKey in dialogs) {
          console.log(dialogKey)
          // 'drawConfigDialog' の場合はスキップ
          if (dialogKey === 'drawConfigDialog') continue;
          const dialog = dialogs[dialogKey]
          for (const mapKey in dialog) {
            if (
                dialog[mapKey] &&
                dialog[mapKey].style &&
                typeof dialog[mapKey].style === 'object'
            ) {
              dialog[mapKey].style.display = 'none'
            }
          }
        }
      }
      hideAllDialogs(this.$store.state.dialogs)

      function setAllDisplayNone(obj) {
        for (const mapKey in obj) {
          const arr = obj[mapKey]
          if (Array.isArray(arr)) {
            arr.forEach(item => {
              if (item && item.style && typeof item.style === 'object') {
                item.style.display = 'none'
              }
            })
          }
        }
      }
      setAllDisplayNone(this.$store.state.dialogsInfo)
      setAllDisplayNone(this.$store.state.dialog2)

      this.directionChange()

    },
    directionChange() {
      printDirectionChange (this.titleDirection)
    },
    drawClose () {
      if (document.querySelector('#centerDrawBtn2')) {
        document.querySelector('#centerDrawBtn2').click()
      } else {
        document.querySelector('#centerDrawBtn').click()
      }
      document.querySelector('.center-wrapper').style.opacity = '1'
      this.isRightDiv = true
    },
    toggleLDraw ()  {
      const map01 = this.$store.state.map01
      if (!this.s_isDraw) {
        this.$store.commit('disableAllDraws')
        map01.dragPan.enable = this.originalEnable
        map01.dragPan.enable()
        this.s_isDrawFix = false
        closeAllPopups()
      } else {
        const text = 'ドロー時は各種クリックが制限されます。'
        if (this.snackbarText !== text) {
          this.snackbarText = text
          this.snackbar = true
        }
      }
      const centerBtns = document.querySelectorAll('.center-wrapper')
      const rightBtns = document.querySelectorAll('.right-btn')
      if (this.isSmall500) {
        if (this.s_isDraw) {
          centerBtns.forEach(btn => {
            btn.style.opacity = '0'
          })
          rightBtns.forEach(btn => {
            btn.style.display = 'none'
          })
        } else {
          centerBtns.forEach(btn => {
            btn.style.opacity = '1'
          })
          rightBtns.forEach(btn => {
            btn.style.display = 'block'
          })
        }
      }
      this.finishLine()
      // alert(this.clickCircleGeojsonText)
      try {
        if (JSON.parse(this.clickCircleGeojsonText).features.filter(f => f.properties.id !== 'config').length > 1 &&
            !this.s_isDraw
        ) {
          document.querySelector('#drawList').style.display = 'block'
        } else {
          document.querySelector('#drawList').style.display = 'none'
        }
      }catch (e) {
        document.querySelector('#drawList').style.display = 'none'
      }
    },
    finishDrawing() {

      if (this.s_editEnabled) {
        this.toggleEditEnabled()
      }
      const map01 = this.$store.state.map01
      this.$store.state.clickCircleGeojsonText = JSON.stringify(map01.getSource('click-circle-source')._data)
      this.saveHistory()

      const id = String(Math.floor(10000 + Math.random() * 90000));
      this.$store.state.id = id;
      let coords,properties
      if (this.s_isDrawPolygon) {
        if (!this.tempPolygonCoords || this.tempPolygonCoords.length < 2) return; // 最低2点以上だけ確定
        coords = [this.tempPolygonCoords.concat([this.tempPolygonCoords[0]])]
        properties = {
          id: id,
          pairId: id,
          label: '',
          color: colorNameToRgba(this.$store.state.currentPolygonColor || 'yellow', 0.6),
          'line-width': 1,
        };
        geojsonCreate(map01, 'Polygon', coords, properties);
        const dummyEvent = {
          lngLat: {
            lng: this.tempPolygonCoords[0][0],
            lat: this.tempPolygonCoords[0][1]
          }
        };
        this.$store.state.coordinates = [this.tempPolygonCoords[0][0], this.tempPolygonCoords[0][1]];
        setTimeout(() => {
          onLineClick(dummyEvent,map01,this.s_map2Flg);
        }, 500);
        this.tempPolygonCoords = [];
      } else if (this.s_isDrawLine) {
        if (!this.tempLineCoords || this.tempLineCoords.length < 2) return; // 最低2点以上だけ確定
        properties = {
          id: id,
          pairId: id,
          label: '',
          offsetValue: [0.6, 0],
          'line-width': 5,
          textAnchor: 'left',
          textJustify: 'left'
        };
        geojsonCreate(map01, 'LineString', this.tempLineCoords.slice(), properties);
        const dummyEvent = {
          lngLat: {
            lng: this.tempLineCoords[0][0],
            lat: this.tempLineCoords[0][1]
          }
        };
        this.$store.state.coordinates = [this.tempLineCoords[0][0], this.tempLineCoords[0][1]];
        setTimeout(() => {
          onLineClick(dummyEvent,map01,this.s_map2Flg);
        }, 500);
        this.tempLineCoords = []
      }
      this.finishLine()
    },
    drawFix (isFix) {
      const map =this.$store.state.map01
      if (isFix) {
        map.dragPan.disable()
        const originalEnable = map.dragPan.enable;
        // -----------------------------------------
        map.dragPan.enable = function (...args) {
          console.trace('dragPan.enable() called');
          setTimeout(() => {
            map.dragPan.disable();
            console.log('dragPan was force-disabled again');
          }, 50);
          return originalEnable.apply(this, args);
        };
        // -----------------------------------------
      } else {
        // フックを解除。this.originalEnableはオンロードの先頭に書いている。
        console.log(this.originalEnable)
        map.dragPan.enable = this.originalEnable
        map.dragPan.enable()
      }
      store.state.isCursorOnPanel = false
    },
    toggleDrawFix () {
      const map =this.$store.state.map01
      this.s_isDrawFix = !this.s_isDrawFix
      if (this.s_isDrawFix) {
        this.snackbarText = '画面を固定します。もう一度クリックで解除'
        this.snackbar = true
        map.dragPan.disable()
        this.finishLine()
        const originalEnable = map.dragPan.enable;
        // -----------------------------------------
        map.dragPan.enable = function (...args) {
          console.trace('dragPan.enable() called');
          setTimeout(() => {
            map.dragPan.disable();
            console.log('dragPan was force-disabled again');
          }, 50);
          return originalEnable.apply(this, args);
        };
        // -----------------------------------------
      } else {
        // フックを解除。this.originalEnableはオンロードの先頭に書いている。
        console.log(this.originalEnable)
        map.dragPan.enable = this.originalEnable
        map.dragPan.enable()
      }
      store.state.isCursorOnPanel = false
    },
    toggleEditEnabled () {
      if (!this.$store.state.isEditable && !this.$store.state.isMine) {
        alert('編集不可です!')
        return
      }
      this.saveHistory()
      this.s_editEnabled = !this.s_editEnabled
      if (this.s_editEnabled) {
        this.s_isDrawPoint = false
        this.s_isDrawCircle = false
        this.s_isDrawLine = false
        this.s_isDrawPolygon = false
        this.s_isDrawFree = false
        this.s_isDrawLasso = false
        this.snackbarText = '変形、移動時はポップアップができません。'
        this.snackbar = true
        this.$store.state.showDrawConfrim = true
        this.$nextTick(() => {
          this.cancelBtnMiniTooltip = '編集ボタンを押す前に戻ります'
          this.undoBtnMiniTooltip = '使用不可'
          this.isUndoBtnDisabled = true
          this.$store.state.prevGeojson = JSON.parse(JSON.stringify(this.map01.getSource('click-circle-source')._data))
          const left = (document.querySelector('#map01').clientWidth / 2) - (this.drawTool.floatingGroup.offsetWidth / 2)
          const top = 10
          animateRelocate(this.drawTool.floatingGroup, left, top, { duration: 200, easing: 'ease-out' });
        })
    } else {
        this.$store.state.showDrawConfrim = false
      }
      this.finishLine()
      markaersRemove()
      closeAllPopups()
    },

    toggleDrawLasso () {
      if (!this.$store.state.isEditable && !this.$store.state.isMine) {
        alert('編集不可です!')
        return
      }
      this.s_isDrawLasso = !this.s_isDrawLasso
      if (this.s_isDrawLasso) {
        this.s_isDrawPoint = false
        this.s_isDrawCircle = false
        this.s_isDrawLine = false
        this.s_isDrawPolygon = false
        this.s_editEnabled = false
        this.snackbarText = 'ドラッグで投げ縄を書きます！クリックじゃありません！'
        this.snackbar = true
      }
      document.querySelector('#draw-indicato-text').innerHTML = 'LASSO'
      this.finishLine()
    },
    toggleLDrawFree () {
      this.s_isDrawFree = !this.s_isDrawFree
      if (this.s_isDrawFree) {
        this.s_isDrawPoint = false
        this.s_isDrawCircle = false
        this.s_isDrawLine = false
        this.s_isDrawPolygon = false
        this.s_editEnabled = false
        this.s_isDrawLasso = false
        this.snackbarText = 'ドラッグで線を書きます！クリックじゃありません！'
        this.snackbar = true
      }
      document.querySelector('#draw-indicato-text').innerHTML = 'FREE'
      this.finishLine()
    },
    toggleLDrawPolygon () {
      this.s_isDrawPolygon = !this.s_isDrawPolygon
      if (this.s_isDrawPolygon) {
        this.s_isDrawPoint = false
        this.s_isDrawCircle = false
        this.s_isDrawLine = false
        this.s_isDrawFree = false
        this.s_editEnabled = false
        this.s_isDrawLasso = false
      }
      document.querySelector('#draw-indicato-text').innerHTML = 'POLYGON'
      this.finishLine()
    },
    toggleLDrawLine () {
      this.s_isDrawLine = !this.s_isDrawLine
      if (this.s_isDrawLine) {
        this.s_isDrawPoint = false
        this.s_isDrawCircle = false
        this.s_isDrawPolygon = false
        this.s_isDrawFree = false
        this.s_editEnabled = false
        this.s_isDrawLasso = false
      }
      document.querySelector('#draw-indicato-text').innerHTML = 'LINE'
      this.finishLine()
    },
    toggleDrawCircle () {
      this.s_isDrawCircle = !this.s_isDrawCircle
      if (this.s_isDrawCircle) {
        this.s_isDrawPoint = false
        this.s_isDrawLine = false
        this.s_isDrawPolygon = false
        this.s_isDrawFree = false
        this.s_editEnabled = false
        this.s_isDrawLasso = false
      }
      document.querySelector('#draw-indicato-text').innerHTML = 'CIRCLE'
      this.finishLine()
    },
    toggleDrawPoint () {
      this.s_isDrawPoint = !this.s_isDrawPoint
      if (this.s_isDrawPoint) {
        this.s_isDrawCircle = false
        this.s_isDrawLine = false
        this.s_isDrawPolygon = false
        this.s_isDrawFree = false
        this.s_editEnabled = false
        this.s_isDrawLasso = false
      }
      document.querySelector('#draw-indicato-text').innerHTML = 'TXT'
      this.finishLine()
    },
    drawRotate () {
      // rotateLassoSelected(90)
      const featuresRotateDiv = document.querySelector('.features-rotate-div')
      if (featuresRotateDiv.style.display === 'none' || featuresRotateDiv.style.display === '') {
        featuresRotateDiv.style.display = 'block'
      } else {
        featuresRotateDiv.style.display = 'none'
      }
    },
    save () {
      this.saveSelectedPointFeature()
      // Firestore に保存
      const groupId = this.$store.state.currentGroupName
      const geojson = this.$store.state.groupGeojson
      db.collection('groups').doc(groupId).set({
        layers: {
          points: geojson
        },
        lastModifiedBy: this.$store.state.userId,
        lastModifiedAt: Date.now()
      }, { merge: true })

      this.close()
    },
    ...mapMutations(['setChibanzuDrawer', 'setRightDrawer', 'setPointInfoDrawer', 'saveSelectedPointFeature']),
    ...mapActions(['saveSelectedPointFeatureToFirestore']),
    close () {
      this.setPointInfoDrawer(false)
    },
    setDrawerVisible(val) {
      this.setPointInfoDrawer(val)
    },
    setRightVisible(val) {
      this.setRightDrawer(val)
    },
    savePointDescription(description) {
      const feature = { ...this.selectedPointFeature }
      feature.properties.description = description
      // 🔁 FirestoreやGeoJSONの更新ロジックここに挿入
      console.log('✅ 保存された説明:', description)
    },
    openFeatureDrawer (feature) {
      this.selectedFeature = feature
      this.drawerVisible = true
    },
    handleDescriptionSave (newDescription) {
      // 🔧 Firestore やローカル GeoJSON に保存処理
      this.selectedFeature.properties.description = newDescription
      console.log('保存されました:', newDescription)
    },
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
      this.loadingSnackbar = this.s_loading || this.s_loading2 || this.s_loading3;
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
      if (this.s_selectedPublic === -1) {
        if (!confirm("緑色(オープンデータ)で公開しようとしています。全ユーザーが閲覧可能になります。良いですか？")) {
          return
        }
      }
      if (this.s_selectedPublic === 1) {
        if (!confirm("青色(公開)で公開しようとしています。全ユーザーが閲覧可能になります。良いですか？")) {
          return
        }
      }
      pmtilesGenerateForUser2 (this.s_chibanzuGeojson,'',store.state.pmtilesPropertieName,this.s_chibanzuPrefCode,String(this.s_chibanzuCityCode).padStart(5, '0'),this.s_selectedPublic,this.s_selectedKaiji2,this.s_geojsonFile)
      this.s_showChibanzuDialog = false
    },
    imagePngLoad () {
      csvGenerateForUserPng(this.s_zahyokei)
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
        // tileGenerateForUserPng()
        tileGenerateForUser('png','pgw')
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
        this.$store.state.loadingMessage = 'アップロード開始'
        tileGenerateForUser('jpg','jgw')
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
        // tileGenerateForUserTfw()
        tileGenerateForUser('tif','tfw')
      } else {
        geoTiffLoad (map01,'map01', true)
        geoTiffLoad (map02,'map02', false)
      }
      this.s_dialogForGeotiffApp = false
    },
    geoTifLoad1file () {
      this.dialogForGeotiffApp1file = false
      this.s_dialogForGeotiff2App = false
      const map01 = this.$store.state.map01
      const map02 = this.$store.state.map02
      if (this.$store.state.userId) {
        // tileGenerateForUser1file()
        tileGenerateForUser('tif',null)
      } else {
        geoTiffLoad2 (map01,'map01', true)
        geoTiffLoad2 (map02,'map02', false)
      }
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
              console.log(layer.id,this.s_simaOpacity)
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
          // alert('座標系' + this.s_zahyokei)
          simaLoadForUser (map1,true, this.ddSimaText,this.s_zahyokei)
        } else {
          ddSimaUpload(this.ddSimaText)
        }
        this.s_dialogForSimaApp = false
      }
    },
    simaPartDl () {
      const map01 = this.$store.state.map01
      let ids = []
      const features = map01.queryRenderedFeatures();
      const simaLayers = new Set();
      features.forEach(f => {
        if (f.layer.id.includes('-sima-')) {
          // 3つ目の要素を抽出
          simaLayers.add(f.layer.id.split('-')[2]);
        }
      });
      // 配列に変換
      ids = Array.from(simaLayers);
      const params = new URLSearchParams({ ids: ids });
      ids.forEach(id => params.append('ids[]', id));
      fetch(`https://kenzkenz.xsrv.jp/open-hinata3/php/userSimaSelectByIds.php?${params}`, {
        method: "GET"
      })
          .then(response => response.json())
          .then(datanum => {
            const simaTexts = datanum.map(data => {
              return {simaText:data.simatext,name:data.name}
            })
            const highlightedSimas = Array.from(this.$store.state.highlightedSimas)
            console.log('highlightedSimas',highlightedSimas)
            let simaText = simaTexts[0].simaText
            if (highlightedSimas.length === 0) {
              alert('1件も選択されていません。')
              return
            }
            simaText = extractSimaById(simaText, highlightedSimas)
            this.$store.state.simaTextForUser = simaText
            const fileName = simaTexts[0].name
            downloadSimaText (true, fileName)
          });
    },
    simaDl () {
      if (this.$store.state.simaText) {
        downloadSimaText(false)
      } else {
        const map01 = this.$store.state.map01
        let ids = []
        map01.getStyle().layers.forEach(layer => {
          if (layer.id.includes('-sima-')) {
            ids.push(layer.id.split('-')[2])
          }
        })
        ids = [...new Set(ids)]
        console.log(ids)
        const params = new URLSearchParams({ ids: ids });
        ids.forEach(id => params.append('ids[]', id));
        fetch(`https://kenzkenz.xsrv.jp/open-hinata3/php/userSimaSelectByIds.php?${params}`, {
          method: "GET"
        })
            .then(response => response.json())
            .then(datanum => {
              const simaTexts = datanum.map(data => {
                return {simaText:data.simatext,name:data.name}
              })
              zipDownloadSimaText (simaTexts)
            });
      }

    },
    draw() {
      const map = this.$store.state.map01
      if (!this.showDrawUI) {
        document.querySelector('.maplibregl-ctrl-bottom-right').style.display = 'block'
        this.drawControl.activate()
        if (this.geojson) this.drawInstance.addFeatures(this.geojson);
        setTimeout(() => {
          map.setLayoutProperty('terradraw-measure-polygon-label', 'visibility', 'visible');
          map.setLayoutProperty('terradraw-measure-line-label', 'visibility', 'visible');
          map.setLayoutProperty('terradraw-measure-line-node', 'visibility', 'visible');
          map.moveLayer('terradraw-measure-polygon-label')
          map.moveLayer('terradraw-measure-line-label')
          map.moveLayer('terradraw-measure-line-node')
          // updateMeasureUnit('m')
        },0)
        this.showDrawUI = true
      } else {
        document.querySelector('.maplibregl-ctrl-bottom-right').style.display = 'none'
        this.geojson = this.drawInstance.getSnapshot()
        this.drawControl.deactivate()
        map.setLayoutProperty('terradraw-measure-polygon-label', 'visibility', 'none');
        map.setLayoutProperty('terradraw-measure-line-label', 'visibility', 'none');
        map.setLayoutProperty('terradraw-measure-line-node', 'visibility', 'none');
        this.showDrawUI = false
      }
    },
    drawConfig () {
      const mapName = 'map01'
      if (this.$store.state.dialogs.drawConfigDialog[mapName].style.display === 'none') {
        this.$store.state.dialogs.drawConfigDialog[mapName].style['z-index'] = getNextZIndex()
        this.$store.state.dialogs.drawConfigDialog[mapName].style.display = 'block'
        if (window.innerWidth < 450) {
          this.$store.state.dialogs.drawConfigDialog[mapName].style.left = '0px'
        } else {
          if (this.s_map2Flg) {
            this.$store.state.dialogs.drawConfigDialog[mapName].style.left = (window.innerWidth / 2 - 500) + 'px'
          } else {
            this.$store.state.dialogs.drawConfigDialog[mapName].style.left = (window.innerWidth - 500) + 'px'
          }
        }
      } else {
        this.$store.state.dialogs.drawConfigDialog[mapName].style.display = 'none'
      }
    },
    help() {
      window.open('https://sakura.3ku.jp/gis/oh3-reversedictionary/', '_blank');
    },
    share() {
      const mapName = 'map01'
      if (this.$store.state.dialogs.shareDialog[mapName].style.display === 'none') {
        // this.$store.commit('incrDialogMaxZindex')
        // this.$store.state.dialogs.shareDialog[mapName].style['z-index'] = this.$store.state.dialogMaxZindex
        this.$store.state.dialogs.shareDialog[mapName].style['z-index'] = getNextZIndex()
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
                // alert('pan')
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
      try {
        if (document.querySelector('#map01').clientWidth < Number(document.querySelector('.terrain-btn-div').style.left.replace('px',''))) {
          document.querySelector('.terrain-btn-div').style.left = ''
          document.querySelector('.terrain-btn-div').style.right = '10px'
        }
      }catch (e) {
        console.log(e)
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
    btnClickMyroom (mapName) {
      // const groupId = db.collection('groups').doc().id
      // const groupId = this.s_currentGroupId; // 修正: ストアから取得
      // alert('app.vueから' + groupId)
      // this.$store.state.currentGroupId = groupId
      if (this.$store.state.dialogs.myroomDialog[mapName].style.display === 'none') {
        // this.$store.commit('incrDialogMaxZindex')
        // this.$store.state.dialogs.myroomDialog[mapName].style['z-index'] = this.$store.state.dialogMaxZindex
        this.$store.state.dialogs.myroomDialog[mapName].style['z-index'] = getNextZIndex()

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
        this.$store.state.dialogs.menuDialog[mapName].style['z-index'] = getNextZIndex()
        this.$store.state.dialogs.menuDialog[mapName].style.display = 'block'
      } else {
        this.$store.state.dialogs.menuDialog[mapName].style.display = 'none'
      }
    },
    btnClickLayer (mapName) {
      setTimeout(() => {
        // ★レイヤーラベル補完処理（名前の復元）
        const groupLayerMap = Object.fromEntries(
            this.$store.state.currentGroupLayers.map(layer => [`oh-userlayer-${layer.id}`, layer.name])
        )
        const layers = this.$store.state.selectedLayers.map01
        for (const layer of layers) {
          if (!layer.label || layer.label === '') {
            const name = groupLayerMap[layer.id]
            if (name) {
              layer.label = name
            }
          }
        }
      },300)
      if (this.$store.state.dialogs.layerDialog[mapName].style.display === 'none') {
        // this.$store.commit('incrDialogMaxZindex')
        // this.$store.state.dialogs.layerDialog[mapName].style['z-index'] = this.$store.state.dialogMaxZindex
        this.$store.state.dialogs.layerDialog[mapName].style['z-index'] = getNextZIndex()
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
    // パーマリンク作成
    updatePermalink() {
      if (this.$store.state.isOffline) {
        return
      }
      const map = this.$store.state.map01
      const center = map.getCenter()
      const zoom = map.getZoom()
      const { lng, lat } = center
      const split = this.s_map2Flg
      const pitch01 = this.$store.state.map01Pitch
      const pitch02 = this.$store.state.map02Pitch
      const bearing = this.$store.state.map01Bearing
      let terrainLevel = this.s_terrainLevel
      if (isNaN(terrainLevel)) terrainLevel = 1
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
      // const keysToRemove = ['label', 'source', 'layers', 'sources', 'attribution','info']
      const keysToRemove = ['source', 'layers', 'sources', 'attribution','info']
      let copiedSelectedLayers = JSON.parse(JSON.stringify(this.$store.state.selectedLayers))
      copiedSelectedLayers = removeKeys(copiedSelectedLayers, keysToRemove)
      const selectedLayersJson = JSON.stringify(copiedSelectedLayers)
      const chibans = []
      this.$store.state.highlightedChibans.forEach(h => {
        chibans.push(h)
      })
      const simas = []
      this.$store.state.highlightedSimas.forEach(h => {
        // alert(9)
        simas.push(h)
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
      // ⭐️緊急回避 マイルーム復帰のときclickCircleGeojsonTextがどこかでクリアされる現象を回避
      let clickCircleGeojsonText = this.$store.state.clickCircleGeojsonText
      if (!clickCircleGeojsonText) {
        clickCircleGeojsonText = this.$store.state.clickCircleGeojsonTextMyroom
        this.$store.state.clickCircleGeojsonText = this.$store.state.clickCircleGeojsonTextMyroom
        this.$store.state.clickCircleGeojsonTextMyroom = ''
      }
      const vector = this.$store.state.uploadedVector
      const isWindow = this.$store.state.isWindow
      const simaTextForUser = this.$store.state.simaTextForUser
      const geojsinId = this.$store.state.geojsonId
      const isFromIframe = this.$store.state.isFromIframe
      const isDrawFit = this.$store.state.isDrawFit
      // alert(isDrawFit)
      // パーマリンクの生成
      this.param = `?lng=${lng}&lat=${lat}&zoom=${zoom}&split=${split}&pitch01=
      ${pitch01}&pitch02=${pitch02}&bearing=${bearing}&terrainLevel=${terrainLevel}
      &slj=${selectedLayersJson}&chibans=${JSON.stringify(chibans)}&simas=${JSON.stringify(simas)}
      &simatext=${simaText}&image=${JSON.stringify(image)}&extlayer=${JSON.stringify(extLayer)}&kmltext=${kmlText}
      &geojsontext=${geojsonText}&dxftext=${dxfText}&gpxtext=${gpxText}&drawgeojsontext=${drawGeojsonText}
      &clickgeojsontext=${clickGeojsonText}&clickCirclegeojsontext=${clickCircleGeojsonText}
      &vector=${JSON.stringify(vector)}&iswindow=${JSON.stringify(isWindow)}&simatextforuser=${simaTextForUser}
      &geojsinid=${geojsinId}&isfromiframe=${JSON.stringify(isFromIframe)}&isdrawfit=${JSON.stringify(isDrawFit)}`
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
                const muni0 = muni[Number(response.data.results.muniCd)]
                if (muni0) {
                  const splitMuni = muni0.split(',')
                  vm.s_address = splitMuni[1] + splitMuni[3] + response.data.results.lv01Nm
                  vm.s_addressMini = removeAllWhitespace(splitMuni[3] + response.data.results.lv01Nm)
                  console.log(vm.s_address)
                  vm.$store.state.prefId = splitMuni[0]
                }
              } catch (e) {
                console.log(e)
                vm.s_address = ''
                vm.s_addressMini = ''
              }
            } else {
              vm.s_address = ''
              vm.s_addressMini = ''
            }
          })
      history('updatePermalink',window.location.href)
      japanCoord([lng,lat])
    },
    createShortUrl() {
      if (this.$store.state.isOffline) {
        return
      }
      let params = new URLSearchParams()
      params.append('parameters', this.param)
      // console.log(this.param)
      axios.post('https://kenzkenz.xsrv.jp/open-hinata3/php/shortUrl.php', params)
          .then(response => {
            // const basePath = window.location.pathname.replace(/\/\/+$/, '/'); // 末尾のスラッシュを削除 通常はこの処理はいらない。間違えたURLを使い続けている人の対応
            // const newUrl = basePath + "?s=" + response.data.urlid;
            const newUrl = window.location.pathname + "?s=" + response.data.urlid;
            window.history.pushState(null, 'map', newUrl)
            // console.log(window.location.pathname)
            let pathName = '/'
            if (window.location.pathname !== '/') {
              pathName = window.location.pathname
            }
            this.$store.state.url = window.location.protocol + '//' + window.location.host + pathName + "?s=" + response.data.urlid
            console.log('保存成功')
          })
          .catch(error => {
            console.log(error)
          })
    },
    async parseUrlParams() {
      let params
      if (this.dbparams) {
        params = new URLSearchParams(this.dbparams)
        // console.log(this.dbparams)
      } else {
        params = new URLSearchParams(window.location.search)
        const uid = localStorage.getItem('lastUserId')
        if (uid) {
          let response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userConfigSelect.php', {
            params: { uid: uid }
          });
          let starturl = ''
          if (response.data.error) {
            console.error('エラー:', response.data.error);
          } else {
            starturl = response.data?.[0]?.starturl ?? '';
            // starturl = response.data[0].starturl
          }
          if (starturl) {
            response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/shortUrlSelect.php', {
              params: { urlid: starturl }
            });
            if (response.data.error) {
              console.error('エラー:', response.data.error);
              // alert(`エラー: ${response.data.error}`);
            } else {
              params = new URL('https://dummy/&' + response.data).searchParams
            }
          }
        }
      }
      // console.log(params.get('slj'))
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
      const simas = params.get('simas')
      const simaText = params.get('simatext')
      const image = params.get('image')
      const extLayer = params.get('extlayer')
      const kmlText = params.get('kmltext')
      const geojsonText = params.get('geojsontext')
      const dxfText = params.get('dxftext')
      const gpxText = params.get('gpxtext')
      const drawGeojsonText = params.get('drawgeojsontext')
      const clickGeojsonText = params.get('clickgeojsontext')
      const clickCircleGeojsonText = params.get('clickCirclegeojsontext')
      const vector = params.get('vector')
      const isWindow = params.get('iswindow')
      const simaTextForUser = params.get('simatextforuser')
      const geojsonId = params.get('geojsinid')
      const isFromIframe = params.get('isfromiframe')
      const isDrawFit = params.get('isdrawfit')
      this.pitch.map01 = pitch01
      this.pitch.map02 = pitch02
      this.bearing = bearing
      this.s_terrainLevel = terrainLevel
      return {
        lng,lat,zoom,split,pitch,pitch01,pitch02,bearing,terrainLevel,slj,
        chibans,simas,simaText,image,extLayer,kmlText,geojsonText,dxfText,gpxText,
        drawGeojsonText,clickGeojsonText,clickCircleGeojsonText,vector,isWindow,
        simaTextForUser,geojsonId,isFromIframe,isDrawFit
      }// 以前のリンクをいかすためpitchを入れている。
    },
    async init() {
      const vm = this

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
      const pmtilesProtocol = new Protocol();
      // protocol.setCacheSize(50) // タイルキャッシュサイズを設定（単位: タイル数）
      // ======================================================================


      // PMTiles プロトコルを登録
      // maplibregl.addProtocol('pmtiles', PMTilesProtocol);

      // transparentPmtiles プロトコルを登録
      maplibregl.addProtocol('transparentPmtiles', (params) => {
        console.log('Received params:', JSON.stringify(params));

        return new Promise((resolve, reject) => {
          try {
            // URL の検証
            if (!params.url.startsWith('transparentPmtiles://')) {
              console.error('Invalid protocol:', params.url);
              reject(new Error('Invalid protocol: URL must start with transparentPmtiles://'));
              return;
            }

            // transparentPmtiles:// を pmtiles:// に置換
            let pmtilesUrl = params.url.replace('transparentPmtiles://', 'pmtiles://');

            // タイル座標（例: /12/3620/1628）を抽出
            const tileMatch = params.url.match(/\/(\d+)\/(\d+)\/(\d+)$/);
            let tileParams;
            if (tileMatch) {
              tileParams = {
                z: parseInt(tileMatch[1], 10),
                x: parseInt(tileMatch[2], 10),
                y: parseInt(tileMatch[3], 10)
              };
              console.log('Extracted tile coordinates:', tileParams);
            } else if (params.tile && typeof params.tile.z === 'number' && typeof params.tile.x === 'number' && typeof params.tile.y === 'number') {
              tileParams = params.tile;
              console.log('Using provided tile coordinates:', tileParams);
            } else {
              console.error('No valid tile coordinates found in URL or params:', params);
              reject(new Error('No valid tile coordinates found in URL or params'));
              return;
            }

            // タイル座標を {z}/{x}/{y} に変換
            pmtilesUrl = pmtilesUrl.replace(/\/\d+\/\d+\/\d+$/, '/{z}/{x}/{y}');
            console.log('Converted URL:', pmtilesUrl);

            // PMTiles ファイルの URL を抽出して検証
            const urlMatch = pmtilesUrl.match(/^pmtiles:\/\/(.+)\/\{z\}\/\{x\}\/\{y\}$/);
            if (!urlMatch) {
              console.error('Invalid URL format:', pmtilesUrl);
              reject(new Error('Invalid PMTiles URL format: Expected pmtiles://<file_url>/{z}/{x}/{y}'));
              return;
            }
            const fileUrl = urlMatch[1];
            console.log('PMTiles file URL:', fileUrl);

            // PMTiles プロトコルを使用してタイルデータを取得
            // const pmtilesProtocol = new PMTilesProtocol();
            pmtilesProtocol.tile({ ...params, url: pmtilesUrl, tile: tileParams }, (err, data) => {
              if (err) {
                console.error('PMTiles error details:', err);
                reject(new Error(`PMTiles error: ${err ? err.message || err.toString() : 'Unknown error'}`));
                return;
              }
              if (!data) {
                console.error('No data returned from PMTiles');
                reject(new Error('No data returned from PMTiles'));
                return;
              }

              // タイルデータを透過処理
              const blob = new Blob([data], { type: 'image/png' });
              createImageBitmap(blob)
                  .then((image) => {
                    const canvas = document.createElement('canvas');
                    canvas.width = image.width;
                    canvas.height = image.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                      console.error('Failed to get canvas 2D context');
                      reject(new Error('Failed to get canvas 2D context'));
                      return;
                    }
                    ctx.drawImage(image, 0, 0);
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imgData.data;

                    // 透過処理: 特定の色（黒、青、白）を透明にする
                    for (let i = 0; i < data.length; i += 4) {
                      const r = data[i];
                      const g = data[i + 1];
                      const b = data[i + 2];
                      if (
                          (r === 0 && g === 0 && b === 0) || // 黒
                          (r === 0 && g === 0 && b >= 254) || // 青 (b >= 254)
                          (r === 255 && g === 255 && b === 255) // 白
                      ) {
                        data[i + 3] = 0; // アルファチャンネルを0（透明）に
                      }
                    }
                    ctx.putImageData(imgData, 0, 0);

                    // Canvas を Blob に変換
                    canvas.toBlob(
                        (blob) => {
                          if (!blob) {
                            console.error('Blob creation failed');
                            reject(new Error('Blob creation failed'));
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = function () {
                            resolve({ data: reader.result, contentType: 'image/png' });
                          };
                          reader.onerror = function () {
                            console.error('FileReader error while reading blob');
                            reject(new Error('FileReader error while reading blob'));
                          };
                          reader.readAsArrayBuffer(blob);
                        },
                        'image/png'
                    );
                  })
                  .catch((error) => {
                    console.error('Image processing error:', error);
                    reject(new Error(`Image processing error: ${error.message}`));
                  });
            });
          } catch (error) {
            console.error('Unexpected error:', error);
            reject(new Error(`Unexpected error: ${error.message}`));
          }
        });
      });

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
      const params = await this.parseUrlParams()
      // const params = this.parseUrlParams()

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
        let bearing = 0
        if (params.lng) {
          center = [params.lng,params.lat]
          zoom = params.zoom
          bearing = params.bearing
        }
        const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol, {
          tileUrl: 'https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png',
          maxzoom: 17,
          attribution: '<a href="https://gbank.gsj.jp/seamless/elev/">産総研シームレス標高タイル</a>'
        });

        let pitch = mapName === 'map01' ? params.pitch01 : params.pitch02 || 0
        pitch = isNaN(pitch) ? 0 : pitch

        // if (params.pitch || params.pitch === 0) {
        //   if (isNaN(params.pitch)) {
        //     pitch = {map01:0,map02:0}
        //   } else {
        //     pitch = {map01:params.pitch,map02:params.pitch}
        //   }
        // }

        const map = new maplibregl.Map({
          container: mapName,
          localIdeographFontFamily: ['sans-serif'], // 日本語を表示するための設定
          center: center,
          zoom: zoom,
          maxZoom: 24.4,
          pitch: pitch,
          bearing:bearing,
          maxPitch: 85, // 最大の傾き85、デフォルトは60
          attributionControl: false, // ズーム中の衝突フェードをカット（微小だが効く）
          fadeDuration: 0,
          renderWorldCopies: false, // 世界コピーを描かない＝タイル負荷減
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
            // "sprite": "https://gsi-cyberjapan.github.io/optimal_bvmap/sprite/std",
            // "sprite": "https://tile.openstreetmap.jp/styles/osm-bright-ja/sprite",
            "sprite": "https://maputnik.github.io/osm-liberty/sprites/osm-liberty",
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
      // const vm = this
      //----------------------------------





      function featuresCreate (features) {
        features = features.filter(feature => feature.properties?.mode !== 'select')
        features = features.map(feature => {
          const newProps = {...feature.properties};
          delete newProps.selected;
          return {
            ...feature,
            properties: newProps,
          };
        })
        return features
      }




      // drawInstance.on('finish', (e) => {
      //   // const features =featuresCreate (drawInstance.getSnapshot())
      //   const features = convertPolygonsToLineStrings(featuresCreate (drawInstance.getSnapshot()))
      //   drawInstance.clear();
      //   drawInstance.addFeatures(features);
      //   setTimeout(() => {
      //     map.moveLayer( 'terradraw-measure-polygon-label')
      //     map.moveLayer( 'terradraw-measure-line-label')
      //     map.moveLayer( 'terradraw-measure-line-node')
      //   },500)
      //   const geojsonText = JSON.stringify(features, null, 2);
      //   this.$store.state.drawGeojsonText = geojsonText
      //   this.updatePermalink()
      // });

      // document.querySelector('.maplibregl-terradraw-delete-button').addEventListener('click', () => {
      //   this.$store.state.drawGeojsonText = ''
      //   this.updatePermalink()
      // });

      // document.addEventListener('keydown', (e) => {
      //   // MacのBackspaceに相当するキー
      //   if (e.key === 'Backspace') {
      //     e.preventDefault(); // 不要な戻る操作を防ぐ
      //
      //     // TerraDraw にカスタム delete イベントを送信
      //     if (this.drawControl) {
      //
      //       // this.drawControl.draw.handleEvent({
      //       //   type: 'keydown',
      //       //   key: 'Delete', // ← 擬似的に "Delete" を送る！
      //       // });
      //     }
      //   }
      // })

      function getNearbyClickCirclePointId(map, e, pixelTolerance = 20) {
        if (!e || !e.lngLat) return null;
        const clickPixel = map.project(e.lngLat);
        const features = map.getSource(clickCircleSource.iD)._data.features || [];
        for (const f of features) {
          if (!f.geometry || f.geometry.type !== 'Point') continue;
          const [lng2, lat2] = f.geometry.coordinates;
          const featurePixel = map.project({ lng: lng2, lat: lat2 });
          const dx = featurePixel.x - clickPixel.x;
          const dy = featurePixel.y - clickPixel.y;
          const pixelDist = Math.sqrt(dx * dx + dy * dy);
          if (pixelDist < pixelTolerance) {
            return f.properties?.id ?? null; // id プロパティを返す。なければ null
          }
        }
        return null;
      }
      // 該当featureのid（またはnull）を返す: Polygon版
      function getPolygonFeatureIdAtClick(map, e) {
        // クリックイベントと座標がなければ null
        if (!e || !e.lngLat) return null;
        const clickLngLat = [e.lngLat.lng, e.lngLat.lat];
        // ソースから GeoJSON データを取得
        const source = map.getSource(clickCircleSource.iD);
        if (!source || !source._data) return null;
        const features = source._data.features || [];
        // 各フィーチャをチェック
        for (const feature of features) {
          const geom = feature.geometry;
          if (!geom) continue;
          const type = geom.type;
          // Polygon または MultiPolygon のみ対象
          if (type === 'Polygon' || type === 'MultiPolygon') {
            // turf.booleanPointInPolygon は両方のタイプに対応
            if (turf.booleanPointInPolygon(turf.point(clickLngLat), feature)) {
              // alert(feature.properties.id)
              return feature.properties.id || null;
            }
          }
        }
        return null;
      }

      // function getPolygonFeatureIdAtClick(map, e) {
      //   // alert(999)
      //   if (!e || !e.lngLat) return null;
      //   const clickLngLat = [e.lngLat.lng, e.lngLat.lat];
      //   // ポリゴン配列取得
      //   const features = map.getSource(clickCircleSource.iD)._data.features || [];
      //   const found = features.find(f => {
      //     if (!f.geometry || f.geometry.type !== 'Polygon' || f.geometry.type !== 'MultiPolygon') return false;
      //     return turf.booleanPointInPolygon(turf.point(clickLngLat), f);
      //   });
      //   return found ? found.properties.id : null;
      // }
      // 該当featureのid（またはnull）を返す: LineString版
      function getLineFeatureIdAtClickByPixel(map, e, pixelTolerance = 20) {
        if (!e || !e.lngLat) return null;
        const clickPixel = map.project(e.lngLat);
        const features = map.getSource(clickCircleSource.iD)._data.features || [];
        const found = features.find(f => {
          if (!f.geometry || f.geometry.type !== 'LineString') return false;
          const coords = f.geometry.coordinates;
          // 各線分ごとに最短ピクセル距離を調べる
          for (let i = 0; i < coords.length - 1; i++) {
            const p1 = map.project({ lng: coords[i][0], lat: coords[i][1] });
            const p2 = map.project({ lng: coords[i + 1][0], lat: coords[i + 1][1] });
            const d = pointToSegmentDistance(clickPixel, p1, p2);
            if (d <= pixelTolerance) return true;
          }
          return false;
        });
        return found ? found.properties.id : null;
      }
      // 2点間の線分への最短距離（ピクセル空間で）
      function pointToSegmentDistance(pt, p1, p2) {
        const x = pt.x, y = pt.y;
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0) {
          // 線分が点の場合
          return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
        }
        // t: 線分上の最近点パラメータ（0～1）
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        return Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
      }
      let clickTimer = null;
      const CLICK_DELAY = 150; // ms

      // ラベルレイヤーをクリックしたとき
      map.on('click', 'click-circle-label-layer', (e) => {
        const labelFeat = e.features && e.features[0];
        if (!labelFeat) return;
        // ラベルフィーチャーの id プロパティを取得
        this.$store.state.id = labelFeat.properties.id;
      });

      // ポイント作成-----------------------------------------------------------------------------------
      function onPointClick(e) {
        popup(e,map,'map01',vm.s_map2Flg)
      }
      map.on('click', (e) => {
        const lat = e.lngLat.lat
        const lng = e.lngLat.lng
        const coordinates = [lng,lat]
        this.$store.state.coordinates = coordinates
        const targetId = getNearbyClickCirclePointId(map, e, 20)
        if (targetId) {
          this.$store.state.id = targetId
          return;
        }
        const targetId2 = getPolygonFeatureIdAtClick(map, e)
        if (targetId2) {
          this.$store.state.id = targetId2
          return;
        }
        // クリック位置に 'click-circle-label-layer' のフィーチャーがあれば抜ける
        const labelHits = map.queryRenderedFeatures(e.point, {
          layers: ['click-circle-label-layer']
        });
        if (labelHits.length > 0) {
          return;  // ラベル層をクリックしたので何もしない
        }
        if (!this.s_isDrawPoint) return;
        const dummyEvent = {
          lngLat: { lng: lng, lat: lat },
        };
        const id = String(Math.floor(10000 + Math.random() * 90000))
        this.$store.state.id = id
        if (this.s_isDrawPoint) {
          const now = new Date()
          const hours = now.getHours()
          const minutes = now.getMinutes()
          const seconds = now.getSeconds()
          const properties = {
            id: id,
            // label: this.$store.state.isSmall500 ? `${hours}:${minutes}:${seconds}` : '',
            label: `${hours}:${minutes}:${seconds}`,
            color: this.$store.state.currentTextColor || 'black',
            'point-color': this.$store.state.currentPointColor || 'black',
            'text-size': this.$store.state.currentTextSize || 16,
            offsetValue: [0.6, 0.0],
            textAnchor: 'left',
            textJustify: 'left',
            labelType: this.$store.state.isSmall500 ? '1' : this.$store.state.currentTextLabelType || '1',
            longText: '',
            borderRadius: '10px',
          }
          geojsonCreate(map, 'Point', coordinates, properties)
          // 地図がアイドル状態（描画が完了）になるのを待つ
          // map.once('idle', () => {
          //   onPointClick(dummyEvent);
          // });
          setTimeout(() => {
            onPointClick(dummyEvent);
          },500)
          setTimeout(() => {
            onPointClick(dummyEvent);
          },1000)
        }
      })
      // サークル作成-----------------------------------------------------------------------------------
      function onCircleClick(e) {
        popup(e,map,'map01',vm.s_map2Flg)
      }
      map.on('click', (e) => {
        const lng = e.lngLat.lng
        const lat = e.lngLat.lat
        const coordinates = [lng,lat]
        this.$store.state.coordinates = coordinates
        const targetId = getPolygonFeatureIdAtClick(map, e)
        if (targetId) {
          this.$store.state.id = targetId
          return;
        }
        const targetId2 = getNearbyClickCirclePointId(map, e, 20)
        if (targetId2) {
          this.$store.state.id = targetId2
          return;
        }

        if (!this.s_isDrawCircle) return

        const id = String(Math.floor(10000 + Math.random() * 90000))
        this.$store.state.id = id
        const properties = {
          id: id,
          pairId: id,
          label:'',
          label2:'',
          isRadius: true,
          offsetValue: [0, 2],
          'line-width': this.$store.state.currentCircleLineWidth || 1,
          lineColor: this.$store.state.currentCircleLineColor || 'black',
          radius: this.$store.state.currentCircleRadius || 0,
          color: colorNameToRgba(this.$store.state.currentCircleColor || 'blue', 0.6),
          canterLng: 0,
          canterLat: 0,
          labelType: '0',
        }
        geojsonCreate(map, 'Circle', coordinates, properties)
        const dummyEvent = {
          lngLat: { lng: lng, lat: lat },
        };
        setTimeout(() => {
          onCircleClick(dummyEvent);
        },500)

      })
      // // ライン作成-------------------------------------------------------------------------------------------------------
      // function onLineClick(e) {
      //   popup(e,map,'map01',vm.s_map2Flg)
      // }
      // // ライン描画
      // map.on('click', (e) => {
      //   const lat = e.lngLat.lat;
      //   const lng = e.lngLat.lng;
      //   const coordinates = [lng, lat];
      //   this.$store.state.coordinates = coordinates
      //   // クリック判定
      //   const targetId = getLineFeatureIdAtClickByPixel(map, e);
      //   if (targetId) {
      //     this.$store.state.id = targetId;
      //     return;
      //   }
      //   if (!this.s_isDrawLine) return;
      //   if (clickTimer !== null) return; // 2回目のクリック時は無視
      //   clickTimer = setTimeout(() => {
      //     // 節点追加
      //     this.tempLineCoords.push(coordinates);
      //     this.tempLineCoords = dedupeCoords(this.tempLineCoords)
      //
      //     console.log('シングルクリック！');
      //     clickTimer = null;
      //   }, CLICK_DELAY);
      // });
      // // ダブルクリック時：ライン確定
      // map.on('dblclick', (e) => {
      //   if (!this.s_isDrawLine) return;
      //   if (clickTimer !== null) {
      //     clearTimeout(clickTimer); // シングルの予定をキャンセル
      //     clickTimer = null;
      //   }
      //   e.preventDefault(); // 地図ズーム防止
      //   if (this.tempLineCoords.length >= 2) {
      //     // ライン作成
      //     const id = String(Math.floor(10000 + Math.random() * 90000));
      //     this.$store.state.id = id;
      //     const properties = {
      //       id: id,
      //       pairId: id,
      //       label: '',
      //       labelType: this.$store.state.currentLineLabelType,
      //       offsetValue: [0.6, 0],
      //       color: this.$store.state.currentLineColor,
      //       arrow: this.$store.state.currentArrowColor,
      //       'line-width': this.$store.state.currentLineWidth,
      //       textAnchor: 'left',
      //       textJustify: 'left',
      //       calc: this.$store.state.currentLineCalcCheck
      //     };
      //     geojsonCreate(map, 'LineString', this.tempLineCoords.slice(), properties);
      //     // 擬似クリックイベント発火（最初の点）
      //     const dummyEvent = {
      //       lngLat: {
      //         lng: this.tempLineCoords[0][0],
      //         lat: this.tempLineCoords[0][1]
      //       }
      //     };
      //     this.$store.state.coordinates = [this.tempLineCoords[0][0], this.tempLineCoords[0][1]];
      //     setTimeout(() => {
      //       onLineClick(dummyEvent);
      //     }, 500);
      //     this.finishLine()
      //     // 終了
      //     this.tempLineCoords = [];
      //   }
      // });
      // // let isFirstTouch = true;
      // map.on('touchstart', (e) => {
      //   if (!this.s_isDrawLine && !this.s_isDrawPolygon) return;
      //   // if (!isFirstTouch) return;
      //   // isFirstTouch = false;
      //   const touch = e.touches?.[0] || e.originalEvent?.touches?.[0];
      //   if (!touch) return;
      //   const rect = map.getCanvas().getBoundingClientRect();
      //   const point = {
      //     x: touch.clientX - rect.left,
      //     y: touch.clientY - rect.top
      //   };
      //   const lngLat = map.unproject(point);
      //   const vertexGeojson = {
      //     type: 'FeatureCollection',
      //     features: [{
      //       type: 'Feature',
      //       geometry: {
      //         type: 'Point',
      //         coordinates: [lngLat.lng, lngLat.lat]
      //       },
      //       properties: {}
      //     }]
      //   };
      //   map.getSource('guide-line-source')?.setData(vertexGeojson);
      // });
      // // ポリゴン作成：シングルクリックで節点追加---------------------------------------------------------
      // function onPolygonClick(e) {
      //   popup(e,map,'map01',vm.s_map2Flg)
      // }
      // map.on('click', (e) => {
      //   if (!this.s_isDrawPolygon) return;
      //
      //   const lat = e.lngLat.lat;
      //   const lng = e.lngLat.lng;
      //   const coordinates = [lng, lat];
      //   console.log(coordinates)
      //   // 節点追加
      //   this.tempPolygonCoords.push(coordinates);
      //   console.log('シングルクリック！（ポリゴン）', this.tempPolygonCoords);
      //   this.tempPolygonCoords = dedupeCoords(this.tempPolygonCoords)
      //
      // });
      // // ダブルクリックでポリゴン確定
      // map.on('dblclick', (e) => {
      //   if (!this.s_isDrawPolygon) return;
      //   if (clickTimer !== null) {
      //     clearTimeout(clickTimer);
      //     clickTimer = null;
      //   }
      //   e.preventDefault();
      //
      //   if (this.tempPolygonCoords.length >= 3) {
      //     // ポリゴンは必ず閉じる（最初の点を最後に追加）
      //     if (
      //         this.tempPolygonCoords.length < 4 ||
      //         this.tempPolygonCoords[0][0] !== this.tempPolygonCoords[this.tempPolygonCoords.length - 1][0] ||
      //         this.tempPolygonCoords[0][1] !== this.tempPolygonCoords[this.tempPolygonCoords.length - 1][1]
      //     ) {
      //       this.tempPolygonCoords.push([...this.tempPolygonCoords[0]]);
      //     }
      //
      //     // GeoJSONのPolygonは2重配列
      //     const coords = [this.tempPolygonCoords.slice()];
      //
      //     const id = String(Math.floor(10000 + Math.random() * 90000));
      //     this.$store.state.id = id;
      //     const properties = {
      //       id: id,
      //       pairId: id,
      //       label: '',
      //       color: colorNameToRgba(this.$store.state.currentPolygonColor || 'yellow', 0.6),
      //       'line-width': 1,
      //     };
      //     geojsonCreate(map, 'Polygon', coords, properties);
      //
      //     // 擬似クリックイベント発火（最初の点）
      //     const dummyEvent = {
      //       lngLat: {
      //         lng: this.tempPolygonCoords[0][0],
      //         lat: this.tempPolygonCoords[0][1]
      //       }
      //     };
      //     this.$store.state.coordinates = [this.tempPolygonCoords[0][0], this.tempPolygonCoords[0][1]];
      //     setTimeout(() => {
      //       onPolygonClick(dummyEvent);
      //     }, 500);
      //
      //     this.finishLine();
      //     this.tempPolygonCoords = [];
      //   }
      // });

      /**
       *
       */
      drawMethods()

      // フリーハンド-----------------------------------------------------------------------------------------------------
      // let isDrawing = false;
      // map.getCanvas().addEventListener('pointerdown', (e) => {
      //   if (!this.s_isDrawFree) return;
      //
      //   const point = map.unproject([e.clientX, e.clientY]);
      //   isDrawing = true;
      //   this.tempFreehandCoords = [];
      //   this.tempFreehandCoords.push([point.lng, point.lat]);
      //
      //   map.getCanvas().style.cursor = 'crosshair';
      //   map.dragPan.disable(); // パン無効化
      // });
      //
      // // pointermove（描画中）
      // map.getCanvas().addEventListener('pointermove', (e) => {
      //   if (!isDrawing) return;
      //
      //   const point = map.unproject([e.clientX, e.clientY]);
      //   this.tempFreehandCoords.push([point.lng, point.lat]);
      //
      //   const tempLine = {
      //     type: 'FeatureCollection',
      //     features: [{
      //       type: 'Feature',
      //       geometry: {
      //         type: 'LineString',
      //         coordinates: this.tempFreehandCoords
      //       },
      //       properties: {
      //         'keiko': 0,
      //         'color': this.$store.state.currentFreeHandColor || 'black',
      //         'keiko-color': this.$store.state.currentFreeHandKeikoColor || '#1C1C1C',
      //         'line-width': this.$store.state.currentFreeHandWidth || 5,
      //       }
      //     }]
      //   };
      //   map.getSource('freehand-preview-source').setData(tempLine);
      // });
      //
      // // pointerup（終了）
      // map.getCanvas().addEventListener('pointerup', (e) => {
      //   if (!isDrawing) return;
      //   isDrawing = false;
      //   map.getCanvas().style.cursor = '';
      //   // alert('pan')
      //   map.dragPan.enable(); // パン再有効化
      //
      //   if (this.tempFreehandCoords.length >= 2) {
      //     const id = String(Math.floor(10000 + Math.random() * 90000));
      //     this.$store.state.id = id;
      //
      //     const properties = {
      //       id: id,
      //       'free-hand': 1,
      //       keiko: 0,
      //       label: '',
      //       color: 'black',
      //       // 'keiko-color': '#FF8000',
      //       'keiko-color': this.$store.state.currentFreeHandKeikoColor || 'rgba( 28,  28,  28, 0.5)',
      //       offsetValue: [0.6, 0],
      //       'line-width': this.$store.state.currentFreeHandWidth || 5,
      //       textAnchor: 'left',
      //       textJustify: 'left'
      //     };
      //
      //     geojsonCreate(map, 'FreeHand', this.tempFreehandCoords.slice(), properties);
      //
      //     // 擬似クリック
      //     this.$store.state.coordinates = this.tempFreehandCoords[0];
      //     const dummyEvent = { lngLat: { lng: this.tempFreehandCoords[0][0], lat: this.tempFreehandCoords[0][1] } };
      //     setTimeout(() => {
      //       onLineClick(dummyEvent);
      //     }, 500);
      //   }
      //
      //   this.finishLine();
      //   this.tempFreehandCoords = [];
      // });
      //
      // // pointerleave（指やカーソルが外れたとき）も描画終了しておく
      // map.getCanvas().addEventListener('pointerleave', () => {
      //   if (isDrawing) {
      //     isDrawing = false;
      //     // alert('pan')
      //     map.dragPan.enable();
      //     map.getCanvas().style.cursor = '';
      //     this.tempFreehandCoords = [];
      //   }
      // });

      // // 投げ縄-----------------------------------------------------------------------------------------------------
      // // 1. グローバル変数
      // let isLassoDrawing = false;
      // let lassoCoords = [];
      // const lassoSourceId = 'lasso-source';
      // const lassoLayerId = 'lasso-layer';
      //
      // // 1. pointerdown => 投げ縄開始
      // map.getCanvas().addEventListener('pointerdown', (e) => {
      //   // 0. ソース & レイヤーの追加（初期化）
      //   if (!map.getSource(lassoSourceId)) {
      //     map.addSource(lassoSourceId, {
      //       type: 'geojson',
      //       data: {
      //         type: 'FeatureCollection',
      //         features: []
      //       }
      //     });
      //     map.addLayer({
      //       id: lassoLayerId,
      //       type: 'line',
      //       source: lassoSourceId,
      //       paint: {
      //         'line-color': 'rgba(0,0,255,0.6)',
      //         'line-width': 10
      //       }
      //     });
      //   }
      //   if (!vm.s_isDrawLasso) return;
      //   map.dragPan.disable(); // パン無効化
      //   isLassoDrawing = true;
      //   lassoCoords = [];
      //   map.getCanvas().style.cursor = 'crosshair';
      // });
      //
      // // 2. pointermove => ラインを更新
      // map.getCanvas().addEventListener('pointermove', (e) => {
      //   if (!isLassoDrawing) return;
      //   const point = map.unproject([e.clientX, e.clientY]);
      //   lassoCoords.push([point.lng, point.lat]);
      //   const lineGeojson = {
      //     type: 'FeatureCollection',
      //     features: [{
      //       type: 'Feature',
      //       geometry: { type: 'LineString', coordinates: lassoCoords }
      //     }]
      //   };
      //   map.getSource(lassoSourceId).setData(lineGeojson);
      // });
      //
      // // 3. pointerup => 投げ縄完了 & 選択処理
      // map.getCanvas().addEventListener('pointerup', (e) => {
      //   if (!isLassoDrawing) return;
      //   isLassoDrawing = false;
      //   map.getCanvas().style.cursor = '';
      //   if (lassoCoords.length >= 3) {
      //     // ポリゴンを閉じる
      //     lassoCoords.push(lassoCoords[0]);
      //     const polygon = turf.polygon([lassoCoords]);
      //     // 対象ソースの全フィーチャ取得
      //     const source = map.getSource(clickCircleSource.iD);
      //     const geojson = source._data; // or source.getData()
      //     let isLassoSelected = false
      //     // GeoJSON‐Rbush（空間インデックス）を使う方法もあるらしい。見調査
      //     // ポリゴンの bbox を先に計算
      //     const [pMinX, pMinY, pMaxX, pMaxY] = turf.bbox(polygon);
      //
      //     geojson.features.forEach(feature => {
      //       feature.properties.lassoSelected = false;
      //       // feature の bbox を計算（事前にキャッシュしておくとさらに速い）
      //       if (feature.geometry) {
      //         const [fMinX, fMinY, fMaxX, fMaxY] = turf.bbox(feature);
      //         // bbox が重ならなければ交差チェック不要
      //         if (fMaxX < pMinX || fMinX > pMaxX || fMaxY < pMinY || fMinY > pMaxY) {
      //           return;
      //         }
      //         // 本命チェック
      //         if (turf.booleanIntersects(feature, polygon)) {
      //           feature.properties.lassoSelected = true;
      //           isLassoSelected = true;
      //         }
      //       }
      //     });
      //     this.$store.state.lassoGeojson = JSON.stringify(turf.featureCollection(geojson.features.filter(feature => feature.properties.lassoSelected === true)))
      //     this.scaleValue = 100
      //     this.angleValue = 0
      //     // console.log(this.$store.state.lassoGeojson)
      //
      //     if (isLassoSelected) {
      //       this.s_isLassoSelected = true
      //     } else {
      //       this.s_isLassoSelected = false
      //     }
      //     console.log(geojson)
      //     // 更新
      //     source.setData(geojson);
      //     this.$store.state.clickCircleGeojsonText = JSON.stringify(geojson)
      //     clickCircleSource.obj.data = geojson
      //     saveDrowFeatures(geojson.features);
      //   }
      //   // 投げ縄ラインをクリア
      //   map.getSource(lassoSourceId).setData({ type: 'FeatureCollection', features: [] });
      //   map.removeLayer(lassoLayerId)
      //   map.removeSource(lassoSourceId)
      //   map.dragPan.enable();
      // });

      // // ガイドライン作成-----------------------------------------------------------------------------------------------------
      // map.on('click', (e) => {
      //   if (!this.s_isDrawLine && !this.s_isDrawPolygon) return;
      //   const lng = e.lngLat.lng;
      //   const lat = e.lngLat.lat;
      //   this.tempLineCoordsGuide.push([lng, lat]);
      //   this.isDrawingLine = true;
      //   console.log(this.tempLineCoordsGuide.length)
      //   if (this.tempLineCoordsGuide.length === 1) {
      //     const fc = turf.featureCollection([turf.point([lng, lat])])
      //     console.log(fc)
      //     map.getSource('guide-line-source').setData(fc)
      //   }
      // });
      // map.on('mousemove', (e) => {
      //   if ((!this.isDrawingLine || this.tempLineCoordsGuide.length === 0)) return;
      //   // 仮ライン：既存＋現在マウス座標
      //   const guideCoords = this.tempLineCoordsGuide.concat([[e.lngLat.lng, e.lngLat.lat]]);
      //   const guideLineGeoJson = {
      //     type: 'FeatureCollection',
      //     features: [{
      //       type: 'Feature',
      //       geometry: {
      //         type: 'LineString',
      //         coordinates: guideCoords
      //       },
      //       properties: {}
      //     }]
      //   };
      //   map.getSource('guide-line-source').setData(guideLineGeoJson);
      // });

      // ⭐️⭐️⭐️頂点移動
      setVertex()
      vertexAndMidpoint()


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
        // その後フリーズしなくなったのでmoveに統一。
        let m = 'move'
        if (vm.isIphone) {
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
        if (this.s_isPrint) {
          pointer1.style.display = 'none'
          pointer2.style.display = 'none'
        }
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
        if (this.s_isPrint) {
          pointer1.style.display = 'none'
          pointer2.style.display = 'none'
        }
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
      map.on('rotate', () => {
        const bearing = map.getBearing(); // 地図の北の角度（度）
        try {
          document.querySelectorAll('.compass-icon').forEach(compass => {
            compass.style.transform = `rotate(${-bearing}deg)`
          })
        }catch (e) {
          console.log(e)
        }
      });

      function getScaleRatio(map) {
        const zoom = map.getZoom();
        const dpi = 96; // 通常の画面DPI（印刷用途では 300dpi などに変えても良い）
        const inchesPerMeter = 39.37;

        // 1ピクセルあたりの地上距離（m）
        const resolution = 156543.03392804097 * Math.cos(map.getCenter().lat * Math.PI / 180) / Math.pow(2, zoom);
        const scaleDenominator = resolution * dpi * inchesPerMeter;

        return `1:${Math.round(scaleDenominator).toLocaleString()}`;
      }

      // ---- 簡易セマフォ ----
      class Semaphore {
        constructor(max) { this.max = max; this.active = 0; this.q = []; }
        async acquire() {
          if (this.active >= this.max) await new Promise(r => this.q.push(r));
          this.active++;
        }
        release() {
          this.active--;
          const next = this.q.shift();
          if (next) next();
        }
        async run(fn) {
          await this.acquire();
          try { return await fn(); } finally { this.release(); }
        }
      }

      const CONCURRENCY = 8;                 // 同時リクエスト上限（調整してOK）
      const RETRIES = 2;                     // リトライ回数
      const BASE_DELAY_MS = 250;             // バックオフ初期値
      const sem = new Semaphore(CONCURRENCY);

      async function fetchWithRetry(url, opts = {}, retries = RETRIES) {
        for (let i = 0; i <= retries; i++) {
          try {
            const res = await fetch(url, opts);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
          } catch (e) {
            if (i === retries) throw e;
            // HTTP/2 の一時的な拒否を想定して指数バックオフ
            const wait = BASE_DELAY_MS * Math.pow(2, i) + Math.floor(Math.random() * 100);
            await new Promise(r => setTimeout(r, wait));
          }
        }
      }

// ---- 制限付きプロトコル（"lim+" スキーム）----
      maplibregl.addProtocol('lim', (req, callback) => {
        // req.url は "lim+https://..." 形式になるので、"lim+" を取り除いた最終URLを使う
        const realUrl = req.url.replace(/^lim\+/, '');

        sem.run(async () => {
          try {
            const res = await fetchWithRetry(realUrl, { credentials: 'same-origin' });
            const cc = res.headers.get('cache-control') || null;
            const ex = res.headers.get('expires') || null;
            const ct = (res.headers.get('content-type') || '').toLowerCase();

            // 種別ごとの戻し方（Vector MVT / Glyph / JSON / 画像）
            if (ct.includes('application/json')) {
              const text = await res.text();
              callback(null, text, cc, ex);
            } else if (ct.includes('protobuf') || realUrl.endsWith('.pbf')) {
              const buf = await res.arrayBuffer();
              callback(null, buf, cc, ex);
            } else if (ct.startsWith('image/')) {
              const blob = await res.blob();
              // 画像は ImageBitmap で返すのが安全
              const bitmap = await createImageBitmap(blob);
              callback(null, bitmap, cc, ex);
            } else {
              // その他は ArrayBuffer で返す
              const buf = await res.arrayBuffer();
              callback(null, buf, cc, ex);
            }
          } catch (err) {
            callback(err);
          }
        });
        // true を返すと MapLibre に「非同期で後で callback 呼ぶよ」と伝えられる
        return { cancel: () => {}, priority: 0 };
      });

      enableDragHandles(map)

      this.map01.on('styleimagemissing', async (e) => {
        if (e.id.includes('--')) {
          // console.log(e.id)
          // store.state.loadingMessage3 = 'アイコン取得中'
          // store.state.loading3 = true
          await addSvgAsImage(this.map01, e.id, `https://kenzkenz.xsrv.jp/icon/mapillary/package_signs/${e.id}.svg`)
          // store.state.loading3 = false
        }
      })
      this.$store.state.map01.on('click', 'oh-mapillary-images-3-icon', async (e) => {
        await mapillaryWindowOpenDebounced(e, 2)
      })
      this.$store.state.map01.on('click', 'oh-mapillary-images-2', async (e) => {
        await mapillaryWindowOpenDebounced(e, 2)
      })
      this.$store.state.map01.on('click', 'oh-mapillary-images-2-label', async (e) => {
        await mapillaryWindowOpenDebounced(e, 2)
      })
      this.$store.state.map01.on('click', 'oh-mapillary-images-2-icon', async (e) => {
        await mapillaryWindowOpenDebounced(e, 2)
      })
      this.$store.state.map01.on('click', 'oh-mapillary-images', (e) => {
        /**
         * こっちがマピラリ本命
         */
        mapillaryWindowOpenDebounced(e)
      });
      this.map01.on('dragend', () => {
        if (this.is360Pic) {
          if (this.map01.getZoom() > 14) {
            setFllter360(this.$store.state.map01)
          }
        }
      })
      this.map01.on('zoomend', () => {
        if (this.is360Pic) {
          if (this.map01.getZoom() > 14) {
            setFllter360(this.$store.state.map01)
          }
        }
      })
      /**
       * 現在全く動いていない。
       */
      // await registerMdiIcon(this.map01, {
      //   name: 'lot-pin',
      //   path: mdiMapMarker,
      //   size: 24,
      //   color: '#1976D2',
      //   strokeWidth: 1,
      //   strokeColor: 'rgba(255,255,255,0.8)'
      // });
      /**
       * 右クリックメニュー
       * @type {detach|*}
       */
      const popupWidth = 600
      const popupHeight = 400
      const headingOffset = 0
      const detach = attachMapRightClickMenu({
        map: store.state.map01,
        items: [
          {
            label: 'Googleマップを開く',
            onSelect: ({ map, lngLat }) => {
              // 検索URLか、中心指定URLのどちらかお好みで
              const url = buildGoogleMapsSearchUrl(lngLat);
              // const url = buildGoogleMapsUrl(lngLat, { zoom: map.getZoom() });
              window.open(url, '_blank', 'noopener');
            }
          },
          {
            label: 'ストリートビューを開く',
            onSelect: ({ map, lngLat }) => {
              const heading = map.getBearing?.() ?? 0; // 地図の方位を活用（任意）
              const pitch = (map.getPitch?.() ?? 0) - 20; // 少し下向き
              const url = buildStreetViewUrl(lngLat, { heading, pitch, fov: 90 });
              window.open(url, '_blank', 'noopener');
            }
          },
          {
            label: 'SVを別ウインドウで開く',
            onSelect: ({ map, lngLat }) => {
              setSvPin(map, lngLat);
              const heading = ((map?.getBearing?.() ?? 0) + 360) % 360;
              const url = buildSVUrlSimple(lngLat, { heading, pitch: -15, fov: 90 });
              openTopRightWindowFlushHalfWidthFullHeight(url, { name: 'GSV-TopRight-Half' });
            }
          },
          { label: 'Mapillaryを開く', onSelect: ({ lngLat }) => window.open(buildMapillaryUrl(lngLat, map.getZoom?.() ?? 18, map.getBearing?.() ?? 0), '_blank', 'noopener') },
          { label: '俯瞰 60°/0° 切替', onSelect: () => { const p = map.getPitch(); map.easeTo({ pitch: p > 30 ? 0 : 60 }); } },
          { label: '点を追加', onSelect: ({ lngLat }) => { pushFeatureToGeoJsonSource(map, 'click-circle-source', pointFeature(lngLat, {
              label: 'PIN',
              color: 'red',
              'point-color': 'red',
              'text-size': 14,
              offsetValue: [0.6, 0.0],
              textAnchor: 'left',
              textJustify: 'left',
              labelType: '1',
              longText: '',
              borderRadius: '10px',
            })); } },
          { label: '点を削除', onSelect: ({ point }) => {const ok = removePointUnderCursor(map, point, 'click-circle-source');if (!ok) alert('直下に削除できるピンが見つかりません');}},

          // 実用メニューをまとめて展開
          // ...buildUtilityMenuItems({ map, geojsonSourceId: 'click-circle-source' }),
        ]
      });
      /**
       * ピッチとベアリングを監視
       * store.state.map01Pitch等に収録
       * @type {{map01Tracker: {readonly bearing: number, destroy: function(): void, readonly pitch: number|number}, map02Tracker: {readonly bearing: number, destroy: function(): void, readonly pitch: number|number}}}
       */
      const res = attachViewOrientationPair({
        map01: this.$store.state.map01,
        map02: this.$store.state.map02,
        store,
        bearingIn360: false,
      })
      this.map01Tracker = res.map01Tracker
      this.map02Tracker = res.map02Tracker

      // -----------------------------------------------------------------------------------------------------------------
      // on load オンロード
      this.mapNames.forEach(mapName => {
        const map = this.$store.state[mapName]
        // const params = this.parseUrlParams()
        // console.log(params)
        map.on('load',async () => {


          // DrawToolインスタンス化
          // const drawTool = new DrawTool(map);

          if (this.$store.state.isIphone) {
            installSafePicking(map)
            installDrawerStabilizer(map, {
              drawerSelector: '.point-info-drawer',  // ★必須
            });
            stopDrawerAnimations('.point-info-drawer')
          }

          // const params = await this.parseUrlParams()
          console.log(params)
          // iPadでもMapLibreのパンやズームを活かしつつイベントも拾う
          // map.getCanvas().style.touchAction = 'manipulation';

          map.on('click', (e) => {
            this.onMapClick(e);
          });
          this.originalEnable = map.dragPan.enable;
          const scale = new maplibregl.ScaleControl({
            maxWidth: 100,      // スケールバーの最大幅（ピクセル）
            unit: 'metric'      // 単位： 'metric'（メートル）または 'imperial'（マイル）
          });
          map.addControl(scale, 'bottom-left');
          document.querySelectorAll('.maplibregl-ctrl-scale').forEach(scale => scale.style.display = 'none')

          // ドローを同期
          if (mapName === 'map01') {

            this.drawToolSet()

            const map01 = this.$store.state.map01
            const map02 = this.$store.state.map02
            map01.on('sourcedata', (e) => {
              // e.sourceDataType === 'content' でデータ本体の更新を検知
              if (e.sourceId === clickCircleSource.iD && e.sourceDataType === 'content') {
                const updatedData = map01.getSource(clickCircleSource.iD)._data;
                const src2 = map02.getSource(clickCircleSource.iD);
                if (src2) {
                  src2.setData(updatedData);
                }
                const e_updatedData = map01.getSource('end-point-source')._data;
                const e_src2 = map02.getSource('end-point-source');
                if (e_src2) {
                  e_src2.setData(e_updatedData);
                }
                const s_updatedData = map01.getSource('segment-label-source')._data;
                const s_src2 = map02.getSource('segment-label-source');
                if (s_src2) {
                  s_src2.setData(s_updatedData);
                }
              }
            });
          }

          map.setProjection({"type": "globe"})
          map.resize()
          map.doubleClickZoom.disable()

          const arrowColors = ['black', 'red', 'blue', 'green', 'orange'];
          for (const color of arrowColors) {
            const img = await map.loadImage(`./img/arrow_${color}.png`);
            map.addImage(`arrow_${color}`, img.data);
          }
          const dragIcon = await map.loadImage('./img/drag.png')
          map.addImage('drag-icon', dragIcon.data);
          // const black = await map.loadImage('./img/arrow_black.png');
          // const red = await map.loadImage('./img/arrow_red.png');
          // const blue = await map.loadImage('./img/arrow_blue.png');
          // const green = await map.loadImage('./img/arrow_green.png');
          // const orange = await map.loadImage('./img/arrow_orange.png');
          // map.addImage('arrow_black', black.data);
          // map.addImage('arrow_red', red.data);
          // map.addImage('arrow_blue', blue.data);
          // map.addImage('arrow_green', green.data);
          // map.addImage('arrow_orange', orange.data);

          // console.log(params)


          if (params.map01Pitch) {
            this.$store.state.map01Pitch = params.map01Pitch
          }
          if (params.map02Pitch) {
            this.$store.state.map02Pitch = params.map02Pitch
          }
          if (params.bearing) {
            this.$store.state.map01Bearing = params.bearing
          }

          if (params.simaTextForUser) {
            this.$store.state.simaTextForUser = params.simaTextForUser
          }

          if (params.isDrawFit) {
            this.$store.state.isDrawFit = JSON.parse(params.isDrawFit)
            // alert(this.$store.state.isDrawFit)
          }
          if (params.isFromIframe) {
            this.$store.state.isFromIframe = JSON.parse(params.isFromIframe)
          }
          if (params.isWindow) {
            this.$store.state.isWindow2 = JSON.parse(params.isWindow)
          }
          if (params.vector) {
            this.$store.state.uploadedVector = JSON.parse(params.vector)
          }

          if (params.clickCircleGeojsonText && params.clickCircleGeojsonText !== 'undefined' && !params.geojsonId) {
            this.$store.state.clickCircleGeojsonText = params.clickCircleGeojsonText
            if (!this.$store.state.isUsingServerGeojson) {
              featureCollectionAdd()
              markerAddAndRemove()
            }
            try {
              const lasso = JSON.parse(this.$store.state.clickCircleGeojsonText).features.find(f => f.properties.lassoSelected === true)
              if (lasso) this.s_isLassoSelected = true
              this.$store.state.lassoGeojson = JSON.stringify(turf.featureCollection(JSON.parse(this.$store.state.clickCircleGeojsonText).features.filter(feature => feature.properties.lassoSelected === true)))
              const config = JSON.parse(this.$store.state.clickCircleGeojsonText).features.find(f => f.properties.id === 'config').properties
              if (config) {
                this.$store.state.printTitleText = config['title-text']
                this.$store.state.textPx = config['font-size'] || 30
                this.$store.state.titleColor = config['fill-color']
                this.$store.state.titleDirection = config['direction'] || 'vertical'
                this.$store.state.drawVisible = config['visible']
                this.$store.state.drawOpacity = config['opacity'] || 1
              }
            }catch (e) {
              console.log(e)
            }
          }

          if (params.geojsonId) {
            this.$store.state.geojsonId = params.geojsonId || ''
            console.log(this.$store.state.geojsonId)
            // if (!this.$store.state.geojsonId) return
            this.$store.state.isUsingServerGeojson = true
            const formData = new FormData();
            // alert(this.$store.state.geojsonId)
            formData.append('geojson_id', this.$store.state.geojsonId);
            const response = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/geojson_features_with_master.php', {
              method: 'POST',
              body: formData,
            });
            const data = await response.json();
            if (data.success) {
              console.log(data.rows)
              if (data.rows.length === 0) {
                this.$store.state.geojsonId = ''
                return
              }
              const configRow = data.rows.find(row => row.feature_id === 'config')
              this.$store.state.isMine = data.rows[0].creator_user_id === this.$store.state.userId
              this.$store.state.isEditable = data.rows[0].is_editable ===  '1'
              this.$store.state.isEditableForVSelect = this.$store.state.isEditable
              this.$store.state.geojsonName = data.rows[0].geojson_name || ''
              if (configRow) {
                const config = JSON.parse(configRow.feature).properties
                this.$store.state.printTitleText = config['title-text'] || ''
                this.$store.state.textPx = config['font-size'] || 30
                this.$store.state.titleColor = config['fill-color'] || 'black'
                this.$store.state.titleDirection = config['direction'] || 'vertical'
                this.$store.state.drawVisible = config['visible'] || true
                this.$store.state.drawOpacity = config['opacity'] || 1
              }
              startPolling()
              if (!this.$store.state.isEditable && !this.$store.state.isMine) {
                this.$store.state.loadingMessage = `<div style="text-align: center">${this.$store.state.geojsonName}に接続しました。<br>編集不可です。</div>`
              } else {
                this.$store.state.loadingMessage = `<div style="text-align: center">${this.$store.state.geojsonName}に接続しました。</div>`
              }
              this.$store.state.loading2 = true
              setTimeout(() => {
                this.$store.state.loading2 = false
              },3000)
            } else {
              console.log('セレクト失敗')
            }
          }

          if (params.clickGeojsonText) {
            this.$store.state.clickGeojsonText = params.clickGeojsonText
          }

          // if (params.drawGeojsonText) {
          //   this.$store.state.drawGeojsonText = params.drawGeojsonText
          //   const features = JSON.parse(this.$store.state.drawGeojsonText);
          //   drawInstance.addFeatures(features);
          //   this.drawControl.recalc()
          // }

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

          if (params.simas) {
            JSON.parse(params.simas).forEach(c => {
              this.$store.state.highlightedSimas.add(c)
            })
          }

          console.log('復帰',params.slj)

          if (params.slj) {
            const mapNames = ['map01', 'map02']
            mapNames.forEach(mapName => {
              params.slj[mapName].forEach(slj => {
                // if (slj.id === 'oh-amx-a-fude') {
                //   store.dispatch('triggerSnackbarForGroup', {message: '2024登記所地図は終了しました。2025版をご覧ください。'});
                // }
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
                      // if (slj.id === 'oh-amx-a-fude') {
                      //   const result = toRaw(layers).find(layer => {
                      //     return layer.id === 'oh-homusyo-2025-layer'
                      //   })
                      //   console.log(result)
                      //   slj.id = result.id
                      //   slj.label = result.label
                      //   slj.source = result.source
                      //   slj.sources = result.sources
                      //   slj.layers = result.layers
                      //   slj.attribution = result.attribution
                      //   slj.ext = result.ext
                      //   slj.info = result.info
                      // } else {
                      //   if (layer.id === slj.id) {
                      //     slj.label = layer.label
                      //     slj.source = layer.source
                      //     slj.sources = layer.sources
                      //     slj.layers = layer.layers
                      //     slj.attribution = layer.attribution
                      //     slj.info = layer.info
                      //   }
                      // }
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
            if (
                location.hostname === 'localhost' ||      // ローカル
                location.hostname === '127.0.0.1' ||      // ローカルIP
                location.hostname.startsWith('192.168.')  // プライベートIP
            ) {
              // ローカル環境の処理
              console.log('ローカル接続');
              this.s_selectedLayers[mapName].unshift(
                  {
                    id: 'oh-vector-layer-osm-bright',
                    label: 'OSMベクター',
                    sources: osmBrightSources,
                    layers: osmBrightLayers,
                    opacity: 1,
                    visibility: true,
                    attribution: '© <a href="https://wiki.openstreetmap.org/wiki/Japan/OSMFJ_Tileserver" target="_blank">OpenStreetMap</a> contributors',
                  }
                  // {
                  //   id: 'oh-pale-layer',
                  //   label: "地理院淡色地図",
                  //   source: paleSource,
                  //   layers: [paleLayer],
                  //   opacity: 1,
                  //   visibility: true,
                  // }
              )
            } else {
              // 本番環境の処理
              console.log('本番環境');
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
          }
          // -----------------------------------------------------------------------------------------------------------
          let fetchFlg = false;
          async function processUserLayers(slj,mapName) {
            const promises = slj.map(async (v) => {
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
                    console.log('レスポンス',response)
                    let url = response.data[0].url
                    console.log(JSON.stringify(url))
                    let source
                    if (url.includes('{-y}')) {
                      url = url.replace(/{-y}/,'{y}')
                      source = {
                        id: response.data[0].name + '-source',obj: {
                          type: 'raster',
                          tiles: [url],
                          scheme: 'tms'
                        }
                      }
                    } else {
                      source = {
                        id: response.data[0].name + '-source',obj: {
                          type: 'raster',
                          tiles: [url]
                        }
                      }
                    }
                    console.log(source)
                    // source = {
                    //   id: response.data[0].name + '-source',
                    //   obj: { type: 'raster', tiles: [response.data[0].url] }
                    // };
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
                    console.log(response.data[0])
                    const name = response.data[0].name;
                    const id = response.data[0].id;
                    const url = response.data[0].url;
                    const zahyokei = response.data[0].zahyokei;
                    const simaText = response.data[0].simatext;
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
                      // vm.$store.state.simaTextForUser = JSON.stringify({
                      //   text: simaText,
                      //   opacity:JSON.parse(vm.$store.state.simaTextForUser).opacity
                      // })
                      // vm.s_simaOpacity = JSON.parse(vm.$store.state.simaTextForUser).opacity
                      if (mapName === 'map01') {
                        vm.$store.state.snackbar = true
                        vm.$store.state.simaText = ''
                      }
                    }
                    await aaa()
                  }
                } catch (error) {
                  vm.$store.state.snackbar = false
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
                    let url = response.data[0].url;
                    const bbox = JSON.parse(response.data[0].bbox);
                    const bounds = [bbox[0], bbox[1], bbox[2], bbox[3]];
                    const transparent = JSON.parse(response.data[0].transparent);
                    let tile = ''
                    let source = null
                    if (url.endsWith('.pmtiles')) {
                      // transparentPmtiles://https://example.com/tiles.pmtiles/10/123/456
                      // alert('transparentPmtiles://' + url + '/{z}/{x}/{y}')
                      url = url.replace('https://kenzkenz.duckdns.org/','https://kenzkenz.net/')
                      source = {
                        id: 'oh-vpstile-' + id + '-' + name + '-source',
                        obj: {
                          type: 'raster',
                          url: 'pmtiles://' + url,
                          // tiles: ['transparentPmtiles://' + url + '/{z}/{x}/{y}'],
                          bounds: bounds,
                          maxzoom: 26 }
                      };
                    } else {
                      if (transparent !== 0) {
                        tile = 'transparentBlack://' + url
                      } else {
                        tile = url
                      }
                      source = {
                        id: 'oh-vpstile-' + id + '-' + name + '-source',
                        obj: {
                          type: 'raster',
                          tiles: [tile],
                          bounds: bounds,
                          maxzoom: 26 }
                      };
                    }
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
                    // console.log('取得データ:', response.data);
                    // console.log(JSON.stringify(response.data, null, 2));

                    const name = response.data[0].name
                    const id = response.data[0].id
                    const url = response.data[0].url
                    const chiban = response.data[0].chiban
                    const length = response.data[0].length

                    const source = {
                      id: 'oh-chiban-' + id + '-' + name + '-source', obj: {
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
                        // 'fill-color': [
                        //   'case',
                        //   ['has', 'AzaName'],
                        //   'rgba(0,0,255,0.5)',
                        //   'rgba(0,0,0,0)'
                        // ],
                      },
                    }
                    const lineLayer = {
                      id: 'oh-chibanL-' + name + '-line-layer',
                      source: 'oh-chiban-' + id + '-' + name + '-source',
                      type: 'line',
                      "source-layer": "oh3",
                      paint: {
                        'line-color': 'blue',
                        'line-width': [
                          'interpolate',
                          ['linear'],
                          ['zoom'],
                          1, 0.1,
                          16, 2
                        ]
                      },
                    }
                    let minZoom
                    if (!length) {
                      minZoom = 17
                    } else if (length < 10000) {
                      minZoom = 0
                    } else {
                      minZoom = 17
                    }
                    // const labelLayer = {
                    //   id: 'oh-chibanL-' + name + '-label-layer',
                    //   type: "symbol",
                    //   source: 'oh-chiban-' + id + '-' + name + '-source',
                    //   "source-layer": "oh3",
                    //   'layout': {
                    //     'text-field': ['get', chiban],
                    //     'text-font': ['NotoSansJP-Regular'],
                    //   },
                    //   'paint': {
                    //     'text-color': 'navy',
                    //     'text-halo-color': 'rgba(255,255,255,1)',
                    //     'text-halo-width': 1.0,
                    //   },
                    //   'minzoom': minZoom
                    // }
                    const labelLayer = {
                      id: 'oh-chibanL-' + name + '-label-layer',
                      type: "symbol",
                      source: 'oh-chiban-' + id + '-' + name + '-source',
                      "source-layer": "oh3",
                      layout: {
                        'text-field': ['get', chiban],
                        'text-font': ['NotoSansJP-Regular'],
                        'text-offset': [
                          'case',
                          ['==', ['geometry-type'], 'Point'], ['literal', [0, 1.2]],  // ポイントは下にずらす
                          ['literal', [0, 0]]  // ポリゴンなどはそのまま
                        ]
                      },
                      paint: {
                        'text-color': 'navy',
                        'text-halo-color': 'rgba(255,255,255,1)',
                        'text-halo-width': 1.0,
                      },
                      minzoom: minZoom
                    };

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
                    v.layers = [polygonLayer,lineLayer,labelLayer,pointLayer,vertexLayer]
                    v.label = name;
                  }
                } catch (error) {
                  console.error('フェッチエラー:', error);
                }
              }

              if (v.id.includes('oh-pmtiles-')) {
                fetchFlg = true
                const layerId = v.id.split('-')[2];
                try {
                  const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtiles0SelectById.php', {
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
                    const label = response.data[0].label
                    const length = response.data[0].length

                    const source = {
                      id: 'oh-pmtiles-' + id + '-source', obj: {
                        type: 'vector',
                        url: "pmtiles://" + url
                      }
                    };
                    const polygonLayer = {
                      id: 'oh-pmtiles-' + id + '-layer',
                      type: 'fill',
                      source: 'oh-pmtiles-' + id + '-source',
                      "source-layer": 'oh3',
                      'paint': {
                        'fill-color': 'rgba(0,0,0,0)',
                      },
                    }
                    const lineLayer = {
                      id: 'oh-pmtiles-' + id + '-line-layer',
                      source: 'oh-pmtiles-' + id + '-source',
                      type: 'line',
                      "source-layer": "oh3",
                      paint: {
                        'line-color': 'blue',
                        'line-width': [
                          'interpolate',
                          ['linear'],
                          ['zoom'],
                          1, 0.1,
                          16, 2
                        ]
                      },
                    }
                    let minZoom
                    if (!length) {
                      minZoom = 17
                    } else if (length < 10000) {
                      minZoom = 0
                    } else {
                      minZoom = 17
                    }
                    const labelLayer = {
                      id: 'oh-pmtiles-' + id + '-label-layer',
                      type: "symbol",
                      source: 'oh-pmtiles-' + id + '-source',
                      "source-layer": "oh3",
                      layout: {
                        'text-field': ['get', label],
                        'text-offset': [
                          'case',
                          ['==', ['geometry-type'], 'Point'], ['literal', [0, 1.2]],  // ポイントは下にずらす
                          ['literal', [0, 0]]  // ポリゴンなどはそのまま
                        ]
                      },
                      paint: {
                        'text-color': 'black',
                        'text-halo-color': 'rgba(255,255,255,1)',
                        'text-halo-width': 1.0,
                      },
                    };

                    const pointLayer = {
                      id: 'oh-pmtiles-' + id + '-point-layer',
                      type: "circle",
                      source: 'oh-pmtiles-' + id + '-source',
                      "source-layer": "oh3",
                      filter: ["==", "$type", "Point"],
                      paint: {
                        'circle-color': 'rgba(0,0,0,1)',
                        'circle-radius': 8,
                        'circle-opacity': 1,
                        'circle-stroke-width': 1,
                        'circle-stroke-color': '#fff'
                      },
                    };
                    const vertexLayer = {
                      id: 'oh-pmtiles-' + id + '-vertex-layer',
                      type: "circle",
                      source: 'oh-pmtiles-' + id + '-source',
                      filter: ["==", "$type", "Polygon"],
                      "source-layer": "oh3",
                      paint: {
                        'circle-radius': [
                          'interpolate', ['linear'], ['zoom'],
                          15, 0,
                          18,0
                        ],
                        'circle-color': 'red',
                      }
                    };
                    v.sources = [source];
                    v.layers = [polygonLayer,lineLayer,labelLayer,pointLayer,vertexLayer]
                    v.label = name;
                  }
                } catch (error) {
                  console.error('フェッチエラー:', error);
                }
              }

            });
            return Promise.all(promises);
          }

          // console.log(params.slj.map01)

          async function fetchAllUserLayers() {
            await Promise.all([
              processUserLayers(params.slj.map01,'map01'),
              processUserLayers(params.slj.map02,'map02')
            ]);
            vm.s_selectedLayers = params.slj;
          }

          // 非同期関数を実行
          if (params.slj) fetchAllUserLayers();
          if (params.slj) {
            if (!fetchFlg) this.s_selectedLayers = params.slj
          }

          // this.s_selectedLayers.map01 = this.s_selectedLayers.map01.filter(layer => layer.id !== 'oh-konzyaku-layer')

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
          /**
           * テスト的に下記のdragendをiphoneのときに無効化
           */
          if (!this.isIphone) map.on('dragend', this.updatePermalink)

          map.on('zoomend', this.updatePermalink)
          // map.on('idle', this.updatePermalink)

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
              // console.log('Zoomed in - No action taken');
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
              // console.log('Bounds expanded or moved:', currentBounds);
              this.$store.state.osmFire = !this.$store.state.osmFire;
            }

            // 現在の範囲とズームレベルを保存
            previousBounds = currentBounds;
            previousZoom = currentZoom;
          };

          // デバウンス版の関数を作成（遅延を500msに設定）
          const debouncedHandleBoundsChange = debounce(handleBoundsChange, 500);

          // イベントリスナーにデバウンス関数を適用
          if (!this.isIphone) {
            map.on('dragend', debouncedHandleBoundsChange);
            map.on('zoomend', debouncedHandleBoundsChange);
          }

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
            const features = map.queryRenderedFeatures(e.point);
            const isOverTarget = features.some(f => f.layer.id !== 'zones-layer');
            if (isOverTarget) {
              map.getCanvas().classList.add('force-pointer');
            } else {
              map.getCanvas().classList.remove('force-pointer');
            }
          });
          //------------------------------------------------------------------------------------------------------------
          // ポップアップ
          map.on('click', (e) => {
            if (hitExcludedLayers(map, e.point)) return; // ← 除外レイヤーなら何もしない
            popup(e,map,mapName,this.s_map2Flg)
            // store.commit('setDrawDrawer', false)
            const lng = e.lngLat.lng;  // 経度
            const lat = e.lngLat.lat;  // 緯度
            if (store.state.mapillaryFlg) {
              /**
               * ちょっとわかりにくいがマピラリオンのときなにもないとろこを
               * クリックしてもなにもないことを表示するために必要
               */
              store.state.mapillaryFeature = null
              mapillaryCreate(lng, lat)
            }
          })
          map.on('mousemove', function (e) {
            mouseMoveForPopup(e,map)
          })

          //------------------------------------------------------------------------------------------------------------
          // // PLATEAU建物東京都23区
          // map.on('click', 'oh-plateau-tokyo23ku-layer', function (e) {
          //   // map.getCanvas().style.cursor = 'pointer'
          //   map.setPaintProperty(
          //       'oh-plateau-tokyo23ku-layer',
          //       'fill-extrusion-color',
          //       [
          //         'case',
          //         ['==', ['get', '建物ID'], e.features[0].properties['建物ID']],
          //         'rgba(255, 0, 0, 1)', // カーソルが当たったフィーチャーの色
          //         [
          //           "interpolate",
          //           ["linear"],
          //           ["get", "measuredHeight"],
          //           0, "#d9d9d9",       // 0m: グレー
          //           10, "#a6bddb",      // 10m: 明るいブルー
          //           30, "#74a9cf",      // 30m: 中間ブルー
          //           60, "#2b8cbe",      // 60m: 濃いブルー
          //           100, "#045a8d"      // 100m以上: 非常に濃いブルー
          //         ]
          //       ]
          //   )
          // })
          // map.on('click', function(e) {
          //   // クリック位置のoh-plateau-tokyo23ku-layerのフィーチャーを取得
          //   const features = map.queryRenderedFeatures(e.point, { layers: ['oh-plateau-tokyo23ku-layer'] });
          //   if (features.length === 0) {
          //     // フィーチャーが1つもない時だけ発動
          //     try {
          //       map.setPaintProperty(
          //           'oh-plateau-tokyo23ku-layer',
          //           'fill-extrusion-color',
          //           [
          //             "interpolate",
          //             ["linear"],
          //             ["get", "measuredHeight"],
          //             0, "#d9d9d9",       // 0m: グレー
          //             10, "#a6bddb",      // 10m: 明るいブルー
          //             30, "#74a9cf",      // 30m: 中間ブルー
          //             60, "#2b8cbe",      // 60m: 濃いブルー
          //             100, "#045a8d"      // 100m以上: 非常に濃いブルー
          //           ]
          //       )
          //     } catch (e) {
          //       console.log(e)
          //     }
          //   }
          // });
          // -----------------------------------------------------------------------------------------------------------
          let pitch = mapName === 'map01' ? params.pitch01 : params.pitch02 || 0
          pitch = isNaN(pitch) ? 0 : pitch
          if (pitch !== 0) {
            if (!this.s_selectedLayers[mapName].find(layer => {
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
              this.s_geojsonFile = file
              const fileName = file.name;
              this.s_gazoName = fileName.split('.')[0]
              const fileExtension = fileName.split('.').pop().toLowerCase();
              history(fileExtension + 'をDD',window.location.href)
              const reader = new FileReader();
              switch (fileExtension) {
                case 'kml':
                {
                  reader.onload = (event) => {
                    const parser = new DOMParser();
                    const kmlText = event.target.result
                    const kmlData = parser.parseFromString(kmlText, 'application/xml');
                    this.geojsonForDraw = kml(kmlData)
                    this.dialogForDraw = true
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
                  this.$store.state.tiffAndWorldFile = Array.from(e.dataTransfer.files);
                  if (files.length > 1) {
                    this.s_dialogForGeotiffApp = true
                  } else if (files.length === 1){
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
                    // alert('ワールドファイルが必要です。')
                    if (this.$store.state.userId) {
                      const reader = new FileReader();
                      reader.onload = evt => {
                        this.uploadedImageUrl = evt.target.result;
                        this.showFloatingImage = true;
                        this.s_gazoName = fileName.split('.')[0]
                        // alert('読み込み終了')
                      };
                      reader.readAsDataURL(file);
                    } else {
                      alert('ログイン専用機能です')
                    }
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
                    try {
                      async function aaa () {
                        if (vm.$store.state.userId) {
                          try {
                            vm.dialogForChibanzyOrDraw = true
                          } catch (e) {
                            alert('プロパティを読み込めませんでした。文字化けしていませんか？\n' + e)
                            console.log(e)
                          }
                        } else {
                          alert('この機能を利用するにはログインしてください')
                        }
                      }
                      aaa()
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
                      this.s_chibanzuPropaties = Object.keys(firstFeature.properties)
                      this.s_chibanzuGeojson = geojson
                      this.loadingSnackbar = false
                      this.s_loading = false
                      this.s_showChibanzuDialog = true
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
                case 'csv': {
                  const file = e.dataTransfer.files[0];
                  this.csvRecords = await parseCSV(file)
                  console.log(this.csvRecords)
                  // 緯度経度カラムの予想
                  this.csvLonLat = detectLatLonColumns(this.csvRecords);
                  if (this.csvLonLat) {
                    console.log(`予想：緯度カラムは${this.csvLonLat.lat}, 経度カラムは${this.csvLonLat.lon}`);
                  } else {
                    this.csvLonLat = null
                    console.log('緯度経度カラムは見つかりませんでした');
                  }
                  this.csvColumns = Object.keys(this.csvRecords[0])
                  console.log(this.csvColumns)
                  this.dialogForDrawCsv = true
                  break
                }
                case 'gpx':
                {
                  const file = e.dataTransfer.files[0];
                  const gpxText = await file.text();
                  const parser = new DOMParser();
                  const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
                  const gpxGeojson = gpx(gpxDoc);
                  gpxGeojson.features.forEach(feature => {
                    const id = String(Math.floor(10000 + Math.random() * 90000));
                    feature.properties['id'] = id
                    feature.properties['color'] = 'blue'
                    feature.properties['line-width'] = 5
                    feature.properties['arrow-type'] = 'none'
                  })
                  const drawGeojson = map.getSource(clickCircleSource.iD)._data
                  drawGeojson.features.push(...gpxGeojson.features);
                  map.getSource(clickCircleSource.iD).setData(drawGeojson);
                  this.$store.state.clickCircleGeojsonText = JSON.stringify(drawGeojson)
                  const bbox = turf.bbox(gpxGeojson);
                  map.fitBounds(bbox, {
                    padding: 40,
                    duration: 1000,
                    linear: false
                  });
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
            this.zoom = map.getZoom()
          });

          // -----------------------------------------------------------------------------------------------------------
          // マップ上でポリゴンをクリックしたときのイベントリスナー
          let highlightCounter = 0;
          map.on('click', 'oh-homusyo-2025-polygon', (e) => {
            if (this.s_isDraw) return
            if (this.$store.state.isDrawPoint) return;
            if (!this.$store.state.isRenzoku) return;
            if (map.getLayer('oh-point-layer')) return;
            if (e.features && e.features.length > 0) {
              // クリック座標からGeoJSONポイントを作る
              const point = turf.point([e.lngLat.lng, e.lngLat.lat]);
              // クリック点を実際に内包するポリゴンだけ抽出
              const insidePolygons = e.features.filter(f => turf.booleanPointInPolygon(point, f));

              // 最小面積のポリゴンを選択（優先はinsidePolygons→なければe.features全体から）
              let targetFeature = null;
              if (insidePolygons.length > 0) {
                targetFeature = insidePolygons.reduce((a, b) => turf.area(a) < turf.area(b) ? a : b);
              } else {
                targetFeature = e.features.reduce((a, b) => turf.area(a) < turf.area(b) ? a : b);
              }

              const targetId = `${targetFeature.properties['筆ID']}_${targetFeature.properties['地番']}`;
              console.log(targetId);
              console.log(this.$store.state.highlightedChibans);

              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                this.$store.state.highlightedChibans.delete(targetId);
                this.$store.state.lastHighlightedChiban = null
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
                this.$store.state.lastHighlightedChiban = targetId;
              }
              highlightSpecificFeatures2025(map, 'oh-homusyo-2025-polygon');
            }
          });



          // map.on('click', 'oh-homusyo-2025-polygon', (e) => {
          //   if (!this.$store.state.isRenzoku) return
          //   if (map.getLayer('oh-point-layer')) return
          //   if (e.features && e.features.length > 0) {
          //     // 最小面積のポリゴンを選ぶ
          //     let smallestFeature = e.features[0];
          //     let minArea = turf.area(e.features[0]);
          //     for (let feature of e.features) {
          //       const area = turf.area(feature);
          //       if (area < minArea) {
          //         smallestFeature = feature;
          //         minArea = area;
          //       }
          //     }
          //     const targetId = `${smallestFeature.properties['筆ID']}_${smallestFeature.properties['地番']}`;
          //     console.log(targetId);
          //     console.log(this.$store.state.highlightedChibans)
          //     if (this.$store.state.highlightedChibans.has(targetId)) {
          //       // すでに選択されている場合は解除
          //       this.$store.state.highlightedChibans.delete(targetId);
          //     } else {
          //       // 新しいIDを追加
          //       this.$store.state.highlightedChibans.add(targetId);
          //       // alert(targetId)
          //     }
          //     highlightSpecificFeatures2025(map,'oh-homusyo-2025-polygon');
          //   }
          // });
          map.on('click', 'oh-amx-a-fude', (e) => {
            if (!this.$store.state.isRenzoku) return
            if (map.getLayer('oh-point-layer')) return
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


          // console.log(this.$store.state.uploadedImage)

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
          'oh-chibanzu-姫路市','oh-chibanzu-仙台市','oh-chibanzu-高崎市','oh-chibanzu-旭川市',
          'oh-chibanzu-東村山市','oh-chibanzu-城陽市','oh-chibanzu-大山崎町','oh-chibanzu-川西市',
          'oh-chibanzu-香芝市','oh-chibanzu-直方市','oh-chibanzu-西粟倉村','oh-chibanzu-潮来市',
          'oh-chibanzu-甲府市','oh-chibanzu-名古屋市','oh-chibanzu-唐津市']
        layers.forEach(layer => {
          map.on('click', layer, (e) => {
            if (this.s_isDraw) return
            if (!this.$store.state.isRenzoku) return
            if (map.getLayer('oh-point-layer')) return
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
              let targetId
              if (smallestFeature.properties['id'] !== undefined) {
                targetId = `${smallestFeature.properties['id']}`;
              } else {
                targetId = `${smallestFeature.properties['oh3id']}`;
              }
              if (this.$store.state.highlightedChibans.has(targetId)) {
                // すでに選択されている場合は解除
                vm.$store.state.highlightedChibans.delete(targetId);
                store.commit('setRightDrawer', false)
              } else {
                // 新しいIDを追加
                this.$store.state.highlightedChibans.add(targetId);
                const lngLat = e.lngLat
                store.state.popupFeature = e.features[0]
                store.state.popupFeatureProperties = e.features[0].properties
                store.state.popupFeatureCoordinates = [lngLat.lng, lngLat.lat]
                async function address() {
                  const address = await LngLatToAddress(lngLat.lng, lngLat.lat);
                  store.state.rightDrawerTitle = address
                }
                address()
                store.commit('setChibanzuDrawer', false)
                store.commit('setRightDrawer', true)
              }
              highlightSpecificFeaturesCity(map,layer);
            }
          });
        });

        this.compass = new CompassControl({
          visible: false // ボタンを非表示にする
        })
        map.addControl(this.compass)
        map.on('moveend', () => {
          zenkokuChibanzuAddLayer(map,map.getZoom())
        })
        // zenkokuChibanzuAddLayer(map,map.getZoom()) // dialog.layer.vueの552行くらいに移動
        //on load終了----------------------------------------------------------------------------------------------------
      })
    }
  },
  created() {
    try { this.$store.state.isIframe = (window.self !== window.top); } catch (_) { this.$store.state.isIframe = true; }
    if (this.$store.state.isIframe && window.opener) this.$store.state.isIframe = false;
    this.$store.state.isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    this.$store.state.isAndroid = /android/i.test(userAgent);
    this.$store.state.isIOS = /iPad|iPhone|iPod/.test(userAgent);
    this.$store.state.isSmall1000 = window.innerWidth < 1000
    this.$store.state.isSmall500 = window.innerWidth < 500
    if (window.innerWidth < 500) this.$store.state.isUnder500 = true
    if (window.innerWidth < 500 ) this.fanMenuOffsetX = 0
    // this.updatePermalink をデフォルト 500ms のデバウンス版に差し替え
    this.updatePermalink = debounce(this.updatePermalink, 500)
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.onResize);
  },
  mounted() {

    // this.$store.dispatch('showFloatingWindow', 'mapillary-filter')


    const vm = this

    // if (this.$store.state.isIframe) {
    //   document.querySelectorAll('#left-top-div, #right-top-div').forEach(el => {
    //     el.style.display = 'none'
    //   })
    // }
    if (this.$store.state.isDrawFit) {
      this.waitForMap('map01', { loaded: true })
          .then(map => {
            // 非同期ロード対策で軽くリトライ
            const tryFit = (n = 6) => fitClickCircleAll() || (n > 0 && setTimeout(() => tryFit(n - 1), 500));
            tryFit();
          })
          .catch(console.warn);
    }

    document.querySelector('.fan-menu-rap').style.display = 'none'

    ensureOpenCvReady(() => {
      this.cvReady = true;
      console.log('OpenCV.js ready');
    });

    window.addEventListener('mousemove', this.onMouseMove)

    this.mapillarWidth = (window.innerWidth * 1) + 'px'
    this.mapillarHeight = (window.innerHeight * 1) + 'px'

    window.addEventListener('keydown', this.onKeydown);
    const checkUser = setInterval(() => {
      if (user.value && user.value.uid) {
        const uid = user.value.uid
        this.uid = uid
        this.$store.state.userId = uid
        // capture(uid, true)
        const map01 = store.state.map01
        if (map01) {
          // キーボード監視
          // document.addEventListener('keydown', this.onKeydown);
          // map が読込後にマウスムーブ監視
          // map01.on('mousemove', this.onPolygonMouseMove);
          // map01.on('mousemove', this.onLineMouseMove);

          capture(uid.value)
        } else {
          console.warn("地図がまだ初期化されていません")
        }
        clearInterval(checkUser) // UID を取得できたら監視を停止
      }
    }, 100)

    // 5分おきに実行
    this.intervalId = setInterval(() => {
      if (window.location.href !== vm.preUrl) {
        capture(this.uid,false)
        vm.historyCount++
      }
      vm.preUrl = window.location.href
    }, 5 * 60 * 1000)
    // -----------------------------------------------------------------------------

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
    glouplayer()
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
    if (!this.$store.state.isOffline) {
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/shortUrlSelect.php', {
        params: {
          urlid: urlid
        }
      }).then(function (response) {
        vm.dbparams = response.data
        vm.init()
        const url = new URL(window.location.href) // URLを取得
        window.history.replaceState(null, '', url.pathname + window.location.hash) //パラメータを削除 FB対策
      })
    } else {
      vm.init()
    }
    if (localStorage.getItem('resolution')) {
      this.s_resolution = localStorage.getItem('resolution')
      if (this.s_resolution > 24) this.s_resolution = 24
    }

    document.querySelector('#drawList').style.display = 'none'
  },
  watch: {
    tempLineCoordsGuide: {
      handler: function () {
        const length = dedupeCoords(this.tempLineCoordsGuide).length
        this.confirmBtnColor = 'info'
        if (this.s_isDrawPolygon) {
          if (length >= this.drawTool.minPolygonPoints) {
            this.confirmBtnColor = 'success'
          }
        } else if (this.s_isDrawLine) {
          if (length >= this.drawTool.minLinePoints) {
            this.confirmBtnColor = 'success'
          }
        }
      },
      deep: true
    },
    // tempLineCoordsGuide() {
    //   alert(888)
    //   if (this.s_isDrawPolygon) {
    //     if (this.tempLineCoordsGuide.length >= this.drawTool.minPolygonPoints) {
    //       this.confirmBtnColor = 'success'
    //     }
    //   } else if (this.s_isDrawLine) {
    //     if (this.tempLineCoordsGuide.length >= this.drawTool.minLinePoints) {
    //       this.confirmBtnColor = 'success'
    //     }
    //   }
    // },
    showDrawConfrim(value) {
      if (value && this.isSmall500) {
        this.drawFix(true)
      } else {
        this.drawFix(false)
      }
    },
    async s_is360Pic(value) {
      const map01 = this.$store.state.map01
      if (map01.getZoom() < 14) return
      if (value && map01.getLayer('oh-mapillary-images-highlight')) {
        this.$store.state.targetSeq = ''
        map01.setFilter('oh-mapillary-images-highlight', ['==', ['get', 'sequence_id'], this.$store.state.targetSeq]);
        const src = map01.getSource('mly-current-point');
        if (src && src.setData) {
          src.setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [] },
              properties: {}
            }]
          });
        }
        //
        await setFllter360(map01)
      } else {
        this.$store.state.filter360 = null
        this.$store.state.targetSeq = null
        map01.setFilter('oh-mapillary-images', this.$store.state.filter360)
        map01.setPaintProperty('oh-mapillary-images', 'circle-color', '#35AF6D');
        await setFllter360(map01)
      }
    },
    // s_zahyokei(value) {
    //   alert(value)
    // },
    // popupDialog(value) {
    //   if (value) {
    //     this.zIndex = getNextZIndex() + 2
    //   }
    // },
    isDraw(value) {
      this.toggleLDraw()
      if (!value) {
        const geojson = this.map01.getSource('click-circle-source')._data
        geojson.features.forEach(f => {
          delete f.properties.lassoSelected
        })
        this.s_isLassoSelected = false
        this.map01.getSource('click-circle-source').setData(geojson)
        this.$store.state.clickCircleGeojsonText = JSON.stringify(geojson)
        this.$store.state.updatePermalinkFire = !this.$store.state.updatePermalinkFire
      }
    },
    s_dialogForPicture() {
      this.dialogForPictureZindex = getNextZIndex()
    },
    drawFeature() {
      const borderRadius = this.drawFeature.properties.borderRadius ?? '10px'
      const containerSize = this.drawFeature.properties.containerSize ?? 100
      this.thumbnailType = {borderRadius, containerSize}
      this.containerColor = this.drawFeature.properties.containerColor ?? 'white'
    },
    s_isPrint (value) {
      const app = document.getElementById('app');
      if (!value) {
        const map00Div = document.getElementById('map00');
        map00Div.style.marginTop = '0px'
        app.style.overflow = 'hidden'
      } else {
        app.style.overflow = 'auto'
      }
      markaersRemove()
      markerAddAndRemove()
    },
    clickCircleGeojsonText (value) {

      if (!this.$store.state.isApplyingHistory) {
        pushSnapshotDebounced(value);
      }

      try {
        if (JSON.parse(value).features.filter(f => f.properties.id !== 'config').length > 1) {
          document.querySelector('#drawList').style.display = 'block'
        } else {
          document.querySelector('#drawList').style.display = 'none'
        }
      }catch (e) {
        document.querySelector('#drawList').style.display = 'none'
      }
      this.updatePermalink()
    },
    s_finishLineFire () {
      // あれ？これでよかったのか？
      this.finishLine()
    },
    gcpList: {
      deep: true,
      handler() {
        this.updateMapMarkers();
      }
    },
    // s_saveHistoryFire: debounce(function () {
    //   alert(999)
    //   this.saveHistory()
    // }, 300),
    s_saveHistoryFire () {
      this.saveHistory()
    },
    s_editEnabled (value) {
      const map01 = this.$store.state.map01
      if (value) {
        let geojsonText = this.$store.state.clickCircleGeojsonText
        if (!geojsonText) {
          geojsonText = this.$store.state.clickCircleGeojsonTextMyroom
          this.$store.state.clickCircleGeojsonText = this.$store.state.clickCircleGeojsonTextMyroom
        }
        if (geojsonText) {
          const geojson = JSON.parse(geojsonText)
          const vertexPointsGeojson = getAllVertexPoints(map01, geojson)
          vertexSource.obj.data = vertexPointsGeojson
          setAllMidpoints(map01, geojson)
        } else {
          // ここで watcher を抜ける
          // this.s_editEnabled = false
          return
        }
      } else {
        getAllVertexPoints(map01)
        setAllMidpoints(map01)
      }
      // ----------------------------------------------------------
      const vm = this
      updateDragHandles(vm.s_editEnabled)
    },
    // 配列で監視（いずれかが変化したら発動）
    s_isDrawAll() {
      // computedの結果を監視する形に
      if (this.s_isDrawAll) {
        // しばらく中止
        // this.startDraw();
      } else {
        this.endDraw();
      }
    },
    s_updatePermalinkFire () {
      try {
        this.updatePermalink()
      }catch (e) {
        console.log(e)
      }
    },
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
    s_loading3(val) {
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
  /*background-color: rgb(194,210,251);*/
  background: black;
  height: 100%;
  position: relative;
}
#map01 {
  border: #000 1px solid;
  height: 100%;
}
#map01 .v-overlay {
  background-color: transparent !important;
}

/*地球状態になったとき白くなる現象を下記で回避*/
#map01 .v-locale--is-ltr { background-color: transparent !important; }

/* src/css/embed.css */
html.oh3-embed { --oh3-bg: transparent; }
html.oh3-embed body { background: var(--oh3-bg); }

/* ヘッダー/フッター/浮遊パネル/デバッグUI 等を非表示（必要に応じてクラス名を調整）*/
html.oh3-embed #global-header,
html.oh3-embed #global-footer,
html.oh3-embed .floating-window:not(.allow-embed),
html.oh3-embed .right-click-menu,
html.oh3-embed .debug-panels {
  display: none !important;
}

/* マップを全面化 */
html.oh3-embed #map01 {
  position: fixed; inset: 0; width: 100vw !important; height: 100dvh !important;
}


#map02 {
  border: #000 1px solid;
  position:absolute;
}
.pointer {
  width: 15px;
  height: 15px;
  background-color: red;
  border-radius: 50%;
  border: #fff 1px solid;
  position: absolute;
  pointer-events: none;
  z-index: 10;
  display: none;
}
#iframe-div{
  position:absolute;
  top:10px;
  left:10px;
  z-index:3;
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
  z-index:3;
}
#right-top-div {
  position:absolute;
  top:10px;
  right:10px;
  z-index:3;
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
.current-position {
  position: absolute;
  top: 0px;
  left: -50px;
}
.watch-position {
  position: absolute;
  top: 60px;
  left: 0px;
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
  /*top: 240px;*/
  top: 120px;
  left: -50px;
}
.share-x {
  position: absolute;
  /*top: 240px;*/
  top: 300px;
  left: 0;
}
.draw {
  position: absolute;
  /*top: 300px;*/
  top: 180px;
  left: 0;
}
.draw-circle {
  position: absolute;
  top: 240px;
  left: 0;
}
.draw-point {
  position: absolute;
  top: 300px;
  left: 0;
}
/*.draw-fan {*/
/*  position: absolute;*/
/*  top: 255px;*/
/*  left: 0px;*/
/*}*/
/*@media (max-width: 720px) {*/
/*  .draw-fan {*/
/*    top: 0px;*/
/*  }*/
/*}*/
.printer {
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
  height:50px!important;
  margin-left:-25px;
  color: white;
  border-radius:8px;
}
.terrain-btn-down{
  position:absolute;
  bottom:4px;
  left:50%;
  padding:0;
  width: 50px;
  min-width: 50px;
  height:50px!important;
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
  height:50px!important;
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
  height:50px!important;
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
@keyframes pulse {
  0%, 100% { opacity: 1;   }
  50%      { opacity: 0.1; }
}
.pulse {
  position: absolute;
  bottom: 70px;
  z-index: 3;
  animation: pulse 3s ease-in-out infinite;
}
/* 横一列固定・折り返さず、はみ出したら横スクロール */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  position: relative;
  z-index: 2;
  flex-wrap: nowrap; /* 折り返さない */
  overflow: hidden;
  -webkit-overflow-scrolling: touch; /* iOSで慣性スクロール */
}
/* 子要素が縮まないようにする（等幅で並べる） */
.toolbar-row :is(.v-switch, .v-text-field) {
  flex: 0 0 auto;
}
.mapillary-qry-result {
  width: 150px;
  height: 40px;
  overflow: hidden;
}

#floating-buttons {
  width:270px;
  position: absolute;
  background: white;
  padding: 5px 5px 0 5px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  display: flex; /* 横並び */
  z-index: 10;
}

/*#floating-buttons button {*/
/*  margin: 5px;*/
/*  padding: 10px;*/
/*  border: none;*/
/*  border-radius: 50%;*/
/*  cursor: pointer;*/
/*}*/

/*#floating-buttons button.active {*/
/*  background: green;*/
/*  color: white;*/
/*  animation: pulse 1s infinite; !* 強調アニメ *!*/
/*}*/

.my-speed-dial {
  position: absolute;
  top: 100px;
  left: 100px;
  z-index: 99999999;
}


@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

</style>





<style>
label {
  cursor: pointer;
}
.maplibregl-canvas.force-pointer {
  cursor: pointer !important;
}
.maplibregl-canvas {
  cursor: default !important;
}
:root {
  --main-color: rgb(50,101,186);
  /*--main-color: #f17ecd;*/
}
v-btn, .button {
  background-color: var(--main-color)!important;
}

html, body {
  overscroll-behavior: none;
  overflow: hidden;
  touch-action: none;
  -webkit-overflow-scrolling: touch;
  height: 100%;
}
#app {
  height: 100%; /* 親要素が100%の高さを持つ */
  overflow: hidden;
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
  background-color: var(--main-color);
  color: white;
  border-radius:8px;
}
.maplibregl-popup {
  z-index: 3;
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
  background-color: var(--main-color);
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
  font-size: 10px !important;
  padding: 2px 6px !important;
  min-width: 24px !important;
  /*height: 24px !important;*/
  line-height: 24px !important;
  margin-bottom: 10px !important;
}
.tiny-btn2 {
  font-size: 10px !important;
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

.mapillary-attribution-container {
  display: none!important;
}

.mapillary-container,
.mapillary-container2 {
  position: relative;
  overflow: hidden;
  z-index: 10; /* 他の要素に埋もれてないか確認 */
}

.mapillary-viewer {
  background-color: white;
}

.oh-cool-input {
  padding: 0.6em 1em;
  border: 1px solid #2979ff;
  border-radius: 9px;
  outline: none;
  font-size: 1.1em;
  background: #f4f8ff;
  color: #18365a;
  transition: border 0.2s, box-shadow 0.2s, background 0.2s;
  box-shadow: 0 2px 8px 0 rgba(41, 121, 255, 0.08);
}
.oh-cool-input:focus {
  /*border: 2px solid #1565c0;*/
  background: #e3f2fd;
  /*box-shadow: 0 4px 16px 0 rgba(41, 121, 255, 0.15);*/
}
.oh-cool-input::placeholder {
  color: #90caf9;
  letter-spacing: 0.05em;
}

/*.maplibregl-popup-content {*/
/*  box-shadow: 0 6px 24px rgba(0,0,0,0.24), 0 1.5px 4px rgba(0,0,0,0.12);*/
/*  border-radius: 12px;*/
/*}*/

.maplibregl-popup-content {
  box-shadow: 0 10px 32px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.18);
  border-radius: 8px;
  border: none;
}

.maplibregl-popup-tip {
  /* 吹き出し部分にも薄く影をつける */
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
}

.circle-list {
  display: flex;
  gap: 8px; /* 丸同士の間隔 */
  margin: 0px;
  overflow: hidden;
}
/*.circle {*/
/*  width: 25px;*/
/*  height: 25px;*/
/*  border-radius: 50%;*/
/*  display: inline-block;*/
/*  cursor: pointer;*/
/*  transition: box-shadow 0.12s, transform 0.07s;*/
/*  box-shadow: 0 2px 5px rgba(0,0,0,0.08);*/
/*  outline: none;*/
/*}*/
.circle {
  /* ← ここを変更 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;/*元は25px*/
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  transition: box-shadow 0.12s, transform 0.07s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.08);
  outline: none;
  /* 文字色やサイズを調整 */
  color: white;
  font-size: 14px;
  font-weight: bold;
}
.circle.red   { background: red; }
.circle.blue  { background: blue; }
.circle.green { background: green; }
.circle.orange { background: orange; }
.circle.black { background: black; }
.circle.hotpink { background: hotpink; }
.circle.yellow { background: yellow; }
.circle.transparent { background: rgba(0,0,0,0.1); }

/* ハイライト: クリック時・Tab選択時・ホバー時 */
.circle:active,
.circle:focus-visible {
  box-shadow: 0 0 0 3px rgba(255,255,255,0.8), 0 1px 2px rgba(0,0,0,0.15);
  transform: scale(0.90) translateY(1px);
  /* 軽く沈み込む */
}
.circle:hover {
  box-shadow: 0 0 0 6px rgba(200,200,200,0.18), 0 2px 6px rgba(0,0,0,0.13);
  /* 一瞬明るく */
}
.oh-cool-input-number {
  /*padding: 0.4em 0.8em;*/
  padding: 0em 0.2em 0 0.6em;
  border: 1px solid #2979ff;
  border-radius: 8px;
  outline: none;
  font-size: 1em;
  background: #f4f8ff;
  color: #18365a;
  transition: border 0.2s, box-shadow 0.2s, background 0.2s;
  box-shadow: 0 1px 4px rgba(41,121,255,0.08);
  width: 5em;
  /* 数値入力矢印を右寄せで少し小さく */
  /* ChromeやSafari用 */
  -webkit-appearance: none;
  appearance: textfield;
}
/*.oh-cool-input-number:focus {*/
/*  border: 2px solid #1565c0;*/
/*  background: #e3f2fd;*/
/*  box-shadow: 0 2px 8px rgba(41,121,255,0.13);*/
/*}*/
.oh-cool-input-number::placeholder {
  color: #90caf9;
  letter-spacing: 0.04em;
}
.oh-cool-select {
  padding: 0 8px;
  border: 1px solid #2979ff;
  border-radius: 8px;
  outline: none;
  font-size: 1em;
  background: #f4f8ff;
  color: #18365a;
  transition: border 0.2s, box-shadow 0.2s, background 0.2s;
  box-shadow: 0 1px 4px rgba(41,121,255,0.08);
  width: 8em; /* 適宜調整 */
  appearance: none;
  /* 下矢印を消したい場合は独自アイコンを使ってもOK */
}
.oh-cool-select:focus {
  /*border: 2px solid #1565c0;*/
  background: #e3f2fd;
  /*box-shadow: 0 2px 8px rgba(41,121,255,0.13);*/
}

/*!* input[type=number] のデフォルト矢印（上下ボタン）非表示（Chrome, Edge, Safari） *!*/
/*.oh-cool-input-number::-webkit-inner-spin-button,*/
/*.oh-cool-input-number::-webkit-outer-spin-button {*/
/*  -webkit-appearance: none;*/
/*  margin: 0;*/
/*}*/
/*!* Firefox用 *!*/
/*.oh-cool-input-number[type=number] {*/
/*  -moz-appearance: textfield;*/
/*}*/

/* 半透明ドット */
.dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(100,100,100,0.2);
  vertical-align: middle;
  cursor: pointer;
  /* アニメや影も追加可 */
}

.print-title {
  position: absolute;
  top: 30px;
  width: 100%;
  text-align: center;
  z-index: 2;
  font-size: 30px;
  /* 背景は何も指定しない＝透明 */
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.print-title-bg {
  display: inline-block;
  background: rgba(255,255,255,0.7);        /* ← 文字部分だけ白背景 */
  padding: 0 20px 0 20px;
  border-radius: 8px;      /* 角を丸く（任意） */
  line-height: 1.3;        /* 文字が複数行なら */
  cursor: pointer;
  pointer-events: auto;
}
@media (max-width: 500px) {
  .print-title{
    top: 60px;
  }
}
.print-buttons {
  position: absolute;
  left:5px;
  top: 10px;
  z-index: 1;
}
.features-rotate-div {
  position: absolute;
  top: 70px;
  left: 50%;
  text-align: center;
  transform: translateX(-50%);
  width: 200px;
  padding: 20px 0 10px 0;
  background-color: #ffffff;
  /* 浮いた感じのシャドウ */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  z-index: 1;
}
.features-rotate-div-close {
  position: absolute;
  top: 0px;
  right: 6px;
  cursor: pointer;
}
.features-rotate-div-close:hover {
  color: red;
}
.map-radio {
  position: absolute;
  z-index: 2;
  left: calc(50% - 75px);
}
.map-radio div {
  margin: 0px!important;
}
@media print {
  .print-buttons {
    display: none
  }
}
@media print {
  .maplibregl-ctrl-attrib {
    background: transparent !important;
    box-shadow: none !important;
    color: #888 !important;      /* 文字も薄く */
    border: none !important;
    opacity: 0.5 !important;     /* うるささ軽減 */
  }
  .maplibregl-ctrl-attrib-button{
    display: none !important;
  }
  .terrain-btn-span {
    display: none;
  }
  #terrain-btn-div-map01 {
    display: none;
  }
  .sub-btns {
    display: none;
  }
  #print-div {
    display: none!important;
  }
  .features-rotate-div {
    display: none;
  }
  .map-radio div {
    display: none!important;
  }
}
.draw-indicator {
  position: fixed;
  width: 12px;
  height: 12px;
  background: deeppink;
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -20%);
  transition: none; /* 遅延ゼロ */
  box-shadow: 0 0 8px #fff;
}
.drawing-finish-div {
  position: absolute;
  top: 200px;
  left: 200px;
  z-index: 3;
}

.tooltip-wrapper[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: -1.8em;
  left: 50%;
  transform: translateX(-50%);
  /*background: var(--main-color);*/
  background: black;
  color: white;
  font-size: 10px;
  /*padding: 2px 6px;*/
  border-radius: 3px;
  white-space: nowrap;
  z-index: 9999;
  padding: 2px 10px 2px 10px;
}

.keyword-item {
  font-size: 18px;
  padding: 4px;
  cursor: pointer;
  border-bottom: 1px solid #ccc;
  transition: background-color 0.2s;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.keyword-item:hover {
  background-color: #e0f0ff;
}

/*.maplibregl-popup-content {*/
/*  font-size: 16px;*/
/*  max-width: 90vw;*/
/*  max-height: 80vh;*/
/*  overflow-y: auto;*/
/*  border-radius: 12px;*/
/*}*/



/*.image-marker {*/
/*  position: absolute;*/
/*  background: red;*/
/*  color: white;*/
/*  border-radius: 50%;*/
/*  width: 20px;*/
/*  height: 20px;*/
/*  text-align: center;*/
/*  line-height: 20px;*/
/*  font-size: 12px;*/
/*  pointer-events: none;*/
/*  box-shadow: 0 0 2px rgba(0,0,0,0.6);*/
/*  z-index: 9999;*/
/*}*/
.image-marker {
  position: absolute;
  background: red;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  text-align: center;
  line-height: 20px;
  font-size: 12px;
  font-weight: bold;
  cursor: move;
  z-index: 999;
}

#warp-canvas {
  position: absolute;
  top: 0;
  left: 0;
  /*background: rgba(255, 0, 0, 0.3); !* ← 目立つ赤で確認用 *!*/
  z-index: 2; /* マーカーより上に出したいとき調整 */
  pointer-events: none; /* マーカークリックなどを通す */
}

.compassDiv {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 40px;
  height: 40px;
  pointer-events: none;
  z-index: 1;
}

.scale-ratio {
  position: absolute;
  bottom: 35px;
  left: 6px;
  /*background: white;*/
  padding: 4px 8px;
  font-size: 14px;
  /*border: 1px solid #ccc;*/
  /*border-radius: 4px;*/
  pointer-events: none;
  z-index: 1;
  text-shadow:
      -1px -1px 0 #ffffff,
      1px -1px 0 #ffffff,
      -1px  1px 0 #ffffff,
      1px  1px 0 #ffffff;
}
.fan-menu-0 {
  position: absolute;
  top:322px;
  right:0px;
  z-index: 3
}
.fan-menu-rap {
  position: absolute;
  top:10px!important;
  right:12px;
  z-index: 3
}
.fan-menu-print {
  /*position: absolute;*/
  /*top:0px;*/
  /*right:0px;*/
  /*z-index: 3*/
}
.print-print {
  position: absolute!important;
  top: 60px!important;
  left: 0!important;
}
.print-config {
  position: absolute!important;
  top: 120px!important;
  left: 0!important;
}
.print-png {
  position: absolute!important;
  top: 180px!important;
  left: 0px!important;
}
.fan-menu {
  position: absolute!important;
  top:240px;
  right:0px;
  z-index: 3
}
.v-main {
  background-color: black;
}
.sub-btn {
  width: 40px !important;
  height: 40px !important;
}
@media (max-width: 450px) {
  .maplibregl-popup {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    z-index: 9999;
  }
  .maplibregl-popup-tip {
    display: none !important; /* 吹き出し非表示でモーダル感UP */
  }
  .maplibregl-popup-content {
    width: 400px !important;         /* ★固定幅 */
    max-width: 90vw !important;      /* 必要なら調整 */
    min-width: 300px !important;     /* 最小幅も確保 */
    overflow-y: auto;

    /* ★ 位置調整 */
    position: relative;
    left: 50%;
    transform: translateX(-50%);
  }
  textarea,
  input {
    font-size: 16px !important;
  }
  .sub-btn {
    width: 38px !important;
    height: 38px !important;
  }
}
.tiny-icon-btn {
  width: 30px!important;
  height:30px!important;
  padding: 0px!important;
  margin:  0px!important;
}
.v-overlay:not(.exclude-overlay)  {
  z-index: 999999999 !important;
}
@media (max-width: 500px) {
  .v-overlay {
    z-index: 999999999 !important;
  }
}
/*注意。副作用があるかもしれない。*/
.maplibregl-canvas.force-pointer {
  cursor: pointer !important;
}
.rotate-btn {
  display: flex;
  height: 60px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #444;
  font-size: 30px;
}

.rotate-btn:hover {
  color: #1976d2; /* ホバー時に青く */
}

/* iOS でスムースにスクロールできるように */
.scrollable-menu {
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
}

.v-navigation-drawer{
  /* iOS での安定化: 不要な backdrop-filter は避ける */
  backdrop-filter: none !important;
}
.v-navigation-drawer__content{
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.my-popup{
  overflow: hidden;
}

.my-snackbar .v-snackbar__wrapper {
  background-color: color-mix(in srgb, var(--main-color) 70%, black)!important;
  margin-top: 60px;
}

/* ===== v-select風スタイル ===== */
.vlike{
  display:inline-flex;
  flex-direction:column;
  gap:4px;
  font-size:14px;
  min-width:220px;
  width: 100%;
  position:relative;
  margin-bottom: 25px;
}
.vlike__text{
  color:var(--v-theme-on-surface, #1f1f1f);
  opacity:.7;
  padding-left:4px;
}
.vlike__control{
  -webkit-appearance:none;
  appearance:none;
  width:100%;
  height:55px;
  line-height:55px;
  padding:0 40px 0 12px;
  border-radius:4px;border:1px solid rgba(0,0,0,.12);
  background:var(--v-theme-surface,#fff);
  color:var(--v-theme-on-surface,#1f1f1f);
  outline:none;
  box-shadow:none;
  transition:border-color .15s,box-shadow .15s,background .15s;
}
.vlike__control:hover{
  border-color:rgba(0,0,0,.22)
}
.vlike__control:focus{
  border-color:var(--v-theme-primary,#1976d2);
  box-shadow:0 0 0 2px color-mix(in srgb, var(--v-theme-primary,#1976d2) 25%, transparent);
}
/* プレースホルダー時の薄色表示 */
.vlike__control[data-empty="true"]{
  color:rgba(0,0,0,.38)
}
/* 無効時 */
.vlike__control:disabled{
  background:var(--v-theme-surface-variant,#f6f6f6);
  color:rgba(0,0,0,.38);
  border-color:rgba(0,0,0,.12);
  cursor:not-allowed
}
/* エラー枠 */
.is-error .vlike__control{
  border-color:var(--v-theme-error,#d32f2f);
  box-shadow:0 0 0 2px color-mix(in srgb, var(--v-theme-error,#d32f2f) 20%, transparent);
}
/* 矢印（純CSS） */
.vlike::after{
  content:"";position:absolute;right:12px;top:28px;transform:translateY(-50%);
  border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid currentColor;
  opacity:.54;pointer-events:none
}
/* ヘルパー / メッセージ */
.vlike__hint{margin-top:4px;font-size:12px;line-height:1.2;color:rgba(0,0,0,.6)}
.vlike__message{margin-top:4px;font-size:12px;line-height:1.2}
.vlike__message--error{color:var(--v-theme-error,#d32f2f)}
/* 密度を下げたい場合 */
.vlike--dense .vlike__control{height:32px;line-height:32px}

/* ===== 追加・上書き（フローティングラベル） ===== */
.vlike--floating {
  position: relative;
  padding-top: 6px;
}

/* ラベルをボーダーに被せる */
.vlike--floating .vlike__text{
  position: absolute;
  top: 8px;             /* ボーダーの上に少し出す */
  left: 12px;
  font-size: 12px;
  line-height: 1;
  padding: 0 6px;
  border-radius: 4px;
  background: white; /* 背景でボーダーを“マスク” */
  color: rgba(0,0,0,.6);
  pointer-events: none;  /* クリックを邪魔しない */
  text-align: left;
  z-index: 10000;
}

/* フォーカス時はプライマリ色で強調 */
.vlike--floating:focus-within .vlike__text{
  color: var(--v-theme-primary, #1976d2);
}

/* エラー時はエラー色 */
.is-error.vlike--floating .vlike__text{
  color: var(--v-theme-error, #d32f2f);
}

/* コントロールは少し下げて余白を作る */
.vlike--floating .vlike__control{
  margin-top: 6px;
}

/* ↓矢印位置の微調整（必要なら） */
.vlike--floating::after{
  top: 28px; /* コントロール中央に来るように調整 */
}

.media-picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;       /* 一行に収める */
  padding-bottom: 20px;
}

/* ネイティブ input は画面に出さない（「ファイルを選択」を見せない） */
.sr-only {
  position: absolute;
  left: -9999px;
}

.camera-btn {
  margin-top: 10px;
  margin-right: 10px;
}

/* v-file-input は余白を食い過ぎないように */
.library-input,
.w-full {
  flex: 1 1 auto;          /* 残り幅にフィット */
  min-width: 0;            /* 折り返し防止 */
}

.exclude-overlay .v-input__prepend {
  display: none;
}

.dialog-close {
  position: absolute;
  right:5px;
  font-size: 40px;
  cursor: pointer;
}
.dialog-close:hover {
  color: red;
}
/*.v-virtual-scroll__item:first-child {*/
/*  height: 0 !important;*/
/*  margin: 0 !important;*/
/*  padding: 0 !important;*/
/*  overflow: hidden;*/
/*}*/

@media (prefers-reduced-motion: reduce) {
  .point-info-drawer .v-navigation-drawer{ transition: none !important; }
}
@media (max-width: 720px) {
  /*.fan-menu-rap {*/
  /*  top:174px;*/
  /*}*/
  .fan-menu-0 {
    top:280px;
  }
}
</style>