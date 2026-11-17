// Seeded RNG (mulberry32) so screenshots and replays are deterministic:
// the same seed always grows the same night sky.
export function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeighted(random, weights) {
  let total = 0;
  for (const key of Object.keys(weights)) total += weights[key];
  let roll = random() * total;
  for (const key of Object.keys(weights)) {
    roll -= weights[key];
    if (roll <= 0) return key;
  }
  return Object.keys(weights)[0];
}
