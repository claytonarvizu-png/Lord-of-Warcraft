export function createProjectile(id, payload) {
  return {
    id,
    type: "projectile",
    owner: payload.owner,
    team: payload.team,
    spellId: payload.spellId ?? null,
    enemyId: payload.enemyId ?? null,
    position: { ...payload.position },
    velocity: { ...payload.velocity },
    radius: payload.radius ?? 8,
    damage: payload.damage,
    ttl: payload.ttl ?? 1400,
    color: payload.color ?? "#ffffff",
    pierce: payload.pierce ?? 0,
    slow: payload.slow ?? null,
    onHit: payload.onHit ?? "destroy",
    remove: false,
  };
}
