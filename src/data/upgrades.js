export const UPGRADES = [
  { id: "fireball_rank_1", name: "Fireball Tempering", category: "spell", costGold: 55, costMaterials: 0, requires: [], upgradeHandlerId: "fireball_damage_up", description: "+18% Fireball damage." },
  { id: "chain_lightning_rank_1", name: "Shadow Infusion", category: "spell", costGold: 70, costMaterials: 1, requires: [], upgradeHandlerId: "chain_targets_up", description: "+18% Shadow Bolt damage." },
  { id: "ice_shard_rank_1", name: "Deep Chill", category: "spell", costGold: 65, costMaterials: 1, requires: [], upgradeHandlerId: "ice_shard_slow_up", description: "Stronger Frostbolt slow and unlock access." },
  { id: "mana_efficiency_1", name: "Mana Efficiency", category: "player", costGold: 45, costMaterials: 0, requires: [], upgradeHandlerId: "mana_efficiency_up", description: "-12% mana costs." },
  { id: "vitality_1", name: "Vitality Weave", category: "player", costGold: 50, costMaterials: 0, requires: [], upgradeHandlerId: "max_hp_up", description: "+24 max HP." },
  { id: "mana_pool_1", name: "Deep Reservoir", category: "player", costGold: 50, costMaterials: 0, requires: [], upgradeHandlerId: "max_mana_up", description: "+30 max mana." },
  { id: "swift_step_1", name: "Swift Step", category: "player", costGold: 60, costMaterials: 1, requires: [], upgradeHandlerId: "dash_cooldown_up", description: "-18% dash cooldown." },
  { id: "arcane_focus_1", name: "Arcane Focus", category: "player", costGold: 55, costMaterials: 1, requires: [], upgradeHandlerId: "spell_power_up", description: "+10% spell power." },
];

export const WEAPONS = {
  wand: { id: "wand", name: "Wand", description: "Sharper cadence for repeat casting.", modifiers: { cooldownMultiplier: 0.9 } },
  staff: { id: "staff", name: "Staff", description: "Higher spell damage with slower pacing.", modifiers: { spellPower: 1.15, cooldownMultiplier: 1.05 } },
  arcane_sword: { id: "arcane_sword", name: "Arcane Sword", description: "Rewards close-range aggression.", modifiers: { spellPower: 1.08, closeBurstMultiplier: 1.3, pickupRadius: 86 } },
};

export const ARMORS = {
  mage_robes: { id: "mage_robes", name: "Mage Robes", description: "Mana-first defensive weave.", modifiers: { maxMana: 20, manaRegen: 3 } },
  arcane_armor: { id: "arcane_armor", name: "Arcane Armor", description: "Trade tempo for durability.", modifiers: { maxHp: 20, armor: 3, moveSpeed: -10 } },
  mystic_cloak: { id: "mystic_cloak", name: "Mystic Cloak", description: "Cooldown-focused battle garb.", modifiers: { cooldownMultiplier: 0.92, manaRegen: 2 } },
};
