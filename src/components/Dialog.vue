<template>
  <div v-drag="{handle:'#' + id}" @v-drag-end="dragEnd" class="dialog-div" ref="dragDiv" @mousedown="dialogMouseDown" :style="this.dialog.style">
    <div class="drag-handle" :id="id">
    </div>
    <div>
      <div class="close-btn-div" @click="closeBtn"><i class="fa-solid fa-xmark hover close-btn"></i></div>
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'dialog-0',
  props: ['dialog','mapName'],
  components: {
  },
  data () {
    return {
    }
  },
  methods: {
    dragEnd () {
      this.$store.state.dialogs[this.dialog.name][this.mapName].style.top = this.$refs.dragDiv.style.top
      this.$store.state.dialogs[this.dialog.name][this.mapName].style.left = this.$refs.dragDiv.style.left
    },
    closeBtn () {
      this.$store.state.dialogs[this.dialog.name][this.mapName].style.display = 'none'
    },
    dialogMouseDown () {
      this.$store.commit('incrDialogMaxZindex')
      this.$store.state.dialogs[this.dialog.name][this.mapName].style.top = this.$refs.dragDiv.style.top
      this.$store.state.dialogs[this.dialog.name][this.mapName].style.left = this.$refs.dragDiv.style.left
      this.$store.state.dialogs[this.dialog.name][this.mapName].style['z-index'] = this.$store.state.dialogMaxZindex
    }
  },
  computed: {
    id () {
      return 'drag-handle-' + this.dialog.name + '-' + this.mapName
    }
  },
  mounted() {
  }
}
</script>

<style scoped>
.dialog-div{
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
