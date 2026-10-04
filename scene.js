// ── Overworld: walk the base and work at the buildings ───────────────
// Reads/writes game state through the API exposed by script.js.
(function () {
  const canvas = document.getElementById('worldCanvas');
  const promptEl = document.getElementById('worldPrompt');
  if (!canvas || !promptEl) return;

  const api = window.OutpostGame;

  const TILE = 16;
  const MAP = [
    '##########################',
    '#........................#',
    '#..PPP....GGG...LLL..SSS.#',
    '#..PPP....GGG...LLL..SSS.#',
    '#...d......d.....d....d..#',
    '#.~~~~...................#',
    '#.........HHHHHH.........#',
    '#.........HHHHHH.........#',
    '#...........dd...........#',
    '#..oooo.............oooo.#',
    '##########################',
  ];
  const ROWS = MAP.length;
  const COLS = MAP[0].length;
  const W = COLS * TILE;
  const H = ROWS * TILE;
  const SOLID = '#PGLSH~';

  // Buildings you can work at. `ty` is the mat you stand on to interact.
  const STATIONS = [
    { id: 'power',   label: 'POWER PLANT',  action: 'upgradePower',       system: 'power',       tx: 4,  ty: 4, tw: 1, bcol: 3,  brow: 2, prompt: 'upgrade Power (+12 Power)' },
    { id: 'food',    label: 'GREENHOUSE',   action: 'upgradeFood',        system: 'food',        tx: 11, ty: 4, tw: 1, bcol: 10, brow: 2, prompt: 'upgrade Food (+15 Food)' },
    { id: 'life',    label: 'LIFE SUPPORT', action: 'upgradeLifeSupport', system: 'lifeSupport', tx: 17, ty: 4, tw: 1, bcol: 16, brow: 2, prompt: 'upgrade Life Support (+10 Oxygen / +10 Water)' },
    { id: 'shield',  label: 'SHIELD ARRAY', action: 'upgradeShielding',   system: 'shielding',   tx: 22, ty: 4, tw: 1, bcol: 21, brow: 2, prompt: 'upgrade Shielding (−12 Radiation)' },
    { id: 'habitat', label: 'HABITAT DOME', action: 'repairHabitat',      system: 'habitat',     tx: 12, ty: 8, tw: 2, bcol: 10, brow: 6, prompt: 'repair the Habitat (+12 Stability)' },
  ];

  const START = { x: 12 * TILE + 8, y: 5 * TILE + 8 };

  // ── Sprite drawing ─────────────────────────────────────────────────
  function drawTree(c, x, y) {
    c.fillStyle = '#8a5a28';
    c.fillRect(x + 6, y + 12, 4, 4);
    c.fillStyle = '#2f8f3f';
    c.fillRect(x + 1, y + 2, 14, 11);
    c.fillStyle = '#57c04f';
    c.fillRect(x + 2, y + 1, 12, 3);
    c.fillRect(x + 3, y + 4, 4, 3);
    c.fillStyle = '#1f6b2e';
    c.fillRect(x + 1, y + 11, 14, 2);
  }

  function drawWater(c, x, y) {
    c.fillStyle = '#3aa0e0';
    c.fillRect(x, y, TILE, TILE);
    c.fillStyle = '#2a7fc0';
    c.fillRect(x, y, TILE, 2);
    c.fillStyle = '#82d2f4';
    c.fillRect(x + 2, y + 5, 6, 2);
    c.fillRect(x + 9, y + 11, 5, 2);
  }

  function drawFlower(c, x, y) {
    c.fillStyle = '#3f8f3f';
    c.fillRect(x + 7, y + 10, 2, 4);
    c.fillStyle = '#e0483a';
    c.fillRect(x + 5, y + 6, 6, 5);
    c.fillStyle = '#f08a7a';
    c.fillRect(x + 6, y + 7, 2, 2);
  }

  function drawBuilding(c, st) {
    const x = st.bcol * TILE;
    const y = st.brow * TILE;
    const w = (st.id === 'habitat' ? 6 : 3) * TILE;

    if (st.id === 'power') {
      c.fillStyle = '#b8bec4'; c.fillRect(x + 1, y + 6, w - 2, 25);
      c.fillStyle = '#8a9199'; c.fillRect(x + 1, y + 4, w - 2, 5);
      c.fillRect(x + 1, y + 28, w - 2, 3);
      c.fillStyle = '#4aa3e0';
      c.fillRect(x + 5, y + 11, 8, 6);
      c.fillRect(x + 16, y + 11, 8, 6);
      c.fillStyle = '#f2cf3f';
      c.fillRect(x + 1, y + 23, w - 2, 3);
      c.fillRect(x + 37, y + 7, 6, 7);
      c.fillRect(x + 32, y + 13, 7, 6);
      c.fillRect(x + 36, y + 18, 5, 6);
    } else if (st.id === 'food') {
      c.fillStyle = '#a8e0b0'; c.fillRect(x + 1, y + 6, w - 2, 25);
      c.fillStyle = '#5aa06a';
      c.fillRect(x + 1, y + 4, w - 2, 5);
      c.fillRect(x + 1, y + 28, w - 2, 3);
      c.fillStyle = '#7cc48a';
      c.fillRect(x + 12, y + 9, 2, 22);
      c.fillRect(x + 24, y + 9, 2, 22);
      c.fillRect(x + 36, y + 9, 2, 22);
      c.fillStyle = '#3f8f3f';
      c.fillRect(x + 5, y + 20, 5, 6);
      c.fillRect(x + 17, y + 22, 4, 4);
      c.fillRect(x + 29, y + 19, 5, 7);
      c.fillRect(x + 40, y + 22, 4, 4);
    } else if (st.id === 'life') {
      c.fillStyle = '#f4f4f4'; c.fillRect(x + 1, y + 6, w - 2, 25);
      c.fillStyle = '#cdd5da';
      c.fillRect(x + 1, y + 4, w - 2, 5);
      c.fillRect(x + 1, y + 28, w - 2, 3);
      c.fillStyle = '#4aa3e0'; c.fillRect(x + 6, y + 10, 12, 18);
      c.fillStyle = '#9ad8f8'; c.fillRect(x + 8, y + 12, 3, 14);
      c.fillStyle = '#7fd0f4'; c.fillRect(x + 22, y + 10, 22, 6);
      c.fillStyle = '#4aa3e0';
      c.fillRect(x + 24, y + 20, 8, 6);
      c.fillRect(x + 36, y + 20, 8, 6);
    } else if (st.id === 'shield') {
      c.fillStyle = '#b8bec4'; c.fillRect(x + 1, y + 12, w - 2, 19);
      c.fillStyle = '#8a9199'; c.fillRect(x + 1, y + 10, w - 2, 4);
      c.fillStyle = '#8a8f96';
      c.fillRect(x + 13, y + 12, 2, 7);
      c.fillRect(x + 33, y + 12, 2, 7);
      c.fillStyle = '#2a4a8a';
      c.fillRect(x + 6, y + 4, 16, 8);
      c.fillRect(x + 26, y + 4, 16, 8);
      c.fillStyle = '#4f7fd0';
      c.fillRect(x + 6, y + 7, 16, 1);
      c.fillRect(x + 26, y + 7, 16, 1);
      c.fillStyle = '#d64b3a'; c.fillRect(x + 1, y + 24, w - 2, 3);
    } else if (st.id === 'habitat') {
      c.fillStyle = '#c0c0c0'; c.fillRect(x + 28, y + 0, 40, 4);
      c.fillStyle = '#d4d4d4'; c.fillRect(x + 16, y + 2, 64, 6);
      c.fillStyle = '#e8e8e8'; c.fillRect(x + 8, y + 6, 80, 26);
      c.fillStyle = '#b8b8b8'; c.fillRect(x + 8, y + 28, 80, 4);
      c.fillStyle = '#4aa3e0';
      c.fillRect(x + 18, y + 10, 12, 8);
      c.fillRect(x + 42, y + 10, 12, 8);
      c.fillRect(x + 66, y + 10, 12, 8);
      c.fillStyle = '#d64b3a'; c.fillRect(x + 8, y + 21, 80, 4);
      c.fillStyle = '#3a3f44'; c.fillRect(x + 42, y + 26, 12, 6);
    }
  }

  function drawPlayer(c, x, y, dir, frame) {
    const px = Math.round(x - 8);
    const py = Math.round(y - 8);
    const suit = '#f0f0f0';
    const suitDark = '#c3cbd0';
    const skin = '#f0c090';
    const hair = '#3a2a22';
    const ink = '#2b2f28';

    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.fillRect(px + 3, py + 15, 10, 2);

    // Legs (three-frame walk cycle)
    c.fillStyle = ink;
    if (frame === 1) {
      c.fillRect(px + 3, py + 13, 3, 3);
      c.fillRect(px + 10, py + 13, 3, 3);
    } else if (frame === 2) {
      c.fillRect(px + 5, py + 13, 3, 3);
      c.fillRect(px + 8, py + 13, 3, 3);
    } else {
      c.fillRect(px + 4, py + 13, 3, 3);
      c.fillRect(px + 9, py + 13, 3, 3);
    }

    // Body and arms
    c.fillStyle = suit;
    c.fillRect(px + 3, py + 8, 10, 6);
    c.fillRect(px + 1, py + 8, 2, 5);
    c.fillRect(px + 13, py + 8, 2, 5);
    c.fillStyle = suitDark;
    c.fillRect(px + 3, py + 12, 10, 2);

    // Head
    c.fillStyle = skin;
    c.fillRect(px + 4, py + 3, 8, 6);
    c.fillStyle = hair;
    c.fillRect(px + 3, py + 2, 10, 3);
    c.fillRect(px + 3, py + 3, 2, 4);
    c.fillRect(px + 11, py + 3, 2, 4);

    // Eyes, depending on facing
    c.fillStyle = ink;
    if (dir === 'down') {
      c.fillRect(px + 5, py + 6, 2, 2);
      c.fillRect(px + 9, py + 6, 2, 2);
    } else if (dir === 'left') {
      c.fillRect(px + 4, py + 6, 2, 2);
    } else if (dir === 'right') {
      c.fillRect(px + 10, py + 6, 2, 2);
    }
  }

  // ── Static terrain layer, drawn once ───────────────────────────────
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const lg = layer.getContext('2d');

  lg.fillStyle = '#7ec850';
  lg.fillRect(0, 0, W, H);
  lg.fillStyle = '#6cb844';
  for (let i = 0; i < 420; i++) lg.fillRect((i * 61) % W, (i * 37) % H, 2, 1);
  lg.fillStyle = '#8fd45f';
  for (let i = 0; i < 280; i++) lg.fillRect((i * 83) % W, (i * 53) % H, 2, 1);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = MAP[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (ch === '#') drawTree(lg, x, y);
      else if (ch === '~') drawWater(lg, x, y);
      else if (ch === 'o') drawFlower(lg, x, y);
    }
  }

  STATIONS.forEach(st => {
    drawBuilding(lg, st);
    // Mat in front of the building
    lg.fillStyle = '#cdbb8e';
    lg.fillRect(st.tx * TILE, st.ty * TILE + 10, st.tw * TILE, 6);
    lg.fillStyle = '#b6a479';
    lg.fillRect(st.tx * TILE, st.ty * TILE + 10, st.tw * TILE, 1);
  });

  // ── Player state and movement ──────────────────────────────────────
  const player = { x: START.x, y: START.y };
  let dir = 'down';
  let frame = 0;
  let walkTimer = 0;
  const keys = { up: false, down: false, left: false, right: false };
  const SPEED = 78;

  function solidAt(px, py) {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
    return SOLID.indexOf(MAP[row][col]) !== -1;
  }

  function blocked(cx, cy) {
    const hw = 5;
    const hh = 5;
    const oy = cy + 1;
    return solidAt(cx - hw, oy - hh) || solidAt(cx + hw - 1, oy - hh)
        || solidAt(cx - hw, oy + hh - 1) || solidAt(cx + hw - 1, oy + hh - 1);
  }

  function nearStation() {
    const pad = 7;
    for (const st of STATIONS) {
      const rx = st.tx * TILE - pad;
      const ry = st.ty * TILE - pad;
      const rw = st.tw * TILE + pad * 2;
      const rh = TILE + pad * 2;
      if (player.x >= rx && player.x <= rx + rw && player.y >= ry && player.y <= ry + rh) return st;
    }
    return null;
  }

  // ── Messages ───────────────────────────────────────────────────────
  let sticky = '';
  let stickyUntil = 0;
  let flashUntil = 0;
  let lastPrompt = '';

  function act() {
    if (!api || performance.now() < stickyUntil) return;
    const st = nearStation();
    if (!st || api.state().gameOver) return;

    api.applyAction(st.action);

    const entry = api.state().log[0];
    sticky = `<strong>${st.label}</strong>${entry ? entry.msg : 'Done.'}`;
    stickyUntil = performance.now() + 2400;
    flashUntil = performance.now() + 150;
  }

  function updatePrompt(now, st) {
    const s = api ? api.state() : null;
    let html;
    if (now < stickyUntil) {
      html = sticky;
    } else if (s && s.gameOver) {
      html = `<strong>${s.status}</strong>Press RESTART in the top bar to run a new mission.`;
    } else if (st && s) {
      html = `<strong>${st.label} · LV ${s.systems[st.system]}</strong>Press <b>A</b> to ${st.prompt}.`;
    } else {
      html = `<strong>WALK THE BASE</strong>Move with the arrow keys, then stand at a building and press <b>A</b> to spend the day.`;
    }
    if (html !== lastPrompt) {
      lastPrompt = html;
      promptEl.innerHTML = html;
    }
  }

  // ── Frame loop ─────────────────────────────────────────────────────
  const c = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;

  let last = performance.now();

  function step() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    let vx = 0;
    let vy = 0;
    if (keys.up) vy -= 1;
    if (keys.down) vy += 1;
    if (keys.left) vx -= 1;
    if (keys.right) vx += 1;

    if (vx || vy) {
      if (vx && vy) {
        vx *= 0.7071;
        vy *= 0.7071;
      }
      if (Math.abs(vx) > Math.abs(vy)) dir = vx < 0 ? 'left' : 'right';
      else if (vy !== 0) dir = vy < 0 ? 'up' : 'down';

      walkTimer += dt;
      frame = [0, 1, 0, 2][Math.floor(walkTimer * 8) % 4];

      const nx = player.x + vx * SPEED * dt;
      if (!blocked(nx, player.y)) player.x = nx;
      const ny = player.y + vy * SPEED * dt;
      if (!blocked(player.x, ny)) player.y = ny;
    } else {
      walkTimer = 0;
      frame = 0;
    }

    const st = nearStation();

    c.clearRect(0, 0, W, H);
    c.drawImage(layer, 0, 0);

    // Blinking marker over the mat you are standing on
    if (st && now >= stickyUntil && !(api && api.state().gameOver)) {
      const ax = (st.tx + st.tw / 2) * TILE;
      const ay = st.ty * TILE - 9 + Math.sin(now / 200) * 2;
      c.fillStyle = '#f2cf3f';
      c.fillRect(ax - 5, ay, 10, 3);
      c.fillRect(ax - 4, ay + 3, 8, 3);
      c.fillRect(ax - 2, ay + 6, 4, 3);
    }

    drawPlayer(c, player.x, player.y, dir, frame);

    if (now < flashUntil) {
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.fillRect(0, 0, W, H);
    }

    updatePrompt(now, st);
  }

  // ── Input ──────────────────────────────────────────────────────────
  const KEY_DIRS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  };

  window.addEventListener('keydown', e => {
    if (KEY_DIRS[e.key]) {
      keys[KEY_DIRS[e.key]] = true;
      e.preventDefault();
    } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'a' || e.key === 'A' || e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      act();
    }
  });

  window.addEventListener('keyup', e => {
    if (KEY_DIRS[e.key]) keys[KEY_DIRS[e.key]] = false;
  });

  window.addEventListener('blur', () => {
    keys.up = keys.down = keys.left = keys.right = false;
  });

  document.querySelectorAll('.pad-btn[data-dir]').forEach(btn => {
    const d = btn.dataset.dir;
    const down = e => { e.preventDefault(); keys[d] = true; };
    const up = () => { keys[d] = false; };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('pointercancel', up);
  });

  const actBtn = document.querySelector('.pad-btn[data-act]');
  if (actBtn) {
    actBtn.addEventListener('pointerdown', e => {
      e.preventDefault();
      act();
    });
  }

  // ── React to game state changes ────────────────────────────────────
  let lastMission = null;
  if (api) {
    api.onUpdate = () => {
      const s = api.state();
      if (s.mission !== lastMission) {
        lastMission = s.mission;
        player.x = START.x;
        player.y = START.y;
        dir = 'down';
        stickyUntil = 0;
      }
    };
    lastMission = api.state().mission;
  }

  // Paint the opening frame straight away, then drive the game on a timer
  step();
  setInterval(step, 16);
})();
