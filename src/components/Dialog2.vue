<template>
  <div ref="dragDiv" :id="'dialog2-' + item.id" v-for="item in s_dialog2" :key="item.id" :style="item.style" v-drag="{handle:'#dialog-handle2' + item.id}" @v-drag-end="dragEnd(item)" class="dialog2-div" @mousedown="dialogMouseDown(item)" @mouseup="dialogMouseDown(item)">
    <div class="drag-handle" :id="'dialog-handle2-' + item.id">
    </div>
    <div>
      <div class="close-btn-div" @click="closeBtn(item)"><i class="fa-solid fa-xmark hover close-btn"></i></div>
      <DialogPyramid :item="item" :mapName="mapName" v-if="item.name === 'pyramid'" />
    </div>
  </div>
</template>

<script>
import DialogPyramid from "@/components/Dialog-pyramid"
export default {
  name: 'dialog-2',
  props: ['mapName'],
  components: {
    DialogPyramid
  },
  data () {
    return {
    }
  },
  computed: {
    s_dialog2 () {
      return this.$store.state.dialogs2[this.mapName]
    },
  },
  methods: {
    dragEnd (item) {
      try {
        const result = this.$store.state.dialogs2[this.mapName] .find(el => el.id === item.id)
        result.style.top = document.querySelector( '#dialog2-' + item.id).style.top
        result.style.left = document.querySelector('#dialog2-' + item.id).style.left
      } catch (e) {
        console.log(e)
      }
    },
    closeBtn (item) {
      this.$store.state.dialogs2[this.mapName] = this.$store.state.dialogs2[this.mapName].filter(v => v.id !== item.id);
    },
    dialogMouseDown (item) {
      this.$store.commit('/incrDialogMaxZindex')
      const result = this.$store.state.dialogs2[this.mapName] .find(el => el.id === item.id)
      result.style["z-index"] = this.$store.state.dialogMaxZindex
      result.style.top = document.querySelector( '#dialog2-' + item.id).style.top
      result.style.left = document.querySelector('#dialog2-' + item.id).style.left
      document.querySelector( '#dialog2-' + item.id).style["z-index"] = this.$store.state.dialogMaxZindex
    }
  },
  mounted() {
  }
}
</script>

<style scoped>
.dialog2-div{
  position: absolute;
  z-index: 1;
  background-color: #fff;
  box-shadow:2px 2px 5px #787878;
  border: 1px solid whitesmoke;
  border-radius: 4px;
  transition: opacity 1s;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  /*width: 300px;*/
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
  font-size: large;
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
.hover-white:hover{
  color: white;
}
</style>
