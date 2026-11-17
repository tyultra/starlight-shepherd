// Starlight Shepherd — tuning constants. One place for every number the
// designers (us) tune: field size, player feel, enemy pacing, waves.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  speed: 250,
  maxLives: 3,
  fireInterval: 0.22,
  bulletSpeed: 560,
  bulletRadius: 5,
  dashSpeed: 720,
  dashTime: 0.16,
  dashCooldown: 1.6,
  invulnerableTime: 1.5,
};

export const ENEMY = {
  // kind -> base stats. Wisps drift, mites zigzag, brutes are slow tanks,
  // spitters keep their distance and shoot back.
  wisp: { radius: 13, speed: 70, hp: 1, score: 50, shards: 1 },
  mite: { radius: 10, speed: 130, hp: 1, score: 80, shards: 1 },
  brute: { radius: 24, speed: 42, hp: 5, score: 200, shards: 3 },
  spitter: { radius: 15, speed: 60, hp: 2, score: 150, shards: 2 },
};

// Wave n spawns this many enemies, mixed by weights that shift with n.
export function waveSize(n) {
  return 6 + n * 3;
}
export function waveMix(n) {
  return {
    wisp: Math.max(0.15, 0.55 - n * 0.04),
    mite: Math.min(0.35, 0.15 + n * 0.03),
    brute: Math.min(0.25, n * 0.03),
    spitter: Math.min(0.25, 0.05 + n * 0.02),
  };
}

export const SHARD = { radius: 7, magnetRadius: 110, collectRadius: 22, value: 10 };
export const COMBO = { window: 3.0, step: 0.1, cap: 3.0 };

// Upgrade choices offered between waves. id, name, blurb, apply(state).
export const UPGRADES = [
  { id: 'rapid', name: 'Rapid Lantern', blurb: '+30% fire rate' },
  { id: 'twin', name: 'Twin Flames', blurb: '+1 bullet per shot' },
  { id: 'swift', name: 'Swift Boots', blurb: '+18% move speed' },
  { id: 'heart', name: 'Warm Heart', blurb: '+1 life (max 5)' },
  { id: 'magnet', name: 'Star Magnet', blurb: 'shards fly to you' },
  { id: 'dash', name: 'Comet Dash', blurb: 'dash recharges 40% faster' },
];
