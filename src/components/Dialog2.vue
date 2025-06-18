<template>
  <div
      ref="dragDiv"
      :id="'dialog2-' + item.id"
      v-for="item in s_dialog2"
      :key="item.id"
      :style="item.style"
      class="dialog2-div"
      @pointerdown="dialogMouseDown(item)"
      @mouseup="dialogMouseUp(item)"
  >
    <div ref="dragHandle" class="drag-handle" :id="'dialog-handle2-' + item.id"></div>
    <div>
      <div class="close-btn-div" @click.stop="closeBtn(item)" @pointerdown.stop="closeBtn(item)">
        <i class="fa-solid fa-xmark hover close-btn"></i>
      </div>
      <DialogPyramid :item="item" :mapName="mapName" v-if="item.name === 'pyramid'" />
      <DialogJinkosuii :item="item" :mapName="mapName" v-if="item.name === 'jinkosuii'" />
      <DialogKyakususuii :item="item" :mapName="mapName" v-if="item.name === 'kyakususuii'" />
      <DialogElevation :item="item" :mapName="mapName" v-if="item.name === 'elevation'" />
    </div>

    <!-- 全方向リサイズハンドル -->
    <div v-if="item.resizable" class="resize-handle resize-handle-corner-right"></div>
    <div v-if="item.resizable" class="resize-handle resize-handle-corner-left"></div>
    <div v-if="item.resizable" class="resize-handle resize-handle-side-right"></div>
    <div v-if="item.resizable" class="resize-handle resize-handle-side-left"></div>
    <div v-if="item.resizable" class="resize-handle resize-handle-side-top"></div>
    <div v-if="item.resizable" class="resize-handle resize-handle-side-bottom"></div>
  </div>
</template>

<script>
import DialogPyramid from "@/components/Dialog-pyramid"
import DialogJinkosuii from "@/components/Dialog-jinkosuii"
import DialogKyakususuii from "@/components/Dialog-kyakususuii"
import DialogElevation from "@/components/Dialog-elevation"

