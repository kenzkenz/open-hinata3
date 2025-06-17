
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
    const tooltip0 = d3.select("body")
        .append("div")
        .attr("class", "d3tooltip");
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

      // const tooltip = d3.select("body").append("div").attr("class", "d3tooltip");
      // const tooltip = d3.select(".tooltip");
      const totalDuration = 1500;
      const delayPerPoint = totalDuration / data.length;

      const tooltip = d3.select("body").append("div")
          .attr("class", "d3tooltip")
          .style("position", "absolute")
          .style("visibility", "hidden");

      tooltip.classed("show", true);

      // svg 全体にイベントを受けるための透明な rect を追加する
      svg.append("rect")
          .attr("width", width)
          .attr("height", height)
          .attr("fill", "transparent")
          .style("pointer-events", "all") // ← ← ← これが超重要
          .on("mousemove", function (event) {
            const [mouseX] = d3.pointer(event);
            const distance = x.invert(mouseX - margin.left);

            const closest = data.reduce((a, b) =>
                Math.abs(a.distance - distance) < Math.abs(b.distance - distance) ? a : b
            );

            tooltip
                .style("visibility", "visible")
                .html(
                    `距離: ${(closest.distance * 1000).toFixed(0)} m<br>標高: ${closest.elevation.toFixed(1)} m`
                )
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");

            markerLine
                .attr("x1", x(closest.distance))
                .attr("x2", x(closest.distance))
                .attr("opacity", 1);

            map.getSource('elevation-source').setData(turf.point(closest.coord));
          })
          .on("mouseleave", () => {
            tooltip.style("visibility", "hidden");
            markerLine.attr("opacity", 0);
          });

      if (data.length < 100) {
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

      map.on('mousemove', (e) => {
        const features = vm.$store.state.elevationGeojson.features;
        const line = turf.lineString(features.map(f => f.geometry.coordinates));
        const snapped = turf.nearestPointOnLine(line, turf.point([e.lngLat.lng, e.lngLat.lat]), { units: 'kilometers' });
        const d = snapped.properties.location;

        const closest = features.reduce((a, b) =>
            Math.abs(a.properties.accumulated_distance - d) <
            Math.abs(b.properties.accumulated_distance - d) ? a : b
        );

        const redLngLat = {
          lng: closest.geometry.coordinates[0],
          lat: closest.geometry.coordinates[1]
        };

        // 画面座標に変換
        const mousePixel = map.project(e.lngLat);
        const redPixel = map.project(redLngLat);

        const pixelDist = Math.hypot(mousePixel.x - redPixel.x, mousePixel.y - redPixel.y);

        // 近ければツールチップ表示（例: 60px以内）
        if (pixelDist < 60) {
          map.getSource('elevation-source').setData(turf.point(closest.geometry.coordinates));

          tooltip0
              .html(
                  `距離: ${(closest.properties.accumulated_distance * 1000).toFixed(0)} m<br>` +
                  `標高: ${(closest.geometry.coordinates[2] ?? 0).toFixed(1)} m`
              )
              .style("left", `${e.originalEvent.pageX + 10}px`)
              .style("top", `${e.originalEvent.pageY - 28}px`)
              .style("visibility", "visible")
              .style("opacity", 0.8)
              .classed("show", true);
        } else {
          tooltip0
              .style("visibility", "hidden")
              .style("opacity", 0)
              .classed("show", false);
        }
      });

    }

  }
}
</script>

<style>
.d3tooltip {
  position: absolute;
  background: rgba(30, 30, 30, 0.9);
  color: #fff;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 6px;
  pointer-events: none;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  transform: translateY(-10px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  opacity: 0;
  z-index: 9999;
  max-width: 300px;
  line-height: 1.4;
  font-family: "Helvetica Neue", sans-serif;
}
.d3tooltip.show {
  opacity: 0.8;
  transform: translateY(0);
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
