import store from '@/store'
import axios from "axios"

export default function pyramid () {
    ['map01','map02'].forEach(mapName => {
        const mapElm = document.querySelector('#' + mapName)
        console.log(mapElm)
        mapElm.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(e.target.classList)
            if (e.target && e.target.classList.contains('pyramid-syochiiki-r02')) {
                console.log(e.target.getAttribute("cdArea"))
                store.state.cdArea = e.target.getAttribute("cdArea")
                store.state.syochiikiName = e.target.getAttribute("syochiikiname")
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
                    console.log(dataSousu)
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
                    console.log(data)
                    store.state.estatDataset = data

                    
                    //
                    // vm.$store.commit('base/incrDialog2Id');
                    // vm.$store.commit('base/incrDialogMaxZindex');
                    // let left
                    // if (window.innerWidth < 600) {
                    //     left = (window.innerWidth / 2 - 175) + 'px'
                    // } else {
                    //     left = (document.querySelector('#map01').clientWidth - 560) + 'px'
                    // }
                    // console.log(left)
                    // // left = 0
                    // const diialog =
                    //     {
                    //         id: vm.s_dialo2Id,
                    //         name:'pyramid-estat',
                    //         style: {
                    //             display: 'block',
                    //             top: '60px',
                    //             left:left,
                    //             // right: '10px',
                    //             'z-index': vm.s_dialogMaxZindex
                    //         }
                    //     }
                    // console.log(diialog)
                    // vm.$store.commit('base/pushDialogs2',{mapName: mapName, dialog: diialog})
                })

            }
        })
    })
}

