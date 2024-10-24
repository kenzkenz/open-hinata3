<template>
  <Dialog :dialog="s_dialogs[mapName]" :mapName="mapName">
    <div :style="menuContentSize">
      標高強調
      <div class="range-div">
        {{s_terrainLevel}}倍<br>
        <input type="range" min="1" max="10" step="0.1" class="range" v-model.number="s_terrainLevel" @input="terrainLevelInput"/>
      </div>
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
    s_terrainLevel: {
      get() {
        return this.$store.state.terrainLevel
      },
      set(value) {
        this.$store.state.terrainLevel = value

      }
    },
    s_dialogs () {
      return this.$store.state.dialogs.menuDialog
    }
  },
  methods: {
    terrainLevelInput () {
      this.$store.state.map01.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel })
      this.$store.state.map02.setTerrain({ 'source': 'gsidem-terrain-rgb', 'exaggeration': this.s_terrainLevel })
    }
  }
}
</script>
<style scoped>

</style>

