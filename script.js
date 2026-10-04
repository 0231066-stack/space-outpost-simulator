// ── Mission configuration ────────────────────────────────────────────
const MISSION_CONFIG = {
  moon: { name: 'Moon Base',    days: 14, radiationGain: 3, difficulty: 'Standard' },
  mars: { name: 'Mars Outpost', days: 21, radiationGain: 2, difficulty: 'Hard' },
};

// ── Resource metadata (GBA palette) ──────────────────────────────────
const RESOURCE_META = {
  oxygen:    { label: 'Oxygen',            color: '#4aa3e0' },
  food:      { label: 'Food',              color: '#57c04f' },
  power:     { label: 'Power',             color: '#f2cf3f' },
  water:     { label: 'Water',             color: '#7fd0f4' },
  radiation: { label: 'Radiation',         color: '#b07fd8' },
  habitat:   { label: 'Habitat Stability', color: '#e08a3a' },
  morale:    { label: 'Crew Morale',       color: '#e86a9a' },
};

// Base daily demand, before systems and crew offset it
const DAILY_DRAIN = { oxygen: 8, food: 6, power: 5, water: 5, habitat: 4 };

// ── System metadata ──────────────────────────────────────────────────
const SYSTEM_META = {
  lifeSupport: { label: 'Life Support', desc: 'Recycles oxygen & water' },
  power:       { label: 'Power',        desc: 'Generates power' },
  food:        { label: 'Food',         desc: 'Grows food' },
  shielding:   { label: 'Shielding',    desc: 'Holds back radiation' },
  habitat:     { label: 'Habitat',      desc: 'Maintains structure' },
};

// ── Crew metadata ────────────────────────────────────────────────────
const CREW_META = {
  engineer:         { label: 'Engineer',          desc: 'Boosts power & habitat upkeep' },
  botanist:         { label: 'Botanist',          desc: 'Boosts food production' },
  lifeSupport:      { label: 'Life Support Tech', desc: 'Boosts oxygen & water recycling' },
  shieldSpecialist: { label: 'Shield Specialist', desc: 'Reduces radiation build-up' },
};

// ── Objectives ───────────────────────────────────────────────────────
const OBJECTIVE_DEFS = [
  { id: 'builder',  label: 'Reach level 5 in any system' },
  { id: 'stocked',  label: 'Hold every resource above 80 at once' },
  { id: 'shielded', label: 'Bring radiation below 15' },
  { id: 'morale',   label: 'Raise crew morale above 85' },
  { id: 'survive',  label: 'Survive the full mission window' },
];

// ── Upgrade actions ──────────────────────────────────────────────────
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

    objectives: {
      builder: false,
      stocked: false,
      shielded: false,
      morale: false,
      survive: false,
    },

    log: [],
  };
}

let game = createGame('moon');
let prevResources = null; // snapshot for change-flash feedback

function clamp(value) { return Math.max(0, Math.min(100, value)); }
function crewCount() { return Object.values(game.crew).reduce((sum, n) => sum + n, 0); }
function log(msg, type) { game.log.unshift({ day: game.day, msg, type: type || '' }); }

// ── Economy: systems produce, crew amplifies ─────────────────────────
function production() {
  const s = game.systems;
  const c = game.crew;
  return {
    oxygen:    s.lifeSupport * 2.5 + c.lifeSupport * 2,
    water:     s.lifeSupport * 2   + c.lifeSupport * 1.5,
    food:      s.food * 2.5        + c.botanist * 3,
    power:     s.power * 4         + c.engineer * 3,
    habitat:   s.habitat * 1.5     + c.engineer * 1,
    radiation: s.shielding * 2     + c.shieldSpecialist * 2,
  };
}

// Net change per day — shown on the resource cards
function netPerDay() {
  const p = production();
  const health = (game.resources.oxygen + game.resources.food + game.resources.power + game.resources.water + game.resources.habitat + (100 - game.resources.radiation)) / 6;
  return {
    oxygen:    p.oxygen  - DAILY_DRAIN.oxygen,
    food:      p.food    - DAILY_DRAIN.food,
    power:     p.power   - DAILY_DRAIN.power,
    water:     p.water   - DAILY_DRAIN.water,
    habitat:   p.habitat - DAILY_DRAIN.habitat,
    radiation: MISSION_CONFIG[game.mission].radiationGain - p.radiation,
    morale:    (health - 50) / 10,
  };
}

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

  for (const key in game.resources) game.resources[key] = clamp(game.resources[key]);

  resolveDailyEvent();
  updateGameState();
}

