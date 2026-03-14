import { CAMERA_ZOOM } from "../game/config.js";
import { normalize } from "../game/helpers.js";

export function createInputSystem({ canvas, state }) {
  const keyboard = new Set();
  let primaryQueued = false;
  let dashQueued = false;
  let pauseQueued = false;
  const spellQueued = [false, false, false];
  let mouseX = canvas.width / 2;
  let mouseY = canvas.height / 2;

  function syncMovement() {
    const horizontal = (keyboard.has("KeyD") ? 1 : 0) - (keyboard.has("KeyA") ? 1 : 0);
    const vertical = (keyboard.has("KeyS") ? 1 : 0) - (keyboard.has("KeyW") ? 1 : 0);
    const normalized = normalize(horizontal, vertical);
    state.input.moveX = normalized.x;
    state.input.moveY = normalized.y;
  }

  function handleKeyChange(event, isDown) {
    if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
      if (isDown) {
        keyboard.add(event.code);
      } else {
        keyboard.delete(event.code);
      }
      syncMovement();
    }

    if ((event.code === "Space" || event.code === "ShiftLeft" || event.code === "ShiftRight") && isDown && !event.repeat) {
      dashQueued = true;
      event.preventDefault();
    }

    if (event.code === "KeyP" && isDown && !event.repeat) {
      pauseQueued = true;
    }

    if (isDown && !event.repeat) {
      if (event.code === "KeyR") {
        spellQueued[1] = true;
      }
    }
  }

  function updateAim(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    state.input.aimWorldX = state.camera.x + ((mouseX - (canvas.width / 2)) / CAMERA_ZOOM);
    state.input.aimWorldY = state.camera.y + ((mouseY - (canvas.height / 2)) / CAMERA_ZOOM);
  }

  window.addEventListener("keydown", (event) => handleKeyChange(event, true));
  window.addEventListener("keyup", (event) => handleKeyChange(event, false));
  window.addEventListener("mousemove", updateAim);
  window.addEventListener("mousedown", (event) => {
    updateAim(event);
    if (event.button === 0) {
      primaryQueued = true;
    }
    if (event.button === 1) {
      spellQueued[2] = true;
      event.preventDefault();
    }
  });
  canvas.addEventListener("auxclick", (event) => {
    if (event.button === 1) {
      event.preventDefault();
    }
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  return {
    update() {
      state.input.primaryPressed = primaryQueued;
      state.input.dashPressed = dashQueued;
      state.input.pausePressed = pauseQueued;
      state.input.spellPressed = [...spellQueued];
      primaryQueued = false;
      dashQueued = false;
      pauseQueued = false;
      spellQueued[0] = false;
      spellQueued[1] = false;
      spellQueued[2] = false;
      if (!Number.isFinite(state.input.aimWorldX)) {
        state.input.aimWorldX = state.camera.x + ((mouseX - (canvas.width / 2)) / CAMERA_ZOOM);
      }
      if (!Number.isFinite(state.input.aimWorldY)) {
        state.input.aimWorldY = state.camera.y + ((mouseY - (canvas.height / 2)) / CAMERA_ZOOM);
      }
    },
  };
}
