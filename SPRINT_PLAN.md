# Arcane Arena Governing Sprint Plan

## Summary
This sprint plan assumes the project root is `C:\Users\Clay\OneDrive\Documents\ChatGPTProjects\arcane-arena`. That folder is the working root for all future Codex executions, and this document lives there as the governing implementation plan.

The current workspace contains a separate single-file browser prototype (`Shadow Ronin`) that is not a valid base for direct feature extension. The implementation strategy is therefore: reuse only the broad browser/canvas approach, then build Arcane Arena as a clean top-down arena-combat game with modular systems, simple visual primitives, and a strictly scoped MVP.

The first playable target is a 10-minute browser run with:
- top-down movement and mouse aim
- 3 spells total
- 3 enemy types
- 1 boss
- 5 arena encounters
- 1 simple hub/menu flow
- gold/material progression
- fixed-timestep update loop
- modular JS structure suitable for future expansion

## Implementation Foundation

### Working Root And Initial Structure
All future work should assume this structure under the current project root:

```text
index.html
style.css
src/
  main.js
  game/
    gameLoop.js
    gameState.js
    config.js
  entities/
    player.js
    enemy.js
    boss.js
    projectile.js
    pickup.js
  systems/
    inputSystem.js
    combatSystem.js
    collisionSystem.js
    spellSystem.js
    enemyAISystem.js
    waveSystem.js
    arenaSystem.js
    progressionSystem.js
    lootSystem.js
    renderSystem.js
    uiSystem.js
  data/
    spells.js
    enemies.js
    arenas.js
    upgrades.js
```

Architectural rules:
- Plain JavaScript ES modules, no framework, no build step unless later required.
- Single `canvas` for world rendering; DOM only for shell UI, overlays, and hub menus.
- Game state owned centrally and passed into systems; avoid implicit global mutable state.
- Data-driven definitions for spells, enemies, arenas, and upgrades; entity classes and systems should consume config and handler ids, not embed most balance logic inline.
- Fixed timestep simulation, decoupled from rendering interpolation if needed later; MVP can render directly from current state.

### Core Runtime Design
The runtime should use these core state slices:

```js
gameState = {
  mode: "title" | "hub" | "arena" | "pause" | "gameOver" | "victory",
  time: { now, accumulator, step },
  camera: { x, y, shake },
  player: { ... },
  enemies: [],
  projectiles: [],
  pickups: [],
  arenaRun: {
    arenaIndex,
    waveIndex,
    regionId,
    activeArenaId,
    remainingWaves,
    clearedArenas,
    bossSpawned
  },
  progression: {
    gold,
    materials,
    unlockedSpells,
    spellLevels,
    purchasedUpgrades,
    equippedWeapon,
    equippedArmor
  },
  ui: {
    hoveredSpellId,
    selectedShopItemId,
    notifications: []
  },
  input: {
    moveX,
    moveY,
    aimWorldX,
    aimWorldY,
    primaryDown,
    secondaryDown,
    dashPressed
  },
  rngSeed: number
}
```

Key implementation defaults:
- Arena simulation updates only in `mode: "arena"`.
- Hub and title are menu-state flows, not separate pages.
- Player, enemies, projectiles, and pickups use world coordinates in arena space.
- Collision is circular for characters/projectiles where possible; AABB only for menu hitboxes or arena bounds.
- Use deterministic spawn tables per arena with small randomness in composition.

### Public Interfaces And Data Contracts
These interfaces must be stable enough that later tasks can build on them without redesign:

#### Spell definition shape
```js
{
  id: "fireball",
  slot: "primary" | "secondary",
  school: "fire" | "lightning" | "ice",
  damage: number,
  cooldownMs: number,
  manaCost: number,
  projectileSpeed?: number,
  maxTargets?: number,
  radius?: number,
  effect: "projectile" | "chain" | "aoe" | "slow" | "freeze",
  effectHandlerId?: string
}
```

