const data = window.TIMETABLE_DATA;
const TRAIN_SIDE_IMAGE = "画像 2.PNG";
const TRAIN_APPROACH_SECONDS = 10;
const TRAIN_STOP_SECONDS = 60;
const TRAIN_DEPARTURE_SECONDS = 10;
let demoTime = null;
let labOffsetMinutes = 0;
let blinkMode = false;

const toMinutes = (hm) => {
  if (!hm) return 0;
  const [h,m] = hm.split(":").map(Number);
  return h * 60 + m;
};
const pad = (n) => String(n).padStart(2, "0");
const normalizeRailwayDay = (min) => {
  // shift so that 4:00 = 0
  const shifted = min - 240;
  return (shifted + 1440) % 1440;
};

const normalizeRailwayDaySeconds = (sec) => {
  const shifted = sec - 240 * 60;
  return (shifted + 86400) % 86400;
};

const nowMinutes = () => {
  let base;
  if (demoTime !== null) {
    base = demoTime;
  } else {
    const d = new Date();
    base = d.getHours() * 60 + d.getMinutes();
  }
  return normalizeRailwayDay(base + labOffsetMinutes);
};

const nowSeconds = () => {
  let base;
  if (demoTime !== null) {
    base = demoTime * 60;
  } else {
    const d = new Date();
    base = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  }
  return normalizeRailwayDaySeconds(base + labOffsetMinutes * 60);
};

const trainTimeSeconds = (t) => trainTimeMinutes(t) * 60;

const minutesUntilTrain = (t) => {
  const current = nowMinutes();
  const train = normalizeRailwayDay(trainTimeMinutes(t));
  return (train - current + 1440) % 1440;
};

const trainVisualStyle = () => "";

const signedSecondsUntilTrain = (t) => {
  const current = nowSeconds();
  const train = normalizeRailwayDaySeconds(trainTimeSeconds(t));
  let diff = train - current;
  if (diff > 43200) diff -= 86400;
  if (diff < -43200) diff += 86400;
  return diff;
};

const activeHeaderTrainState = (list) => {
  const active = list
    .map(t => ({ train: t, diff: signedSecondsUntilTrain(t) }))
    .filter(item => item.diff >= -TRAIN_STOP_SECONDS - TRAIN_DEPARTURE_SECONDS && item.diff <= TRAIN_APPROACH_SECONDS)
    .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))[0];

  if (!active) return { opacity: 0, x: -140 };

  const diff = active.diff;
  if (diff > 0) {
    const progress = 1 - diff / TRAIN_APPROACH_SECONDS;
    return { opacity: 1, x: -140 + progress * 140 };
  }

  if (diff >= -TRAIN_STOP_SECONDS) {
    return { opacity: 1, x: 0 };
  }

  const exitProgress = Math.min(1, Math.max(0, (-diff - TRAIN_STOP_SECONDS) / TRAIN_DEPARTURE_SECONDS));
  return { opacity: 1 - exitProgress * 0.15, x: exitProgress * 140 };
};

const updateHeaderTrain = (id, list, direction) => {
  const el = document.getElementById(id);
  if (!el) return;

  const state = activeHeaderTrainState(list);
  const x = direction === "outbound" ? -state.x : state.x;
  el.style.setProperty("--header-train-x", `${x}%`);
  el.style.opacity = state.opacity;
};

const HOLIDAYS_2026 = new Set([
  "2026-01-01", // 元日
  "2026-01-12", // 成人の日
  "2026-02-11", // 建国記念の日
  "2026-02-23", // 天皇誕生日
  "2026-03-20", // 春分の日
  "2026-04-29", // 昭和の日
  "2026-05-03", // 憲法記念日
  "2026-05-04", // みどりの日
  "2026-05-05", // こどもの日
  "2026-05-06", // 休日
  "2026-07-20", // 海の日
  "2026-08-11", // 山の日
  "2026-09-21", // 敬老の日
  "2026-09-22", // 休日
  "2026-09-23", // 秋分の日
  "2026-10-12", // スポーツの日
  "2026-11-03", // 文化の日
  "2026-11-23"  // 勤労感謝の日
]);

const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const datasetKey = () => {
  const d = new Date();
  const day = d.getDay();
  const dateKey = formatDateKey(d);
  return (day === 0 || day === 6 || HOLIDAYS_2026.has(dateKey)) ? "holiday" : "weekday";
};

const trainTimeMinutes = (t) => toMinutes(t.departure || t.arrival);

const nextTrains = (list, count=3) => {
  const current = nowMinutes();

  const sorted = list
    .map(t => ({
      ...t,
      _t: normalizeRailwayDay(trainTimeMinutes(t))
    }))
    .sort((a, b) => a._t - b._t);

  const future = sorted.filter(t => t._t >= current);

  if (future.length >= count) return future.slice(0, count);

  // その日の残り列車が3本未満の場合でも、翌日の始発は混ぜない
  // 例: 23:37時点で残りが 23:58 / 0:19 の2本だけなら、3本目は表示しない
  if (future.length > 0) return future;

  // 最終列車後〜4:00前は空表示にする
  return [];
};
const isNegishiThrough = (t) => ["桜木町","大船","磯子"].includes(t.destination);

