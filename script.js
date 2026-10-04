// ── Mission definitions ──────────────────────────────────────────────
const MISSIONS = {
  lunar: { name: 'Lunar Base', days: 14, crew: 6, radiationRisk: 0.22, dustRisk: 0.05, solarMult: 1.3 },
  mars:  { name: 'Mars Outpost', days: 21, crew: 8, radiationRisk: 0.10, dustRisk: 0.20, solarMult: 0.5 },
};

// ── Resource metadata ────────────────────────────────────────────────
const RESOURCE_META = {
  oxygen:  { label: 'Oxygen',  color: '#58d0ff' },
  food:    { label: 'Food',    color: '#6fe7b2' },
  power:   { label: 'Power',   color: '#f7d76a' },
  water:   { label: 'Water',   color: '#7eaaf7' },
  habitat: { label: 'Habitat Stability', color: '#ffb066' },
};

// ── System metadata ──────────────────────────────────────────────────
const SYSTEM_META = {
  lifeSupport: { label: 'Life Support',       desc: 'Oxygen & water recycling' },
  shielding:   { label: 'Radiation Shielding', desc: 'Protects crew from cosmic radiation' },
  powerGen:    { label: 'Power Generation',    desc: 'Solar arrays & reactor output' },
  foodProd:    { label: 'Food Production',     desc: 'Hydroponics & ration management' },
  habitatInt:  { label: 'Habitat Integrity',   desc: 'Structural soundness of the base' },
};

// ── Player actions (one per turn) ─────────────────────────────────────
const ACTIONS = [
  { system: 'lifeSupport', label: 'Boost Life Support',      desc: '+15 Life Support · −10 Power' },
  { system: 'shielding',   label: 'Deploy Shielding',         desc: '+15 Shielding · −8 Power' },
  { system: 'powerGen',    label: 'Run Power Generator',      desc: '+15 Power Gen · −5 Habitat' },
  { system: 'foodProd',    label: 'Tend Hydroponics',         desc: '+15 Food Prod · −10 Power' },
  { system: 'habitatInt',  label: 'Repair Habitat',          desc: '+15 Integrity · −10 Power' },
];

// ── Game state ───────────────────────────────────────────────────────
let state = null;

function clamp(v) { return Math.max(0, Math.min(100, v)); }

function startMission(key) {
  const m = MISSIONS[key];
  state = {
    missionKey: key,
    mission: m,
    day: 1,
    crew: m.crew,
    status: 'Nominal',
    resources: { oxygen: 82, food: 80, power: 75, water: 80, habitat: 85 },
    systems:   { lifeSupport: 60, shielding: 50, powerGen: 65, foodProd: 55, habitatInt: 70 },
    selectedAction: null,
    gameOver: false,
    won: false,
    log: [],
  };
  log(`Mission initiated: ${m.name}. Survive ${m.days} days with ${m.crew} crew.`, 'success');
  render();
}

function log(msg, type) {
  state.log.unshift({ day: state.day, msg, type: type || '' });
}

// ── Turn processing ──────────────────────────────────────────────────
function applyAction() {
  if (!state.selectedAction || state.gameOver) return;
  const action = ACTIONS.find(a => a.system === state.selectedAction);
  const sys = state.selectedAction;

  state.systems[sys] = clamp(state.systems[sys] + 15);

  // Action costs
  if (sys === 'powerGen') {
    state.resources.habitat = clamp(state.resources.habitat - 5);
  } else if (sys === 'habitatInt') {
    state.resources.power = clamp(state.resources.power - 10);
  } else {
    state.resources.power = clamp(state.resources.power - (sys === 'shielding' ? 8 : 10));
  }

  log(`Action: ${action.label}`);
  state.selectedAction = null;
  advanceDay();
}

function advanceDay() {
  if (state.gameOver) return;
  const m = state.mission;
  const s = state.systems;
  const r = state.resources;
  const crew = state.crew;
  const hasPower = r.power > 0;

  // Oxygen — consumed by crew, recycled by life support
  r.oxygen = clamp(r.oxygen + s.lifeSupport * 0.12 * (hasPower ? 1 : 0.3) - crew * 0.7 * (1 - s.lifeSupport / 180));

  // Food — consumed by crew, produced by hydroponics
  r.food = clamp(r.food + s.foodProd * 0.10 * (hasPower ? 1 : 0.2) - crew * 0.6 * (1 - s.foodProd / 200));

  // Water — consumed by crew, recycled by life support
  r.water = clamp(r.water + s.lifeSupport * 0.08 * (hasPower ? 1 : 0.3) - crew * 0.5 * (1 - s.lifeSupport / 200));

  // Power — produced by generator, consumed by all systems
  r.power = clamp(r.power + s.powerGen * 0.18 * m.solarMult - ((s.lifeSupport + s.shielding + s.foodProd + s.habitatInt) * 0.04 + crew * 0.3));

  // Habitat — slowly degrades, mitigated by integrity
  r.habitat = clamp(r.habitat - 2.5 * (1 - s.habitatInt / 140));

  // System wear
  for (const k in s) s[k] = clamp(s[k] - 1.5);

  rollEvents();
  checkConditions();

  if (!state.gameOver) {
    state.day++;
    if (state.day > m.days) {
      if (r.habitat > 20 && r.oxygen > 0 && r.food > 0 && r.water > 0) {
        state.won = true;
        state.gameOver = true;
        state.status = 'Mission Complete';
        log('Mission complete! The outpost survived the full mission window.', 'success');
      } else {
        state.gameOver = true;
        state.status = 'Mission Failed';
        log('The mission window ended, but the outpost was not in a stable state.', 'failure');
      }
    }
  }

  render();
}