#### Enemy definition shape
```js
{
  id: "apprentice_wizard",
  role: "ranged" | "support" | "tank" | "boss",
  maxHp: number,
  speed: number,
  contactDamage: number,
  attackRange: number,
  attackCooldownMs: number,
  aiType: "kite" | "summon" | "tank" | "bossPattern",
  rewards: {
    goldMin: number,
    goldMax: number,
    materialDrop?: "none" | "elite_only" | "boss_only"
  }
}
```

#### Arena definition shape
```js
{
  id: "forest_01",
  regionId: "enchanted_forest",
  bounds: { width: number, height: number },
  waves: [
    {
      budget: number,
      spawnTable: [{ enemyId, weight }],
      rareChance: number
    }
  ],
  bossWaveId?: "fire_archmage"
}
```

#### Upgrade definition shape
```js
{
  id: "fireball_rank_1",
  category: "spell" | "player" | "equipment",
  costGold: number,
  costMaterials: number,
  requires?: string[],
  upgradeHandlerId: string
}
```

## Task Breakdown

### Sprint 1: Project Reset And Engine Foundation

#### `AA-001` Create Arcane Arena project root and governing docs
Implementation:
- Use the current `arcane-arena` folder as the project root; do not create a nested replacement root.
- Initialize new `index.html`, `style.css`, and `src/main.js`.
- Add a project README that defines launch instructions and the MVP scope.
- Keep this governing sprint plan in the project root as the implementation authority for future tasks.
- Do not migrate the old prototype files into the project root; treat them as reference-only unless explicitly copied.

Definition of done:
- Project root launches a blank or placeholder Arcane Arena shell.
- README points all future work to the current project root.
- Governing sprint doc exists in markdown inside the project root.

#### `AA-002` Build app shell, canvas boot, and mode routing
Implementation:
- Create the base DOM layout: canvas, HUD mount, overlay/menu mount.
- Add `main.js` bootstrapping for canvas context, resize handling, and root state initialization.
- Introduce `gameState.mode` routing for `title`, `hub`, `arena`, `gameOver`, `victory`.
- Render title and placeholder hub/arena overlays from the same SPA-style page.

Technical detail:
- Keep the canvas fixed internal resolution for predictable gameplay; scale with CSS if needed.
- Use a single animation loop that calls update only for active gameplay modes.
- UI mode transitions should be explicit state changes, not DOM page navigation.

Definition of done:
- App starts in title mode and can switch into hub and placeholder arena mode.
- No gameplay logic yet beyond shell state transitions.

#### `AA-003` Implement fixed-timestep loop and central state container
Implementation:
- Add `gameLoop.js` with a fixed-step update model, recommended `step = 1000 / 60`.
- Add accumulator logic to catch up updates while capping max frame debt.
- Move simulation timing state out of ad hoc globals into `gameState.time`.
- Create system invocation order for arena mode:
  1. input
  2. player intent/spells
  3. AI
  4. projectile movement
  5. collision/combat resolution
  6. pickups/progression
  7. wave/arena progression
  8. camera
  9. UI snapshot/update

Technical detail:
- Cap frame delta to avoid spiral-of-death after tab restore.
- Keep render separate from simulation; render may use latest state without interpolation for MVP.

Definition of done:
- Game updates at stable feel independent of fluctuating frame rate.
- Core system ordering is codified for future feature work.

#### `AA-004` Implement top-down input and mouse aim system
Implementation:
- Add `inputSystem.js` capturing WASD movement, left click, right click, space, and mouse world position.
- Convert screen mouse coordinates into world coordinates relative to camera.
- Normalize diagonal movement so speed is not faster on diagonals.
- Expose an input snapshot on `gameState.input` per frame.

Technical detail:
- `moveX/moveY` should be normalized vector components.
- `primaryDown` and `secondaryDown` are hold states; `dashPressed` should be edge-triggered.
- Prevent browser context menu on right click over the canvas.

Definition of done:
- Player intent values are available every frame and align with cursor position in world space.

#### `AA-005` Implement player entity, top-down movement, stats, and dash
Implementation:
- Create `player.js` with movement, health, mana, cooldown containers, and dodge dash logic.
- Player fields should include `position`, `velocity`, `radius`, `facingAngle`, `hp`, `mana`, `manaRegen`, `stats`, `cooldowns`, `statusEffects`.
- Dash should move rapidly in current input direction or aim direction fallback if stationary.
- Dash provides invulnerability frames for a fixed window and consumes cooldown, not mana.

