import { createStore } from 'vuex'

export default createStore({
  state: {
    storeTest: 'storeTest',
    dialogs: {
      menuDialog: {name:'menuDialog',style: {top: '56px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},
      layerDialog: {name:'layerDialog',style: {top: '56px', left: '10px', 'z-index': 1, height: 'auto', 'min-width': '150px', display: 'none'}},

    }
  },
  getters: {
  },
  mutations: {
  },
  actions: {
  },
  modules: {
  }
})
