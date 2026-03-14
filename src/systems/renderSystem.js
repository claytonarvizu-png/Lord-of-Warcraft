import { CAMERA_ZOOM, GAME_HEIGHT, GAME_WIDTH } from "../game/config.js";
import { clamp, formatMs } from "../game/helpers.js";
import { ARENAS } from "../data/arenas.js";
import { SPELLS } from "../data/spells.js";
import { ARMORS, UPGRADES, WEAPONS } from "../data/upgrades.js";
import { ENEMIES } from "../data/enemies.js";
import { getComputedSpell } from "./progressionSystem.js";

export function createRenderSystem({ ctx, hudLayer }) {
  return {
    render(state) {
      updateCamera(state);
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      renderArena(ctx, state);
      renderEffects(ctx, state);
      renderProjectiles(ctx, state);
      renderEntities(ctx, state);
      renderPickups(ctx, state);
      renderHud(hudLayer, state);
    },
  };
}

function updateCamera(state) {
  const player = state.player;
  if (!player) {
    state.camera.x = GAME_WIDTH / 2;
    state.camera.y = GAME_HEIGHT / 2;
    return;
  }
  const bounds = state.arenaRun.bounds ?? { width: GAME_WIDTH, height: GAME_HEIGHT };
  const halfViewWidth = GAME_WIDTH / (2 * CAMERA_ZOOM);
  const halfViewHeight = GAME_HEIGHT / (2 * CAMERA_ZOOM);
  state.camera.x = clamp(player.position.x, halfViewWidth, Math.max(halfViewWidth, bounds.width - halfViewWidth));
  state.camera.y = clamp(player.position.y, halfViewHeight, Math.max(halfViewHeight, bounds.height - halfViewHeight));
}

function withCamera(ctx, state, draw) {
  ctx.save();
  ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
  ctx.translate(-state.camera.x, -state.camera.y);
  draw();
  ctx.restore();
}