const typeClass = (t) => {
  if (isNegishiThrough(t) && blinkMode) return "type-negishi";
  if (t.type.includes("快速")) return "type-rapid";
  return "type-local";
};

const typeLabel = (t) => {
  if (isNegishiThrough(t)) {
    if (blinkMode) return "根岸線";
    return t.type; // 各停 or 快速
  }
  return t.type;
};
const destinationClass = (t) => ["桜木町","大船","磯子"].includes(t) ? "negishi" : "";
const connectionClass = (txt) => {
  if (txt.includes("なし")) return "none";
  if (txt.includes("後続")) return "next";
  return "good";
};
const mark = (txt) => txt.includes("なし") ? "×" : "○";
const rapidConnectionLabel = (txt) => {
  if (txt.includes("なし")) return "";
  const station = txt.replace("で接続", "");
  return `<span class="connection-station">${station}</span>`;
};
const displayArrival = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return value;
};
const platformClass = (txt) => {
  if (txt.includes("川崎")) return "kawasaki";
  if (txt.includes("横浜")) return "yokohama";
  if (txt.includes("根岸")) return "negishi";
  return "";
};

function inboundRow(t){
  const pClass = platformClass(t.platform);
  return `<div class="row inbound-row">
    <div class="cell"><div class="type-badge ${typeClass(t)}"><span>${typeLabel(t)}</span></div></div>
    <div class="cell time">${t.departure}</div>
    <div class="cell destination ${destinationClass(t.destination)}">${t.destination}</div>
    <div class="cell connection rapid-connection ${connectionClass(t.rapidConnection)}">
      ${t.rapidConnection.includes("なし")
        ? `<span class="mark">×</span>`
        : rapidConnectionLabel(t.rapidConnection)}
    </div>
    <div class="cell"><div class="platform-box">
      <span class="platform ${pClass}">${t.platform}</span>
    </div></div>
    <div class="cell arrival"><span>${displayArrival(t.arrival)}</span></div>
  </div>`;
}
function outboundRow(t){
  const cClass = connectionClass(t.hashimotoConnection);
  const detail = t.hashimotoConnection.includes("なし")
    ? `<span>接続なし</span>`
    : `<span>${t.hashimotoConnection}</span>`;
  return `<div class="row outbound-row">
    <div class="cell"><div class="type-badge ${typeClass(t)}"><span>${typeLabel(t)}</span></div></div>
    <div class="cell time">${t.departure}</div>
    <div class="cell destination">${t.destination}</div>
    <div class="cell connection ${cClass}"><div class="outbound-detail"><span class="mark">${mark(t.hashimotoConnection)}</span>${detail}</div></div>
    <div class="cell arrival"><span>${displayArrival(t.arrival)}</span></div>
  </div>`;
}
function render(){
  const key = datasetKey();
  const inboundList = data[key].inbound;
  const outboundList = data[key].outbound;
  document.getElementById("inboundRows").innerHTML = nextTrains(inboundList).map(inboundRow).join("");
  document.getElementById("outboundRows").innerHTML = nextTrains(outboundList).map(outboundRow).join("");
  updateHeaderTrain("inboundHeaderTrain", inboundList, "inbound");
  updateHeaderTrain("outboundHeaderTrain", outboundList, "outbound");
  const d = new Date();
  const displayMinutes = demoTime !== null
    ? demoTime
    : d.getHours() * 60 + d.getMinutes();
  const normalizedDisplayMinutes = ((displayMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const text = `${Math.floor(normalizedDisplayMinutes / 60)}:${pad(normalizedDisplayMinutes % 60)}`;
  document.getElementById("clock").textContent = text;
}
document.getElementById("demo930").addEventListener("click", () => { demoTime = 9*60+30; render(); });
const applyDebugTime = () => {
  const input = document.getElementById("debugTimeInput");
  if (!input || !input.value) return;
  const [h, m] = input.value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return;
  demoTime = h * 60 + m;
  render();
};
document.getElementById("debugTimeBtn").addEventListener("click", applyDebugTime);
document.getElementById("debugTimeInput").addEventListener("change", applyDebugTime);
document.getElementById("nowBtn").addEventListener("click", () => { demoTime = null; labOffsetMinutes = 0; render(); });

const updateLabOffsetLabel = () => {
  const input = document.getElementById("labOffsetInput");
  const label = document.getElementById("labOffsetValue");
  if (!input || !label) return 10;

  const value = Number(input.value);
  const minutes = Number.isFinite(value) ? Math.max(0, Math.min(30, Math.round(value))) : 10;
  input.value = minutes;
  label.textContent = `${minutes}分先`;
  return minutes;
};

const applyLabMode = () => {
  demoTime = null;
  labOffsetMinutes = updateLabOffsetLabel();
  render();
};

document.getElementById("labModeBtn").addEventListener("click", applyLabMode);
document.getElementById("labOffsetInput").addEventListener("input", updateLabOffsetLabel);
document.getElementById("labOffsetInput").addEventListener("change", applyLabMode);
updateLabOffsetLabel();
render();
setInterval(render, 1000);
setInterval(() => {
  blinkMode = !blinkMode;
  render();
}, 2000);
