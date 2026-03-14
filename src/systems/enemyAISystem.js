import { ENEMIES } from "../data/enemies.js";
import { createEnemy } from "../entities/enemy.js";
import { clamp, normalize, randomFloat } from "../game/helpers.js";
import { createEnemyProjectile } from "./spellSystem.js";

export function updateEnemyAISystem(state) {
  const player = state.player;
  if (!player || !player.alive) {
    return;
  }
  for (const enemy of state.enemies) {
    if (!enemy.alive) {
      continue;
    }
    enemy.damageFlashMs = Math.max(0, enemy.damageFlashMs - state.time.step);
    enemy.attackTimerMs -= state.time.step;
    applyEnemyStatuses(enemy, state.time.step);
    const toPlayer = { x: player.position.x - enemy.position.x, y: player.position.y - enemy.position.y };
    const distance = Math.max(1, Math.hypot(toPlayer.x, toPlayer.y));
    const direction = normalize(toPlayer.x, toPlayer.y);
    const speedModifier = enemy.slowFactor ?? 1;

    if (enemy.aiType === "kite") {
      const move = distance < enemy.preferredDistance ? -1 : 1;
      enemy.velocity.x = direction.x * enemy.speed * move * 0.75 * speedModifier;
      enemy.velocity.y = direction.y * enemy.speed * move * 0.75 * speedModifier;
      if (enemy.attackTimerMs <= 0 && distance <= enemy.attackRange) {
        createEnemyProjectile(state, enemy, direction, enemy.attackDamage, { color: "#ffc285" });
        enemy.attackTimerMs = enemy.attackCooldownMs;
      }
    } else if (enemy.aiType === "summon") {
      enemy.velocity.x = direction.x * enemy.speed * 0.45 * speedModifier;
      enemy.velocity.y = direction.y * enemy.speed * 0.45 * speedModifier;
      if (enemy.attackTimerMs <= 0) {
        if (enemy.summonCount < enemy.maxSummons) {
          spawnSummonedWisp(state, enemy);
          enemy.summonCount += 1;
        } else if (distance <= enemy.attackRange) {
          createEnemyProjectile(state, enemy, direction, enemy.attackDamage, { color: "#c7b4ff" });
        }
        enemy.attackTimerMs = enemy.attackCooldownMs;
      }
    } else if (enemy.aiType === "tank") {
      enemy.velocity.x = direction.x * enemy.speed * speedModifier;
      enemy.velocity.y = direction.y * enemy.speed * speedModifier;
    } else if (enemy.aiType === "bossPattern") {
      updateBossPattern(state, enemy, direction, distance);
    }
    enemy.position.x += enemy.velocity.x * (state.time.step / 1000);
    enemy.position.y += enemy.velocity.y * (state.time.step / 1000);
    enemy.position.x = clamp(enemy.position.x, enemy.radius, getArenaBounds(state).width - enemy.radius);
    enemy.position.y = clamp(enemy.position.y, enemy.radius, getArenaBounds(state).height - enemy.radius);
  }
  resolveEnemySeparation(state);
}

function applyEnemyStatuses(enemy, stepMs) {
  enemy.slowFactor = 1;
  enemy.statusEffects = enemy.statusEffects.filter((effect) => {
    effect.remainingMs -= stepMs;
    if (effect.type === "slow") {
      enemy.slowFactor = Math.min(enemy.slowFactor, 1 - effect.factor);
    }
    return effect.remainingMs > 0;
  });
}

function spawnSummonedWisp(state, summoner) {
  const angle = randomFloat(state, 0, Math.PI * 2);
  const position = {
    x: summoner.position.x + Math.cos(angle) * 40,
    y: summoner.position.y + Math.sin(angle) * 40,
  };
  const wisp = createEnemy(nextEntityId(state), ENEMIES.summoned_wisp, position);
  wisp.parentSummonerId = summoner.id;
  state.enemies.push(wisp);
}

function updateBossPattern(state, boss, direction, distance) {
  boss.phase = boss.hp <= boss.maxHp * 0.5 ? 2 : 1;
  boss.patternTimerMs -= state.time.step;
  boss.telegraphMs = Math.max(0, boss.telegraphMs - state.time.step);
  const moveDirection = distance > 250 ? 1 : -0.3;
  boss.velocity.x = direction.x * boss.speed * moveDirection;
  boss.velocity.y = direction.y * boss.speed * moveDirection;
  if (boss.patternTimerMs > 0) {
    return;
  }
  switch (boss.definitionId) {
    case "qwibus":
      castQwibusPattern(state, boss, direction);
      break;
    case "graft_lord":
      castGraftPattern(state, boss, direction);
      break;
    case "moon_queen":
      castMoonPattern(state, boss, direction);
      break;
    case "blood_tyrant":
      castBloodPattern(state, boss, direction);
      break;
    default:
      castStarbreakerPattern(state, boss, direction);
      break;
  }
  boss.patternIndex += 1;
}

