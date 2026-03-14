export function createPickup(id, payload) {
  return {
    id,
    type: "pickup",
    pickupType: payload.pickupType,
    amount: payload.amount,
    position: { ...payload.position },
    radius: payload.radius ?? 12,
    velocity: { x: payload.velocity?.x ?? 0, y: payload.velocity?.y ?? 0 },
    ttl: payload.ttl ?? 12000,
    remove: false,
  };
}
