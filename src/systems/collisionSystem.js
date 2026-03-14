import { PICKUP_TYPES } from "../game/config.js";
import { clamp, distanceBetween, randomFloat, removeDead } from "../game/helpers.js";
import { createPickup } from "../entities/pickup.js";

export function updateCollisionSystem(state) {
  const player = state.player;
  if (!player || !player.alive) {
    return;
  }
  for (const projectile of state.projectiles) {
    projectile.position.x += projectile.velocity.x * (state.time.step / 1000);
    projectile.position.y += projectile.velocity.y * (state.time.step / 1000);
    projectile.ttl -= state.time.step;
    if (projectile.ttl <= 0) {
      projectile.remove = true;
      continue;
    }
    if (projectile.team === "player") {
      for (const enemy of state.enemies) {
        if (!enemy.alive || enemy.hp <= 0) {
          continue;
        }
        if (distanceBetween(projectile.position, enemy.position) <= projectile.radius + enemy.radius) {
          if (enemy.shieldMs > 0) {
            spawnImpactEffect(state, enemy.position, "#8dd6ff", enemy.radius + 12, true);
            projectile.remove = true;
            break;
          }
          enemy.hp -= projectile.damage;
          enemy.damageFlashMs = 100;
          spawnDamageFeedback(state, enemy.position, projectile.damage, "#ffe596", false, projectile.damage >= 18);
          spawnImpactEffect(state, enemy.position, projectile.color ?? "#ffffff", enemy.radius + 10, true);
          if (projectile.slow) {
            enemy.statusEffects.push({ type: "slow", factor: projectile.slow.factor, remainingMs: projectile.slow.durationMs });
          }
          projectile.remove = true;
          break;
        }
      }
    } else if (projectile.team === "enemy") {
      if (!player.isInvulnerable && distanceBetween(projectile.position, player.position) <= projectile.radius + player.radius) {
        damagePlayer(state, projectile.damage);
        spawnImpactEffect(state, player.position, projectile.color ?? "#ff9a72", player.radius + 12, true);
        projectile.remove = true;
      }
    }
    const bounds = state.arenaRun.bounds ?? { width: 1280, height: 720 };
    if (projectile.position.x < -40 || projectile.position.y < -40 || projectile.position.x > bounds.width + 40 || projectile.position.y > bounds.height + 40) {
      projectile.remove = true;
    }
  }

  for (const enemy of state.enemies) {
    if (!enemy.alive) {
      continue;
    }
    if (!player.isInvulnerable && distanceBetween(enemy.position, player.position) <= enemy.radius + player.radius) {
      damagePlayer(state, enemy.contactDamage * (state.time.step / 1000));
    }
  }

  for (const effect of state.effects) {
    effect.ttl -= state.time.step;
    if (effect.type === "burst_telegraph" && effect.ttl <= 0) {
      if (!player.isInvulnerable && distanceBetween(effect.position, player.position) <= effect.radius) {
        damagePlayer(state, effect.damage);
        spawnImpactEffect(state, player.position, "#ffb06b", player.radius + 22, true);
      }
      effect.remove = true;
      state.effects.push({
        type: "burst_flash",
        position: { ...effect.position },
        radius: effect.radius,
        ttl: 220,
        color: "rgba(255, 132, 69, 0.62)",
        style: effect.style ?? "burst",
      });
    }
    if (effect.type === "blood_pool") {
      if (!player.isInvulnerable && distanceBetween(effect.position, player.position) <= effect.radius) {
        damagePlayer(state, effect.damagePerSecond * (state.time.step / 1000));
      }
    }
    if (effect.type === "meteor_target" && effect.ttl <= 0) {
      if (!player.isInvulnerable && distanceBetween(effect.position, player.position) <= effect.radius) {
        damagePlayer(state, effect.damage);
      }
      spawnImpactEffect(state, effect.position, "#8fd7ff", effect.radius + 20, true);
      effect.remove = true;
      state.effects.push({
        type: "burst_flash",
        position: { ...effect.position },
        radius: effect.radius,
        ttl: 240,
        color: "rgba(136, 214, 255, 0.48)",
        style: "meteor",
      });
    }
    if (effect.ttl <= 0) {
      effect.remove = true;
    }
  }

  collectPickups(state);
  cleanupDefeatedEnemies(state);
  state.projectiles = removeDead(state.projectiles);
  state.effects = removeDead(state.effects);
  state.pickups = removeDead(state.pickups);
}

