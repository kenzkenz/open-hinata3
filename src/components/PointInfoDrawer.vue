<template>
  <v-navigation-drawer
      v-model="visible"
      right
      temporary
      width="400"
      class="point-info-drawer"
  >
    <v-card flat>
      <v-card-title class="text-h6">
        ポイント情報
      </v-card-title>
      <v-card-text>
        <v-textarea
            v-model="description"
            label="説明（最大500文字）"
            :counter="500"
            auto-grow
            rows="4"
        />
        <div class="mt-2 text-caption text-right">
          作成者: {{ creator }}<br />
          日時: {{ timestamp }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="save">保存</v-btn>
        <v-btn text @click="close">閉じる</v-btn>
      </v-card-actions>
    </v-card>
  </v-navigation-drawer>
</template>

<script>
export default {
  name: 'PointInfoDrawer',
  props: {
    value: Boolean,
    feature: Object
  },
  data () {
    return {
      visible: this.value,
      description: this.feature?.properties?.description || '',
      creator: this.feature?.properties?.createdBy || '不明',
      timestamp: new Date(this.feature?.properties?.createdAt || 0).toLocaleString()
    }
  },
  watch: {
    value (val) {
      this.visible = val
    },
    visible (val) {
      this.$emit('input', val)
    }
  },
  methods: {
    save () {
      this.$emit('save', this.description)
      this.close()
    },
    close () {
      this.visible = false
    }
  }
}
</script>

<style scoped>
.point-info-drawer {
  z-index: 2500;
}
</style>
