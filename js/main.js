// main.js — 엔트리 포인트
// 1) 데이터 로드
// 2) 각 씬(그래픽 레이어) 생성
// 3) Scrollama 와 연결, 활성 씬 전환 관리

import { loadAllData } from "./data.js";
import { initScroller } from "./scroller.js";
import { createIntroScene } from "./scenes/intro.js";
import { createSection1Scene } from "./scenes/section1.js";
import { createSection2Scene } from "./scenes/section2.js";
import { createOutroScene } from "./scenes/outro.js";

async function boot() {
  const loader = document.getElementById("loader");

  let data;
  try {
    data = await loadAllData();
  } catch (err) {
    console.error(err);
    loader.innerHTML =
      "데이터 로드 실패. <br/>로컬 서버(예: <code>python -m http.server</code>)로 열어주세요.";
    return;
  }

  // 각 씬은 전용 그래픽 레이어(div.graphic-layer)에 렌더링된다.
  const scenes = {
    intro: createIntroScene(document.getElementById("layer-intro"), data),
    section1: createSection1Scene(document.getElementById("layer-section1"), data),
    section2: createSection2Scene(document.getElementById("layer-section2"), data),
    outro: createOutroScene(document.getElementById("layer-outro"), data),
  };

  // 활성 씬만 보이게 토글
  function activateScene(name) {
    Object.entries(scenes).forEach(([key, scene]) => {
      if (key === name) {
        if (typeof scene.show === "function") scene.show();
      } else if (typeof scene.hide === "function") {
        scene.hide();
      }
    });
  }

  initScroller({
    scenes,
    onActiveSceneChange: (name) => activateScene(name),
  });

  // 초기 활성 씬
  activateScene("intro");

  // 리사이즈 시 현재 보이는 씬 다시 그림
  window.addEventListener("resize", () => {
    Object.values(scenes).forEach((s) => {
      if (typeof s.resize === "function") s.resize();
    });
  });

  // 로더 제거
  loader.classList.add("hidden");
  document.body.classList.add("ready");
}

boot();
