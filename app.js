const data = window.TIMETABLE_DATA;
let demoTime = null;
let labOffsetMinutes = 0;

const toMinutes = (hm) => {
  if (!hm) return 0;
  const [h,m] = hm.split(":").map(Number);
  return h * 60 + m;
};
const pad = (n) => String(n).padStart(2, "0");
const nowMinutes = () => {
  if (demoTime !== null) return demoTime + labOffsetMinutes;
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes() + labOffsetMinutes;
};
const datasetKey = () => {
  const d = new Date().getDay();
  return (d === 0 || d === 6) ? "holiday" : "weekday";
};
const nextTrains = (list, count=3) => {
  const current = nowMinutes();
  const future = list.filter(t => toMinutes(t.departure) >= current);
  return (future.length >= count ? future : list).slice(0, count);
};
const typeClass = (t) => {
  if (t.includes("根岸")) return "type-negishi";
  if (t.includes("快速")) return "type-rapid";
  return "type-local";
};
const destinationClass = (t) => ["桜木町","大船","磯子"].includes(t) ? "negishi" : "";
const connectionClass = (txt) => {
  if (txt.includes("なし")) return "none";
  if (txt.includes("後続")) return "next";
  return "good";
};
const mark = (txt) => txt.includes("なし") ? "×" : "○";
const platformClass = (txt) => {
  if (txt.includes("川崎")) return "kawasaki";
  if (txt.includes("横浜")) return "yokohama";
  if (txt.includes("根岸")) return "negishi";
  return "";
};

function inboundRow(t){
  const pClass = platformClass(t.platform);
  return `<div class="row inbound-row">
    <div class="cell"><div class="type-badge ${typeClass(t.type)}"><span>${t.type}</span></div></div>
    <div class="cell time">${t.departure}</div>
    <div class="cell destination ${destinationClass(t.destination)}">${t.destination}</div>
    <div class="cell connection ${connectionClass(t.rapidConnection)}">
      <span class="mark">${mark(t.rapidConnection)}</span><span>${t.rapidConnection}</span>
    </div>
    <div class="cell"><div class="platform-box">
      <span class="platform ${pClass}">${t.platform}</span>
    </div></div>
    <div class="cell arrival"><span>${t.arrival}</span></div>
  </div>`;
}
function outboundRow(t){
  const cClass = connectionClass(t.hashimotoConnection);
  const detail = t.hashimotoConnection.includes("なし")
    ? `<span>接続なし</span>`
    : `<span>${t.hashimotoConnection}</span>`;
  return `<div class="row outbound-row">
    <div class="cell"><div class="type-badge ${typeClass(t.type)}"><span>${t.type}</span></div></div>
    <div class="cell time">${t.departure}</div>
    <div class="cell destination">${t.destination}</div>
    <div class="cell connection ${cClass}"><div class="outbound-detail"><span class="mark">${mark(t.hashimotoConnection)}</span>${detail}</div></div>
    <div class="cell arrival"><span>${t.arrival}</span></div>
  </div>`;
}
function render(){
  const key = datasetKey();
  document.getElementById("inboundRows").innerHTML = nextTrains(data[key].inbound).map(inboundRow).join("");
  document.getElementById("outboundRows").innerHTML = nextTrains(data[key].outbound).map(outboundRow).join("");
  const d = new Date();
  const displayMinutes = demoTime !== null
    ? demoTime + labOffsetMinutes
    : d.getHours() * 60 + d.getMinutes() + labOffsetMinutes;
  const normalizedDisplayMinutes = ((displayMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const text = `${Math.floor(normalizedDisplayMinutes / 60)}:${pad(normalizedDisplayMinutes % 60)}`;
  document.getElementById("clock").textContent = text;
}
document.getElementById("demo930").addEventListener("click", () => { demoTime = 9*60+30; render(); });
document.getElementById("nowBtn").addEventListener("click", () => { demoTime = null; labOffsetMinutes = 0; render(); });
document.getElementById("labModeBtn").addEventListener("click", () => { demoTime = null; labOffsetMinutes = 10; render(); });
render();
setInterval(render, 10000);
