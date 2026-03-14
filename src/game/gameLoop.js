import { MAX_FRAME_DELTA_MS, MAX_UPDATES_PER_FRAME } from "./config.js";

export function createGameLoop({ state, update, render }) {
  let lastFrameTime = 0;
  let rafId = 0;

  function frame(now) {
    if (!lastFrameTime) {
      lastFrameTime = now;
    }

    const deltaMs = Math.min(now - lastFrameTime, MAX_FRAME_DELTA_MS);
    lastFrameTime = now;

    state.time.now = now;
    state.time.accumulator += deltaMs;

    let updates = 0;
    while (state.time.accumulator >= state.time.step && updates < MAX_UPDATES_PER_FRAME) {
      update(state.time.step);
      state.time.accumulator -= state.time.step;
      updates += 1;
    }

    if (updates === MAX_UPDATES_PER_FRAME) {
      state.time.accumulator = 0;
    }

    render();
    rafId = window.requestAnimationFrame(frame);
  }

  return {
    start() {
      if (!rafId) {
        rafId = window.requestAnimationFrame(frame);
      }
    },
    stop() {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
  };
}
