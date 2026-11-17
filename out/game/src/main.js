// Starlight Shepherd — entry point: game loop, screen state machine and
// the ?shot= screenshot hook. Open game/index.html in a desktop browser.
import { FIELD, STEP } from './config.js';
import { makeWorld, EVENT_OVER, EVENT_WAVE_CLEAR } from './world.js';
import { drawWorld, SCREEN_TITLE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_OVER } from './render.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { stageShot, shotSeed } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const canvas = document.getElementById('game');
canvas.width = FIELD.width;
canvas.height = FIELD.height;
const ctx = canvas.getContext('2d');

const audio = makeAudio();
const input = makeInput(canvas);
const world = makeWorld(seed, audio);
const state = world.state;
let screen = SCREEN_TITLE;
let best = 0;
try {
  best = Number(window.localStorage.getItem('starlight-best') || '0') || 0;
} catch {
  best = 0;
}
state.best = best;

let acc = 0;
let last = performance.now();
let shot = null;
if (shotName) {
  shot = stageShot(shotName, world);
  screen = shot.screen;
  state.best = shot.best;
  drawWorld(ctx, state, screen);
} else {
  screen = SCREEN_TITLE;
  const muteBtn = document.getElementById('mute');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const muted = audio.toggleMute();
      muteBtn.textContent = muted ? 'Unmute sound' : 'Mute sound';
    });
  }
  requestAnimationFrame(frame);
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  const aim = Math.atan2(input.mouseY - state.player.y, input.mouseX - state.player.x);
  const firing = input.mouseDown || input.keys.has('Space');
  while (acc >= STEP) {
    acc -= STEP;
    if (screen === SCREEN_TITLE) {
      if (input.consume('Enter') || input.consume('NumpadEnter') || input.consume('Mouse')) {
        audio.unlock();
        screen = SCREEN_PLAY;
        world.startWave(1);
      }
      // Title ambience only: advance the clock so stars twinkle, but do
      // not run the world — no enemies spawn before the game starts.
      state.time += STEP;
    } else if (screen === SCREEN_PLAY) {
      const move = input.axis();
      const dash = input.consume('ShiftLeft') || input.consume('ShiftRight');
      const ev = world.step(STEP, move, aim, firing, dash);
      if (ev & EVENT_OVER) {
        screen = SCREEN_OVER;
        best = Math.max(best, state.score);
        try {
          window.localStorage.setItem('starlight-best', String(best));
        } catch {
          // private mode: best score just lives for this session
        }
        state.best = best;
        audio.over();
      } else if (ev & EVENT_WAVE_CLEAR) {
        world.offerUpgrades();
        screen = SCREEN_UPGRADE;
      }
    } else if (screen === SCREEN_UPGRADE) {
      if (input.consume('Digit1')) pickUpgrade(0);
      if (input.consume('Digit2')) pickUpgrade(1);
      if (input.consume('Digit3')) pickUpgrade(2);
    } else if (screen === SCREEN_OVER) {
      if (input.consume('KeyR') || input.consume('Enter')) {
        world.reset();
        world.startWave(1);
        screen = SCREEN_PLAY;
      }
    }
  }
  drawWorld(ctx, state, screen);
  requestAnimationFrame(frame);
}

function pickUpgrade(index) {
  const u = state.upgrades[index];
  if (!u) return;
  world.applyUpgrade(u.id);
  world.startWave(state.wave + 1);
  screen = SCREEN_PLAY;
}