Technical detail:
- Arena bounds clamp player position.
- Use acceleration-lite or direct velocity assignment; MVP should prioritize responsiveness over physics complexity.
- Add mana regeneration with cap and per-spell cooldown timers.

Definition of done:
- Player can move in top-down space, aim with mouse, and dash through danger with i-frames.

#### `AA-006` Implement camera and base arena renderer
Implementation:
- Add `renderSystem.js` for background, arena floor, boundaries, player, and debug-safe placeholders.
- Camera follows player with soft clamp to arena bounds.
- Visual style uses simple shapes, clear color coding, and no texture dependency.
- Add basic HUD overlay for HP, mana, cooldowns, arena/wave labels.

Technical detail:
- Player is a readable glowing wizard circle or capsule with facing indicator.
- World render order: floor, hazards, pickups, projectiles, enemies, player, foreground FX, UI.
- Keep drawing helpers isolated from simulation logic.

Definition of done:
- Arena is visually readable and player-centered, with basic HUD feedback.

### Sprint 2: Combat Core And First Playable Arena

#### `AA-007` Implement spell system with 3 MVP spells
Implementation:
- Add `spellSystem.js` and `data/spells.js`.
- Lock MVP spells to:
  - `fireball` as primary projectile
  - `chain_lightning` as secondary burst-chain
  - `ice_shard` as alternate control projectile
- Implement slot model so exactly two spells are active in combat at once.
- Start the MVP with `fireball` and `chain_lightning` equipped by default.
- Allow `ice_shard` to be unlocked and equipped from the hub as an alternate loadout option, not cast alongside the other two in the same arena run.
- Each spell checks cooldown and mana before firing.

Technical detail:
- Fireball: straight projectile, moderate speed, medium damage.
- Chain Lightning: instant or near-instant target selection within radius, bounces across nearby enemies.
- Ice Shard: projectile with damage plus slow debuff.
- Spell execution should return spawned projectiles/effects, not mutate unrelated systems directly.

Definition of done:
- Across progression and loadout changes, the player can use all 3 MVP spells and each has distinct feel and resource behavior.

#### `AA-008` Implement projectile, effect, and collision systems
Implementation:
- Add `projectile.js`, `collisionSystem.js`, and combat resolution helpers.
- Model projectiles with `position`, `velocity`, `radius`, `owner`, `damage`, `ttl`, `onHit`.
- Support both projectile travel hits and instant-hit chain targeting.
- Add debuff support for `slow`, later extensible to `freeze`.

Technical detail:
- Use circle-vs-circle collision for character/projectile overlap.
- Remove or expire projectiles after hit, TTL, or out-of-bounds.
- Separate damage application from collision detection to avoid double-hit bugs in one frame.

Definition of done:
- Hits are registered consistently and produce damage/effect outcomes with no repeated-hit glitches.

#### `AA-009` Implement 3 enemy archetypes and AI behaviors
Implementation:
- Add `enemy.js`, `data/enemies.js`, and `enemyAISystem.js`.
- MVP enemy set:
  - `apprentice_wizard`: ranged kite/cast unit
  - `summoner`: support unit that periodically creates weak minions
  - `elemental_creature`: slow tank that advances and pressures space
- Keep AI state-machine-light: chase, hold range, cast, recover.

Technical detail:
- Apprentice Wizard should maintain distance and fire simple projectiles.
- Summoner should have low direct threat but create pressure over time via capped minion count.
- Elemental Creature should have larger radius, more HP, slower speed, and strong body pressure.
- Avoid pathfinding for MVP; use direct movement and separation nudges.

Definition of done:
- Three readable enemy types produce distinct combat decisions.

#### `AA-010` Implement enemy attacks, damage intake, and death rewards
Implementation:
- Add enemy projectile casting and contact damage where appropriate.
- Standardize `takeDamage`, `applyStatus`, `die`, and reward-drop flow.
- Spawn gold and material pickups or auto-award based on design choice below.

