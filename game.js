const state = {
  dust: 0,
  collectors: 0,
  gloveLevel: 0,
  lastSeen: Date.now()
};

const els = {
  dustCount: document.querySelector("#dustCount"),
  dustRate: document.querySelector("#dustRate"),
  tapPower: document.querySelector("#tapPower"),
  tapButton: document.querySelector("#tapButton"),
  collectorButton: document.querySelector("#collectorButton"),
  collectorCost: document.querySelector("#collectorCost"),
  collectorOwned: document.querySelector("#collectorOwned"),
  gloveButton: document.querySelector("#gloveButton"),
  gloveCost: document.querySelector("#gloveCost"),
  gloveLevel: document.querySelector("#gloveLevel"),
  offlineGain: document.querySelector("#offlineGain"),
  saveButton: document.querySelector("#saveButton"),
  resetButton: document.querySelector("#resetButton")
};

const storageKey = "stardust-idle-save-v1";
let lastTick = performance.now();

function collectorCost() {
  return Math.floor(15 * Math.pow(1.22, state.collectors));
}

function gloveCost() {
  return Math.floor(50 * Math.pow(1.65, state.gloveLevel));
}

function tapPower() {
  return 1 + state.gloveLevel;
}

function dustPerSecond() {
  return state.collectors * 0.4;
}

function format(value) {
  if (value < 1000) return Math.floor(value).toString();
  if (value < 1000000) return `${(value / 1000).toFixed(1)}K`;
  return `${(value / 1000000).toFixed(2)}M`;
}

function save() {
  state.lastSeen = Date.now();
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
    const secondsAway = Math.max(0, (Date.now() - (saved.lastSeen || Date.now())) / 1000);
    const gain = Math.min(secondsAway, 60 * 60 * 6) * dustPerSecond();
    state.dust += gain;
    els.offlineGain.textContent = `+${format(gain)} 星尘`;
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function render() {
  const nextCollectorCost = collectorCost();
  const nextGloveCost = gloveCost();

  els.dustCount.textContent = format(state.dust);
  els.dustRate.textContent = `+${dustPerSecond().toFixed(1)} / 秒`;
  els.tapPower.textContent = `+${tapPower()} 星尘`;
  els.collectorCost.textContent = `购买 ${format(nextCollectorCost)}`;
  els.collectorOwned.textContent = `${state.collectors} 台`;
  els.gloveCost.textContent = `升级 ${format(nextGloveCost)}`;
  els.gloveLevel.textContent = `等级 ${state.gloveLevel}`;
  els.collectorButton.disabled = state.dust < nextCollectorCost;
  els.gloveButton.disabled = state.dust < nextGloveCost;
}

function spend(cost) {
  if (state.dust < cost) return false;
  state.dust -= cost;
  return true;
}

els.tapButton.addEventListener("click", () => {
  state.dust += tapPower();
  render();
});

els.collectorButton.addEventListener("click", () => {
  if (!spend(collectorCost())) return;
  state.collectors += 1;
  render();
  save();
});

els.gloveButton.addEventListener("click", () => {
  if (!spend(gloveCost())) return;
  state.gloveLevel += 1;
  render();
  save();
});

els.saveButton.addEventListener("click", () => {
  save();
  els.saveButton.animate(
    [{ transform: "scale(1)" }, { transform: "scale(0.92)" }, { transform: "scale(1)" }],
    { duration: 180 }
  );
});

els.resetButton.addEventListener("click", () => {
  if (!confirm("确定重置当前存档？")) return;
  localStorage.removeItem(storageKey);
  state.dust = 0;
  state.collectors = 0;
  state.gloveLevel = 0;
  state.lastSeen = Date.now();
  els.offlineGain.textContent = "0";
  render();
});

function tick(now) {
  const delta = (now - lastTick) / 1000;
  lastTick = now;
  state.dust += dustPerSecond() * delta;
  render();
  requestAnimationFrame(tick);
}

setInterval(save, 10000);
window.addEventListener("beforeunload", save);

load();
render();
requestAnimationFrame(tick);

async function enableDevReload() {
  const files = ["index.html", "styles.css", "game.js"];
  const snapshot = new Map();

  async function read(file) {
    const response = await fetch(`${file}?v=${Date.now()}`, { cache: "no-store" });
    return response.ok ? response.text() : "";
  }

  for (const file of files) {
    snapshot.set(file, await read(file));
  }

  setInterval(async () => {
    for (const file of files) {
      const latest = await read(file);
      if (snapshot.get(file) !== latest) {
        location.reload();
        return;
      }
    }
  }, 1200);
}

if (location.hostname === "localhost" || /^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(location.hostname)) {
  enableDevReload();
}
