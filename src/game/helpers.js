export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start, end, t) {
  return start + (end - start) * t;
}

export function distanceBetween(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function angleBetween(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (!length) {
    return { x: 0, y: 0 };
  }
  return { x: x / length, y: y / length };
}

export function randomFloat(state, min = 0, max = 1) {
  state.rngSeed = (1664525 * state.rngSeed + 1013904223) >>> 0;
  const value = state.rngSeed / 4294967296;
  return min + (max - min) * value;
}

export function randomInt(state, min, max) {
  return Math.floor(randomFloat(state, min, max + 1));
}

export function chooseWeighted(state, entries) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (!totalWeight) {
    return entries[0];
  }
  let threshold = randomFloat(state, 0, totalWeight);
  for (const entry of entries) {
    threshold -= entry.weight;
    if (threshold <= 0) {
      return entry;
    }
  }
  return entries[entries.length - 1];
}

export function formatMs(ms) {
  return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s`;
}

export function removeDead(items) {
  return items.filter((item) => !item.remove);
}

export function capMagnitude(vector, maxLength) {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= maxLength || length === 0) {
    return vector;
  }
  const scale = maxLength / length;
  return { x: vector.x * scale, y: vector.y * scale };
}

export function shallowClone(value) {
  return JSON.parse(JSON.stringify(value));
}
