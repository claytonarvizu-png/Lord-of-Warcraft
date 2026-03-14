import {
  ALL_SPELL_IDS,
  DEFAULT_ARMOR,
  DEFAULT_EQUIPPED_SPELLS,
  DEFAULT_UNLOCKED_SPELLS,
  DEFAULT_WEAPON,
  PLAYER_BASE_STATS,
  SAVE_KEY,
  SAVE_VERSION,
} from "../game/config.js";
import { ARMORS, UPGRADES, WEAPONS } from "../data/upgrades.js";
import { SPELLS } from "../data/spells.js";
import { clamp } from "../game/helpers.js";

export function loadProgression(state) {
  if (typeof window === "undefined" || !window.localStorage) {
    state.runtime.saveAvailable = false;
    return;
  }
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return;
    }
    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION || !data.progression) {
      return;
    }
    const progression = data.progression;
    state.progression.gold = Number.isFinite(progression.gold) ? progression.gold : 0;
    state.progression.materials = Number.isFinite(progression.materials) ? progression.materials : 0;
    state.progression.unlockedSpells = Array.isArray(progression.unlockedSpells)
      ? progression.unlockedSpells.filter((id) => ALL_SPELL_IDS.includes(id))
      : [...DEFAULT_UNLOCKED_SPELLS];
    state.progression.spellLevels = { ...Object.fromEntries(ALL_SPELL_IDS.map((id) => [id, 1])), ...(progression.spellLevels ?? {}) };
    state.progression.purchasedUpgrades = Array.isArray(progression.purchasedUpgrades) ? progression.purchasedUpgrades : [];
    state.progression.equippedSpells = Array.isArray(progression.equippedSpells) && progression.equippedSpells.length === 2
      ? progression.equippedSpells.filter((id) => ALL_SPELL_IDS.includes(id))
      : [...DEFAULT_EQUIPPED_SPELLS];
    state.progression.equippedWeapon = WEAPONS[progression.equippedWeapon] ? progression.equippedWeapon : DEFAULT_WEAPON;
    state.progression.equippedArmor = ARMORS[progression.equippedArmor] ? progression.equippedArmor : DEFAULT_ARMOR;
  } catch {
    state.runtime.saveAvailable = false;
  }
  ensureSpellAvailability(state);
  recalculateDerivedStats(state);
}

export function saveProgression(state) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, progression: state.progression }));
  } catch {
    state.runtime.saveAvailable = false;
  }
}

export function ensureSpellAvailability(state) {
  const unlocked = new Set([...DEFAULT_UNLOCKED_SPELLS, ...state.progression.unlockedSpells]);
  for (const equipped of [...state.progression.equippedSpells]) {
    if (!state.progression.unlockedSpells.includes(equipped)) {
      unlocked.add(equipped);
    }
  }
  if (
    state.progression.equippedSpells.length !== 2
    || !state.progression.equippedSpells.every((id) => state.progression.unlockedSpells.includes(id))
    || state.progression.equippedSpells[0] === state.progression.equippedSpells[1]
  ) {
    state.progression.equippedSpells = [...DEFAULT_EQUIPPED_SPELLS];
  }
  for (const equipped of state.progression.equippedSpells) {
    unlocked.add(equipped);
  }
  state.progression.unlockedSpells = [...unlocked];
}

export function recalculateDerivedStats(state) {
  const modifiers = {
    maxHp: 0,
    maxMana: 0,
    manaRegen: 0,
    moveSpeed: 0,
    dashCooldownMs: 0,
    spellPower: 1,
    cooldownMultiplier: 1,
    manaCostMultiplier: 1,
    armor: 0,
    pickupRadius: 0,
    closeBurstMultiplier: 1,
  };

  applyModifierBundle(modifiers, WEAPONS[state.progression.equippedWeapon]?.modifiers);
  applyModifierBundle(modifiers, ARMORS[state.progression.equippedArmor]?.modifiers);

  for (const upgradeId of state.progression.purchasedUpgrades) {
    const upgrade = UPGRADES.find((item) => item.id === upgradeId);
    if (upgrade) {
      applyUpgradeModifier(modifiers, upgrade.upgradeHandlerId, state);
    }
  }

  const derived = {
    ...PLAYER_BASE_STATS,
    maxHp: PLAYER_BASE_STATS.maxHp + modifiers.maxHp,
    maxMana: PLAYER_BASE_STATS.maxMana + modifiers.maxMana,
    manaRegen: PLAYER_BASE_STATS.manaRegen + modifiers.manaRegen,
    moveSpeed: PLAYER_BASE_STATS.moveSpeed + modifiers.moveSpeed,
    dashCooldownMs: Math.round((PLAYER_BASE_STATS.dashCooldownMs + modifiers.dashCooldownMs) * modifiers.cooldownMultiplier),
    dashDurationMs: PLAYER_BASE_STATS.dashDurationMs,
    dashSpeed: PLAYER_BASE_STATS.dashSpeed,
    iFrameMs: PLAYER_BASE_STATS.iFrameMs,
    spellPower: PLAYER_BASE_STATS.spellPower * modifiers.spellPower,
    cooldownMultiplier: modifiers.cooldownMultiplier,
    manaCostMultiplier: modifiers.manaCostMultiplier,
    armor: PLAYER_BASE_STATS.armor + modifiers.armor,
    pickupRadius: PLAYER_BASE_STATS.pickupRadius + modifiers.pickupRadius,
    closeBurstMultiplier: PLAYER_BASE_STATS.closeBurstMultiplier * modifiers.closeBurstMultiplier,
  };

  state.runtime.playerDerivedStats = derived;
  if (state.player) {
    state.player.stats = { ...derived };
    state.player.manaRegen = derived.manaRegen;
    state.player.hp = clamp(state.player.hp, 0, derived.maxHp);
    state.player.mana = clamp(state.player.mana, 0, derived.maxMana);
  }
}

