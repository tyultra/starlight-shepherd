// Keyboard + mouse input. WASD / arrows move, mouse aims, click or Space
// fires, Shift dashes, Enter / R starts and restarts, 1/2/3 picks upgrades.
export function makeInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    mouseX: 480,
    mouseY: 240,
    mouseDown: false,
    pressed: new Set(),
    axis() {
      let x = 0;
      let y = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y };
    },
    consume(code) {
      if (this.pressed.has(code)) {
        this.pressed.delete(code);
        return true;
      }
      return false;
    },
  };

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      keys.add(event.code);
      input.pressed.add(event.code);
    }
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    input.mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
  }
  function onMouseDown(event) {
    onMouseMove(event);
    input.mouseDown = true;
    input.pressed.add('Mouse');
  }
  function onMouseUp() {
    input.mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  return input;
}
