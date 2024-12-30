<template>
  <div ref="dragDiv" :id="'dialog-info-'+ item.id" class="dialog-info-div" v-for="item in info" :key="item.id" :style="item.style" @mousedown="dialogMouseDown(item)" @mouseup="dialogMouseDown(item)">
    <div ref="dragHandle" class="drag-handle" :id="'handle-'+ item.id"></div>
    <div class="close-btn-div" @click="close(item)"><i style="" class="fa-solid fa-xmark hover close-btn"></i></div>
      <!--なにもないとき。普通のラスターのとき-->
      <div v-if="!item.ext">
        <div class="info-content-div">
          <p v-html="item.label"></p><hr>
          <br>
          <p v-html="item.attribution"></p>
        </div>
      </div>
      <!--コンポーネントをここに書き連ねる -->
      <extHighway :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extHighway'"/>
      <extTetsudojikeiretsu :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extTetsudojikeiretsu'"/>
      <extSyochiiki :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extSyochiiki'"/>
      <extBakumatsu :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extBakumatsu'"/>
      <extBakumatsu3d :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extBakumatsu3d'"/>
      <extKoaza :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extKoaza'"/>
      <extBus :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extBus'"/>
      <extSp :item="item" :mapName="mapName" v-else-if="[
        'ext-sp28',
        'ext-sp36',
        'ext-sp45',
        'ext-sp61',
        'ext-sp74',
        'ext-sp79',
        'ext-sp84',
        'ext-sp87',
        'ext-jinsoku',
          ].includes(item.ext.name)"/>
    <extGeopark :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extGeopark'"/>
    <extKyakusu :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extKyakusu'"/>
    <extSekibutsu :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extSekibutsu'"/>
    <extBunsuirei :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extBunsuirei'"/>
    <extCity :item="item" :mapName="mapName" v-else-if="[
        'ext-city-t09',
        'ext-city-r05',
        'ext-city-gun',
          ].includes(item.ext.name)"/>
    <extOSM :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extOSM'"/>
    <extTokijyo :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extTokijyo'"/>
    <extZeni :item="item" :mapName="mapName" v-else-if="item.ext.name === 'extZeni'"/>
    <extIwata :item="item" :mapName="mapName" v-else-if="[
        'extIwata',
        'extNarashi',
        'extFukushimashi',
        'extChibanz2024',
          ].includes(item.ext.name)"/>
  </div>
</template>

<script>
import extHighway from "@/components/ext-highway"
import extTetsudojikeiretsu from "@/components/ext-tetsudojikeiretsu"
import extSyochiiki from '@/components/ext-syochiiki'
import extBakumatsu from "@/components/ext-bakumatsu"
import extBakumatsu3d from "@/components/ext-bakumatsu3d"
import extKoaza from '@/components/ext-koaza'
import extBus from "@/components/ext-bus"
import extSp from "@/components/ext-sp"
import extGeopark from "@/components/ext-geopark"
import extKyakusu from "@/components/ext-kyakusu"
import extSekibutsu from '@/components/ext-sekibutsu'
import extBunsuirei from "@/components/ext-bunsuirei"
import extCity from "@/components/ext-city"
import extOSM from "@/components/ext-osm"
import extTokijyo from "@/components/ext-tokijyo"
import extZeni from "@/components/ext-zeni"
import extIwata from "@/components/ext-chiban"

export default {
  name: "dialog-info",
  components: {
    extHighway,
    extTetsudojikeiretsu,
    extSyochiiki,
    extBakumatsu,
    extBakumatsu3d,
    extKoaza,
    extBus,
    extSp,
    extGeopark,
    extKyakusu,
    extSekibutsu,
    extBunsuirei,
    extCity,
    extOSM,
    extTokijyo,
    extZeni,
    extIwata
  },
  props: ['mapName'],
  data: () => ({
  }),
  computed: {
    info () {
      return this.$store.state.dialogsInfo[this.mapName]
    }
  },
  methods: {
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
    info: {
      handler: function(){
        this.$nextTick(() => {
          if (!this.$refs.dragDiv) return
          this.$refs.dragDiv.forEach((dragDiv,i) =>{
            const container = dragDiv
            const handle =  this.$refs.dragHandle[i]
            // const container = this.$refs.dragDiv[this.$refs.dragDiv.length -1]
            // const handle =  this.$refs.dragHandle[this.$refs.dragHandle.length -1]
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
          })
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
      touch-action: none;
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
      font-size: 16px;
    }
    /* 凡例のスタイル */
    .legend-scale{
      margin-top: 20px;
    }
    .legend-scale ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .legend-scale ul li {
      margin: 0 0 5px 0;
      padding: 0;
      display: flex;
      align-items: center;
    }
    .legend-scale ul li span {
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-right: 5px;
      border: 1px solid #999;
    }
</style>
