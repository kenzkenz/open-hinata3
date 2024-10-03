<template>
  <div id="left-top-div">
    <v-btn @click="btnClick">ボタン</v-btn>
  </div>
</template>

<script>

export default {
  name: 'MyMap',
  data: () => ({
    test: 'test'
  }),
  methods: {
    btnClick () {
      console.log(this.test)
      alert(this.$store.state.storeTest)
    }
  }
}
</script>
<style scoped>
#left-top-div {
  position:absolute;
  top:10px;
  left:10px;
}
</style>