// Starlight Shepherd — the world: player, shadow wisps, bullets, star
// shards, particles, waves and upgrades. Pure logic, no drawing here;
// render.js draws whatever this state holds. Deterministic given a seed.
import { FIELD, PLAYER, ENEMY, SHARD, COMBO, waveSize, waveMix, UPGRADES } from './config.js';
import { makeRandom, pickWeighted } from './random.js';

export const EVENT_OVER = 1;
export const EVENT_WAVE_CLEAR = 2;
export const EVENT_HURT = 4;

export function makeWorld(seed, audio) {
  const random = makeRandom(seed);
  const state = {
    time: 0,
    score: 0,
    best: 0,
    lives: PLAYER.maxLives,
    wave: 1,
    combo: 1,
    comboTimer: 0,
    kills: 0,
    shardsCollected: 0,
    player: {
      x: FIELD.width / 2,
      y: FIELD.height / 2,
      radius: PLAYER.radius,
      vx: 0,
      vy: 0,
      aim: -Math.PI / 2,
      fireTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      invulnerable: 0,
      fireInterval: PLAYER.fireInterval,
      bulletCount: 1,
      speed: PLAYER.speed,
      magnet: 1,
    },
    enemies: [],
    bullets: [],
    enemyBullets: [],
    shards: [],
    particles: [],
    stars: [],
    spawnQueue: 0,
    spawnTimer: 0,
    waveActive: false,
    upgrades: [],
    message: '',
    messageTimer: 0,
  };
  for (let i = 0; i < 90; i += 1) {
    state.stars.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height,
      r: 0.6 + random() * 1.6,
      twinkle: random() * Math.PI * 2,
    });
  }
  const world = {
    state,
    audio,
    reset() {
      const keptBest = state.best;
      const fresh = makeWorld(seed, audio);
      Object.assign(state, fresh.state);
      state.best = keptBest;
    },
    startWave(n) {
      state.wave = n;
      state.spawnQueue = waveSize(n);
      state.spawnTimer = 0.5;
      state.waveActive = true;
      state.message = `Wave ${n}`;
      state.messageTimer = 2;
      audio.wave();
    },
    offerUpgrades() {
      const pool = [...UPGRADES];
      const picks = [];
      for (let i = 0; i < 3; i += 1) {
        picks.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
      }
      state.upgrades = picks;
      return picks;
    },
    applyUpgrade(id) {
      const p = state.player;
      if (id === 'rapid') p.fireInterval *= 0.7;
      if (id === 'twin') p.bulletCount = Math.min(4, p.bulletCount + 1);
      if (id === 'swift') p.speed *= 1.18;
      if (id === 'heart') state.lives = Math.min(5, state.lives + 1);
      if (id === 'magnet') p.magnet = 2.4;
      if (id === 'dash') p.dashCooldownMax = 1;
      state.upgrades = [];
      audio.upgrade();
    },
    spawnEnemy(kind) {
      const stats = ENEMY[kind];
      const edge = Math.floor(random() * 4);
      let x = 0;
      let y = 0;
      if (edge === 0) { x = random() * FIELD.width; y = -30; }
      if (edge === 1) { x = random() * FIELD.width; y = FIELD.height + 30; }
      if (edge === 2) { x = -30; y = random() * FIELD.height; }
      if (edge === 3) { x = FIELD.width + 30; y = random() * FIELD.height; }
      const hpScale = 1 + Math.floor((state.wave - 1) / 4);
      state.enemies.push({
        kind,
        x,
        y,
        radius: stats.radius,
        speed: stats.speed * (1 + state.wave * 0.03),
        hp: stats.hp * hpScale,
        maxHp: stats.hp * hpScale,
        score: stats.score,
        shards: stats.shards,
        phase: random() * Math.PI * 2,
        shootTimer: 1 + random() * 2,
        flash: 0,
      });
    },
    burst(x, y, color, n, speed) {
      for (let i = 0; i < n; i += 1) {
        const a = random() * Math.PI * 2;
        const s = speed * (0.4 + random() * 0.8);
        state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + random() * 0.4, max: 0.9, color, r: 2 + random() * 3 });
      }
    },
    // One fixed step. move {x,y}, aim angle, firing bool, dash bool.
    // Returns an event bitmask.
    step(dt, move, aim, firing, dash) {
      const p = state.player;
      let events = 0;
      state.time += dt;
      if (state.messageTimer > 0) state.messageTimer -= dt;
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) state.combo = 1;
      }
      // Dash: a short burst with cooldown.
      if (p.dashCooldown > 0) p.dashCooldown -= dt;
      if (dash && p.dashCooldown <= 0 && p.dashTimer <= 0 && (move.x !== 0 || move.y !== 0)) {
        p.dashTimer = PLAYER.dashTime;
        p.dashCooldown = PLAYER.dashCooldown * (p.dashCooldownMax ? 0.6 : 1);
        p.invulnerable = Math.max(p.invulnerable, PLAYER.dashTime + 0.1);
      }
      const speed = p.dashTimer > 0 ? PLAYER.dashSpeed : p.speed;
      if (p.dashTimer > 0) p.dashTimer -= dt;
      p.x = Math.max(p.radius, Math.min(FIELD.width - p.radius, p.x + move.x * speed * dt));
      p.y = Math.max(p.radius, Math.min(FIELD.height - p.radius, p.y + move.y * speed * dt));
      p.aim = aim;
      if (p.invulnerable > 0) p.invulnerable -= dt;
      // Fire.
      p.fireTimer -= dt;
      if (firing && p.fireTimer <= 0) {
        p.fireTimer = p.fireInterval;
        const spread = 0.14;
        for (let i = 0; i < p.bulletCount; i += 1) {
          const offset = (i - (p.bulletCount - 1) / 2) * spread;
          const a = aim + offset;
          state.bullets.push({
            x: p.x + Math.cos(a) * (p.radius + 6),
            y: p.y + Math.sin(a) * (p.radius + 6),
            vx: Math.cos(a) * PLAYER.bulletSpeed,
            vy: Math.sin(a) * PLAYER.bulletSpeed,
            radius: PLAYER.bulletRadius,
          });
        }
        audio.shoot();
      }
      // Spawn the wave gradually.
      if (state.waveActive && state.spawnQueue > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          state.spawnTimer = Math.max(0.2, 0.5 - state.wave * 0.02);
          state.spawnQueue -= 1;
          this.spawnEnemy(pickWeighted(random, waveMix(state.wave)));
        }
      }
      // Enemies chase / strafe / shoot.
      for (const e of state.enemies) {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.flash = Math.max(0, e.flash - dt * 6);
        e.phase += dt;
        if (e.kind === 'mite') {
          const perp = Math.sin(e.phase * 3) * 0.7;
          e.x += (dx / d + -dy / d * perp) * e.speed * dt;
          e.y += (dy / d + dx / d * perp) * e.speed * dt;
        } else if (e.kind === 'spitter') {
          if (d > 260) {
            e.x += (dx / d) * e.speed * dt;
            e.y += (dy / d) * e.speed * dt;
          } else if (d < 180) {
            e.x -= (dx / d) * e.speed * dt;
            e.y -= (dy / d) * e.speed * dt;
          }
          e.shootTimer -= dt;
          if (e.shootTimer <= 0 && d < 420) {
            e.shootTimer = 2.2;
            state.enemyBullets.push({ x: e.x, y: e.y, vx: (dx / d) * 190, vy: (dy / d) * 190, radius: 6 });
          }
        } else {
          e.x += (dx / d) * e.speed * dt;
          e.y += (dy / d) * e.speed * dt;
        }
      }
      // Bullets.
      for (const b of state.bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      state.bullets = state.bullets.filter((b) => b.x > -20 && b.x < FIELD.width + 20 && b.y > -20 && b.y < FIELD.height + 20);
      for (const b of state.enemyBullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      state.enemyBullets = state.enemyBullets.filter((b) => b.x > -20 && b.x < FIELD.width + 20 && b.y > -20 && b.y < FIELD.height + 20);
      // Bullet hits.
      for (const b of state.bullets) {
        for (const e of state.enemies) {
          if (e.hp <= 0) continue;
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < e.radius + b.radius) {
            e.hp -= 1;
            e.flash = 1;
            b.x = -9999;
            audio.hit();
            if (e.hp <= 0) {
              state.kills += 1;
              state.combo = Math.min(COMBO.cap, state.combo + COMBO.step);
              state.comboTimer = COMBO.window;
              const gained = Math.round(e.score * state.combo);
              state.score += gained;
              this.burst(e.x, e.y, e.kind === 'brute' ? '#ff7a59' : '#b388ff', e.kind === 'brute' ? 16 : 8, 160);
              for (let i = 0; i < e.shards; i += 1) {
                state.shards.push({ x: e.x + (random() - 0.5) * 30, y: e.y + (random() - 0.5) * 30, vx: (random() - 0.5) * 60, vy: (random() - 0.5) * 60 });
              }
            }
            break;
          }
        }
      }
      state.bullets = state.bullets.filter((b) => b.x > -100);
      state.enemies = state.enemies.filter((e) => e.hp > 0);
      // Shards drift, magnetise, collect.
      for (const s of state.shards) {
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < SHARD.magnetRadius * p.magnet) {
          s.vx += (dx / d) * 900 * dt;
          s.vy += (dy / d) * 900 * dt;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.96;
        s.vy *= 0.96;
        if (d < SHARD.collectRadius) {
          s.x = -9999;
          state.score += SHARD.value;
          state.shardsCollected += 1;
          audio.collect();
        }
      }
      state.shards = state.shards.filter((s) => s.x > -100);
      // Player hit by enemy or enemy bullet.
      if (p.invulnerable <= 0) {
        for (const e of state.enemies) {
          if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius - 2) {
            e.hp = 0;
            this.hurt();
            events |= EVENT_HURT;
            break;
          }
        }
        if (events === 0) {
          for (const b of state.enemyBullets) {
            if (Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius - 2) {
              b.x = -9999;
              this.hurt();
              events |= EVENT_HURT;
              break;
            }
          }
        }
        state.enemies = state.enemies.filter((e) => e.hp > 0);
        state.enemyBullets = state.enemyBullets.filter((b) => b.x > -100);
      }
      // Particles fade.
      for (const pt of state.particles) {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
      }
      state.particles = state.particles.filter((pt) => pt.life > 0);
      // Wave clear?
      if (state.waveActive && state.spawnQueue === 0 && state.enemies.length === 0) {
        state.waveActive = false;
        state.score += 100 * state.wave;
        events |= EVENT_WAVE_CLEAR;
      }
      if (state.lives <= 0) events |= EVENT_OVER;
      return events;
    },
    hurt() {
      const p = state.player;
      state.lives -= 1;
      state.combo = 1;
      p.invulnerable = PLAYER.invulnerableTime;
      this.burst(p.x, p.y, '#ff5d73', 18, 220);
      audio.hurt();
    },
  };
  return world;
}
