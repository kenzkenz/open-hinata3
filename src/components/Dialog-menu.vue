<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize">
      メニュー まだなにもない
    </div>
  </Dialog>
</template>

<script>

export default {
  name: 'Dialog-menu',
  props: ['mapName'],
  data: () => ({
    menuContentSize: {'height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_dialogs () {
      return this.$store.state.dialogs.menuDialog
    }
  },
  methods: {
  }
}
</script>
<style scoped>

</style>

