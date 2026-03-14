export const GAME_WIDTH = 1440;
export const GAME_HEIGHT = 860;
export const CAMERA_ZOOM = 0.86;
export const FIXED_STEP_MS = 1000 / 60;
export const MAX_FRAME_DELTA_MS = 100;
export const MAX_UPDATES_PER_FRAME = 5;
export const SAVE_KEY = "arcane-arena-save-v1";
export const SAVE_VERSION = 1;
export const PLAYER_BASE_STATS = {
  maxHp: 130,
  maxMana: 240,
  manaRegen: 10,
  moveSpeed: 292,
  dashCooldownMs: 3000,
  dashDurationMs: 360,
  dashSpeed: 560,
  iFrameMs: 650,
  spellPower: 1,
  cooldownMultiplier: 1,
  manaCostMultiplier: 1,
  armor: 0,
  pickupRadius: 70,
  closeBurstMultiplier: 1,
};

export const ENCOUNTERS_PER_RUN = 5;
export const DEFAULT_EQUIPPED_SPELLS = ["fireball", "chain_lightning"];
export const ALL_SPELL_IDS = ["fireball", "chain_lightning", "ice_shard"];
export const DEFAULT_UNLOCKED_SPELLS = ["fireball", "chain_lightning", "ice_shard"];
export const DEFAULT_WEAPON = "wand";
export const DEFAULT_ARMOR = "mage_robes";
export const ENEMY_TEAM = "enemy";
export const PLAYER_TEAM = "player";
export const PICKUP_TYPES = {
  GOLD: "gold",
  HEAL: "heal",
};
