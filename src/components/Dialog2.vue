<template>
  <div ref="dragDiv" :id="'dialog2-' + item.id" v-for="item in s_dialog2" :key="item.id" :style="item.style" class="dialog2-div" @pointerdown="dialogMouseDown(item)" @mouseup="dialogMouseUp(item)">
<!--    <div ref="dragDiv" :id="'dialog2-' + item.id" v-for="item in s_dialog2" :key="item.id" :style="item.style" class="dialog2-div" @pointerdown.stop="dialogMouseDown(item)" @mousedown.stop="dialogMouseDown(item)" @mouseup.stop="dialogMouseDown(item)">-->
    <div ref="dragHandle" class="drag-handle" :id="'dialog-handle2-' + item.id">
    </div>
    <div>
      <div class="close-btn-div" @clic.stop="closeBtn(item)" @pointerdown.stop="closeBtn(item)"><i class="fa-solid fa-xmark hover close-btn"></i></div>
      <DialogPyramid :item="item" :mapName="mapName" v-if="item.name === 'pyramid'" />
      <DialogJinkosuii :item="item" :mapName="mapName" v-if="item.name === 'jinkosuii'" />
      <DialogKyakususuii :item="item" :mapName="mapName" v-if="item.name === 'kyakususuii'" />
    </div>
  </div>
</template>

<script>
import DialogPyramid from "@/components/Dialog-pyramid"
import DialogJinkosuii from "@/components/Dialog-jinkosuii"
import DialogKyakususuii from "@/components/Dialog-kyakususuii"

export default {
  name: 'dialog-2',
  props: ['mapName'],
  components: {
    DialogPyramid,
    DialogJinkosuii,
    DialogKyakususuii
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
    closeBtn (item) {
      if (window.innerWidth > 600) {
        this.$store.state.dialogs2[this.mapName] = this.$store.state.dialogs2[this.mapName].filter(v => v.id !== item.id)
      } else {
        setTimeout(() => {
          this.$store.state.dialogs2[this.mapName] = this.$store.state.dialogs2[this.mapName].filter(v => v.id !== item.id)
        }, 500)
      }
    },
    dialogMouseUp (item) {
      const result = this.$store.state.dialogs2[this.mapName] .find(el => el.id === item.id)
      result.style.top = document.querySelector( '#dialog2-' + item.id).style.top
      result.style.left = document.querySelector('#dialog2-' + item.id).style.left
    },
    dialogMouseDown (item) {
      try {
        this.$store.commit('incrDialogMaxZindex')
        const result = this.$store.state.dialogs2[this.mapName] .find(el => el.id === item.id)
        result.style.top = document.querySelector( '#dialog2-' + item.id).style.top
        result.style.left = document.querySelector('#dialog2-' + item.id).style.left
        document.querySelector( '#dialog2-' + item.id).style["z-index"] = this.$store.state.dialogMaxZindex
      } catch (e) {
        console.log(e)
      }
    }
  },
  watch: {
    s_dialog2: {
      handler: function(){
        this.$nextTick(() => {

          const container = this.$refs.dragDiv[this.$refs.dragDiv.length - 1];
          const handle = this.$refs.dragHandle[this.$refs.dragHandle.length - 1];
          let offsetX, offsetY;

          const startDrag = (event) => {
            const clientX = event.type === 'touchstart' ? event.touches[0].clientX : event.clientX;
            const clientY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;

            offsetX = clientX - container.offsetLeft;
            offsetY = clientY - container.offsetTop;

            window.addEventListener('mousemove', drag);
            window.addEventListener('mouseup', endDrag);
            window.addEventListener('touchmove', drag, { passive: false });
            window.addEventListener('touchend', endDrag);
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
            const containerHeight = container.offsetHeight;

            if (newY < 0) {
              newY = 0; // 上限
            } else if (newY > windowHeight - containerHeight) {
              newY = windowHeight - containerHeight; // 下限
            }

            // 新しい位置を設定
            container.style.left = `${newX}px`;
            container.style.top = `${newY}px`;
          };

          const endDrag = () => {
            window.removeEventListener('mousemove', drag);
            window.removeEventListener('mouseup', endDrag);
            window.removeEventListener('touchmove', drag);
            window.removeEventListener('touchend', endDrag);
          };

          // ハンドルにイベントリスナーを追加
          try {
            handle.addEventListener('mousedown', startDrag);
            handle.addEventListener('touchstart', startDrag, { passive: false });
          } catch (e) {
            console.log(e);
          }




          // const container = this.$refs.dragDiv[this.$refs.dragDiv.length -1]
          // const handle =  this.$refs.dragHandle[this.$refs.dragHandle.length -1]
          // // const container = document.querySelector("#dialog-info-" + this.item.id)
          // // const handle =  document.querySelector("#handle-" + this.item.id)
          // let offsetX, offsetY;
          //
          // const startDrag = (event) => {
          //   const clientX = event.type === 'touchstart' ? event.touches[0].clientX : event.clientX;
          //   const clientY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;
          //
          //   offsetX = clientX - container.offsetLeft;
          //   offsetY = clientY - container.offsetTop;
          //
          //   document.addEventListener('mousemove', drag);
          //   document.addEventListener('mouseup', endDrag);
          //   document.addEventListener('touchmove', drag);
          //   document.addEventListener('touchend', endDrag);
          // };
          //
          // const drag = (event) => {
          //   event.preventDefault(); // スクロールを防ぐ
          //
          //   const clientX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX;
          //   const clientY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;
          //
          //   // 新しいX座標とY座標を計算
          //   const newX = clientX - offsetX;
          //   let newY = clientY - offsetY;
          //
          //   // ウィンドウの高さ内にY座標を制限
          //   const windowHeight = window.innerHeight;
          //   const handleHeight = handle.offsetHeight;
          //
          //   if (newY < 0) {
          //     newY = 0; // 上限
          //   } else if (newY > windowHeight - handleHeight) {
          //     newY = windowHeight - handleHeight; // 下限
          //   }
          //
          //   // 新しい位置を設定
          //   container.style.left = `${newX}px`;
          //   container.style.top = `${newY}px`;
          // };
          //
          // const endDrag = () => {
          //   document.removeEventListener('mousemove', drag);
          //   document.removeEventListener('mouseup', endDrag);
          //   document.removeEventListener('touchmove', drag);
          //   document.removeEventListener('touchend', endDrag);
          // };
          //
          // // ハンドルにイベントリスナーを追加
          // try {
          //   handle.addEventListener('mousedown', startDrag);
          //   handle.addEventListener('touchstart', startDrag);
          // } catch (e) {
          //   console.log(e)
          // }
        })
      },
      deep: true
    }
  },
  mounted() {
    this.$nextTick(() => {
    })
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
