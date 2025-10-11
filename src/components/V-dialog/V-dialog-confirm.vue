<template>
  <v-dialog
      v-model="internal"
      :persistent="persistent"
      :max-width="width"
      transition="dialog-transition"
      @update:modelValue="onUpdate"
  >
    <v-card>
      <v-card-title class="d-flex align-center ga-2">
        <v-icon :color="iconColor" v-if="icon" :icon="icon" class="me-1" :size="40" />
        {{ title }}
      </v-card-title>

      <v-card-text>
        <slot><span v-html="message"></span></slot>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="cancel">{{ cancelText }}</v-btn>
        <v-btn :color="color" @click="ok" ref="okRef">{{ okText }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'VDialogConfirm',
  props: {
    modelValue: { type: Boolean, default: false }, // v-model
    message: { type: String, default: '' },
    title: { type: String, default: '確認' },
    okText: { type: String, default: 'OK' },
    cancelText: { type: String, default: 'キャンセル' },
    persistent: { type: Boolean, default: false },
    width: { type: [Number, String], default: 420 },
    color: { type: String, default: 'primary' },
    iconColor: { type: String, default: 'primary' },
    icon: { type: String, default: null },
    autofocusOk: { type: Boolean, default: true },
  },
  emits: ['update:modelValue', 'ok', 'cancel'],
  data () {
    return {
      internal: this.modelValue,
    }
  },
  watch: {
    modelValue (v) {
      this.internal = v
      if (v && this.autofocusOk) {
        this.$nextTick(() => {
          const el = this.$refs.okRef?.$el || this.$refs.okRef
          el && el.focus && el.focus()
        })
      }
    },
    internal (v) {
      if (!v && this.modelValue) this.$emit('update:modelValue', false)
    },
  },
  methods: {
    ok () {
      this.$emit('ok')
      this.close()
    },
    cancel () {
      this.$emit('cancel')
      this.close()
    },
    close () {
      this.$emit('update:modelValue', false)
      this.internal = false
    },
    onUpdate (v) {
      // 外側クリック/ESC で閉じた場合は cancel 扱い
      if (!v && this.internal) this.cancel()
    },
  },
}
</script>

<style scoped>
/* 必要なら調整 */
</style>
