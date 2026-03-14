import { ARENAS } from "../data/arenas.js";
import { getHubMarkup } from "./renderSystem.js";

export function createUiSystem({ overlayLayer, statusPill, actions }) {
  let lastMarkup = null;

  overlayLayer.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    const { action } = button.dataset;
    actions[action]?.(button.dataset);
  });

  return {
    render(state) {
      let nextMarkup = "";

      statusPill.textContent = state.mode === "arena"
        ? `Arena ${state.arenaRun.encounterIndex + 1}: ${ARENAS[state.arenaRun.encounterIndex]?.name ?? "Unknown"}`
        : state.mode === "hub"
          ? "Hub"
          : state.mode === "victory"
            ? "Victory"
            : state.mode === "gameOver"
              ? "Defeat"
              : state.mode === "pause"
                ? "Paused"
                : "Title";

      if (state.mode === "title") {
        nextMarkup = `
          <div class="overlay-card">
            <h2>Arcane Arena</h2>
            <p>Guide Shrum Lord of the Gays through a two-spell loadout, survive five encounters, and defeat the Fire Archmage in a single browser run.</p>
            <div class="inline-list">
              <span class="tag">3 spells</span>
              <span class="tag">3 enemy archetypes</span>
              <span class="tag">1 boss</span>
              <span class="tag">5 encounters</span>
            </div>
            <div class="button-row" style="margin-top:16px;">
              <button data-action="start-run">Start Run</button>
              <button data-action="enter-hub">Open Hub</button>
            </div>
          </div>
        `;
      } else if (state.mode === "hub") {
        nextMarkup = getHubMarkup(state);
      } else if (state.mode === "pause") {
        nextMarkup = `
          <div class="overlay-card">
            <h2>Paused</h2>
            <p>Combat simulation is suspended.</p>
            <div class="button-row">
              <button data-action="resume-arena">Resume</button>
              <button data-action="enter-hub">Retreat To Hub</button>
            </div>
          </div>
        `;
      } else if (state.mode === "gameOver") {
        nextMarkup = `
          <div class="overlay-card">
            <h2>Defeat</h2>
            <p>Your run ended before the Fire Archmage fell.</p>
            <div class="button-row">
              <button data-action="restart-run">Restart Run</button>
              <button data-action="enter-hub">Go To Hub</button>
            </div>
          </div>
        `;
      } else if (state.mode === "victory") {
        nextMarkup = `
          <div class="overlay-card">
            <h2>Victory</h2>
            <p>You cleared all five encounters and broke the Fire Archmage's hold on the arena.</p>
            <div class="summary-card">
              <div class="reward-row"><span>Run Gold</span><strong>${state.arenaRun.runGold}</strong></div>
              <div class="reward-row"><span>Run Materials</span><strong>${state.arenaRun.runMaterials}</strong></div>
              <div class="reward-row"><span>Permanent Gold</span><strong>${state.progression.gold}</strong></div>
              <div class="reward-row"><span>Permanent Materials</span><strong>${state.progression.materials}</strong></div>
            </div>
            <div class="button-row">
              <button data-action="enter-hub">Return To Hub</button>
              <button data-action="restart-run">Start Fresh Run</button>
            </div>
          </div>
        `;
      }

      if (nextMarkup !== lastMarkup) {
        overlayLayer.innerHTML = nextMarkup;
        lastMarkup = nextMarkup;
      }

      overlayLayer.style.pointerEvents = nextMarkup ? "auto" : "none";
    },
  };
}
