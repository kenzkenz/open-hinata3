<template>
  <div ref="dragDiv" :id="'dialog-info-'+ item.id" class="dialog-info-div" v-for="item in info" :key="item.id" :style="item.style"  @mouseover="aaa(item)" @touchstart="dialogMouseDown(item)" @mousedown="dialogMouseDown(item)" @mouseup="dialogMouseDown(item)">
    <div ref="dragHandle" class="drag-handle" :id="'handle-'+ item.id"></div>
    <div class="close-btn-div" @click="close(item)"><i style="" class="fa-solid fa-xmark hover close-btn"></i></div>
    <!--なにもないとき。普通のラスターのとき-->
    <div v-if="!item.ext">
      <div class="info-content-div">
        <p v-html="item.title"></p><hr>
        <p v-html="item.summary"></p>
      </div>
    </div>
    <!--コンポーネントをここに書き連ねる -->
    <extHighway :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extHighway'"/>
    <extTetsudojikeiretsu :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extTetsudojikeiretsu'"/>
  </div>
</template>

<script>
import extHighway from "@/components/ext-highway"
import extTetsudojikeiretsu from "@/components/ext-tetsudojikeiretsu"

export default {
  name: "dialog-info",
  components: {
    extHighway,
    extTetsudojikeiretsu
  },
  props: ['mapName'],
  data: () => ({
    item:''
  }),
  computed: {
    info () {
      return this.$store.state.dialogsInfo[this.mapName]
    }
  },
  methods: {
    bbb(){
alert()
    },
    aaa(item) {
      this.item = item
    },
    dragEnd (item) {
      const result = this.$store.state.dialogsInfo[this.mapName].find(el => el.id === item.id)
      const elm = document.querySelector('#dialog-info-' + item.id)
      result.style.top = elm.style.top
      result.style.left = elm.style.left
    },
    close (item) {
      const result = this.$store.state.dialogsInfo[this.mapName].find(el => el.id === item.id)
      result.style.display = 'none'
    },
    dialogMouseDown (item) {
      this.$store.commit('incrDialogMaxZindex')
      const result = this.$store.state.dialogsInfo[this.mapName].find(el => el.id === item.id)
      const elm = document.querySelector('#dialog-info-' + item.id)
      result.style.top = elm.style.top
      result.style.left = elm.style.left
      result.style['z-index'] = this.$store.state.dialogMaxZindex
    }
  },
  watch: {
    item: {
      handler: function(){
        this.$nextTick(() => {
          // const container = this.$refs.dragDiv[this.$refs.dragDiv.length -1]
          // const handle =  this.$refs.dragHandle[this.$refs.dragHandle.length -1]
          // console.log(draggable1)
          // console.log(handle1)
          const container = document.querySelector("#dialog-info-" + this.item.id)
          const handle =  document.querySelector("#handle-" + this.item.id)

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
            // event.preventDefault(); // スクロールを防ぐ
            // const clientX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX;
            // const clientY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;
            // container.style.left = `${clientX - offsetX}px`;
            // container.style.top = `${clientY - offsetY}px`;
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


          // let isDragging = false;
          // let startX, startY, offsetX, offsetY;
          //
          // handle.addEventListener('mousedown', (e) => {
          //   isDragging = true;
          //   startX = e.clientX;
          //   startY = e.clientY;
          //   const rect = draggable.getBoundingClientRect();
          //   offsetX = startX - rect.left;
          //   offsetY = startY - rect.top;
          // });
          //
          // document.addEventListener('mousemove', (e) => {
          //   if (isDragging) {
          //       const x = e.clientX - offsetX;
          //       const y = e.clientY - offsetY;
          //       // 縦方向（Y座標）のみウィンドウの範囲内に制限
          //       const maxY = window.innerHeight - handle.offsetHeight;
          //       const limitedY = Math.max(0, Math.min(y, maxY));
          //       // 横方向（X座標）は制限しない
          //       draggable.style.left = `${x}px`;
          //       draggable.style.top = `${limitedY}px`;
          //   }
          // });
          // document.addEventListener('mouseup', () => {
          //   isDragging = false;
          // })
          // // -----------------------------------------------------------
          // handle.addEventListener('touchstart', (e) => {
          //   e.preventDefault()
          //   // alert()
          //   isDragging = true;
          //   startX = e.clientX;
          //   startY = e.clientY;
          //   const rect = draggable.getBoundingClientRect();
          //   offsetX = startX - rect.left;
          //   offsetY = startY - rect.top;
          // });
          // document.addEventListener('touchmove', (e) => {
          //   e.preventDefault()
          //   if (isDragging) {
          //     alert(isDragging)
          //     const x = e.clientX - offsetX;
          //     const y = e.clientY - offsetY;
          //     alert(x)
          //     // 縦方向（Y座標）のみウィンドウの範囲内に制限
          //     const maxY = window.innerHeight - handle.offsetHeight;
          //     const limitedY = Math.max(0, Math.min(y, maxY));
          //     // 横方向（X座標）は制限しない
          //     draggable.style.left = `${x}px`;
          //     draggable.style.top = `${limitedY}px`;
          //   }
          // });
          // document.addEventListener('touchend', () => {
          //   isDragging = false;
          // })




        })

      },
      deep: true
    }
  },
  mounted() {
    this.$nextTick(() => {

    });
  },
}
</script>

<style>
    .dialog-info-div{
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
