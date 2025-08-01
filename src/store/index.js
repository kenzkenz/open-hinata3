import { createStore } from 'vuex'
import { db } from '@/firebase'
import firebase from "firebase";

export default createStore({
  state: {
    selectedFile: null,
    previewUrl: '',
    pictureUrl: '',
    drawGeojsonId: '',
    pmtilesFirstSave: false,
    pmtilesMaximum: 16,
    pmtiles0Name: '',
    pmtilesLabel: '',
    pmtilesStyle: {},
    propnames: [],
    pmtiles0Id: 0,
    floatingWindows: {},
    featureForOfflineBbox: null,
    isOffline: false,
    dialogForOffline2: false,
    dialogForOffline: false,
    dialogForPicture: false,
    vpsServerName: 'kenzkenz.net',
    drawFire: false,
    drawOpacity: 1,
    drawVisible: true,
    isPrint: false,
    isLassoSelected: false,
    lassoGeojson: null,
    toggleCheckFire: false,
    printTitleText: '',
    textPx: 30,
    titleColor: 'black',
    titleDirection: 'vertical',
    finishLineFire: false,
    popupDialog: false,
    popupHtml: '',
    elevationGeojson: '',
    isMoveMode: false,

    currentTextColor: 'black',
    currentPointColor: 'black',
    currentTextSize: 16,

    currentCircleRadius: 0,
    currentCircleColor: 'blue',
    currentCircleLineColor: 'black',
    currentCircleLineWidth: 1,

    currentPolygonColor: 'yellow',

    currentLineColor: 'black',
    currentLineWidth: 5,
    currentLineLabelType: 'start',
    currentArrowColor: 'arrow_black',

    currentFreeHandWidth: '',
    currentFreeHandColor: 'black',
    currentFreeHandKeikoColor: '#1C1C1C',

    tgtFeature: null,
    pointSima: false,
    seaLevel: {
      map01: 1,
      map02: 1,
    },
    saveHistoryFire: false,
    jdpCode: '',
    jdpCoordinates: [],
    editEnabled: false,
    isCursorOnPanel: false,
    panelHoverCount: 0,
    circle200Chk: false,
    updatePermalinkFire: false,
    id: '',
    coordinates: [],
    gazoName: '',
    isDraw: false,
    isDrawLasso: false,
    isDrawFix: false,
    isDrawFree: false,
    isDrawPolygon: false,
    isDrawLine: false,
    isDrawCircle: false,
    isDrawPoint: false,
    rightDrawerTitle: '',
    selectedPublic: 0,
    selectedKaiji2: 1,
    geojsonFile: null,
    chibanzuPrefCode: '',
    chibanzuCityCode: '',
    chibanzuPropaties: {},
    chibanzuGeojson: [],
    showChibanzuDialog: false,
    popupFeature: {},
    popupFeatureProperties: {},
    popupFeatureCoordinates: [],
    soloFlg: false,
    mapillaryDialog : false,
    clickedCoordinates: [],
    selectedPointColor: '#000000', // ✅ 追加: 現在のポイント色
    selectedLayerId: null, // 選択中のレイヤーIDを追加
    currentGroupId: '',
    currentGroupLayers: [],
    pointLayers: [
      {
        id: 'layer1',
        name: 'ポイントレイヤー1',
        color: '#000000',
        visible: true,
        features: [
          { id: 'abc123', geometry: {}, properties: {} }
        ]
      }
    ],
    currentPointLayerId: 'layer1',  // ← 現在選択されているレイヤーを保持
    // selectedPointFeature: null,
    currentPointLayerIndex: 0,
    // -----------------------------------------------------------------------------------------------------------------
    map01:null,
    map02:null,
    snackbar: false,
    snackbarText: '',
    snackbarForGroup: false,
    snackbarForGroupText: false,
    userId: '',
    myNickname: '',
    currentGroupName: null,
    storeTest: 'storeTest',
    map2Flg: false,
    isUnder500: false,
    showPointInfoDrawer: false,
    showRightDrawer: false,
    showChibanzuDrawer: false,
    selectedPointFeature: null,
    groupGeojson: { type: 'FeatureCollection', features: [] },
    dialogs: {
      chibanzuListDialog:{
        map01:{name:'chibanzuListDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '350px', display: 'none'}},
        map02:{name:'chibanzuListDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '250px', display: 'none'}},
      },
      drawConfigDialog:{
        map01:{name:'drawConfigDialog',style: {top: '10px', left: '30px', 'z-index': 1, height: 'auto', 'width': '350px', display: 'none'}},
        map02:{name:'drawConfigDialog',style: {top: '10px', left: '30px', 'z-index': 1, height: 'auto', 'width': '350px', display: 'none'}},
      },
      shareDialog:{
        map01:{name:'shareDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '350px', display: 'none'}},
        map02:{name:'shareDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '250px', display: 'none'}},
      },
      menuDialog: {
        map01:{name:'menuDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '300px', display: 'none'}},
        map02:{name:'menuDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '300px', display: 'none'}},
      },
      myroomDialog: {
        map01:{name:'myroomDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '250px', display: 'none'}},
        map02:{name:'myroomDialog',style: {top: '65px', left: '10px', 'z-index': 1, height: 'auto', 'width': '250px', display: 'none'}},
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
    urlForX: '',
    url: 'dumy',
    dialog2Id:1,
    dialogMaxZindex: 10,
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
    fetchImagesFire:false,
    MESH_ID: '',
    isEstat: true,
    suikeiYear: '',
    popupAddress: '',
    stationName: '',
    kei: '',
    prefId: '',
    zahyokei: '',
    zahyokeiShape: 'WGS84',
    zeniGeojson: '',
    ntripGeojson: '',
    mindenGeojson: '',
    isRenzoku: true,
    highlightedChibans: new Set(),
    highlightedSimas: new Set(),
    dialogForSima: false,
    simaText: '',
    simaTextForUser: '',
    kmlText: '',
    geojsonText: '',
    dxfText: '',
    gpxText: '',
    simaTextZahyoukei: '',
    dialogForSimaApp: false,
    dialogForPng2App: false,
    dialogForJpgApp: false,
    dialogForGeotiffApp: false,
    dialogForGeotiff2App: false,
    dialogForPngApp: false,
    dialogForApp: false,
    dialogForImage: false,
    dialogForLogin: false,
    dialogForGroup: false,
    dialogForLink: false,
    isMenu: false,
    isAndroid: false,
    simaOpacity: 0,
    simaFire: false,
    tiffAndWorldFile: null,
    uploadedImage: '',
    uploadedVector: '',
    extLayerName: '独自レイヤー',
    extLayer: '',
    isClickPointsLayer:false,
    drawGeojsonText: '',
    clickGeojsonText: '',
    clickCircleGeojsonText: '',
    clickCircleGeojsonTextMyroom: '',
    transparent: '1',
    resolution: 23,
    loading: false,
    loading2: false,
    loadingMessage: '',
    isWindow: true,
    isWindow2: true,
    isSmartPhone: false,
    isTransparent: true,
    shpPropertieName: '',
    ocrAccuracy: 1,
    pmtilesName: '',
    pmtilesPropertieName: '',
    address: '',
    mapillaryFlg: false,
    cad: '',
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
        h12:true,
        r05:true,
        gun:true,
      },
      map02: {
        t09:true,
        h12:true,
        r05:true,
        gun:true,
      },
    },
    cityText:{
      map01:{
        t09:'',
        h12:'',
        r05:'',
        gun:'',
      },
      map02: {
        t09:'',
        h12:'',
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
    tokijyoLineWidth:{
      map01: null,
      map02: null
    },
    tokijyoColor:{
      map01: 'red',
      map02: 'red'
    },
    tokijyoCircleColor:{
      map01: 'red',
      map02: 'red'
    },
    tokijyoText2025:{
      map01: '',
      map02: ''
    },
    tokijyoLineWidth2025:{
      map01: null,
      map02: null
    },
    tokijyoColor2025:{
      map01: 'red',
      map02: 'red'
    },
    tokijyoCircleColor2025:{
      map01: 'red',
      map02: 'red'
    },
    chibanText:{
      map01: '',
      map02: ''
    },
    chibanColor:{
      map01: 'blue',
      map02: 'blue'
    },
    chibanWidhs: [],
    chibanWidhsString: {
      map01: '',
      map02: ''
    },
    chibanColors: [],
    chibanColorsString: {
      map01: '',
      map02: ''
    },
    chibanCircleColor:{
      map01: 'blue',
      map02: 'blue'
    },
    zeniKm:{
      map01: 20,
      map02: 20
    },
    ntripKm:{
      map01: 20,
      map02: 20
    },
    mindenKm:{
      map01: 20,
      map02: 20
    },
    simaData: {
      map01: '',
      map02: ''
    },
    simaZahyokei: {
      map01: '',
      map02: ''
    },
    selectedkijyuntenItems: {
      map01: '',
      map02: ''
    },
    selectedGsikuItems: {
      map01: '',
      map02: ''
    },
    isDialogVisible: false,
    geojsonSources: []
    //------------------------
  },
  getters: {
  },
  mutations: {
    setFloatingVisible(state, { id, visible }) {
      state.floatingWindows = {
        ...state.floatingWindows,
        [id]: visible
      };
    },
    setTiffAndWorldFile(state, files) {
      state.tiffAndWorldFile = files;
    },
    setCurrentGroupLayers(state, layers) {
      state.currentGroupLayers = layers;
    },
    setGroupFeatures(state, features) {
      state.groupFeatures = features;
    },
    updateSelectedPointPhotoUrl(state, photoUrl) { // 新しいミューテーション
      if (state.selectedPointFeature) {
        state.selectedPointFeature.properties.photoUrl = photoUrl;
      }
    },
    setGroupGeojsonFeatures(state, features) {
      state.groupGeojson.features = features;
    },
    setSnackbarForGroup(state, value) {
      state.snackbarForGroup = value;
    },
    setSelectedLayerId(state, layerId) {
      state.selectedLayerId = layerId;
      console.log('ミューテーション: selectedLayerId を更新:', state.selectedLayerId);
    },
    hideSnackbarForGroup(state) {
      state.snackbarForGroup = false;
      state.snackbarForGroupText = '';
    },
    setCurrentPointLayerId(state, id) {
      state.currentPointLayerId = id
    },
    addPointLayer(state) {
      const id = 'layer' + (state.pointLayers.length + 1)
      state.pointLayers.push({ id, name: `ポイントレイヤー${state.pointLayers.length + 1}` })
    },
    removePointLayer(state, id) {
      const index = state.pointLayers.findIndex(l => l.id === id)
      if (index !== -1) {
        state.pointLayers.splice(index, 1)
        if (state.currentPointLayerIndex >= state.pointLayers.length) {
          state.currentPointLayerIndex = Math.max(0, state.pointLayers.length - 1)
        }
      }
    },
    setCurrentPointLayerIndex(state, index) {
      state.currentPointLayerIndex = index
    },
    // -----------------------------------------------------------------------------------------------------------------
    removePointFeature(state, id) {
      const index = state.groupGeojson.features.findIndex(f => f.properties?.id === id);
      // alert(index);
      if (index !== -1) {
        state.groupGeojson.features.splice(index, 1);
        console.log('削除後の features:', state.groupGeojson.features.length); // 追加
      }
    },
    // 他のミューテーションがある中に追加
    setGroupGeojson(state, geojson) {
      state.groupGeojson = geojson
    },
    saveSelectedPointFeature(state) {
      const feature = state.selectedPointFeature
      if (!feature || !feature.properties?.id) return

      console.log('保存対象の feature:', feature)
      console.log('保存前の features:', state.groupGeojson.features)

      const features = state.groupGeojson.features
      const index = features.findIndex(f => f.properties?.id === feature.properties.id)

      if (index !== -1) {
        // 既存のポイントを更新
        state.groupGeojson.features[index] = JSON.parse(JSON.stringify(feature))
      } else {
        // 新しいポイントを追加
        state.groupGeojson.features.push(JSON.parse(JSON.stringify(feature)))
      }
    },
    setPointInfoDrawer (state, val) {
      if (state.isDraw) return;
      state.showPointInfoDrawer = val
    },
    setRightDrawer (state, val) {
      if (state.isDraw) return
      state.showRightDrawer = val
    },
    setChibanzuDrawer (state, val) {
      if (state.isDraw) return;
      state.showChibanzuDrawer = val
    },
    setSelectedPointFeature (state, feature) {
      state.selectedPointFeature = feature
    },
    updateSelectedPointTitle(state, title) { // 新しいミューテーション
      if (state.selectedPointFeature) {
        state.selectedPointFeature.properties.title = title;
      }
    },
    updateSelectedPointDescription (state, val) {
      if (state.selectedPointFeature) {
        state.selectedPointFeature.properties.description = val
      }
    },
    updatePointDescription (state, { id, description }) {
      const feature = state.groupGeojson.features.find(f => f.properties.id === id)
      if (feature) {
        feature.properties.description = description
      }
    },
    showSnackbarForGroup(state, text) {
      state.snackbarForGroupText = text
      state.snackbarForGroup = true
    },
    hideSnackbar(state) {
      state.snackbarForGroup = false
    },
    setCurrentGroupId(state, name) {
      state.currentGroupId = name
    },
    setCurrentGroupName(state, name) {
      state.currentGroupName = name
    },
    setUserId(state, uid) {
      state.userId = uid
    },
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
        // console.log(payload.name)
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
          case 'ext-city-h12':
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
            if (payload.order === 1) {
              variable = 'tokijyoColor'
            }
            if (payload.order === 2) {
              variable = 'tokijyoCircleColor'
            }
            if (payload.order === 3) {
              variable = 'tokijyoLineWidth'
            }
            break
          case 'extTokijyo2025':
            if (payload.order === 0) {
              variable = 'tokijyoText2025'
            }
            if (payload.order === 1) {
              variable = 'tokijyoColor2025'
            }
            if (payload.order === 2) {
              variable = 'tokijyoCircleColor2025'
            }
            if (payload.order === 3) {
              variable = 'tokijyoLineWidth2025'
            }
            break
          case 'ext-chibanzu':
            if (payload.order === 0) {
              variable = 'chibanText'
            }
            if (payload.order === 1) {
              variable = 'chibanColorsString'
            }
            if (payload.order === 2) {
              variable = 'chibanCircleColor'
            }
            if (payload.order === 3) {
              variable = 'chibanWidhsString'
            }
            break
          case 'extZeni':
            if (payload.order === 0) {
              variable = 'zeniKm'
            }
            break
          case 'extNtrip':
            if (payload.order === 0) {
              variable = 'ntripKm'
            }
            break
          case 'extMinden':
            if (payload.order === 0) {
              variable = 'mindenKm'
            }
            break
          case 'extSeaLevel':
            if (payload.order === 0) {
              variable = 'seaLevel'
            }
            break
          case 'extKhonkijyunten':
            if (payload.order === 0) {
              variable = 'selectedkijyuntenItems'
            }
            break
          case 'extGaiku':
            if (payload.order === 0) {
              variable = 'selectedGsikuItems'
            }
            break
        }
        // console.log(payload.mapName,payload.name,payload.value,variable,variable2)
        // console.log(payload.value)
        // if (variable === 'chibanColorsString') alert(payload.order + '///' + payload.value)
        if (!variable2) {
          // console.log(payload.mapName)
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
      // console.log(result,payload.values)
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
    showFloatingWindow({ commit }, id) {
      commit('setFloatingVisible', { id, visible: true });
    },
    hideFloatingWindow({ commit }, id) {
      commit('setFloatingVisible', { id, visible: false });
    },
    triggerSnackbarForGroup({ commit }, { message }) {
      commit('showSnackbarForGroup', message);
      setTimeout(() => commit('hideSnackbarForGroup'), 3000); // timeout と一致
    },
    async deleteSelectedPointFromFirestore({ state }) {
      const groupId = state.currentGroupName
      if (!groupId) return

      const idToDelete = state.selectedPointFeature?.properties?.id
      if (!idToDelete) return

      const doc = await db.collection('groups').doc(groupId).get()
      if (!doc.exists) return

      const data = doc.data()
      const features = data.layers?.points?.features || []

      const newFeatures = features.filter(f => f.properties?.id !== idToDelete)

      await db.collection('groups').doc(groupId).set({
        layers: {
          points: {
            type: 'FeatureCollection',
            features: newFeatures
          }
        },
        lastModifiedBy: state.userId,
        lastModifiedAt: Date.now()
      }, { merge: true })

      console.log(`🗑️ 削除済み ID: ${idToDelete}`)
    },
    async fetchGroupData({ commit }, groupId) {
      const doc = await db.collection('groups').doc(groupId).get()
      if (doc.exists) {
        const data = doc.data()
        if (data.layers?.points) {
          commit('setGroupGeojson', data.layers.points)
        }
      }
    },
    async saveSelectedPointToFirestore({ state }) {
      const db = firebase.firestore();
      const groupId = state.currentGroupId;
      const layerId = state.selectedLayerId; // ← こっちを必ず使う
      const feature = state.selectedPointFeature;

      console.log('保存対象の feature ID:', feature.properties.id);
      console.log('保存先 layerId:', layerId);

      if (!groupId || !layerId || !feature) {
        console.warn('groupId, layerId, または feature が未設定です');
        return;
      }

      try {
        const docRef = db.collection('groups').doc(groupId).collection('layers').doc(layerId);
        const doc = await docRef.get();
        let features = doc.exists ? doc.data().features || [] : [];

        const index = features.findIndex(f => f.properties.id === feature.properties.id);
        if (index >= 0) {
          features[index] = feature; // 更新
        } else {
          features.push(feature); // 新規追加
        }

        await docRef.set({
          features,
          lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('Firestore に保存成功:', feature);
      } catch (error) {
        console.error('Firestore 保存エラー:', error);
      }
    },
    async saveSelectedPointFeatureToFirestore({ state, commit }) {
      const feature = state.selectedPointFeature
      const groupId = state.currentGroupName

      if (!feature || !feature.properties?.id || !groupId) return

      // Vuex 側の groupGeojson を更新
      commit('saveSelectedPointFeature')

      // Firestore に保存
      await db.collection('groups').doc(groupId).set({
        layers: {
          points: JSON.parse(JSON.stringify(state.groupGeojson))
        },
        lastModifiedBy: state.userId,
        lastModifiedAt: Date.now()
      }, { merge: true })

      console.log('✅ Firestore に保存しました')
    },
    updateSelectedPointColor(state, color) {
      if (state.selectedPointFeature) {
        state.selectedPointFeature.properties.color = color;
        state.selectedPointColor = color;
      }
    },
    setSelectedPointFeature (state, feature) {
      state.selectedPointFeature = feature;
      // ✅ 選択時に色を反映
      state.selectedPointColor = feature?.properties?.color || '#ff0000';
    },
  },
  modules: {
  }
})
