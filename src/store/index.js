import { createStore } from 'vuex'

export default createStore({
  state: {
    map01:null,
    map02:null,
    changeFlg: false,
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
    },
    selectedLayers: {
      map01:[],
      map02:[]
    },
    dialogMaxZindex: 0,
  },
  getters: {
  },
  mutations: {
    incrDialogMaxZindex (state) {
      state.dialogMaxZindex++
    },
  },
  actions: {
  },
  modules: {
  }
})
