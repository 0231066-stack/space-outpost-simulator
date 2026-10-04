// ── Mission configuration ────────────────────────────────────────────
const MISSION_CONFIG = {
  moon: { name: 'Moon Base',    days: 14, radiationGain: 3, solarRisk: 0.20, dustRisk: 0.05 },
  mars: { name: 'Mars Outpost', days: 21, radiationGain: 2, solarRisk: 0.10, dustRisk: 0.20 },
};

// ── Resource metadata ────────────────────────────────────────────────
const RESOURCE_META = {
  oxygen:    { label: 'Oxygen',            color: '#58d0ff' },
  food:      { label: 'Food',              color: '#6fe7b2' },
  power:     { label: 'Power',             color: '#f7d76a' },
  water:     { label: 'Water',             color: '#7eaaf7' },
  radiation: { label: 'Radiation',         color: '#caa7ff' },
  habitat:   { label: 'Habitat Stability', color: '#ffb066' },
  morale:    { label: 'Crew Morale',       color: '#ff9ecb' },
};

// ── System metadata ──────────────────────────────────────────────────
const SYSTEM_META = {
  lifeSupport: { label: 'Life Support', desc: 'Oxygen & water recycling' },
  power:       { label: 'Power',        desc: 'Generation & storage' },
  food:        { label: 'Food',         desc: 'Hydroponics & rations' },
  shielding:   { label: 'Shielding',    desc: 'Radiation protection' },
  habitat:     { label: 'Habitat',      desc: 'Structural integrity' },
};

// ── Available actions ────────────────────────────────────────────────
const ACTIONS = [
  { name: 'upgradePower',       label: 'Upgrade Power',        desc: '+1 Power system · +12 Power · −2 Habitat' },
  { name: 'upgradeFood',        label: 'Upgrade Food',         desc: '+1 Food system · +15 Food · −8 Power' },
  { name: 'upgradeLifeSupport', label: 'Upgrade Life Support', desc: '+1 Life Support · +10 Oxygen · +10 Water · −6 Power' },
  { name: 'upgradeShielding',   label: 'Upgrade Shielding',    desc: '+1 Shielding · −12 Radiation · −10 Power' },
  { name: 'repairHabitat',      label: 'Repair Habitat',       desc: '+1 Habitat system · +12 Habitat · −5 Power' },
];

// ── Game state ───────────────────────────────────────────────────────
function createGame(mission) {
  return {
    day: 1,
    mission: mission, // "moon" or "mars"
    status: 'Nominal',
    gameOver: false,
    won: false,

    resources: {
      oxygen: 80,
      food: 75,
      power: 70,
      water: 78,
      radiation: 28,
      habitat: 80,
      morale: 70,
    },

    systems: {
      lifeSupport: 1,
      power: 1,
      food: 1,
      shielding: 1,
      habitat: 1,
    },

    crew: {
      engineer: 1,
      botanist: 1,
      lifeSupport: 1,
      shieldSpecialist: 1,
    },

    log: [],
  };
}

let game = createGame('moon');

function clamp(value) { return Math.max(0, Math.min(100, value)); }
function crewCount() { return Object.values(game.crew).reduce((sum, n) => sum + n, 0); }
function log(msg, type) { game.log.unshift({ day: game.day, msg, type: type || '' }); }

// ── Player actions ───────────────────────────────────────────────────
function applyAction(actionName) {
  if (game.gameOver) return;

  switch (actionName) {
    case "upgradePower":
      game.systems.power += 1;
      game.resources.power += 12;
      game.resources.habitat -= 2;
      break;

    case "upgradeFood":
      game.systems.food += 1;
      game.resources.food += 15;
      game.resources.power -= 8;
      break;

    case "upgradeLifeSupport":
      game.systems.lifeSupport += 1;
      game.resources.oxygen += 10;
      game.resources.water += 10;
      game.resources.power -= 6;
      break;

    case "upgradeShielding":
      game.systems.shielding += 1;
      game.resources.radiation -= 12;
      game.resources.power -= 10;
      break;

    case "repairHabitat":
      game.systems.habitat += 1;
      game.resources.habitat += 12;
      game.resources.power -= 5;
      break;
  }

  resolveDailyEvent();
  updateGameState();
}

// ── Daily simulation ─────────────────────────────────────────────────
function resolveDailyEvent() {
  if (game.gameOver) return;

  const cfg = MISSION_CONFIG[game.mission];
  const r = game.resources;
  const s = game.systems;
  const crew = crewCount();

  // Consumption and production
  r.oxygen    = clamp(r.oxygen    - (crew * 1.2 - s.lifeSupport * 2.5));
  r.water     = clamp(r.water     - (crew * 1.0 - s.lifeSupport * 2));
  r.food      = clamp(r.food      - (crew * 1.2 - s.food * 2.5));
  r.power     = clamp(r.power + s.power * 2.5 - (s.lifeSupport + s.power + s.food + s.shielding + s.habitat) * 0.9);
  r.radiation = clamp(r.radiation + cfg.radiationGain - s.shielding * 2.5);
  r.habitat   = clamp(r.habitat   - (1.8 - s.habitat * 0.5));

  // Morale tracks the overall health of the outpost
  const health = (r.oxygen + r.food + r.power + r.water + r.habitat + (100 - r.radiation)) / 6;
  r.morale = clamp(r.morale + (health - 50) / 12);

  resolveRandomEvent(cfg);
  checkMissionEnd(cfg);
}

