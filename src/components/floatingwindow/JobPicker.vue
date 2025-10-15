<template>
  <!-- 親の FloatingWindow 内にそのまま置く想定。高さ伝搬の起点だけ確保 -->
  <div class="fw-fit" @mousedown.stop @pointerdown.stop @touchstart.stop>
    <v-card class="fw-card">
      <!-- 操作行 -->
      <div class="d-flex justify-end px-4 pt-1"
           style="gap:6px;
           opacity:1;
           margin-top:10px;
           border-bottom:1px solid rgba(0,0,0,.08);"
      >

        <v-btn
            color="primary"
            variant="flat"
            density="comfortable"
            rounded="xl"
            class="font-weight-bold"
            :disabled="showJobListOnly"
            @click="showJobListOnly = true"
        >
          ジョブ一覧
        </v-btn>

        <v-btn
            size="small"
            variant="outlined"
            :disabled="disabledForSokuiCalc"
            @click="downloadCsvForSokui"
        >
          CSV
        </v-btn>

        <v-btn
            size="small"
            variant="outlined"
            :disabled="disabledForSokuiCalc"
            @click.stop="downloadSimaForSokui"
        >
          SIMA
        </v-btn>

        <v-btn
            size="small"
            color="primary"
            variant="flat"
            class="font-weight-bold pulse-once"
            :class="{ 'pulse-anim': !kansokuRunning && !torokuBusy }"
            :disabled="disabledForSokuiCalc"
            @click.stop="startTorokuHere"
        >
          &nbsp;測&nbsp;位&nbsp;
        </v-btn>

        <v-btn
            icon
            size="x-small"
            variant="text"
            class="mr-1"
            @click.stop="configDialog.open = true"
        >
          <v-icon size="20">mdi-dots-vertical</v-icon>
        </v-btn>

      </div>

      <!-- ヘッダー：ジョブ名インライン編集 -->
      <v-card-title class="d-flex align-center text-h6">
        <span v-if="!currentJobName">ジョブ選択</span>

        <div v-else class="name-edit-wrap"
             @mouseenter="hoverJobName = true"
             @mouseleave="hoverJobName = false">
          ジョブ:
          <template v-if="!editingJobName">
            <span class="editable-label ml-1" @click="startEditJobName">
              {{ currentJobName }}
              <v-icon x-small class="ml-1" v-show="hoverJobName">mdi-pencil</v-icon>
            </span>
          </template>
          <template v-else>
            <v-text-field
                v-model="tempJobName"
                density="compact"
                variant="outlined"
                hide-details
                autofocus
                class="name-input-70"
                @change="commitJobName"
                @keydown.esc.stop="cancelJobNameEdit"
                @keydown.left.stop
                @keydown.right.stop
                @blur="commitJobName"
            />
          </template>
        </div>
      </v-card-title>

      <v-divider thickness="2" />

      <!-- 本文 -->
      <v-card-text class="fw-body">
        <!-- ========== ジョブ一覧画面 ========== -->
        <template v-if="showJobListOnly">
          <!-- 新規ジョブ -->
          <div class="mb-4">
            <div class="text-caption mb-2">新規ジョブを作成</div>
            <div class="d-flex ga-2">
              <v-text-field
                  v-model.trim="jobName"
                  label="ジョブ名"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="flex-1-1 py-0 my-0"
                  style="--v-input-control-height: 30px;"
                  @keydown.left.stop
                  @keydown.right.stop
              />
              <v-btn color="primary" :disabled="!canCreateJob" @click="createNewJob">作成</v-btn>
            </div>
            <div v-if="jobNameError" class="text-error text-caption mt-1">{{ jobNameError }}</div>
          </div>

          <v-divider thickness="2" class="my-3" />

          <!-- 既存ジョブ一覧 -->
          <div class="section-grow">
            <div class="text-caption mb-2">既存のジョブ</div>
            <div class="list-pane">
              <v-list density="compact" nav>
                <v-list-item
                    v-for="job in jobList"
                    :key="job.id"
                    :ripple="true"
                    @click="pickExistingJob(job); showJobListOnly = false"
                >
                  <template #title>
                    <div class="job-title-tight">
                      <div class="job-title__name text-truncate">{{ job.name }}</div>
                    </div>
                  </template>
                  <template #subtitle>
                    <div class="job-title__note text-truncate" :title="job.note">
                      &nbsp;&nbsp;{{ job.note }}
                    </div>
                  </template>
                  <template #append>
                    <v-chip
                        v-if="Number(job.count) > 0"
                        size="small"
                        variant="flat"
                        color="red"
                        class="rounded-pill mr-1"
                        style="min-width:22px; height:22px; padding:0 6px; display:inline-flex; align-items:center; justify-content:center; font-weight:700;"
                    >{{ job.count }}</v-chip>

                    <!-- 編集（縦三点） -->
                    <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        aria-label="ジョブを編集"
                        class="mr-1"
                        @click.stop="openJobEditDialog(job)"
                    >
                      <v-icon size="20">mdi-dots-vertical</v-icon>
                    </v-btn>

                    <!-- 削除 -->
                    <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        aria-label="ジョブを削除"
                        @click.stop="deleteJob(job)"
                    >
                      <v-icon size="22">mdi-close</v-icon>
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </div>
        </template>

        <!-- ========== ポイント一覧画面 ========== -->
        <template v-else>
          <div class="section-grow">
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="text-caption">
                {{ (pointsForCurrentJob && pointsForCurrentJob.length) || 0 }}地点計測済み
              </div>
            </div>

            <div class="list-pane">
              <v-list density="compact" nav>
                <v-list-item
                    v-for="pt in pointsForCurrentJob"
                    :key="pt.point_id"
                    @click.stop="panToPointXY(pt)"
                >
                  <template #title>
                    <div class="name-edit-wrap"
                         @mouseenter="hoverPointId = pt.point_id"
                         @mouseleave="hoverPointId = null">
                      {{ pt.point_name }}
                    </div>
                  </template>
                  <template #subtitle>
                    <span v-if="Number.isFinite(+pt.x_north) && Number.isFinite(+pt.y_east)">
                      {{ pt.address }}&nbsp;X={{ fmtXY(pt.x_north) }}, Y={{ fmtXY(pt.y_east) }}
                    </span>
                  </template>
                  <template #append>
                    <v-btn icon size="small" variant="text" class="ml-2" @click.stop="openPointEditDialog(pt)">
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                    <v-btn icon size="x-small" variant="text" aria-label="ポイントを削除" @click.stop="deletePoint(pt)">
                      <v-icon size="22">mdi-trash-can-outline</v-icon>
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </div>
        </template>
      </v-card-text>
    </v-card>

    <!-- ジョブ編集ダイアログ -->
    <v-dialog v-model="jobEditDialog.open" max-width="520">
      <v-card>
        <v-card-title class="text-h6">ジョブを編集</v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-text-field
              v-model.trim="jobEditDialog.name"
              label="ジョブ名"
              variant="outlined"
              hide-details="auto"
              autofocus
              @keydown.stop
              @keydown.left.stop
              @keydown.right.stop
              @keydown.up.stop
              @keydown.down.stop
          />
          <v-textarea
              v-model="jobEditDialog.note"
              variant="outlined"
              hide-details="auto"
              auto-grow
              rows="3"
              max-rows="8"
              class="mt-3"
              placeholder="このジョブのメモ（任意）"
              @keydown.stop
              @keydown.left.stop
              @keydown.right.stop
              @keydown.up.stop
              @keydown.down.stop
          />
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeJobEditDialog" :disabled="jobEditDialog.saving">キャンセル</v-btn>
          <v-btn color="primary" :loading="jobEditDialog.saving" @click="saveJobEditDialog">更新</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ポイント編集ダイアログ -->
    <v-dialog v-model="pointEditDialog.open" max-width="520">
      <v-card>
        <v-card-title class="text-h6">ポイントを編集</v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-text-field
              v-model.trim="pointEditDialog.name"
              label="点名"
              variant="outlined"
              hide-details="auto"
              autofocus
              @keydown.stop
              @keydown.left.stop
              @keydown.right.stop
              @keydown.up.stop
              @keydown.down.stop
          />
          <v-textarea
              v-model="pointEditDialog.address"
              variant="outlined"
              hide-details="auto"
              auto-grow
              rows="3"
              max-rows="8"
              class="mt-3"
              placeholder="このポイントの所在"
              @keydown.stop
              @keydown.left.stop
              @keydown.right.stop
              @keydown.up.stop
              @keydown.down.stop
          />
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closePointEditDialog" :disabled="pointEditDialog.saving">キャンセル</v-btn>
          <v-btn color="primary" :loading="pointEditDialog.saving" :disabled="!canSavePoint" @click="savePointEditDialog">更新</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- コンフィグダイアログ -->
    <v-dialog v-model="configDialog.open" max-width="520">
      <v-card>
        <v-card-title class="text-h6">設定</v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-switch
              :model-value="autoCloseJobPicker"
              color="primary"
              density="compact"
              hide-details
              @update:model-value="autoCloseJobPicker = !autoCloseJobPicker"
          >
            <template #label>
              <span style="font-size:13px; line-height:1.1;">自動クローズ</span>
            </template>
          </v-switch>
          <v-switch
              v-model="tutorialShow"
              color="primary"
              density="compact"
              hide-details
          >
            <template #label>
              <span style="font-size:13px; line-height:1.1;">チュートリアル表示</span>
            </template>
          </v-switch>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeConfigDialog">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- メディアノートダイアログ -->
    <MediaNoteDialog
        :point-id="lastPointId"
        v-model="mediaDlg"
        @save="onMediaSave"
    />

    <!-- 測位  -->
    <v-dialog class='toroku-div' v-model="dialogForToroku" max-width="850px" :retain-focus="false" :persistent="kansokuPhase === 'await' || kansokuRunning">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>{{ currentJobName }}</span>
          <v-spacer />
          <v-chip
              v-if="kansokuAverages?.n === kansokuCount"
              color="red"
              variant="flat"
              size="small"
              class="font-weight-bold"
          >
            測位終了
          </v-chip>
        </v-card-title>

        <v-card-text>
          <div class="oh3-grid-4col">
            <!-- a: 点名（100%） -->
            <v-text-field
                v-model="tenmei"
                label="点名"
                variant="outlined"
                density="compact"
                hide-details="auto"
                clearable
                class="oh3-col-flex g-a"
                :error-messages="tenmeiError"
                @update:modelValue="handleTenmeiInput"
                :disabled="kansokuRunning"
            />

            <!-- b: 測位回数（100%） -->
            <v-select
                :menu-props="{
                    maxHeight: '300px',
                    overflow: 'scroll',
                    contentClass: 'scrollable-menu elevation-8'
                  }"
                v-model="kansokuCount"
                :items="kansokuItems"
                label="測位回数"
                density="compact"
                variant="outlined"
                hide-details="auto"
                class="oh3-col-fixed g-b"
                :disabled="kansokuRunning"
            />

            <!-- c: 間隔（50%） -->
            <v-text-field
                v-model.number="sampleIntervalSec"
                type="number"
                label="間隔（秒）"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="oh3-col-fixed g-c"
                :step="0.1" :min="1.0" :max="60"
                :disabled="kansokuRunning"
            />

            <!-- d: アンテナ高（50%） -->
            <v-text-field
                v-model.number="offsetCm"
                type="number"
                label="アンテナ高（m）"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="oh3-col-fixed g-d"
                :step="0.01" :min="0.00" :max="300"
                :disabled="kansokuRunning"
            />
          </div>

          <!-- ボタン行：右寄せ＆広めの間隔 -->
          <div class="d-flex align-center flex-wrap justify-start ga-4 mt-3">
            <v-btn
                @click="kansokuStart"
                :disabled="!canStartKansoku"
                :title="startHint"
                :loading="kansokuRunning"
            >
              測位開始
            </v-btn>

            <v-btn
                v-if="kansokuRunning && [86400, 1000, 100, 50].includes(Number(kansokuCount))"
                variant="outlined"
                color="warning"
                @click="cancelKansoku"
            >
              測位停止
            </v-btn>
            <div v-if="kansokuPhase === 'await'" class="d-flex ga-3">
              <v-btn color="primary" @click="onClickSaveObservation">保存</v-btn>
              <v-btn variant="outlined" color="error" @click="onClickDiscardObservation">破棄</v-btn>
            </div>
          </div>

          <div
              class="kansoku-list"
              v-stick-bottom.smooth="{ threshold: 40 }"
              style="height:180px; overflow-y:auto; overflow-x:auto; border:1px solid var(--v-theme-outline); border-radius:8px; padding:8px; margin:12px 0;"
          >
            <div v-if="!kansokuCsvRows || kansokuCsvRows.length <= 1" style="opacity:.6; white-space:nowrap;"></div>

            <div
                v-else
                v-for="(row, idx) in kansokuCsvRows.slice(1)"
                :key="idx"
                :style="{
                    fontFamily: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace`,
                    fontSize: '12px',
                    lineHeight: '1.6',
                    padding: '2px 8px',
                    borderBottom: '1px dashed rgba(255,255,255,.08)',
                    backgroundColor: idx % 2 === 0 ? '#f7f7f7' : '#ffffff',
                    whiteSpace: 'nowrap'
                  }"
            >
          <span :style="{ color: row[7] === 'RTK級' ? '#16a34a' : undefined, fontWeight: row[7] === 'RTK級' ? '600' : undefined }">
            {{ row[7] }}
          </span>
              {{ fmtAcc(row[6]) }}
              {{ fmtXY(row[3]) }}, {{ fmtXY(row[4]) }}
              {{ row[5] }}
              {{ fmtHumanHeight(row[9]) }}
              {{ row[0] }}
            </div>
          </div>
          <v-alert
              v-if="pendingObservation"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-2 py-1 px-2"
              style="font-size:14px; line-height:1.2;"
          >
            <!-- ここを追加：観測中も表示 -->
            <v-chip
                v-if="pendingObservation && (kansokuPhase==='observing' || kansokuPhase==='await')"
                :color="kakusaColor"
                variant="flat"
                class="font-weight-bold px-4"
                :class="observingClass"
                style="position: absolute; right: 10px;"
            >
              {{ `${pendingObservation.diffTxt}m` }}
            </v-chip>
            <div class="text-body-2" style="color:black; font-weight:700;">測位結果</div>

            <!-- ★ 追加：点名 -->
            <div class="mt-1" style="color:black;">
              点名：{{ (currentPointName || tenmei || '').trim() || '未設定' }}
            </div>
            <div class="mt-1" :style="`color:${kakusaColor};`">
              較差：XY={{ pendingObservation.diffTxt }}m
            </div>
            <div class="mt-1" style="color:black;">
              平均 (n={{ pendingObservation.n }})：X={{ pendingObservation.XavgTxt }}Y={{ pendingObservation.YavgTxt }}
            </div>
            <div v-if="pendingObservation.HavgTxt" class="mt-1" style="color:black;">
              H={{ pendingObservation.HavgTxt }}m
            </div>
            <div class="mt-1" style="color:black;">
              アンテナ高：{{ Number.isFinite(+offsetCm) ? (+offsetCm).toFixed(2) : '' }} m              </div>
          </v-alert>

          <div class="d-flex align-center mt-2" style="gap: 8px; flex-wrap: nowrap;">
            <v-spacer></v-spacer>
            <v-btn
                variant="text"
                density="compact"
                class="text-none pa-0"
                style="min-width:auto; padding:0;"
                @click="closeTorokuDialog"
                :disabled="kansokuPhase !== 'idle'"
            >閉じる</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

  </div>

  <VDialogConfirm
      v-model="confirmDialog.open"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :ok-text="confirmDialog.okText"
      :cancel-text="confirmDialog.cancelText"
      :color="confirmDialog.error"
      :icon="confirmDialog.icon"
      persistent
      @ok="resolve(true)"
      @cancel="resolve(false)"
  />

</template>

<script>
import {mapState} from "vuex";

function toNum(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/,/g, '');
  if (s === '') return null;              // ★ 追加：空文字は無効
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function xyFromProps(props) {
  if (!props) return null;
  const candidates = [
    ['補正後X座標', '補正後Y座標'],
    ['X座標', 'Y座標'],
    ['X', 'Y'],
  ];
  for (const [kx, ky] of candidates) {
    const x = toNum(props[kx]);
    const y = toNum(props[ky]);
    if (x != null && y != null) {
      return { x, y, _meta: { keyX: kx, keyY: ky, valueX: x, valueY: y } };
    }
  }
  return null;
}
function pickNearestVertex(map, lngLat, snapPx = 16, layerIds = null) {
  if (!map || !lngLat) return null;
  const p = map.project(lngLat);
  const bbox = [{ x: p.x - snapPx, y: p.y - snapPx }, { x: p.x + snapPx, y: p.y + snapPx }];

  let features = [];
  try {
    features = map.queryRenderedFeatures([bbox[0], bbox[1]], layerIds ? { layers: layerIds } : {});
  } catch(_) {
    features = map.queryRenderedFeatures([bbox[0], bbox[1]]);
  }
  if (!features.length) return null;

  let best = null, bestDist = Infinity, bestProps = null;

  const pushCandidate = (coord, props) => {
    const pp = map.project({ lng: coord[0], lat: coord[1] });
    const d = Math.hypot(pp.x - p.x, pp.y - p.y);
    if (d < bestDist) { bestDist = d; best = { lng: coord[0], lat: coord[1] }; bestProps = props || null; }
  };

  for (const f of features) {
    const g = f?.geometry; if (!g) continue;
    const t = g.type, props = f.properties || {};
    if (t === 'Point') { pushCandidate(g.coordinates, props); continue; }
    if (t === 'MultiPoint') { for (const c of g.coordinates) pushCandidate(c, props); continue; }
    if (t === 'Polygon') { for (const ring of g.coordinates) for (const c of ring) pushCandidate(c, props); continue; }
    if (t === 'MultiPolygon') { for (const poly of g.coordinates) for (const ring of poly) for (const c of ring) pushCandidate(c, props); continue; }
    // LineString 系は対象外
  }
  if (!best || bestDist > snapPx) return null;
  return { ...best, __anchor: true, __snapped: true, properties: bestProps };
}

function epsgFromZahyokei(label, zahyokeiList) {
  if (!label || !Array.isArray(zahyokeiList)) return null;
  const hit = zahyokeiList.find(e => e.kei === label);
  return hit?.code || null;
}
function xyFromLngLat(lng, lat, epsg) {
  const [E, N] = proj4('EPSG:4326', epsg, [lng, lat]);
  if (!Number.isFinite(E) || !Number.isFinite(N)) return null;
  return { x: N, y: E }; // ★ X=北, Y=東 に統一
}

import {addressFromMapCenter, zahyokei} from "@/js/downLoad";
import proj4 from "proj4";
import {calcOrthometric} from "@/geoid";
import * as turf from "@turf/turf";
import Encoding from "encoding-japanese";
import maplibregl from "maplibre-gl";
import MediaNoteDialog from "@/components/floatingwindow/MediaNoteDialog.vue";

export default {
  name: 'JobPointPanelBody',
  components: {
    MediaNoteDialog
  },
  props: {
  },
  emits: [
  ],
  data () {
    return {
      lastPointId: '',
      mediaDlg: false,
      // 状態
      watchId: null,
      isTracking: false,
      // isKuiuchi: false,
      geoLastTs: 0,
      // 表示・品質関連
      prevQuality: null,
      geoAccAvgAlpha: 0.3, // EWMA 平滑化係数（0<alpha<=1）
      // UI 設定
      isHeadingUp: false,
      dialogForWatchPosition: false,
      // 既存UI依存（存在すれば使う）
      currentMarker: null,
      centerMarker: null,
      compass: null,
      rtkWindowMs: 5000,   // 無視する時間窓（ms）
      lastRtkAt: 0,      // 直近でRTK級を測位したタイムスタンプ(ms)
      logEnabled: false,          // ロギングON/OFF
      csvRows: null,              // 2次元配列（ヘッダー含む）
      lastLogAt: 0,               // 直近記録時刻
      lastLogXY: null,            // 直近記録XY {x, y}（X=北, Y=東）
      minLogIntervalMs: 1000,     // 時間間引き（ms）
      minLogDistanceM: 0.3,       // 距離間引き（m）
      confirmClearLog: false,
      onMapClickForToroku: null,
      enableTorokuPointClick: false,
      dialogForToroku: false,
      kansokuItems: [1, 10, 20, 50, 100, 1000, 86400],
      kansokuCount: 10, // 既定値
      // 追加: 0〜100cm のセレクト
      offsetCm: 0,
      // offsetCmItems: Array.from({ length: 101 }, (_, i) => ({ title: `${i}cm`, value: i })),
      rtkPng: null,
      kansokuRunning: false,
      kansokuRemaining: 0,
      kansokuTimer: null,
      kansokuCsvRows: null, // [['timestamp','lat','lon','X','Y','CRS','accuracy','quality','eventType'], ...]
      torokuPointLngLat: null,
      // 測位点メタを保持
      torokuPointQuality: null, // 'RTK級' など
      torokuPointQualityAt: null, // 記録時刻（ms）
      tenmei: 'a',        // 入力値
      tenmeiError: '',   // エラーメッセージ表示用
      currentPointName: '',
      externalElevation: null, // { hType: 'orthometric'|'ellipsoidal', hMeters: number, geoidN: number|null }
      torokuAnimMs: 700,        // センタリングのアニメ時間(ms)
      torokuDialogDelayMs: 0, // moveend後に待つ時間(ms)
      sampleIntervalSec: 1.0, // ★ 新規: サンプリング間隔(秒). 0.1〜60を想定
      torokuDisabled: false,   // ★ ダイアログCloseで復帰
      isJobMenu: false,     // ← 左下メニューの表示制御（isなんとか）
      torokuBusy: false,    // ←（多重測位防止）
      jobPickerOpen: false,    // Job Picker の v-model
      jobPickerBusy: false,    // ← 先頭アンダースコア禁止版（多重オープン防止）
      jobList: [],              // 既存ジョブ（最小構成）
      jobName: '',              // 新規用
      jobNameError: '',         // バリデーション表示
      // 現在選択中（UIで使う想定）
      currentJobId: null,
      currentJobName: '',
      useServerOnly: true,
      pointsForCurrentJob: [],   // ← 新設：現在選択中ジョブのポイント一覧
      showAllJobs: false, // ←追加：基本はfalse = 選択中のみ表示
      pendingObservation: null, // 観測停止後のプレビュー用 { n, Xavg, Yavg, diff }
      kansokuPhase: 'idle', // 'idle' | 'observing' | 'await'
      // 単点/結線の唯一のソース。'point' か 'chain'
      lineMode: localStorage.getItem('oh3_line_mode') || 'point',
      tutorialShow: true,
      dontShowKey: 'tutorial_show',
      editingJobName: false,
      hoverJobName: false,
      tempJobName: '',
      jobNameDebounceTimer: null,
      contextMenuObject: {},
      detachForContextMenu: null,
      kansokuInFlight: false,  // 1tick内の重複実行を防ぐ
      editingPointId: null,
      tempPointName: '',
      hoverPointId: null,
      pointRenameInFlight: false,
      showJobListOnly: true, // 起動時は一覧。ジョブ選択時に false（ポイント全高）にする
      snapLngLat: null,
      currentLngLat: null,
      suppressUntil: 0, // タッチ操作終了から20秒は抑止
      autoCloseJobPicker: false,
      jobEditDialog: {
        open: false,
        jobId: '',
        origName: '',
        origNote: '',
        name: '',
        note: '',
        saving: false,
      },
      pointEditDialog: {
        open: false,
        pointId: '',
        origName: '',
        origAddress: '',
        name: '',
        address: '',
        saving: false,
      },
      configDialog: {
        open: false,
      },
      mediaNoteDialog: {
        open: false,
      },
      confirmDialog: {
        open: false,
        title: '削除',
        message: '',
        okText: '削除する',
        cancelText: 'キャンセル',
        color: 'error',
        icon: 'mdi-alert-circle',
      },
      resolver: null,
      apiForJobPicker: 'https://kenzkenz.xsrv.jp/open-hinata3/php/user_kansoku.php',
      SRC: 'oh-toroku-point-src',
      LAYER: 'oh-toroku-point',
      LAB: 'oh-toroku-point-label',
    }
  },
  computed: {
    ...mapState([
      'sokuiHeader',
      'isAndroid',
      'disabledForSokui',
      'map01',
      'userId',
      'myNickname',
      'isKuiuchi',
    ]),
    lastEvent () { return this.$store.state.messageDialog.lastEvent },
    eventSeq  () { return this.$store.state.messageDialog.eventSeq  },
    s_disabledForSokui: {
      get() {
        return this.$store.state.disabledForSokui
      },
      set(value) {
        this.$store.state.disabledForSokui = value
      }
    },
    disabledForSokuiCalc() {
      return this.torokuBusy || this.kansokuRunning || !String(this.currentJobId || '').trim()
    },
    canCreateJob () {
      return (this.jobName || '').trim().length > 0
    },
    canSavePoint () {
      const name = (this.pointEditDialog.name || '').trim()
      return Boolean(name)
    },
    // 測位中(= 観測フェーズ)だけクラスを付ける
    observingClass() {
      return (this.kansokuPhase === 'observing' && this.kansokuRunning)
          ? 'oh-chip-heartbeat'
          : ''; // それ以外は剥がす
    },
    kakusaColor() {
      const diff = Number(this.pendingObservation.diffTxt)
      console.log(diff)
      if (diff < 0.03) {
        return 'blue'
      } else if (diff < 0.06) {
        return 'orange'
      } else {
        return '#c00'
      }
    },
    canStartKansoku () {
      if (this.kansokuPhase !== 'idle') return false;  // ← フェーズでブロック
      if (!this.currentJobId) return false;
      if (!this.torokuPointLngLat) return false;
      const name = (this.tenmei || '').trim();
      if (!name) return false;
      if (!('geolocation' in navigator)) return false;
      return true;
    },
    startHint () {
      if (this.kansokuPhase === 'await') return '保存か破棄を選択してください';
      if (this.kansokuPhase === 'observing') return '測位中です';
      if (!this.currentJobId) return 'ジョブ未選択';
      if (!this.torokuPointLngLat) return '観測点(赤丸)が未設定';
      if (!(this.tenmei||'').trim()) return '点名が未入力';
      return '測位開始';
    },
    kansokuAverages () {
      const rows = Array.isArray(this.kansokuCsvRows) ? this.kansokuCsvRows.slice(1) : [];
      if (!rows.length) return { n: 0, lat: null, lon: null, X: null, Y: null };

      let nLL = 0, sumLat = 0, sumLon = 0;
      let nXY = 0, sumX = 0, sumY = 0;

      for (const r of rows) {
        const lat = Number(r[1]), lon = Number(r[2]);
        const X   = Number(r[3]), Y   = Number(r[4]);

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          sumLat += lat; sumLon += lon; nLL++;
        }
        if (Number.isFinite(X) && Number.isFinite(Y)) {
          sumX += X; sumY += Y; nXY++;
        }
      }
      return {
        n: Math.max(nLL, nXY),
        lat: nLL ? (sumLat / nLL) : null,
        lon: nLL ? (sumLon / nLL) : null,
        X:   nXY ? (sumX   / nXY) : null,
        Y:   nXY ? (sumY   / nXY) : null,
      };
    },
    s_isKuiuchi: {
      get() {
        return this.$store.state.isKuiuchi;
      },
      set(value) {
        this.$store.state.isKuiuchi = value
      }
    },
  },
  methods: {
    confirm (options = {}) {
      Object.assign(this.confirmDialog, options, { open: true })
      return new Promise(res => { this.resolver = res })
    },
    resolve (val) {
      if (this.resolver) this.resolver(val)
      this.resolver = null
      this.confirmDialog.open = false
    },
    async onMediaSave({ file, kind, note }){
      const fd = new FormData()
      if (file) fd.append(kind === 'video' ? 'video' : 'photo', file)
      fd.append('note', note || '')
      // 既存APIにPOST（URL/パラメータはOH3の規約に合わせて）
    },
    setSourceAndLayer(fc) {
      const map = this.map01
      if (map.getSource(this.SRC)) {
        map.getSource(this.SRC).setData(fc);
      } else {
        map.addSource(this.SRC, { type: 'geojson', data: fc });
        if (!map.getLayer(this.LAYER)) {
          map.addLayer({
            id: this.LAYER,
            type: 'circle',
            source: this.SRC,
            paint: {
              'circle-radius': 6,
              'circle-color': '#ff3b30',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });
        }
        if (!map.getLayer(this.LAB)) {
          map.addLayer({
            id: this.LAB,
            type: 'symbol',
            source: this.SRC,
            layout: {
              'text-field': ['get', 'label'],
              'text-size': 16,
              'text-offset': [0, 0.5],
              'text-anchor': 'top',
              'text-allow-overlap': true
            },
            paint: { 'text-halo-color': '#ffffff', 'text-halo-width': 1.0 }
          });
        }
      }
      try { map.moveLayer(this.LAYER); } catch (_) {}
      try { map.moveLayer(this.LAB); }   catch (_) {}
    },

    // ========= ダイアログ =========
    openPointEditDialog (pt) {
      const d = this.pointEditDialog
      d.pointId = pt.point_id
      d.origName = String(pt.point_name || '')
      d.origAddress = String(pt.address || '')
      d.name = d.origName
      d.address = d.origAddress
      d.open = true
    },
    closePointEditDialog () {
      const d = this.pointEditDialog
      d.open = false
      d.pointId = ''
      d.origName = ''
      d.origAddress = ''
      d.name = ''
      d.address = ''
    },
    closeConfigDialog () {
      const d = this.configDialog
      d.open = false
    },

    async savePointEditDialog () {
      const d = this.pointEditDialog
      if (d.saving) return
      const id   = d.pointId
      const name = (d.name || '').trim()
      const addr = d.address || ''

      const needRename = name && name !== d.origName
      const needAddr   = addr !== d.origAddress

      if (!needRename && !needAddr) {
        this.closePointEditDialog()
        return
      }

      d.saving = true
      try {
        // 1) 名前変更（必要なときだけ）
        if (needRename) {
          const fd1 = new FormData()
          fd1.append('action', 'job_points.update_name')
          fd1.append('point_id', id)
          fd1.append('point_name', name)
          const r1 = await fetch(this.apiForJobPicker, { method: 'POST', body: fd1 })
          const j1 = await r1.json().catch(() => ({}))
          if (!j1.ok) throw new Error(j1.error || 'points.update failed')
        }

        // 2) 住所更新（必要なときだけ）
        if (needAddr) {
          const fd2 = new FormData()
          fd2.append('action', 'job_points.update_address')
          fd2.append('point_id', id)
          fd2.append('address', addr)
          const r2 = await fetch(this.apiForJobPicker, { method: 'POST', body: fd2 })
          const j2 = await r2.json().catch(() => ({}))
          if (!j2.ok) throw new Error(j2.error || 'points.update_address failed')
        }

        // ローカル反映
        const rec = this.pointsForCurrentJob.find(p => String(p.point_id) === id)
        if (rec) {
          if (needRename) rec.point_name = name
          if (needAddr)   rec.address    = addr
        }

        const f = this._torokuFC.features.find(f => f.properties.id === id)
        if (f) {
          f.properties.label = name
          f.properties.name  = name
          const map = this.map01
          map.getSource(this.SRC).setData(this._torokuFC)
          map.triggerRepaint()
          console.log(this._torokuFC)
        }
        this.pointEditDialog.saving = false
        // ダイアログ閉じる＆orig更新
        d.origName = name
        d.origAddress = addr
        this.closePointEditDialog()
      } catch (e) {
        console.error('[point edit] save failed:', e)
        alert('ポイントの更新に失敗しました')
        d.saving = false
      }
    },

    // kebab → ダイアログオープン
    openJobEditDialog (job) {
      const id   = String(job?.id ?? job?.job_id ?? '')
      const name = String(job?.name ?? job?.job_name ?? '')
      const note = String(job?.note ?? '')
      if (!id) return
      this.jobEditDialog.jobId    = id
      this.jobEditDialog.origName = name
      this.jobEditDialog.origNote = note
      this.jobEditDialog.name     = name
      this.jobEditDialog.note     = note
      this.jobEditDialog.open     = true
    },

    closeJobEditDialog () {
      this.jobEditDialog.open   = false
      this.jobEditDialog.saving = false
    },

    async saveJobEditDialog () {
      if (this.jobEditDialog.saving) return
      const id   = this.jobEditDialog.jobId
      const name = (this.jobEditDialog.name || '').trim()
      const note = this.jobEditDialog.note ?? ''

      const needRename = name && name !== this.jobEditDialog.origName
      const needNote   = note !== this.jobEditDialog.origNote

      if (!needRename && !needNote) {
        this.closeJobEditDialog()
        return
      }

      this.jobEditDialog.saving = true
      try {
        // 1) 名前変更（必要なときだけ）
        if (needRename) {
          const fd1 = new FormData()
          fd1.append('action', 'jobs.update')
          fd1.append('job_id', id)
          fd1.append('job_name', name)
          const r1 = await fetch(this.apiForJobPicker, { method: 'POST', body: fd1 })
          const j1 = await r1.json().catch(() => ({}))
          if (!j1?.ok) throw new Error(j1?.error || 'jobs.rename failed')
        }

        // 2) ノート更新（必要なときだけ）
        if (needNote) {
          const fd2 = new FormData()
          fd2.append('action', 'jobs.update_note')
          fd2.append('job_id', id)
          fd2.append('note', note)
          const r2 = await fetch(this.apiForJobPicker, { method: 'POST', body: fd2 })
          const j2 = await r2.json().catch(() => ({}))
          if (!j2?.ok) throw new Error(j2?.error || 'jobs.update_note failed')
        }

        // ローカル反映：jobList / current*
        const rec = this.jobList.find(j => String(j.id ?? j.job_id) === id)
        if (rec) {
          if (needRename) rec.name = name
          if (needNote)   rec.note = note
        }
        if (String(this.currentJobId) === id) {
          if (needRename) this.currentJobName = name
          // currentJobNote を使っているなら併せて
          if (needNote)   this.currentJobNote = note
        }
        // ダイアログ閉じる
        this.jobEditDialog.origName = name
        this.jobEditDialog.origNote = note
        this.closeJobEditDialog()
      } catch (e) {
        console.error('[job edit] save failed:', e)
        alert('ジョブの更新に失敗しました')
        this.jobEditDialog.saving = false
      }
    },

    panToPointXY(pt) {
      const easing = (t) => t * (2 - t);
      this.map01.easeTo({
        center: [Number(pt.lng), Number(pt.lat)],
        duration: 800,
        easing,
        animate: true
      });
    },

    startEditJobName () {
      this.tempJobName = String(this.currentJobName || '')
      this.lastCommittedJobName = this.tempJobName
      this.editingJobName = true
    },
    cancelJobNameEdit () {
      this.editingJobName = false
      this.tempJobName = ''
    },
    async commitJobName () {
      const newName = (this.tempJobName || '').trim()

      // 空は確定しない
      if (!newName) { this.editingJobName = false; return }
      // 変更なしは何もしない
      if (newName === this.lastCommittedJobName) { this.editingJobName = false; return }

      try {
        await this.updateJobNameOnServer(this.currentJobId, newName)
        this.currentJobName = newName
        this.lastCommittedJobName = newName
        try { await this.refreshJobs?.() } catch (_) {}
      } catch (err) {
        console.error('[jobName] update failed:', err)
        // 必要ならスナックバー等で通知
      } finally {
        this.editingJobName = false
      }
    },
    async updateJobNameOnServer (jobId, newName) {
      if (!jobId) throw new Error('jobId missing')
      const fd = new FormData()
      fd.append('action', 'jobs.update')
      fd.append('job_id', String(jobId))
      fd.append('job_name', newName)
      const res = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/user_kansoku.php', {
        method: 'POST',
        body: fd
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json().catch(() => ({}))
      if (!json || json.ok === false) throw new Error(json.error || 'update failed')
      return json.data || json
    },

    /** =========================
     * 測位関連（位置観測の開始・収集・停止・サマリー・保存）
     * ========================= */

    // 測位を途中でキャンセルし、結果を確定
    cancelKansoku () {
      if (!confirm('測位を途中で停止して、ここまでの結果で確定してよろしいですか？')) {
        return;
      }
      // 既存の停止処理でOK：サマリーを作り、kansokuPhase='await' になる
      this.kansokuStop();
      // ← ボタンは v-if の条件を満たさなくなるので自動で非表示に戻る
    },

    // 観測停止：タイマ停止・サマリー確定・フェーズ遷移
    kansokuStop() {
      this.kansokuRunning = false;
      this.kansokuRemaining = 0;
      if (this.kansokuTimer) { clearInterval(this.kansokuTimer); this.kansokuTimer = null; }

      const sum = this.summarizeObservationLight();
      this.pendingObservation = sum || null;

      // ← ここがポイント：重複回避後の“最終点名”を決定
      const base = (this.tenmei || '').trim();
      const finalName = this.ensureUniqueTenmei ? this.ensureUniqueTenmei(base) : base;

      // サマリー表示名
      if (this.pendingObservation) this.pendingObservation.pointName = finalName;

      // ★ v-text-fieldに即反映（ここでG100になる）
      this.tenmei = finalName;
      this.currentPointName = finalName;
      try { localStorage.setItem('tenmei', finalName); } catch {}

      this.kansokuPhase = this.pendingObservation ? 'await' : 'idle';
    },

    // 保存：commit → 緑丸消去 → 一覧/件数を再取得 → セッション終了
    async onClickSaveObservation() {
      if (this.kansokuTimer) {
        clearInterval(this.kansokuTimer);
        this.kansokuTimer = null;
      }
      try {
        await this.commitCsv2Point();
        this.clearCurrentMarker();
        await this.loadPointsForJob(this.currentJobId,  { fit: false });

        console.log(this.pointsForCurrentJob)
        console.log(this.pointsForCurrentJob.at(-1).point_id)
        this.lastPointId = this.pointsForCurrentJob.at(0).point_id

        await this.refreshJobs();
      } catch (e) {
        console.warn('[save] commit failed', e);
      } finally {
        this.kansokuCsvRows = null;
        this.pendingObservation = null;
        this.kansokuPhase = 'idle';
        this.torokuDisabled = false;
        this.mediaDlg = true
      }
    },

    // 破棄：ログ消去・緑丸消去・待機へ戻す（点は保存しない）
    onClickDiscardObservation() {
      if (this.kansokuTimer) {
        clearInterval(this.kansokuTimer);
        this.kansokuTimer = null;
      }
      this.kansokuCsvRows = null;
      this.pendingObservation = null;
      this.kansokuPhase = 'idle';
      this.torokuDisabled = false;
      this.clearCurrentMarker();
    },

    // 観測セッションの可変状態を初期化（タイマ停止・ログ消去）
    _resetKansokuSession () {
      this.kansokuRunning   = false;
      this.kansokuRemaining = 0;
      if (this.kansokuTimer) { try { clearInterval(this.kansokuTimer); } catch{} this.kansokuTimer = null; }
      this.kansokuCsvRows   = null;
      this.kansokuAverages  = null;
    },

    // 軽量サマリー：CSV（kansokuCsvRows）から X/Y/H の平均と較差を算出
    summarizeObservationLight() {
      const rows = Array.isArray(this.kansokuCsvRows) ? this.kansokuCsvRows : null;
      if (!rows || rows.length <= 1) return null;

      const header = rows[0];
      const col = (name) => header.indexOf(name);
      const iX  = col('X');
      const iY  = col('Y');
      const iET = col('eventType');

      // 標高列（なければ 9 列目を想定）
      const iH  = (header.indexOf('標高') >= 0) ? header.indexOf('標高')
          : (header.indexOf('height') >= 0 ? header.indexOf('height') : 9);

      if (iX < 0 || iY < 0) return null;

      const parse = this.parseNumberLike || ((v) => {
        if (v == null) return null;
        if (typeof v === 'number') return Number.isFinite(v) ? v : null;
        const s = String(v).trim().replace(/^[\s:=>\u3000：＝＞]+/, '').replace(',', '.');
        const m = s.match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)/);
        const n = m ? Number(m[0]) : NaN;
        return Number.isFinite(n) ? n : null;
      });
      const xs = [], ys = [], hs = [];

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const et = (iET >= 0 && row[iET]) ? String(row[iET]) : 'kansoku';
        if (et !== 'kansoku') continue;

        const vx = parse(row[iX]); if (vx != null) xs.push(vx);
        const vy = parse(row[iY]); if (vy != null) ys.push(vy);

        if (iH >= 0 && row.length > iH && row[iH] != null && row[iH] !== '') {
          const vh = parse(row[iH]);
          if (vh != null) hs.push(vh);
        }
      }
      if (!xs.length || !ys.length) return null;

      const avg = (a) => a.reduce((s,v)=>s+v,0)/a.length;
      const Xavg = avg(xs);
      const Yavg = avg(ys);
      const diff = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const Havg = hs.length ? avg(hs) : null;

      const fix3 = this.toFixed3 || ((n) => (Number.isFinite(n) ? n.toFixed(3) : ''));
      return {
        n: xs.length,
        Xavg, Yavg, diff, Havg,
        XavgTxt: fix3(Xavg),
        YavgTxt: fix3(Yavg),
        diffTxt: fix3(diff),
        HavgTxt: (Havg == null ? '' : fix3(Havg)),
      };
    },

    // 観測中プレビュー：n件に達したら軽量サマリーを表示（既定 minN=2）
    refreshPendingObservation(minN = 2) {
      const sum = this.summarizeObservationLight?.();
      this.pendingObservation = (sum && sum.n >= minN) ? sum : null;
    },

    // 1回の観測CSVヘッダを用意（未初期化時のみ）
    initKansokuCsvIfNeeded() {
      if (!this.kansokuCsvRows) {
        this.kansokuCsvRows = [[
          'timestamp','lat','lon','X','Y','CRS','accuracy','quality','eventType','標高','楕円体高'
        ]];
      }
    },

    // 測位開始
    kansokuStart () {
      this.clearCurrentMarker();   // 残っている緑丸を消す

      addressFromMapCenter()

      if (!this.canStartKansoku) return;
      if (this.kansokuPhase !== 'idle') return;
      if (this.kansokuPhase === 'observing') return;

      if (this.kansokuTimer) {
        clearTimeout(this.kansokuTimer);
        this.kansokuTimer = null;
      }

      const raw = (this.tenmei == null) ? '' : String(this.tenmei).trim();
      if (!raw) {
        this.tenmeiError = '点名は必須です';
        alert('点名を入力してください');
        return;
      }
      try { localStorage.setItem('tenmei', raw) } catch (_) {}
      this.currentPointName = this.ensureUniqueTenmei ? this.ensureUniqueTenmei(raw) : raw;

      this.pendingObservation = null;

      // セッション初期化と準備
      this._resetKansokuSession();
      this.initKansokuCsvIfNeeded();

      this.kansokuRunning   = true;
      this.kansokuRemaining = Number(this.kansokuCount) || 1;
      this.kansokuPhase     = 'observing';

      // 非並列化：同時発火を禁止するフラグ
      this.gpsPending = false;

      // インターバル算出
      this.sampleIntervalSec = this.clampInterval(this.sampleIntervalSec);
      const intervalMs = Math.max(100, Math.round(Number(this.sampleIntervalSec) * 1000));

      const tickOnce = async () => {
        if (!this.kansokuRunning) return;
        if (this.kansokuRemaining <= 0) { this.kansokuStop(); return; }

        if (this.gpsPending) {
          // 返り待ち中は短い遅延で再試行
          this.kansokuTimer = setTimeout(tickOnce, 50);
          return;
        }
        this.gpsPending = true;
        try {
          await this.kansokuCollectOnce(); // 1回分だけ、終了を待つ
        } finally {
          this.gpsPending = false;
          if (this.kansokuRunning) {
            this.kansokuTimer = setTimeout(tickOnce, intervalMs);
          }
        }
      };
      // 即時1回（＝最初のtick）
      tickOnce();
    },

    // 1回分の測位を取得して CSV に追記（必要ならH計算）。残数が尽きたら停止
    kansokuCollectOnce() {
      return new Promise((resolve) => {
        if (!this.kansokuRunning || this.kansokuRemaining <= 0) {
          this.kansokuStop();
          return resolve();
        }
        if (!this.torokuPointLngLat) {
          console.warn('[kansoku] 赤丸(測位点)が未設定です');
          return resolve();
        }

        const parse = this.parseNumberLike || ((v) => {
          if (v == null) return null;
          if (typeof v === 'number') return Number.isFinite(v) ? v : null;
          const s = String(v).trim()
              .replace(/^[\s:=>\u3000：＝＞]+/, '')
              .replace(',', '.');
          const m = s.match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)/);
          const n = m ? Number(m[0]) : NaN;
          return Number.isFinite(n) ? n : null;
        });
        const fix3 = this.toFixed3 || ((n) => (Number.isFinite(n) ? n.toFixed(3) : ''));

        const _this = this;
        const opt = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 };

        function epsgFromLabelOrAuto(lat, lon) {
          try {
            const label = (_this.$store && _this.$store.state)
                ? (_this.$store.state.s_zahyokei || _this.$store.state.zahyokei || '')
                : '';
            const m = /公共座標\s*(\d+)系/.exec(label);
            if (m) {
              const z = Number(m[1]);
              if (z >= 1 && z <= 19) return 6668 + z;
            }
            let zAuto = Math.round((lon - 129) / 2) + 1;
            if (zAuto < 1) zAuto = 1;
            if (zAuto > 19) zAuto = 19;
            return 6668 + zAuto;
          } catch {
            return null;
          }
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                if (!_this.kansokuRunning || _this.kansokuRemaining <= 0) { return resolve(); }

                const c = pos.coords || {};
                const accuracy = (typeof c.accuracy === 'number') ? c.accuracy : null;
                const altAcc   = (typeof c.altitudeAccuracy === 'number') ? c.altitudeAccuracy : null;
                const quality  = _this.getGeoQualityLabel(accuracy, altAcc);

                const nowTs = pos.timestamp || Date.now();
                if (quality === 'RTK級') {
                  _this.lastRtkAt = nowTs;
                } else if (_this.lastRtkAt && (nowTs - _this.lastRtkAt) <= (_this.rtkWindowMs || 1000)) {
                  return resolve(); // RTK混入抑止ウィンドウ内は棄却
                }

                let lat = (typeof c.latitude  === 'number') ? c.latitude  : null;
                let lon = (typeof c.longitude === 'number') ? c.longitude : null;
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
                  if (_this.torokuPointLngLat) {
                    lat = _this.torokuPointLngLat.lat;
                    lon = _this.torokuPointLngLat.lng;
                  } else {
                    console.warn('[kansoku] invalid device coords and no anchor');
                    return resolve();
                  }
                }

                const baseLon = (_this.torokuPointLngLat && Number.isFinite(_this.torokuPointLngLat.lng))
                    ? _this.torokuPointLngLat.lng : lon;
                const baseLat = (_this.torokuPointLngLat && Number.isFinite(_this.torokuPointLngLat.lat))
                    ? _this.torokuPointLngLat.lat : lat;

                const epsg = epsgFromLabelOrAuto(baseLat, baseLon);

                let X = null, Y = null, csLabel = '';
                if (epsg) {
                  try {
                    if (typeof proj4 !== 'function') console.warn('[kansoku] proj4 未ロードです');
                    const out = proj4('EPSG:4326', 'EPSG:' + epsg, [lon, lat]);
                    if (out && Number.isFinite(out[0]) && Number.isFinite(out[1])) {
                      Y = out[0];
                      X = out[1];
                    }
                    const zone = epsg - 6668;
                    csLabel = '公共座標' + zone + '系';
                  } catch (e) {
                    console.warn('[kansoku] proj4 transform failed', e);
                  }
                } else {
                  console.warn('[kansoku] EPSG 決定に失敗 (label/auto)');
                }

                const haeN = parse(c.altitude);

                let hOut = '';
                const pH = Number(_this?.pointElevation?.hOrthometric);
                const eH = Number(_this?.externalElevation?.hOrthometric);
                if (Number.isFinite(pH)) {
                  hOut = pH;
                } else if (Number.isFinite(eH)) {
                  hOut = eH;
                } else if (Number.isFinite(haeN)) {
                  try {
                    const H = await calcOrthometric(lon, lat, haeN);
                    if (Number.isFinite(H)) {
                      hOut = H;
                    } else {
                      hOut = `${fix3(haeN)}(HAE)`;
                    }
                  } catch {
                    hOut = `${fix3(haeN)}(HAE)`;
                  }
                } else {
                  hOut = '';
                }

                let hNum = parse(hOut);
                if (hNum != null && hNum < 0) {
                  hOut = '';
                } else if (hNum != null) {
                  hOut = fix3(hNum);
                } else {
                  hOut = '';
                }

                _this.initKansokuCsvIfNeeded();
                _this.kansokuCsvRows.push([
                  _this.$_jstLocal(),
                  lat, lon,
                  X, Y, csLabel,
                  accuracy,
                  quality,
                  'kansoku',
                  hOut,
                  Number.isFinite(haeN) ? fix3(haeN) : ''
                ]);
                _this.refreshPendingObservation(2); // 2件目からサマリー表示
              } catch (e) {
                console.warn('[kansoku] collect error', e);
              } finally {
                if (_this.kansokuRunning) {
                  _this.kansokuRemaining -= 1;
                  if (_this.kansokuRemaining <= 0) _this.kansokuStop();
                }
                resolve();
              }
            },
            (err) => {
              console.warn('[kansoku] getCurrentPosition error', err);
              if (_this.kansokuRunning) {
                _this.kansokuRemaining -= 1;
                if (_this.kansokuRemaining <= 0) _this.kansokuStop();
              }
              resolve();
            },
            opt
        );
      });
    },

    // サマリーから 1 点の平均値を確定保存し、赤丸を追加・サーバ登録も行う
    async commitCsv2Point() {
      try {
        const rows = Array.isArray(this.kansokuCsvRows) ? this.kansokuCsvRows : null;
        if (!rows || rows.length <= 1) { console.warn('[csv2] rows empty'); return false; }

        const parse = this.parseNumberLike || ((v) => {
          if (v == null) return null;
          if (typeof v === 'number') return Number.isFinite(v) ? v : null;
          const s = String(v).trim()
              .replace(/^[\s:=>\u3000：＝＞]+/, '')
              .replace(',', '.');
          const m = s.match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)/);
          const n = m ? Number(m[0]) : NaN;
          return Number.isFinite(n) ? n : null;
        });
        const fix3 = this.toFixed3 || ((n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(3) : ''));
        const fix2 = this.toFixed2 || ((n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : ''));

        const header = rows[0];
        const col = (name) => header.indexOf(name);
        const iX   = col('X');
        const iY   = col('Y');
        const iLat = col('lat');   // ★ 追加
        const iLon = col('lon');   // ★ 追加
        const iTS  = col('timestamp');
        const iET  = col('eventType');
        if (iX < 0 || iY < 0) { console.warn('[csv2] X/Y column not found'); return false; }

        const iH = (header.indexOf('height') >= 0) ? header.indexOf('height') : 9;

        const iHAE = (() => {
          const names = ['楕円体高','hae','ellipsoidal','hEllipsoidal','h_ellipsoidal','ellipsoidal_height'];
          for (const n of names) { const idx = col(n); if (idx >= 0) return idx; }
          return -1;
        })();

        const xs = [], ys = [];
        const lats = [], lons = [];          // ★ 追加：観測の緯度経度を集計
        const hTxtArr = [];
        const hNumArr = [];
        const haeNumArr = [];
        let lastTs = '';

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const et = (iET >= 0 && row[iET]) ? String(row[iET]) : 'kansoku';
          if (et !== 'kansoku') continue;

          const vx = parse(row[iX]); if (vx != null) xs.push(vx);
          const vy = parse(row[iY]); if (vy != null) ys.push(vy);

          if (iLat >= 0) { const vlat = parse(row[iLat]); if (vlat != null) lats.push(vlat); }  // ★ 追加
          if (iLon >= 0) { const vlon = parse(row[iLon]); if (vlon != null) lons.push(vlon); }  // ★ 追加

          if (row.length > iH && row[iH] != null && row[iH] !== '') {
            const raw = row[iH];
            hTxtArr.push(raw);
            const hn = parse(raw);
            if (hn != null) hNumArr.push(hn);
          }

          if (iHAE >= 0 && row[iHAE] != null && row[iHAE] !== '') {
            const haeN = parse(row[iHAE]);
            if (haeN != null) haeNumArr.push(haeN);
          }

          if (iTS >= 0 && row[iTS]) lastTs = String(row[iTS]);
        }
        if (!xs.length || !ys.length) { console.warn('[csv2] no numeric XY'); return false; }

        const avg = (a) => a.reduce((s,v)=>s+v,0)/a.length;
        const Xavg = avg(xs);
        const Yavg = avg(ys);
        const diff = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));

        // ★ 追加：lat/lon の平均
        const latAvg = (lats.length ? avg(lats) : null);
        const lonAvg = (lons.length ? avg(lons) : null);

        // ★ 追加: 実測回数（測位回数）
        const obsCount = xs.length;

        let name = this.currentPointName;
        if (!name || typeof name !== 'string' || !name.trim()) {
          console.warn('[csv2] point name missing');
          alert('点名が未設定のため保存できません');
          return false;
        }

        const ts = lastTs || (this.$_jstLocal?.() ?? new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
        const poleVal = Number.isFinite(Number(this.offsetCm)) ? Number(this.offsetCm) : null;

        const eH = Number(this?.externalElevation?.hOrthometric);
        const hasOrtho = Number.isFinite(eH);
        const hadHAE = hTxtArr.some(t => typeof t === 'string' && /\(HAE\)/i.test(t));

        let hDisp = '';
        if (hasOrtho) {
          hDisp = `${eH.toFixed(3)} m`;
        } else if (hNumArr.length) {
          const avgH = avg(hNumArr);
          hDisp = hadHAE ? `${avgH.toFixed(3)} m（楕円体高）` : `${avgH.toFixed(3)} m`;
        } else {
          hDisp = '';
        }

        // ★ ここで今回確定に使う lat/lng を決定：平均 > アンカー の優先順
        const latUse = Number.isFinite(latAvg) ? latAvg : Number(this?.torokuPointLngLat?.lat);
        const lngUse = Number.isFinite(lonAvg) ? lonAvg : Number(this?.torokuPointLngLat?.lng);
        if (!Number.isFinite(latUse) || !Number.isFinite(lngUse)) {
          alert('位置情報が取得できませんでした（lat/lon 不足）');
          console.warn('[csv2] no lat/lon to commit', { latAvg, lonAvg, torokuPointLngLat: this.torokuPointLngLat });
          return false;
        }

        if (!Array.isArray(this.csv2Points)) this.csv2Points = [];
        this.csv2Points.push({
          name: String(name || ''),
          X: Xavg,
          Y: Yavg,
          hDisp,
          pole: poleVal,
          diff,
          ts,
          lat: Number(latUse),
          lng: Number(lngUse),
          obsCount,
        });
        if (!this.useServerOnly) {
          try { localStorage.setItem('csv2_points', JSON.stringify(this.csv2Points)); } catch {}
        }

        const storeLabel = this.$store?.state?.s_zahyokei || this.$store?.state?.zahyokei || '';
        let csLabel = storeLabel;
        if (!csLabel) {
          if (Number.isFinite(lngUse)) {
            let z = Math.round((lngUse - 129) / 2) + 1;
            if (z < 1) z = 1;
            if (z > 19) z = 19;
            csLabel = `公共座標${z}系`;
          } else {
            csLabel = '';
          }
        }

        const hAntennaPosNum = (() => {
          const n1 = (this.parseNumberLike || ((v)=>{ if(v==null)return null; if(typeof v==='number') return Number.isFinite(v)?v:null; const s=String(v).trim().replace(/^[\s:=>\u3000：＝＞]+/,'').replace(',', '.'); const m=s.match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)/); const n=m?Number(m[0]):NaN; return Number.isFinite(n)?n:null; }))(hDisp);
          if (n1 != null) return n1;
          const n2 = Number(this?.externalElevation?.hOrthometric);
          return Number.isFinite(n2) ? n2 : null;
        })();

        const antennaHighNum =
            Number.isFinite(Number(poleVal)) ? Number(poleVal) : null;

        const hOrthometricNum =
            (Number.isFinite(hAntennaPosNum) && Number.isFinite(antennaHighNum))
                ? (hAntennaPosNum - antennaHighNum)
                : null;

        const haeEllipsoidalNum = haeNumArr.length ? avg(haeNumArr) : null;
        const addr = String(this.$store.state.address || '');

        const rowArray = [
          String(name || ''),
          fix3(Xavg),
          fix3(Yavg),
          fix3(hOrthometricNum),
          fix2(antennaHighNum),
          fix3(hAntennaPosNum),
          fix3(haeEllipsoidalNum),
          fix3(diff),
          String(csLabel || ''),
          Number.isFinite(latUse) ? Number(latUse).toFixed(8) : '',
          Number.isFinite(lngUse) ? Number(lngUse).toFixed(8) : '',
          addr,
          String(obsCount),
          String(ts || '')
        ];

        try {
          // ★ マップ描画も新しい座標で行うため、先にアンカーを更新してから確定描画
          this.torokuPointLngLat = { lng: Number(lngUse), lat: Number(latUse) };
          this.confirmTorokuPointAtCurrent(name, rowArray);
          this.updateChainLine();
        } catch (e) {
          console.warn('[csv2] confirm point replace failed', e);
        }

        try {
          const _toSql = (v) => {
            if (!v) return '';
            const d = new Date(v);
            if (isNaN(d)) return '';
            const p = n => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
          };

          const jobId = this.currentJobId;
          const userId = this.userId;
          if (jobId && userId) {
            const fd = new FormData();
            fd.append('action', 'job_points.create');
            fd.append('job_id', String(jobId));
            fd.append('user_id', String(userId));
            fd.append('point_name', String(name || ''));
            fd.append('x_north',        Number.isFinite(Xavg) ? String(Xavg) : '');
            fd.append('y_east',         Number.isFinite(Yavg) ? String(Yavg) : '');
            fd.append('lng',            Number.isFinite(lngUse) ? String(lngUse) : '');
            fd.append('lat',            Number.isFinite(latUse) ? String(latUse) : '');
            fd.append('h_orthometric',  Number.isFinite(hOrthometricNum) ? String(hOrthometricNum) : '');
            fd.append('antenna_height', Number.isFinite(antennaHighNum) ? String(antennaHighNum) : '');
            fd.append('h_at_antenna',   Number.isFinite(hAntennaPosNum) ? String(hAntennaPosNum) : '');
            fd.append('hae_ellipsoidal',Number.isFinite(haeEllipsoidalNum) ? String(haeEllipsoidalNum) : '');
            fd.append('xy_diff',        Number.isFinite(diff) ? String(diff) : '');
            fd.append('crs_label',      String(csLabel || ''));
            fd.append('observed_at',    _toSql(ts));
            fd.append('observe_count', String(obsCount));
            fd.append('address', String(this.$store.state.address || '')); // ★追加：所在
            try {
              const res  = await fetch('https://kenzkenz.xsrv.jp/open-hinata3/php/user_kansoku.php', { method: 'POST', body: fd });
              const data = await res.json();
              if (!data?.ok) console.warn('[job_points.create] server error:', data);
            } catch (err) {
              console.warn('[job_points.create] network error:', err);
            }
          } else {
            console.warn('[job_points.create] skip (jobId/userId 不在)');
          }
        } catch (err) {
          console.warn('[job_points.create] post block error:', err);
        }

        return true;
      } catch (e) {
        console.warn('[csv2] commit error', e);
        return false;
      }
    },

    // サーバーからデータを取得しCSVのためのrowsを作る
    async createCsvRows() {
      const fd = new FormData();
      fd.append('action', 'job_points.list');
      fd.append('job_id', String(this.currentJobId));
      const res = await fetch(this.apiForJobPicker, {method: 'POST', body: fd});
      const data = await res.json();

      const list = Array.isArray(data.data) ? data.data : [];
      if (list.length === 0) {
        alert('このジョブの測位点はありません');
        return;
      }

      const num = (v) => Number.isFinite(Number(v)) ? Number(v) : NaN;
      const fmt3 = (v) => (Number.isFinite(num(v)) ? num(v).toFixed(3) : '');
      const fmtPole = (v) => (Number.isFinite(num(v)) ? num(v).toFixed(2) : '');
      const fmtDeg8 = (v) => (Number.isFinite(num(v)) ? num(v).toFixed(8) : '');
      const esc = (v) => {
        if (v == null) return '';
        const s = (typeof v === 'object') ? JSON.stringify(v) : String(v);
        return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };

      const rows = [this.sokuiHeader];

      for (const r of list) {
        rows.push([
          esc(String(r.point_name ?? '')),
          esc(fmt3(r.x_north)),
          esc(fmt3(r.y_east)),
          esc(fmt3(r.h_orthometric)),
          esc(fmtPole(r.antenna_height)),
          esc(fmt3(r.h_at_antenna)),
          esc(fmt3(r.hae_ellipsoidal)),
          esc(fmt3(r.xy_diff)),
          esc(String(r.crs_label ?? '')),
          esc(fmtDeg8(r.lat)),
          esc(fmtDeg8(r.lng)),
          esc(String(r.address ?? '')),
          esc(String(r.note ?? '')),
          esc(String(r.media_kind ?? '')),
          esc(String(r.media_path ?? '')),
          esc(Number(r.observe_count)),
          esc(String(r.observed_at ?? ''))
        ]);
      }
      return rows;
    },
    // CSV ダウンロード（ファイル名は JOB名_件数.csv）
    async downloadCsvForSokui() {
      if (!this.currentJobId) {
        alert('ジョブが未選択です');
        return;
      }

      const rows = await this.createCsvRows()
      const csv = rows.map(r => r.join(',')).join('\r\n') + '\r\n';

      // ファイル名 = JOB名 + ポイント数（既存仕様）
      const jobNameRaw = String(this.currentJobName || 'JOB');
      const jobNameSafe = jobNameRaw.replace(/[\\/:*?"<>|]/g, '_').trim() || 'JOB';
      const pointCount = rows.length - 1;
      const fname = `${jobNameSafe}_${pointCount}点.csv`;

      const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
    },

    // SIMA 出力（A01点列のみ。ラインは規格外のため非対応）
    async downloadSimaForSokui() {
      try {
        const jobId = this.currentJobId;
        if (!jobId) { alert('ジョブを選択してください'); return; }

        let rows = Array.isArray(this.pointsForCurrentJob) ? this.pointsForCurrentJob : [];
        if (!rows.length) {
          const fd = new FormData();
          fd.append('action', 'job_points.list');
          fd.append('job_id', String(jobId));
          const res  = await fetch(this.apiForJobPicker, { method:'POST', body: fd });
          const data = await res.json();
          if (!data?.ok || !Array.isArray(data.data)) { alert('ポイントの取得に失敗しました'); return; }
          rows = data.data;
        }
        if (!rows.length) { alert('このジョブにポイントがありません'); return; }

        const head = [
          `G00,01,OH3出力座標`,
          `Z00,座標データ,`,
          `G01,座標系,${rows[0].crs_label}`,
          `A00,`
        ];

        const num  = (v) => (v===''||v==null) ? NaN : Number(v);
        const fmt3 = (v) => Number.isFinite(Number(v)) ? Number(v).toFixed(3) : '';

        let n = 0;
        const a01 = rows.map(r => {
          const name = String(r.point_name ?? '');
          const X = fmt3(r.x_north);
          const Y = fmt3(r.y_east);

          let Hn = num(r.h_orthometric);
          if (!Number.isFinite(Hn)) {
            const hAtAnt = num(r.h_at_antenna);
            const pole   = num(r.antenna_height);
            if (Number.isFinite(hAtAnt) && Number.isFinite(pole)) Hn = hAtAnt - pole;
          }
          if (!Number.isFinite(Hn)) {
            const eH = num(this?.externalElevation?.hOrthometric);
            if (Number.isFinite(eH)) Hn = eH;
          }
          const hasH = Number.isFinite(Hn);
          const H = hasH ? fmt3(Hn) : null;

          if (!name || !X || !Y) return null;
          n += 1;
          return hasH
              ? `A01,${n},${name},${X},${Y},${H},`
              : `A01,${n},${name},${X},${Y},`;
        }).filter(Boolean);

        if (!a01.length) { console.warn('[sima] no valid rows'); return; }

        const simTxt   = [...head, ...a01].join('\r\n') + '\r\n';
        const sjisBytes = this.$_toShiftJisBytes(simTxt);
        const blob      = new Blob([sjisBytes], { type: 'application/octet-stream' });

        // ===== ここが変更点：CSVと同じ命名規則 =====
        const jobNameRaw  = String(this.currentJobName || 'JOB');
        const jobNameSafe = jobNameRaw.replace(/[\\/:*?"<>|]/g, '_').trim() || 'JOB';
        const pointCount  = a01.length; // 実際に出力したA01件数
        const fname       = `${jobNameSafe}_${pointCount}点.sim`;

        this.$_downloadBlob(blob, fname);
      } catch (e) {
        console.warn('[sima] export error', e);
        alert('SIMA出力に失敗しました');
      }
    },

    /** =========================
     * 杭打関連（測位点登録・赤丸表示・ジョブ管理・結線表示）
     * ========================= */

    // 現在地の緑丸（1個だけ表示）関連
    /** 現在地マーカー（緑丸）を完全削除 */
    clearCurrentDot () {
      const map = (this.$store && this.$store.state && this.$store.state.map01) ? this.$store.state.map01 : this.map01;
      if (!map) return;
      const SRC   = 'oh-current-src';
      const LAYER = 'oh-current';
      try { if (map.getLayer(LAYER)) map.removeLayer(LAYER); } catch(_) {}
      try { if (map.getSource(SRC)) map.removeSource(SRC); } catch(_) {}
    },

    /** 測位ダイアログを閉じる（閉じる際に緑丸も消す） */
    closeTorokuDialog () {
      this.dialogForToroku = false;
      try { this.clearCurrentDot?.(); } catch {}
      this.torokuPointLngLat = null;
    },

    /** 現在地マーカー（緑丸）を 1 個だけ追加 or 更新（座標必須） */
    upsertCurrentMarker(lng, lat) {
      const map = (this.$store?.state?.map01) || this.map01;
      if (!map || !Number.isFinite(lng) || !Number.isFinite(lat)) return;

      const SRC   = 'oh-current-src';
      const LAYER = 'oh-current';

      const fc = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [lng, lat] }
        }]
      };

      if (map.getSource(SRC)) {
        map.getSource(SRC).setData(fc);
      } else {
        map.addSource(SRC, { type: 'geojson', data: fc });
        if (!map.getLayer(LAYER)) {
          map.addLayer({
            id: LAYER,
            type: 'circle',
            source: SRC,
            paint: {
              'circle-radius': 7,
              'circle-color': '#22c55e',       // 緑
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });
        }
      }
    },

    /** 現在地マーカー（緑丸）を完全削除（↑と同義。呼び出し箇所ごとに命名差分あり） */
    clearCurrentMarker() {
      const map = (this.$store?.state?.map01) || this.map01;
      if (!map) return;

      const SRC   = 'oh-current-src';
      const LAYER = 'oh-current';

      try { if (map.getLayer(LAYER)) map.removeLayer(LAYER); } catch {}
      try { if (map.getSource(SRC))  map.removeSource(SRC); } catch {}
    },

// 結線（ライン）表示関連
    /** 結線レイヤのみ完全削除（他点は残す） */
    clearChainLineOnly() {
      try {
        const map = (this.$store?.state?.map01) || this.map01;
        if (!map) return;
        const SRC = 'oh-chain-src';
        const LYR = 'oh-chain-layer';

        try { if (map.getLayer(LYR))  map.removeLayer(LYR); } catch (_) {}
        try { if (map.getSource(SRC)) map.removeSource(SRC); } catch (_) {}
      } catch (e) {
        console.warn('[chain] clearChainLineOnly failed', e);
      }
    },

    /** 現在保持している赤丸（FeatureCollection）から、時系列順の [lng,lat] の配列を構築 */
    buildChainCoordinates() {
      try {
        if (!this._torokuFC || !Array.isArray(this._torokuFC.features)) return [];

        // ① CSV相当の最後列 “観測日時” でソート、②無ければ push 順
        const toKey = (f) => {
          const row = f?.properties?.oh3_csv2_row;
          if (!row) return Number.MAX_SAFE_INTEGER;
          try {
            const arr = Array.isArray(row) ? row : JSON.parse(row);
            const ts  = arr?.[11]; // 12列目(= index 11)
            const t   = new Date(ts).getTime();
            return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
          } catch {
            return Number.MAX_SAFE_INTEGER;
          }
        };

        const feats = [...this._torokuFC.features].filter(f =>
            f?.geometry?.type === 'Point' &&
            Number.isFinite(+f.geometry.coordinates?.[0]) &&
            Number.isFinite(+f.geometry.coordinates?.[1])
        );

        feats.sort((a,b) => toKey(a) - toKey(b));

        return feats.map(f => {
          const c = f.geometry.coordinates;
          return [Number(c[0]), Number(c[1])]; // [lng, lat]
        });
      } catch {
        return [];
      }
    },

    /** ライン（結線モード時のみ）を再描画。点が 2 未満 or 単点モードなら削除 */
    updateChainLine() {
      try {
        const map = (this.$store?.state?.map01) || this.map01;
        if (!map) return;

        const SRC = 'oh-chain-src';
        const LYR = 'oh-chain-layer';

        // 単点 or 点2未満 → ライン削除
        const coords = (this.lineMode === 'chain') ? this.buildChainCoordinates() : [];
        if (!coords || coords.length < 2) {
          try { if (map.getLayer(LYR)) map.removeLayer(LYR); } catch {}
          try { if (map.getSource(SRC)) map.removeSource(SRC); } catch {}
          return;
        }

        const line = {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {}
        };

        if (map.getSource(SRC)) {
          map.getSource(SRC).setData(line);
        } else {
          map.addSource(SRC, { type: 'geojson', data: line });
        }
        if (!map.getLayer(LYR)) {
          map.addLayer({
            id: LYR,
            type: 'line',
            source: SRC,
            paint: {
              'line-width': 3,
              'line-color': '#1e88e5'
            }
          });
          try { map.moveLayer(LYR); } catch {}
        }
      } catch (e) {
        console.warn('[chain] updateChainLine failed', e);
      }
    },

    /** ラインの明示クリア（他からも呼びやすい名前） */
    clearChainLine() {
      const map = (this.$store?.state?.map01) || this.map01;
      if (!map) return;
      const SRC = 'oh-chain-src';
      const LYR = 'oh-chain-layer';
      try { if (map.getLayer(LYR)) map.removeLayer(LYR); } catch {}
      try { if (map.getSource(SRC)) map.removeSource(SRC); } catch {}
    },

    /** 単点/結線モードの切替（観測中は不可）＋即時更新 */
    setLineMode(mode) {
      if (mode !== 'point' && mode !== 'chain') return;
      if (this.kansokuPhase === 'observing') return;
      this.lineMode = mode;
      this.updateChainLine();
    },

    // ジョブ管理（Picker/作成/削除/選択/一覧）
    /** ジョブピッカーを開き、サーバ一覧を最新化 */
    openJobPicker() {
      this.jobPickerOpen = true;
      this.$store.dispatch('messageDialog/open', {
        id: 'openJobPicker',
        title: '次の操作は？',
        contentHtml: '<p style="margin-bottom: 20px;">新規ジョブの作成、または既存のジョブを選択して下さい。</p>' +
            '<p style="color: red; font-weight: 900;">初めての方は新規ジョブを作成してください。</p>',
        options: { maxWidth: 400, showCloseIcon: true, dontShowKey: this.dontShowKey }
      })
      // this.showJobListOnly = true
      this.refreshJobs();
    },

    /** 新規ジョブ作成 → 現在ジョブに設定 → 一覧更新 → ピッカー閉じ */
    async createNewJob() {
      this.jobNameError = '';
      const job_name = (this.jobName || '').trim();
      if (!job_name) { this.jobNameError = 'ジョブ名を入力してください'; return; }
      if (job_name.length > 64) { this.jobNameError = '64文字以内で入力してください'; return; }
      const exists = this.jobList.some(j => j.name === job_name)
      if (exists) { this.jobNameError = '同名のジョブが存在します'; return; }

      this.onJobEndClick(false);

      const fd = new FormData();
      fd.append('action','jobs.create');
      fd.append('user_id',this.userId);
      fd.append('user_name',this.myNickname);
      fd.append('job_name',job_name);

      const r = await fetch(this.apiForJobPicker, { method:'POST', body: fd });
      const rJson = await r.json();

      // ★ ここを追加：作成直後に現在ジョブへ反映
      this.currentJobId   = String(rJson.data.job_id);
      this.currentJobName = job_name;
      localStorage.setItem('oh3_current_job_id',   this.currentJobId);
      localStorage.setItem('oh3_current_job_name', this.currentJobName);

      await this.onJobCreatedSuccess();
      if (this.dontShowKey) {
        this.jobPickerOpen = false;
        this.$store.dispatch('hideFloatingWindow', 'job-picker');
        this.startTorokuHere()
      }
    },

    /** 新規作成成功後の一覧更新 */
    async onJobCreatedSuccess() {
      await this.refreshJobs();
    },

    /** サーバからジョブ一覧取得 → UIへ反映 */
    async refreshJobs() {
      const fd = new FormData();
      fd.append('action', 'jobs.list');
      fd.append('user_id', this.userId);
      const res = await fetch(this.apiForJobPicker, {
          method: 'POST',
          body: fd,
        });
      const data = await res.json()
      if (!data.ok) {
        const msg = data.error || 'サーバーエラー';
        alert('ジョブ一覧の取得に失敗しました：' + msg);
        console.error('[jobs.list] server says:', data);
        return;
      }
      const toUi = (r) => ({
        id: String(r.job_id),
        name: r.job_name,
        note: r.note,
        createdAt: r.created_at,
        count: Number(r.point_count ?? 0),
      });
      this.jobList = Array.isArray(data.data) ? data.data.map(toUi) : [];
    },

    /** 既存ジョブ選択 → 現在ジョブに設定 */
    async pickExistingJob(job) {
      const hideTips = this.dontShowKey && localStorage.getItem(this.dontShowKey) === '1'
      if (!hideTips) {
        this.$store.dispatch('messageDialog/open', {
          id: 'openJobPicker',
          title: '次の操作は？',
          contentHtml:
              '<p style="margin-bottom: 20px;">測位するにはジョブリスト右上の<span style="color: navy; font-weight: 900;">『測位』</span>ボタンを操作してください。</p>' +
              '<p>測位データのダウンロードは、画面左下のボタンを操作して下さい。</p>',
          options: { maxWidth: 400, showCloseIcon: true, dontShowKey: this.dontShowKey }
        });
      }
      this.pointsForCurrentJob = [];
      this.currentJobId   = job.id;
      this.currentJobName = job.name;

      await this.loadPointsForJob(this.currentJobId);

      if (this.autoCloseJobPicker) {
        this.jobPickerOpen = false;
        this.$store.dispatch('hideFloatingWindow', 'job-picker')
      }
    },

    /** 指定ジョブの測位点をサーバから取得し、地図へ一括反映 + 結線更新 + fitBounds */
    async loadPointsForJob(jobId, options = { fix: false, fit: true }) {
      const fd = new FormData();
      fd.append('action', 'job_points.list');
      fd.append('job_id', String(jobId));

      const res = await fetch(this.apiForJobPicker, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data?.ok || !Array.isArray(data.data)) {
        console.error('[job_points.list] サーバーエラー', data);
        alert('測位点の取得に失敗しました');
        return;
      }

      this.pointsForCurrentJob = Array.isArray(data.data) ? data.data : [];

      const fmt3    = v => (Number.isFinite(Number(v)) ? Number(v).toFixed(3) : '');
      const fmtPole = v => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : '');
      const fmtDeg8 = v => (Number.isFinite(Number(v)) ? Number(v).toFixed(8) : '');

      const features = [];

      // 手計算のバウンディングボックス（本処理）
      let minLng =  Infinity, minLat =  Infinity;
      let maxLng = -Infinity, maxLat = -Infinity;

      let ok = 0, skip = 0;

      for (const r of this.pointsForCurrentJob) {
        const name   = String(r.point_name ?? '');
        const Xavg   = Number(r.x_north);
        const Yavg   = Number(r.y_east);
        const hOrtho = Number(r.h_orthometric);
        const pole   = Number(r.antenna_height);
        const hAtAnt = Number(r.h_at_antenna);
        const hae    = Number(r.hae_ellipsoidal);
        const diff   = Number(r.xy_diff);
        const cs     = String(r.crs_label ?? '');
        const ts     = String(r.observed_at ?? '');
        const lng    = Number(r.lng);
        const lat    = Number(r.lat);
        const note   = String(r.note);
        const address = String(r.address);
        const mediaKind = String(r.media_kind);
        const mediaPath = String(r.media_path);

        const hasLngLat = Number.isFinite(lng) && Number.isFinite(lat);

        if (!hasLngLat) { skip += 1; continue; }
        ok += 1;

        // bbox 更新
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;

        const rowArray = [
          name, fmt3(Xavg), fmt3(Yavg), fmt3(hOrtho), fmtPole(pole),
          fmt3(hAtAnt), fmt3(hae), fmt3(diff), cs, fmtDeg8(lat), fmtDeg8(lng),
          address,
          note, mediaKind, mediaPath,
          ts
        ];

        features.push({
          type: 'Feature',
          properties: {
            id: String(r.point_id),
            label: name,
            name:  name,
            oh3_csv2_row: rowArray,
            pendingLabel: false
          },
          geometry: { type: 'Point', coordinates: [lng, lat] }
        });
      }

      const map = this.map01;
      this._torokuFC = { type: 'FeatureCollection', features };
      this.setSourceAndLayer(this._torokuFC)
      if(this._torokuFC.features.length > 0){
        if (!options.fix) {
          if (options.fit) {
            map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80, maxZoom: 18, duration: 0 });
          } else {
            const first = this.pointsForCurrentJob[0]
            map.setCenter([first.lng, first.lat]);
          }
        }
      }
      this.updateChainLine();
    },

    /** ジョブ削除（サーバ消去が成功したらUI側も除去） */
    async deleteJob(job) {
      const id = String(job.id);
      if (!id) return;
      const ok = await this.confirm({
        message: `このジョブを削除しますか？<br>ID: ${id}<br>名前: ${job.name}`,
      })
      if (!ok) return
      console.log('削除実行')

      const fd = new FormData();
      fd.append('action', 'jobs.delete');
      fd.append('job_id', id);

      try {
        const res = await fetch(this.apiForJobPicker, { method: 'POST', body: fd });
        const data = await res.json();
        if (!data?.ok) {
          alert('削除に失敗しました：' + (data?.error || 'サーバーエラー'));
          return;
        }

        // 一覧から除去
        this.jobList = this.jobList.filter(j => String(j.id) !== id);

        // ★ ここがポイント：現在のJOBを消したなら、赤丸/線/一覧を全クリア
        if (String(this.currentJobId) === id) {
          this.currentJobId   = null;
          this.currentJobName = '';

          // 地図の赤丸（登録点）とラベルを消す
          const map = this.map01;
          if (map) {
            try { if (map.getLayer(this.LAB)) map.removeLayer(this.LAB); } catch {}
            try { if (map.getLayer(this.LAYER))   map.removeLayer(this.LAYER); }   catch {}
            try { if (map.getSource(this.SRC)) map.removeSource(this.SRC); } catch {}
          }

          // 内部キャッシュも空に
          this._torokuFC = { type: 'FeatureCollection', features: [] };
          this.pointsForCurrentJob = [];
          this.torokuPointLngLat = null;

          // 結線も消す
          this.clearChainLine()
        }

        // バッジ/一覧を再取得
        await this.refreshJobs()

      } catch (e) {
        console.error('[jobs.delete] 失敗', e);
        alert('削除に失敗しました：' + (e?.message || e));
      }
    },

    /** ピッカーからポイント削除 → サーバ成功後に UI/地図も同期 */
    async deletePoint(pt) {
      const pointId = String(pt.point_id);
      if (!pointId) return;
      const ok = await this.confirm({
        message: `このポイントを削除しますか？<br>ID: ${pointId}<br>点名: ${pt.point_name}`,
      })
      if (!ok) return
      const fd = new FormData();
      fd.append('action', 'job_points.delete');
      fd.append('point_id', pointId);

      try {
        const res = await fetch(this.apiForJobPicker, {
          method: 'POST',
          body: fd,
        });
        const data = await res.json();
        if (!data.ok) {
          alert('ポイント削除に失敗：' + (data.error || 'サーバーエラー'));
          return;
        }
        // 1) 一覧（=唯一の真実源）から除去
        this.pointsForCurrentJob = this.pointsForCurrentJob.filter(x =>
            String(x.point_id) !== pointId
        );
        // 2) 地図も同期
        await this.loadPointsForJob(this.currentJobId, {fix : true});
        // サーバからジョブ一覧取得 → UIへ反映
        await this.refreshJobs();
      } catch (e) {
        console.error('[job_points.delete] 失敗', e);
        alert('削除に失敗しました：' + (e?.message || e));
      }
    },

    // 測位点（赤丸）: 設置/クリック/レイヤ管理
    /** マップ中央のゾーンから座標系ラベルを推定し store に反映 */
    zahyoGet() {
      const map = this.map01
      const center = map.getCenter();
      const centerPoint = map.project([center.lng, center.lat]);
      const features = map.queryRenderedFeatures(centerPoint, { layers: ['zones-layer'] });
      if (features.length > 0) {
        const zoneFeature = features[0];
        const zone = zoneFeature.properties.zone;
        this.$store.state.zahyokei = '公共座標' + zone + '系';
      } else {
        this.$store.state.zahyokei = '';
      }
    },

    /** 既存の赤丸レイヤ/ソースを全削除（座標もクリア） */
    clearTorokuPoint () {
      const map = this.map01; if (!map) return;
      try { if (map.getLayer(this.LAYER)) map.removeLayer(this.LAYER); } catch(_) {}
      try { if (map.getLayer(this.LAB)) map.removeLayer(this.LAB); } catch(_) {}
      try { if (map.getSource(this.SRC)) map.removeSource(this.SRC); } catch(_) {}
      this.torokuPointLngLat = null;
      this.updateChainLine(); // 結線も消す
    },

    /**  */
    startTorokuHere () {
      this.$store.dispatch('hideFloatingWindow', 'job-picker');
      this.detachGpsLineClick();
      this.clearGpsLine();
      this.gpsLineAnchorLngLat = null;
      this.enableGpsLineClick  = false;
      this.distance = null;
      this.isTracking = false;
      this.s_isKuiuchi = false;

      try { if (this._torokuDialogTimer) { clearTimeout(this._torokuDialogTimer); this._torokuDialogTimer = null; } } catch {}
      this._torokuDialogOpened = false;

      if (!(navigator && navigator.geolocation)) {
        console.warn('[startTorokuHere] geolocation not supported');
        return;
      }

      const _this = this;
      if (typeof _this.rtkWindowMs !== 'number') _this.rtkWindowMs = 1000;
      if (typeof _this.lastRtkAt   !== 'number') _this.lastRtkAt   = 0;

      const opt = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 };

      navigator.geolocation.getCurrentPosition(
          function success (pos) {
            const c   = pos && pos.coords ? pos.coords : {};
            const lat = (typeof c.latitude  === 'number') ? c.latitude  : null;
            const lon = (typeof c.longitude === 'number') ? c.longitude : null;
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
              console.warn('[startTorokuHere] invalid geolocation coords', c);
              return;
            }

            const acc    = (typeof c.accuracy === 'number') ? c.accuracy : null;
            const altAcc = (typeof c.altitudeAccuracy === 'number') ? c.altitudeAccuracy : null;

            const q      = _this.getGeoQualityLabel(acc, altAcc);

            const nowTs = pos.timestamp || Date.now();
            if (q === 'RTK級') {
              _this.lastRtkAt = nowTs;
            } else if (_this.lastRtkAt && (nowTs - _this.lastRtkAt) <= _this.rtkWindowMs) {
              return;
            }

            _this.torokuPointLngLat = { lng: lon, lat };
            _this.upsertCurrentMarker(lon, lat);   // 緑丸

            const meta = { quality: q || 'unknown', at: Date.now(), source: 'navigator' };
            _this.torokuPointMeta      = meta;
            _this.torokuPointQuality   = meta.quality;
            _this.torokuPointQualityAt = meta.at;

            try { _this.$emit?.('toroku-point', { lng: lon, lat }); } catch {}
            try { window.dispatchEvent(new CustomEvent('oh3:toroku:point', { detail: { lngLat: { lng: lon, lat } } })); } catch {}

            const map = _this.map01;

            const openDialogOnce = () => {
              if (_this._torokuDialogOpened) return;
              _this._torokuDialogOpened = true;
              _this.kansokuRunning   = false;
              _this.kansokuRemaining = 0;
              _this.kansokuCsvRows   = null;
              _this.dialogForToroku  = true;
              _this.$store.dispatch('messageDialog/open', {
                id: 'openJobPicker',
                title: '次の操作は？',
                contentHtml: '<p style="margin-bottom: 20px;">測位するには左の<span style="color: navy; font-weight: 900;">『測位開始』</span>ボタンをクリックしてください。</p>',
                options: { maxWidth: 400, showCloseIcon: true, dontShowKey: _this.dontShowKey }
              })
            };
            map.easeTo({ center: [lon, lat], duration: _this.torokuAnimMs });
            _this._torokuDialogOpened = false;
            const fallbackMs = _this.torokuAnimMs + _this.torokuDialogDelayMs + 300;
            _this._torokuDialogTimer = setTimeout(openDialogOnce, fallbackMs);
          },
          function error (err) {
            console.warn('[startTorokuHere] getCurrentPosition error', err);
          },
          opt
      );
    },

    /** 確定赤丸描画：確定座標と点名で赤丸を追加（レイヤは既存前提） */
    confirmTorokuPointAtCurrent(name, rowArray) {
      const map = this.map01;
      const SRC   = this.SRC;
      const LAYER = this.LAYER;
      const LAB   = this.LAB;

      // ★ 座標は “常に” torokuPointLngLat から取得（pending/lastIdは使わない）
      const lng = Number(this.torokuPointLngLat.lng);
      const lat = Number(this.torokuPointLngLat.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        console.warn('[toroku] confirm failed: no torokuPointLngLat');
        return;
      }

      // ★ 赤丸フィーチャを追加
      const fid = 'pt_' + Date.now() + '_' + (Math.random() * 1e6 | 0);
      const feature = {
        type: 'Feature',
        properties: {
          id: fid,
          label: String(name || ''),
          name:  String(name || ''),
          oh3_csv2_row: JSON.stringify(rowArray)
        },
        geometry: { type: 'Point', coordinates: [lng, lat] }
      };

      if (!this._torokuFC) this._torokuFC = { type: 'FeatureCollection', features: [] };
      this._torokuFC.features.push(feature);

      // ★ 地図へ反映（なければ作成／あれば更新）
      if (map.getSource(SRC)) {
        map.getSource(SRC).setData(this._torokuFC);
      } else if (map) {
        map.addSource(SRC, { type: 'geojson', data: this._torokuFC });
        if (!map.getLayer(LAYER)) {
          map.addLayer({
            id: LAYER, type: 'circle', source: SRC,
            paint: {
              'circle-radius': 6,
              'circle-color': '#ff3b30',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });
        }
        if (!map.getLayer(LAB)) {
          map.addLayer({
            id: LAB, type: 'symbol', source: SRC,
            layout: {
              'text-field': ['get', 'label'],
              'text-size': 16,
              'text-offset': [0, 0.5],
              'text-anchor': 'top',
              'text-allow-overlap': true
            },
            paint: { 'text-halo-color': '#ffffff', 'text-halo-width': 1.0 }
          });
        }
      }
      // ★ 最後に内部状態を最新座標で保持（今後の処理でも使うため）
      this.torokuPointLngLat = { lng, lat };
    },

    /** ジョブ終了処理 */
    onJobEndClick() {
      // まず緑丸を必ず消す
      this.clearCurrentMarker();
      try {
        if (this.kansokuTimer) { clearInterval(this.kansokuTimer); this.kansokuTimer = null; }
      } catch {}
      this.kansokuRunning   = false;
      this.kansokuRemaining = 0;

      this.clearTorokuPoint();
      this._torokuFC = { type: 'FeatureCollection', features: [] };
      this.torokuPointLngLat = null;

      this.kansokuCsvRows = null;
      this.csv2Points = [];

      this.currentJobId = null;
      this.currentJobName = '';
      localStorage.removeItem('oh3_current_job_id');
      localStorage.removeItem('oh3_current_job_name');

      this.pointsForCurrentJob = [];
      this.clearChainLineOnly()
    },

    // 現在地追跡（watchPosition）・距離線 UI
    /**
     * ポーリング版
     */
    startWatchPosition () {
      if (!('geolocation' in navigator)) {
        console.warn('[geo] navigator.geolocation 未対応');
        return;
      }
      // 既存の停止処理（watch用）。加えてポーリング用タイマーも潰す
      try { this.stopWatchPosition(); } catch (_) {}
      if (this.geoPollTimer) { clearInterval(this.geoPollTimer); this.geoPollTimer = null; }

      const opt = { enableHighAccuracy: true, maximumAge: 0, timeout: 900 }; // 1秒ポーリングに合わせて短め
      let busy = false; // 重複リクエスト防止ローカルフラグ

      const tick = () => {
        if (busy) return;
        busy = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
              this.geoLastTs = position.timestamp || Date.now();
              try {
                const isUpdateLocation = this.saveGeoMetrics(position);
                if (isUpdateLocation) {
                  const c = position.coords || {};
                  const acc    = (typeof c.accuracy === 'number') ? c.accuracy : null;
                  const altAcc = (typeof c.altitudeAccuracy === 'number') ? c.altitudeAccuracy : null;
                  const quality = this.getGeoQualityLabel(acc, altAcc);
                  const nowTs = position.timestamp || Date.now();

                  const allowUpdate =
                      quality === 'RTK級' ||
                      !this.lastRtkAt ||
                      (nowTs - this.lastRtkAt) > this.rtkWindowMs;

                  if (allowUpdate) {
                    if (quality === 'RTK級') this.lastRtkAt = nowTs;

                    this.currentLngLat = [
                      Number(position.coords.longitude),
                      Number(position.coords.latitude)
                    ];

                    this.maybeFocusCenterIncludePoint(
                        this.currentLngLat,
                        this.snapLngLat,
                        { padding: this.isSmall500 ? 80 : 120, animate: true }
                    );

                    this.updateLocationAndCoordinates(position);
                  } else {
                    this.$store.state.loading3 = true;
                    this.$store.state.loadingMessage3 = '座標品質悪化';
                    setTimeout(() => { this.$store.state.loading3 = false; }, 1000);
                  }
                }
              } catch (e) {
                console.warn('[geo] update/save error', e);
              } finally {
                busy = false;
              }
            },
            (error) => {
              console.warn('[geo] error(getCurrentPosition)', error);
              busy = false;
            },
            opt
        );
      };

      // 起動時のUI状態・ログは従来どおり
      this.isTracking = !this.s_isKuiuchi;
      try { history('現在位置単発取得ポーリング開始(1s)', window.location.href); } catch(_) {}

      this.attachGpsLineClick();
      try { if (this.logEnabled) this.maybeLogPoint('start'); } catch(_) {}

      // 1秒ごとに単発取得。即時1回も実行。
      this.geoPollTimer = setInterval(tick, 1000);
      tick();
    },
    /**
     * 通常版
     */
//     startWatchPosition () {
//       if (!('geolocation' in navigator)) {
//         console.warn('[geo] navigator.geolocation 未対応');
//         return;
//       }
//       this.stopWatchPosition();
//
//       const opt = { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 };
//       this.watchId = navigator.geolocation.watchPosition(
//           (position) => {
//             this.geoLastTs = position.timestamp || Date.now();
//             try {
//               const isUpdateLocation = this.saveGeoMetrics(position);
//               if (isUpdateLocation) {
//                 /**
//                  * ここらへんに仕掛ければいいか？
//                  */
//                 // 位置更新ハンドラ内（this 版）
//                 const c = position.coords || {};
//                 const acc    = (typeof c.accuracy === 'number') ? c.accuracy : null;
//                 const altAcc = (typeof c.altitudeAccuracy === 'number') ? c.altitudeAccuracy : null;
//                 const quality = this.getGeoQualityLabel(acc, altAcc);
//                 const nowTs = position.timestamp || Date.now();
//                 // RTK抑止ウィンドウ判定
//                 const allowUpdate =
//                     quality === 'RTK級' ||
//                     !this.lastRtkAt ||
//                     (nowTs - this.lastRtkAt) > this.rtkWindowMs;
//                 // ←← 通常処理は if の中だけで実行
//                 if (allowUpdate) {
//                   if (quality === 'RTK級') {
//                     this.lastRtkAt = nowTs; // RTK級検出時は基準更新
//                   }
//                   this.currentLngLat = [
//                     Number(position.coords.longitude),
//                     Number(position.coords.latitude)
//                   ];
//                   this.maybeFocusCenterIncludePoint(
//                       this.currentLngLat,
//                       this.snapLngLat,
//                       { padding: this.isSmall500 ? 80 : 120, animate: true }
//                   );
//                   this.updateLocationAndCoordinates(position);
//                 } else {
//                   this.$store.state.loading3 = true
//                   this.$store.state.loadingMessage3 = '座標品質悪化'
//                   setTimeout(() => {
//                     this.$store.state.loading3 = false
//                   },1000)
//                 }
//               }
//             } catch (e) {
//               console.warn('[geo] update/save error', e);
//             }
//           },
//           (error) => {
//             console.warn('[geo] error', error);
//           },
//           opt
//       );
//
//       if (this.s_isKuiuchi) {
//         this.isTracking = false;
//       } else {
//         this.isTracking = true;
//       }
//       try { history('現在位置継続取得スタート(最小)', window.location.href); } catch(_) {}
//
//       this.attachGpsLineClick();
//
//       try { if (this.logEnabled) this.maybeLogPoint('start'); } catch(_) {}
//     },
    stopWatchPosition () {
      if (this.watchId !== null) {
        try { navigator.geolocation.clearWatch(this.watchId); } catch(_) {}
        this.watchId = null;
      }

      this.detachGpsLineClick();
      this.clearGpsLine();
      this.gpsLineAnchorLngLat = null;
      this.distance = null

      try { if (this.logEnabled) this.maybeLogPoint('stop'); } catch(_) {}
    },
    saveGeoMetrics (pos) {
      try {
        this.rtkWindowMs = (this.rtkWindowMs ?? 1000);
        this.lastRtkAt   = (this.lastRtkAt   ?? 0);

        const c = pos.coords || {};
        const now = pos.timestamp || Date.now();
        const s = this.$store?.state; if (!s) return;

        const prev = s.geo || {};
        const alpha = this.geoAccAvgAlpha;
        const ewma = (prevVal, newVal) => {
          if (newVal == null || Number.isNaN(newVal)) return prevVal ?? null;
          if (prevVal == null) return newVal;
          return alpha * newVal + (1 - alpha) * prevVal;
        };

        const accuracy = (typeof c.accuracy === 'number') ? c.accuracy : null;
        const altitudeAccuracy = (typeof c.altitudeAccuracy === 'number') ? c.altitudeAccuracy : null;
        const speed = (typeof c.speed === 'number') ? c.speed : null;
        const heading = (typeof c.heading === 'number') ? c.heading : null;
        const accuracyAvg = ewma(prev.accuracyAvg, accuracy);
        const quality = this.getGeoQualityLabel(accuracy, altitudeAccuracy);

        const geo = {
          time: now,
          lat: (typeof c.latitude === 'number') ? c.latitude : prev.lat ?? null,
          lon: (typeof c.longitude === 'number') ? c.longitude : prev.lon ?? null,
          altitude: (typeof c.altitude === 'number') ? c.altitude : prev.altitude ?? null,
          accuracy,
          accuracyAvg,
          altitudeAccuracy,
          speed,
          heading,
          quality,
          source: 'navigator',
        };

        const nowTs = pos.timestamp || Date.now();
        if (quality === 'RTK級') {
          this.lastRtkAt = nowTs;
        }
        if (quality !== 'RTK級' && this.lastRtkAt && (nowTs - this.lastRtkAt) <= this.rtkWindowMs) {
          return false;
        }

        s.geo = geo;
        console.log(s.geo)
        this.prevQuality = quality;

        try { this.maybeLogPoint('point'); } catch(_) {}

        try { if (this.gpsLineAnchorLngLat) this.drawGpsLine(this.gpsLineAnchorLngLat); } catch (_) {}

        return true;
      } catch (e) {
        console.warn('[geo] saveGeoMetrics error', e);
      }
    },
    getGeoQualityLabel (acc, altAcc) {
      if (acc == null) return 'unknown';
      if (acc <= 1)  return 'RTK級';
      if (acc <= 3)  return '高';
      if (acc <= 10) return '中';
      if (acc <= 30) return '低';
      return '低';
    },
    drawGpsLine (clickLngLat) {
      const map = this.$store?.state?.map01;
      if (!map) return;

      const s = this.$store?.state || {};
      const geo = s.geo;
      if (!geo || geo.lat == null || geo.lon == null) return;

      const epsg = epsgFromZahyokei(s.s_zahyokei || s.zahyokei, zahyokei);
      if (!epsg) return;

      let p1;
      let anchorProps = null;
      if (clickLngLat && clickLngLat.__anchor) {
        p1 = { lng: clickLngLat.lng, lat: clickLngLat.lat };
        anchorProps = clickLngLat.properties || null;
      } else {
        const snapped = pickNearestVertex(map, clickLngLat, 16, this.snapLayerIds);
        if (!snapped) return;
        p1 = { lng: snapped.lng, lat: snapped.lat };
        anchorProps = snapped.properties || null;
        this.gpsLineAnchorLngLat = { ...p1, __anchor: true, properties: anchorProps };
        try { if (this.logEnabled) this.maybeLogPoint('anchor'); } catch(_) {}
      }

      const p2 = { lng: geo.lon, lat: geo.lat };

      const fromProps = xyFromProps(anchorProps);
      let p1xy;
      if (fromProps) {
        p1xy = { x: fromProps.x, y: fromProps.y };
        console.log('[gps-line] 終点(アンカー)に使用したプロパティ:', {
          keyX: fromProps._meta.keyX, keyY: fromProps._meta.keyY,
          X: fromProps._meta.valueX,  Y: fromProps._meta.valueY,
          featurePropsSample: anchorProps
        });
      } else {
        p1xy = xyFromLngLat(p1.lng, p1.lat, epsg);
        if (!p1xy) return;
        console.log('[gps-line] 終点(アンカー)XYは WGS84→EPSG 変換で取得(スワップ適用):', {
          lng: p1.lng, lat: p1.lat, epsg,
          X: p1xy.x, Y: p1xy.y
        });
      }

      const jdp = this.$store?.state?.jdpCoordinates;
      if (!Array.isArray(jdp) || jdp.length < 2) return;
      const p2xy = { x: Number(jdp[1]), y: Number(jdp[0]) };
      if (!Number.isFinite(p2xy.x) || !Number.isFinite(p2xy.y)) return;
      console.log('[gps-line] 始点(現在地)XY:', { X: p2xy.x, Y: p2xy.y, jdpCoordinates: jdp });

      const dx = p2xy.x - p1xy.x;
      const dy = p2xy.y - p1xy.y;
      const meters = Math.hypot(dx, dy);

      const mid = turf.midpoint([p1.lng, p1.lat], [p2.lng, p2.lat]);

      let text;
      if (meters < 1)         text = `約${(meters * 100).toFixed(0)}cm`;
      else if (meters < 1000) text = `約${meters.toFixed(2)}m`;
      else                    text = `約${(meters/1000).toFixed(2)}km`;

      this.distance = `距離= ${text}`;

      const toRad = (d) => d * Math.PI / 180;
      const lon1 = toRad(p1.lng), lat1 = toRad(p1.lat);
      const lon2 = toRad(p2.lng), lat2 = toRad(p2.lat);
      const dLon = lon2 - lon1;
      const yb = Math.sin(dLon) * Math.cos(lat2);
      const xb = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      let bearing = (Math.atan2(yb, xb) * 180 / Math.PI + 360) % 360;
      bearing = (bearing + 90) % 360;
      if (bearing > 90 && bearing <= 270) bearing = (bearing + 180) % 360;

      const LINE_SRC   = 'oh-gps-line-src';
      const LINE_LAYER = 'oh-gps-line';
      const LAB_SRC    = 'oh-gps-line-label-src';
      const LAB_LAYER  = 'oh-gps-line-label';

      const line = turf.lineString([[p1.lng, p1.lat], [p2.lng, p2.lat]]);
      if (map.getSource(LINE_SRC)) map.getSource(LINE_SRC).setData(line);
      else map.addSource(LINE_SRC, { type: 'geojson', data: line });

      if (!map.getLayer(LINE_LAYER)) {
        map.addLayer({
          id: LINE_LAYER,
          type: 'line',
          source: LINE_SRC,
          paint: { 'line-color': '#00B8D9', 'line-width': 3 }
        });
      }

      const labelFC = turf.featureCollection([
        turf.point(mid.geometry.coordinates, { label: text, angle: bearing })
      ]);

      if (map.getSource(LAB_SRC)) map.getSource(LAB_SRC).setData(labelFC);
      else map.addSource(LAB_SRC, { type: 'geojson', data: labelFC });

      if (!map.getLayer(LAB_LAYER)) {
        map.addLayer({
          id: LAB_LAYER,
          type: 'symbol',
          source: LAB_SRC,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 14,
            'text-allow-overlap': true,
            'text-rotation-alignment': 'map',
            'text-rotate': ['get', 'angle']
          },
          paint: { 'text-halo-color': 'white', 'text-halo-width': 1.5 }
        });
      }

      // snap で相手ポイント座標が決まった直後
      this.snapLngLat = [p1.lng, p1.lat]
      this.focusCenterIncludePoint(this.currentLngLat, this.snapLngLat, { padding: this.isSmall500 ? 80 : 120, animate: true })

      // this.focusTwoPoints([p1.lng, p1.lat], this.currentLngLat, { duration: 1000 });

    },

    attachGpsLineClick () {
      const map = this.$store?.state?.map01;
      if (!map) return;

      if (this.onMapClickForGpsLine) {
        this.enableGpsLineClick = true;
        return;
      }

      const bind = () => {
        this.enableGpsLineClick = true;
        this.onMapClickForGpsLine = (e) => {
          if (!this.enableGpsLineClick) return;
          if (!e || !e.lngLat) return;
          this.drawGpsLine(e.lngLat);
        };
        map.on('click', this.onMapClickForGpsLine);
      };

      try {
        if (map.isStyleLoaded && map.isStyleLoaded()) bind();
        else map.once('load', bind);
      } catch (_) {
        map.once('load', bind);
      }
    },
    detachGpsLineClick () {
      const map = this.$store?.state?.map01;
      if (!map) return;
      if (this.onMapClickForGpsLine) {
        try { map.off('click', this.onMapClickForGpsLine); } catch(_) {}
        this.onMapClickForGpsLine = null;
      }
      this.enableGpsLineClick = false;
    },
    clearGpsLine () {
      const map = this.$store?.state?.map01;
      if (!map) return;
      const LINE_SRC   = 'oh-gps-line-src';
      const LINE_LAYER = 'oh-gps-line';
      const LAB_SRC    = 'oh-gps-line-label-src';
      const LAB_LAYER  = 'oh-gps-line-label';
      try { if (map.getLayer(LAB_LAYER)) map.removeLayer(LAB_LAYER); } catch(_) {}
      try { if (map.getSource(LAB_SRC)) map.removeSource(LAB_SRC); } catch(_) {}
      try { if (map.getLayer(LINE_LAYER)) map.removeLayer(LINE_LAYER); } catch(_) {}
      try { if (map.getSource(LINE_SRC)) map.removeSource(LINE_SRC); } catch(_) {}
    },
    async watchPosition (up) {
      this.dialogForWatchPosition = false;
      if (up === 'h') {
        this.isHeadingUp = true;  try { this.compass?.turnOn?.(); } catch(_) {}
      } else {
        this.isHeadingUp = false; try { this.compass?.turnOff?.(); } catch(_) {}
      }
      try { this.currentMarker?.remove?.(); } catch(_) {}
      this.startWatchPosition();
    },

    maybeLogPoint(eventType = 'point') {
      if (!this.logEnabled) return;

      const s = this.$store?.state || {};
      const geo = s.geo; if (!geo) return;

      const csLabel = s.s_zahyokei || s.zahyokei || '';

      const jdp = s.jdpCoordinates;
      if (!Array.isArray(jdp) || jdp.length < 2) return;
      const xN = Number(jdp[1]);
      const yE = Number(jdp[0]);
      if (!Number.isFinite(xN) || !Number.isFinite(yE)) return;

      const now = Date.now();

      if (this.lastLogAt && (now - this.lastLogAt) < this.minLogIntervalMs) return;

      if (this.lastLogXY) {
        const dx = xN - this.lastLogXY.x;
        const dy = yE - this.lastLogXY.y;
        const dd = Math.hypot(dx, dy);
        if (dd < this.minLogDistanceM) return;
      }

      if (!this.csvRows) {
        this.csvRows = [[
          'timestamp','lat','lon','X','Y','CRS',
          'accuracy','quality','eventType'
        ]];
      }
      this.csvRows.push([
        this.$_jstLocal(),
        geo.lat, geo.lon,
        xN, yE, csLabel,
        geo.accuracy,
        geo.quality,
        eventType
      ]);
      this.lastLogAt = now;
      this.lastLogXY = { x: xN, y: yE };
    },

    // 点名（連番）管理
    loadTenmeiFromStorage() {
      try {
        const v = localStorage.getItem('tenmei') || '';
        this.tenmei = String(v);
        this.tenmeiError = '';
      } catch (_) {}
    },
    handleTenmeiInput(v) {
      if (v && v.target && typeof v.target.value !== 'undefined') v = v.target.value;
      let s = (v == null) ? '' : String(v).trim();
      s = s.replace(/[\r\n]/g, '').replace(/,/g, '');
      this.tenmei = s;
      this.tenmeiError = '';
      try { localStorage.setItem('tenmei', s); } catch (_) {}
    },
    ensureUniqueTenmei(base) {
      const name = (base || '').trim();
      if (!name) return '';

      // 既に使われている名称の集合をサーバー・地図・ローカルから統合
      const used = new Set();

      // a) サーバー由来（ジョブ内の既存点）
      if (Array.isArray(this.pointsForCurrentJob)) {
        for (const p of this.pointsForCurrentJob) {
          const n = p.point_name ?? p.name;
          if (n) used.add(String(n));
        }
      }

      // b) 地図上に描画済み（現在セッション内）
      if (this._torokuFC?.features) {
        for (const f of this._torokuFC.features) {
          const n = f.properties.name ?? f.properties.label;
          if (n) used.add(String(n));
        }
      }

      // c) ローカル一時（未送信の csv2Points など）
      if (Array.isArray(this.csv2Points)) {
        for (const p of this.csv2Points) {
          const n = p.name;
          if (n) used.add(String(n));
        }
      }

      // そのまま空いていれば採用
      if (!used.has(name)) return name;

      // 末尾が数字なら +1、なければ 1 を付与して空くまでインクリメント
      const m = name.match(/^(.*?)(\d+)$/);
      const root = m ? m[1] : name;
      let n = m ? (parseInt(m[2], 10) + 1) : 1;

      let cand = root + String(n);
      while (used.has(cand)) { n += 1; cand = root + String(n); }
      return cand;
    },

    // 汎用ユーティリティ（日時/保存/クランプ/終了処理）
    // 色分け: 較差 <=0.02: success, <=0.05: warning, それ以外: error

    fmtLL(v) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(5) : v; },
    fmtXY(v) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(3) : v; },
    fmtAcc(v){ const n = Number(v); return Number.isFinite(n) ? n.toFixed(2) : v; },
    fmtHumanHeight(v) {
      if (v == null || v === '') return '';
      const nDirect = Number(v);
      if (Number.isFinite(nDirect)) return nDirect.toFixed(3);
      const n = this.parseNumberLike(v);
      if (n == null) return '';
      return n.toFixed(3);
    },
    $_jstLocal() {
      const p = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tokyo',
        year:'numeric',month:'2-digit',day:'2-digit',
        hour:'2-digit',minute:'2-digit',second:'2-digit',
        hour12:false
      }).formatToParts(new Date()).reduce((a,x)=>(a[x.type]=x.value,a),{});
      return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
    },
    $_toShiftJisBytes(text) {
      try {
        if (typeof Encoding !== 'undefined') {
          const unicodeArr = Encoding.stringToCode(text);
          const sjisBytes  = Encoding.convert(unicodeArr, 'SJIS', 'UNICODE');
          return new Uint8Array(sjisBytes);
        }
      } catch (e) {
        console.warn('[export] SJIS convert failed, fallback to UTF-8', e);
      }
      return new TextEncoder().encode(text);
    },
    $_downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
    $_downloadText(text, filename, mime) {
      const blob = new Blob([text], { type: mime });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    clampInterval(val) {
      const MIN = 1.0;
      const MAX = 60;
      const STEP = 0.1;

      let n = Number(val);
      if (!Number.isFinite(n)) n = MIN;
      n = Math.round(n / STEP) * STEP;
      if (n < MIN) n = MIN;
      if (n > MAX) n = MAX;
      n = Number(n.toFixed(3));
      return n;
    },

    updateLocationAndCoordinates(position) {
      const map = this.$store.state.map01
      let longitude, latitude;
      if (position) {
        ({latitude, longitude} = position.coords);
        // map.setCenter([longitude, latitude]);
        // map.setZoom(15);
        map.flyTo({ center: [longitude, latitude], zoom: map.getZoom(), animate: true });
        map.once('moveend', () => {
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
        })
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
        this.currentLngLat = [longitude, latitude];
      } else {
        this.centerMarker.setLngLat([longitude, latitude]);
      }
    },
  },
  mounted() {
    try {
      const saved = localStorage.getItem('tenmei')
      if (saved !== null && saved !== undefined) {
        this.tenmei = saved
      }
    } catch (error) {
    }
    try {
      const saved = localStorage.getItem('jobpicker_autoclose');
      this.autoCloseJobPicker = (saved === '1'); // 未保存なら false のまま
    } catch (_) {
      this.autoCloseJobPicker = false;
    }
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
  this.tutorialShow = localStorage.getItem(this.dontShowKey) !== '1'
  },
  watch: {
    autoCloseJobPicker(v) {
      try { localStorage.setItem('jobpicker_autoclose', v ? '1' : '0'); } catch {}
    },
    tutorialShow(v) {
      if (v) {
        localStorage.removeItem(this.dontShowKey)
      } else {
        localStorage.setItem(this.dontShowKey, '1')
      }
    },
    eventSeq () {
      const ev = this.lastEvent
      if (ev.type === 'dont-show-set') {
        this.tutorialShow = false
      }
    },
    // 計算値が変わったら、親へ v-model で反映
    disabledForSokuiCalc: {
      handler (v) {
        this.s_disabledForSokui = v
      },
      immediate: true,
      flush: 'post',      // ← DOM 更新後に通知（チラつき抑制）
    }
  },
}
</script>

<style scoped>
/* ====== 高さ伝搬の骨格（flex） ====== */
.fw-fit{
  width:100%; height:100%;
  display:flex; flex-direction:column;
  min-width:0; min-height:0;
}
.fw-card{
  width:100%; height:100%;
  display:flex; flex-direction:column;
}
.fw-body{
  flex:1 1 auto;
  display:flex; flex-direction:column;
  overflow:hidden;           /* 中でスクロールを持つ */
  min-height:0;              /* ★ 子 overflow を有効化 */
  padding:12px;
}

/* 中間ラッパ：上に固定ブロック＋下にスクロール箱を置くための器 */
.section-grow{
  display:flex; flex-direction:column;
  flex:1 1 0%;               /* ★ 0% 基準で残り高さを受け取る */
  min-height:0;              /* ★ 必須 */
}

/* 内側のスクロール領域（ここで確実にスクロールを発生させる） */
.list-pane{
  flex:1 1 0%;               /* ★ 0% 基準で下側を伸縮 */
  min-height:0;              /* ★ 必須 */
  overflow:auto;             /* ← スクロール発生点 */
}

/* インライン編集：見た目＆幅 70% */
.editable-label{ cursor:pointer; border-bottom:1px dotted currentColor; }
.editable-label:hover{ opacity:.9; }

.name-edit-wrap{
  display:flex;
  align-items:center;
  gap:6px;
  width:100%;
  min-width:0;
}

.name-input-70{
  flex:0 1 70%;
  max-width:70%;
  min-width:140px;           /* お好みで調整 */
}
/* Vuetify 内側ラッパへ幅伝搬（v2） */
.name-input-70 :deep(.v-input),
.name-input-70 :deep(.v-input__control),
.name-input-70 :deep(.v-field){ width:100%; }
/* タイトル直下の操作行を右端寄せに */
/* scoped でも効くようにシンプルに */
.title-actions{
  display:flex;
  justify-content:flex-end;  /* 右端 */
  padding:4px 16px 0;        /* タイトルとの間隔 */
}
/* モバイル余白（任意） */
@media (max-width: 500px){
  .fw-body{ padding:8px; }
}

/* Option D: パルス（淡い心拍風）。実行中やビジー中は付かない想定 */
.pulse-anim {
  animation: pulseGlow 1.4s ease-in-out infinite;
}
@keyframes pulseGlow {
  0% { box-shadow: 0 0 0 0 rgba(33,150,243,0.45); }
  70% { box-shadow: 0 0 0 12px rgba(33,150,243,0); }
  100% { box-shadow: 0 0 0 0 rgba(33,150,243,0); }
}


/* 点名は可変幅でグリッド領域ぴったりに */
.oh3-col-flex {
  width: 100%;
}
/* 右2つのセレクトは固定幅。Vuetifyの入力は内部で100%になるので、ラッパーに幅を指定 */
.oh3-col-fixed {
  width: 150px;
}
/* 狭い画面では 1 列にフォールバック */
/* まずエリア割り当て（既に g-a/g-b/g-c/g-d を付けてるので活用） */
.g-a{ grid-area: a; } /* 点名 */
.g-b{ grid-area: b; } /* 測位回数 */
.g-c{ grid-area: c; } /* 間隔 */
.g-d{ grid-area: d; } /* アンテナ高 */
/* デフォルト（PCなど広い画面）: 4列並び */
.oh3-grid-4col{
  display:grid;
  grid-template-columns: minmax(0, 1fr) 150px 150px 150px;
  grid-template-areas: "a b c d";
  gap: 8px;
}

/* 640px以下:
   1段目=点名(2列ぶち抜き)
   2段目=測位回数(2列ぶち抜き)
   3段目=間隔 と アンテナ高 を横並び */
@media (max-width: 640px){
  .oh3-grid-4col{
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "a a"
      "b b"
      "c d";
    gap: 8px;
  }
  /* グリッド内では各セルが幅を管理するので固定幅指定は外す */
  .oh3-col-fixed{ width: 100%; }
}
/* ハートビート（鼓動） */
.oh-chip-heartbeat {
  /* ほんの少し大きめに（任意） */
  transform: translateZ(0);             /* ジャギ回避 */
  animation: oh-heartbeat 1.0s ease-in-out infinite;
  will-change: transform, box-shadow;
}

/* 鼓動キーフレーム：ドクン→少し戻る→休む */
@keyframes oh-heartbeat {
  0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(0,0,0,0); }
  10%  { transform: scale(1.06); box-shadow: 0 0 0 0.25rem color-mix(in srgb, currentColor 30%, transparent); }
  20%  { transform: scale(1.12); box-shadow: 0 0 0 0.35rem color-mix(in srgb, currentColor 22%, transparent); }
  40%  { transform: scale(1.03); box-shadow: 0 0 0 0.15rem color-mix(in srgb, currentColor 18%, transparent); }
  60%  { transform: scale(1.00); box-shadow: 0 0 0 0 rgba(0,0,0,0); }
  100% { transform: scale(1.00); box-shadow: 0 0 0 0 rgba(0,0,0,0); }
}

/* 端末の「簡易アニメーション」設定に配慮（OS設定でアニメ抑制時は停止） */
@media (prefers-reduced-motion: reduce) {
  .oh-chip-heartbeat {
    animation: none;
  }
}

</style>
