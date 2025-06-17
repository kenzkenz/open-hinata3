
<template>
  <div :id="id">
    <div class="d3-elevation"></div>
  </div>
</template>

<script>

import * as d3 from "d3"
import * as turf from '@turf/turf'

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
          coord:[feature.geometry.coordinates[0],feature.geometry.coordinates[1]]
        }
      })

      console.log(data)
      const length = data.length

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

      const path = g.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "steelblue")
          .attr("stroke-width", 2)
          .attr("d", line);

      // アニメーション
      const totalLength = path.node().getTotalLength();

      path
          .attr("stroke-dasharray", totalLength + " " + totalLength)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .duration(1500)
          .ease(d3.easeCubic)
          .attr("stroke-dashoffset", 0);


      // g.append("path")
      //     .datum(data)
      //     .attr("fill", "none")
      //     .attr("stroke", "steelblue")
      //     .attr("stroke-width", 2)
      //     .attr("d", line);

      // インタラクティブポイント
      const tooltip = d3.select(".tooltip");

      // g.selectAll(".dot")
      //     .data(data)
      //     .enter()
      //     .append("circle")
      //     .attr("class", "dot")
      //     .attr("cx", d => x(d.distance))
      //     .attr("cy", d => y(d.elevation))
      //     .attr("r", 4)
      //     .attr("fill", "orange")
      //     .on("mouseenter", function(event, d) {
      //       tooltip.style("display", "block")
      //           .html(`距離: ${d.distance.toFixed(1)} km<br>標高: ${d.elevation.toFixed(1)} m`)
      //           .style("left", (event.pageX + 10) + "px")
      //           .style("top", (event.pageY - 28) + "px");
      //     })
      //     .on("mouseleave", () => tooltip.style("display", "none"));

      // g.selectAll(".dot")
      //     .data(data)
      //     .enter()
      //     .append("circle")
      //     .attr("class", "dot")
      //     .attr("cx", d => x(d.distance))
      //     .attr("cy", d => y(d.elevation))
      //     .attr("r", 0) // 最初は半径0
      //     .attr("fill", "orange")
      //     .transition()
      //     .delay((_, i) => i * 30)
      //     .duration(300)
      //     .attr("r", 3); // 徐々に半径を広げる

      const totalDuration = 1500; // 総アニメ時間（ミリ秒）
      const numPoints = data.length;
      const delayPerPoint = totalDuration / numPoints;

      g.selectAll(".dot")
          .data(data)
          .enter()
          .append("circle")
          .attr("class", "dot")
          .attr("cx", d => x(d.distance))
          .attr("cy", d => y(d.elevation))
          .attr("r", 0) // 最初は0
          .attr("fill", "orange")
          .transition()
          .delay((_, i) => i * delayPerPoint)
          .duration(300)
          .attr("r", 3); // 半径をアニメーションで拡大

      const map = vm.$store.state.map01
      console.log(map)
      svg.on("mousemove", function (event) {
        const [mouseX] = d3.pointer(event);
        const mouseDistance = x.invert(mouseX - margin.left); // x座標を距離に変換

        // 最も近い点を探す
        const closest = data.reduce((prev, curr) =>
            Math.abs(curr.distance - mouseDistance) < Math.abs(prev.distance - mouseDistance) ? curr : prev
        );

        // alert(closest.coord)
        // console.log(turf.point(closest.coord))
        if (closest && map.getSource('elevation-source')) {
          map.getSource('elevation-source').setData(turf.point(closest.coord));
        }
      });

      // svg.on("mouseout", () => {
      //   map.getSource('elevation-source').setData(turf.featureCollection([]));
      // });

      const marker = g.append("line")
          .attr("class", "elevation-source-line")
          .attr("y1", 0)
          .attr("y2", chartHeight)
          .attr("stroke", "red")
          .attr("stroke-width", 2)
          .attr("opacity", 0); // 初期非表示
      
      // -----------------------------------------------------------------------------------------------------
      map.on('mousemove', (e) => {
        const lineFeatures = vm.$store.state.elevationGeojson.features;
        if (!lineFeatures || lineFeatures.length === 0) return;

        // マウス座標
        const lngLat = [e.lngLat.lng, e.lngLat.lat];

        // turf.nearestPointOnLine で最も近い点を取得
        const line = turf.lineString(lineFeatures.map(f => f.geometry.coordinates));
        const snapped = turf.nearestPointOnLine(line, turf.point(lngLat), { units: 'kilometers' });

        // snapped.properties.location: 線上の距離（km）
        const d = snapped.properties.location;

        // 標高図上で最も近い点を探す
        const closest = data.reduce((prev, curr) =>
            Math.abs(curr.distance - d) < Math.abs(prev.distance - d) ? curr : prev
        );

        // x座標位置を取得して marker を移動
        const xPos = x(closest.distance);
        marker
            .attr("x1", xPos)
            .attr("x2", xPos)
            .attr("opacity", 1);
      });

      map.on('mousemove', (e) => {
        const lineFeatures = vm.$store.state.elevationGeojson.features;
        if (!lineFeatures || lineFeatures.length === 0) return;

        // マウス座標
        const lngLat = [e.lngLat.lng, e.lngLat.lat];

        // turf.nearestPointOnLine で最も近い点を取得
        const line = turf.lineString(lineFeatures.map(f => f.geometry.coordinates));
        const snapped = turf.nearestPointOnLine(line, turf.point(lngLat), { units: 'kilometers' });

        // snapped.properties.location: 線上の距離（km）
        const d = snapped.properties.location;

        // 標高図上で最も近い点を探す
        const closest = data.reduce((prev, curr) =>
            Math.abs(curr.distance - d) < Math.abs(prev.distance - d) ? curr : prev
        );

        // x座標位置を取得して marker を移動
        const xPos = x(closest.distance);
        marker
            .attr("x1", xPos)
            .attr("x2", xPos)
            .attr("opacity", 1);
      });


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
