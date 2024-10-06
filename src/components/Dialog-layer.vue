<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize">
      <v-btn class="testBtn" @click="click(mapName)">地理院地図</v-btn>
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
    click (mapName) {
      const map = this.$store.state[mapName]
      const visibility = map.getLayoutProperty('gsi-layer', 'visibility');
      map.setLayoutProperty('gsi-layer', 'visibility', visibility === 'visible' ? 'none' : 'visible');
    }
  }
}
</script>
<style scoped>

</style>

