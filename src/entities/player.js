import { GAME_HEIGHT, GAME_WIDTH, PLAYER_BASE_STATS } from "../game/config.js";

export function createPlayer() {
  return {
    id: "player",
    name: "Shrum Lord of the Gays",
    type: "player",
    team: "player",
    position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
    velocity: { x: 0, y: 0 },
    radius: 18,
    facingAngle: 0,
    hp: PLAYER_BASE_STATS.maxHp,
    mana: PLAYER_BASE_STATS.maxMana,
    manaRegen: PLAYER_BASE_STATS.manaRegen,
    stats: { ...PLAYER_BASE_STATS },
    cooldowns: {},
    statusEffects: [],
    dash: {
      active: false,
      timerMs: 0,
      cooldownMs: 0,
      direction: { x: 1, y: 0 },
      invulnerableMs: 0,
    },
    isInvulnerable: false,
    alive: true,
    damageFlashMs: 0,
  };
}
