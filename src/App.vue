<template>
  <v-app>
    <v-main>
      <div id="left-top-div">
        <v-btn @click="btnClickMenu"><i class="fa-solid fa-bars"></i></v-btn>
        <v-btn style="margin-left:10px;" @click="btnClickLayer"><i class="fa-solid fa-layer-group"></i></v-btn>
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
