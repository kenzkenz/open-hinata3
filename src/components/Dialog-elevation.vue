
<template>
  <div :id="id">
    <div class="d3-elevation"></div>
  </div>
</template>

<script>

import * as d3 from "d3"
import store from "@/store";

export default {
  name: "Dialog-elevation",
  props: ['mapName', 'item'],
  data () {
    return {
    }
  },
  computed: {
    id () {
      return 'elevation-' + this.item.id
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

      const dialog2DragHandle = document.querySelector('#dialog2-' + vm.item.id + ' .drag-handle')
      dialog2DragHandle.innerHTML = '標高図'

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

      const svg = d3.select('#' + vm.id + ' .d3-elevation')
          .append("svg")
          .attr("width", width)
          .attr("height", height)

      const features = vm.$store.state.elevationGeojson.features
      const data = features.map((feature,index) => {
        let elevation
        if (isNaN(feature.geometry.coordinates[2])) {
          elevation = features[index + 1].geometry.coordinates[2]
          if (isNaN(elevation)) {
            elevation = 0
          }
        } else if (feature.geometry.coordinates[2] === 0) {
          elevation = features[index + 1].geometry.coordinates[2]
        } else {
          elevation = feature.geometry.coordinates[2]
        }
        console.log(elevation)
        return {
          distance:feature.properties.accumulated_distance,
          elevation:elevation,
          coord:[feature.geometry.coordinates[0],feature.geometry.coordinates[0]]
        }
      })

      console.log(data)

      const margin = { top: 20, right: 30, bottom: 30, left: 50 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      const x = d3.scaleLinear()
          .domain(d3.extent(data, d => d.distance))
          .range([0, chartWidth]);

      const y = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.elevation) + 10])
          .range([chartHeight, 0]);

      const g = svg.append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

      // 軸
      g.append("g")
          .attr("transform", `translate(0,${chartHeight})`)
          // .call(d3.axisBottom(x).ticks(10).tickFormat(d => d + "km"));
          .call(d3.axisBottom(x).ticks(10).tickFormat(d => d*1000 + "m"));

      g.append("g")
          .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "m"));

      // 線
      const line = d3.line()
          .x(d => x(d.distance))
          .y(d => y(d.elevation))
          .curve(d3.curveMonotoneX);

      g.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "steelblue")
          .attr("stroke-width", 2)
          .attr("d", line);

      // インタラクティブポイント
      const tooltip = d3.select(".tooltip");

      g.selectAll(".dot")
          .data(data)
          .enter()
          .append("circle")
          .attr("class", "dot")
          .attr("cx", d => x(d.distance))
          .attr("cy", d => y(d.elevation))
          .attr("r", 4)
          .attr("fill", "orange")
          .on("mouseenter", function(event, d) {
            tooltip.style("display", "block")
                .html(`距離: ${d.distance.toFixed(1)} km<br>標高: ${d.elevation.toFixed(1)} m`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseleave", () => tooltip.style("display", "none"));

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