function cleanupDefeatedEnemies(state) {
  for (const enemy of state.enemies) {
    if (enemy.alive && enemy.hp <= 0) {
      enemy.alive = false;
    }
    if (!enemy.alive && !enemy.rewarded) {
      enemy.rewarded = true;
      rewardEnemyDeath(state, enemy);
      if (enemy.parentSummonerId) {
        const summoner = state.enemies.find((entry) => entry.id === enemy.parentSummonerId);
        if (summoner) {
          summoner.summonCount = Math.max(0, summoner.summonCount - 1);
        }
      }
      enemy.remove = true;
    }
  }
  state.enemies = state.enemies.filter((enemy) => !enemy.remove);
}

function rewardEnemyDeath(state, enemy) {
  const goldAmount = Math.round(enemy.rewards.goldMin + ((enemy.rewards.goldMax - enemy.rewards.goldMin) * 0.5));
  state.pickups.push(createPickup(nextEntityId(state), {
    pickupType: PICKUP_TYPES.GOLD,
    amount: goldAmount,
    position: { ...enemy.position },
    velocity: { x: (randomFloat(state, -0.5, 0.5)) * 24, y: (randomFloat(state, -0.5, 0.5)) * 24 },
  }));
  if (enemy.boss && state.arenaRun.encounterIndex < 4) {
    state.pickups.push(createPickup(nextEntityId(state), {
      pickupType: PICKUP_TYPES.HEAL,
      amount: 42,
      radius: 16,
      position: { x: enemy.position.x + 18, y: enemy.position.y - 10 },
      velocity: { x: (randomFloat(state, -0.5, 0.5)) * 18, y: (randomFloat(state, -0.5, 0.5)) * 18 },
      ttl: 18000,
    }));
  }
  if (enemy.rewards.materialDrop === "elite_only" || enemy.rewards.materialDrop === "boss_only") {
    const materials = enemy.boss ? 3 : 1;
    state.progression.materials += materials;
    state.arenaRun.encounterRewardMaterials += materials;
  }
}

function collectPickups(state) {
  const player = state.player;
  for (const pickup of state.pickups) {
    pickup.ttl -= state.time.step;
    pickup.position.x += pickup.velocity.x * (state.time.step / 1000);
    pickup.position.y += pickup.velocity.y * (state.time.step / 1000);
    pickup.velocity.x *= 0.95;
    pickup.velocity.y *= 0.95;
    const distance = distanceBetween(pickup.position, player.position);
    if (distance <= player.stats.pickupRadius) {
      const dx = player.position.x - pickup.position.x;
      const dy = player.position.y - pickup.position.y;
      pickup.velocity.x += clamp(dx, -80, 80) * 0.2;
      pickup.velocity.y += clamp(dy, -80, 80) * 0.2;
    }
    if (distance <= pickup.radius + player.radius + 6) {
      if (pickup.pickupType === PICKUP_TYPES.GOLD) {
        state.progression.gold += pickup.amount;
        state.arenaRun.encounterRewardGold += pickup.amount;
      }
      if (pickup.pickupType === PICKUP_TYPES.HEAL) {
        player.hp = Math.min(player.stats.maxHp, player.hp + pickup.amount);
        player.mana = Math.min(player.stats.maxMana, player.mana + pickup.amount * 0.8);
        spawnDamageFeedback(state, player.position, -pickup.amount, "#8dffb6", true, true);
      }
      pickup.remove = true;
    }
    if (pickup.ttl <= 0) {
      pickup.remove = true;
    }
  }
}

export function damagePlayer(state, amount) {
  const player = state.player;
  if (!player || !player.alive) {
    return;
  }
  const mitigated = Math.max(0.35, amount - player.stats.armor * 0.15);
  player.hp = Math.max(0, player.hp - mitigated);
  player.damageFlashMs = 150;
  state.runtime.lastDamageAt = state.time.now;
  spawnDamageFeedback(state, player.position, mitigated, "#ff8d8d", false, mitigated >= 18);
  if (player.hp <= 0) {
    player.alive = false;
    state.mode = "gameOver";
  }
}

function spawnImpactEffect(state, position, color, radius, heavy = false) {
  state.effects.push({
    type: "impact",
    position: { ...position },
    radius,
    ttl: heavy ? 260 : 180,
    color,
    heavy,
  });
}

function spawnDamageFeedback(state, position, amount, color, isHealing = false, heavy = false) {
  state.effects.push({
    type: "damage_text",
    position: { ...position },
    ttl: 650,
    value: Math.max(1, Math.round(Math.abs(amount))),
    color,
    rise: 0,
    isHealing,
    heavy,
  });
}

function nextEntityId(state) {
  const id = `entity_${state.runtime.nextEntityId}`;
  state.runtime.nextEntityId += 1;
  return id;
}