function castQwibusPattern(state, boss, direction) {
  const aimAngle = Math.atan2(direction.y, direction.x);
  const pattern = boss.patternIndex % 5;
  const player = state.player;

  if (pattern === 0) {
    boss.telegraphMs = 420;
    for (let burst = 0; burst < (boss.phase === 2 ? 2 : 1); burst += 1) {
      for (let shot = 0; shot < (boss.phase === 2 ? 5 : 4); shot += 1) {
        const spread = -0.28 + shot * 0.18;
        const angle = aimAngle + spread + (burst * 0.06);
        createEnemyProjectile(state, boss, { x: Math.cos(angle), y: Math.sin(angle) }, boss.attackDamage + 2, {
          speed: boss.projectileSpeed + 115 + (burst * 24),
          radius: 12,
          color: "#ff9b64",
          glow: "#ffd0a8",
          variant: "ember_lance",
        });
      }
    }
    boss.patternTimerMs = boss.phase === 2 ? 930 : 1120;
    return;
  }

  if (pattern === 1) {
    boss.telegraphMs = 860;
    const eruptionCount = boss.phase === 2 ? 5 : 4;
    for (let index = 0; index < eruptionCount; index += 1) {
      const angle = aimAngle + ((Math.PI * 2 * index) / eruptionCount) * 0.92;
      const distance = boss.phase === 2 ? 118 : 96;
      const anchor = player ? {
        x: player.position.x + Math.cos(angle) * distance,
        y: player.position.y + Math.sin(angle) * distance,
      } : {
        x: boss.position.x + Math.cos(angle) * distance,
        y: boss.position.y + Math.sin(angle) * distance,
      };
      pushBurstTelegraph(
        state,
        anchor,
        boss.phase === 2 ? 92 : 78,
        780 + (index * 70),
        "rgba(255, 124, 73, 0.24)",
        boss.attackDamage + 10,
        "eruption",
      );
    }
    boss.patternTimerMs = 1420;
    return;
  }

  if (pattern === 2) {
    boss.telegraphMs = 680;
    const shots = boss.phase === 2 ? 10 : 7;
    for (let index = 0; index < shots; index += 1) {
      const angle = ((Math.PI * 2 * index) / shots) + (boss.patternIndex * 0.07);
      createEnemyProjectile(state, boss, { x: Math.cos(angle), y: Math.sin(angle) }, boss.attackDamage - 1, {
        speed: boss.projectileSpeed - 105,
        radius: 13,
        color: "#d7a16a",
        glow: "#ffcf98",
        variant: "magma_stone",
      });
    }
    boss.patternTimerMs = 1620;
    return;
  }

  if (pattern === 3) {
    boss.telegraphMs = 560;
    for (let fan = 0; fan < 2; fan += 1) {
      for (let shot = 0; shot < (boss.phase === 2 ? 6 : 5); shot += 1) {
        const spread = -0.8 + shot * 0.32;
        const angle = aimAngle + spread + fan * 0.12;
        createEnemyProjectile(state, boss, { x: Math.cos(angle), y: Math.sin(angle) }, boss.attackDamage + 1, {
          speed: boss.projectileSpeed + 46,
          radius: 11,
          color: fan === 0 ? "#ffa55e" : "#ffd0a2",
          glow: fan === 0 ? "#ffca87" : "#fff0cb",
          variant: fan === 0 ? "axe_arc" : "cleaver_arc",
        });
      }
    }
    boss.patternTimerMs = boss.phase === 2 ? 980 : 1180;
    return;
  }

  boss.telegraphMs = 720;
  for (let ring = 0; ring < (boss.phase === 2 ? 3 : 2); ring += 1) {
    const count = 6 + ring * 2;
    for (let index = 0; index < count; index += 1) {
      const angle = ((Math.PI * 2 * index) / count) + ring * 0.2;
      createEnemyProjectile(state, boss, { x: Math.cos(angle), y: Math.sin(angle) }, boss.attackDamage + ring, {
        speed: boss.projectileSpeed + 40 + (ring * 35),
        radius: 10 + ring,
        color: ring % 2 === 0 ? "#ffb87a" : "#ff8e4b",
        glow: ring % 2 === 0 ? "#ffdcb1" : "#ffb674",
        variant: ring === 0 ? "magma_stone" : "ember_lance",
      });
    }
  }
  boss.patternTimerMs = 1460;
}

