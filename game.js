const state = {
  mana: 0,
  researchPoints: 0,
  apprentices: 0,
  wandLevel: 0,
  lastSeen: Date.now()
};

const els = {
  manaCount: document.querySelector("#manaCount"),
  manaRate: document.querySelector("#manaRate"),
  researchCount: document.querySelector("#researchCount"),
  rankTitle: document.querySelector("#rankTitle"),
  tapPower: document.querySelector("#tapPower"),
  tapButton: document.querySelector("#tapButton"),
  studyButton: document.querySelector("#studyButton"),
  studyCost: document.querySelector("#studyCost"),
  studyReward: document.querySelector("#studyReward"),
  apprenticeButton: document.querySelector("#apprenticeButton"),
  apprenticeCost: document.querySelector("#apprenticeCost"),
  apprenticeOwned: document.querySelector("#apprenticeOwned"),
  wandButton: document.querySelector("#wandButton"),
  wandCost: document.querySelector("#wandCost"),
  wandLevel: document.querySelector("#wandLevel"),
  offlineGain: document.querySelector("#offlineGain"),
  saveButton: document.querySelector("#saveButton"),
  resetButton: document.querySelector("#resetButton")
};

const storageKey = "moonlit-academy-save-v1";
let lastTick = performance.now();

function apprenticeCost() {
  return Math.floor(15 * Math.pow(1.22, state.apprentices));
}

function wandCost() {
  return Math.floor(50 * Math.pow(1.65, state.wandLevel));
}

function practicePower() {
  return 1 + state.wandLevel;
}

function manaPerSecond() {
  return state.apprentices * 0.4;
}

function studyMagicBookCost() {
  return 100;
}

function studyMagicBookReward() {
  return 1;
}

function rankTitle() {
  if (state.mana >= 10000) return "大魔导师";
  if (state.mana >= 2000) return "高级法师";
  if (state.mana >= 500) return "正式法师";
  if (state.mana >= 100) return "见习法师";
  return "魔法学徒";
}

function rankClass() {
  if (state.mana >= 10000) return "rank-badge rank-archmage";
  if (state.mana >= 2000) return "rank-badge rank-senior";
  if (state.mana >= 500) return "rank-badge rank-mage";
  if (state.mana >= 100) return "rank-badge rank-initiate";
  return "rank-badge rank-apprentice";
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
    const gain = Math.min(secondsAway, 60 * 60 * 6) * manaPerSecond();
    state.mana += gain;
    els.offlineGain.textContent = `+${format(gain)} 魔力`;
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function render() {
  const nextApprenticeCost = apprenticeCost();
  const nextWandCost = wandCost();
  const nextStudyCost = studyMagicBookCost();
  const nextStudyReward = studyMagicBookReward();

  els.manaCount.textContent = format(state.mana);
  els.manaRate.textContent = `+${manaPerSecond().toFixed(1)} / 秒`;
  els.researchCount.textContent = format(state.researchPoints);
  els.rankTitle.textContent = rankTitle();
  els.rankTitle.className = rankClass();
  els.tapPower.textContent = `+${practicePower()} 魔力`;
  els.studyCost.textContent = `消耗 ${format(nextStudyCost)} 魔力`;
  els.studyReward.textContent = `获得 ${format(nextStudyReward)} 研究点数`;
  els.apprenticeCost.textContent = `招募 ${format(nextApprenticeCost)}`;
  els.apprenticeOwned.textContent = `${state.apprentices} 名`;
  els.wandCost.textContent = `升级 ${format(nextWandCost)}`;
  els.wandLevel.textContent = `等级 ${state.wandLevel}`;
  els.studyButton.disabled = state.mana < nextStudyCost;
  els.apprenticeButton.disabled = state.mana < nextApprenticeCost;
  els.wandButton.disabled = state.mana < nextWandCost;
}

function spendMana(cost) {
  if (state.mana < cost) return false;
  state.mana -= cost;
  return true;
}

els.tapButton.addEventListener("click", () => {
  state.mana += practicePower();
  render();
});

els.studyButton.addEventListener("click", () => {
  if (!spendMana(studyMagicBookCost())) return;
  state.researchPoints += studyMagicBookReward();
  render();
  save();
});

els.apprenticeButton.addEventListener("click", () => {
  if (!spendMana(apprenticeCost())) return;
  state.apprentices += 1;
  render();
  save();
});

els.wandButton.addEventListener("click", () => {
  if (!spendMana(wandCost())) return;
  state.wandLevel += 1;
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
  state.mana = 0;
  state.researchPoints = 0;
  state.apprentices = 0;
  state.wandLevel = 0;
  state.lastSeen = Date.now();
  els.offlineGain.textContent = "0";
  render();
});

function tick(now) {
  const delta = (now - lastTick) / 1000;
  lastTick = now;
  state.mana += manaPerSecond() * delta;
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

if (location.hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(location.hostname)) {
  enableDevReload();
}
