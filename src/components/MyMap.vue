<template>
  <v-container>
   aaa
    <v-btn @click="btnClick">Button</v-btn>
  </v-container>
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