function castGraftPattern(state, boss, direction) {
  boss.telegraphMs = 780;
  if (boss.patternIndex % 2 === 0) {
    state.effects.push({
      type: "burst_telegraph",
      position: { ...boss.position },
      radius: boss.phase === 2 ? 220 : 180,
      ttl: 850,
      color: "rgba(255, 152, 104, 0.32)",
      damage: boss.attackDamage + 10,
    });
  } else {
    for (let index = 0; index < 5; index += 1) {
      const spread = -0.5 + index * 0.25;
      const angle = Math.atan2(direction.y, direction.x) + spread;
      createEnemyProjectile(state, boss, { x: Math.cos(angle), y: Math.sin(angle) }, boss.attackDamage, {
        speed: boss.projectileSpeed + 20,
        radius: 12,
        color: "#f7a56f",
      });
    }
  }
  boss.patternTimerMs = boss.phase === 2 ? 1250 : 1550;
}

function castMoonPattern(state, boss, direction) {
  boss.telegraphMs = 820;
  if (boss.patternIndex % 2 === 0) {
    for (let index = 0; index < (boss.phase === 2 ? 8 : 6); index += 1) {
      const angle = Math.atan2(direction.y, direction.x) + (-0.65 + index * 0.24);
      createEnemyProjectile(state, boss, { x: Math.cos(angle), y: Math.sin(angle) }, boss.attackDamage - 3, {
        speed: boss.projectileSpeed - 40,
        radius: 11,
        color: "#8cd4ff",
      });
    }
  } else {
    state.effects.push({
      type: "burst_telegraph",
      position: { ...boss.position },
      radius: boss.phase === 2 ? 205 : 165,
      ttl: 980,
      color: "rgba(135, 203, 255, 0.26)",
      damage: boss.attackDamage + 8,
    });
  }
  boss.patternTimerMs = boss.phase === 2 ? 1280 : 1620;
}

function castBloodPattern(state, boss, direction) {
  boss.telegraphMs = 700;
  for (let ring = 0; ring < (boss.phase === 2 ? 2 : 1); ring += 1) {
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6 + ring * 0.14;
      createEnemyProjectile(state, boss, { x: Math.cos(angle), y: Math.sin(angle) }, boss.attackDamage, {
        speed: boss.projectileSpeed + ring * 60,
        radius: 10 + ring,
        color: "#d94f6d",
      });
    }
  }
  state.effects.push({
    type: "burst_telegraph",
    position: { ...boss.position },
    radius: boss.phase === 2 ? 150 : 120,
    ttl: 720,
    color: "rgba(217, 79, 109, 0.22)",
    damage: boss.attackDamage + 6,
  });
  boss.patternTimerMs = boss.phase === 2 ? 1200 : 1500;
}

function castStarbreakerPattern(state, boss, direction) {
  if (boss.patternIndex % 2 === 0) {
    boss.telegraphMs = 650;
    for (let index = 0; index < (boss.phase === 2 ? 10 : 7); index += 1) {
      const spread = -0.65 + (index / Math.max(1, (boss.phase === 2 ? 9 : 6))) * 1.3;
      const angle = Math.atan2(direction.y, direction.x) + spread;
      createEnemyProjectile(state, boss, { x: Math.cos(angle), y: Math.sin(angle) }, boss.attackDamage, {
        speed: boss.projectileSpeed + boss.phase * 35,
        radius: 12,
        color: "#77c8ff",
      });
    }
  } else {
    boss.telegraphMs = 950;
    state.effects.push({
      type: "burst_telegraph",
      position: { ...boss.position },
      radius: boss.phase === 2 ? 240 : 190,
      ttl: 950,
      color: "rgba(111, 196, 255, 0.3)",
      damage: boss.attackDamage + 12,
    });
  }
  boss.patternTimerMs = boss.phase === 2 ? 1180 : 1500;
}

function resolveEnemySeparation(state) {
  for (let i = 0; i < state.enemies.length; i += 1) {
    const a = state.enemies[i];
    if (!a.alive) {
      continue;
    }
    for (let j = i + 1; j < state.enemies.length; j += 1) {
      const b = state.enemies[j];
      if (!b.alive) {
        continue;
      }
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const distance = Math.hypot(dx, dy) || 1;
      const minDistance = a.radius + b.radius + 6;
      if (distance >= minDistance) {
        continue;
      }
      const overlap = (minDistance - distance) / 2;
      const nx = dx / distance;
      const ny = dy / distance;
      a.position.x -= nx * overlap;
      a.position.y -= ny * overlap;
      b.position.x += nx * overlap;
      b.position.y += ny * overlap;
    }
  }
}

function getArenaBounds(state) {
  return state.arenaRun.bounds ?? { width: 1280, height: 720 };
}

function pushBurstTelegraph(state, position, radius, ttl, color, damage, style = "burst") {
  state.effects.push({
    type: "burst_telegraph",
    position: { ...position },
    radius,
    ttl,
    color,
    damage,
    style,
  });
}

function nextEntityId(state) {
  const id = `entity_${state.runtime.nextEntityId}`;
  state.runtime.nextEntityId += 1;
  return id;
}
