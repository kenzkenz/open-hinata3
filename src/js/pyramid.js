import store from '@/store'
import axios from "axios"
import * as turf from '@turf/turf'
import {convertAndDownloadGeoJSONToSIMA, savePointSima} from "@/js/downLoad";
import {clickCircleSource, clickPointSource, endPointSouce, vertexSource} from "@/js/layers";
import {closeAllPopups} from "@/js/popup";
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
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('input', (e) => {
            if (e.target && (e.target.classList.contains("circle-range") || e.target.classList.contains("circle-text") || e.target.classList.contains("circle200-check"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const circleRangeElm = document.querySelector('.circle-range')
                const circleTextElm = document.querySelector('.circle-text')
                const circleChkElm = document.querySelector('.circle200-check')
                const rangeValue = Number(circleRangeElm.value)
                const textValue = circleTextElm.value
                const checked = circleChkElm.checked
                store.state.circle200Chk = checked
                const radius = checked ? 200 : Number(rangeValue)
                const lng = Number(circleRangeElm.getAttribute("lng"))
                const lat = Number(circleRangeElm.getAttribute("lat"))
                console.log(id,lng,lat,Number(rangeValue),textValue)
                const coordinates = [lng,lat]
                store.state.coordinates = coordinates
                store.state.clickCircleGeojsonText = geojsonUpdate(map01, 'Circle', clickCircleSource.iD, id, 'label2', textValue, radius)
                console.log(store.state.clickCircleGeojsonText)
                document.querySelector('.circle-label').innerHTML = '半径' + radius + 'm'
                document.querySelector('.circle-text').value = textValue
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
            if (e.target && (e.target.classList.contains("point-color")) || (e.target.classList.contains("circle-color"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                let value = e.target.getAttribute("data-color")
                if (e.target.classList.contains("circle-color")) {
                    value = colorNameToRgba(value, 0.6)
                }
                const tgtProp = 'color'
                console.log(id,value)
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("line-color"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const arrowId = id + '-arrow'
                const value = e.target.getAttribute("data-color")
                const arrowValue = 'arrow_' + value
                const tgtProp = 'color'
                const arrowTgtProp = 'arrow'
                console.log(id,value)
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,arrowId,arrowTgtProp,arrowValue)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("font-size-input"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const value = Number(e.target.value)
                const tgtProp = 'text-size'
                console.log(id,value)
                const geojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
                console.log(geojsonText)
                store.state.clickCircleGeojsonText = geojsonText
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("line-width-input"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const value = Number(e.target.value)
                const tgtProp = 'line-width'
                console.log(id,value)
                const geojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
                console.log(geojsonText)
                store.state.clickCircleGeojsonText = geojsonText
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('change', (e) => {
            if (e.target && (e.target.classList.contains("oh-cool-select"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                const arrowId = id + '-arrow'
                const value = e.target.value
                const tgtProp = 'arrow-type'
                console.log(id,value)
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,id,tgtProp,value)
                store.state.clickCircleGeojsonText = geojsonUpdate (map01,null,clickCircleSource.iD,arrowId,tgtProp,value)
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("point-delete"))) {
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
            }
        });
        // -------------------------------------------------------------------------------------------------------------
        mapElm.addEventListener('click', (e) => {
            if (e.target && (e.target.classList.contains("circle-delete")|| e.target.classList.contains("line-delete"))) {
                const map01 = store.state.map01
                const id = String(e.target.getAttribute("id"))
                let source = map01.getSource(clickCircleSource.iD)
                const geojson = source._data
                if (geojson && geojson.features) {
                    const newFeatures = geojson.features.filter(feature => {
                        return !(feature.properties && String(feature.properties.pairId) === id);
                    });
                    if (newFeatures.length !== geojson.features.length) {
                        geojson.features = newFeatures;
                        map01.getSource(clickCircleSource.iD).setData(geojson);
                        store.state.clickCircleGeojsonText = JSON.stringify(geojson)
                    }
                }
                store.state.isCursorOnPanel = false
                closeAllPopups()
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
    switch (geoType) {
        case 'Point':
            feature = turf.point(coordinates, properties);
            break;
        case 'LineString':
            feature = turf.lineString(coordinates, properties);
            // ラインの終点をポイントとして抽出------------------------------------------------------------------------------
            lastCoord = coordinates[coordinates.length - 1];
            lastPointFeature = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: lastCoord
                },
                properties: {
                    id: properties.pairId + '-arrow',
                    pairId: properties.pairId,
                    endpoint: 'end',
                    'arrow-type': 'end',
                    arrow: 'arrow_black',
                    // 最後のセグメントの方向を計算（オプション）
                    bearing: calculateBearing(
                        coordinates[coordinates.length - 2],
                        lastCoord,
                        'end'
                    )
                }
            };
            // ラインの初点をポイントとして抽出------------------------------------------------------------------------------
            firstCoord = coordinates[0];
            firstPointFeature = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: firstCoord
                },
                properties: {
                    id: properties.pairId + '-arrow',
                    pairId: properties.pairId,
                    endpoint: 'start',
                    'arrow-type': 'end',
                    arrow: 'arrow_black',
                    // 最後のセグメントの方向を計算（オプション）
                    bearing: calculateBearing(
                        coordinates[0],
                        coordinates[1],
                        'start'
                    )
                }
            };
            // getVertexPoints(map,geoType,coordinates, false)
            break;
        case 'Polygon':
            feature = turf.polygon(coordinates, properties);
            // getVertexPoints(map,geoType,coordinates, true)
            break;
        case 'Circle':
            if (store.state.circle200Chk) {
                radius = 200
            } else {
                radius = getScreenMeterDivX(map, 40, 'height')
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
            centerFeature.properties['id'] = circleFeature.properties.id + '-point'
            centerFeature.properties['pairId'] = circleFeature.properties.pairId
            centerFeature.properties['label'] = '半径' + radius + 'm'
            centerFeature.properties['label2'] = ''
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
        } else if (geoType === 'LineString') {
            geojsonData = turf.featureCollection([feature,lastPointFeature,firstPointFeature]);
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
        } else if (geoType === 'LineString') {
            geojsonData = {
                ...geojsonData,
                features: [...geojsonData.features, feature,lastPointFeature,firstPointFeature]
            };
        } else {
            geojsonData = {
                ...geojsonData,
                features: [...geojsonData.features, feature]
            };
        }
    }
    // 4. ソースに再セット
    source.setData(geojsonData);
    store.state.clickCircleGeojsonText = JSON.stringify(geojsonData)
    console.log(store.state.clickCircleGeojsonText)
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
    source.setData({
        type: 'FeatureCollection',
        features
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

// export function getVertexPoints(map, geoType, coords, isPolygon = false) {
//     // coords: [[lng,lat], ...]
//     // ポリゴンなら閉じている場合があるので最後ダブり除外
//     let points = coords;
//     if (isPolygon && coords.length > 1 && coords[0][0] === coords[coords.length-1][0] && coords[0][1] === coords[coords.length-1][1]) {
//         points = coords.slice(0, -1);
//     }
//     const source = map.getSource(vertexSource.id);
//     let geojsonData = null;
//     try {
//         geojsonData = source._data
//     } catch (e) {
//         geojsonData = null;
//     }
//     const features =
//         points.map(([lng, lat], i) => ({
//             type: 'Feature',
//             id: i,
//             geometry: {
//                 type: 'Point',
//                 coordinates: [lng, lat]
//             },
//             properties: { vertexIndex: i }
//         }));
//     if (geoType === 'Polygon') {
//         geojsonData = {
//             ...geojsonData,
//             features: [...geojsonData.features, ...features]
//         };
//     } else if (geoType === 'LineString') {
//         geojsonData = {
//             ...geojsonData,
//             features: [...geojsonData.features, ...features]
//         };
//     }
//     source.setData(geojsonData);
//     // store.state.clickCircleGeojsonText = JSON.stringify(geojsonData)
//     // console.log(store.state.clickCircleGeojsonText)
//     // return feature;
// }

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

export function geojsonUpdate(map, geoType, sourceId, id, tgtProp, value, radius) {
    const source = map.getSource(sourceId)
    if (!source) return;
    const geojson = source._data
    let changed = false;
    if (geojson && geojson.features) {
        // idが一致するfeatureを検索
        let found = false;
        let circleFeatureGeometry,centerFeature
        geojson.features.forEach(feature => {
            if (feature.properties && String(feature.properties.id) === id) {
                feature.properties[tgtProp] = value
                // ----------------------------------------------------------
                if (geoType === 'Circle') {
                    const features = circleCreate (feature.properties.canterLng, feature.properties.canterLat, radius)
                    circleFeatureGeometry = features.circle.geometry
                    feature.geometry = circleFeatureGeometry
                    feature.properties.label = radius
                    feature.properties.radius = radius
                    centerFeature = geojson.features.find(f => f.properties.id === id + '-point' )
                    console.log(centerFeature)
                    centerFeature.properties.label = value + '\n半径' + radius + 'm'
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

export function deleteAll () {
    if (!confirm("全て削除しますか？")) {
        return
    }
    const map01 = store.state.map01
    let source = map01.getSource(clickCircleSource.iD);
    // 空のGeoJSON FeatureCollectionを設定する
    source.setData({
        type: "FeatureCollection",
        features: []
    });
    store.state.clickCircleGeojsonText = ''
    closeAllPopups()
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
        red: [255, 0, 0]
    };
    const rgb = colorTable[colorName.toLowerCase()];
    if (!rgb) return null; // 未定義色名の場合
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}