Default chosen:
- Gold uses physical pickups for feedback.
- Materials are not part of standard enemy drops.
- Materials auto-award only on elite/boss death to reduce visual clutter.

Technical detail:
- Enemy death should trigger one-time reward generation and optional death FX.
- Damage flash and hit feedback should be visual, but lightweight.

Definition of done:
- Combat has full loop from enemy attack to player damage to enemy death to rewards.

#### `AA-011` Implement wave system and 5-encounter run structure
Implementation:
- Add `waveSystem.js` and `data/arenas.js`.
- Define 5 arena encounters total for MVP, each with 3 to 5 waves.
- Use spawn budgets and weighted tables rather than bespoke scripting for every wave.
- Every 5th encounter or final encounter culminates in boss wave.

Technical detail:
- A wave is complete when active enemies are dead and no queued spawns remain.
- Small delay and banner should separate waves.
- Difficulty scales through budget, composition, projectile pressure, and enemy HP, not just raw counts.

Definition of done:
- A full 5-encounter combat run can progress from encounter to encounter with escalating pressure.

#### `AA-012` Implement first boss: Fire Archmage
Implementation:
- Add `boss.js` and boss-specific data/behavior.
- Boss fight includes:
  - fireball barrage pattern
  - flame circle or radial burst denial pattern
  - 50% HP phase change to faster cadence and wider pressure
- Boss arena uses the same core systems as standard arenas.

Technical detail:
- Boss pattern controller should be timer/state driven, not hardcoded per frame.
- Telegraph attacks visually before damage resolves.
- Boss rewards should include larger gold/material payout and encounter clear transition.

Definition of done:
- The MVP boss is mechanically readable, multi-patterned, and clearly distinct from regular enemies.

### Sprint 3: Progression, Hub, And MVP Completion

#### `AA-013` Implement progression state for gold, materials, unlocks, and run persistence
Implementation:
- Add `progressionSystem.js`.
- Track gold, materials, unlocked spells, spell levels, permanent upgrades, and equipped loadout.
- Persist progression in `localStorage` with a versioned save key.

Technical detail:
- Keep run progress and permanent progression separate in state even if both save initially.
- Add safe defaults if save load fails or schema is missing fields.
- Version save payload so future tasks can migrate it.

Definition of done:
- Progression survives refresh and drives unlock visibility.

#### `AA-014` Implement hub flow and menu panels
Implementation:
- Add `uiSystem.js` or menu components for:
  - spell upgrade station
  - gear/upgrade shop
  - arena portal
- Hub is a simple overlay/menu scene, not free-roam movement.
- After arena clear, transition to hub summary and then allow upgrade spending before next encounter.

Technical detail:
- DOM is acceptable for menu controls; canvas-only UI is not required for MVP.
- Menu actions must mutate progression state through named handlers, not direct DOM-side state edits.
- Include summary panel showing gold/material gains and next arena.

Definition of done:
- Player can exit an arena, spend rewards, and start the next encounter from the hub.

#### `AA-015` Implement upgrade system for spells and player stats
Implementation:
- Add `data/upgrades.js`.
- MVP upgrades should cover:
  - spell damage
  - spell cooldown reduction
  - mana efficiency
  - max HP
  - mana pool
  - dash cooldown or movement speed
- Upgrades may be rank-based rather than tree-based.

Technical detail:
- Upgrade application should be deterministic and composable.
- Derived stats should be recalculated from base values plus upgrade modifiers.
- Do not hardcode modified values in multiple systems; use a shared stat calculation helper.

Definition of done:
- Purchased upgrades affect gameplay immediately and predictably.

#### `AA-016` Implement simplified equipment modifiers
Implementation:
- Add one weapon slot and one armor slot for MVP.
- Weapon options:
  - `wand`: faster spell cooldown cadence
  - `staff`: higher spell damage
  - `arcane_sword`: shorter range, stronger close burst modifier
- Armor options:
  - `mage_robes`: mana-focused
  - `arcane_armor`: defense-focused
  - `mystic_cloak`: cooldown-focused

Technical detail:
- Equipment should act as modifier bundles, not item inventory objects.
- Equipment choice is a single active selection, with no loot table complexity in MVP.