// ── Random events ────────────────────────────────────────────────────
function rollEvents() {
  const m = state.mission;

  if (Math.random() < m.radiationRisk * 0.3) {
    const damage = 8 + Math.random() * 12;
    const mitigated = damage * (1 - state.systems.shielding / 130);
    state.resources.habitat = clamp(state.resources.habitat - mitigated);
    if (mitigated > 5) state.crew = Math.max(0, state.crew - 1);
    log(`☀ Solar storm! Radiation impacts the outpost (−${Math.round(mitigated)} habitat${mitigated > 5 ? ', 1 crew lost' : ''}).`, 'alert');
  }

  if (Math.random() < m.dustRisk * 0.3) {
    const powerLoss = 6 + Math.random() * 10;
    state.resources.power = clamp(state.resources.power - powerLoss);
    state.systems.powerGen = clamp(state.systems.powerGen - 5);
    log(`🌪 Dust storm! Solar arrays degraded (−${Math.round(powerLoss)} power).`, 'alert');
  }

  if (Math.random() < 0.08) {
    const keys = Object.keys(state.systems);
    const failKey = keys[Math.floor(Math.random() * keys.length)];
    state.systems[failKey] = clamp(state.systems[failKey] - 12);
    log(`⚙ Equipment failure in ${SYSTEM_META[failKey].label} (−12).`, 'alert');
  }
}

// ── Win / lose checks ────────────────────────────────────────────────
function checkConditions() {
  const r = state.resources;
  const failures = [
    [r.oxygen,  'Oxygen depleted. The crew has suffocated.'],
    [r.food,    'Food supplies exhausted. The crew has starved.'],
    [r.water,   'Water reserves depleted. The crew has dehydrated.'],
    [r.power,   'Power systems offline. The outpost has gone dark.'],
    [r.habitat, 'Habitat structural failure. The base has decompressed.'],
  ];

  for (const [val, msg] of failures) {
    if (val <= 0) {
      state.gameOver = true;
      state.status = 'Mission Failed';
      log(msg, 'failure');
      return;
    }
  }

  if (state.crew <= 0) {
    state.gameOver = true;
    state.status = 'Mission Failed';
    log('All crew lost. The outpost stands empty.', 'failure');
    return;
  }

  const critical = Object.values(r).filter(v => v < 20).length;
  state.status = critical >= 2 ? 'Critical' : critical >= 1 ? 'Warning' : 'Nominal';
}

// ── Rendering ────────────────────────────────────────────────────────
function render() {
  document.getElementById('missionName').textContent = state.mission.name;
  document.getElementById('dayValue').textContent = `${state.day} / ${state.mission.days}`;
  document.getElementById('crewValue').textContent = state.crew;
  document.getElementById('statusValue').textContent = state.status;

  // Resource cards
  const grid = document.getElementById('resourceGrid');
  grid.innerHTML = '';
  for (const [key, meta] of Object.entries(RESOURCE_META)) {
    const val = Math.round(state.resources[key]);
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.innerHTML = `
      <div class="resource-header">
        <span class="label">${meta.label}</span>
        <span class="resource-value"><strong>${val}</strong></span>
      </div>
      <div class="progress-bar"><span class="progress-fill" style="width:${val}%;background:${meta.color}"></span></div>
    `;
    grid.appendChild(card);
  }

  // Systems list
  const sysList = document.getElementById('systemsList');
  sysList.innerHTML = '';
  for (const [key, meta] of Object.entries(SYSTEM_META)) {
    const val = Math.round(state.systems[key]);
    const row = document.createElement('div');
    row.className = 'system-row';
    row.innerHTML = `
      <div><strong>${meta.label}</strong><small>${meta.desc}</small></div>
      <span class="system-badge">${val}</span>
    `;
    sysList.appendChild(row);
  }

  // Action buttons
  const actBtns = document.getElementById('actionButtons');
  actBtns.innerHTML = '';
  ACTIONS.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'action-btn' + (state.selectedAction === a.system ? ' active' : '');
    btn.innerHTML = `<strong>${a.label}</strong><small>${a.desc}</small>`;
    btn.disabled = state.gameOver;
    btn.onclick = () => {
      if (state.gameOver) return;
      state.selectedAction = a.system;
      render();
    };
    actBtns.appendChild(btn);
  });

  // Advance / restart button
  const advBtn = document.getElementById('advanceDayBtn');
  if (state.gameOver) {
    advBtn.textContent = state.won ? 'Mission Complete — Restart' : 'Mission Failed — Restart';
    advBtn.disabled = false;
    advBtn.onclick = () => startMission(state.missionKey);
  } else {
    advBtn.textContent = 'Advance Day';
    advBtn.disabled = !state.selectedAction;
    advBtn.onclick = () => { if (state.selectedAction) applyAction(); };
  }

  // Mission log
  const logEl = document.getElementById('missionLog');
  logEl.innerHTML = '';
  state.log.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'log-entry ' + entry.type;
    div.innerHTML = `<small>Day ${entry.day}</small><br>${entry.msg}`;
    logEl.appendChild(div);
  });

  // Mission picker active state
  document.querySelectorAll('.mission-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mission === state.missionKey);
  });
}

// ── Init ─────────────────────────────────────────────────────────────
document.querySelectorAll('.mission-btn').forEach(btn => {
  btn.addEventListener('click', () => startMission(btn.dataset.mission));
});

startMission('lunar');
