<template>
  <div :id="id">
    <div class="d3-pyramid"></div>
  </div>
</template>

<script>

import * as d3 from "d3"
import store from "@/store";

export default {
  name: "Dialog-pyramid-estat",
  props: ['mapName', 'item'],
  data () {
    return {
    }
  },
  computed: {
    id () {
      return 'pyramid-estat-' + this.item.id
    },
  },
  methods: {
  },
  watch: {
  },
  mounted () {
    const vm = this
    resasD3()
    function resasD3 () {
      const elements = document.querySelectorAll('#' + vm.mapName + ' .dialog2-div')
      const len = elements.length
      if (len>1) {
        elements[len-1].style.top = Number(elements[len-2].style.top.replace('px','')) + 40 + 'px'
        if (window.innerWidth > 600) {
          elements[len-1].style.left = Number(elements[len-2].style.left.replace('px','')) - 40 + 'px'
          const result = vm.$store.state.dialogs2[vm.mapName] .find(el => el.id === vm.item.id)
          result.style.top = document.querySelector( '#dialog2-' + vm.item.id).style.top
          result.style.left = document.querySelector('#dialog2-' + vm.item.id).style.left
        }
        // if (elements[len-2].style.top === '60px') {
        //   elements[len-1].style.top = '100px'
        //   if (window.innerWidth > 600) {
        //     elements[len-1].style.left = (window.innerWidth - 600) + 'px'
        //   }
        // }
      }
      // elements[len-1].style.width = '550px'
      // ---------------------------------------------------------------------------
      d3.select('#' + vm.id + ' .d3-pyramid svg').remove()
      // d3.select('#' + vm.id + ' .loadingImg').style("display","block")
      //----------------------------------------------------------------
      const dialog2DragHandle = document.querySelector('#dialog2-' + vm.item.id + ' .drag-handle')
      // console.log(vm.$store.state.MESH_ID)
      if(vm.$store.state.isEstat) {
        dialog2DragHandle.innerHTML = vm.$store.state.kokuchoYear + ' ' + vm.$store.state.syochiikiName
      } else {
        dialog2DragHandle.innerHTML = vm.$store.state.popupAddress + ' ' + vm.$store.state.suikeiYear
        vm.$store.state.MESH_ID = ''
      }

      //----------------------------------------------------------------
      d3Create (vm.$store.state.estatDataset)
      function d3Create (response) {
        let  data = response
        console.log(data)
        const margin = {top: 20, right: 20, bottom: 30, left: 20}
        let width = 550 - margin.left - margin.right
        let height = 400 - margin.top - margin.bottom
        let womanMargin = 230
        let textLeft = 195
        let fontSize

        if (window.innerWidth > 600) {
          elements[len-1].style.width = '550px'
          width = 550 - margin.left - margin.right
          height = 500 - margin.top - margin.bottom
          womanMargin = 285
          textLeft = 255
          fontSize = '16px'
        } else {
          elements[len-1].style.width = '350px'
          width = 350 - margin.left - margin.right
          height = 280 - margin.top - margin.bottom
          womanMargin = 185
          textLeft = 155
          fontSize = '12px'
        }

        // let  data = response[8].data.result.yearRight.data

        const y = d3.scaleBand()
            .range([height, 0])
            .padding(0.1);
        const y2 = d3.scaleBand()
            .range([height, 0])
            .padding(0.1);
        const x = d3.scaleLinear()
            .range([womanMargin, width]);
        const x2 = d3.scaleLinear()
            .range([width - womanMargin-0,0])

        // d3.select(".d3-pyramid svg").remove()
        console.log(d3.select('#' + vm.id + ' .d3-pyramid'))
        const svg = d3.select('#' + vm.id + ' .d3-pyramid').append("svg")
            // const svg = d3.select('.d3-pyramid').append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        const manSum = Math.round(d3.sum(data, function(d){ return d.man; }))
        const womanSum = Math.round(d3.sum(data, function(d){ return d.woman; }))
        const koureikaritu = vm.$store.state.koureikaritu
        const heikinnenrei = vm.$store.state.heikinnenrei

        svg.append("line")
            .attr("x1",width/2 -30)
            .attr("y1",0)
            .attr("x2",width/2 -30)
            .attr("y2",height)
            .attr("stroke-width",1)
            .attr("stroke","black");

        let text
        if (vm.$store.state.isEstat) {
          text = '男' + manSum + '人 女' + womanSum + '人 高齢化率' + koureikaritu + ' 平均年齢' + heikinnenrei
        } else {
          text = '男' + manSum + '人 女' + womanSum + '人 高齢化率' + koureikaritu
        }

        svg.append("text")
            .attr("fill", "black")
            .attr("transform", "translate(" + textLeft + "," + -5 + ")")
            // .attr("dy", "5px")
            .attr("font-size", fontSize)
            .attr("text-anchor", "middle")
            .text(text);
        let max
        const womanMax = d3.max(data, function(d){ return d.woman; })
        const manMax = d3.max(data, function(d){ return d.man; })
        if ( womanMax > manMax) {
          max = womanMax
        } else {
          max = manMax
        }

        x.domain([0, max])
        x2.domain([0,max])

        y.domain(data.map(function(d) { return d.class; }));
        y2.domain(data.map(function(d) { return d.class; }));

        const tooltip = d3.select("body").append("div").attr("class", "d3tooltip");
        svg.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .on("mouseover", function(event, data) {
              const ritu = (data.woman / (womanSum + manSum) * 100).toFixed(2)
              tooltip
                  .style("visibility", "visible")
                  .html("年齢:" + data.class.trim() + "<br>人数: " + data.woman + "人<br>" + ritu + '%');
            })
            .on("mousemove", function(event) {
              tooltip
                  .style("top", (event.pageY - 20) + "px")
                  .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
              tooltip.style("visibility", "hidden");
            })
            .attr("y", function(d) { return y(d.class); })
            .attr("height", y.bandwidth())
            .attr("transform", "translate(" + womanMargin + "," + 0 + ")")
            .attr("fill", function() {
              // switch (d.class){
              //   case '0～4歳':
              //   case '5～9歳':
              //   case '10～14歳':
              //     return 'green'
              //     break;
              //   case '15～19歳':
              //   case '20～24歳':
              //   case '25～29歳':
              //   case '30～34歳':
              //   case '35～39歳':
              //   case '40～44歳':
              //   case '45～49歳':
              //   case '50～54歳':
              //   case '55～59歳':
              //   case '60～64歳':
              //     return 'blue'
              //     break;
              //   default:
              //     return 'brown'
              // }
              return  "pink"
            })
            .attr("width", 0)
            .transition()
            .duration(1500)
            .delay(200)
            .attr("width", function(d) {
              return x(d.woman) - womanMargin
            })

        svg.selectAll(".bar-man")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar-man")
            .on("mouseover", function(event, data) {
              const ritu = (data.man / (womanSum + manSum) * 100).toFixed(2)
              tooltip
                  .style("visibility", "visible")
                  .html("年齢:" + data.class.trim() + "<br>人数: " + data.man + "人<br>" + ritu + '%');
              // .html("年齢:" + data.class.trim() + "<br>人数: " + data.man + "人");
            })
            .on("mousemove", function(event) {
              tooltip
                  .style("top", (event.pageY - 20) + "px")
                  .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
              tooltip.style("visibility", "hidden");
            })
            .attr("y", function(d) { return y(d.class); })
            .attr("height", y.bandwidth())
            .attr("transform", "translate(" + 0 + "," + 0 + ")")
            .attr("fill", "steelblue")
            .attr("width", 0)
            .attr("x", function() {
              return width/2 -30
            })
            // .attr("x", function(d) {return x2(d.man)/;})
            .transition()
            .duration(1500)
            .delay(200)
            .attr("x", function(d) {return x2(d.man);})
            .attr("width", function(d) {
              return width -x2(d.man) -womanMargin-0
            })

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).ticks(4))
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x2).ticks(4))
        svg.append("g")
            .attr("transform", "translate(" + womanMargin + "," + 0 + ")")
            .call(d3.axisLeft(y))
      }
    }
  }
}
</script>

<style>
.d3tooltip {
  position: absolute;
  text-align: center;
  width: auto;
  height: auto;
  padding: 2px;
  font-size: 14px;
  background: white;
  -webkit-box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.8);
  -moz-box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.8);
  box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.8);
  visibility: hidden;
  border-radius:2px;
  z-index: 9999;
}
</style>
<style scoped>
.content-div{
  width: 500px;
  padding: 10px;
}

</style>
