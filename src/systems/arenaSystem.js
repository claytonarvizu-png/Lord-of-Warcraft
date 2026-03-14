import { startEncounter } from "./waveSystem.js";

export function enterArena(state) {
  startEncounter(state, state.arenaRun.encounterIndex);
  state.mode = "arena";
}
