// Starlight Shepherd — all drawing: starfield, player lantern, shadow
// wisps, shards, particles, HUD and the title / upgrade / game-over
// screens. Everything is canvas vector art, no image files.
import { FIELD, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';

const COLORS = {
  wisp: '#b388ff',
  mite: '#ff9de2',
  brute: '#ff7a59',
  spitter: '#7ae0ff',
};

function circle(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawLantern(ctx, x, y, aim, invulnerable, time) {
  const blink = invulnerable > 0 && Math.floor(time * 12) % 2 === 0;
  if (blink) return;
  // Glow.
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 46);
  glow.addColorStop(0, 'rgba(255, 214, 120, 0.55)');
  glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.beginPath();
  ctx.arc(x, y, 46, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
  // Body: a little lantern keeper.
  circle(ctx, x, y, PLAYER.radius, '#ffd678');
  circle(ctx, x, y, PLAYER.radius - 5, '#fff3c4');
  // Aim barrel.
  ctx.strokeStyle = '#ffd678';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(aim) * 10, y + Math.sin(aim) * 10);
  ctx.lineTo(x + Math.cos(aim) * 26, y + Math.sin(aim) * 26);
  ctx.stroke();
  // Eyes.
  circle(ctx, x + Math.cos(aim) * 5 - 4, y + Math.sin(aim) * 5 - 3, 2, '#3a2b00');
  circle(ctx, x + Math.cos(aim) * 5 + 4, y + Math.sin(aim) * 5 + 3, 2, '#3a2b00');
}

function drawEnemy(ctx, e, time) {
  const color = COLORS[e.kind] || '#b388ff';
  const wobble = Math.sin(time * 4 + e.phase) * 2;
  if (e.kind === 'brute') {
    ctx.save();
    ctx.translate(e.x, e.y + wobble * 0.5);
    ctx.rotate(Math.sin(e.phase) * 0.2);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : color;
    ctx.fillRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
    ctx.fillStyle = '#2a0a0a';
    ctx.fillRect(-8, -6, 5, 5);
    ctx.fillRect(3, -6, 5, 5);
    ctx.restore();
  } else {
    const glow = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, e.radius + 14);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 14, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.globalAlpha = 1;
    circle(ctx, e.x, e.y + wobble, e.radius, e.flash > 0 ? '#ffffff' : color);
    circle(ctx, e.x - 4, e.y + wobble - 3, 2.5, '#1a1030');
    circle(ctx, e.x + 4, e.y + wobble - 3, 2.5, '#1a1030');
    if (e.kind === 'spitter') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y + wobble + 4, 6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }
  if (e.maxHp > 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2, 4);
    ctx.fillStyle = '#7CFC9A';
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, (e.radius * 2 * e.hp) / e.maxHp, 4);
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(10, 12, 40, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, 44);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, 29);
  ctx.fillStyle = '#b388ff';
  ctx.fillText(`Wave ${state.wave}`, 220, 29);
  ctx.fillStyle = state.combo > 1 ? '#ff9de2' : '#8fa3ff';
  ctx.fillText(`Combo x${state.combo.toFixed(1)}`, 360, 29);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ff5d73';
  ctx.fillText('♥'.repeat(Math.max(0, state.lives)) + '♡'.repeat(Math.max(0, 5 - state.lives)), FIELD.width - 16, 29);
  ctx.textAlign = 'left';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#9fb4ff';
  ctx.fillText('WASD move · Mouse aim · Click / Space shoot · Shift dash', 16, FIELD.height - 12);
  if (state.messageTimer > 0) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(state.message, FIELD.width / 2, 130);
    ctx.textAlign = 'left';
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(12, 14, 48, 0.82)';
  ctx.strokeStyle = '#ffd678';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fill();
  ctx.stroke();
}

export function drawWorld(ctx, state, screen) {
  const time = state.time;
  // Night sky.
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, '#0b1030');
  sky.addColorStop(1, '#1b1445');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const s of state.stars) {
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(time + s.twinkle));
    circle(ctx, s.x, s.y, s.r, '#dfe6ff');
  }
  ctx.globalAlpha = 1;
  // Shards.
  for (const s of state.shards) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(time * 2);
    ctx.fillStyle = '#ffd678';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(-2.5, -2.5, 5, 5);
    ctx.restore();
  }
  // Enemies, bullets, player.
  for (const e of state.enemies) drawEnemy(ctx, e, time);
  ctx.fillStyle = '#ffe9a8';
  for (const b of state.bullets) circle(ctx, b.x, b.y, b.radius, '#ffe9a8');
  ctx.fillStyle = '#7ae0ff';
  for (const b of state.enemyBullets) circle(ctx, b.x, b.y, b.radius, '#7ae0ff');
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    circle(ctx, pt.x, pt.y, pt.r, pt.color);
  }
  ctx.globalAlpha = 1;
  drawLantern(ctx, state.player.x, state.player.y, state.player.aim, state.player.invulnerable, time);
  drawHud(ctx, state);

  if (screen === SCREEN_TITLE) {
    ctx.fillStyle = 'rgba(8, 10, 32, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(ctx, 180, 110, 600, 360);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd678';
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText('STARLIGHT', FIELD.width / 2, 190);
    ctx.fillText('SHEPHERD', FIELD.width / 2, 248);
    ctx.fillStyle = '#dfe6ff';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Guard the last lantern. Gather star shards,', FIELD.width / 2, 292);
    ctx.fillText('outlast the shadow wisps — wave after wave.', FIELD.width / 2, 318);
    ctx.fillStyle = '#9fb4ff';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('WASD / Arrows — move    Mouse — aim    Click / Space — shoot', FIELD.width / 2, 360);
    ctx.fillText('Shift — dash through danger    1 / 2 / 3 — pick upgrades', FIELD.width / 2, 386);
    ctx.fillStyle = '#ffd678';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Press ENTER to begin', FIELD.width / 2, 432);
    ctx.textAlign = 'left';
  }

  if (screen === SCREEN_UPGRADE) {
    ctx.fillStyle = 'rgba(8, 10, 32, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(ctx, 130, 120, 700, 340);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd678';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(`Wave ${state.wave} cleared!`, FIELD.width / 2, 180);
    ctx.fillStyle = '#dfe6ff';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Choose a blessing — press 1, 2 or 3', FIELD.width / 2, 216);
    state.upgrades.forEach((u, i) => {
      const x = 180 + i * 220;
      ctx.fillStyle = i === 0 ? '#ffd678' : '#2a2f6e';
      ctx.strokeStyle = '#ffd678';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, 250, 190, 150, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = i === 0 ? '#3a2b00' : '#ffe9a8';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(`${i + 1}. ${u.name}`, x + 95, 300);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = i === 0 ? '#3a2b00' : '#dfe6ff';
      ctx.fillText(u.blurb, x + 95, 330);
    });
    ctx.textAlign = 'left';
  }

  if (screen === SCREEN_OVER) {
    ctx.fillStyle = 'rgba(20, 6, 18, 0.66)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(ctx, 230, 130, 500, 330);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5d73';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('THE LIGHT FADES', FIELD.width / 2, 205);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`Score ${state.score}`, FIELD.width / 2, 262);
    ctx.fillStyle = '#dfe6ff';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(`Wave ${state.wave}  ·  ${state.kills} wisps banished  ·  ${state.shardsCollected} shards gathered`, FIELD.width / 2, 298);
    ctx.fillText(`Best ${Math.max(state.best, state.score)}`, FIELD.width / 2, 326);
    ctx.fillStyle = '#ffd678';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Press R to play again', FIELD.width / 2, 392);
    ctx.textAlign = 'left';
  }
}
