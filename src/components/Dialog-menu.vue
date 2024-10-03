<template>
  <Dialog :dialog="s_menuDialog">
    <div :style="menuContentSize">
      dddddd
    </div>
  </Dialog>
</template>

<script>

export default {
  name: 'MyMap',
  data: () => ({
    test: 'test',
    menuContentSize: {'height': 'auto','margin': '10px', 'overflow': 'auto', 'user-select': 'text'}
  }),
  computed: {
    s_menuDialog () {
      return this.$store.state.dialogs.menuDialog
    }
  },
  methods: {
  }
}
</script>
<style scoped>

</style>

