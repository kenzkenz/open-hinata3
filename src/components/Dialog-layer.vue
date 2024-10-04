<template>
  <Dialog :dialog="s_dialog">
    <div :style="menuContentSize">
      ダイアログレイヤー
    </div>
  </Dialog>
</template>

<script>

export default {
  name: 'Dialog-layer',
  data: () => ({
    test: 'test',
    menuContentSize: {'height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_dialog () {
      return this.$store.state.dialogs.layerDialog
    }
  },
  methods: {
  }
}
</script>
<style scoped>

</style>

