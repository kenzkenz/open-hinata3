<template>
  <v-dialog v-model="s_versionMessage" max-width="500px">
    <v-card>
      <v-card-title>バージョンが古くなっています。</v-card-title>
      <v-card-text>
        <p style="margin-bottom:20px;">
          アップデートしてください。現在のレイヤーを記憶したままアップデートします。
        </p>
        <v-btn @click=appUpdate>アップデート実行</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="s_versionMessage = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'VDialogCommon',
  computed: {
    s_versionMessage: {
      get() {
        return this.$store.state.commonDialog.versionMessage
      },
      set(value) {
        this.$store.state.commonDialog.versionMessage = value
      }
    },
  },
  methods: {
    appUpdate() {
      location.reload(true)
      this.s_versionMessage = false
    },
  }
}
</script>
