<template>
  <v-app>
    <v-main>
<!--      <HelloWorld/>-->
      <MyMap/>
    </v-main>
  </v-app>
</template>

<script>
// import HelloWorld from './components/HelloWorld.vue'
import MyMap from "@/components/MyMap";

export default {
  name: 'App',

  components: {
    // HelloWorld,
    MyMap
  },

  data: () => ({
    //
  }),
}
</script>
