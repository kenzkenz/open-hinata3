import { createStore } from 'vuex'

export default createStore({
  state: {
    map01:null,
    map02:null,
    // changeFlg: false,
    storeTest: 'storeTest',
    dialogs: {
      menuDialog: {
        map01:{name:'menuDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '250px', display: 'none'}},
        map02:{name:'menuDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '250px', display: 'none'}},
      },
      layerDialog: {
        map01:{name:'layerDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
        map02:{name:'layerDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
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
      },
    }
    //------------------------
  },
  getters: {
  },
  mutations: {
    updateParam (state,payload) {
      let variable;
      // console.log(payload.value)
      // console.log(payload.order)
      // console.log(payload.name)

      const estSps = [
        'ext-sp28',
        'ext-sp36',
        'ext-sp45',
        'ext-sp61',
        'ext-sp74',
        'ext-sp79',
        'ext-sp84',
        'ext-sp87',
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
        }

        state.color[payload.mapName][target][target2] = Number(payload.value)
        state.extFire = !state.extFire

        // console.log(state.color[payload.mapName])
      } else {
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
        }
        console.log(payload.mapName,payload.name,payload.value,variable)
        state[variable][payload.mapName] = payload.value
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
