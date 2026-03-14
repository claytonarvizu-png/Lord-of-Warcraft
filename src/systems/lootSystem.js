import { saveProgression } from "./progressionSystem.js";

export function finalizeEncounterRewards(state) {
  saveProgression(state);
}