export default {
  name: 'dialog-2',
  props: ['mapName'],
  components: {
    DialogPyramid,
    DialogJinkosuii,
    DialogKyakususuii,
    DialogElevation
  },
  computed: {
    s_dialog2() {
      return this.$store.state.dialogs2[this.mapName]
    }
  },
  methods: {
    setResizable(id, flag) {
      const item = this.$store.state.dialogs2[this.mapName].find(v => v.id === id)
      if (item) {
        item.resizable = flag
      }
    },
    closeBtn(item) {
      this.$store.state.dialogs2[this.mapName] = this.$store.state.dialogs2[this.mapName].filter(v => v.id !== item.id)
    },
    dialogMouseUp(item) {
      const result = this.$store.state.dialogs2[this.mapName].find(el => el.id === item.id)
      const el = document.querySelector('#dialog2-' + item.id)
      result.style.top = el.style.top
      result.style.left = el.style.left
      result.style.width = el.style.width
      result.style.height = el.style.height
    },
    dialogMouseDown(item) {
      try {
        this.$store.commit('incrDialogMaxZindex')
        const result = this.$store.state.dialogs2[this.mapName].find(el => el.id === item.id)
        const el = document.querySelector('#dialog2-' + item.id)
        result.style.top = el.style.top
        result.style.left = el.style.left
        el.style.zIndex = this.$store.state.dialogMaxZindex
      } catch (e) {
        console.log(e)
      }
    },
    // 初期サイズを設定するメソッドを追加
    initializeDialogSize(item) {
      if (item.name === 'elevation' && !item.style.width) {
        const width = window.innerWidth > 600 ? '550px' : '350px'
        const height = '350px' // 子コンポーネントの300px + ヘッダー30px + 余裕20px
        item.style = {
          ...item.style,
          width,
          height,
          top: item.style.top || '50px', // デフォルト位置
          left: item.style.left || '50px'
        }
      }
    }
  },
  created() {
    // ダイアログ追加時に初期サイズを設定
    this.s_dialog2.forEach(item => {
      this.initializeDialogSize(item)
    })
  },
  watch: {
    s_dialog2: {
      handler(newDialogs) {
        this.$nextTick(() => {
          newDialogs.forEach(item => {
            this.initializeDialogSize(item) // 新しいダイアログにも初期サイズを設定
          })

          const container = this.$refs.dragDiv[this.$refs.dragDiv.length - 1]
          const handle = this.$refs.dragHandle[this.$refs.dragHandle.length - 1]

          let offsetX, offsetY
          const startDrag = (event) => {
            offsetX = event.clientX - container.offsetLeft
            offsetY = event.clientY - container.offsetTop
            window.addEventListener('mousemove', drag)
            window.addEventListener('mouseup', endDrag)
          }

          const drag = (event) => {
            event.preventDefault()
            const newX = event.clientX - offsetX
            let newY = event.clientY - offsetY
            const maxY = window.innerHeight - container.offsetHeight
            if (newY < 0) newY = 0
            else if (newY > maxY) newY = maxY
            container.style.left = `${newX}px`
            container.style.top = `${newY}px`
          }

          const endDrag = () => {
            window.removeEventListener('mousemove', drag)
            window.removeEventListener('mouseup', endDrag)
          }

          try {
            handle.addEventListener('mousedown', startDrag)
          } catch (e) {
            console.log(e)
          }

          // リサイズ処理
          if (!container) return
          const resizeHandles = container.querySelectorAll('.resize-handle')

          resizeHandles.forEach(handle => {
            let isResizing = false
            let startX, startY, startW, startH, startL, startT
            const classList = handle.classList

            const startResize = (e) => {
              e.preventDefault()
              isResizing = true
              startX = e.clientX
              startY = e.clientY
              startW = container.offsetWidth
              startH = container.offsetHeight
              startL = container.offsetLeft
              startT = container.offsetTop
              window.addEventListener('mousemove', doResize)
              window.addEventListener('mouseup', stopResize)
            }

            const doResize = (e) => {
              if (!isResizing) return
              const dx = e.clientX - startX
              const dy = e.clientY - startY

              if (classList.contains('resize-handle-corner-right')) {
                if (startW + dx > 100) container.style.width = `${startW + dx}px`
                if (startH + dy > 100) container.style.height = `${startH + dy}px`
              }

              if (classList.contains('resize-handle-corner-left')) {
                if (startW - dx > 100) {
                  container.style.width = `${startW - dx}px`
                  container.style.left = `${startL + dx}px`
                }
                if (startH + dy > 100) container.style.height = `${startH + dy}px`
              }

              if (classList.contains('resize-handle-side-right')) {
                if (startW + dx > 100) container.style.width = `${startW + dx}px`
              }
              if (classList.contains('resize-handle-side-left')) {
                if (startW - dx > 100) {
                  container.style.width = `${startW - dx}px`
                  container.style.left = `${startL + dx}px`
                }
              }
              if (classList.contains('resize-handle-side-bottom')) {
                if (startH + dy > 100) container.style.height = `${startH + dy}px`
              }
              if (classList.contains('resize-handle-side-top')) {
                if (startH - dy > 100) {
                  container.style.height = `${startH - dy}px`
                  container.style.top = `${startT + dy}px`
                }
              }
            }

            const stopResize = () => {
              isResizing = false
              window.removeEventListener('mousemove', doResize)
              window.removeEventListener('mouseup', stopResize)
            }

            handle.addEventListener('mousedown', startResize)
          })
        })
      },
      deep: true
    }
  }
}
</script>

<style scoped>
.dialog2-div {
  position: absolute;
  z-index: 1;
  background-color: #fff;
  box-shadow: 2px 2px 5px #787878;
  border: 1px solid whitesmoke;
  border-radius: 4px;
  transition: opacity 1s;
  user-select: none;
  min-width: 320px; /* 最小幅を保証 */
  min-height: 250px; /* 最小高さを保証 */
}

.drag-handle {
  height: 30px;
  padding: 5px;
  background-color: rgb(50, 101, 186);
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  cursor: grab;
  color: white;
  font-size: large;
}

.close-btn-div {
  position: absolute;
  top: 0;
  right: 5px;
  cursor: pointer;
  color: #fff;
  z-index: 2;
  font-size: 2.5em;
}

.hover:hover {
  color: blue;
}

.resize-handle {
  position: absolute;
  background-color: transparent;
  z-index: 10;
}

.resize-handle-corner-right {
  width: 20px;
  height: 20px;
  right: 0;
  bottom: 0;
  cursor: se-resize;
  z-index: 20;
}

.resize-handle-corner-left {
  width: 20px;
  height: 20px;
  left: 0;
  bottom: 0;
  cursor: sw-resize;
  z-index: 20;
}

