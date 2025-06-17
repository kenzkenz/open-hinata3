
<template>
  <div :id="id">
    <div class="toggle-aspect">等倍に変更</div>
    <div class="d3-elevation"></div>
  </div>
</template>

<script>

import * as d3 from "d3"
import * as turf from '@turf/turf'

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
    let isAspect1to1 = false; // 縦横等倍モード
    resasD3()
    const toggleAspect = document.querySelector('#' + vm.mapName + ' .toggle-aspect')
    toggleAspect?.addEventListener('click', () => {
      isAspect1to1 = !isAspect1to1;
      if (isAspect1to1) {
        toggleAspect.innerHTML = '元に戻す'
      } else {
        toggleAspect.innerHTML = '等倍に変更'
      }
      resasD3(); // 再描画
    });

    function resasD3 () {
      const elements = document.querySelectorAll('#' + vm.mapName + ' .dialog2-div')
      const len = elements.length
      if (len > 1) {
        elements[len - 1].style.top = Number(elements[len - 2].style.top.replace('px', '')) + 40 + 'px'
        if (window.innerWidth > 600) {
          elements[len - 1].style.left = Number(elements[len - 2].style.left.replace('px', '')) - 40 + 'px'
          const result = vm.$store.state.dialogs2[vm.mapName].find(el => el.id === vm.item.id)
          result.style.top = document.querySelector('#dialog2-' + vm.item.id).style.top
          result.style.left = document.querySelector('#dialog2-' + vm.item.id).style.left
        }
      }

      const dialog2DragHandle = document.querySelector('#dialog2-' + vm.item.id + ' .drag-handle')
      dialog2DragHandle.innerHTML = '標高図'

      let width = 550;
      const height = 300;
      const paddingTop = 35;
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

      const svgContainer = d3.select('#' + vm.id + ' .d3-elevation');
      svgContainer.selectAll('*').remove(); // 前回描画クリア

      const svg = svgContainer
          .append("svg")
          .attr("width", width)
          .attr("height", height)

      const features = vm.$store.state.elevationGeojson.features
      const data = features.map((feature, index) => {
        let elevation
        if (isNaN(feature.geometry.coordinates[2])) {
          elevation = features[index + 1]?.geometry.coordinates[2] ?? 0
        } else if (feature.geometry.coordinates[2] === 0) {
          elevation = features[index + 1]?.geometry.coordinates[2] ?? 0
        } else {
          elevation = feature.geometry.coordinates[2]
        }
        return {
          distance: feature.properties.accumulated_distance,
          elevation: elevation,
          coord: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]]
        }
      })

      const margin = { top: 20, right: 30, bottom: 30, left: 50 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      const x = d3.scaleLinear()
          .domain(d3.extent(data, d => d.distance))
          .range([0, chartWidth]);

      const y = (() => {
        if (isAspect1to1) {
          const xDomain = d3.extent(data, d => d.distance);
          const xRangeMeters = (xDomain[1] - xDomain[0]) * 1000;
          return d3.scaleLinear()
              .domain([0, xRangeMeters])
              .range([chartHeight, 0]);
        } else {
          return d3.scaleLinear()
              .domain([0, d3.max(data, d => d.elevation) + 10])
              .range([chartHeight, 0]);
        }
      })();

      const g = svg.append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

      g.append("g")
          .attr("transform", `translate(0,${chartHeight})`)
          .call(d3.axisBottom(x).ticks(10).tickFormat(d => d * 1000 + "m"));

      g.append("g")
          .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "m"));

      const area = d3.area()
          .x(d => x(d.distance))
          .y0(chartHeight) // 下端
          .y1(d => y(d.elevation)) // 標高の線まで
          .curve(d3.curveMonotoneX); // 線と同じカーブを使うと自然

      g.append("path")
          .datum(data)
          .attr("fill", "steelblue") // 好きな色に
          .attr("opacity", 0.5)           // 透過もできる
          .attr("d", area);

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

      const totalLength = path.node().getTotalLength();

      path
          .attr("stroke-dasharray", totalLength + " " + totalLength)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .duration(1500)
          .ease(d3.easeCubic)
          .attr("stroke-dashoffset", 0);

      const tooltip = d3.select(".tooltip");
      const totalDuration = 1500;
      const delayPerPoint = totalDuration / data.length;

      if (data.length <= 100) {
        g.selectAll(".dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.distance))
            .attr("cy", d => y(d.elevation))
            .attr("r", 0)
            .attr("fill", "orange")
            .transition()
            .delay((_, i) => i * delayPerPoint)
            .duration(300)
            .attr("r", 3);
      }


      const map = vm.$store.state.map01

      const markerLine = g.append("line")
          .attr("class", "marker-line")
          .attr("y1", 0)
          .attr("y2", chartHeight)
          .attr("stroke", "red")
          .attr("stroke-width", 2)
          .attr("opacity", 0);

      svg.on("mousemove", function (event) {
        const [mouseX] = d3.pointer(event);
        const distance = x.invert(mouseX - margin.left);
        const closest = data.reduce((a, b) =>
            Math.abs(a.distance - distance) < Math.abs(b.distance - distance) ? a : b
        );

        markerLine
            .attr("x1", x(closest.distance))
            .attr("x2", x(closest.distance))
            .attr("opacity", 1);

        map.getSource('elevation-source').setData(turf.point(closest.coord));
      });

      svg.on("mouseleave", () => {
        markerLine.attr("opacity", 0);
      });

      map.on('mousemove', (e) => {
        const features = vm.$store.state.elevationGeojson.features;
        const line = turf.lineString(features.map(f => f.geometry.coordinates));
        const snapped = turf.nearestPointOnLine(line, turf.point([e.lngLat.lng, e.lngLat.lat]), { units: 'kilometers' });
        const d = snapped.properties.location;

        const closest = data.reduce((a, b) =>
            Math.abs(a.distance - d) < Math.abs(b.distance - d) ? a : b
        );

        map.getSource('elevation-source').setData(turf.point(closest.coord));

        markerLine
            .attr("x1", x(closest.distance))
            .attr("x2", x(closest.distance))
            .attr("opacity", 1);
      });

      map.on('mouseout', () => {
        markerLine.attr("opacity", 0);
        map.getSource('elevation-source').setData(turf.featureCollection([]));
      });
    }



    // function resasD3 () {
    //   const elements = document.querySelectorAll('#' + vm.mapName + ' .dialog2-div')
    //   const len = elements.length
    //   if (len>1) {
    //     elements[len-1].style.top = Number(elements[len-2].style.top.replace('px','')) + 40 + 'px'
    //     if (window.innerWidth > 600) {
    //       elements[len-1].style.left = Number(elements[len-2].style.left.replace('px','')) - 40 + 'px'
    //       const result = vm.$store.state.dialogs2[vm.mapName] .find(el => el.id === vm.item.id)
    //       result.style.top = document.querySelector( '#dialog2-' + vm.item.id).style.top
    //       result.style.left = document.querySelector('#dialog2-' + vm.item.id).style.left
    //     }
    //   }
    //
    //   const dialog2DragHandle = document.querySelector('#dialog2-' + vm.item.id + ' .drag-handle')
    //   dialog2DragHandle.innerHTML = '標高図'
    //
    //   let width = 550; // グラフの幅
    //   const height = 300; // グラフの高さ
    //   const paddingTop = 35; // スケール表示用マージン
    //   const paddingRight = 45
    //   let paddingBottom = 30
    //   let paddingLeft = 70
    //   let fontSize = '12px'
    //
    //   if (window.innerWidth < 600) {
    //     width = 350
    //     paddingLeft = 65
    //     paddingBottom = 40
    //     fontSize = '9px'
    //   }
    //
    //   const svg = d3.select('#' + vm.id + ' .d3-elevation')
    //       .append("svg")
    //       .attr("width", width)
    //       .attr("height", height)
    //
    //   const features = vm.$store.state.elevationGeojson.features
    //   const data = features.map((feature,index) => {
    //     let elevation
    //     if (isNaN(feature.geometry.coordinates[2])) {
    //       elevation = features[index + 1].geometry.coordinates[2]
    //       if (isNaN(elevation)) {
    //         elevation = 0
    //       }
    //     } else if (feature.geometry.coordinates[2] === 0) {
    //       elevation = features[index + 1].geometry.coordinates[2]
    //     } else {
    //       elevation = feature.geometry.coordinates[2]
    //     }
    //     console.log(elevation)
    //     return {
    //       distance:feature.properties.accumulated_distance,
    //       elevation:elevation,
    //       coord:[feature.geometry.coordinates[0],feature.geometry.coordinates[1]]
    //     }
    //   })
    //
    //   console.log(data)
    //   const length = data.length
    //
    //   const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    //   const chartWidth = width - margin.left - margin.right;
    //   const chartHeight = height - margin.top - margin.bottom;
    //
    //   const x = d3.scaleLinear()
    //       .domain(d3.extent(data, d => d.distance))
    //       .range([0, chartWidth]);
    //
    //   const y = d3.scaleLinear()
    //       .domain([0, d3.max(data, d => d.elevation) + 10])
    //       .range([chartHeight, 0]);
    //
    //   const g = svg.append("g")
    //       .attr("transform", `translate(${margin.left},${margin.top})`);
    //
    //   // 軸
    //   g.append("g")
    //       .attr("transform", `translate(0,${chartHeight})`)
    //       // .call(d3.axisBottom(x).ticks(10).tickFormat(d => d + "km"));
    //       .call(d3.axisBottom(x).ticks(10).tickFormat(d => d*1000 + "m"));
    //
    //   g.append("g")
    //       .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "m"));
    //
    //   // 線
    //   const line = d3.line()
    //       .x(d => x(d.distance))
    //       .y(d => y(d.elevation))
    //       .curve(d3.curveMonotoneX);
    //
    //   const path = g.append("path")
    //       .datum(data)
    //       .attr("fill", "none")
    //       .attr("stroke", "steelblue")
    //       .attr("stroke-width", 2)
    //       .attr("d", line);
    //
    //   // アニメーション
    //   const totalLength = path.node().getTotalLength();
    //
    //   path
    //       .attr("stroke-dasharray", totalLength + " " + totalLength)
    //       .attr("stroke-dashoffset", totalLength)
    //       .transition()
    //       .duration(1500)
    //       .ease(d3.easeCubic)
    //       .attr("stroke-dashoffset", 0);
    //
    //   // インタラクティブポイント
    //   const tooltip = d3.select(".tooltip");
    //
    //
    //   const totalDuration = 1500; // 総アニメ時間（ミリ秒）
    //   const numPoints = data.length;
    //   const delayPerPoint = totalDuration / numPoints;
    //
    //   g.selectAll(".dot")
    //       .data(data)
    //       .enter()
    //       .append("circle")
    //       .attr("class", "dot")
    //       .attr("cx", d => x(d.distance))
    //       .attr("cy", d => y(d.elevation))
    //       .attr("r", 0) // 最初は0
    //       .attr("fill", "orange")
    //       .transition()
    //       .delay((_, i) => i * delayPerPoint)
    //       .duration(300)
    //       .attr("r", 3); // 半径をアニメーションで拡大
    //
    //   const map = vm.$store.state.map01
    //   svg.on("mousemove", function (event) {
    //     const [mouseX] = d3.pointer(event);
    //     const mouseDistance = x.invert(mouseX - margin.left); // x座標を距離に変換
    //
    //     // 最も近い点を探す
    //     const closest = data.reduce((prev, curr) =>
    //         Math.abs(curr.distance - mouseDistance) < Math.abs(prev.distance - mouseDistance) ? curr : prev
    //     );
    //     if (closest && map.getSource('elevation-source')) {
    //       map.getSource('elevation-source').setData(turf.point(closest.coord));
    //     }
    //   });
    //
    //   const markerLine = g.append("line")
    //       .attr("class", "marker-line")
    //       .attr("y1", 0)
    //       .attr("y2", chartHeight)
    //       .attr("stroke", "red")
    //       .attr("stroke-width", 2)
    //       .attr("opacity", 0); // 非表示で開始
    //
    //   svg.on("mousemove", function (event) {
    //     const [mouseX] = d3.pointer(event);
    //     const distance = x.invert(mouseX - margin.left); // 対応する距離
    //     const closest = data.reduce((a, b) =>
    //         Math.abs(a.distance - distance) < Math.abs(b.distance - distance) ? a : b
    //     );
    //
    //     // 縦線更新
    //     markerLine
    //         .attr("x1", x(closest.distance))
    //         .attr("x2", x(closest.distance))
    //         .attr("opacity", 1);
    //
    //     // 地図側にマーカー表示
    //     map.getSource('elevation-source').setData(turf.point(closest.coord));
    //   });
    //
    //   svg.on("mouseleave", () => {
    //     markerLine.attr("opacity", 0);
    //   });
    //   // --------------------------------------------------------------------------------------------------------------
    //
    //   map.on('mousemove', (e) => {
    //     const features = vm.$store.state.elevationGeojson.features;
    //     const line = turf.lineString(features.map(f => f.geometry.coordinates));
    //     const snapped = turf.nearestPointOnLine(line, turf.point([e.lngLat.lng, e.lngLat.lat]), { units: 'kilometers' });
    //     const d = snapped.properties.location;
    //
    //     // 最も近い点
    //     const closest = data.reduce((a, b) =>
    //         Math.abs(a.distance - d) < Math.abs(b.distance - d) ? a : b
    //     );
    //
    //     // 地図上の赤丸（最寄り点の位置に）
    //     map.getSource('elevation-source').setData(turf.point(closest.coord));
    //
    //     // 標高図の縦線を更新
    //     markerLine
    //         .attr("x1", x(closest.distance))
    //         .attr("x2", x(closest.distance))
    //         .attr("opacity", 1);
    //   });
    //
    //   map.on('mouseout', () => {
    //     markerLine.attr("opacity", 0);
    //     map.getSource('elevation-source').setData(turf.featureCollection([]));
    //   });
    //
    // }
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
.toggle-aspect {
  position: absolute;
  top:5px;
  left:100px;
  color: white;
  font-size: 16px;
}
.toggle-aspect:hover {
  color: navy;
}
</style>
<style scoped>
.content-div{
  width: 500px;
  padding: 10px;
}

</style>
