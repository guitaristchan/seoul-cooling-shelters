// data.js — 모든 전처리 JSON을 한 번에 로드한다.
// build_web_data.py 가 생성한 web/data/*.json 을 사용.

const DATA_DIR = "./data";

/**
 * 모든 데이터셋을 병렬 로드.
 * @returns {Promise<Object>} { heatwave, heatIllness, sheltersAll, sheltersOpen, dongMetrics, finance }
 */
export async function loadAllData() {
  const [
    heatwave,
    heatIllness,
    sheltersAll,
    sheltersOpen,
    dongMetrics,
    finance,
    seoulGu,
  ] = await Promise.all([
    d3.json(`${DATA_DIR}/heatwave.json`),
    d3.json(`${DATA_DIR}/heat_illness.json`),
    d3.json(`${DATA_DIR}/shelters_all.json`),
    d3.json(`${DATA_DIR}/shelters_open.json`),
    d3.json(`${DATA_DIR}/dong_metrics.json`),
    d3.json(`${DATA_DIR}/finance.json`),
    d3.json(`${DATA_DIR}/seoul_municipalities.json`),
  ]);

  // 쉼터에 '개방형(누구나 이용)' 플래그 부여.
  // '회원이용시설'(경로당 등 특정 회원 전용)이 아니면 개방형으로 본다.
  sheltersAll.forEach((d) => {
    d.open = d.type2 !== "회원이용시설";
  });

  // 날짜 파싱 (라인차트용)
  const parseDate = d3.timeParse("%Y-%m-%d");
  heatwave.forEach((d) => {
    d.dateObj = parseDate(d.date);
    d.tmax = +d.tmax;
    d.heat = +d.heat;
  });

  // 온열질환 2025년 전국 일별에 날짜 객체 부여
  Object.values(heatIllness).forEach((bundle) => {
    bundle.daily_national.forEach((d) => {
      d.dateObj = parseDate(d.date);
      d.patients = +d.patients;
    });
  });

  return {
    heatwave,
    heatIllness,
    sheltersAll,
    sheltersOpen,
    dongMetrics,
    finance,
    seoulGu,
  };
}
