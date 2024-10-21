<template>
<!--    <div style="position: relative">-->
        <div v-drag="{handle:'#drag-handle-' + item.id}" :ref="'dragDiv-' + item.id" :class="'v-dialog-info-div v-dialog-info-div-' + item.id" v-for="item in info" :key="item.id" :style="item.style" @mousedown="dialogMouseDown(item)" @mouseup="dialogMouseDown(item)">
            <div class="drag-handle" :id="'drag-handle-' + item.id"></div>
            <div class="close-btn-div" @click="close(item)"><i style="" class="fa-solid fa-xmark hover close-btn"></i></div>
            <!--なにもないとき。普通のラスターのとき-->
            <div v-if="!item.ext">
                <div class="info-content-div">
                    <p v-html="item.title"></p><hr>
                    <p v-html="item.summary"></p>
                </div>
            </div>

            <extHighway :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extHighway'"/>

        </div>
<!--    </div>-->
</template>

<script>
import extHighway from "@/components/ext-highway"

export default {
  name: "dialog-info",
  components: {
    extHighway
  },
  props: ['mapName'],
  computed: {
    info () {
      return this.$store.state.dialogsInfo[this.mapName]
    }
  },
  methods: {
    close (item) {
      const result = this.$store.state.dialogsInfo[this.mapName].find(el => el.id === item.id)
      result.style.display = 'none'
      // document.querySelector('.v-dialog-info-div-' + item.id).style.display = 'none'
    },
    dialogMouseDown (item) {
      //改修中
      const result = this.$store.state.dialogsInfo[this.mapName].find(el => el.id === item.id)

      this.$store.commit('incrDialogMaxZindex')

      console.log(this.$refs['dragDiv-' + item.id].style)
      console.log(result.style['z-index'])

      // this.$store.state.dialogsInfo[this.mapName].style.top = this.$refs.dragDiv.style.top
      // this.$store.state.dialogsInfo[this.mapName].style.left = this.$refs.dragDiv.style.left
      result.style['z-index'] = this.$store.state.dialogMaxZindex



      // store.commit('base/incrDialogMaxZindex')
      // const result = this.$store.state.base.dialogsInfo[this.mapName] .find(el => el.id === item.id)
      // document.querySelector('.v-dialog-info-div-' + item.id).style["z-index"] = this.$store.state.base.dialogMaxZindex
      // result.style["z-index"] = this.$store.state.base.dialogMaxZindex
      // result.style.top = document.querySelector('.v-dialog-info-div-' + item.id).style.top
      // result.style.left = document.querySelector('.v-dialog-info-div-' + item.id).style.left
      // result.style.display = 'block'
    }
  }
}
</script>

<style>
    .v-dialog-info-div{
        position: absolute;
        z-index: 10;
        background-color: #fff;
        box-shadow:2px 2px 5px #787878;
        border: 1px solid whitesmoke;
        border-radius: 4px;
        transition: opacity 1s;
    }
    .drag-handle{
      height: 30px;
      padding: 5px;
      /*background-color: rgba(0,60,136,0.5);*/
      background-color: rgb(50,101,186);
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
      cursor: grab;
      color: white;
      /*width: 50px;*/
    }
    .close-btn-div{
      position: absolute;
      top: 0;
      right: 5px;
      cursor: pointer;
      color: #fff;
      z-index: 2;
      font-size:2.5em;
    }
    .hover:hover{
      color: blue;
    }
    .info-content-div{
        padding: 10px;
        /*max-width: 350px;*/
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
</style>
