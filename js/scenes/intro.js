// scenes/intro.js — Intro 라인차트 씬
//
// 스텝 구성(index.html 의 data-step 과 1:1):
//   intro-1  : "왜 쉼터가 필요할까" — 폭염일수(최고기온) 라인만 그린다.
//   intro-2  : 온열질환자 수 라인을 겹쳐서 등장시킨다.
//   intro-3  : 폭염 구간(28일)을 강조 밴드로 표시.
//   intro-4  : 서울 자치구별 온열질환 분포(간이 막대)로 시선 이동 — 고령/도심 강조 준비.
//
// D3 로 축/라인을 그리고 GSAP 로 라인 draw/페이드 전환을 제어한다.

export function createIntroScene(root, data) {
  const { heatwave, heatIllness } = data;
  const seoul2025 = heatIllness["2025"];
  const national = seoul2025.daily_national; // 전국 일별 온열질환자

  // ---- SVG scaffold ---------------------------------------------------
  const svg = d3
    .select(root)
    .append("svg")
    .attr("class", "intro-svg")
    .attr("preserveAspectRatio", "xMidYMid meet");

  const gRoot = svg.append("g").attr("class", "intro-root");
  const gAxisX = gRoot.append("g").attr("class", "axis axis-x");
  const gAxisYTemp = gRoot.append("g").attr("class", "axis axis-y-temp");
  const gAxisYPat = gRoot.append("g").attr("class", "axis axis-y-pat");
  const gHeatBands = gRoot.append("g").attr("class", "heat-bands");
  const gTempLine = gRoot.append("g").attr("class", "temp-line-group");
  const gPatLine = gRoot.append("g").attr("class", "pat-line-group");
  const gLabels = gRoot.append("g").attr("class", "intro-labels");

  const tempPath = gTempLine
    .append("path")
    .attr("class", "line line-temp")
    .attr("fill", "none");
  const patPath = gPatLine
    .append("path")
    .attr("class", "line line-pat")
    .attr("fill", "none")
    .style("opacity", 0);

  // 축/라인 스케일 (resize 시 갱신)
  let x, yTemp, yPat, lineTemp, linePat, dims;

  // ---- 온열질환 데이터를 폭염 기간 날짜축에 맞춤 -----------------------
  // national 은 전국 수치이지만 추이(모양) 강조용으로 사용.
  const patByDate = new Map(national.map((d) => [d.date, d.patients]));
  const merged = heatwave.map((d) => ({
    date: d.date,
    dateObj: d.dateObj,
    tmax: d.tmax,
    heat: d.heat,
    patients: patByDate.get(d.date) ?? 0,
  }));

  function computeScales() {
    const w = root.clientWidth;
    const h = root.clientHeight;
    const margin = { top: 70, right: 70, bottom: 50, left: 60 };
    const iw = Math.max(10, w - margin.left - margin.right);
    const ih = Math.max(10, h - margin.top - margin.bottom);
    dims = { w, h, margin, iw, ih };

    svg.attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);
    gRoot.attr("transform", `translate(${margin.left},${margin.top})`);

    x = d3
      .scaleTime()
      .domain(d3.extent(merged, (d) => d.dateObj))
      .range([0, iw]);
    yTemp = d3
      .scaleLinear()
      .domain([0, d3.max(merged, (d) => d.tmax) * 1.1])
      .range([ih, 0]);
    yPat = d3
      .scaleLinear()
      .domain([0, (d3.max(merged, (d) => d.patients) || 1) * 1.2])
      .range([ih, 0]);

    lineTemp = d3
      .line()
      .x((d) => x(d.dateObj))
      .y((d) => yTemp(d.tmax))
      .curve(d3.curveMonotoneX);
    linePat = d3
      .line()
      .x((d) => x(d.dateObj))
      .y((d) => yPat(d.patients))
      .curve(d3.curveMonotoneX);
  }

  function drawAxes() {
    const { ih, iw } = dims;
    gAxisX
      .attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%m월")));
    gAxisYTemp.call(d3.axisLeft(yTemp).ticks(5).tickFormat((d) => `${d}°`));
    gAxisYPat
      .attr("transform", `translate(${iw},0)`)
      .call(d3.axisRight(yPat).ticks(5).tickFormat((d) => `${d}명`))
      .style("opacity", 0); // 2스텝에서 등장
  }

  function renderStatic() {
    computeScales();
    drawAxes();
    tempPath.datum(merged).attr("d", lineTemp);
    patPath.datum(merged).attr("d", linePat);
    drawHeatBands();
  }

  // ---- 폭염 구간 밴드 --------------------------------------------------
  function drawHeatBands() {
    const bands = [];
    let startIdx = null;
    merged.forEach((d, i) => {
      if (d.heat && startIdx === null) startIdx = i;
      if (!d.heat && startIdx !== null) {
        bands.push([startIdx, i - 1]);
        startIdx = null;
      }
    });
    if (startIdx !== null) bands.push([startIdx, merged.length - 1]);

    const rects = gHeatBands.selectAll("rect").data(bands);
    rects
      .enter()
      .append("rect")
      .merge(rects)
      .attr("x", (b) => x(merged[b[0]].dateObj))
      .attr("width", (b) =>
        Math.max(2, x(merged[b[1]].dateObj) - x(merged[b[0]].dateObj))
      )
      .attr("y", 0)
      .attr("height", dims.ih)
      .attr("class", "heat-band")
      .style("opacity", 0);
    rects.exit().remove();
  }

  // ---- 라인 draw 애니메이션(GSAP) -------------------------------------
  function animateLineDraw(path) {
    const node = path.node();
    if (!node) return;
    const len = node.getTotalLength();
    gsap.killTweensOf(node);
    gsap.set(node, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
    gsap.to(node, {
      strokeDashoffset: 0,
      duration: 1.6,
      ease: "power2.inOut",
    });
  }

  // =====================================================================
  // 씬 인터페이스
  // =====================================================================
  const scene = {
    name: "intro",
    mounted: false,

    show() {
      d3.select(root).classed("is-visible", true);
      if (!scene.mounted) {
        renderStatic();
        scene.mounted = true;
      }
    },

    hide() {
      d3.select(root).classed("is-visible", false);
    },

    resize() {
      if (!scene.mounted) return;
      renderStatic();
    },

    onStepEnter({ step }) {
      switch (step) {
        case "intro-1":
          // 기온 라인만 그린다
          patPath.style("opacity", 0);
          gAxisYPat.transition().duration(400).style("opacity", 0);
          gHeatBands.selectAll("rect").transition().duration(400).style("opacity", 0);
          animateLineDraw(tempPath);
          break;

        case "intro-2":
          // 온열질환자 라인 등장
          gAxisYPat.transition().duration(600).style("opacity", 1);
          animateLineDraw(patPath);
          break;

        case "intro-3":
          // 폭염 밴드 강조
          gHeatBands
            .selectAll("rect")
            .transition()
            .duration(700)
            .style("opacity", 0.18);
          break;

        case "intro-4":
          // 다음(지도) 전환 준비 — 라인을 살짝 뒤로 보냄
          gsap.to(gRoot.node(), { opacity: 0.35, duration: 0.6 });
          break;
        default:
          break;
      }
    },

    onStepExit({ step, direction }) {
      // 위로 스크롤하여 intro-4 를 빠져나갈 때 라인 복원
      if (step === "intro-4" && direction === "up") {
        gsap.to(gRoot.node(), { opacity: 1, duration: 0.6 });
      }
    },
  };

  return scene;
}