Definition of done:
- Equipment meaningfully changes stats without introducing inventory management overhead.

#### `AA-017` Implement full HUD, feedback, and game-state transitions
Implementation:
- Expand HUD to show:
  - HP and mana bars
  - equipped spell slots
  - cooldown indicators
  - gold/material counts
  - wave/arena progress
  - boss health bar when relevant
- Add transitions for defeat, victory, restart, and return to hub.

Technical detail:
- Cooldowns should be visually readable at a glance.
- Boss bar should appear only during boss encounters.
- Defeat should offer restart from run start; victory should loop back to hub or run-complete screen.

Definition of done:
- The player always knows combat state, resources, and objective.

#### `AA-018` Add controlled replay variation and balancing pass
Implementation:
- Add limited procedural variation:
  - weighted enemy composition shifts
  - wave size variance within safe range
  - low-chance rare composition spike
  - reward variance within min/max bands
- Perform tuning pass on player damage, mana economy, enemy density, and boss pacing.

Technical detail:
- Randomization must stay within bounded tables to preserve playability.
- Seeded or semi-deterministic generation is preferred so balancing remains debuggable.
- No full roguelite relic/modifier system in MVP.

Definition of done:
- Repeat runs feel slightly different without destabilizing difficulty.

#### `AA-019` Final polish pass for MVP readiness
Implementation:
- Remove placeholder messaging and inconsistent terminology.
- Align naming, controls, and HUD with Arcane Arena fantasy.
- Verify that the game delivers a full 10-minute session with a clean start-to-finish flow.

Technical detail:
- This task is polish and validation, not feature expansion.
- Fix issues found in prior tasks that block MVP quality or clarity.

Definition of done:
- Prototype is internally consistent, readable, and playable end-to-end.

## Test Plan

### Functional scenarios
- Start from title, enter hub, launch arena, clear encounter, return to hub, buy upgrade, continue run.
- Move in all directions with consistent speed and no diagonal speed exploit.
- Aim with mouse and cast each spell in intended direction.
- Fireball collides once and expires correctly.
- Chain Lightning selects valid nearby targets, respects max target count, and does not hit dead targets.
- Ice Shard applies damage and slow effect, and slow expires correctly.
- Dash grants invulnerability only during configured window and respects cooldown.
- Apprentice Wizard attacks from range and does not suicide-rush constantly.
- Summoner respects minion cap and does not infinitely flood the arena.
- Elemental Creature provides tank pressure and can be kited but not ignored.
- Waves complete only when both spawn queue and active enemies are exhausted.
- Boss transitions at 50% HP and changes behavior as designed.
- Gold/material rewards are awarded exactly once on kill/clear.
- Upgrades and equipment immediately affect derived stats and spell behavior.
- Save/load restores progression state without corrupting defaults.
- Defeat and victory states transition cleanly and allow replay.

### Technical validation
- No per-frame event listener leaks.
- No projectile double-hit bug from overlapping updates.
- No enemy reward duplication on repeated death processing.
- No invalid mode transitions that leave combat systems updating in hub/menu state.
- No hard crash if localStorage is unavailable or save payload is malformed.
- Frame pacing remains acceptable with moderate projectile counts and summoner minions.

## Assumptions And Locked Defaults
- Working root is the current workspace root: `C:\Users\Clay\OneDrive\Documents\ChatGPTProjects\arcane-arena`.
- This sprint document lives in that root and is treated as the governing plan for all execution tasks.
- MVP uses plain JavaScript ES modules with no framework and no build tooling requirement.
- Hub is menu-based, not an explorable town scene.
- Only 3 spells total are in MVP; the broader path system is deferred to post-MVP expansion.
- Regions exist as presentation/progression labels in MVP, but only as much as needed to support the 5-encounter run.
- Equipment is simplified to active modifiers, not a loot/inventory system.
- Exactly two spells are active per arena run; additional unlocked spells are hub-selected loadout options.
- Save persistence uses `localStorage` and versioned payloads.
- Visuals use simple shapes and effects; no dependency on complex art assets.
- Each task code above is scoped to one Codex execution and should be implemented in sequence unless a later planning revision explicitly changes dependencies.
