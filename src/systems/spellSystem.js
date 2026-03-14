import { createProjectile } from "../entities/projectile.js";
import { getComputedSpell } from "./progressionSystem.js";
import { angleBetween, distanceBetween, normalize } from "../game/helpers.js";

export function updateSpellSystem(state) {
  const player = state.player;
  if (!player || !player.alive) {
    return;
  }
  for (const spellId of Object.keys(player.cooldowns)) {
    player.cooldowns[spellId] = Math.max(0, player.cooldowns[spellId] - state.time.step);
  }
  const equipped = state.progression.equippedSpells;
  const reserveSpell = state.progression.unlockedSpells.includes("ice_shard") ? "ice_shard" : null;
  if (state.input.primaryPressed && equipped[0]) {
    tryCastSpell(state, equipped[0]);
  }
  if (state.input.spellPressed[1] && equipped[1]) {
    tryCastSpell(state, equipped[1]);
  }
  if (state.input.spellPressed[2] && reserveSpell) {
    tryCastSpell(state, reserveSpell);
  }
}

export function tryCastSpell(state, spellId) {
  const player = state.player;
  const spell = getComputedSpell(state, spellId);
  const cooldown = player.cooldowns[spellId] ?? 0;
  if (cooldown > 0 || player.mana < spell.manaCost) {
    return false;
  }
  player.mana -= spell.manaCost;
  player.cooldowns[spellId] = spell.cooldownMs;
  switch (spell.effectHandlerId) {
    case "spawn_fireball":
      spawnProjectileFromPlayer(state, spell, { damageScale: 1 });
      break;
    case "spawn_shadow_bolt":
      spawnProjectileFromPlayer(state, spell, { damageScale: spell.projectileScale ?? 1 });
      break;
    case "spawn_ice_shard":
      spawnProjectileFromPlayer(state, spell, { damageScale: 1, slow: { factor: spell.slowStrength, durationMs: 1800 } });
      break;
    default:
      return false;
  }
  return true;
}

function spawnProjectileFromPlayer(state, spell, options) {
  const player = state.player;
  const direction = normalize(state.input.aimWorldX - player.position.x, state.input.aimWorldY - player.position.y);
  const closeBurst = player.stats.closeBurstMultiplier > 1 && distanceBetween(player.position, { x: state.input.aimWorldX, y: state.input.aimWorldY }) < 180
    ? player.stats.closeBurstMultiplier
    : 1;
  state.projectiles.push(createProjectile(nextEntityId(state), {
    owner: "player",
    team: "player",
    spellId: spell.id,
    position: {
      x: player.position.x + direction.x * 26,
      y: player.position.y + direction.y * 26,
    },
    velocity: {
      x: direction.x * spell.projectileSpeed,
      y: direction.y * spell.projectileSpeed,
    },
    radius: spell.radius,
    damage: Math.round(spell.damage * options.damageScale * closeBurst),
    ttl: 1600,
    color: spell.color,
    slow: options.slow ?? null,
    glow: spell.id === "fireball" ? "#ffb47a" : spell.id === "chain_lightning" ? "#b494ff" : "#aaf5ff",
  }));
}

export function createEnemyProjectile(state, enemy, direction, damage, options = {}) {
  state.projectiles.push(createProjectile(nextEntityId(state), {
    owner: enemy.id,
    enemyId: enemy.id,
    team: "enemy",
    position: {
      x: enemy.position.x + direction.x * (enemy.radius + 8),
      y: enemy.position.y + direction.y * (enemy.radius + 8),
    },
    velocity: {
      x: direction.x * (options.speed ?? enemy.projectileSpeed ?? 240),
      y: direction.y * (options.speed ?? enemy.projectileSpeed ?? 240),
    },
    radius: options.radius ?? 8,
    damage,
    ttl: options.ttl ?? 2200,
    color: options.color ?? "#ffb07f",
    glow: options.glow ?? options.color ?? "#ffb07f",
    variant: options.variant ?? "orb",
  }));
}

export function updateFacingAngle(state) {
  const player = state.player;
  if (!player) {
    return;
  }
  player.facingAngle = angleBetween(player.position, { x: state.input.aimWorldX, y: state.input.aimWorldY });
}

function nextEntityId(state) {
  const id = `entity_${state.runtime.nextEntityId}`;
  state.runtime.nextEntityId += 1;
  return id;
}
