
<template>
  <div :id="id">
    <div class="d3-kyakususuii"></div>
  </div>
</template>

<script>

import * as d3 from "d3"
import store from "@/store";

export default {
  name: "Dialog-kyakususuii",
  props: ['mapName', 'item'],
  data () {
    return {
    }
  },
  computed: {
    id () {
      return 'kyakususuii-' + this.item.id
    }
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
      }
      // データの準備
      const datasetAll = vm.$store.state.jinkosuiiDatasetEstat.datasetAll
      const dialog2DragHandle = document.querySelector('#dialog2-' + vm.item.id + ' .drag-handle')
      dialog2DragHandle.innerHTML = vm.$store.state.stationName + '　乗降客数推移'

      let width = 550; // グラフの幅
      const height = 300; // グラフの高さ
      const paddingTop = 35; // スケール表示用マージン
      const paddingRight = 45
      let paddingBottom = 30
      let paddingLeft = 70
      let fontSize = '12px'

      if (window.innerWidth < 600) {
        width = 350
        paddingLeft = 65
        paddingBottom = 40
        fontSize = '9px'
      }

      // 2. SVG領域の設定
      const svg = d3.select('#' + vm.id + ' .d3-kyakususuii')
          .append("svg")
          .attr("width", width)
          .attr("height", height)

      // svg.append("text")
      //     .attr("fill", "black")
      //     .attr("transform", "translate(" + (width/2) + "," + (paddingTop - 15) + ")")
      //     // .attr("dy", "5px")
      //     .attr("font-size", fontSize)
      //     .attr("text-anchor", "middle")
      //     .text('棒=人口、緑色=年少人口率、青色=生産年齢人口率、赤色=老年人口率');

      svg.append("text")
          .attr("fill", "black")
          .attr("transform", "translate(" + (width-paddingRight+30) + "," + (paddingTop - 2) + ")")
          .attr("font-size", fontSize)
          // .attr("text-anchor", "middle")
          .text('%');

      svg.append("text")
          .attr("fill", "black")
          .attr("transform", "translate(" + (10) + "," + (paddingTop - 10) + ")")
          .attr("font-size", fontSize)
          // .attr("text-anchor", "middle")
          .text('人');


      // 3. 軸スケールの設定
      const xScale = d3.scaleBand()
          .rangeRound([paddingLeft, width - paddingRight])
          .padding(0.1)
          .domain(datasetAll.map(function(d) { return d.year; }));

      const yScale = d3.scaleLinear()
          .domain([0, d3.max(datasetAll, function(d) { return d.value; })])
          .range([height - paddingBottom, paddingBottom]);

      const yScaleNensyou = d3.scaleLinear()
          .domain([0, 100])
          .range([height - paddingBottom, paddingBottom]);

      // 4. 軸の表示
      const xs = svg.append("g")
          .attr("transform", "translate(" + 0 + "," + (height - paddingBottom) + ")")
          .call(d3.axisBottom(xScale));
      if (window.innerWidth < 600) {
        xs.selectAll('text')
            .style('text-anchor', 'start')
            .attr('dx', '1em')
            .attr('dy', '-0.5em')
            .attr('transform', 'rotate(90)')
      }
      svg.append("g")
          .attr("transform", "translate(" + paddingLeft + "," + 0 + ")")
          .call(d3.axisLeft(yScale));
      svg.append("g")
          .attr("transform", "translate(" + (width - paddingRight) + "," + 0 + ")")
          .call(d3.axisRight(yScaleNensyou));
      const tooltip = d3.select("body").append("div").attr("class", "d3tooltip");
      // . バーの表示
      svg.append("g")
          .selectAll("rect")
          .data(datasetAll)
          .enter()
          .append("rect")
          .on("mouseover", function(event, data) {
            tooltip
                .style("visibility", "visible")
                .html("人数:" + data.value.toLocaleString() + '人');
          })
          .on("mousemove", function(event) {
            // let x
            // if ((window.innerWidth-300) < event.pageX) {
            //   x = event.pageX - 110
            // } else {
            //   x = event.pageX
            // }
            // tooltip
            //     .style("top", (event.pageY - 20) + "px")
            //     .style("left", (x + 10) + "px");
            tooltip
                .style("top", (event.pageY - 20) + "px")
                .style("left", (event.pageX + 10) + "px");
          })
          .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
          })
          .attr("x", function(d) { return xScale(d.year); })
          .attr("width", xScale.bandwidth())
          .attr("height",0)
          .attr('y', height - paddingBottom)
          .transition()
          .duration(1500)
          .delay(200)
          .attr("y", function(d) { return yScale(d.value); })
          .attr("height", function(d) { return height - paddingBottom - yScale(d.value); })
          .attr("fill", "lightsteelblue");
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
