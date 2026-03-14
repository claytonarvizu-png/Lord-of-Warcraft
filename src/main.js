import { createPlayer } from "./entities/player.js";
import { ARENAS } from "./data/arenas.js";
import { createGameLoop } from "./game/gameLoop.js";
import { createInitialState } from "./game/gameState.js";
import { updateCombatSystem } from "./systems/combatSystem.js";
import { updateCollisionSystem } from "./systems/collisionSystem.js";
import { updateEnemyAISystem } from "./systems/enemyAISystem.js";
import { createInputSystem } from "./systems/inputSystem.js";
import { finalizeEncounterRewards } from "./systems/lootSystem.js";
import { buyUpgrade, ensureSpellAvailability, equipItem, equipSpell, loadProgression, recalculateDerivedStats, saveProgression } from "./systems/progressionSystem.js";
import { createRenderSystem } from "./systems/renderSystem.js";
import { updateSpellSystem } from "./systems/spellSystem.js";
import { createUiSystem } from "./systems/uiSystem.js";
import { resetRunState, startEncounter, updateWaveSystem } from "./systems/waveSystem.js";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const hudLayer = document.getElementById("hud-layer");
const overlayLayer = document.getElementById("overlay-layer");
const statusPill = document.getElementById("status-pill");

const state = createInitialState();
state.player = createPlayer();
loadProgression(state);
ensureSpellAvailability(state);
recalculateDerivedStats(state);

const inputSystem = createInputSystem({ canvas, state });
const renderSystem = createRenderSystem({ ctx, hudLayer });
const uiSystem = createUiSystem({
  overlayLayer,
  statusPill,
  actions: {
    "start-run": () => { beginNewRun(); launchNextEncounter(); },
    "enter-hub": () => { goToHub(); },
    "start-next-encounter": () => { launchNextEncounter(); },
    "resume-arena": () => { state.mode = "arena"; },
    "restart-run": () => { beginNewRun(); launchNextEncounter(); },
    "return-title": () => { state.mode = "title"; saveProgression(state); },
    "buy-upgrade": ({ upgradeId }) => { ensureHubMode(); if (buyUpgrade(state, upgradeId)) { rehydratePlayer(); } },
    "equip-spell": ({ spellId, slotIndex }) => { ensureHubMode(); equipSpell(state, spellId, Number(slotIndex)); },
    "equip-item": ({ itemType, itemId }) => { ensureHubMode(); equipItem(state, itemType, itemId); rehydratePlayer(); },
    "set-hub-tab": ({ tab }) => { ensureHubMode(); state.ui.selectedHubTab = tab; },
  },
});

function beginNewRun() {
  resetRunState(state);
  state.player = createPlayer();
  ensureSpellAvailability(state);
  recalculateDerivedStats(state);
  rehydratePlayer();
  state.arenaRun.pendingSummary = null;
}

function goToHub() {
  if (state.arenaRun.victory || state.arenaRun.encounterIndex >= ARENAS.length) {
    beginNewRun();
  } else {
    recoverPlayerForHub();
  }
  ensureHubMode();
  state.ui.selectedHubTab = "summary";
}

function launchNextEncounter() {
  if (state.arenaRun.encounterIndex >= ARENAS.length) {
    beginNewRun();
  }
  preparePlayerForEncounter();
  startEncounter(state, state.arenaRun.encounterIndex);
  state.mode = "arena";
  syncPlayerToArenaCenter();
  saveProgression(state);
}

function rehydratePlayer() {
  if (!state.player) {
    state.player = createPlayer();
  }
  state.player.stats = { ...state.runtime.playerDerivedStats };
  state.player.manaRegen = state.runtime.playerDerivedStats.manaRegen;
  state.player.hp = Math.min(state.player.hp || state.player.stats.maxHp, state.player.stats.maxHp);
  state.player.mana = Math.min(state.player.mana || state.player.stats.maxMana, state.player.stats.maxMana);
}

function recoverPlayerForHub() {
  rehydratePlayer();
  state.player.alive = true;
  state.player.isInvulnerable = false;
  state.player.damageFlashMs = 0;
  state.player.dash.active = false;
  state.player.dash.timerMs = 0;
  state.player.dash.invulnerableMs = 0;
}

function ensureHubMode() {
  state.mode = "hub";
  state.input.pausePressed = false;
  state.input.dashPressed = false;
}

function preparePlayerForEncounter() {
  recoverPlayerForHub();
  state.player.hp = state.player.stats.maxHp;
  state.player.mana = state.player.stats.maxMana;
  state.player.cooldowns = {};
  state.player.velocity = { x: 0, y: 0 };
}

function syncPlayerToArenaCenter() {
  const bounds = state.arenaRun.bounds ?? { width: 1280, height: 720 };
  state.player.position.x = bounds.width / 2;
  state.player.position.y = bounds.height / 2;
}

function update() {
  inputSystem.update();
  if (state.input.pausePressed && state.mode === "arena") {
    state.mode = "pause";
    return;
  }
  if (state.mode !== "arena") {
    return;
  }
  updateCombatSystem(state);
  updateSpellSystem(state);
  updateEnemyAISystem(state);
  updateCollisionSystem(state);
  updateWaveSystem(state);
  if (state.mode === "hub" || state.mode === "victory") {
    finalizeEncounterRewards(state);
  }
}

function render() {
  renderSystem.render(state);
  uiSystem.render(state);
}

function resizeCanvas() {
  canvas.width = 1280;
  canvas.height = 720;
}

window.addEventListener("beforeunload", () => saveProgression(state));
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
render();

createGameLoop({ state, update, render }).start();
