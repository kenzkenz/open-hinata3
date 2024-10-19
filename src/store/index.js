import { createStore } from 'vuex'

export default createStore({
  state: {
    map01:null,
    map02:null,
    // changeFlg: false,
    storeTest: 'storeTest',
    dialogs: {
      menuDialog: {
        map01:{name:'menuDialog',style: {top: '56px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
        map02:{name:'menuDialog',style: {top: '56px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
      },
      layerDialog: {
        map01:{name:'layerDialog',style: {top: '56px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
        map02:{name:'layerDialog',style: {top: '56px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
      },
      pyramidDialog: {
        map01:{name:'pyramidDialog',style: {top: '56px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
        map02:{name:'pyramidDialog',style: {top: '56px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
      },
      extHighway: {
        map01:{name:'extHighway',style: {top: '56px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
        map02:{name:'extHighway',style: {top: '56px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
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
  },
  getters: {
  },
  mutations: {
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
      // console.log(payload.dialog)
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
