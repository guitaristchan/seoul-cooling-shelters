// scenes/section2.js — "필요한 사람은 어디에 사나?" (자치구 choropleth)
//
// 서울 자치구 경계(GeoJSON) 위에 기초수급 독거노인 수로 색을 입힌다.
//   s2-1 : 기초수급 독거노인 밀집도 choropleth (짙을수록 많음)
//   s2-2 : 쪽방촌 밀집 자치구(종로·중구·영등포) 하이라이트 + 핀
//
// 데이터: dong_metrics.json 의 행정동별 '기초수급'을 자치구 단위로 합산.

export function createSection2Scene(root, data) {
  const { dongMetrics, seoulGu } = data;

  // 쪽방촌 주요 지역 (기획서 기반) — 자치구 단위 하이라이트 + 핀 좌표(근사)
  const SLUM_GUS = ["종로구", "중구", "영등포구"];
  const PINS = [
    { gu: "종로구", lon: 127.0098, lat: 37.5726, label: "돈의동·창신동 쪽방촌" },
    { gu: "중구", lon: 126.9769, lat: 37.5547, label: "남대문로5가 쪽방촌" },
    { gu: "영등포구", lon: 126.9074, lat: 37.5172, label: "영등포동 쪽방촌" },
  ];

  // ---- 자치구별 기초수급 독거노인 합산 --------------------------------
  const byGu = d3.rollup(
    dongMetrics,
    (rows) => d3.sum(rows, (r) => +r["기초수급"] || 0),
    (r) => r["자치구"]
  );
  const maxVal = d3.max(Array.from(byGu.values())) || 1;
  const color = d3
    .scaleSequential(d3.interpolateYlOrRd)
    .domain([0, maxVal]);

  // ---- DOM 구성 -------------------------------------------------------
  const wrap = d3.select(root).append("div").attr("class", "s2-mapwrap");
  const svg = wrap.append("svg").attr("class", "s2-svg");
  const gMap = svg.append("g").attr("class", "s2-geo");
  const gPins = svg.append("g").attr("class", "s2-pins");

  // 범례
  const legend = wrap.append("div").attr("class", "s2-legend");
  legend.append("div").attr("class", "s2-legend-title").text("기초수급 독거노인 (명)");
  const legendBar = legend.append("div").attr("class", "s2-legend-bar");
  const legendScale = legend.append("div").attr("class", "s2-legend-scale");
  legendScale.append("span").text("적음");
  legendScale.append("span").text(`${maxVal.toLocaleString()}`);

  let projection, path, dims;

  function computeLayout() {
    const vw = root.clientWidth;
    const vh = root.clientHeight;
    dims = { vw, vh };
    svg.attr("viewBox", `0 0 ${vw} ${vh}`).attr("width", vw).attr("height", vh);
    projection = d3
      .geoMercator()
      .fitExtent(
        [
          [vw * 0.08, vh * 0.1],
          [vw * 0.92, vh * 0.9],
        ],
        seoulGu
      );
    path = d3.geoPath(projection);
  }

  function renderMap() {
    computeLayout();

    const regions = gMap.selectAll("path").data(seoulGu.features);
    regions
      .enter()
      .append("path")
      .merge(regions)
      .attr("d", path)
      .attr("class", "s2-gu")
      .attr("fill", (f) => {
        const v = byGu.get(f.properties.name) || 0;
        return color(v);
      });
    regions.exit().remove();

    // 핀 (초기 숨김)
    const pins = gPins.selectAll("g.s2-pin").data(PINS);
    const enter = pins.enter().append("g").attr("class", "s2-pin");
    enter.append("circle").attr("class", "s2-pin-dot").attr("r", 6);
    enter
      .append("text")
      .attr("class", "s2-pin-label")
      .attr("dy", -12)
      .attr("text-anchor", "middle");
    gPins
      .selectAll("g.s2-pin")
      .attr("transform", (d) => {
        const p = projection([d.lon, d.lat]);
        return `translate(${p[0]},${p[1]})`;
      })
      .select(".s2-pin-label")
      .text((d) => d.label);

    // 범례 그라디언트
    const stops = d3.range(0, 1.01, 0.1).map((t) => color(t * maxVal));
    legendBar.style("background", `linear-gradient(90deg, ${stops.join(",")})`);

    highlightSlums(false);
    showPins(false);
  }

  // ---- 상태 전환 ------------------------------------------------------
  function highlightSlums(on) {
    gMap
      .selectAll(".s2-gu")
      .classed("is-dim", (f) => on && !SLUM_GUS.includes(f.properties.name))
      .classed("is-slum", (f) => on && SLUM_GUS.includes(f.properties.name));
  }

  function showPins(on) {
    const sel = gPins.selectAll("g.s2-pin");
    if (window.gsap) {
      gsap.to(sel.nodes(), {
        opacity: on ? 1 : 0,
        duration: 0.5,
        stagger: 0.12,
        ease: "back.out(2)",
      });
    } else {
      sel.style("opacity", on ? 1 : 0);
    }
  }

  // =====================================================================
  const scene = {
    name: "section2",
    mounted: false,

    show() {
      d3.select(root).classed("is-visible", true);
      if (!scene.mounted) {
        renderMap();
        scene.mounted = true;
      }
    },
    hide() {
      d3.select(root).classed("is-visible", false);
    },
    resize() {
      if (!scene.mounted) return;
      renderMap();
    },

    onStepEnter({ step }) {
      switch (step) {
        case "s2-1":
          highlightSlums(false);
          showPins(false);
          break;
        case "s2-2":
          highlightSlums(true);
          showPins(true);
          break;
        default:
          break;
      }
    },

    onStepExit({ step, direction }) {
      if (step === "s2-2" && direction === "up") {
        highlightSlums(false);
        showPins(false);
      }
    },
  };

  return scene;
}