.resize-handle-side-right {
  width: 8px;
  height: calc(100% - 20px);
  top: 0;
  right: 0;
  cursor: e-resize;
}

.resize-handle-side-left {
  width: 8px;
  height: calc(100% - 20px);
  top: 0;
  left: 0;
  cursor: w-resize;
}

.resize-handle-side-top {
  width: 100%;
  height: 8px;
  top: 0;
  left: 0;
  cursor: n-resize;
}

.resize-handle-side-bottom {
  width: calc(100% - 40px);
  height: 8px;
  bottom: 0;
  left: 20px;
  cursor: s-resize;
}
</style>

<!--<template>-->
<!--  <div-->
<!--      ref="dragDiv"-->
<!--      :id="'dialog2-' + item.id"-->
<!--      v-for="item in s_dialog2"-->
<!--      :key="item.id"-->
<!--      :style="item.style"-->
<!--      class="dialog2-div"-->
<!--      @pointerdown="dialogMouseDown(item)"-->
<!--      @mouseup="dialogMouseUp(item)"-->
<!--  >-->
<!--    <div ref="dragHandle" class="drag-handle" :id="'dialog-handle2-' + item.id"></div>-->
<!--    <div>-->
<!--      <div class="close-btn-div" @clic.stop="closeBtn(item)" @pointerdown.stop="closeBtn(item)">-->
<!--        <i class="fa-solid fa-xmark hover close-btn"></i>-->
<!--      </div>-->
<!--      <DialogPyramid :item="item" :mapName="mapName" v-if="item.name === 'pyramid'" />-->
<!--      <DialogJinkosuii :item="item" :mapName="mapName" v-if="item.name === 'jinkosuii'" />-->
<!--      <DialogKyakususuii :item="item" :mapName="mapName" v-if="item.name === 'kyakususuii'" />-->
<!--      <DialogElevation :item="item" :mapName="mapName" v-if="item.name === 'elevation'" />-->
<!--    </div>-->

<!--    &lt;!&ndash; 全方向リサイズハンドル &ndash;&gt;-->
<!--    <div v-if="item.resizable" class="resize-handle resize-handle-corner-right"></div>-->
<!--    <div v-if="item.resizable" class="resize-handle resize-handle-corner-left"></div>-->
<!--    <div v-if="item.resizable" class="resize-handle resize-handle-side-right"></div>-->
<!--    <div v-if="item.resizable" class="resize-handle resize-handle-side-left"></div>-->
<!--    <div v-if="item.resizable" class="resize-handle resize-handle-side-top"></div>-->
<!--    <div v-if="item.resizable" class="resize-handle resize-handle-side-bottom"></div>-->
<!--  </div>-->
<!--</template>-->

<!--<script>-->
<!--import DialogPyramid from "@/components/Dialog-pyramid"-->
<!--import DialogJinkosuii from "@/components/Dialog-jinkosuii"-->
<!--import DialogKyakususuii from "@/components/Dialog-kyakususuii"-->
<!--import DialogElevation from "@/components/Dialog-elevation"-->

