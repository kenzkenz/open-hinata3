<template>
  <v-app>
    <v-main>
      <div id="left-top-div">
        <v-btn @click="btnClickMenu">メニュー</v-btn>
        <v-btn @click="btnClickLayer">レイヤー</v-btn>
      </div>
      <DialogMenu/>
      <DialogLayer/>
    </v-main>
  </v-app>
</template>

<script>
import DialogMenu from '@/components/Dialog-menu'
import DialogLayer from '@/components/Dialog-layer'

export default {
  name: 'App',
  components: {
    DialogLayer,
    DialogMenu,
  },
  data: () => ({
  }),
  methods: {
    btnClickMenu () {
      this.$store.state.dialogs.menuDialog.style.display = 'block'
    },
    btnClickLayer () {
      this.$store.state.dialogs.layerDialog.style.display = 'block'
    }
  }
}
</script>
<style>
#left-top-div {
  position:absolute;
  top:10px;
  left:10px;
}
</style>
