(function(){"use strict";var e={376:function(e,t,a){var o=a(5130),i=a(6768),n=a(4232),r=a(6450),l=a(6018),s=a(1051);const d={id:"map00"},u=["id"],m={id:"left-top-div"};function p(e,t,a,p,c,g){const f=(0,i.g2)("DialogMenu"),h=(0,i.g2)("DialogLayer");return(0,i.uX)(),(0,i.Wv)(r.E,null,{default:(0,i.k6)((()=>[(0,i.bF)(s.Y,null,{default:(0,i.k6)((()=>[(0,i.Lk)("div",d,[((0,i.uX)(!0),(0,i.CE)(i.FK,null,(0,i.pI)(e.mapNames,(a=>(0,i.bo)(((0,i.uX)(),(0,i.CE)("div",{key:a,id:a,style:(0,n.Tr)(e.mapSize[a])},[t[3]||(t[3]=(0,i.Lk)("div",{class:"center-target"},null,-1)),(0,i.Lk)("div",m,["map01"===a?((0,i.uX)(),(0,i.Wv)(l.D,{key:0,onClick:e=>g.btnClickMenu(a)},{default:(0,i.k6)((()=>t[0]||(t[0]=[(0,i.Lk)("i",{class:"fa-solid fa-bars"},null,-1)]))),_:2},1032,["onClick"])):(0,i.Q3)("",!0),"map01"===a?((0,i.uX)(),(0,i.Wv)(l.D,{key:1,style:{"margin-left":"10px"},onClick:g.btnClickSplit},{default:(0,i.k6)((()=>t[1]||(t[1]=[(0,i.Lk)("i",{class:"fa-solid fa-table-columns"},null,-1)]))),_:1},8,["onClick"])):(0,i.Q3)("",!0),(0,i.bF)(l.D,{style:{"margin-left":"10px"},onClick:e=>g.btnClickLayer(a)},{default:(0,i.k6)((()=>t[2]||(t[2]=[(0,i.Lk)("i",{class:"fa-solid fa-layer-group"},null,-1)]))),_:2},1032,["onClick"])]),(0,i.bF)(f,{mapName:a},null,8,["mapName"]),(0,i.bF)(h,{mapName:a},null,8,["mapName"])],12,u)),[[o.aG,e.mapFlg[a]]]))),128))])])),_:1})])),_:1})}function c(e,t,a,o,r,l){const s=(0,i.g2)("Dialog");return(0,i.uX)(),(0,i.Wv)(s,{dialog:l.s_dialogs[a.mapName],mapName:a.mapName},{default:(0,i.k6)((()=>[(0,i.Lk)("div",{style:(0,n.Tr)(e.menuContentSize)}," メニュー まだなにもない ",4)])),_:1},8,["dialog","mapName"])}var g={name:"Dialog-menu",props:["mapName"],data:()=>({test:"test",menuContentSize:{height:"auto",margin:"10px",overflow:"auto","user-select":"text"}}),computed:{s_dialogs(){return this.$store.state.dialogs.menuDialog}},methods:{}},f=a(1241);const h=(0,f.A)(g,[["render",c]]);var y=h,b=a(9921);function v(e,t,a,o,r,l){const s=(0,i.g2)("Dialog");return(0,i.uX)(),(0,i.Wv)(s,{dialog:l.s_dialogs[a.mapName],mapName:a.mapName},{default:(0,i.k6)((()=>[(0,i.Lk)("div",{style:(0,n.Tr)(e.menuContentSize)},[((0,i.uX)(!0),(0,i.CE)(i.FK,null,(0,i.pI)(e.layers,(e=>((0,i.uX)(),(0,i.Wv)(b.N,{key:e,modelValue:e.value,"onUpdate:modelValue":t=>e.value=t,label:e.label,"hide-details":"",inset:"",onChange:t[0]||(t[0]=e=>l.changeSwitch(a.mapName))},null,8,["modelValue","onUpdate:modelValue","label"])))),128))],4)])),_:1},8,["dialog","mapName"])}var x={name:"Dialog-layer",props:["mapName"],data:()=>({test:"test",layers:[{name:"gsiLayer",label:"地理院地図",value:!1},{name:"bldg",label:"東京都23区建物データ",value:!1},{name:"amx",label:"法務省登記所備付地図",value:!1}],menuContentSize:{height:"auto",margin:"10px",overflow:"auto","user-select":"text"}}),computed:{s_dialogs(){return this.$store.state.dialogs.layerDialog}},methods:{changeSwitch(e){const t=this,a=this.$store.state[e];t.layers.forEach((e=>{console.log(e),"amx"===e.name?e.value?(a.setLayoutProperty("amx-a-fude","visibility","visible"),a.setLayoutProperty("amx-a-daihyo","visibility","visible")):(a.setLayoutProperty("amx-a-fude","visibility","none"),a.setLayoutProperty("amx-a-daihyo","visibility","none")):e.value?a.setLayoutProperty(e.name,"visibility","visible"):a.setLayoutProperty(e.name,"visibility","none")}))}},watch:{layers(){alert()}}};const k=(0,f.A)(x,[["render",v]]);var w=k,D=a(7326),z=a.n(D),L=a(4800),N={name:"App",components:{DialogLayer:w,DialogMenu:y},data:()=>({mapNames:["map01","map02"],mapFlg:{map01:!0,map02:!1},mapSize:{map01:{top:0,left:0,width:"100%",height:window.innerHeight+"px"},map02:{top:0,right:0,width:"50%",height:window.innerHeight+"px"}}}),methods:{btnClickMenu(e){"none"===this.$store.state.dialogs.menuDialog[e].style.display?(this.$store.commit("incrDialogMaxZindex"),this.$store.state.dialogs.menuDialog[e].style["z-index"]=this.$store.state.dialogMaxZindex,this.$store.state.dialogs.menuDialog[e].style.display="block"):this.$store.state.dialogs.menuDialog[e].style.display="none"},btnClickLayer(e){"none"===this.$store.state.dialogs.layerDialog[e].style.display?(this.$store.commit("incrDialogMaxZindex"),this.$store.state.dialogs.layerDialog[e].style["z-index"]=this.$store.state.dialogMaxZindex,this.$store.state.dialogs.layerDialog[e].style.display="block"):this.$store.state.dialogs.layerDialog[e].style.display="none"},btnClickSplit(){this.mapFlg.map02?(this.mapSize.map01.width="100%",this.mapFlg.map02=!1):(this.mapSize.map01.width="50%",this.mapFlg.map02=!0)}},mounted(){let e=new L.Zs;z().addProtocol("pmtiles",e.tile),this.mapNames.forEach((e=>{const t=new(z().Map)({container:e,center:[139.7024,35.6598],zoom:16,maxPitch:85,style:{version:8,sources:{"background-osm-raster":{type:"raster",tiles:["https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png"],tileSize:256,attribution:"<a href='https://www.openstreetmap.org/copyright' target='_blank'>© OpenStreetMap contributors</a>"},"aws-terrain":{type:"raster-dem",minzoom:1,maxzoom:15,encoding:"terrarium",tiles:["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"]}},layers:[{id:"background-osm-raster",type:"raster",source:"background-osm-raster"}],terrain:{source:"aws-terrain",exaggeration:1},sky:{"sky-color":"#199EF3","sky-horizon-blend":.5,"horizon-color":"#ffffff","horizon-fog-blend":.5,"fog-color":"#0000ff","fog-ground-blend":.5,"atmosphere-blend":["interpolate",["linear"],["zoom"],0,1,10,1,12,0]}}});this.$store.state[e]=t}));let t=!1;function a(e,a){e.on("move",(()=>{t||(t=!0,a.setCenter(e.getCenter()),a.setZoom(e.getZoom()),t=!1)})),a.on("move",(()=>{t||(t=!0,e.setCenter(a.getCenter()),e.setZoom(a.getZoom()),t=!1)}))}a(this.$store.state.map01,this.$store.state.map02),this.mapNames.forEach((e=>{const t=this.$store.state[e];t.on("load",(()=>{t.addSource("gsi",{type:"raster",tiles:["https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"],tileSize:256}),t.addLayer({id:"gsiLayer",type:"raster",source:"gsi",minzoom:0,maxzoom:18}),t.setLayoutProperty("gsiLayer","visibility","none"),t.addSource("amx-a-pmtiles",{type:"vector",minzoom:2,maxzoom:16,url:"pmtiles://https://habs.rad.naro.go.jp/spatial_data/amx/a.pmtiles",attribution:"<a href='https://www.moj.go.jp/MINJI/minji05_00494.html' target='_blank'>登記所備付地図データ（法務省）</a>"}),t.addLayer({id:"amx-a-fude",type:"fill",source:"amx-a-pmtiles","source-layer":"fude",paint:{"fill-color":"rgba(254, 217, 192, 1)","fill-outline-color":"rgba(255, 0, 0, 1)","fill-opacity":.4}}),t.addLayer({id:"amx-a-daihyo",type:"heatmap",source:"amx-a-pmtiles","source-layer":"daihyo",paint:{"heatmap-color":["interpolate",["linear"],["heatmap-density"],0,"rgba(255, 255, 255, 0)",.5,"rgba(255, 255, 0, 0.5)",1,"rgba(255, 0, 0, 0.5)"],"heatmap-radius":["interpolate",["exponential",10],["zoom"],2,5,14,50]}}),t.setLayoutProperty("amx-a-fude","visibility","none"),t.setLayoutProperty("amx-a-daihyo","visibility","none"),t.addSource("plateau-bldg",{type:"vector",tiles:["https://indigo-lab.github.io/plateau-lod2-mvt/{z}/{x}/{y}.pbf"],minzoom:10,maxzoom:16,attribution:"<a href='https://github.com/indigo-lab/plateau-lod2-mvt'>plateau-lod2-mvt by indigo-lab</a> (<a href='https://www.mlit.go.jp/plateau/'>国土交通省 Project PLATEAU</a> のデータを加工して作成)"}),t.addLayer({id:"bldg",type:"fill-extrusion",source:"plateau-bldg","source-layer":"bldg",paint:{"fill-extrusion-height":["*",["get","z"],1],"fill-extrusion-color":"#797979","fill-extrusion-opacity":.7}}),t.setLayoutProperty("bldg","visibility","none")}))}))}};const $=(0,f.A)(N,[["render",p],["__scopeId","data-v-71ae3038"]]);var C=$,_=a(782),j=(0,_.y$)({state:{map01:null,map02:null,storeTest:"storeTest",dialogs:{menuDialog:{map01:{name:"menuDialog",style:{top:"56px",left:"10px","z-index":1,height:"auto","min-width":"150px",display:"none"}},map02:{name:"menuDialog",style:{top:"56px",left:"10px","z-index":1,height:"auto","min-width":"150px",display:"none"}}},layerDialog:{map01:{name:"layerDialog",style:{top:"56px",left:"10px","z-index":1,height:"auto","min-width":"150px",display:"none"}},map02:{name:"layerDialog",style:{top:"56px",left:"10px","z-index":1,height:"auto","min-width":"150px",display:"none"}}}},dialogMaxZindex:0},getters:{},mutations:{incrDialogMaxZindex(e){e.dialogMaxZindex++}},actions:{},modules:{}}),M=(a(5524),a(1480)),O=(0,M.$N)({defaults:{VBtn:{color:"primary",variant:"outlined",rounded:!1}}});async function P(){const e=await a.e(53).then(a.t.bind(a,8874,23));e.load({google:{families:["Roboto:100,300,400,500,700,900&display=swap"]}})}const S=["id"];function E(e,t,a,o,r,l){const s=(0,i.gN)("drag");return(0,i.bo)(((0,i.uX)(),(0,i.CE)("div",{onVDragEnd:t[1]||(t[1]=(...e)=>l.dragEnd&&l.dragEnd(...e)),class:"dialog-div",ref:"dragDiv",onMousedown:t[2]||(t[2]=(...e)=>l.dialogMouseDown&&l.dialogMouseDown(...e)),style:(0,n.Tr)(this.dialog.style)},[(0,i.Lk)("div",{class:"drag-handle",id:l.id},null,8,S),(0,i.Lk)("div",null,[(0,i.Lk)("div",{class:"close-btn-div",onClick:t[0]||(t[0]=(...e)=>l.closeBtn&&l.closeBtn(...e))},t[3]||(t[3]=[(0,i.Lk)("i",{class:"fa-solid fa-xmark hover close-btn"},null,-1)])),(0,i.RG)(e.$slots,"default",{},void 0,!0)])],36)),[[s,{handle:"#"+l.id}]])}var F={name:"dialog-0",props:["dialog","mapName"],components:{},data(){return{}},methods:{dragEnd(){this.$store.state.dialogs[this.dialog.name][this.mapName].style.top=this.$refs.dragDiv.style.top,this.$store.state.dialogs[this.dialog.name][this.mapName].style.left=this.$refs.dragDiv.style.left},closeBtn(){this.$store.state.dialogs[this.dialog.name][this.mapName].style.display="none"},dialogMouseDown(){this.$store.commit("incrDialogMaxZindex"),this.$store.state.dialogs[this.dialog.name][this.mapName].style.top=this.$refs.dragDiv.style.top,this.$store.state.dialogs[this.dialog.name][this.mapName].style.left=this.$refs.dragDiv.style.left,this.$store.state.dialogs[this.dialog.name][this.mapName].style["z-index"]=this.$store.state.dialogMaxZindex}},computed:{id(){return"drag-handle-"+this.dialog.name+"-"+this.mapName}},mounted(){console.log(this.dialog)}};const T=(0,f.A)(F,[["render",E],["__scopeId","data-v-491d8796"]]);var Z=T,A=a(344);P(),(0,o.Ef)(C).use(j).use(O).use(A.A).component("Dialog",Z).mount("#app")}},t={};function a(o){var i=t[o];if(void 0!==i)return i.exports;var n=t[o]={exports:{}};return e[o].call(n.exports,n,n.exports,a),n.exports}a.m=e,function(){var e=[];a.O=function(t,o,i,n){if(!o){var r=1/0;for(u=0;u<e.length;u++){o=e[u][0],i=e[u][1],n=e[u][2];for(var l=!0,s=0;s<o.length;s++)(!1&n||r>=n)&&Object.keys(a.O).every((function(e){return a.O[e](o[s])}))?o.splice(s--,1):(l=!1,n<r&&(r=n));if(l){e.splice(u--,1);var d=i();void 0!==d&&(t=d)}}return t}n=n||0;for(var u=e.length;u>0&&e[u-1][2]>n;u--)e[u]=e[u-1];e[u]=[o,i,n]}}(),function(){a.n=function(e){var t=e&&e.__esModule?function(){return e["default"]}:function(){return e};return a.d(t,{a:t}),t}}(),function(){var e,t=Object.getPrototypeOf?function(e){return Object.getPrototypeOf(e)}:function(e){return e.__proto__};a.t=function(o,i){if(1&i&&(o=this(o)),8&i)return o;if("object"===typeof o&&o){if(4&i&&o.__esModule)return o;if(16&i&&"function"===typeof o.then)return o}var n=Object.create(null);a.r(n);var r={};e=e||[null,t({}),t([]),t(t)];for(var l=2&i&&o;"object"==typeof l&&!~e.indexOf(l);l=t(l))Object.getOwnPropertyNames(l).forEach((function(e){r[e]=function(){return o[e]}}));return r["default"]=function(){return o},a.d(n,r),n}}(),function(){a.d=function(e,t){for(var o in t)a.o(t,o)&&!a.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:t[o]})}}(),function(){a.f={},a.e=function(e){return Promise.all(Object.keys(a.f).reduce((function(t,o){return a.f[o](e,t),t}),[]))}}(),function(){a.u=function(e){return"js/webfontloader.81ef3343.js"}}(),function(){a.miniCssF=function(e){}}(),function(){a.g=function(){if("object"===typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"===typeof window)return window}}()}(),function(){a.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)}}(),function(){var e={},t="open-hinata3:";a.l=function(o,i,n,r){if(e[o])e[o].push(i);else{var l,s;if(void 0!==n)for(var d=document.getElementsByTagName("script"),u=0;u<d.length;u++){var m=d[u];if(m.getAttribute("src")==o||m.getAttribute("data-webpack")==t+n){l=m;break}}l||(s=!0,l=document.createElement("script"),l.charset="utf-8",l.timeout=120,a.nc&&l.setAttribute("nonce",a.nc),l.setAttribute("data-webpack",t+n),l.src=o),e[o]=[i];var p=function(t,a){l.onerror=l.onload=null,clearTimeout(c);var i=e[o];if(delete e[o],l.parentNode&&l.parentNode.removeChild(l),i&&i.forEach((function(e){return e(a)})),t)return t(a)},c=setTimeout(p.bind(null,void 0,{type:"timeout",target:l}),12e4);l.onerror=p.bind(null,l.onerror),l.onload=p.bind(null,l.onload),s&&document.head.appendChild(l)}}}(),function(){a.r=function(e){"undefined"!==typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}}(),function(){a.p=""}(),function(){var e={524:0};a.f.j=function(t,o){var i=a.o(e,t)?e[t]:void 0;if(0!==i)if(i)o.push(i[2]);else{var n=new Promise((function(a,o){i=e[t]=[a,o]}));o.push(i[2]=n);var r=a.p+a.u(t),l=new Error,s=function(o){if(a.o(e,t)&&(i=e[t],0!==i&&(e[t]=void 0),i)){var n=o&&("load"===o.type?"missing":o.type),r=o&&o.target&&o.target.src;l.message="Loading chunk "+t+" failed.\n("+n+": "+r+")",l.name="ChunkLoadError",l.type=n,l.request=r,i[1](l)}};a.l(r,s,"chunk-"+t,t)}},a.O.j=function(t){return 0===e[t]};var t=function(t,o){var i,n,r=o[0],l=o[1],s=o[2],d=0;if(r.some((function(t){return 0!==e[t]}))){for(i in l)a.o(l,i)&&(a.m[i]=l[i]);if(s)var u=s(a)}for(t&&t(o);d<r.length;d++)n=r[d],a.o(e,n)&&e[n]&&e[n][0](),e[n]=0;return a.O(u)},o=self["webpackChunkopen_hinata3"]=self["webpackChunkopen_hinata3"]||[];o.forEach(t.bind(null,0)),o.push=t.bind(null,o.push.bind(o))}();var o=a.O(void 0,[504],(function(){return a(376)}));o=a.O(o)})();
//# sourceMappingURL=app.5e217285.js.map