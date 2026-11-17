// Tiny WebAudio synth: no sound files, every effect is an oscillator
// shaped in code. Created lazily on the first user gesture (browsers
// block audio before that) and silent when unavailable.
export function makeAudio() {
  let ctx = null;
  let muted = false;
  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  }
  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    shoot() {
      tone(720, 0.08, 'square', 0.05, 420);
    },
    hit() {
      tone(220, 0.1, 'triangle', 0.09, 90);
    },
    collect() {
      tone(880, 0.12, 'sine', 0.08, 1320);
    },
    hurt() {
      tone(160, 0.3, 'sawtooth', 0.12, 60);
    },
    wave() {
      tone(330, 0.25, 'sine', 0.09, 660);
    },
    upgrade() {
      tone(523, 0.12, 'sine', 0.09);
      setTimeout(() => tone(784, 0.18, 'sine', 0.09), 90);
    },
    over() {
      tone(392, 0.3, 'triangle', 0.1, 196);
      setTimeout(() => tone(262, 0.5, 'triangle', 0.1, 131), 220);
    },
  };
}