// ── Random events ────────────────────────────────────────────────────
function resolveRandomEvent(cfg) {
  const r = game.resources;

  if (Math.random() < cfg.solarRisk * 0.4) {
    const surge = 8 + Math.random() * 10;
    r.radiation = clamp(r.radiation + surge);
    r.habitat = clamp(r.habitat - surge * 0.4);
    log(`☀ Solar storm! Radiation surged (+${Math.round(surge)}).`, 'alert');
  }

  if (Math.random() < cfg.dustRisk * 0.4) {
    const loss = 6 + Math.random() * 8;
    r.power = clamp(r.power - loss);
    log(`🌪 Dust storm! Power reserves drained (−${Math.round(loss)}).`, 'alert');
  }

  if (Math.random() < 0.1) {
    const keys = Object.keys(game.systems);
    const key = keys[Math.floor(Math.random() * keys.length)];
    game.systems[key] = Math.max(1, game.systems[key] - 1);
    log(`⚙ Equipment failure in ${SYSTEM_META[key].label} (−1 level).`, 'alert');
  }
}

// ── Win / lose checks ────────────────────────────────────────────────
function checkMissionEnd(cfg) {
  const r = game.resources;

  const fatal = [
    [r.oxygen <= 0,     'Oxygen depleted. The crew has suffocated.'],
    [r.water <= 0,      'Water reserves depleted. The crew has dehydrated.'],
    [r.food <= 0,       'Food supplies exhausted. The crew has starved.'],
    [r.power <= 0,      'Power systems offline. The outpost has gone dark.'],
    [r.habitat <= 0,    'Habitat structural failure. The base has decompressed.'],
    [r.radiation >= 100,'Radiation levels lethal. The crew has been exposed.'],
    [r.morale <= 0,     'Crew morale collapsed. The mission has been abandoned.'],
  ];

  for (const [failed, msg] of fatal) {
    if (failed) { endGame(false, msg); return; }
  }

  const critical = [r.oxygen, r.food, r.power, r.water, r.habitat, r.morale].filter(v => v < 20).length;
  game.status = critical >= 2 ? 'Critical' : critical >= 1 ? 'Warning' : 'Nominal';

  if (game.day >= cfg.days) {
    endGame(true, 'Mission complete! The outpost survived the full mission window.');
    return;
  }

  game.day++;
}

function endGame(won, msg) {
  game.gameOver = true;
  game.won = won;
  game.status = won ? 'Mission Complete' : 'Mission Failed';
  log(msg, won ? 'success' : 'failure');
}

// ── Rendering ────────────────────────────────────────────────────────
function updateGameState() {
  const cfg = MISSION_CONFIG[game.mission];

  document.getElementById('missionName').textContent = cfg.name;
  document.getElementById('dayValue').textContent = `${game.day} / ${cfg.days}`;
  document.getElementById('crewValue').textContent = crewCount();
  document.getElementById('statusValue').textContent = game.status;

  // Resources
  const grid = document.getElementById('resourceGrid');
  grid.innerHTML = '';
  for (const [key, meta] of Object.entries(RESOURCE_META)) {
    const val = Math.round(game.resources[key]);
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

  // Systems
  const sysList = document.getElementById('systemsList');
  sysList.innerHTML = '';
  for (const [key, meta] of Object.entries(SYSTEM_META)) {
    const row = document.createElement('div');
    row.className = 'system-row';
    row.innerHTML = `
      <div><strong>${meta.label}</strong><small>${meta.desc}</small></div>
      <span class="system-badge">Lv ${game.systems[key]}</span>
    `;
    sysList.appendChild(row);
  }

  // Actions — choosing one resolves the day
  const actBtns = document.getElementById('actionButtons');
  actBtns.innerHTML = '';
  ACTIONS.forEach(action => {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.innerHTML = `<strong>${action.label}</strong><small>${action.desc}</small>`;
    btn.disabled = game.gameOver;
    btn.onclick = () => applyAction(action.name);
    actBtns.appendChild(btn);
  });

  // Restart button, only once the mission has ended
  const restartBtn = document.getElementById('advanceDayBtn');
  restartBtn.style.display = game.gameOver ? 'block' : 'none';
  restartBtn.textContent = 'Restart Mission';
  restartBtn.disabled = false;
  restartBtn.onclick = () => startMission(game.mission);

  // Mission log
  const logEl = document.getElementById('missionLog');
  logEl.innerHTML = '';
  game.log.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'log-entry ' + entry.type;
    div.innerHTML = `<small>Day ${entry.day}</small><br>${entry.msg}`;
    logEl.appendChild(div);
  });

  // Mission picker
  document.querySelectorAll('.mission-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mission === game.mission);
  });
}

// ── Init ─────────────────────────────────────────────────────────────
function startMission(missionName) {
  game = createGame(missionName);
  log(`Mission initiated: ${MISSION_CONFIG[missionName].name}. Survive ${MISSION_CONFIG[missionName].days} days.`, 'success');
  updateGameState();
}

document.querySelectorAll('.mission-btn').forEach(btn => {
  btn.addEventListener('click', () => startMission(btn.dataset.mission));
});

startMission('moon');
