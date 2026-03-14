import { createEnemy } from "./enemy.js";

export function createBoss(id, definition, position) {
  const boss = createEnemy(id, definition, position);
  boss.type = "boss";
  boss.boss = true;
  boss.phase = 1;
  boss.patternIndex = 0;
  boss.patternTimerMs = definition.id === "qwibus" ? 900 : 1400;
  boss.telegraphMs = 0;
  boss.barrageShots = 0;
  boss.shieldMs = 0;
  boss.shieldCooldownMs = 0;
  return boss;
}