function renderArena(ctx, state) {
  const bounds = state.arenaRun.bounds ?? { width: GAME_WIDTH, height: GAME_HEIGHT };
  withCamera(ctx, state, () => {
    const gradient = ctx.createLinearGradient(0, 0, bounds.width, bounds.height);
    gradient.addColorStop(0, "#12202d");
    gradient.addColorStop(0.45, "#0b1621");
    gradient.addColorStop(1, "#05090d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, bounds.width, bounds.height);

    ctx.fillStyle = "rgba(109, 195, 255, 0.035)";
    for (let y = 70; y < bounds.height; y += 160) {
      for (let x = 90; x < bounds.width; x += 220) {
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = "rgba(131, 188, 223, 0.12)";
    for (let x = 0; x < bounds.width; x += 98) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, bounds.height);
      ctx.stroke();
    }
    for (let y = 0; y < bounds.height; y += 98) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(bounds.width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(96, 168, 199, 0.22)";
    ctx.lineWidth = 1.5;
    for (let x = 64; x < bounds.width; x += 240) {
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x + 24, 84);
      ctx.lineTo(x, 108);
      ctx.lineTo(x - 24, 84);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(117, 173, 214, 0.55)";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, bounds.width - 20, bounds.height - 20);

    ctx.strokeStyle = "rgba(191, 229, 255, 0.12)";
    ctx.lineWidth = 10;
    ctx.strokeRect(28, 28, bounds.width - 56, bounds.height - 56);
  });
}

function renderEntities(ctx, state) {
  withCamera(ctx, state, () => {
    if (state.player) {
      const player = state.player;
      ctx.fillStyle = "#dff7ff";
      ctx.font = "14px Georgia";
      ctx.textAlign = "center";
      ctx.fillText(player.name ?? "Shrum", player.position.x, player.position.y - player.radius - 18);
      ctx.save();
      ctx.translate(player.position.x, player.position.y);
      ctx.rotate(player.facingAngle);

      const fireX = player.radius + 10;
      const fireY = -8;

      ctx.fillStyle = "rgba(255, 179, 83, 0.18)";
      ctx.beginPath();
      ctx.arc(fireX, fireY, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3d1f8a";
      ctx.beginPath();
      ctx.moveTo(-18, 18);
      ctx.lineTo(18, 18);
      ctx.lineTo(14, -6);
      ctx.lineTo(-14, -6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#5d2cc9";
      ctx.beginPath();
      ctx.moveTo(-30, -14);
      ctx.lineTo(30, -14);
      ctx.lineTo(18, -6);
      ctx.lineTo(-18, -6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#4c1fb2";
      ctx.beginPath();
      ctx.moveTo(-8, -44);
      ctx.lineTo(18, -18);
      ctx.lineTo(10, -6);
      ctx.lineTo(-14, -14);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#f0c96a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-24, -10);
      ctx.lineTo(22, -10);
      ctx.stroke();

      ctx.fillStyle = player.damageFlashMs > 0 ? "#ffe4e4" : "#f2b1b8";
      ctx.beginPath();
      ctx.arc(0, -2, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(-2, 2);
      ctx.lineTo(-18, 10);
      ctx.lineTo(-8, 14);
      ctx.lineTo(0, 10);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, 2);
      ctx.lineTo(18, 10);
      ctx.lineTo(8, 14);
      ctx.lineTo(0, 10);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.quadraticCurveTo(0, 24, 10, 2);
      ctx.lineTo(0, 28);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#e6f5ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(-2, -12);
      ctx.moveTo(8, -8);
      ctx.lineTo(2, -12);
      ctx.stroke();

      ctx.fillStyle = "#1d70c8";
      ctx.beginPath();
      ctx.arc(-4, -3, 2.6, 0, Math.PI * 2);
      ctx.arc(4, -3, 2.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#5a1b1b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-3, 4);
      ctx.lineTo(3, 4);
      ctx.stroke();

      ctx.strokeStyle = player.isInvulnerable ? "#fff7a5" : "#f3b455";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(10, 12);
      ctx.lineTo(fireX - 8, fireY + 8);
      ctx.stroke();

      if (player.isInvulnerable) {
        ctx.strokeStyle = "rgba(135, 255, 216, 0.92)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = "#ffcc89";
      ctx.beginPath();
      ctx.arc(fireX - 10, fireY + 10, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ff8a24";
      ctx.beginPath();
      ctx.moveTo(fireX, fireY + 12);
      ctx.quadraticCurveTo(fireX + 10, fireY, fireX + 2, fireY - 16);
      ctx.quadraticCurveTo(fireX - 6, fireY - 4, fireX - 10, fireY - 16);
      ctx.quadraticCurveTo(fireX - 14, fireY - 2, fireX, fireY + 12);
      ctx.fill();

      ctx.fillStyle = "#ffd84d";
      ctx.beginPath();
      ctx.moveTo(fireX, fireY + 8);
      ctx.quadraticCurveTo(fireX + 6, fireY - 2, fireX + 1, fireY - 12);
      ctx.quadraticCurveTo(fireX - 4, fireY - 4, fireX - 6, fireY - 12);
      ctx.quadraticCurveTo(fireX - 9, fireY - 2, fireX, fireY + 8);
      ctx.fill();

      ctx.fillStyle = "#fff4a8";
      ctx.beginPath();
      ctx.arc(fireX - 1, fireY - 2, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.textAlign = "start";
    }
    for (const enemy of state.enemies) {
      const definition = ENEMIES[enemy.definitionId];
      ctx.save();
      ctx.translate(enemy.position.x, enemy.position.y);

      if (enemy.definitionId === "qwibus") {
        renderQwibusBoss(ctx, enemy);
      } else if (enemy.boss) {
        renderLichQueen(ctx, enemy);
      } else if (enemy.definitionId === "apprentice_wizard" || enemy.definitionId === "summoner") {
        renderQwibusHunter(ctx, enemy);
      } else if (enemy.definitionId === "elemental_creature") {
        renderFrostThrall(ctx, enemy);
      } else {
        ctx.fillStyle = enemy.damageFlashMs > 0 ? "#fff0ea" : "#9eb9cc";
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(enemy.position.x - 24, enemy.position.y - enemy.radius - 14, 48, 6);
      ctx.fillStyle = enemy.boss ? "#70c3ff" : "#7dbfd6";
      ctx.fillRect(enemy.position.x - 24, enemy.position.y - enemy.radius - 14, 48 * Math.max(0, enemy.hp / enemy.maxHp), 6);
      if (enemy.shieldMs > 0) {
        ctx.strokeStyle = "rgba(151, 224, 255, 0.9)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(enemy.position.x, enemy.position.y, enemy.radius + 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (enemy.telegraphMs > 0) {
        ctx.strokeStyle = "rgba(255, 160, 111, 0.65)";
        ctx.beginPath();
        ctx.arc(enemy.position.x, enemy.position.y, enemy.attackRange, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.textAlign = "center";
      ctx.fillStyle = "#7fd7ff";
      ctx.font = "11px Georgia";
      ctx.fillText("Qwibus", enemy.position.x, enemy.position.y + enemy.radius + 18);
      ctx.fillStyle = "#d7ebf7";
      ctx.font = "12px Georgia";
      ctx.fillText(definition.name, enemy.position.x, enemy.position.y + enemy.radius + 34);
      ctx.textAlign = "start";
    }
  });
}

function renderQwibusHunter(ctx, enemy) {
  ctx.fillStyle = "rgba(95, 205, 255, 0.16)";
  ctx.beginPath();
  ctx.arc(0, -2, enemy.radius + 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3a3f57";
  ctx.beginPath();
  ctx.moveTo(-enemy.radius - 4, enemy.radius + 4);
  ctx.lineTo(enemy.radius + 4, enemy.radius + 4);
  ctx.lineTo(enemy.radius - 2, -4);
  ctx.lineTo(-enemy.radius + 2, -4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#2a2d41";
  ctx.beginPath();
  ctx.moveTo(-enemy.radius + 4, -6);
  ctx.lineTo(0, -enemy.radius - 8);
  ctx.lineTo(enemy.radius - 4, -6);
  ctx.lineTo(enemy.radius - 2, 8);
  ctx.lineTo(-enemy.radius + 2, 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = enemy.damageFlashMs > 0 ? "#fff3f3" : "#5f6f8d";
  ctx.beginPath();
  ctx.moveTo(-enemy.radius * 0.5, -4);
  ctx.lineTo(0, -enemy.radius * 0.58);
  ctx.lineTo(enemy.radius * 0.5, -4);
  ctx.lineTo(enemy.radius * 0.36, enemy.radius * 0.42);
  ctx.lineTo(-enemy.radius * 0.36, enemy.radius * 0.42);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#7ee8ff";
  ctx.beginPath();
  ctx.arc(0, 0, 4.2, 0, Math.PI);
  ctx.fill();

  ctx.strokeStyle = "#1c2330";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, 1);
  ctx.lineTo(5, 1);
  ctx.stroke();

  ctx.fillStyle = enemy.definitionId === "summoner" ? "#5d2da8" : "#4a596d";
  ctx.beginPath();
  ctx.moveTo(-enemy.radius + 2, enemy.radius * 0.35);
  ctx.lineTo(enemy.radius - 2, enemy.radius * 0.35);
  ctx.lineTo(enemy.radius - 8, enemy.radius + 12);
  ctx.lineTo(-enemy.radius + 8, enemy.radius + 12);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#9fc1d8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-3, -4);
  ctx.lineTo(-1, 6);
  ctx.lineTo(1, 6);
  ctx.lineTo(3, -4);
  ctx.stroke();
}

function renderFrostThrall(ctx, enemy) {
  ctx.fillStyle = "#607d8f";
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#93b7c9";
  ctx.beginPath();
  ctx.arc(0, -4, enemy.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#dff6ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(0, enemy.radius + 3);
  ctx.lineTo(6, 2);
  ctx.stroke();
}

function renderQwibusBoss(ctx, enemy) {
  ctx.fillStyle = "rgba(255, 141, 52, 0.16)";
  ctx.beginPath();
  ctx.arc(0, -4, enemy.radius + 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#262830";
  ctx.beginPath();
  ctx.moveTo(-enemy.radius - 10, enemy.radius + 18);
  ctx.lineTo(-enemy.radius + 4, -8);
  ctx.lineTo(-20, -28);
  ctx.lineTo(20, -28);
  ctx.lineTo(enemy.radius - 4, -8);
  ctx.lineTo(enemy.radius + 10, enemy.radius + 18);
  ctx.lineTo(14, enemy.radius + 14);
  ctx.lineTo(8, enemy.radius + 40);
  ctx.lineTo(-8, enemy.radius + 40);
  ctx.lineTo(-14, enemy.radius + 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#11141b";
  ctx.beginPath();
  ctx.moveTo(-enemy.radius - 22, -14);
  ctx.lineTo(-enemy.radius - 6, -28);
  ctx.lineTo(-12, -18);
  ctx.lineTo(-10, 6);
  ctx.lineTo(-enemy.radius - 16, 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(enemy.radius + 22, -14);
  ctx.lineTo(enemy.radius + 6, -28);
  ctx.lineTo(12, -18);
  ctx.lineTo(10, 6);
  ctx.lineTo(enemy.radius + 16, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = enemy.damageFlashMs > 0 ? "#fff5ea" : "#6b6f72";
  ctx.beginPath();
  ctx.moveTo(-18, -36);
  ctx.lineTo(0, -46);
  ctx.lineTo(18, -36);
  ctx.lineTo(24, -4);
  ctx.lineTo(18, 18);
  ctx.lineTo(-18, 18);
  ctx.lineTo(-24, -4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ed6b2f";
  ctx.beginPath();
  ctx.moveTo(-10, -58);
  ctx.lineTo(-2, -70);
  ctx.lineTo(4, -54);
  ctx.lineTo(12, -68);
  ctx.lineTo(18, -46);
  ctx.lineTo(6, -34);
  ctx.lineTo(-6, -34);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#d0d6da";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-18, -12);
  ctx.lineTo(0, -18);
  ctx.lineTo(18, -12);
  ctx.stroke();

  ctx.fillStyle = "#d95c25";
  ctx.beginPath();
  ctx.arc(-7, -8, 4.5, 0, Math.PI * 2);
  ctx.arc(7, -8, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f3eadb";
  ctx.beginPath();
  ctx.moveTo(-18, 12);
  ctx.lineTo(-4, 26);
  ctx.lineTo(0, 12);
  ctx.lineTo(4, 26);
  ctx.lineTo(18, 12);
  ctx.lineTo(8, 34);
  ctx.lineTo(-8, 34);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#8f6d47";
  ctx.fillRect(-18, 18, 36, 22);
  ctx.fillRect(-24, 40, 16, 28);
  ctx.fillRect(8, 40, 16, 28);

  ctx.strokeStyle = "#f0d7a6";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-30, -18);
  ctx.lineTo(-10, -24);
  ctx.lineTo(-6, 8);
  ctx.moveTo(30, -18);
  ctx.lineTo(10, -24);
  ctx.lineTo(6, 8);
  ctx.stroke();

  ctx.fillStyle = "#baa17a";
  ctx.beginPath();
  ctx.arc(-enemy.radius - 8, enemy.radius + 8, 10, 0, Math.PI * 2);
  ctx.arc(enemy.radius + 8, enemy.radius + 8, 10, 0, Math.PI * 2);
  ctx.fill();
}

function renderLichQueen(ctx, enemy) {
  ctx.fillStyle = "rgba(119, 196, 255, 0.22)";
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius + 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2d3444";
  ctx.beginPath();
  ctx.moveTo(-enemy.radius + 4, enemy.radius + 10);
  ctx.lineTo(enemy.radius - 4, enemy.radius + 10);
  ctx.lineTo(enemy.radius - 10, 6);
  ctx.lineTo(enemy.radius - 16, -10);
  ctx.lineTo(enemy.radius - 6, -18);
  ctx.lineTo(10, -12);
  ctx.lineTo(0, 2);
  ctx.lineTo(-10, -12);
  ctx.lineTo(-enemy.radius + 6, -18);
  ctx.lineTo(-enemy.radius + 16, -10);
  ctx.lineTo(-enemy.radius + 10, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#556176";
  ctx.beginPath();
  ctx.moveTo(-14, -22);
  ctx.lineTo(0, -30);
  ctx.lineTo(14, -22);
  ctx.lineTo(10, -4);
  ctx.lineTo(-10, -4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = enemy.damageFlashMs > 0 ? "#fff4f4" : "#b7c7d9";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#1d222e";
  ctx.beginPath();
  ctx.moveTo(-7, -20);
  ctx.lineTo(0, -14);
  ctx.lineTo(7, -20);
  ctx.lineTo(4, -8);
  ctx.lineTo(-4, -8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#7ed7ff";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-6, -16);
  ctx.lineTo(0, -12);
  ctx.lineTo(6, -16);
  ctx.stroke();

  ctx.fillStyle = "#404a60";
  ctx.beginPath();
  ctx.moveTo(-enemy.radius + 6, -4);
  ctx.lineTo(-enemy.radius - 10, 10);
  ctx.lineTo(-enemy.radius + 2, 18);
  ctx.lineTo(-8, 6);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(enemy.radius - 6, -4);
  ctx.lineTo(enemy.radius + 12, 8);
  ctx.lineTo(enemy.radius - 2, 20);
  ctx.lineTo(8, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#6c7b91";
  ctx.fillRect(-10, 2, 20, 20);

  ctx.strokeStyle = "#79cfff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(enemy.radius + 10, -2);
  ctx.lineTo(enemy.radius + 26, -12);
  ctx.lineTo(enemy.radius + 18, 12);
  ctx.stroke();
}

function renderProjectiles(ctx, state) {
  withCamera(ctx, state, () => {
    for (const projectile of state.projectiles) {
      renderProjectileSprite(ctx, projectile);
    }
  });
}

function renderProjectileSprite(ctx, projectile) {
  ctx.save();
  ctx.translate(projectile.position.x, projectile.position.y);
  ctx.shadowBlur = 18;
  ctx.shadowColor = projectile.glow ?? projectile.color;

  if (projectile.variant === "ember_lance") {
    ctx.rotate(Math.atan2(projectile.velocity.y, projectile.velocity.x));
    ctx.fillStyle = "rgba(255, 193, 135, 0.28)";
    ctx.beginPath();
    ctx.ellipse(-2, 0, projectile.radius + 10, projectile.radius + 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8a4a";
    ctx.beginPath();
    ctx.moveTo(projectile.radius + 10, 0);
    ctx.lineTo(-projectile.radius - 4, -projectile.radius * 0.75);
    ctx.lineTo(-projectile.radius + 2, 0);
    ctx.lineTo(-projectile.radius - 4, projectile.radius * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffe0b2";
    ctx.beginPath();
    ctx.moveTo(projectile.radius + 2, 0);
    ctx.lineTo(-projectile.radius + 2, -projectile.radius * 0.35);
    ctx.lineTo(-projectile.radius + 2, projectile.radius * 0.35);
    ctx.closePath();
    ctx.fill();
  } else if (projectile.variant === "magma_stone") {
    ctx.rotate(Math.atan2(projectile.velocity.y, projectile.velocity.x) + 0.25);
    ctx.fillStyle = "rgba(255, 196, 129, 0.18)";
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7f5838";
    ctx.beginPath();
    ctx.moveTo(projectile.radius + 6, -1);
    ctx.lineTo(4, -projectile.radius - 6);
    ctx.lineTo(-projectile.radius + 3, -projectile.radius * 0.4);
    ctx.lineTo(-projectile.radius - 6, 2);
    ctx.lineTo(-3, projectile.radius + 6);
    ctx.lineTo(projectile.radius * 0.5, projectile.radius * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffad58";
    ctx.beginPath();
    ctx.arc(2, -2, Math.max(3, projectile.radius - 4), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe2a9";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, projectile.radius - 7), 0, Math.PI * 2);
    ctx.fill();
  } else if (projectile.variant === "moon_shard") {
    ctx.rotate(Math.atan2(projectile.velocity.y, projectile.velocity.x));
    ctx.fillStyle = "rgba(187, 229, 255, 0.28)";
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius + 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#bfe7ff";
    ctx.beginPath();
    ctx.moveTo(projectile.radius + 10, 0);
    ctx.quadraticCurveTo(0, -projectile.radius - 8, -projectile.radius + 2, -2);
    ctx.quadraticCurveTo(-2, projectile.radius + 7, projectile.radius + 10, 0);
    ctx.fill();
    ctx.fillStyle = "#f6fdff";
    ctx.beginPath();
    ctx.arc(2, -2, Math.max(2, projectile.radius - 5), 0, Math.PI * 2);
    ctx.fill();
  } else if (projectile.variant === "blood_orb") {
    ctx.fillStyle = "rgba(255, 132, 159, 0.2)";
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9c1738";
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffb0c1";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-2, -2, Math.max(2, projectile.radius - 4), 0, Math.PI * 1.5);
    ctx.stroke();
  } else if (projectile.variant === "star_spear") {
    ctx.rotate(Math.atan2(projectile.velocity.y, projectile.velocity.x));
    ctx.fillStyle = "rgba(147, 221, 255, 0.24)";
    ctx.beginPath();
    ctx.ellipse(-3, 0, projectile.radius + 12, projectile.radius + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7dd5ff";
    ctx.beginPath();
    ctx.moveTo(projectile.radius + 12, 0);
    ctx.lineTo(-projectile.radius - 6, -projectile.radius * 0.8);
    ctx.lineTo(-projectile.radius + 2, 0);
    ctx.lineTo(-projectile.radius - 6, projectile.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#eefcff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-projectile.radius + 3, 0);
    ctx.lineTo(projectile.radius + 7, 0);
    ctx.stroke();
  } else if (projectile.variant === "axe_arc" || projectile.variant === "cleaver_arc") {
    ctx.rotate(Math.atan2(projectile.velocity.y, projectile.velocity.x));
    ctx.fillStyle = projectile.variant === "axe_arc" ? "#ff9f59" : "#ffd7ae";
    ctx.beginPath();
    ctx.moveTo(projectile.radius + 8, 0);
    ctx.lineTo(0, -projectile.radius - 7);
    ctx.lineTo(-projectile.radius + 3, -3);
    ctx.lineTo(-projectile.radius - 4, 0);
    ctx.lineTo(-projectile.radius + 3, 3);
    ctx.lineTo(0, projectile.radius + 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(48, 26, 18, 0.82)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else if (projectile.spellId === "fireball") {
    ctx.fillStyle = "rgba(255, 188, 126, 0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(Math.atan2(projectile.velocity.y, projectile.velocity.x));
    ctx.fillStyle = "rgba(255, 128, 56, 0.24)";
    ctx.beginPath();
    ctx.moveTo(-projectile.radius - 12, 0);
    ctx.lineTo(-projectile.radius - 2, -projectile.radius * 0.85);
    ctx.lineTo(-projectile.radius + 2, 0);
    ctx.lineTo(-projectile.radius - 2, projectile.radius * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff7f42";
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe0a6";
    ctx.beginPath();
    ctx.arc(-2, -2, Math.max(2, projectile.radius - 2), 0, Math.PI * 2);
    ctx.fill();
  } else if (projectile.spellId === "ice_shard") {
    ctx.rotate(Math.atan2(projectile.velocity.y, projectile.velocity.x));
    ctx.fillStyle = "#d9fbff";
    ctx.beginPath();
    ctx.moveTo(projectile.radius + 12, 0);
    ctx.lineTo(-projectile.radius + 2, -projectile.radius * 0.95);
    ctx.lineTo(-projectile.radius * 0.15, 0);
    ctx.lineTo(-projectile.radius + 2, projectile.radius * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(120, 228, 255, 0.88)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath();
    ctx.moveTo(-projectile.radius + 1, 0);
    ctx.lineTo(projectile.radius + 7, 0);
    ctx.stroke();
  } else if (projectile.spellId === "chain_lightning") {
    ctx.rotate(Math.atan2(projectile.velocity.y, projectile.velocity.x));
    ctx.fillStyle = "rgba(92, 47, 168, 0.22)";
    ctx.beginPath();
    ctx.ellipse(-2, 0, projectile.radius + 11, projectile.radius + 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#120716";
    ctx.beginPath();
    ctx.moveTo(projectile.radius + 10, 0);
    ctx.lineTo(0, -projectile.radius - 7);
    ctx.lineTo(-projectile.radius - 8, 0);
    ctx.lineTo(0, projectile.radius + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7f56ff";
    ctx.beginPath();
    ctx.ellipse(0, 0, projectile.radius + 4, projectile.radius - 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dac7ff";
    ctx.beginPath();
    ctx.arc(projectile.radius * 0.3, 0, Math.max(2, projectile.radius - 4), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function renderPickups(ctx, state) {
  withCamera(ctx, state, () => {
    for (const pickup of state.pickups) {
      if (pickup.pickupType === "heal") {
        ctx.fillStyle = "rgba(120, 255, 166, 0.22)";
        ctx.beginPath();
        ctx.arc(pickup.position.x, pickup.position.y, pickup.radius + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#76ffb0";
        ctx.fillRect(pickup.position.x - 4, pickup.position.y - 12, 8, 24);
        ctx.fillRect(pickup.position.x - 12, pickup.position.y - 4, 24, 8);
      } else {
        ctx.fillStyle = "#f7d17e";
        ctx.beginPath();
        ctx.arc(pickup.position.x, pickup.position.y, pickup.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function renderEffects(ctx, state) {
  withCamera(ctx, state, () => {
    for (const effect of state.effects) {
      if (effect.type === "chain") {
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 5;
        ctx.shadowBlur = 16;
        ctx.shadowColor = effect.color;
        ctx.beginPath();
        ctx.moveTo(effect.from.x, effect.from.y);
        ctx.lineTo(effect.to.x, effect.to.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (effect.type === "burst_telegraph" || effect.type === "burst_flash") {
        if (effect.style === "eruption") {
          ctx.fillStyle = effect.type === "burst_flash" ? "rgba(255, 146, 79, 0.42)" : effect.color;
          ctx.beginPath();
          ctx.arc(effect.position.x, effect.position.y, effect.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 223, 179, 0.72)";
          ctx.lineWidth = 3;
          for (let index = 0; index < 4; index += 1) {
            const angle = (Math.PI * 2 * index) / 4;
            ctx.beginPath();
            ctx.moveTo(effect.position.x + Math.cos(angle) * (effect.radius * 0.25), effect.position.y + Math.sin(angle) * (effect.radius * 0.25));
            ctx.lineTo(effect.position.x + Math.cos(angle) * (effect.radius * 0.82), effect.position.y + Math.sin(angle) * (effect.radius * 0.82));
            ctx.stroke();
          }
        } else if (effect.style === "moon_seal") {
          ctx.fillStyle = effect.type === "burst_flash" ? "rgba(165, 228, 255, 0.32)" : effect.color;
          ctx.beginPath();
          ctx.arc(effect.position.x, effect.position.y, effect.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(221, 248, 255, 0.88)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(effect.position.x, effect.position.y, effect.radius * 0.72, Math.PI * 0.18, Math.PI * 1.82);
          ctx.stroke();
        } else if (effect.style === "nova" || effect.style === "meteor") {
          ctx.fillStyle = effect.color;
          ctx.beginPath();
          ctx.arc(effect.position.x, effect.position.y, effect.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(218, 246, 255, 0.86)";
          ctx.lineWidth = 3;
          for (let index = 0; index < 6; index += 1) {
            const angle = (Math.PI * 2 * index) / 6;
            ctx.beginPath();
            ctx.moveTo(effect.position.x + Math.cos(angle) * (effect.radius * 0.2), effect.position.y + Math.sin(angle) * (effect.radius * 0.2));
            ctx.lineTo(effect.position.x + Math.cos(angle) * (effect.radius * 0.92), effect.position.y + Math.sin(angle) * (effect.radius * 0.92));
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = effect.color;
          ctx.beginPath();
          ctx.arc(effect.position.x, effect.position.y, effect.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (effect.type === "blood_pool") {
        ctx.fillStyle = effect.color;
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, effect.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 162, 184, 0.46)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, effect.radius * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.type === "meteor_target") {
        ctx.fillStyle = effect.color;
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, effect.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(227, 248, 255, 0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, effect.radius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.type === "emerald_bloom") {
        const life = Math.max(0, effect.ttl / 480);
        ctx.globalAlpha = Math.max(0.12, life);
        ctx.fillStyle = effect.color;
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, effect.radius * (1.5 - (life * 0.45)), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(166, 255, 188, 0.88)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, effect.radius * (1.15 - (life * 0.25)), 0, Math.PI * 2);
        ctx.stroke();
        for (let index = 0; index < 5; index += 1) {
          const angle = (Math.PI * 2 * index) / 5;
          ctx.strokeStyle = "rgba(117, 255, 146, 0.72)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(effect.position.x + Math.cos(angle) * (effect.radius * 0.25), effect.position.y + Math.sin(angle) * (effect.radius * 0.25));
          ctx.lineTo(effect.position.x + Math.cos(angle) * (effect.radius * 0.95), effect.position.y + Math.sin(angle) * (effect.radius * 0.95));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (effect.type === "impact") {
        const maxLife = effect.heavy ? 260 : 180;
        const life = Math.max(0, effect.ttl / maxLife);
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = (effect.heavy ? 7 : 4) * life;
        ctx.globalAlpha = Math.max(0.15, life);
        ctx.shadowBlur = effect.heavy ? 18 : 10;
        ctx.shadowColor = effect.color;
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, effect.radius * (1.25 - life * 0.4), 0, Math.PI * 2);
        ctx.stroke();
        if (effect.heavy) {
          for (let index = 0; index < 8; index += 1) {
            const angle = (Math.PI * 2 * index) / 8;
            ctx.beginPath();
            ctx.moveTo(effect.position.x + Math.cos(angle) * (effect.radius * 0.45), effect.position.y + Math.sin(angle) * (effect.radius * 0.45));
            ctx.lineTo(effect.position.x + Math.cos(angle) * (effect.radius * 1.18), effect.position.y + Math.sin(angle) * (effect.radius * 1.18));
            ctx.stroke();
          }
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      } else if (effect.type === "damage_text") {
        const progress = 1 - Math.max(0, effect.ttl / 650);
        ctx.fillStyle = effect.color;
        ctx.strokeStyle = "rgba(7, 15, 25, 0.92)";
        ctx.lineWidth = 4;
        ctx.font = effect.heavy ? "bold 24px Georgia" : "bold 20px Georgia";
        ctx.textAlign = "center";
        ctx.globalAlpha = Math.max(0.1, 1 - progress);
        ctx.strokeText(`${effect.isHealing ? "+" : "-"}${effect.value}`, effect.position.x, effect.position.y - 18 - (progress * 22));
        ctx.fillText(`${effect.isHealing ? "+" : "-"}${effect.value}`, effect.position.x, effect.position.y - 18 - (progress * 22));
        ctx.globalAlpha = 1;
        ctx.textAlign = "start";
      } else if (effect.type === "banner") {
        ctx.fillStyle = effect.color;
        ctx.font = "bold 30px Georgia";
        ctx.textAlign = "center";
        ctx.globalAlpha = Math.max(0.15, effect.ttl / 1600);
        ctx.fillText(effect.text, GAME_WIDTH / 2 + state.camera.x - GAME_WIDTH / 2, 120 + state.camera.y - GAME_HEIGHT / 2);
        ctx.globalAlpha = 1;
        ctx.textAlign = "start";
      }
    }
  });
}

function renderHud(hudLayer, state) {
  if (state.mode !== "arena" && state.mode !== "pause") {
    hudLayer.innerHTML = "";
    return;
  }
  const player = state.player;
  const arena = ARENAS[state.arenaRun.encounterIndex];
  const spellMarkup = state.progression.equippedSpells.map((spellId, index) => {
    const spell = getComputedSpell(state, spellId);
    const cooldown = player ? Math.max(0, player.cooldowns[spellId] ?? 0) : 0;
    return `
      <div class="spell-chip compact active">
        <div class="loadout-row"><strong>${index === 0 ? "Click" : "R"}</strong><span class="tag">${spell.name}</span></div>
        <div class="loadout-row"><span>Mana ${spell.manaCost}</span><span>${cooldown <= 0 ? "Ready" : formatMs(cooldown)}</span></div>
      </div>
    `;
  }).join("");
  const reserveSpellId = state.progression.unlockedSpells.find((spellId) => !state.progression.equippedSpells.includes(spellId));
  const reserveMarkup = reserveSpellId ? (() => {
    const spell = getComputedSpell(state, reserveSpellId);
    const cooldown = player ? Math.max(0, player.cooldowns[reserveSpellId] ?? 0) : 0;
    return `
      <div class="spell-chip compact">
        <div class="loadout-row"><strong>M3</strong><span class="tag">${spell.name}</span></div>
        <div class="loadout-row"><span>Mana ${spell.manaCost}</span><span>${cooldown <= 0 ? "Ready" : formatMs(cooldown)}</span></div>
      </div>
    `;
  })() : "";
  const boss = state.enemies.find((enemy) => enemy.boss);
  const bossDefinition = boss ? ENEMIES[boss.definitionId] : null;
  hudLayer.innerHTML = `
    <div class="hud-top">
      <div class="hud-panel hud-cluster">
        <div class="bar-group">
          <div><strong>${player?.name ?? "Wizard"}</strong></div>
          <div class="hud-inline"><span>HP ${Math.ceil(player?.hp ?? 0)} / ${Math.ceil(player?.stats.maxHp ?? 0)}</span><span>${player?.isInvulnerable ? "Ward" : ""}</span></div>
          <div class="bar"><span class="hp-fill" style="width:${player ? (player.hp / player.stats.maxHp) * 100 : 0}%"></span></div>
          <div class="hud-inline"><span>Mana ${Math.ceil(player?.mana ?? 0)} / ${Math.ceil(player?.stats.maxMana ?? 0)}</span><span>Dash ${player ? (player.dash.cooldownMs <= 0 ? "Ready" : formatMs(player.dash.cooldownMs)) : "Ready"}</span></div>
          <div class="bar"><span class="mana-fill" style="width:${player ? (player.mana / player.stats.maxMana) * 100 : 0}%"></span></div>
        </div>
      </div>
      <div class="hud-panel mini-grid">
        <div class="mini-card"><div class="muted">Region</div><strong>${arena?.regionId ?? "hub"}</strong></div>
        <div class="mini-card"><div class="muted">Boss</div><strong>${state.arenaRun.encounterIndex + 1} / 5</strong></div>
        <div class="mini-card"><div class="muted">Gold</div><strong>${state.progression.gold}</strong></div>
        <div class="mini-card"><div class="muted">Mat</div><strong>${state.progression.materials}</strong></div>
      </div>
    </div>
    <div class="hud-bottom">
      <div class="hud-panel">
        <div class="compact-spells">${spellMarkup}${reserveMarkup}</div>
      </div>
      <div class="hud-panel mini-grid">
        <div class="mini-card"><div class="muted">Weapon</div><strong>${WEAPONS[state.progression.equippedWeapon].name}</strong></div>
        <div class="mini-card"><div class="muted">Armor</div><strong>${ARMORS[state.progression.equippedArmor].name}</strong></div>
      </div>
    </div>
    ${boss ? `
      <div class="hud-panel boss-bar">
        <div class="hud-inline"><strong>${bossDefinition?.name ?? "Boss"}</strong><span class="muted">${Math.ceil(boss.hp)} / ${boss.maxHp}</span></div>
        <div class="bar"><span class="boss-fill" style="width:${(boss.hp / boss.maxHp) * 100}%"></span></div>
      </div>
    ` : ""}
  `;
}

export function getHubMarkup(state) {
  const summary = state.arenaRun.pendingSummary;
  const availableSpells = Object.values(SPELLS).map((spell) => {
    const unlocked = state.progression.unlockedSpells.includes(spell.id);
    const equippedIndex = state.progression.equippedSpells.indexOf(spell.id);
    return `
      <div class="shop-item">
        <div class="loadout-row"><strong>${spell.name}</strong><span class="tag">${spell.school}</span></div>
        <p class="muted">${spell.description}</p>
        <div class="loadout-row"><span>Status</span><span>${equippedIndex >= 0 ? `Equipped (${equippedIndex === 0 ? "Primary" : "Secondary"})` : unlocked ? "Unlocked" : "Locked"}</span></div>
        <div class="button-row">
          <button data-action="equip-spell" data-spell-id="${spell.id}" data-slot-index="0" ${!unlocked || equippedIndex === 0 ? "disabled" : ""}>Equip Primary</button>
          <button data-action="equip-spell" data-spell-id="${spell.id}" data-slot-index="1" ${!unlocked || equippedIndex === 1 ? "disabled" : ""}>Equip Secondary</button>
        </div>
      </div>
    `;
  }).join("");
  const upgradeMarkup = UPGRADES.map((upgrade) => {
    const owned = state.progression.purchasedUpgrades.includes(upgrade.id);
    const affordable = state.progression.gold >= upgrade.costGold && state.progression.materials >= upgrade.costMaterials;
    return `
      <div class="shop-item">
        <div class="loadout-row"><strong>${upgrade.name}</strong><span class="tag">${upgrade.category}</span></div>
        <p class="muted">${upgrade.description}</p>
        <div class="reward-row"><span>Cost</span><span>${upgrade.costGold} gold / ${upgrade.costMaterials} material</span></div>
        <button data-action="buy-upgrade" data-upgrade-id="${upgrade.id}" ${owned || !affordable ? "disabled" : ""}>${owned ? "Purchased" : "Buy Upgrade"}</button>
      </div>
    `;
  }).join("");
  const weaponMarkup = Object.values(WEAPONS).map((item) => `
    <div class="shop-item">
      <div class="loadout-row"><strong>${item.name}</strong><span class="tag">Weapon</span></div>
      <p class="muted">${item.description}</p>
      <button data-action="equip-item" data-item-type="weapon" data-item-id="${item.id}" ${state.progression.equippedWeapon === item.id ? "disabled" : ""}>${state.progression.equippedWeapon === item.id ? "Equipped" : "Equip"}</button>
    </div>
  `).join("");
  const armorMarkup = Object.values(ARMORS).map((item) => `
    <div class="shop-item">
      <div class="loadout-row"><strong>${item.name}</strong><span class="tag">Armor</span></div>
      <p class="muted">${item.description}</p>
      <button data-action="equip-item" data-item-type="armor" data-item-id="${item.id}" ${state.progression.equippedArmor === item.id ? "disabled" : ""}>${state.progression.equippedArmor === item.id ? "Equipped" : "Equip"}</button>
    </div>
  `).join("");
  return `
    <div class="overlay-card">
      <h2>Hub</h2>
      <p class="muted">Spend rewards, tune your two-spell loadout, and enter the next arena encounter.</p>
      ${summary ? `
        <div class="summary-card">
          <div class="reward-row"><span>Cleared</span><strong>${summary.arenaName}</strong></div>
          <div class="reward-row"><span>Gold gained</span><strong>${summary.gold}</strong></div>
          <div class="reward-row"><span>Materials gained</span><strong>${summary.materials}</strong></div>
          <div class="reward-row"><span>Next arena</span><strong>${summary.nextArena}</strong></div>
        </div>
      ` : ""}
      <div class="button-row" style="margin-bottom:16px;">
        <button data-action="set-hub-tab" data-tab="summary">Summary</button>
        <button data-action="set-hub-tab" data-tab="spells">Spells</button>
        <button data-action="set-hub-tab" data-tab="upgrades">Upgrades</button>
        <button data-action="set-hub-tab" data-tab="equipment">Equipment</button>
      </div>
      ${state.ui.selectedHubTab === "spells" ? `<div class="shop-grid">${availableSpells}</div>` : ""}
      ${state.ui.selectedHubTab === "upgrades" ? `<div class="shop-grid">${upgradeMarkup}</div>` : ""}
      ${state.ui.selectedHubTab === "equipment" ? `<div class="card-grid">${weaponMarkup}${armorMarkup}</div>` : ""}
      ${state.ui.selectedHubTab === "summary" ? `
        <div class="card-grid">
          <div class="summary-card">
            <div class="reward-row"><span>Total Gold</span><strong>${state.progression.gold}</strong></div>
            <div class="reward-row"><span>Total Materials</span><strong>${state.progression.materials}</strong></div>
            <div class="reward-row"><span>Purchased Upgrades</span><strong>${state.progression.purchasedUpgrades.length}</strong></div>
          </div>
          <div class="summary-card">
            <div class="reward-row"><span>Primary Spell</span><strong>${SPELLS[state.progression.equippedSpells[0]].name}</strong></div>
            <div class="reward-row"><span>Secondary Spell</span><strong>${SPELLS[state.progression.equippedSpells[1]].name}</strong></div>
            <div class="reward-row"><span>Loadout</span><strong>${WEAPONS[state.progression.equippedWeapon].name} / ${ARMORS[state.progression.equippedArmor].name}</strong></div>
          </div>
        </div>
      ` : ""}
      <div class="button-row" style="margin-top:16px;">
        <button data-action="start-next-encounter">Enter Arena</button>
        <button data-action="return-title">Back To Title</button>
      </div>
    </div>
  `;
}