// ── Daily simulation ─────────────────────────────────────────────────
function resolveDailyEvent() {
  const cfg = MISSION_CONFIG[game.mission];
  const r = game.resources;
  const p = production();
  const roll = Math.random();

  if (roll < 0.2) {
    // solar flare
    r.radiation += 18;
    r.power -= 10;
    r.morale -= 6;
    log('☀ Solar flare! Radiation surged (+18), power and morale dipped.', 'alert');
  } else if (roll < 0.4) {
    // dust storm
    r.power -= 12;
    r.food -= 6;
    log('🌪 Dust storm! Power (−12) and food (−6) took a hit.', 'alert');
  } else if (roll < 0.6) {
    // equipment issue
    r.oxygen -= 12;
    r.power -= 8;
    log('⚙ Equipment issue! Oxygen (−12) and power (−8) faltered.', 'alert');
  } else {
    // good day
    r.oxygen += 5;
    r.food += 6;
    r.morale += 5;
    log('🙂 A calm day — oxygen, food and morale all recovered.', 'success');
  }

  // Systems produce, crews amplify, daily demand is consumed
  r.oxygen  += p.oxygen  - DAILY_DRAIN.oxygen;
  r.food    += p.food    - DAILY_DRAIN.food;
  r.power   += p.power   - DAILY_DRAIN.power;
  r.water   += p.water   - DAILY_DRAIN.water;
  r.habitat += p.habitat - DAILY_DRAIN.habitat;

  // Radiation builds up; shielding and specialists hold it back
  r.radiation += cfg.radiationGain - p.radiation;

  // Morale drifts with the overall health of the outpost
  const health = (r.oxygen + r.food + r.power + r.water + r.habitat + (100 - r.radiation)) / 6;
  r.morale += (health - 50) / 10;

  for (const key in r) r[key] = clamp(r[key]);

  updateObjectives();

  game.day += 1;
  checkMissionEnd(cfg);
}

// ── Objectives ───────────────────────────────────────────────────────
function updateObjectives() {
  const r = game.resources;
  const o = game.objectives;
  if (Math.max(...Object.values(game.systems)) >= 5) o.builder = true;
  if (r.oxygen > 80 && r.food > 80 && r.power > 80 && r.water > 80 && r.habitat > 80) o.stocked = true;
  if (r.radiation < 15) o.shielded = true;
  if (r.morale > 85) o.morale = true;
}

// ── Win / lose checks ────────────────────────────────────────────────
function checkMissionEnd(cfg) {
  const r = game.resources;

  const fatal = [
    [r.oxygen <= 0,      'Oxygen depleted. The crew has suffocated.'],
    [r.water <= 0,       'Water reserves depleted. The crew has dehydrated.'],
    [r.food <= 0,        'Food supplies exhausted. The crew has starved.'],
    [r.power <= 0,       'Power systems offline. The outpost has gone dark.'],
    [r.habitat <= 0,     'Habitat structural failure. The base has decompressed.'],
    [r.radiation >= 100, 'Radiation levels lethal. The crew has been exposed.'],
    [r.morale <= 0,      'Crew morale collapsed. The mission has been abandoned.'],
  ];

  for (const [failed, msg] of fatal) {
    if (failed) { endGame(false, msg); return; }
  }

  const critical = [r.oxygen, r.food, r.power, r.water, r.habitat, r.morale].filter(v => v < 20).length;
  game.status = critical >= 2 ? 'Critical' : critical >= 1 ? 'Warning' : 'Nominal';

  if (game.day > cfg.days) {
    game.objectives.survive = true;
    endGame(true, `Mission complete! The outpost survived all ${cfg.days} days.`);
  }
}

function endGame(won, msg) {
  game.gameOver = true;
  game.won = won;
  game.status = won ? 'Mission Complete' : 'Mission Failed';
  log(msg, won ? 'success' : 'failure');
  log(`Final score: ${computeScore().toLocaleString()} points.`, won ? 'success' : '');
}