function applyModifierBundle(target, modifiers) {
  if (!modifiers) {
    return;
  }
  for (const [key, value] of Object.entries(modifiers)) {
    if (["spellPower", "cooldownMultiplier", "manaCostMultiplier", "closeBurstMultiplier"].includes(key)) {
      target[key] *= value;
    } else {
      target[key] += value;
    }
  }
}

function applyUpgradeModifier(modifiers, handlerId, state) {
  switch (handlerId) {
    case "fireball_damage_up":
      state.progression.spellLevels.fireball = 2;
      modifiers.spellPower *= 1.08;
      break;
    case "chain_targets_up":
      state.progression.spellLevels.chain_lightning = 2;
      break;
    case "ice_shard_slow_up":
      state.progression.spellLevels.ice_shard = 2;
      if (!state.progression.unlockedSpells.includes("ice_shard")) {
        state.progression.unlockedSpells.push("ice_shard");
      }
      break;
    case "mana_efficiency_up":
      modifiers.manaCostMultiplier *= 0.88;
      break;
    case "max_hp_up":
      modifiers.maxHp += 24;
      break;
    case "max_mana_up":
      modifiers.maxMana += 30;
      break;
    case "dash_cooldown_up":
      modifiers.cooldownMultiplier *= 0.82;
      break;
    case "spell_power_up":
      modifiers.spellPower *= 1.1;
      break;
    default:
      break;
  }
}

export function getComputedSpell(state, spellId) {
  const base = SPELLS[spellId];
  const level = state.progression.spellLevels[spellId] ?? 1;
  const derived = state.runtime.playerDerivedStats;
  return {
    ...base,
    damage: Math.round(base.damage * derived.spellPower * (level === 2 && spellId === "fireball" ? 1.18 : 1)),
    cooldownMs: Math.max(120, Math.round(base.cooldownMs * derived.cooldownMultiplier)),
    manaCost: Math.max(4, Math.round(base.manaCost * derived.manaCostMultiplier)),
    maxTargets: base.maxTargets ? base.maxTargets + (level === 2 && spellId === "chain_lightning" ? 1 : 0) : undefined,
    projectileScale: spellId === "chain_lightning" && level === 2 ? 1.18 : 1,
    slowStrength: spellId === "ice_shard" ? (level === 2 ? 0.5 : 0.35) : undefined,
  };
}

export function buyUpgrade(state, upgradeId) {
  const upgrade = UPGRADES.find((item) => item.id === upgradeId);
  if (!upgrade || state.progression.purchasedUpgrades.includes(upgradeId)) {
    return false;
  }
  if (state.progression.gold < upgrade.costGold || state.progression.materials < upgrade.costMaterials) {
    return false;
  }
  state.progression.gold -= upgrade.costGold;
  state.progression.materials -= upgrade.costMaterials;
  state.progression.purchasedUpgrades.push(upgradeId);
  recalculateDerivedStats(state);
  saveProgression(state);
  return true;
}

export function equipSpell(state, spellId, slotIndex) {
  if (!state.progression.unlockedSpells.includes(spellId)) {
    return false;
  }
  const nextEquipped = [...state.progression.equippedSpells];
  const otherIndex = slotIndex === 0 ? 1 : 0;
  if (nextEquipped[otherIndex] === spellId) {
    return false;
  }
  nextEquipped[slotIndex] = spellId;
  state.progression.equippedSpells = nextEquipped;
  saveProgression(state);
  return true;
}

export function equipItem(state, type, itemId) {
  if (type === "weapon" && WEAPONS[itemId]) {
    state.progression.equippedWeapon = itemId;
  }
  if (type === "armor" && ARMORS[itemId]) {
    state.progression.equippedArmor = itemId;
  }
  recalculateDerivedStats(state);
  saveProgression(state);
}
