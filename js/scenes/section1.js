// scenes/section1.js — "쉼터는 어디에 있나?" (고정 지도 + scrollama 스텝)
//
// 가로 패닝/기차 연출 없이, 화면에 고정된 서울 지도 위에서 스텝에 따라:
//   s1-1 : 전체 쉼터(4,092) 점을 모두 표시
//   s1-2 : 회원 전용(회원이용시설) 점을 페이드아웃 → 실질 쉼터(1,254)만 남김
//
// 지도는 쉼터 위경도 + 서울 자치구 경계(GeoJSON)로 d3 projection 렌더.

export function createSection1Scene(root, data) {
  const { sheltersAll, seoulGu } = data;

  // ---- DOM 구성 -------------------------------------------------------
  const wrap = d3.select(root).append("div").attr("class", "s1-mapwrap");
  const svg = wrap.append("svg").attr("class", "s1-svg");
  const gMap = svg.append("g").attr("class", "s1-geo");
  const gShelters = svg.append("g").attr("class", "s1-shelters");

  // 남은 쉼터 카운터 (지도 위 고정 배지)
  const badge = wrap.append("div").attr("class", "s1-badge");
  badge.append("span").attr("class", "s1-badge-label").text("표시된 쉼터");
  const badgeCount = badge.append("span").attr("class", "s1-badge-count");

  let projection, path, dims;
  let openOnly = false; // 현재 '실질 쉼터만' 상태인지

  // ---- 스케일/지도 렌더 ----------------------------------------------
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

    // 자치구 경계
    const regions = gMap.selectAll("path").data(seoulGu.features);
    regions
      .enter()
      .append("path")
      .merge(regions)
      .attr("d", path)
      .attr("class", "s1-gu");
    regions.exit().remove();

    // 쉼터 점
    sheltersAll.forEach((d) => {
      const p = projection([d.lon, d.lat]);
      d._x = p[0];
      d._y = p[1];
    });

    const dots = gShelters.selectAll("circle").data(sheltersAll);
    dots
      .enter()
      .append("circle")
      .merge(dots)
      .attr("cx", (d) => d._x)
      .attr("cy", (d) => d._y)
      .attr("r", (d) => (d.open ? 2.4 : 1.8))
      .attr("class", (d) => (d.open ? "s1-dot s1-dot-open" : "s1-dot s1-dot-member"));
    dots.exit().remove();

    applyState(false, true); // 초기 상태 반영(즉시)
  }

  // ---- 상태 적용: 전체 표시 vs 실질 쉼터만 -----------------------------
  function applyState(onlyOpen, immediate = false) {
    openOnly = onlyOpen;
    const members = gShelters.selectAll(".s1-dot-member");

    if (window.gsap && !immediate) {
      gsap.to(members.nodes(), {
        opacity: onlyOpen ? 0 : 0.6,
        attr: { r: onlyOpen ? 0 : 1.8 },
        duration: 0.8,
        ease: "power2.out",
        stagger: { each: 0.0004, from: "random" },
      });
    } else {
      members
        .style("opacity", onlyOpen ? 0 : 0.6)
        .attr("r", onlyOpen ? 0 : 1.8);
    }

    const remaining = onlyOpen
      ? sheltersAll.filter((d) => d.open).length
      : sheltersAll.length;
    animateCount(remaining);
  }

  // 카운터 숫자 트윈
  let countState = { v: sheltersAll.length };
  function animateCount(target) {
    if (window.gsap) {
      gsap.to(countState, {
        v: target,
        duration: 0.8,
        ease: "power1.out",
        onUpdate: () => {
          badgeCount.text(Math.round(countState.v).toLocaleString());
        },
      });
    } else {
      badgeCount.text(target.toLocaleString());
    }
  }

  // =====================================================================
  // 씬 인터페이스
  // =====================================================================
  const scene = {
    name: "section1",
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
      applyState(openOnly, true);
    },

    onStepEnter({ step }) {
      switch (step) {
        case "s1-1":
          applyState(false);
          break;
        case "s1-2":
          applyState(true);
          break;
        default:
          break;
      }
    },

    onStepExit({ step, direction }) {
      // s1-2 를 위로 벗어나면 전체 복원
      if (step === "s1-2" && direction === "up") applyState(false);
    },
  };

  return scene;
}
