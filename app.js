const data = window.TIMETABLE_DATA;
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
const datasetKey = () => {
  const d = new Date().getDay();
  return (d === 0 || d === 6) ? "holiday" : "weekday";
};
const nextTrains = (list, count=3) => {
  const current = nowMinutes();

  const sorted = list
    .map(t => ({
      ...t,
      _t: normalizeRailwayDay(toMinutes(t.departure))
    }))
    .sort((a, b) => a._t - b._t);

  const future = sorted.filter(t => t._t >= current);

  if (future.length >= count) return future.slice(0, count);

  // wrap around (after midnight)
  const remain = count - future.length;
  return [...future, ...sorted.slice(0, remain)];
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
  document.getElementById("inboundRows").innerHTML = nextTrains(data[key].inbound).map(inboundRow).join("");
  document.getElementById("outboundRows").innerHTML = nextTrains(data[key].outbound).map(outboundRow).join("");
  const d = new Date();
  const displayMinutes = demoTime !== null
    ? demoTime
    : d.getHours() * 60 + d.getMinutes();
  const normalizedDisplayMinutes = ((displayMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const text = `${Math.floor(normalizedDisplayMinutes / 60)}:${pad(normalizedDisplayMinutes % 60)}`;
  document.getElementById("clock").textContent = text;
}
document.getElementById("demo930").addEventListener("click", () => { demoTime = 9*60+30; render(); });
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
setInterval(render, 10000);
setInterval(() => {
  blinkMode = !blinkMode;
  render();
}, 2000);
