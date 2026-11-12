// scroller.js — Scrollama 설정 및 step 트리거 디스패치.
//
// 각 .step 요소의 data-scene / data-step 속성을 읽어
// 등록된 씬(scene)의 onStepEnter / onStepProgress / onStepExit 를 호출한다.

/**
 * @param {Object} opts
 * @param {Object<string, Scene>} opts.scenes  - sceneName -> scene 객체
 * @param {Function} [opts.onActiveSceneChange] - 활성 씬이 바뀔 때 호출(sceneName)
 */
export function initScroller({ scenes, onActiveSceneChange }) {
  const scroller = scrollama();
  let activeScene = null;

  function setActiveScene(name) {
    if (name === activeScene) return;
    const prev = activeScene;
    activeScene = name;
    if (onActiveSceneChange) onActiveSceneChange(name, prev);
  }

  scroller
    .setup({
      step: ".step",
      offset: 0.6,
      progress: true,
    })
    .onStepEnter((response) => {
      const { element, index, direction } = response;
      const sceneName = element.dataset.scene;
      const stepName = element.dataset.step;
      element.classList.add("is-active");

      setActiveScene(sceneName);

      const scene = scenes[sceneName];
      if (scene && typeof scene.onStepEnter === "function") {
        scene.onStepEnter({ step: stepName, index, direction, element });
      }
    })
    .onStepProgress((response) => {
      const { element, progress } = response;
      const sceneName = element.dataset.scene;
      const stepName = element.dataset.step;
      const scene = scenes[sceneName];
      if (scene && typeof scene.onStepProgress === "function") {
        scene.onStepProgress({ step: stepName, progress, element });
      }
    })
    .onStepExit((response) => {
      const { element, index, direction } = response;
      const sceneName = element.dataset.scene;
      const stepName = element.dataset.step;
      element.classList.remove("is-active");
      const scene = scenes[sceneName];
      if (scene && typeof scene.onStepExit === "function") {
        scene.onStepExit({ step: stepName, index, direction, element });
      }
    });

  window.addEventListener("resize", () => scroller.resize());

  return scroller;
}
