// Screenshot scenes: each one plays the real rules forward from a fresh
// world for a fixed number of steps, steered by a simple autopilot, so the
// frame is what a short game really looks like and the same seed always
// gives the same frame. ?shot=start|play|upgrade|end
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WAVE_CLEAR } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';

// Autopilot: drift toward the nearest shard, keep away from the nearest
// enemy, aim at the nearest enemy and fire.
function autopilot(world) {
  const s = world.state;
  const p = s.player;
  let target = null;
  let targetD = Infinity;
  for (const e of s.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < targetD) {
      targetD = d;
      target = e;
    }
  }
  let mx = 0;
  let my = 0;
  if (target) {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (targetD < 120) {
      mx = -dx / d;
      my = -dy / d;
    } else if (targetD > 260) {
      mx = dx / d;
      my = dy / d;
    }
    const aim = Math.atan2(dy, dx);
    return { move: { x: mx, y: my }, aim, firing: true, dash: false };
  }
  return { move: { x: 0, y: 0 }, aim: -Math.PI / 2, firing: false, dash: false };
}

export function stageShot(name, world) {
  world.reset();
  const s = world.state;
  if (name !== 'play' && name !== 'upgrade' && name !== 'end') {
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, -Math.PI / 2, false, false);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  world.startWave(2);
  // Play ~6s of wave 2 with the autopilot: mid-wave, enemies on screen,
  // bullets flying, shards on the floor — not an empty cleared field.
  for (let i = 0; i < 6 / STEP; i += 1) {
    const a = autopilot(world);
    const ev = world.step(STEP, a.move, a.aim, a.firing, a.dash);
    if (ev & EVENT_OVER) break;
    if (ev & EVENT_WAVE_CLEAR) break;
  }
  if (name === 'play') {
    return { screen: SCREEN_PLAY, best: s.score };
  }
  if (name === 'upgrade') {
    // Finish the wave first so the upgrade panel is earned, then offer it.
    for (let i = 0; i < 30 / STEP; i += 1) {
      const a = autopilot(world);
      const ev = world.step(STEP, a.move, a.aim, a.firing, a.dash);
      if (ev & EVENT_OVER) break;
      if (ev & EVENT_WAVE_CLEAR) break;
    }
    world.offerUpgrades();
    return { screen: SCREEN_UPGRADE, best: s.score };
  }
  // end: play recklessly (no firing, walk into danger), starting a fresh
  // wave whenever the last one is cleared, until the lantern goes out.
  for (let i = 0; i < 600 / STEP; i += 1) {
    if (!s.waveActive && s.enemies.length === 0 && s.lives > 0) {
      world.startWave(s.wave + 1);
    }
    const ev = world.step(STEP, { x: 0.6, y: 0.4 }, 0, false, false);
    if (ev & EVENT_OVER) break;
  }
  return { screen: SCREEN_OVER, best: s.score };
}

// Keep the field readable in screenshots: stage the play shot in the
// middle of the action, not at an empty edge.
export function shotSeed(name) {
  return name === 'end' ? 7 : 1;
}
export { FIELD };