<!--export default {-->
<!--  name: 'dialog-2',-->
<!--  props: ['mapName'],-->
<!--  components: {-->
<!--    DialogPyramid,-->
<!--    DialogJinkosuii,-->
<!--    DialogKyakususuii,-->
<!--    DialogElevation-->
<!--  },-->
<!--  computed: {-->
<!--    s_dialog2() {-->
<!--      return this.$store.state.dialogs2[this.mapName]-->
<!--    }-->
<!--  },-->
<!--  methods: {-->
<!--    setResizable(id, flag) {-->
<!--      const item = this.$store.state.dialogs2[this.mapName].find(v => v.id === id)-->
<!--      if (item) {-->
<!--        item.resizable = flag  // Vue 3 ではこれでOK-->
<!--      }-->
<!--    },-->
<!--    closeBtn(item) {-->
<!--      this.$store.state.dialogs2[this.mapName] = this.$store.state.dialogs2[this.mapName].filter(v => v.id !== item.id)-->
<!--    },-->
<!--    dialogMouseUp(item) {-->
<!--      const result = this.$store.state.dialogs2[this.mapName].find(el => el.id === item.id)-->
<!--      const el = document.querySelector('#dialog2-' + item.id)-->
<!--      result.style.top = el.style.top-->
<!--      result.style.left = el.style.left-->
<!--      result.style.width = el.style.width-->
<!--      result.style.height = el.style.height-->
<!--    },-->
<!--    dialogMouseDown(item) {-->
<!--      try {-->
<!--        this.$store.commit('incrDialogMaxZindex')-->
<!--        const result = this.$store.state.dialogs2[this.mapName].find(el => el.id === item.id)-->
<!--        const el = document.querySelector('#dialog2-' + item.id)-->
<!--        result.style.top = el.style.top-->
<!--        result.style.left = el.style.left-->
<!--        el.style.zIndex = this.$store.state.dialogMaxZindex-->
<!--      } catch (e) {-->
<!--        console.log(e)-->
<!--      }-->
<!--    }-->
<!--  },-->
<!--  watch: {-->
<!--    s_dialog2: {-->
<!--      handler() {-->
<!--        this.$nextTick(() => {-->
<!--          const container = this.$refs.dragDiv[this.$refs.dragDiv.length - 1]-->
<!--          const handle = this.$refs.dragHandle[this.$refs.dragHandle.length - 1]-->

<!--          let offsetX, offsetY-->
<!--          const startDrag = (event) => {-->
<!--            offsetX = event.clientX - container.offsetLeft-->
<!--            offsetY = event.clientY - container.offsetTop-->
<!--            window.addEventListener('mousemove', drag)-->
<!--            window.addEventListener('mouseup', endDrag)-->
<!--          }-->

<!--          const drag = (event) => {-->
<!--            event.preventDefault()-->
<!--            const newX = event.clientX - offsetX-->
<!--            let newY = event.clientY - offsetY-->
<!--            const maxY = window.innerHeight - container.offsetHeight-->
<!--            if (newY < 0) newY = 0-->
<!--            else if (newY > maxY) newY = maxY-->
<!--            container.style.left = `${newX}px`-->
<!--            container.style.top = `${newY}px`-->
<!--          }-->

<!--          const endDrag = () => {-->
<!--            window.removeEventListener('mousemove', drag)-->
<!--            window.removeEventListener('mouseup', endDrag)-->
<!--          }-->

<!--          try {-->
<!--            handle.addEventListener('mousedown', startDrag)-->
<!--          } catch (e) {-->
<!--            console.log(e)-->
<!--          }-->

<!--          // リサイズ処理（全方向）-->
<!--          if (!container) return-->
<!--          const resizeHandles = container.querySelectorAll('.resize-handle')-->

<!--          resizeHandles.forEach(handle => {-->
<!--            let isResizing = false-->
<!--            let startX, startY, startW, startH, startL, startT-->
<!--            const classList = handle.classList-->

<!--            const startResize = (e) => {-->
<!--              e.preventDefault()-->
<!--              isResizing = true-->
<!--              startX = e.clientX-->
<!--              startY = e.clientY-->
<!--              startW = container.offsetWidth-->
<!--              startH = container.offsetHeight-->
<!--              startL = container.offsetLeft-->
<!--              startT = container.offsetTop-->
<!--              window.addEventListener('mousemove', doResize)-->
<!--              window.addEventListener('mouseup', stopResize)-->
<!--            }-->

<!--            const doResize = (e) => {-->
<!--              if (!isResizing) return-->
<!--              const dx = e.clientX - startX-->
<!--              const dy = e.clientY - startY-->


<!--              if (classList.contains('resize-handle-corner-right')) {-->
<!--                // 右下：width + height-->
<!--                if (startW + dx > 100) container.style.width = `${startW + dx}px`-->
<!--                if (startH + dy > 100) container.style.height = `${startH + dy}px`-->
<!--              }-->

<!--              if (classList.contains('resize-handle-corner-left')) {-->
<!--                // 左下：width + height（左端移動含む）-->
<!--                if (startW - dx > 100) {-->
<!--                  container.style.width = `${startW - dx}px`-->
<!--                  container.style.left = `${startL + dx}px`-->
<!--                }-->
<!--                if (startH + dy > 100) container.style.height = `${startH + dy}px`-->
<!--              }-->

<!--              if (classList.contains('resize-handle-side-right')) {-->
<!--                if (startW + dx > 100) container.style.width = `${startW + dx}px`-->
<!--              }-->
<!--              if (classList.contains('resize-handle-side-left')) {-->
<!--                if (startW - dx > 100) {-->
<!--                  container.style.width = `${startW - dx}px`-->
<!--                  container.style.left = `${startL + dx}px`-->
<!--                }-->
<!--              }-->
<!--              if (classList.contains('resize-handle-side-bottom')) {-->
<!--                if (startH + dy > 100) container.style.height = `${startH + dy}px`-->
<!--              }-->
<!--              if (classList.contains('resize-handle-side-top')) {-->
<!--                if (startH - dy > 100) {-->
<!--                  container.style.height = `${startH - dy}px`-->
<!--                  container.style.top = `${startT + dy}px`-->
<!--                }-->
<!--              }-->
<!--            }-->

<!--            const stopResize = () => {-->
<!--              isResizing = false-->
<!--              window.removeEventListener('mousemove', doResize)-->
<!--              window.removeEventListener('mouseup', stopResize)-->
<!--            }-->

<!--            handle.addEventListener('mousedown', startResize)-->
<!--          })-->
<!--        })-->
<!--      },-->
<!--      deep: true-->
<!--    }-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--.dialog2-div {-->
<!--  position: absolute;-->
<!--  z-index: 1;-->
<!--  background-color: #fff;-->
<!--  box-shadow: 2px 2px 5px #787878;-->
<!--  border: 1px solid whitesmoke;-->
<!--  border-radius: 4px;-->
<!--  transition: opacity 1s;-->
<!--  user-select: none;-->
<!--}-->

<!--.drag-handle {-->
<!--  height: 30px;-->
<!--  padding: 5px;-->
<!--  background-color: rgb(50, 101, 186);-->
<!--  border-top-left-radius: 4px;-->
<!--  border-top-right-radius: 4px;-->
<!--  cursor: grab;-->
<!--  color: white;-->
<!--  font-size: large;-->
<!--}-->

<!--.close-btn-div {-->
<!--  position: absolute;-->
<!--  top: 0;-->
<!--  right: 5px;-->
<!--  cursor: pointer;-->
<!--  color: #fff;-->
<!--  z-index: 2;-->
<!--  font-size: 2.5em;-->
<!--}-->

<!--.hover:hover {-->
<!--  color: blue;-->
<!--}-->

<!--/* 共通リサイズハンドル */-->
<!--.resize-handle {-->
<!--  position: absolute;-->
<!--  background-color: transparent; /* 👈 見た目を消す */-->
<!--  z-index: 10;-->
<!--}-->

<!--/* ==== 四隅 ==== */-->

<!--/* 右下 corner（優先度最高） */-->
<!--.resize-handle-corner-right {-->
<!--  width: 20px;-->
<!--  height: 20px;-->
<!--  right: 0;-->
<!--  bottom: 0;-->
<!--  cursor: se-resize;-->
<!--  z-index: 20; /* 👈 優先する */-->
<!--}-->

<!--/* 左下 corner（優先度最高） */-->
<!--.resize-handle-corner-left {-->
<!--  width: 20px;-->
<!--  height: 20px;-->
<!--  left: 0;-->
<!--  bottom: 0;-->
<!--  cursor: sw-resize;-->
<!--  z-index: 20; /* 👈 優先する */-->
<!--}-->

<!--/* ==== 四辺 ==== */-->

<!--/* 右辺：縦いっぱい（ただしcornerより短く） */-->
<!--.resize-handle-side-right {-->
<!--  width: 8px;-->
<!--  height: calc(100% - 20px); /* 👈 下cornerと重ならない */-->
<!--  top: 0;-->
<!--  right: 0;-->
<!--  cursor: e-resize;-->
<!--}-->

<!--/* 左辺：縦いっぱい（ただしcornerより短く） */-->
<!--.resize-handle-side-left {-->
<!--  width: 8px;-->
<!--  height: calc(100% - 20px); /* 👈 下cornerと重ならない */-->
<!--  top: 0;-->
<!--  left: 0;-->
<!--  cursor: w-resize;-->
<!--}-->

<!--/* 上辺：横いっぱい */-->
<!--.resize-handle-side-top {-->
<!--  width: 100%;-->
<!--  height: 8px;-->
<!--  top: 0;-->
<!--  left: 0;-->
<!--  cursor: n-resize;-->
<!--}-->

<!--/* 下辺：横いっぱい（ただし左右corner避ける） */-->
<!--.resize-handle-side-bottom {-->
<!--  width: calc(100% - 40px); /* 👈 両端のcornerを避ける */-->
<!--  height: 8px;-->
<!--  bottom: 0;-->
<!--  left: 20px;-->
<!--  cursor: s-resize;-->
<!--}-->

<!--</style>-->
