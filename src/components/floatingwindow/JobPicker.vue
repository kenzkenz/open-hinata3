<template>
  <!-- 親の FloatingWindow 内にそのまま置く想定。高さ伝搬の起点だけ確保 -->
  <div class="fw-fit" @mousedown.stop @pointerdown.stop @touchstart.stop>
    <v-card class="fw-card">
      <!-- 操作行 -->
      <div class="d-flex justify-end px-4 pt-1"
           style="gap:6px; opacity:1; margin-top:10px; border-bottom:1px solid rgba(0,0,0,.08);">
        <v-switch
            :model-value="autoCloseJobPicker"
            color="primary"
            density="compact"
            hide-details
            class="autoclose-switch"
            style="line-height:1; transform: translateY(-4px);"
            @update:model-value="$emit('update:autoCloseJobPicker', $event)"
        >
          <template #label>
            <span style="font-size:13px; line-height:1.1;">自動クローズ</span>
          </template>
        </v-switch>

        <v-btn
            color="primary"
            variant="flat"
            density="comfortable"
            rounded="xl"
            class="font-weight-bold"
            :disabled="ui.showJobListOnly"
            @click="ui.showJobListOnly = true"
        >
          一覧
        </v-btn>

        <v-btn
            size="small"
            variant="outlined"
            :disabled="torokuBusy || kansokuRunning || !String(currentJobId || '').trim()"
            @click="$emit('request-download-csv')"
        >
          CSV
        </v-btn>

        <v-btn
            size="small"
            variant="outlined"
            :disabled="torokuBusy || kansokuRunning || !String(currentJobId || '').trim()"
            @click="$emit('request-export-sima')"
        >
          SIMA
        </v-btn>

        <v-btn
            size="small"
            color="primary"
            variant="flat"
            class="font-weight-bold pulse-once"
            :class="{ 'pulse-anim': !kansokuRunning && !torokuBusy }"
            :disabled="torokuBusy || kansokuRunning || !String(currentJobId || '').trim()"
            @click="$emit('request-start-toroku-here')"
        >
          &nbsp;測&nbsp;位&nbsp;
        </v-btn>
      </div>

      <!-- ヘッダー：ジョブ名インライン編集 -->
      <v-card-title class="d-flex align-center text-h6">
        <span v-if="!currentJobName">ジョブ選択</span>

        <div v-else class="name-edit-wrap"
             @mouseenter="ui.hoverJobName = true"
             @mouseleave="ui.hoverJobName = false">
          ジョブ:
          <template v-if="!ui.editingJobName">
            <span class="editable-label ml-1" @click="startEditJobName">
              {{ currentJobName }}
              <v-icon x-small class="ml-1" v-show="ui.hoverJobName">mdi-pencil</v-icon>
            </span>
          </template>
          <template v-else>
            <v-text-field
                v-model="ui.tempJobName"
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
        <template v-if="ui.showJobListOnly">
          <!-- 新規ジョブ -->
          <div class="mb-4">
            <div class="text-caption mb-2">新規ジョブを作成</div>
            <div class="d-flex ga-2">
              <v-text-field
                  v-model.trim="ui.newJobName"
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
            <div v-if="ui.jobNameError" class="text-error text-caption mt-1">{{ ui.jobNameError }}</div>
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
                    @click="$emit('pick-job', job)"
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
                        @click.stop="$emit('delete-job', job)"
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
                    @click.stop="$emit('pan-to-point', pt)"
                >
                  <template #title>
                    <div class="name-edit-wrap"
                         @mouseenter="ui.hoverPointId = pt.point_id"
                         @mouseleave="ui.hoverPointId = null">
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
                    <v-btn icon size="x-small" variant="text" aria-label="ポイントを削除" @click.stop="$emit('delete-point', pt)">
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
    <v-dialog v-model="ui.jobEdit.open" max-width="520">
      <v-card>
        <v-card-title class="text-h6">ジョブを編集</v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-text-field
              v-model.trim="ui.jobEdit.name"
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
              v-model="ui.jobEdit.note"
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
          <v-btn variant="text" @click="closeJobEditDialog" :disabled="ui.jobEdit.saving">キャンセル</v-btn>
          <v-btn color="primary" :loading="ui.jobEdit.saving" @click="saveJobEditDialog">更新</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ポイント編集ダイアログ -->
    <v-dialog v-model="ui.pointEdit.open" max-width="520">
      <v-card>
        <v-card-title class="text-h6">ポイントを編集</v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-text-field
              v-model.trim="ui.pointEdit.name"
              label="ポイント名"
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
              v-model="ui.pointEdit.address"
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
          <v-btn variant="text" @click="closePointEditDialog" :disabled="ui.pointEdit.saving">キャンセル</v-btn>
          <v-btn color="primary" :loading="ui.pointEdit.saving" :disabled="!canSavePoint" @click="savePointEditDialog">更新</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
export default {
  name: 'JobPointPanelBody',
  props: {
    // 状態（親から）
  },
  emits: [
  ],
  data () {
    return {

    }
  },
  computed: {

  },
  methods: {

  }
}
</script>

<style scoped>

</style>
