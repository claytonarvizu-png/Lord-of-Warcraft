import { ARENAS } from "../data/arenas.js";
import { ENEMIES } from "../data/enemies.js";
import { createBoss } from "../entities/boss.js";
import { createEnemy } from "../entities/enemy.js";
import { chooseWeighted, randomFloat, randomInt } from "../game/helpers.js";

const ENEMY_COSTS = { apprentice_wizard: 1, summoner: 2, elemental_creature: 2 };

export function resetRunState(state) {
  state.enemies = [];
  state.projectiles = [];
  state.pickups = [];
  state.effects = [];
  state.arenaRun.encounterIndex = 0;
  state.arenaRun.waveIndex = 0;
  state.arenaRun.clearedArenas = 0;
  state.arenaRun.activeArenaId = ARENAS[0].id;
  state.arenaRun.pendingSummary = null;
  state.arenaRun.encounterRewardGold = 0;
  state.arenaRun.encounterRewardMaterials = 0;
  state.arenaRun.runGold = 0;
  state.arenaRun.runMaterials = 0;
  state.arenaRun.victory = false;
}

export function startEncounter(state, encounterIndex = state.arenaRun.encounterIndex) {
  const arena = ARENAS[encounterIndex];
  state.enemies = [];
  state.projectiles = [];
  state.pickups = [];
  state.effects = [];
  state.arenaRun.encounterIndex = encounterIndex;
  state.arenaRun.arenaIndex = encounterIndex;
  state.arenaRun.waveIndex = 0;
  state.arenaRun.activeArenaId = arena.id;
  state.arenaRun.remainingWaves = arena.waves.length;
  state.arenaRun.bossSpawned = false;
  state.arenaRun.bounds = arena.bounds;
  state.arenaRun.isBossArena = Boolean(arena.bossWaveId);
  state.arenaRun.encounterRewardGold = 0;
  state.arenaRun.encounterRewardMaterials = 0;
  state.arenaRun.waveTimerMs = 1000;
  state.arenaRun.queuedSpawns = [];
  queueWaveSpawns(state, arena.waves[0]);
}

export function updateWaveSystem(state) {
  if (state.arenaRun.waveTimerMs > 0) {
    state.arenaRun.waveTimerMs -= state.time.step;
  }
  if (state.arenaRun.waveTimerMs <= 0 && state.arenaRun.queuedSpawns.length > 0) {
    const spawn = state.arenaRun.queuedSpawns.shift();
    spawnEntity(state, spawn.enemyId);
    state.arenaRun.waveTimerMs = 380;
  }
  if (state.arenaRun.queuedSpawns.length === 0 && state.enemies.length === 0 && state.pickups.length === 0) {
    const arena = ARENAS[state.arenaRun.encounterIndex];
    if (state.arenaRun.waveIndex >= arena.waves.length - 1) {
      completeEncounter(state);
      return;
    }
    state.arenaRun.waveIndex += 1;
    state.arenaRun.remainingWaves = Math.max(0, arena.waves.length - state.arenaRun.waveIndex);
    queueWaveSpawns(state, arena.waves[state.arenaRun.waveIndex]);
    state.arenaRun.waveTimerMs = 1200;
  }
}

function queueWaveSpawns(state, wave) {
  state.arenaRun.queuedSpawns = [];
  if (wave.bossWaveId) {
    state.arenaRun.queuedSpawns.push({ enemyId: wave.bossWaveId });
    state.arenaRun.bossSpawned = true;
    return;
  }
  let budget = wave.budget;
  const affordableEntries = wave.spawnTable.filter((entry) => (ENEMY_COSTS[entry.enemyId] ?? 1) <= budget);
  if (randomFloat(state, 0, 1) < wave.rareChance) {
    budget += 1;
    state.arenaRun.rareWave = true;
  } else {
    state.arenaRun.rareWave = false;
  }
  while (budget > 0) {
    const choices = wave.spawnTable.filter((entry) => (ENEMY_COSTS[entry.enemyId] ?? 1) <= budget);
    if (choices.length === 0) {
      break;
    }
    const choice = chooseWeighted(state, choices);
    const cost = ENEMY_COSTS[choice.enemyId] ?? 1;
    state.arenaRun.queuedSpawns.push({ enemyId: choice.enemyId });
    budget -= cost;
  }
  const variance = randomInt(state, 0, 1);
  for (let count = 0; count < variance; count += 1) {
    const varianceChoices = affordableEntries.length > 0 ? affordableEntries : wave.spawnTable;
    const choice = chooseWeighted(state, varianceChoices);
    state.arenaRun.queuedSpawns.push({ enemyId: choice.enemyId });
  }
}

function spawnEntity(state, enemyId) {
  const definition = ENEMIES[enemyId];
  const bounds = state.arenaRun.bounds;
  const position = { x: randomInt(state, 80, bounds.width - 80), y: randomInt(state, 80, bounds.height - 80) };
  const entity = definition.role === "boss" ? createBoss(nextEntityId(state), definition, position) : createEnemy(nextEntityId(state), definition, position);
  state.enemies.push(entity);
}

function completeEncounter(state) {
  state.arenaRun.clearedArenas += 1;
  state.arenaRun.pendingSummary = {
    arenaName: ARENAS[state.arenaRun.encounterIndex].name,
    gold: state.arenaRun.encounterRewardGold,
    materials: state.arenaRun.encounterRewardMaterials,
    nextArena: ARENAS[state.arenaRun.encounterIndex + 1]?.name ?? "Hub Victory Screen",
  };
  state.arenaRun.runGold += state.arenaRun.encounterRewardGold;
  state.arenaRun.runMaterials += state.arenaRun.encounterRewardMaterials;
  if (state.arenaRun.encounterIndex >= ARENAS.length - 1) {
    state.arenaRun.victory = true;
    state.mode = "victory";
  } else {
    const nextEncounterIndex = state.arenaRun.encounterIndex + 1;
    state.arenaRun.encounterIndex = nextEncounterIndex;
    startEncounter(state, nextEncounterIndex);
    if (state.player) {
      state.player.position.x = state.arenaRun.bounds.width / 2;
      state.player.position.y = state.arenaRun.bounds.height / 2;
      state.player.velocity = { x: 0, y: 0 };
    }
    state.effects.push({
      type: "banner",
      text: `Boss ${nextEncounterIndex + 1}: ${ARENAS[nextEncounterIndex].name}`,
      ttl: 1600,
      color: "#d7f1ff",
    });
  }
}

function nextEntityId(state) {
  const id = `entity_${state.runtime.nextEntityId}`;
  state.runtime.nextEntityId += 1;
  return id;
}
