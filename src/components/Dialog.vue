<template>
  <div :id="'dialog-div-' +  dialog.name + '-' + mapName" class="dialog-div" ref="dragDiv" @mousedown="dialogMouseDown" :style="this.dialog.style">
    <div class="drag-handle" :id="id" ref="dragHandle">
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
    const vm = this
    this.$nextTick(() => {
      const container = this.$refs.dragDiv
      const handle =  this.$refs.dragHandle

      // console.log(container)
      // console.log(handle)

      // const container = document.querySelector("#dialog-info-" + this.item.id)
      // const handle =  document.querySelector("#handle-" + this.item.id)
      let offsetX, offsetY;

      const startDrag = (event) => {
        const clientX = event.type === 'touchstart' ? event.touches[0].clientX : event.clientX;
        const clientY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;

        offsetX = clientX - container.offsetLeft;
        offsetY = clientY - container.offsetTop;

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('touchend', endDrag);
      };

      const drag = (event) => {
        event.preventDefault(); // スクロールを防ぐ

        const clientX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX;
        const clientY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;

        // 新しいX座標とY座標を計算
        const newX = clientX - offsetX;
        let newY = clientY - offsetY;

        // ウィンドウの高さ内にY座標を制限
        const windowHeight = window.innerHeight;
        const handleHeight = handle.offsetHeight;

        if (newY < 0) {
          newY = 0; // 上限
        } else if (newY > windowHeight - handleHeight) {
          newY = windowHeight - handleHeight; // 下限
        }

        // 新しい位置を設定
        container.style.left = `${newX}px`;
        container.style.top = `${newY}px`;
      };

      const endDrag = () => {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', endDrag);
      };

      // ハンドルにイベントリスナーを追加
      handle.addEventListener('mousedown', startDrag);
      handle.addEventListener('touchstart', startDrag);
      // --------------------------------------------------------------------------------------------------------------
      function adjustDialogSize() {
        const dialogDiv = vm.$store.state.dialogs[vm.dialog.name][vm.mapName]
        const firstDiv = document.querySelector('.first-div')
        const secondDiv = vm.$store.state.secondDivStyle
        // const dialogDiv0 = document.querySelector('#dialog-div-' + vm.dialog.name + '-' + vm.mapName)
        // const secondDiv = document.querySelector('.second-div')
        console.log(firstDiv.style.background_color)
        if (window.innerWidth < 450) {
          // スマホ画面の場合の設定
          dialogDiv.style.position = 'fixed';
          dialogDiv.style.top = '0';
          dialogDiv.style.left = '0';
          dialogDiv.style.width = '100vw';
          dialogDiv.style.height = '100vh';
          dialogDiv.style.background = 'rgba(255,255,255,0.7)'
          firstDiv.style.background = 'rgba(0,0,0,0)'
          // ここを修正
          secondDiv.height = (window.innerHeight - 260) + 'px';
          handle.removeEventListener('mousedown', startDrag);
          handle.removeEventListener('touchstart', startDrag);
          vm.$store.commit('incrDialogMaxZindex')
          vm.$store.state.dialogs[vm.dialog.name][vm.mapName].style['z-index'] = vm.$store.state.dialogMaxZindex
        } else {
          // PC画面に戻ったときの設定
          dialogDiv.style.position = 'absolute';
          dialogDiv.style.width = 'auto'; // 初期幅に戻す
          dialogDiv.style.height = 'auto'; // 初期の高さに戻す
          dialogDiv.style.background = 'rgba(255,255,255,1)'
          firstDiv.style.background = 'gray'
          handle.addEventListener('mousedown', startDrag);
          handle.addEventListener('touchstart', startDrag);
          secondDiv.height = '390px';
        }
      }
      // ウィンドウサイズが変わるたびにイベントをトリガー
      window.addEventListener('resize', adjustDialogSize);
      // 初回読み込み時にサイズを調整
      adjustDialogSize();
    })
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
  touch-action: auto; /* タッチイベントを有効化 */
  height: 600px;
  -webkit-overflow-scrolling: touch;
}
.drag-handle{
  height: 30px;
  padding: 5px;
  background-color: rgb(50,101,186);
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  cursor: grab;
  color: white;
  display: flex;
  /*justify-content: center; !* 水平方向の中央揃え *!*/
  align-items: center; /* 垂直方向の中央揃え */
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
/* スマホ用のスタイル */
@media screen and (max-width: 500px) {
  .dialog-div {
    width: 100%;
    height: 100%;
    top: 0;
    left:0;
  }
  .close-btn-div{
    font-size:4em;
  }
  .drag-handle{
    height: 50px;
  }
}
</style>
