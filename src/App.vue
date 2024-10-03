<template>
  <v-app>
    <v-main>
      <div id="left-top-div">
        <v-btn @click="btnClick">ボタン</v-btn>
      </div>
      <DialogMenu/>
    </v-main>
  </v-app>
</template>

<script>
import DialogMenu from '@/components/Dialog-menu'

export default {
  name: 'App',
  components: {
    DialogMenu,
  },
  data: () => ({
  }),
  methods: {
    btnClick () {
      this.$store.state.dialogs.menuDialog.style.display = 'block'
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
