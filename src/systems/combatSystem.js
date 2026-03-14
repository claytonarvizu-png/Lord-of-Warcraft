import { clamp, normalize } from "../game/helpers.js";
import { updateFacingAngle } from "./spellSystem.js";

export function updateCombatSystem(state) {
  const player = state.player;
  if (!player || !player.alive) {
    return;
  }
  updateFacingAngle(state);
  player.damageFlashMs = Math.max(0, player.damageFlashMs - state.time.step);
  const moveDirection = normalize(state.input.moveX, state.input.moveY);
  const stats = player.stats;
  if (state.input.dashPressed && !player.dash.active && player.dash.cooldownMs <= 0) {
    const dashDirection = moveDirection.x || moveDirection.y
      ? moveDirection
      : normalize(state.input.aimWorldX - player.position.x, state.input.aimWorldY - player.position.y);
    player.dash.active = true;
    player.dash.timerMs = stats.dashDurationMs;
    player.dash.cooldownMs = stats.dashCooldownMs;
    player.dash.direction = dashDirection.x || dashDirection.y ? dashDirection : { x: 1, y: 0 };
    player.dash.invulnerableMs = stats.iFrameMs;
  }
  player.dash.cooldownMs = Math.max(0, player.dash.cooldownMs - state.time.step);
  player.dash.invulnerableMs = Math.max(0, player.dash.invulnerableMs - state.time.step);
  player.isInvulnerable = player.dash.invulnerableMs > 0;
  if (player.dash.active) {
    player.dash.timerMs -= state.time.step;
    player.velocity.x = player.dash.direction.x * stats.dashSpeed;
    player.velocity.y = player.dash.direction.y * stats.dashSpeed;
    if (player.dash.timerMs <= 0) {
      player.dash.active = false;
    }
  } else {
    player.velocity.x = moveDirection.x * stats.moveSpeed;
    player.velocity.y = moveDirection.y * stats.moveSpeed;
  }
  player.position.x += player.velocity.x * (state.time.step / 1000);
  player.position.y += player.velocity.y * (state.time.step / 1000);
  const bounds = state.arenaRun.bounds ?? { width: 1280, height: 720 };
  player.position.x = clamp(player.position.x, player.radius, bounds.width - player.radius);
  player.position.y = clamp(player.position.y, player.radius, bounds.height - player.radius);
  player.mana = clamp(player.mana + (player.manaRegen * (state.time.step / 1000)), 0, stats.maxMana);
}