// ── Score ────────────────────────────────────────────────────────────
function computeScore() {
  const r = game.resources;
  const dayPoints = (game.day - 1) * 100;
  const levelPoints = Object.values(game.systems).reduce((sum, lvl) => sum + lvl, 0) * 150;
  const resourcePoints = ['oxygen', 'food', 'power', 'water', 'habitat', 'morale'].reduce((sum, k) => sum + Math.round(r[k]), 0) * 5;
  const objectivePoints = Object.values(game.objectives).filter(Boolean).length * 500;
  const winBonus = game.won ? 1000 : 0;
  return dayPoints + levelPoints + resourcePoints + objectivePoints + winBonus;
}

// ── Rendering ────────────────────────────────────────────────────────
function updateGameState() {
  const cfg = MISSION_CONFIG[game.mission];

  document.getElementById('missionName').textContent = cfg.name;
  document.getElementById('dayValue').textContent = `${Math.min(game.day, cfg.days)} / ${cfg.days}`;
  document.getElementById('crewValue').textContent = crewCount();
  document.getElementById('scoreValue').textContent = computeScore().toLocaleString();
  document.getElementById('statusValue').textContent = game.status;

  const rates = netPerDay();
  const prev = prevResources || {};

  // Resources with their daily rate; values flash when they change
  const grid = document.getElementById('resourceGrid');
  grid.innerHTML = '';
  for (const [key, meta] of Object.entries(RESOURCE_META)) {
    const val = Math.round(game.resources[key]);
    const rate = rates[key];
    const rateText = Math.abs(rate) < 0.05 ? 'steady' : `${rate > 0 ? '+' : ''}${rate.toFixed(1)}/day`;
    let rateClass = 'steady';
    if (key === 'radiation') rateClass = rate > 0.05 ? 'down' : rate < -0.05 ? 'up' : 'steady';
    else rateClass = rate > 0.05 ? 'up' : rate < -0.05 ? 'down' : 'steady';

    let flash = '';
    if (prev[key] !== undefined && Math.round(prev[key]) !== val) {
      const improved = key === 'radiation' ? val < prev[key] : val > prev[key];
      flash = improved ? 'flash-up' : 'flash-down';
    }

    const card = document.createElement('div');
    card.className = 'resource-card';
    card.innerHTML = `
      <div class="resource-header">
        <span class="label">${meta.label}</span>
        <span class="resource-value"><strong class="${flash}">${val}</strong></span>
      </div>
      <div class="progress-bar"><span class="progress-fill" style="width:${val}%;background-color:${meta.color}"></span></div>
      <span class="resource-rate ${rateClass}">${rateText}</span>
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

  // Crew
  const crewList = document.getElementById('crewList');
  crewList.innerHTML = '';
  for (const [key, meta] of Object.entries(CREW_META)) {
    const row = document.createElement('div');
    row.className = 'system-row';
    row.innerHTML = `
      <div><strong>${meta.label}</strong><small>${meta.desc}</small></div>
      <span class="system-badge">×${game.crew[key]}</span>
    `;
    crewList.appendChild(row);
  }

  // Objectives
  const objList = document.getElementById('objectivesList');
  objList.innerHTML = '';
  OBJECTIVE_DEFS.forEach(def => {
    const done = game.objectives[def.id];
    const row = document.createElement('div');
    row.className = 'system-row';
    row.innerHTML = `
      <div><strong>${def.label}</strong></div>
      <span class="system-badge ${done ? 'done' : ''}">${done ? '✓' : '—'}</span>
    `;
    objList.appendChild(row);
  });

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

  prevResources = { ...game.resources };
}

// ── Init ─────────────────────────────────────────────────────────────
function startMission(missionName) {
  game = createGame(missionName);
  prevResources = null;
  log(`Mission initiated: ${MISSION_CONFIG[missionName].name}. Survive ${MISSION_CONFIG[missionName].days} days.`, 'success');
  updateGameState();
}

document.querySelectorAll('.mission-btn').forEach(btn => {
  btn.addEventListener('click', () => startMission(btn.dataset.mission));
});

startMission('moon');
