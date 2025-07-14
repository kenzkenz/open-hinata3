import store from '@/store'
import axios from "axios"
import * as turf from '@turf/turf'
import {
    addDraw,
    convertAndDownloadGeoJSONToSIMA,
    convertFromEPSG4326, downloadTextFile,
    geoJSONToSIMA, getNowFileNameTimestamp, recenterGeoJSON, removeNini,
    savePointSima, splitLineStringIntoPoints,
    zahyokei
} from "@/js/downLoad";
import {clickCircleSource, clickPointSource, endPointSouce, vertexSource} from "@/js/layers";
import {calculatePolygonMetrics, closeAllPopups} from "@/js/popup";
import { fetchElevation } from '@/js/downLoad';
import JSZip from "jszip";
import {feature} from "@turf/turf";
export let currentIndex = 0
let kasen

export default function pyramid () {
    ['map01','map02'].forEach(mapName => {
        const mapElm = document.querySelector('#' + mapName)
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            // e.stopPropagation()
            // console.log(e.target.classList)
            if (e.target && e.target.classList.contains('pyramid-syochiiki-r02')) {
                console.log(e.target.getAttribute("cdArea"))
                store.state.cdArea = e.target.getAttribute("cdArea")
                store.state.syochiikiName = e.target.getAttribute("syochiikiname")
                store.state.isEstat = true
                const cityCode = store.state.cdArea.slice(0,5)
                const azaCode = store.state.cdArea.slice(5)
                console.log(cityCode)
                console.log(azaCode)
                axios
                    .get('https://kenzkenz.xsrv.jp/open-hinata/php/pyramid.php',{
                        params: {
                            cityCode: cityCode,
                            azaCode: azaCode
                        }
                    }).then(function (response) {
                    console.log(response.data)
                    const dataMan = []
                    const dataWoman = []
                    const dataSousu = []
                    response.data.forEach((v) => {
                        if (v.男女 === '男') {
                            dataMan.push({class: '0～4歳', man: Number(v['0～4歳'])})
                            dataMan.push({class: '5～9歳', man: Number(v['5～9歳'])})
                            dataMan.push({class: '10～14歳', man: Number(v['10～14歳'])})
                            dataMan.push({class: '15～19歳', man: Number(v['15～19歳'])})
                            dataMan.push({class: '20～24歳', man: Number(v['20～24歳'])})
                            dataMan.push({class: '25～29歳', man: Number(v['25～29歳'])})
                            dataMan.push({class: '30～34歳', man: Number(v['30～34歳'])})
                            dataMan.push({class: '35～39歳', man: Number(v['35～39歳'])})
                            dataMan.push({class: '40～44歳', man: Number(v['40～44歳'])})
                            dataMan.push({class: '45～49歳', man: Number(v['45～49歳'])})
                            dataMan.push({class: '50～54歳', man: Number(v['50～54歳'])})
                            dataMan.push({class: '55～59歳', man: Number(v['55～59歳'])})
                            dataMan.push({class: '60～64歳', man: Number(v['60～64歳'])})
                            dataMan.push({class: '65～69歳', man: Number(v['65～69歳'])})
                            dataMan.push({class: '70～74歳', man: Number(v['70～74歳'])})
                            dataMan.push({class: '75～79歳', man: Number(v['75～79歳'])})
                            dataMan.push({class: '80～84歳', man: Number(v['80～84歳'])})
                            dataMan.push({class: '85～89歳', man: Number(v['85～89歳'])})
                            dataMan.push({class: '90～94歳', man: Number(v['90～94歳'])})
                            dataMan.push({class: '95～99歳', man: Number(v['95～99歳'])})
                            dataMan.push({class: '100歳以上', man: Number(v['100歳以上'])})
                        } else if(v.男女 === '女') {
                            dataWoman.push({woman: Number(v['0～4歳'])})
                            dataWoman.push({woman: Number(v['5～9歳'])})
                            dataWoman.push({woman: Number(v['10～14歳'])})
                            dataWoman.push({woman: Number(v['15～19歳'])})
                            dataWoman.push({woman: Number(v['20～24歳'])})
                            dataWoman.push({woman: Number(v['25～29歳'])})
                            dataWoman.push({woman: Number(v['30～34歳'])})
                            dataWoman.push({woman: Number(v['35～39歳'])})
                            dataWoman.push({woman: Number(v['40～44歳'])})
                            dataWoman.push({woman: Number(v['45～49歳'])})
                            dataWoman.push({woman: Number(v['50～54歳'])})
                            dataWoman.push({woman: Number(v['55～59歳'])})
                            dataWoman.push({woman: Number(v['60～64歳'])})
                            dataWoman.push({woman: Number(v['65～69歳'])})
                            dataWoman.push({woman: Number(v['70～74歳'])})
                            dataWoman.push({woman: Number(v['75～79歳'])})
                            dataWoman.push({woman: Number(v['80～84歳'])})
                            dataWoman.push({woman: Number(v['85～89歳'])})
                            dataWoman.push({woman: Number(v['90～94歳'])})
                            dataWoman.push({woman: Number(v['95～99歳'])})
                            dataWoman.push({woman: Number(v['100歳以上'])})
                        } else if(v.男女 === '総数') {
                            dataSousu.push({class: '総数', 総数: Number(v['総数'])})
                            dataSousu.push({class: '総数', over65: Number(v['65歳以上'])})
                            dataSousu.push({class: '総数', 平均年齢: Number(v['平均年齢'])})
                            dataSousu.push({class: '総数', 秘匿処理: v['秘匿処理']})
                        }
                    })
                    const data = dataMan.map((v,i) =>{
                        return Object.assign(v, dataWoman[i]);
                    })
                    const sousu = dataSousu[0]['総数']
                    const over65 = dataSousu[1].over65
                    const heikinnenrei = dataSousu[2]['平均年齢'].toFixed(2) + '歳'
                    let koureikaritu
                    if (isNaN(over65)) {
                        koureikaritu = '0%'
                    } else {
                        koureikaritu = ((over65 / sousu) * 100).toFixed(2) + '%'
                    }
                    const hitokuSyori = dataSousu[3]['秘匿処理']
                    if (hitokuSyori === '秘匿地域') {
                        alert('秘匿地域です。人口ピラミッドは作成されません。pyramid-syochiiki-r02')
                        return
                    }
                    store.state.koureikaritu = koureikaritu
                    store.state.heikinnenrei = heikinnenrei
                    store.state.kokuchoYear = e.target.getAttribute("year")
                    store.state.estatDataset = data

                    store.commit('incrDialog2Id');
                    store.commit('incrDialogMaxZindex');
                    let left
                    if (window.innerWidth < 600) {
                        left = (window.innerWidth / 2 - 175) + 'px'
                    } else {
                        left = (document.querySelector('#map01').clientWidth - 560) + 'px'
                    }
                    console.log(left)
                    // left = 0
                    const dialog =
                        {
                            id: store.state.dialog2Id,
                            name:'pyramid',
                            style: {
                                display: 'block',
                                top: '60px',
                                left:left,
                                'z-index': store.state.dialogMaxZindex
                            }
                        }
                    console.log(JSON.stringify(dialog))
                    store.commit('pushDialogs2',{mapName: mapName, dialog: dialog})
                })

            }
        })
        // -------------------------------------------------------------------------------------------------------------
        function h27syochiiki(e,mapName,year){
            console.log(year)
            console.log(e.target.getAttribute("cdArea"))
            store.state.cdArea = e.target.getAttribute("cdArea")
            store.state.syochiikiName = e.target.getAttribute("syochiikiname")
            store.state.isEstat = true
            const cityCode = store.state.cdArea.slice(0, 5)
            const azaCode = store.state.cdArea.slice(5)
            axios
                .get('https://kenzkenz.xsrv.jp/open-hinata/php/pyramid2015.php', {
                    params: {
                        cityCode: cityCode,
                        azaCode: azaCode,
                        year: year
                    }
                }).then(function (response) {
                if (response.data.error) {
                    alert('データがありません。地区変更等があったかもしれません。')
                    return
                }
                console.log(response.data)
                const dataSet = []
                const dataSousu = []
                response.data.forEach((v) => {
                    dataSet.push({class: '0～4歳', man: Number(v['男0～4歳']), woman: Number(v['女0～4歳'])})
                    dataSet.push({class: '5～9歳', man: Number(v['男5～9歳']), woman: Number(v['女5～9歳'])})
                    dataSet.push({class: '10～14歳', man: Number(v['男10～14歳']), woman: Number(v['女10～14歳'])})
                    dataSet.push({class: '15～19歳', man: Number(v['男15～19歳']), woman: Number(v['女15～19歳'])})
                    dataSet.push({class: '20～24歳', man: Number(v['男20～24歳']), woman: Number(v['女20～24歳'])})
                    dataSet.push({class: '25～29歳', man: Number(v['男25～29歳']), woman: Number(v['女25～29歳'])})
                    dataSet.push({class: '30～34歳', man: Number(v['男30～34歳']), woman: Number(v['女30～34歳'])})
                    dataSet.push({class: '35～39歳', man: Number(v['男35～39歳']), woman: Number(v['女35～39歳'])})
                    dataSet.push({class: '40～44歳', man: Number(v['男40～44歳']), woman: Number(v['女40～44歳'])})
                    dataSet.push({class: '45～49歳', man: Number(v['男45～49歳']), woman: Number(v['女45～49歳'])})
                    dataSet.push({class: '50～54歳', man: Number(v['男50～54歳']), woman: Number(v['女50～54歳'])})
                    dataSet.push({class: '55～59歳', man: Number(v['男55～59歳']), woman: Number(v['女55～59歳'])})
                    dataSet.push({class: '60～64歳', man: Number(v['男60～64歳']), woman: Number(v['女60～64歳'])})
                    dataSet.push({class: '65～69歳', man: Number(v['男65～69歳']), woman: Number(v['女65～69歳'])})
                    dataSet.push({class: '70～74歳', man: Number(v['男70～74歳']), woman: Number(v['女70～74歳'])})
                    dataSet.push({class: '75～79歳', man: Number(v['男75～79歳']), woman: Number(v['女75～79歳'])})
                    dataSet.push({class: '80～84歳', man: Number(v['男80～84歳']), woman: Number(v['女80～84歳'])})
                    dataSet.push({class: '85～89歳', man: Number(v['男85～89歳']), woman: Number(v['女85～89歳'])})
                    dataSet.push({class: '90～94歳', man: Number(v['男90～94歳']), woman: Number(v['女90～94歳'])})
                    dataSet.push({class: '95～99歳', man: Number(v['男95～99歳']), woman: Number(v['女95～99歳'])})
                    dataSet.push({class: '100歳以上', man: Number(v['男100歳以上']), woman: Number(v['女100歳以上'])})

                    dataSousu.push({class: '総数', 総数: Number(v['総数'])})
                    dataSousu.push({class: '総数', 総数65歳以上: Number(v['65歳以上'])})
                    dataSousu.push({class: '総数', 平均年齢: Number(v['平均年齢'])})
                    dataSousu.push({class: '総数', 秘匿処理: v['秘匿処理']})
                })

                const sousu = dataSousu[0]['総数']
                const over65 = dataSousu[1]['総数65歳以上']
                const heikinnenrei = dataSousu[2]['平均年齢'].toFixed(2) + '歳'
                let koureikaritu
                if (isNaN(over65)) {
                    koureikaritu = '0%'
                } else {
                    koureikaritu = ((over65 / sousu) * 100).toFixed(2) + '%'
                }
                const hitokuSyori = dataSousu[3]['秘匿処理']
                if (hitokuSyori === '秘匿地域') {
                    alert('秘匿地域です。人口ピラミッドは作成されません。')
                    return;
                }
                store.state.koureikaritu = koureikaritu
                store.state.heikinnenrei = heikinnenrei
                store.state.kokuchoYear = year

                store.state.estatDataset = dataSet

                store.commit('incrDialog2Id');
                store.commit('incrDialogMaxZindex');
                let left
                if (window.innerWidth < 600) {
                    left = (window.innerWidth / 2 - 175) + 'px'
                } else {
                    left = (document.querySelector('#map01').clientWidth - 560) + 'px'
                }
                const diialog =
                    {
                        id: store.state.dialog2Id,
                        name: 'pyramid',
                        style: {
                            display: 'block',
                            top: '60px',
                            left: left,
                            'z-index': store.state.dialogMaxZindex
                        }
                    }
                store.commit('pushDialogs2', {mapName: mapName, dialog: diialog})
            })
        }
        mapElm.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains("pyramid-syochiiki-h27") ) {
                h27syochiiki(e,mapName,2015)
            }
        })
        mapElm.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains("pyramid-syochiiki-h22") ) {
                h27syochiiki(e,mapName,2010)
            }
        })
        mapElm.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains("pyramid-syochiiki-h17") ) {
                h27syochiiki(e,mapName,2005)
            }
        })
        // 小地域人口推移--------------------------------------------------------------------------------------------------
        function r2jinkosuii(e){
            return new Promise(resolve => {
                store.state.cdArea = e.target.getAttribute("cdArea")
                store.state.syochiikiName = e.target.getAttribute("syochiikiname")
                store.state.isEstat = true
                const cityCode = store.state.cdArea.slice(0,5)
                const azaCode = store.state.cdArea.slice(5)
                axios
                    .get('https://kenzkenz.xsrv.jp/open-hinata/php/pyramid.php',{
                        params: {
                            cityCode: cityCode,
                            azaCode: azaCode
                        }
                    }).then(function (response) {
                    const dataMan = []
                    const dataWoman = []
                    const dataSousu = []
                    response.data.forEach((v) => {
                        if(v.男女 === '総数') {
                            dataSousu.push({class: '総数', 総数: Number(v['総数'])})
                            dataSousu.push({class: '総数', over65: Number(v['65歳以上'])})
                            dataSousu.push({class: '総数', 平均年齢: Number(v['平均年齢'])})
                            dataSousu.push({class: '総数', 秘匿処理: v['秘匿処理']})
                            dataSousu.push({class: '総数', under15: Number(v['15歳未満'])})
                            dataSousu.push({class: '総数', seisan: Number(v['15～64歳'])})
                        }
                    })
                    const data = dataMan.map((v,i) =>{
                        return Object.assign(v, dataWoman[i]);
                    })
                    const sousu = dataSousu[0]['総数']
                    const over65 = dataSousu[1].over65
                    const heikinnenrei = dataSousu[2]['平均年齢'].toFixed(2) + '歳'
                    let koureikaritu
                    if (isNaN(over65)) {
                        koureikaritu = '0%'
                    } else {
                        koureikaritu = ((over65 / sousu) * 100).toFixed(2) + '%'
                    }
                    const ronenRate = over65 / sousu * 100
                    const hitokuSyori = dataSousu[3]['秘匿処理']
                    if (hitokuSyori === '秘匿地域') {
                        alert('秘匿地域です。人口ピラミッドは作成されません。r2jinkosuii')
                        return
                    }
                    const under15 = dataSousu[4].under15
                    const nensyoRate = under15 / sousu * 100
                    const seisan = dataSousu[5].seisan
                    const seisanRate = seisan / sousu * 100
                    resolve(
                        {year:2020,
                            value:sousu,
                            ronenRate:ronenRate,
                            nensyoRate:nensyoRate,
                            seisanRate:seisanRate}
                    )
                    store.state.koureikaritu = koureikaritu
                    store.state.heikinnenrei = heikinnenrei
                    store.state.kokuchoYear = e.target.getAttribute("year")

                    store.state.estatDataset = data

                    store.commit('incrDialog2Id');
                    store.commit('incrDialogMaxZindex');
                })
            })
        }
        // ----------------------------------------------
        function h27jinkosuii(e,mapName,year){
            return new Promise(resolve => {
                store.state.cdArea = e.target.getAttribute("cdArea")
                store.state.syochiikiName = e.target.getAttribute("syochiikiname")
                store.state.isEstat = true
                const cityCode = store.state.cdArea.slice(0, 5)
                const azaCode = store.state.cdArea.slice(5)
                axios
                    .get('https://kenzkenz.xsrv.jp/open-hinata/php/pyramid2015.php', {
                        params: {
                            cityCode: cityCode,
                            azaCode: azaCode,
                            year: year
                        }
                    }).then(function (response) {
                    if (response.data.error) {
                        alert('地区変更等があったかもしれません。線グラフが０からスタートします。注意してください。')
                        resolve(
                            {
                                year:year,
                                value:0,
                                ronenRate:0,
                                nensyoRate:0,
                                seisanRate:0
                            }
                        )
                        return
                    }
                    console.log(response.data)
                    const dataSet = []
                    const dataSousu = []
                    response.data.forEach((v) => {
                        dataSousu.push({class: '総数', 総数: Number(v['総数'])})
                        dataSousu.push({class: '総数', 総数65歳以上: Number(v['65歳以上'])})
                        dataSousu.push({class: '総数', 平均年齢: Number(v['平均年齢'])})
                        dataSousu.push({class: '総数', 秘匿処理: v['秘匿処理']})
                        dataSousu.push({class: '総数', 総数15歳未満: Number(v['15歳未満'])})
                        dataSousu.push({class: '総数', 総数1564歳: Number(v['15～64歳'])})
                    })
                    const sousu = dataSousu[0]['総数']
                    const over65 = dataSousu[1]['総数65歳以上']
                    const heikinnenrei = dataSousu[2]['平均年齢'].toFixed(2) + '歳'
                    let koureikaritu
                    if (isNaN(over65)) {
                        koureikaritu = '0%'
                    } else {
                        koureikaritu = ((over65 / sousu) * 100).toFixed(2) + '%'
                    }
                    const ronenRate = over65 / sousu * 100
                    const hitokuSyori = dataSousu[3]['秘匿処理']
                    const under15 = dataSousu[4]['総数15歳未満']
                    const nensyoRate = under15 / sousu * 100
                    const seisan = dataSousu[5]['総数1564歳']
                    const seisanRate = seisan / sousu * 100

                    if (hitokuSyori === '秘匿地域') {
                        alert('過去に秘匿地域でした。線グラフが０からスタートします。注意してください。')
                        resolve(
                            {
                                year:year,
                                value:0,
                                ronenRate:0,
                                nensyoRate:0,
                                seisanRate:0
                            }
                        )
                        return;
                    }

                    store.state.koureikaritu = koureikaritu
                    store.state.heikinnenrei = heikinnenrei
                    store.state.kokuchoYear = year
                    store.state.estatDataset = dataSet
                    resolve(
                        {
                            year:year,
                            value:sousu,
                            ronenRate:ronenRate,
                            nensyoRate:nensyoRate,
                            seisanRate:seisanRate,
                            seisan:seisan
                        }
                    )
                    store.commit('incrDialog2Id');
                    store.commit('incrDialogMaxZindex');
                })
            })
        }
        mapElm.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains("jinkosuii") ) {
                async function sample() {
                    const arr = []
                    const a2005 = await h27jinkosuii(e,mapName,2005)
                    arr.push(a2005)
                    const a2010 = await h27jinkosuii(e,mapName,2010)
                    arr.push(a2010)
                    const a2015 = await h27jinkosuii(e,mapName,2015)
                    arr.push(a2015)
                    const a2020 = await r2jinkosuii(e,mapName)
                    arr.push(a2020)
                    return arr
                }
                sample().then((response) => {
                    store.state.jinkosuiiDatasetEstat['datasetAll'] = response
                    console.log(JSON.stringify(response))
                    const ronen = response.map((value) =>{
                        if (isNaN(value.ronenRate)) value.ronenRate = 0
                        return {year:value.year,rate:value.ronenRate}
                    })
                    store.state.jinkosuiiDatasetEstat['datasetRonen'] = ronen
                    const nensyo = response.map((value) =>{
                        if (isNaN(value.nensyoRate)) value.nensyoRate = 0
                        return {year:value.year,rate:value.nensyoRate}
                    })
                    store.state.jinkosuiiDatasetEstat['datasetNensyo'] = nensyo
                    const seisan = response.map((value) =>{
                        if (isNaN(value.seisanRate)) value.seisanRate = 0
                        return {year:value.year,rate:value.seisanRate,sousu:value.value,seisan:value.seisan}
                    })
                    store.state.jinkosuiiDatasetEstat['datasetSeisan'] = seisan
                    store.commit('incrDialog2Id');
                    store.commit('incrDialogMaxZindex');
                    let width
                    let left
                    if (window.innerWidth < 600) {
                        left = (window.innerWidth / 2 - 175) + 'px'
                    } else {
                        left = (document.querySelector('#map01').clientWidth - 560) + 'px'
                    }
                    const diialog =
                        {
                            id: store.state.dialog2Id,
                            name:'jinkosuii',
                            style: {
                                display: 'block',
                                width: width,
                                top: '60px',
                                left: left,
                                'z-index': store.state.dialogMaxZindex
                            }
                        }
                    // store.state.resasOrEstat = 'eStat'
                    store.commit('pushDialogs2',{mapName: mapName, dialog: diialog})
                });
            }
        })
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains('suikei1km-2050') || e.target.classList.contains('suikei500m-2050'))) {
                console.log(e.target.getAttribute("MESH_ID"))
                const MESH_ID = e.target.getAttribute("MESH_ID")
                const suikeiYear = e.target.getAttribute("suikeiYear")
                store.state.MESH_ID = MESH_ID
                store.state.suikeiYear = suikeiYear
                console.log(store.state.suikeiYear)
                store.state.isEstat = false

                // 使用するエンドポイントをクラスによって切り替え
                const endpoint = e.target.classList.contains('suikei1km-2050')
                    ? 'https://kenzkenz.xsrv.jp/open-hinata3/php/pyramid2.php'
                    : 'https://kenzkenz.xsrv.jp/open-hinata3/php/pyramid3.php';

                axios
                    .get(endpoint, {
                        params: {
                            MESH_ID: MESH_ID,
                            suikeiYear: suikeiYear
                        }
                    }).then(function (response) {
                    if (response.data.error) {
                        alert("まだDBにありません。もう少しまってください。")
                        return
                    }

                    const dataSet = []
                    const dataSousu = []
                    response.data.forEach((v) => {
                        dataSet.push({class: '0～4歳', man: Number(v['男0～4歳']), woman: Number(v['女0～4歳'])})
                        dataSet.push({class: '5～9歳', man: Number(v['男5～9歳']), woman: Number(v['女5～9歳'])})
                        dataSet.push({class: '10～14歳', man: Number(v['男10～14歳']), woman: Number(v['女10～14歳'])})
                        dataSet.push({class: '15～19歳', man: Number(v['男15～19歳']), woman: Number(v['女15～19歳'])})
                        dataSet.push({class: '20～24歳', man: Number(v['男20～24歳']), woman: Number(v['女20～24歳'])})
                        dataSet.push({class: '25～29歳', man: Number(v['男25～29歳']), woman: Number(v['女25～29歳'])})
                        dataSet.push({class: '30～34歳', man: Number(v['男30～34歳']), woman: Number(v['女30～34歳'])})
                        dataSet.push({class: '35～39歳', man: Number(v['男35～39歳']), woman: Number(v['女35～39歳'])})
                        dataSet.push({class: '40～44歳', man: Number(v['男40～44歳']), woman: Number(v['女40～44歳'])})
                        dataSet.push({class: '45～49歳', man: Number(v['男45～49歳']), woman: Number(v['女45～49歳'])})
                        dataSet.push({class: '50～54歳', man: Number(v['男50～54歳']), woman: Number(v['女50～54歳'])})
                        dataSet.push({class: '55～59歳', man: Number(v['男55～59歳']), woman: Number(v['女55～59歳'])})
                        dataSet.push({class: '60～64歳', man: Number(v['男60～64歳']), woman: Number(v['女60～64歳'])})
                        dataSet.push({class: '65～69歳', man: Number(v['男65～69歳']), woman: Number(v['女65～69歳'])})
                        dataSet.push({class: '70～74歳', man: Number(v['男70～74歳']), woman: Number(v['女70～74歳'])})
                        dataSet.push({class: '75～79歳', man: Number(v['男75～79歳']), woman: Number(v['女75～79歳'])})
                        dataSet.push({class: '80～84歳', man: Number(v['男80～84歳']), woman: Number(v['女80～84歳'])})
                        dataSet.push({class: '85～89歳', man: Number(v['男85～89歳']), woman: Number(v['女85～89歳'])})
                        dataSet.push({class: '90歳以上', man: Number(v['男90歳以上']), woman: Number(v['女90歳以上'])})

                        dataSousu.push({class: '総数', 総数: Number(v['総数'])})
                        dataSousu.push({class: '総数', 総数65歳以上: Number(v['65歳以上'])})
                    })

                    console.log(dataSet)
                    const sousu = dataSousu[0]['総数']
                    const over65 = dataSousu[1]['総数65歳以上']
                    let koureikaritu
                    if (isNaN(over65)) {
                        koureikaritu = '0%'
                    } else {
                        koureikaritu = ((over65 / sousu) * 100).toFixed(2) + '%'
                    }
                    store.state.koureikaritu = koureikaritu

                    store.state.estatDataset = dataSet

                    store.commit('incrDialog2Id');
                    store.commit('incrDialogMaxZindex');
                    let left
                    if (window.innerWidth < 600) {
                        left = (window.innerWidth / 2 - 175) + 'px'
                    } else {
                        left = (document.querySelector('#map01').clientWidth - 560) + 'px'
                    }
                    const diialog =
                        {
                            id: store.state.dialog2Id,
                            name: 'pyramid',
                            style: {
                                display: 'block',
                                top: '60px',
                                left: left,
                                'z-index': store.state.dialogMaxZindex
                            }
                        }
                    store.commit('pushDialogs2', {mapName: mapName, dialog: diialog})
                })
            }
        })



        // mapElm.addEventListener('click', (e) => {
        //     if (e.target && e.target.classList.contains('suikei1km-2050')) {
        //         console.log(e.target.getAttribute("MESH_ID"))
        //         const MESH_ID = e.target.getAttribute("MESH_ID")
        //         const suikeiYear = e.target.getAttribute("suikeiYear")
        //         store.state.MESH_ID = MESH_ID
        //         store.state.suikeiYear = suikeiYear
        //         console.log(store.state.suikeiYear)
        //         store.state.isEstat = false
        //         axios
        //             .get('https://kenzkenz.xsrv.jp/open-hinata3/php/pyramid2.php',{
        //                 params: {
        //                     MESH_ID: MESH_ID,
        //                     suikeiYear: suikeiYear
        //                 }
        //             }).then(function (response) {
        //             if (response.data.error) {
        //                 alert("まだDBにありません。もう少しまってください。")
        //                 return
        //             }
        //
        //             const dataSet = []
        //             const dataSousu = []
        //             response.data.forEach((v) => {
        //                 dataSet.push({class: '0～4歳', man: Number(v['男0～4歳']), woman: Number(v['女0～4歳'])})
        //                 dataSet.push({class: '5～9歳', man: Number(v['男5～9歳']), woman: Number(v['女5～9歳'])})
        //                 dataSet.push({class: '10～14歳', man: Number(v['男10～14歳']), woman: Number(v['女10～14歳'])})
        //                 dataSet.push({class: '15～19歳', man: Number(v['男15～19歳']), woman: Number(v['女15～19歳'])})
        //                 dataSet.push({class: '20～24歳', man: Number(v['男20～24歳']), woman: Number(v['女20～24歳'])})
        //                 dataSet.push({class: '25～29歳', man: Number(v['男25～29歳']), woman: Number(v['女25～29歳'])})
        //                 dataSet.push({class: '30～34歳', man: Number(v['男30～34歳']), woman: Number(v['女30～34歳'])})
        //                 dataSet.push({class: '35～39歳', man: Number(v['男35～39歳']), woman: Number(v['女35～39歳'])})
        //                 dataSet.push({class: '40～44歳', man: Number(v['男40～44歳']), woman: Number(v['女40～44歳'])})
        //                 dataSet.push({class: '45～49歳', man: Number(v['男45～49歳']), woman: Number(v['女45～49歳'])})
        //                 dataSet.push({class: '50～54歳', man: Number(v['男50～54歳']), woman: Number(v['女50～54歳'])})
        //                 dataSet.push({class: '55～59歳', man: Number(v['男55～59歳']), woman: Number(v['女55～59歳'])})
        //                 dataSet.push({class: '60～64歳', man: Number(v['男60～64歳']), woman: Number(v['女60～64歳'])})
        //                 dataSet.push({class: '65～69歳', man: Number(v['男65～69歳']), woman: Number(v['女65～69歳'])})
        //                 dataSet.push({class: '70～74歳', man: Number(v['男70～74歳']), woman: Number(v['女70～74歳'])})
        //                 dataSet.push({class: '75～79歳', man: Number(v['男75～79歳']), woman: Number(v['女75～79歳'])})
        //                 dataSet.push({class: '80～84歳', man: Number(v['男80～84歳']), woman: Number(v['女80～84歳'])})
        //                 dataSet.push({class: '85～89歳', man: Number(v['男85～89歳']), woman: Number(v['女85～89歳'])})
        //                 dataSet.push({class: '90歳以上', man: Number(v['男90歳以上']), woman: Number(v['女90歳以上'])})
        //
        //                 dataSousu.push({class: '総数', 総数: Number(v['総数'])})
        //                 dataSousu.push({class: '総数', 総数65歳以上: Number(v['65歳以上'])})
        //                 // dataSousu.push({class: '総数', 平均年齢: Number(v['平均年齢'])})
        //                 // dataSousu.push({class: '総数', 秘匿処理: v['秘匿処理']})
        //             })
        //
        //             console.log(dataSet)
        //             const sousu = dataSousu[0]['総数']
        //             const over65 = dataSousu[1]['総数65歳以上']
        //             let koureikaritu
        //             if (isNaN(over65)) {
        //                 koureikaritu = '0%'
        //             } else {
        //                 koureikaritu = ((over65 / sousu) * 100).toFixed(2) + '%'
        //             }
        //             store.state.koureikaritu = koureikaritu
        //
        //             store.state.estatDataset = dataSet
        //
        //             store.commit('incrDialog2Id');
        //             store.commit('incrDialogMaxZindex');
        //             let left
        //             if (window.innerWidth < 600) {
        //                 left = (window.innerWidth / 2 - 175) + 'px'
        //             } else {
        //                 left = (document.querySelector('#map01').clientWidth - 560) + 'px'
        //             }
        //             const diialog =
        //                 {
        //                     id: store.state.dialog2Id,
        //                     name: 'pyramid',
        //                     style: {
        //                         display: 'block',
        //                         top: '60px',
        //                         left: left,
        //                         'z-index': store.state.dialogMaxZindex
        //                     }
        //                 }
        //             store.commit('pushDialogs2', {mapName: mapName, dialog: diialog})
        //         })
        //     }
        // })
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("suikei1km-jinkosuii") || e.target.classList.contains("suikei500m-jinkosuii"))) {
                const MESH_ID = e.target.getAttribute("MESH_ID")
                store.state.MESH_ID = MESH_ID
                store.state.isEstat = false

                // 使用するエンドポイントをクラスによって切り替え
                const endpoint = e.target.classList.contains("suikei1km-jinkosuii")
                    ? 'https://kenzkenz.xsrv.jp/open-hinata3/php/jinkosuii2.php'
                    : 'https://kenzkenz.xsrv.jp/open-hinata3/php/jinkosuii3.php';

                axios
                    .get(endpoint, {
                        params: {
                            MESH_ID: MESH_ID,
                        }
                    }).then(function (response) {
                    console.log(response.data)
                    store.state.jinkosuiiDatasetEstat['datasetAll'] = response.data
                    console.log(response)

                    const ronen = response.data.map((value) => {
                        if (isNaN(value.ronenRate)) value.ronenRate = 0
                        return { year: value.year, rate: value.ronenRate }
                    })
                    store.state.jinkosuiiDatasetEstat['datasetRonen'] = ronen

                    const nensyo = response.data.map((value) => {
                        if (isNaN(value.nensyoRate)) value.nensyoRate = 0
                        return { year: value.year, rate: value.nensyoRate }
                    })
                    store.state.jinkosuiiDatasetEstat['datasetNensyo'] = nensyo

                    const seisan = response.data.map((value) => {
                        if (isNaN(value.seisanRate)) value.seisanRate = 0
                        return { year: value.year, rate: value.seisanRate, sousu: value.value, seisan: value.seisan }
                    })
                    store.state.jinkosuiiDatasetEstat['datasetSeisan'] = seisan

                    store.commit('incrDialog2Id');
                    store.commit('incrDialogMaxZindex');

                    let width;
                    let left;
                    if (window.innerWidth < 600) {
                        left = (window.innerWidth / 2 - 175) + 'px'
                    } else {
                        left = (document.querySelector('#map01').clientWidth - 560) + 'px'
                    }

                    const diialog = {
                        id: store.state.dialog2Id,
                        name: 'jinkosuii',
                        style: {
                            display: 'block',
                            width: width,
                            top: '60px',
                            left: left,
                            'z-index': store.state.dialogMaxZindex
                        }
                    }
                    store.commit('pushDialogs2',        { mapName: mapName, dialog: diialog })
                })
            }
        })
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("kyakusu-suii"))) {
                const dataset = JSON.parse(e.target.getAttribute("dataset"))
                store.state.jinkosuiiDatasetEstat['datasetAll'] = dataset
                store.state.stationName = e.target.getAttribute("stationname") + '駅'

                store.commit('incrDialog2Id');
                store.commit('incrDialogMaxZindex');

                let width;
                let left;
                if (window.innerWidth < 600) {
                    left = (window.innerWidth / 2 - 175) + 'px'
                } else {
                    left = (document.querySelector('#map01').clientWidth - 560) + 'px'
                }

                const diialog = {
                    id: store.state.dialog2Id,
                    name: 'kyakususuii',
                    style: {
                        display: 'block',
                        width: width,
                        top: '60px',
                        left: left,
                        'z-index': store.state.dialogMaxZindex
                    }
                }
                store.commit('pushDialogs2',        { mapName: mapName, dialog: diialog })
            }
        })
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("kasen-suikei"))) {
                const map = store.state[mapName]
                if (map.getFilter('oh-kasen') === undefined) {
                    const suikei = e.target.getAttribute("suikei")
                    if (suikei !== 'undefined') {
                        map.setFilter('oh-kasen', ['==', ['get', 'suikei'], suikei])
                        map.setFilter('oh-kasen-label', ['==', ['get', 'suikei'], suikei])
                    }
                } else {
                    map.setFilter('oh-kasen', null)
                    map.setFilter('oh-kasen-label', null)
                }
            }
        })
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("kasen-highlights"))) {
                const map = store.state[mapName]
                if (e.target.getAttribute("kasenmei") === '名称不明') {
                    alert('名称不明の河川は強調できません。')
                    return
                }

                if (kasen === e.target.getAttribute("kasen")) {
                    map.setPaintProperty('oh-kasen', 'line-color','blue')
                    map.setPaintProperty('oh-kasen', 'line-width', [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        1,
                        [
                            '*',
                            0.1,
                            ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
                        ],
                        11,
                        [
                            '*',
                            1,
                            ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
                        ],
                        12,
                        [
                            '*',
                            2,
                            ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
                        ],
                        14,
                        [
                            '*',
                            3,
                            ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
                        ],
                        16,
                        [
                            '*',
                            5,
                            ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
                        ]
                    ]);
                    kasen = null
                    store.state.kasenCode[mapName] = null
                    store.state.kasenMei[mapName] = null
                    return
                }

                kasen = e.target.getAttribute("kasen")
                const kasenmei = e.target.getAttribute("kasenmei")
                if (kasen) {
                    // map.setPaintProperty('oh-kasen', 'line-color', [
                    //     'case',
                    //     ['all', ['==', ['get', 'W05_002'], kasen], ['==', ['get', 'W05_004'], kasenmei]],
                    //     'red',
                    //     'blue'
                    // ])
                    //
                    // map.setPaintProperty('oh-kasen', 'line-width', [
                    //     'interpolate',
                    //     ['linear'],
                    //     ['zoom'],
                    //     1, [
                    //         'case',
                    //         ['all', ['==', ['get', 'W05_002'], kasen], ['==', ['get', 'W05_004'], kasenmei]],
                    //         5, // 条件が一致する場合の固定値
                    //         [
                    //             '*',
                    //             0.1,
                    //             ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
                    //         ]
                    //     ],
                    //     11, [
                    //         'case',
                    //         ['all', ['==', ['get', 'W05_002'], kasen], ['==', ['get', 'W05_004'], kasenmei]],
                    //         5,
                    //         [
                    //             '*',
                    //             1,
                    //             ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
                    //         ]
                    //     ],
                    //     12, [
                    //         'case',
                    //         ['all', ['==', ['get', 'W05_002'], kasen], ['==', ['get', 'W05_004'], kasenmei]],
                    //         5,
                    //         [
                    //             '*',
                    //             2,
                    //             ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
                    //         ]
                    //     ],
                    //     14, [
                    //         'case',
                    //         ['all', ['==', ['get', 'W05_002'], kasen], ['==', ['get', 'W05_004'], kasenmei]],
                    //         5,
                    //         [
                    //             '*',
                    //             3,
                    //             ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
                    //         ]
                    //     ],
                    //     16, [
                    //         'case',
                    //         ['all', ['==', ['get', 'W05_002'], kasen], ['==', ['get', 'W05_004'], kasenmei]],
                    //         5,
                    //         [
                    //             '*',
                    //             5,
                    //             ['case', ['==', ['get', 'W05_003'], '1'], 3, 1]
                    //         ]
                    //     ]
                    // ]);
                    store.state.kasenCode[mapName] = kasen
                    store.state.kasenMei[mapName] = kasenmei
                }
            }
        })
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("bunsuikai-btn"))) {
                const map = store.state[mapName]
                console.log(map.getFilter('oh-bunsuirei'))
                if (map.getFilter('oh-bunsuirei') === undefined) {
                    const bunsuikai = e.target.getAttribute("bunsuikai")
                    if (bunsuikai !== 'undefined') {
                        map.setFilter('oh-bunsuirei', ['==', ['get', 'W07_002'], bunsuikai])
                        map.setFilter('oh-kasen', ['==', ['get', 'W05_001'], bunsuikai])
                        map.setFilter('oh-kasen-label', ['==', ['get', 'W05_001'], bunsuikai])
                        store.state.suikeiText[mapName] = bunsuikai
                    }
                } else {
                    map.setFilter('oh-bunsuirei', null)
                    map.setFilter('oh-kasen', null)
                    map.setFilter('oh-kasen-label', null)
                    store.state.suikeiText[mapName] = ''
                }
            }
        })
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("mura-name"))) {
                const map = store.state[mapName]
                if (map.getFilter('oh-mura') === undefined) {
                    const mura = e.target.getAttribute("mura")
                    if (mura !== 'undefined') {
                        map.setFilter('oh-mura', ['==', ['get', 'MURA_NAME'], mura])
                        map.setFilter('oh-mura-line', ['==', ['get', 'MURA_NAME'], mura])
                        map.setFilter('oh-koaza', ['==', ['get', 'MURA_NAME'], mura])
                        map.setFilter('oh-koaza-label', ['==', ['get', 'MURA_NAME'], mura])
                        map.setFilter('oh-koaza-line', ['==', ['get', 'MURA_NAME'], mura])
                        map.setFilter('oh-mura-center-label', ['==', ['get', 'MURA_NAME'], mura])
                        store.state.koazaText[mapName] = mura
                    }
                } else {
                    map.setFilter('oh-mura', null)
                    map.setFilter('oh-mura-line', null)
                    map.setFilter('oh-koaza', null)
                    map.setFilter('oh-koaza-label', null)
                    map.setFilter('oh-koaza-line', null)
                    map.setFilter('oh-mura-center-label', null)
                    store.state.koazaText[mapName] = ''
                }
            }
        })
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("popup-btn-traffic"))) {
                if(e.target.nextElementSibling.style.display === 'none') {
                    e.target.nextElementSibling.style.display = 'block'
                    document.querySelectorAll('.popup-html-div').forEach(element => {
                        element.scrollTop = 0;
                    })
                } else {
                    e.target.nextElementSibling.style.display = 'none'
                }
            }
        })
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("carousel-button-prev"))) {
                const carouselImages = document.querySelector('.carousel-images');
                const images = document.querySelectorAll('.carousel-images img');
                const totalImages = images.length;
                function updateCarousel(direction) {
                    let offset = 0;
                    if (direction === 'next') {
                        currentIndex = (currentIndex + 1) % totalImages;
                    } else if (direction === 'prev') {
                        currentIndex = (currentIndex - 1 + totalImages) % totalImages;
                    }
                    for (let i = 0; i < currentIndex; i++) {
                        offset += images[i].offsetWidth;
                    }
                    carouselImages.style.transform = `translateX(-${offset}px)`;
                }
                updateCarousel('prev');
            }
        })
        // -------------------------------------------------------------------------------------------------------------
        // let currentIndex = 0;
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("carousel-button-next"))) {
                const carouselImages = document.querySelector('.carousel-images');
                const images = document.querySelectorAll('.carousel-images img');
                const totalImages = images.length;
                function updateCarousel(direction) {
                    let offset = 0;
                    if (direction === 'next') {
                        currentIndex = (currentIndex + 1) % totalImages;
                    } else if (direction === 'prev') {
                        currentIndex = (currentIndex - 1 + totalImages) % totalImages;
                    }
                    for (let i = 0; i < currentIndex; i++) {
                        offset += images[i].offsetWidth;
                    }
                    carouselImages.style.transform = `translateX(-${offset}px)`;
                }
                updateCarousel('next');
            }
        })
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("sima-output"))) {
                const id = e.target.getAttribute("id")
                const zahyokei =e.target.getAttribute("zahyokei")
                const map = store.state.map01
                const source = map.getSource('click-points-source');
                const pointsGeojson = source._data
                console.log(pointsGeojson)
                // find の戻り値がオブジェクトなので配列に包む
                const foundFeature = pointsGeojson.features.find(feature =>
                    String(feature.properties.id) === String(id)
                );
                const pointGeojson = {
                    type: "FeatureCollection",
                    features: [foundFeature]// 配列にする
                };
                savePointSima (store.state.map01, pointGeojson, zahyokei)
            }
        })
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("sima-output-all"))) {
                const zahyokei =e.target.getAttribute("zahyokei")
                const map = store.state.map01
                const source = map.getSource('click-points-source');
                const pointsGeojson = source._data
                savePointSima (store.state.map01, pointsGeojson, zahyokei)
            }
        })
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("point-delete"))) {
                const id = e.target.getAttribute("id")
                const map01 = store.state.map01
                let source01 = map01.getSource('click-points-source');
                // const map02 = store.state.map02
                // let source02 = map02.getSource('click-points-source');
                let pointsGeojson = source01._data
                // 修正: GeoJSON の全体構造を保持する
                pointsGeojson = {
                    type: "FeatureCollection",
                    features: pointsGeojson.features.filter(feature => {
                        return String(feature.properties.id) !== String(id)
                    })
                }
                source01.setData(pointsGeojson) // 正しい GeoJSON を設定
                // source02.setData(pointsGeojson)
                store.state.clickGeojsonText = JSON.stringify(pointsGeojson)
                store.state.popupDialog = false
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("point-delete-all"))) {
                const map01 = store.state.map01
                let source01 = map01.getSource('click-points-source');
                // 空のGeoJSON FeatureCollectionを設定する
                source01.setData({
                    type: "FeatureCollection",
                    features: []
                });
                store.state.clickGeojsonText = ''
                store.state.popupDialog = false
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('input', (e) => {
            if (e.target.classList.contains("calc-check")) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id")).replace('calc-','')
                const chkElm = document.querySelector('.calc-check')
                const checked = chkElm.checked
                let value
                if (checked) {
                    value = 1
                } else {
                    value = 0
                }
                const gejsonText = geojsonUpdate(map01, null, clickCircleSource.iD, id, 'calc', value)
                store.state.clickCircleGeojsonText = gejsonText
                generateSegmentLabelGeoJSON(JSON.parse(gejsonText))
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('input', (e) => {
            if (e.target.classList.contains("keiko-check")) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id")).replace('keiko-','')
                const chkElm = document.querySelector('.keiko-check')
                const checked = chkElm.checked
                let value
                if (checked) {
                    value = 1
                } else {
                    value = 0
                }
                store.state.clickCircleGeojsonText = geojsonUpdate(map01, null, clickCircleSource.iD, id, 'keiko', value)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('input', (e) => {
            if (e.target.classList.contains("polygon-area-check")) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const chkElm = document.querySelector('.polygon-area-check')
                const checked = chkElm.checked
                store.state.clickCircleGeojsonText = geojsonUpdate(map01, null, clickCircleSource.iD, id, 'isArea', checked)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('input', (e) => {
            if (e.target.classList.contains("circle-radius-check")) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id").replace('-radius',''))
                const pairId = String(e.target.getAttribute("id").replace('-radius','')) + '-point'
                const chkElm = document.querySelector('.circle-radius-check')
                const checked = chkElm.checked
                const circleTextElm = document.querySelector('.circle-text')
                const textValue = circleTextElm.value
                console.log(id,checked,textValue)
                // centerFeature.properties.label
                store.state.clickCircleGeojsonText = geojsonUpdate(map01, null, clickCircleSource.iD, id, 'isRadius', checked)
                store.state.clickCircleGeojsonText = geojsonUpdate(map01, null, clickCircleSource.iD, pairId, 'isRadius', checked)
                console.log(store.state.clickCircleGeojsonText)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('input', (e) => {
            if (e.target && (e.target.classList.contains("circle-range") ||
                e.target.classList.contains("circle-text") ||
                e.target.classList.contains("circle200-check") ||
                e.target.classList.contains("circle-radius-input")

        )) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const circleRangeElm = document.querySelector('.circle-range')
                const circleTextElm = document.querySelector('.circle-text')
                const circleChkElm = document.querySelector('.circle200-check')
                const circleInput = document.querySelector('.circle-radius-input')
                const rangeValue = Number(circleRangeElm.value)
                const textValue = circleTextElm.value
                const checked = circleChkElm.checked
                const inputValue = Number(circleInput.value)
                store.state.circle200Chk = checked
                let radius = checked ? 200 : Number(rangeValue)
                if (e.target.classList.contains("circle-radius-input")) {
                    radius = inputValue
                }
                const lng = Number(circleRangeElm.getAttribute("lng"))
                const lat = Number(circleRangeElm.getAttribute("lat"))
                const coordinates = [lng,lat]
                store.state.coordinates = coordinates
                store.state.clickCircleGeojsonText = geojsonUpdate(map01, 'Circle', clickCircleSource.iD, id, 'label', textValue, radius)
                document.querySelector('.circle-label').innerHTML = '半径' + radius + 'm'
                document.querySelector('.circle-text').value = textValue
                document.querySelector('.circle-radius-input').value = String(radius)
                const inputElement = document.querySelector('.circle-radius-input');
                // let radius = 0;
                let isComposing = false;
                inputElement.addEventListener('compositionstart', () => {
                    isComposing = true;
                });
                inputElement.addEventListener('compositionend', () => {
                    isComposing = false;
                });
                inputElement.addEventListener('input', debounce((e) => {
                    if (isComposing) return;
                    const value = e.target.value;
                    if (!isNaN(value) && value !== '') {
                        radius = parseFloat(value);
                        setTimeout(() => {
                            inputElement.value = String(radius);
                            inputElement.focus(); // フォーカスを維持
                        }, 0);
                    }
                }, 300));
                function debounce(func, wait) {
                    let timeout;
                    return function executedFunction(...args) {
                        const later = () => {
                            clearTimeout(timeout);
                            func(...args);
                        };
                        clearTimeout(timeout);
                        timeout = setTimeout(later, wait);
                    };
                }
                document.querySelector('.circle-range').value = String(radius)
                store.state.currentCircleRadius = radius
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('input', (e) => {
            if (e.target && (e.target.classList.contains("polygon-text"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const polygonTextElm = document.querySelector('.polygon-text')
                const value = polygonTextElm.value
                const tgtProp = 'label'
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("keyword-item"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const pointTextElm = document.querySelector('.oh-cool-input')
                const value = pointTextElm.value
                const tgtProp = 'label'
                setTimeout(() => {
                    store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
                },100)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('input', (e) => {
            if (e.target && (e.target.classList.contains("point-text"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const pointTextElm = document.querySelector('.point-text')
                const value = pointTextElm.value
                const tgtProp = 'label'
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("point-color"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const value = e.target.getAttribute("data-color")
                const tgtProp = 'point-color'
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
                store.state.currentPointColor = value
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("text-color")) || (e.target.classList.contains("circle-color")) || (e.target.classList.contains("polygon-color"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                let value = e.target.getAttribute("data-color")
                if (e.target.classList.contains("circle-color")) {
                    store.state.currentCircleColor = value
                    value = colorNameToRgba(value, 0.6)
                } else if (e.target.classList.contains("text-color")) {
                    store.state.currentTextColor = value
                    // value = e.target.getAttribute("data-color")
                } else if (e.target.classList.contains("polygon-color")) {
                    store.state.currentPolygonColor = value
                    value = colorNameToRgba(value, 0.6)
                }
                const tgtProp = 'color'
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('input', (e) => {
            if (e.target && (e.target.classList.contains("font-size-input"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const value = Number(e.target.value)
                const tgtProp = 'text-size'
                const geojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
                store.state.clickCircleGeojsonText = geojsonText
                store.state.currentTextSize = value
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('input', (e) => {
            if (e.target && (e.target.classList.contains("line-width-input"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const value = Number(e.target.value)
                const tgtProp = 'line-width'
                const geojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
                store.state.clickCircleGeojsonText = geojsonText
                store.state.currentFreeHandWidth = value
                store.state.currentLineWidth = value
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('change', (e) => {
            if (e.target && (e.target.classList.contains("oh-cool-select"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const startId = id + '-start'
                const endId = id + '-end'
                const value = e.target.value
                const tgtProp = 'arrow-type'
                console.log(id,value)
                geojsonUpdate (map01,null,endPointSouce.id,startId,tgtProp,value)
                geojsonUpdate (map01,null,endPointSouce.id,endId,tgtProp,value)
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("line-color"))) {
                const neonColors = {
                    orange: '#FF8000',   // Neon Orange
                    green:  '#39FF14',   // Neon Green
                    blue:   '#1F51FF',   // Neon Blue
                    black:  '#1C1C1C',   // Deep Glow Black (substitute)
                    red:    '#FF073A'    // Neon Red
                };
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const startId = id + '-start'
                const endId = id + '-end'
                const value = e.target.getAttribute("data-color")
                const arrowValue = 'arrow_' + value
                const tgtProp = 'color'
                const arrowTgtProp = 'arrow'
                const keikoValue = neonColors[value]
                geojsonUpdate (map01,null,endPointSouce.id,startId,arrowTgtProp,arrowValue)
                geojsonUpdate (map01,null,endPointSouce.id,endId,arrowTgtProp,arrowValue)
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,arrowTgtProp,arrowValue)
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,'keiko-color',keikoValue)
                store.state.currentFreeHandKeikoColor = keikoValue
                store.state.currentLineColor = value
                store.state.currentArrowColor = arrowValue
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("remove-others"))) {
                store.state.saveHistoryFire = !store.state.saveHistoryFire
                setTimeout(() => {
                    const map01 = store.state.map01
                    const id = String(e.target.getAttribute("id"))
                    let source = map01.getSource(clickCircleSource.iD)
                    const geojson = source._data
                    if (geojson && geojson.features) {
                        let newFeatures
                        const isLasso = geojson.features.find(feature => {
                            return String(feature.properties.id) === id && feature.properties.lassoSelected === true
                        })
                        if (isLasso) {
                            newFeatures = geojson.features.filter(feature => {
                                return feature.properties.lassoSelected === true;
                            });
                        } else {
                            newFeatures = geojson.features.filter(feature => {
                                return String(feature.properties.id) === id || String(feature.properties.pairId) === id;
                            });
                        }
                        if (newFeatures.length !== geojson.features.length) {
                            geojson.features = newFeatures;
                            map01.getSource(clickCircleSource.iD).setData(geojson);
                            store.state.clickCircleGeojsonText = JSON.stringify(geojson)
                        }
                    }
                    store.state.isCursorOnPanel = false
                    closeAllPopups()
                    store.state.popupDialog = false
                },100)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("point-delete"))) {
                store.state.saveHistoryFire = !store.state.saveHistoryFire
                setTimeout(() => {
                    const map01 = store.state.map01
                    const id = String(e.target.getAttribute("id"))
                    let source = map01.getSource(clickCircleSource.iD)
                    const geojson = source._data
                    if (geojson && geojson.features) {
                        const newFeatures = geojson.features.filter(feature => {
                            return !(feature.properties && String(feature.properties.id) === id);
                        });
                        if (newFeatures.length !== geojson.features.length) {
                            geojson.features = newFeatures;
                            map01.getSource(clickCircleSource.iD).setData(geojson);
                            store.state.clickCircleGeojsonText = JSON.stringify(geojson)
                        }
                    }
                    store.state.isCursorOnPanel = false
                    closeAllPopups()
                    store.state.popupDialog = false
                },100)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("circle-delete")|| e.target.classList.contains("line-delete"))) {
                store.state.saveHistoryFire = !store.state.saveHistoryFire
                setTimeout(() => {
                    const map01 = store.state.map01
                    const id = String(e.target.getAttribute("id"))
                    let source = map01.getSource(clickCircleSource.iD)
                    const geojson = source._data
                    let lasso = false
                    if (geojson.features.find(feature => feature.properties.id === id && feature.properties.lassoSelected === true)) {
                        lasso = true
                    }
                    if (geojson && geojson.features) {
                        const newFeatures = geojson.features.filter(feature => {
                            if (lasso) {
                                return !feature.properties.lassoSelected
                            } else {
                                return String(feature.properties.id) !== id && String(feature.properties.pairId) !== id;
                            }
                        });
                        if (newFeatures.length !== geojson.features.length) {
                            geojson.features = newFeatures;
                            map01.getSource(clickCircleSource.iD).setData(geojson);
                            store.state.clickCircleGeojsonText = JSON.stringify(geojson)
                        }
                    }
                    store.state.isCursorOnPanel = false
                    closeAllPopups()
                    store.state.popupDialog = false
                },100)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("line-delete"))) {
                store.state.saveHistoryFire = !store.state.saveHistoryFire
                setTimeout(() => {
                    const map01 = store.state.map01
                    const id = String(e.target.getAttribute("id"))
                    const startId = id + '-start'
                    const endId = id + '-end'
                    const source = map01.getSource(clickCircleSource.iD)
                    const allowSource = map01.getSource(endPointSouce.id)
                    const geojson = source._data
                    const allowGeojson = allowSource._data
                    let lasso = false
                    if (geojson.features.find(feature => feature.properties.id === id && feature.properties.lassoSelected === true)) {
                        lasso = true
                    }
                    if (geojson && geojson.features) {
                        const newFeatures = geojson.features.filter(feature => {
                            if (lasso) {
                                return !feature.properties.lassoSelected
                            } else {
                                return !(feature.properties && String(feature.properties.id) === id);
                            }
                        });
                        if (newFeatures.length !== geojson.features.length) {
                            geojson.features = newFeatures;
                            map01.getSource(clickCircleSource.iD).setData(geojson);
                            store.state.clickCircleGeojsonText = JSON.stringify(geojson)
                        }
                    }
                    if (allowGeojson && allowGeojson.features) {
                        const newFeatures = allowGeojson.features.filter(feature => {
                            if (lasso) {
                                // ここを絶対に修正する必要あり。今は真偽ともに同じ動作をしている。
                                return !(feature.properties && String(feature.properties.id) === startId) && !(feature.properties && String(feature.properties.id) === endId);
                            } else {
                                return !(feature.properties && String(feature.properties.id) === startId) && !(feature.properties && String(feature.properties.id) === endId);
                            }
                        });
                        if (newFeatures.length !== allowGeojson.features.length) {
                            allowGeojson.features = newFeatures;
                            map01.getSource(endPointSouce.id).setData(allowGeojson);
                        }
                    }
                    generateSegmentLabelGeoJSON(geojson)
                    store.state.isCursorOnPanel = false
                    closeAllPopups()
                    store.state.popupDialog = false
                },100)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("line-sima"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                let source = map01.getSource(clickCircleSource.iD)
                const geojson = source._data
                const tgtFeature = geojson.features.find(feature => {
                    return feature.properties.id === id
                })
                store.state.tgtFeature = tgtFeature
                store.state.pointSima = true
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', async (e) => {
            if (e.target && (e.target.classList.contains("ninnzahyo-zip"))) {
                const coordinates = JSON.parse(e.target.getAttribute("lon-lat"))
                const zipFilename = e.target.innerHTML
                const dir = 'ninizahyoGeojsonZip' + zipFilename.slice(0, 2)
                const zipUrl = `https://kenzkenz.xsrv.jp/ninizahyo/zip/${dir}/${zipFilename}`;
                // ZIP を ArrayBuffer 形式で取得
                const resp = await fetch(zipUrl);
                const buf = await resp.arrayBuffer();
                // JSZip で読み込み
                const zip = await JSZip.loadAsync(buf);
                // 中の .geojson ファイルを探す
                const geojsonName = zipFilename.replace(/\.zip$/i, '.geojson');
                let file = zip.file(geojsonName);
                if (!file) {
                    // 見つからなければ、アーカイブ内の最初の .geojson を使う
                    const candidates = zip.file(/\.geojson$/i);
                    if (candidates.length === 0) {
                        throw new Error(`${zipFilename} に .geojson が見つかりませんでした`);
                    }
                    file = candidates[0];
                }
                const geojsonText = await file.async('string');
                removeNini()
                const shiftedGeoJSON = recenterGeoJSON(JSON.parse(geojsonText), coordinates);
                addDraw(shiftedGeoJSON, true,true);
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', async (e) => {
            if (e.target && (e.target.classList.contains("ninnzahyo-zip-remove"))) {
                removeNini()
            }
        });
    })
}
// ラインの最後のセグメントの方向（ベアリング）を計算する関数
function calculateBearing(coord1, coord2, endpoint) {
    const lon1 = coord1[0] * Math.PI / 180;
    const lat1 = coord1[1] * Math.PI / 180;
    const lon2 = coord2[0] * Math.PI / 180;
    const lat2 = coord2[1] * Math.PI / 180;
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360; // 正規化
    if (endpoint === 'end') {
        return bearing + 270; // 矢印の向きを調整
    } else {
        return bearing + 90;
    }
}
// ---------------------------------------------------------------------------------------------------------------------
export function geojsonCreate(map, geoType, coordinates, properties = {}) {
    // 1. 新しいfeatureを生成
    let features,feature,circleFeature,centerFeature,radius,canterLng,canterLat
    let lastCoord,firstCoord,lastPointFeature,firstPointFeature
    let calc
    switch (geoType) {
        case 'Point':
            feature = turf.point(coordinates, properties);
            break;
        case 'FreeHand':
        case 'LineString':
            feature = turf.lineString(coordinates, properties);
            break;
        case 'Polygon':
            feature = turf.polygon(coordinates, properties);
            calc = calculatePolygonMetrics(feature)
            feature.properties['area'] = calc.area
            break;
        case 'Circle':
            if (store.state.circle200Chk) {
                radius = 200
            } else {
                if (store.state.currentCircleRadius > 0) {
                    radius = store.state.currentCircleRadius
                } else {
                    radius = getScreenMeterDivX(map, 10, 'height')
                }
            }
            console.log('半径',radius)
            features = circleCreate (coordinates[0], coordinates[1], radius)
            console.log(features.center.geometry.coordinates)
            canterLng = features.center.geometry.coordinates[0]
            canterLat = features.center.geometry.coordinates[1]
            circleFeature = features.circle
            circleFeature.properties = properties
            circleFeature.properties.label = radius
            circleFeature.properties.label2 = ''
            circleFeature.properties.radius = radius
            circleFeature.properties.canterLng = canterLng
            circleFeature.properties.canterLat = canterLat
            //----------
            centerFeature = features.center
            centerFeature.properties['isCircleCenter'] = 1
            centerFeature.properties['id'] = circleFeature.properties.id + '-point'
            centerFeature.properties['pairId'] = circleFeature.properties.pairId
            centerFeature.properties['label'] = '半径' + radius + 'm'
            centerFeature.properties['label2'] = ''
            centerFeature.properties['isRadius'] = true
            centerFeature.properties['offsetValue'] = [0, 1.5]
            centerFeature.properties['textAnchor'] = 'center'
            centerFeature.properties['textJustify'] = 'center'
            centerFeature.properties['radius'] = radius
            centerFeature.properties['canterLng'] = canterLng
            centerFeature.properties['canterLat'] = canterLat
            break;
        default:
            throw new Error('未対応のgeoType: ' + geoType);
    }

    // 2. 既存のFeatureCollectionを取得
    const source = map.getSource(clickCircleSource.iD);
    let geojsonData = null;
    try {
        geojsonData = source._data
    } catch (e) {
        geojsonData = null;
    }

    // 3. 既存featureが無ければ新規追加
    if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
        if (geoType === 'Circle') {
            geojsonData = turf.featureCollection([circleFeature,centerFeature]);
        } else if (geoType === 'LineString' || geoType === 'FreeHand') {
            geojsonData = turf.featureCollection([feature]);
        } else {
            geojsonData = turf.featureCollection([feature]);
        }
    } else {
        // 既存FeatureCollectionに追加
        if (geoType === 'Circle') {
            geojsonData = {
                ...geojsonData,
                features: [...geojsonData.features, circleFeature,centerFeature]
            };
        } else if (geoType === 'LineString' || geoType === 'FreeHand') {
            geojsonData = {
                ...geojsonData,
                features: [...geojsonData.features, feature]
            };
        } else {
            geojsonData = {
                ...geojsonData,
                features: [...geojsonData.features, feature]
            };
        }
    }
    if (geoType === 'LineString') {
        generateSegmentLabelGeoJSON(geojsonData)
        generateStartEndPointsFromGeoJSON(geojsonData)
    }
    // 4. ソースに再セット
    source.setData(geojsonData);
    store.state.clickCircleGeojsonText = JSON.stringify(geojsonData)
    console.log(store.state.clickCircleGeojsonText)
    store.state.saveHistoryFire = !store.state.saveHistoryFire
    return feature;
}

export function getAllVertexPoints(map, geojson) {
    const source = map.getSource(vertexSource.id);
    if (!geojson || !geojson.features) {
        // ★ ソースを空にする
        source.setData({
            type: 'FeatureCollection',
            features: []
        });
        return;
    }
    const features = [];
    geojson.features.forEach((feature, featIdx) => {
        const { geometry, properties, id } = feature;
        if (!geometry) return;
        if (properties && typeof properties.radius !== "undefined") return;
        if (properties.lassoSelected === true) return;

        const { type, coordinates } = geometry;
        if (type === 'LineString') {
            coordinates.forEach(([lng, lat], i) => {
                features.push({
                    type: 'Feature',
                    id: `${featIdx}_${i}`,
                    geometry: { type: 'Point', coordinates: [lng, lat] },
                    properties: {
                        vertexIndex: i,
                        featureIndex: featIdx,
                        parentId: id ?? null,
                        ...(properties ? { parentProps: properties } : {})
                    }
                });
            });
        } else if (type === 'Polygon') {
            const ring = coordinates[0] || [];
            let pts = ring;
            if (
                pts.length > 1 &&
                pts[0][0] === pts[pts.length - 1][0] &&
                pts[0][1] === pts[pts.length - 1][1]
            ) {
                pts = pts.slice(0, -1);
            }
            pts.forEach(([lng, lat], i) => {
                features.push({
                    type: 'Feature',
                    id: `${featIdx}_${i}`,
                    geometry: { type: 'Point', coordinates: [lng, lat] },
                    properties: {
                        vertexIndex: i,
                        featureIndex: featIdx,
                        parentId: id ?? null,
                        ...(properties ? { parentProps: properties } : {})
                    }
                });
            });
        } else if (type === 'MultiPolygon') {
            coordinates.forEach((poly, polyIdx) => {
                const ring = poly[0] || [];
                let pts = ring;
                if (
                    pts.length > 1 &&
                    pts[0][0] === pts[pts.length - 1][0] &&
                    pts[0][1] === pts[pts.length - 1][1]
                ) {
                    pts = pts.slice(0, -1);
                }
                pts.forEach(([lng, lat], i) => {
                    features.push({
                        type: 'Feature',
                        id: `${featIdx}_${polyIdx}_${i}`,
                        geometry: { type: 'Point', coordinates: [lng, lat] },
                        properties: {
                            vertexIndex: i,
                            featureIndex: featIdx,
                            polygonIndex: polyIdx,
                            parentId: id ?? null,
                            ...(properties ? { parentProps: properties } : {})
                        }
                    });
                });
            });
        }
    });
    console.log('フィーチャーズ',features)
    const vertexPointsGeojson = {
        type: 'FeatureCollection',
        features
    }
    source.setData(vertexPointsGeojson);

    return vertexPointsGeojson
}
/**
 * 本体GeoJSONから全中点を生成してmidpoint-sourceにsetData
 * @param {object} map - MapLibreインスタンス
 * @param {object} geojson - 編集中の本体GeoJSON
 */
export function setAllMidpoints(map, geojson) {
    if (!geojson || !geojson.features) {
        map.getSource('midpoint-source').setData({ type: 'FeatureCollection', features: [] });
        return;
    }
    const features = [];
    geojson.features.forEach((feature, featIdx) => {
        const { geometry, properties } = feature;
        if (!geometry) return;
        if (properties.lassoSelected === true) return;
        // 1. サークル判定
        if (properties && typeof properties.radius !== "undefined") return;
        // 2. Pointタイプ地物は絶対に対象外
        if (geometry.type === 'Point') return;

        const { type, coordinates } = geometry;
        if (type === 'LineString') {
            features.push(...makeMidpointsFeatureCollection(coordinates, false, featIdx, 0));
        } else if (type === 'Polygon') {
            features.push(...makeMidpointsFeatureCollection(coordinates[0], true, featIdx, 0));
        } else if (type === 'MultiPolygon') {
            coordinates.forEach((poly, polyIdx) => {
                features.push(...makeMidpointsFeatureCollection(poly[0], true, featIdx, polyIdx));
            });
        }
    });
    map.getSource('midpoint-source').setData({
        type: 'FeatureCollection',
        features
    });
}
function makeMidpointsFeatureCollection(coords, isPolygon = false, featureIndex = 0, polygonIndex = 0) {
    const midpoints = [];
    let len = coords.length;
    let isClosed = false;

    if (
        isPolygon &&
        len > 2 &&
        coords[0][0] === coords[len - 1][0] &&
        coords[0][1] === coords[len - 1][1]
    ) {
        len -= 1; // 最後は除外してループ
        isClosed = true;
    }

    // 各辺ごと
    for (let i = 0; i < len - 1; i++) {
        const [lng1, lat1] = coords[i];
        const [lng2, lat2] = coords[i + 1];
        midpoints.push({
            type: 'Feature',
            id: `mp_${featureIndex}_${polygonIndex}_${i}`,
            geometry: {
                type: 'Point',
                coordinates: [ (lng1+lng2)/2, (lat1+lat2)/2 ]
            },
            properties: {
                insertIndex: i+1,
                featureIndex,
                polygonIndex
            }
        });
    }
    // 閉じたポリゴンのn-1→0の中点を追加
    if (isPolygon && isClosed && len > 2) {
        const [lng1, lat1] = coords[len - 1];
        const [lng2, lat2] = coords[0];
        midpoints.push({
            type: 'Feature',
            id: `mp_${featureIndex}_${polygonIndex}_end`,
            geometry: {
                type: 'Point',
                coordinates: [ (lng1+lng2)/2, (lat1+lat2)/2 ]
            },
            properties: {
                insertIndex: len,
                featureIndex,
                polygonIndex
            }
        });
    }
    return midpoints;
}
/**
 * Polygon/Multipolygonの閉じ忘れ（最初と最後が違う）を自動修復
 * @param {object} geojson - 編集中のFeatureCollection
 */
export function autoCloseAllPolygons(geojson) {
    if (!geojson || !geojson.features) return;
    geojson.features.forEach((feature) => {
        if (!feature.geometry) return;
        const { type, coordinates } = feature.geometry;
        // Polygon
        if (type === 'Polygon') {
            if (Array.isArray(coordinates[0]) && coordinates[0].length > 2) {
                const ring = coordinates[0];
                const first = ring[0], last = ring[ring.length - 1];
                if (first[0] !== last[0] || first[1] !== last[1]) {
                    feature.geometry.coordinates[0] = ring.concat([first]);
                }
            }
        }
        // MultiPolygon
        else if (type === 'MultiPolygon') {
            coordinates.forEach((poly, polyIdx) => {
                if (Array.isArray(poly[0]) && poly[0].length > 2) {
                    const ring = poly[0];
                    const first = ring[0], last = ring[ring.length - 1];
                    if (first[0] !== last[0] || first[1] !== last[1]) {
                        feature.geometry.coordinates[polyIdx][0] = ring.concat([first]);
                    }
                }
            });
        }
    });
}

export function getVertexPoints(map, geoType, coords, isPolygon = false) {
    // Polygonの場合、coords[0]（外環）を使用
    if (geoType === 'Circle') return
    let points = coords;
    if (isPolygon) {
        points = coords[0];
        if (
            points.length > 1 &&
            points[0][0] === points[points.length - 1][0] &&
            points[0][1] === points[points.length - 1][1]
        ) {
            points = points.slice(0, -1);
        }
    }
    const source = map.getSource(vertexSource.id);
    let geojsonData = null;
    try {
        geojsonData = source._data
    } catch (e) {
        geojsonData = null;
    }
    const features = points.map(([lng, lat], i) => ({
        type: 'Feature',
        id: i,
        geometry: {
            type: 'Point',
            coordinates: [lng, lat]
        },
        properties: { vertexIndex: i }
    }));
    geojsonData = {
        ...geojsonData,
        features: [...geojsonData.features, ...features]
    };
    source.setData(geojsonData);
}

export function getScreenMeterDivX(map, x, direction = 'width') {
    const canvas = map.getCanvas();
    const w = canvas.width;
    const h = canvas.height;
    let coord1, coord2;

    if (direction === 'width') {
        // 左端と右端（画面中央高さ）
        coord1 = map.unproject([0, h / 2]);
        coord2 = map.unproject([w, h / 2]);
    } else {
        // 上端と下端（画面中央幅）
        coord1 = map.unproject([w / 2, 0]);
        coord2 = map.unproject([w / 2, h]);
    }

    // turf.js で距離計算（単位: meters）
    const from = [coord1.lng, coord1.lat];
    const to = [coord2.lng, coord2.lat];
    const distance = turf.distance(from, to, { units: 'meters' });
    return Math.floor(distance / x);
}

export function circleCreate (lng, lat, m) {
    const center = [lng, lat];
    // const radiusKm = 0.2; // 200m = 0.2km
    const radiusKm = m / 1000;
    const steps = 64;
    const circleGeoJson = turf.circle(center, radiusKm, {
        steps: steps,
        units: 'kilometers'
    });
    const centerFeature = turf.centerOfMass(circleGeoJson);
    return {center:centerFeature,circle:circleGeoJson}
}
//
export function geojsonUpdate(map, geoType, sourceId, id, tgtProp, value, radius) {
    store.state.saveHistoryFire = !store.state.saveHistoryFire
    const source = map.getSource(sourceId)
    if (!source) return;
    const geojson = source._data
    let changed = false;
    if (geojson && geojson.features) {
        // idが一致するfeatureを検索
        let found = false;
        let circleFeatureGeometry,centerFeature
        const lasso = geojson.features.find(feature => feature.properties.id === id && feature.properties.lassoSelected === true)
        geojson.features.forEach(feature => {
            // lasso が見つかっていれば lassoSelected、なければ id マッチをチェック
            const shouldUpdate = lasso
                ? feature.properties.lassoSelected === true
                : String(feature.properties.id) === id;
            if (shouldUpdate) {
                feature.properties[tgtProp] = value
                // ----------------------------------------------------------
                if (geoType === 'Circle') {
                    const features = circleCreate (feature.properties.canterLng, feature.properties.canterLat, radius)
                    circleFeatureGeometry = features.circle.geometry
                    feature.geometry = circleFeatureGeometry
                    feature.properties.label = radius
                    feature.properties.radius = radius
                    feature.properties.label2 = value
                    centerFeature = geojson.features.find(f => f.properties.id === id + '-point' )
                    console.log(centerFeature)
                    centerFeature.properties.label = value + '\n半径' + radius + 'm'
                    centerFeature.properties.label2 = value
                }
                // ---------------------------------------------------------
                changed = true;
                found = true;
            }
        });
        // 見つからなかったら新しく作成
        if (!found && id === "config") {
            const newFeature = {
                "type": "Feature",
                // geometryは入れない
                "properties": {
                    "id": "config",
                }
            }
            // tgtProp, valueもセット
            newFeature.properties[tgtProp] = value;
            geojson.features.push(newFeature);
            changed = true;
        }
        if (changed) {
            map.getSource(sourceId).setData(geojson);
            console.log(geojson)
            store.state.updatePermalinkFire = !store.state.updatePermalinkFire
            return escapeHTML(JSON.stringify(geojson))
        }
    }
}

// ラインのラベル用に距離を計算したgeojsonを作る、
export function generateSegmentLabelGeoJSON(geojson) {
    const map01 = store.state.map01;
    const features = [];
    if (!geojson) return
    geojson.features.forEach((feature) => {
        if (feature.properties.id === 'config') return;
        if (!feature || feature.geometry.type !== 'LineString' || feature.properties['free-hand']) return;

        const coords = feature.geometry.coordinates;

        for (let i = 0; i < coords.length - 1; i++) {
            const from = coords[i];
            const to = coords[i + 1];
            const segment = turf.lineString([from, to]);

            const center = turf.midpoint(turf.point(from), turf.point(to));
            const dist = turf.length(segment, { units: 'kilometers' });

            const distance = dist >= 1
                ? `約${dist.toFixed(2)}km`
                : `約${(dist * 1000).toFixed(0)}m`;

            features.push({
                type: 'Feature',
                geometry: center.geometry,
                properties: {
                    calc: feature.properties.calc || 0,
                    distance: distance,
                    index: i + 1
                }
            });
        }
    });
    const labelGeojson = {
        type: 'FeatureCollection',
        features
    };
    // ラベル用ソースに反映
    map01.getSource('segment-label-source').setData(labelGeojson);
}

// ラインに矢印のポイントを作る
export function generateStartEndPointsFromGeoJSON(geojson) {
    const map01 = store.state.map01;
    const pointFeatures = [];
    if (!geojson) return
    geojson.features.forEach((feature) => {
        if (feature.properties.id === 'config') return;
        if (!feature || feature.geometry.type !== 'LineString' || feature.properties['free-hand']) return;

        const coordinates = feature.geometry.coordinates;
        const properties = feature.properties || {};

        if (coordinates.length < 2) return;

        // 始点--------------------------------------------------------
        const firstCoord = coordinates[0];
        const secondCoord = coordinates[1]; // for bearing
        pointFeatures.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: firstCoord
            },
            properties: {
                id: properties.id  + '-start',
                pairId: properties.pairId || null,
                endpoint: 'start',
                'arrow-type': properties['arrow-type'] || 'end',
                arrow: properties.arrow || 'arrow_black',
                bearing: calculateBearing(firstCoord, secondCoord, 'start')
            }
        });
        // 終点-----------------------------------------------------------
        const lastCoord = coordinates[coordinates.length - 1];
        const secondLastCoord = coordinates[coordinates.length - 2];
        pointFeatures.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: lastCoord
            },
            properties: {
                id: properties.id + '-end',
                pairId: properties.pairId || null,
                endpoint: 'end',
                'arrow-type': properties['arrow-type'] || 'end',
                arrow: properties.arrow || 'arrow_black',
                bearing: calculateBearing(secondLastCoord, lastCoord, 'end')
            }
        });
    });

    const pointGeoJSON = {
        type: 'FeatureCollection',
        features: pointFeatures
    };
    console.log(pointFeatures)
    // MapLibre のソースに反映
    map01.getSource('end-point-source').setData(pointGeoJSON);

    return pointGeoJSON
}

export function deleteAll (noConfrim) {
    if (!noConfrim) {
        if (!confirm("全て削除しますか？")) {
            return
        }
    }
    const map01 = store.state.map01
    let source = map01.getSource(clickCircleSource.iD);
    // 空のGeoJSON FeatureCollectionを設定する
    source.setData({
        type: "FeatureCollection",
        features: []
    });
    clickCircleSource.obj.data = null

    source = map01.getSource(endPointSouce.id);
    // 空のGeoJSON FeatureCollectionを設定する
    source.setData({
        type: "FeatureCollection",
        features: []
    });
    endPointSouce.obj.data = null

    store.state.clickCircleGeojsonText = ''
    store.state.clickCircleGeojsonTextMyroom = ''
    getAllVertexPoints(map01)
    setAllMidpoints(map01)
    generateSegmentLabelGeoJSON({
        type: "FeatureCollection",
        features: []
    })
    closeAllPopups()
    store.state.printTitleText = ''
    store.state.textPx = 30
    store.state.titleColor = 'black'
    store.state.titleDirection = 'vertical'
}

export function escapeHTML(str) {
    return str
        .replace(/&/g, 'amp\\n')
}
export function unescapeHTML(str) {
    return str
        .replace(/amp/g, '&');
}

export function colorNameToRgba(colorName, alpha = 1) {
    // 定義: 色名 → [R, G, B]
    const colorTable = {
        orange: [255, 165, 0],
        green: [0, 128, 0],
        blue: [0, 0, 255],
        black: [0, 0, 0],
        red: [255, 0, 0],
        yellow:[255,255,0],
        hotpink:[255, 105, 180],
    };
    const rgb = colorTable[colorName.toLowerCase()];
    if (!rgb) return 'rgba(0,0,0,0)'; // 未定義色名の場合
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

export let lastGeojson = null;

export function watchGeojsonChange() {
    const map = store.state.map01;
    requestAnimationFrame(() => {
        console.log('⏱ 実行中');

        const source = map.getSource('click-circle-source');
        if (!source) {
            // ソースがまだない → 次フレームで再チェック
            watchGeojsonChange();
            return;
        }

        const current = source._data;

        if (JSON.stringify(current) !== JSON.stringify(lastGeojson)) {
            // 差分あり
            lastGeojson = JSON.parse(JSON.stringify(current)); // ← ちゃんとコピーしないと比較できない
            console.log('🟢 GeoJSON changed!', current);
            alert('GeoJSON changed!');
            store.state.saveHistoryFire = !store.state.saveHistoryFire
        }

        watchGeojsonChange(); // 🔁 次のフレームへ
    });
}
