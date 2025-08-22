<template>
  <div class="ex-container">

    <v-tabs mobile-breakpoint="0" v-model="tab" class="custom-tabs">
      <v-tab value="kakudo">基準点角度</v-tab>
      作成中
<!--      <v-tab value="line">ライン</v-tab>-->
    </v-tabs>
<!--    <hr>-->
    <v-window v-model="tab" style="margin-top: 20px;">
      <v-window-item value="kakudo">
        <v-card>

        </v-card>
      </v-window-item>


      <v-window-item  value="line">
        <p style="color: deeppink; margin-top: 20px; margin-bottom: 100px;">ラインは未作成です。</p>

      </v-window-item>
    </v-window>

  </div>
</template>

<script>
import axios from "axios";

export default {
  name: 'ExDraw',
  props: {
  },
  components: {

  },
  data: () => ({
    tab: 'kakudo'
  }),
  computed: {
    s_pmtilesFirstSave: {
      get() {
        return this.$store.state.pmtilesFirstSave
      },
      set(value) {
        this.$store.state.pmtilesFirstSave = value
      }
    },
    s_pmtilesStyle () {
      return this.$store.state.pmtilesStyle
    },
    s_pmtilesLabel () {
      return this.$store.state.pmtilesLabel
    },
    s_propnames () {
      return this.$store.state.propnames || []
    },
  },
  methods: {
  },
  watch: {
  }
};
</script>

<style scoped>
.ex-container {
  padding: 0 15px 15px 15px;
}
.range-input {
  width: 35%;
  position: relative;
  top: 8px;
}
.label-span{
  display: inline-block;
  width: 60px;
  text-align: center;
  margin: 0 5px;
}
.val-span{
  display: inline-block;
  width: 30px;
  text-align: center;
  margin: 0 5px;
}
hr {
  margin-bottom: 20px;
}
.custom-tabs {
  min-width: auto;
  width: fit-content;
  max-width: 100%;
  margin-bottom: 10px;
  position: relative;
}
.custom-tabs .v-tab {
  min-width: 60px; /* タブの最小幅を狭く */
  padding: 5px 8px; /* 余白を小さく */
  font-size: 14px; /* フォントサイズを小さく */
}
</style>
