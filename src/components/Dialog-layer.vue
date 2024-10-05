<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize">
      ダイアログレイヤー
    </div>
  </Dialog>
</template>

<script>

export default {
  name: 'Dialog-layer',
  props: ['mapName'],
  data: () => ({
    test: 'test',
    menuContentSize: {'height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_dialogs () {
      return this.$store.state.dialogs.layerDialog
    }
  },
  methods: {
  }
}
</script>
<style scoped>

</style>

