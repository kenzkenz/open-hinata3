import { createStore } from 'vuex'

export default createStore({
  state: {
    map01:null,
    map02:null,
    // changeFlg: false,
    storeTest: 'storeTest',
    dialogs: {
      shareDialog:{
        map01:{name:'shareDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '350px', display: 'none'}},
        map02:{name:'shareDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '250px', display: 'none'}},
      },
      menuDialog: {
        map01:{name:'menuDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '250px', display: 'none'}},
        map02:{name:'menuDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '250px', display: 'none'}},
      },
      layerDialog: {
        map01:{name:'layerDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none','overflow-y': 'auto'}},
        map02:{name:'layerDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none','overflow-y': 'auto'}},
      },
      pyramidDialog: {
        map01:{name:'pyramidDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
        map02:{name:'pyramidDialog',style: {top: '56px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
      },
      extHighway: {
        map01:{name:'extHighway',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
        map02:{name:'extHighway',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
      },
    },
    dialogsInfo: {
      map01: [],
      map02: [],
    },
    ext: {
      map01:[],
      map02:[]
    },
    selectedLayers: {
      map01:[],
      map02:[]
    },
    dialogs2: {
      map01: [],
      map02: [],
    },
    url: 'dumy',
    dialog2Id:1,
    dialogMaxZindex: 0,
    cdArea: '',
    syochiikiName: '',
    koureikaritu: '',
    heikinnenrei: '',
    kokuchoYear: '',
    estatDataset: null,
    jinkosuiiDataset:[],
    jinkosuiiDatasetEstat:[],
    watchFlg: true,
    terrainLevel:1,
    isPitch: false,
    lngRange: [],
    latRange: [],
    lngRange2: [],
    latRange2: [],
    secondDivStyle: {'height': '390px', 'overflow': 'auto', 'user-select': 'text'},
    extFire:false,
    osmFire:false,
    MESH_ID: '',
    isEstat: true,
    suikeiYear: '',
    popupAddress: '',
    stationName: '',
    kei: '',
    prefId: '',
    zahyokei: '',
    zeniGeojson: '',
    //------------------------
    highwayYear:{
      map01: 2024,
      map02: 2024
    },
    tetsudojikeiretsuYear:{
      map01: 2024,
      map02: 2024
    },
    syochiikiNameText:{
      map01: '',
      map02: ''
    },
    bakumatsuText:{
      map01: '',
      map02: ''
    },
    bakumatsuText3d:{
      map01: '',
      map02: ''
    },
    bakumatsuSelected:{
      map01: '藩で色分け',
      map02: '藩で色分け'
    },
    koazaText:{
      map01: '',
      map02: ''
    },
    sekibutsuText:{
      map01: '',
      map02: ''
    },
    busSelected:{
      map01: '標準',
      map02: '標準'
    },
    color:{
      map01: {
        sp28:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp36:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp45:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp61:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp74:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp79:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp84:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp87:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        jinsoku:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
      },
      map02: {
        sp28:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp36:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp45:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp61:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp74:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp79:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp84:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        sp87:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
        jinsoku:{brightnessMin:0,brightnessMax:1,hueRotate:0,contrast:0,saturation:0,sharpness:0},
      }
    },
    isPaintGeopark:{
      map01: true,
      map02: true
    },
    kyakusuYear:{
      map01: 2022,
      map02: 2022
    },
    jigyousya:{
      map01: '全て',
      map02: '全て'
    },
    isPaintBunsuirei:{
      map01: true,
      map02: true
    },
    isKasen:{
      map01: true,
      map02: true
    },
    suikeiText:{
      map01: '',
      map02: ''
    },
    kasenCode:{
      map01: '',
      map02: ''
    },
    kasenMei:{
      map01: '',
      map02: ''
    },
    isPaintCity:{
      map01:{
        t09:true,
        r05:true,
        gun:true,
      },
      map02: {
        t09:true,
        r05:true,
        gun:true,
      },
    },
    cityText:{
      map01:{
        t09:'',
        r05:'',
        gun:'',
      },
      map02: {
        t09:'',
        r05:'',
        gun:'',
      },
    },
    osmText:{
      map01: '',
      map02: ''
    },
    rawQueryText:{
      map01: '',
      map02: ''
    },
    tokijyoText:{
      map01: '',
      map02: ''
    },
    zeniKm:{
      map01: 20,
      map02: 20
    },
    //------------------------
  },
  getters: {
  },
  mutations: {
    updateParam (state,payload) {
      let variable
      let variable2
      const estSps = [
        'ext-sp28',
        'ext-sp36',
        'ext-sp45',
        'ext-sp61',
        'ext-sp74',
        'ext-sp79',
        'ext-sp84',
        'ext-sp87',
        'ext-jinsoku',
      ]
      if (estSps.includes(payload.name)) {
        const target = payload.name.split('-')[1]
        let target2
        switch (payload.order) {
          case 0:
            target2 = 'brightnessMin'
            break
          case 1:
            target2 = 'brightnessMax'
            break
          case 2:
            target2 = 'hueRotate'
            break
          case 3:
            target2 = 'contrast'
            break
          case 4:
            target2 = 'saturation'
            break
          // case 5:
          //   target2 = 'sharpness'
          //   break
        }
        state.color[payload.mapName][target][target2] = Number(payload.value)
      } else {
        console.log(payload.name)
        switch (payload.name) {
          case 'extHighway':
            variable = 'highwayYear'
            break
          case 'extTetsudojikeiretsu':
            variable = 'tetsudojikeiretsuYear'
            break
          case 'extSyochiiki':
            variable = 'syochiikiNameText'
            break
          case 'extBakumatsu':
            if (payload.order === 0) {
              variable = 'bakumatsuText'
            } else if (payload.order === 1){
              variable = 'bakumatsuSelected'
            }
            break
          case 'extBakumatsu3d':
            variable = 'bakumatsuText3d'
            break
          case 'jinko250m':
            if (payload.order === 0) {
              variable = 'jinko250m'
            } else if (payload.order === 1){
              variable = 'paintCheck250m'
            }
            break
          case 'extBus':
            variable = 'busSelected'
            break
          case 'extKoaza':
            variable = 'koazaText'
            break
          case 'extGeopark':
            variable = 'isPaintGeopark'
            break
          case 'extKyakusu':
            if (payload.order === 0) {
              variable = 'kyakusuYear'
            } else if (payload.order === 1){
              variable = 'jigyousya'
            }
            break
          case 'extSekibutsu':
            variable = 'sekibutsuText'
            break
          case 'extBunsuirei':
            if (payload.order === 0) {
              variable = 'isPaintBunsuirei'
            } else if (payload.order === 1){
              variable = 'isKasen'
            } else if (payload.order === 2){
              variable = 'suikeiText'
            } else if (payload.order === 3){
              variable = 'kasenCode'
            } else if (payload.order === 4){
              variable = 'kasenMei'
            }
            break
          case 'ext-city-gun':
          case 'ext-city-r05':
          case 'ext-city-t09':
            if (payload.order === 0) {
              variable = 'isPaintCity'
              variable2 = payload.name.split('-')[2]
            } else if (payload.order === 1){
              variable = 'cityText'
              variable2 = payload.name.split('-')[2]
            }
            break
          case 'extOSM':
            if (payload.order === 0) {
              variable = 'osmText'
            }
            if (payload.order === 1) {
              variable = 'rawQueryText'
            }
            break
          case 'extTokijyo':
            if (payload.order === 0) {
              variable = 'tokijyoText'
            }
            break
          case 'extZeni':
            if (payload.order === 0) {
              variable = 'zeniKm'
            }
            break
        }
        console.log(payload.mapName,payload.name,payload.value,variable,variable2)
        if (!variable2) {
          console.log(variable)
          state[variable][payload.mapName] = payload.value
        } else {
          // alert()
          state[variable][payload.mapName][variable2] = payload.value
        }
        setTimeout(() => {
          state.extFire = !state.extFire
        },10)
      }
    },
    updateSelectedLayers (state, payload) {
      const result = state.selectedLayers[payload.mapName].find(el => el.id === payload.id);
      console.log(result,payload.values)
      state.watchFlg = false
      result.ext.values = payload.values
    },
    incrDialogMaxZindex (state) {
      state.dialogMaxZindex++
    },
    incrDialog2Id (state) {
      state.dialog2Id++
    },
    // インフォ用ダイアログの追加------------------------------------------------------------------
    pushDialogsInfo (state,payload) {
      const dialogs = state.dialogsInfo[payload.mapName];
      dialogs.push(payload.dialog)
    },
    pushDialogs2 (state,payload) {
      const dialogs = state.dialogs2[payload.mapName];
      dialogs.push(payload.dialog)
      console.log(payload.dialog)
    },
  },
  actions: {
  },
  modules: {
  }
})
