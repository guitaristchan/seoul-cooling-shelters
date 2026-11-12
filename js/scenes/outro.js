// scenes/outro.js — "위치의 불일치" (재정자립도 × 실질쉼터 산점도)
//   X축: 자치구 재정자립도(finance, 2025)
//   Y축: 저소득 독거노인(기초수급) 1천명당 실질 쉼터 수
//   o-1: 산점도 등장 / o-2: 추세선 + 불일치 강조

export function createOutroScene(root, data) {
  const { finance, dongMetrics } = data;

  // 자치구별 실질쉼터 합 / 기초수급 합 → 1천명당 실질쉼터 수
  const agg = d3.rollup(
    dongMetrics,
    (rows) => ({
      real: d3.sum(rows, (r) => +r["실질쉼터개수"] || 0),
      poor: d3.sum(rows, (r) => +r["기초수급"] || 0),
    }),
    (r) => r["자치구"]
  );

  const points = [];
  agg.forEach((v, gu) => {
    const fin = finance[gu];
    if (fin == null || v.poor <= 0) return;
    points.push({ gu, x: +fin, y: (v.real / v.poor) * 1000 });
  });

  const wrap = d3.select(root).append("div").attr("class", "o-wrap");
  const svg = wrap.append("svg").attr("class", "o-svg");
  const g = svg.append("g");
  const gx = g.append("g").attr("class", "o-axis");
  const gy = g.append("g").attr("class", "o-axis");
  const gxLabel = g.append("text").attr("class", "o-axis-label");
  const gyLabel = g.append("text").attr("class", "o-axis-label");
  const gTrend = g.append("line").attr("class", "o-trend").style("opacity", 0);
  const gDots = g.append("g");
  const gLabels = g.append("g");

  let x, y, dims;

  function layout() {
    const vw = root.clientWidth, vh = root.clientHeight;
    const m = { top: 70, right: 50, bottom: 70, left: 70 };
    const iw = vw - m.left - m.right, ih = vh - m.top - m.bottom;
    dims = { vw, vh, m, iw, ih };
    svg.attr("viewBox", `0 0 ${vw} ${vh}`).attr("width", vw).attr("height", vh);
    g.attr("transform", `translate(${m.left},${m.top})`);

    x = d3.scaleLinear().domain([0, d3.max(points, (d) => d.x) * 1.1]).range([0, iw]);
    y = d3.scaleLinear().domain([0, d3.max(points, (d) => d.y) * 1.15]).range([ih, 0]);

    gx.attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(6).tickFormat((d) => `${d}%`));
    gy.call(d3.axisLeft(y).ticks(6));
    gxLabel.attr("x", iw / 2).attr("y", ih + 48).attr("text-anchor", "middle").text("자치구 재정자립도 (%)");
    gyLabel.attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -50).attr("text-anchor", "middle").text("저소득 독거노인 1천명당 실질 쉼터 수");
  }

  function render() {
    layout();

    const dots = gDots.selectAll("circle").data(points, (d) => d.gu);
    dots.enter().append("circle")
      .attr("class", "o-dot").attr("r", 7)
      .merge(dots)
      .attr("cx", (d) => x(d.x)).attr("cy", (d) => y(d.y));
    dots.exit().remove();

    const labels = gLabels.selectAll("text").data(points, (d) => d.gu);
    labels.enter().append("text")
      .attr("class", "o-label").attr("dy", -11).attr("text-anchor", "middle")
      .text((d) => d.gu)
      .merge(labels)
      .attr("x", (d) => x(d.x)).attr("y", (d) => y(d.y));
    labels.exit().remove();

    // 최소제곱 추세선
    const n = points.length;
    const sx = d3.sum(points, (d) => d.x), sy = d3.sum(points, (d) => d.y);
    const sxx = d3.sum(points, (d) => d.x * d.x), sxy = d3.sum(points, (d) => d.x * d.y);
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const intercept = (sy - slope * sx) / n;
    const x0 = x.domain()[0], x1 = x.domain()[1];
    gTrend
      .attr("x1", x(x0)).attr("y1", y(intercept + slope * x0))
      .attr("x2", x(x1)).attr("y2", y(intercept + slope * x1));
  }

  const scene = {
    name: "outro",
    mounted: false,
    show() {
      d3.select(root).classed("is-visible", true);
      if (!scene.mounted) { render(); scene.mounted = true; }
    },
    hide() { d3.select(root).classed("is-visible", false); },
    resize() { if (scene.mounted) render(); },
    onStepEnter({ step }) {
      if (step === "o-2") gTrend.transition().duration(700).style("opacity", 1);
      else gTrend.transition().duration(400).style("opacity", 0);
    },
  };
  return scene;
}
