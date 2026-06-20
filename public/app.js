const FACTORS = [
  ['strength', '实力'],
  ['attackDefense', '攻防'],
  ['motivation', '战意'],
  ['marketValue', '身价'],
  ['squad', '阵容'],
  ['venue', '场馆'],
  ['history', '历史'],
  ['climate', '气候'],
  ['altitude', '海拔'],
  ['referee', '裁判'],
];

const state = {
  fixtures: [],
  activeIndex: 0,
  activeFixture: null,
  forecast: null,
};

const $ = (selector) => document.querySelector(selector);

const nodes = {
  fixtureList: $('#fixtureList'),
  fixtureSource: $('#fixtureSource'),
  fixtureForm: $('#fixtureForm'),
  activeMatchName: $('#activeMatchName'),
  modelVersion: $('#modelVersion'),
  refreshFixtures: $('#refreshFixtures'),
  runForecast: $('#runForecast'),
  importJson: $('#importJson'),
  exportJson: $('#exportJson'),
  jsonInput: $('#jsonInput'),
  factorEditor: $('#factorEditor'),
  marketWeight: $('#marketWeight'),
  marketWeightOut: $('#marketWeightOut'),
  homeTilt: $('#homeTilt'),
  homeTiltOut: $('#homeTiltOut'),
  tempoTilt: $('#tempoTilt'),
  tempoTiltOut: $('#tempoTiltOut'),
  drawTilt: $('#drawTilt'),
  drawTiltOut: $('#drawTiltOut'),
  probabilityBars: $('#probabilityBars'),
  forecastSummary: $('#forecastSummary'),
  confidenceBadge: $('#confidenceBadge'),
  xgHome: $('#xgHome'),
  xgAway: $('#xgAway'),
  teamDelta: $('#teamDelta'),
  marketAgreement: $('#marketAgreement'),
  scorePaths: $('#scorePaths'),
  factorRadar: $('#factorRadar'),
  radarTitle: $('#radarTitle'),
  driverList: $('#driverList'),
  aiExplain: $('#aiExplain'),
  aiSource: $('#aiSource'),
  aiText: $('#aiText'),
  runBacktest: $('#runBacktest'),
  actualHome: $('#actualHome'),
  actualAway: $('#actualAway'),
  backtestMetrics: $('#backtestMetrics'),
  backtestRows: $('#backtestRows'),
  matrixGrid: $('#matrixGrid'),
  previewMatch: $('#previewMatch'),
  previewPick: $('#previewPick'),
  previewScores: $('#previewScores'),
};

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

async function loadFixtures() {
  nodes.fixtureSource.textContent = 'Loading';
  const payload = await getJson('/api/fixtures');
  state.fixtures = payload.fixtures || [];
  state.activeIndex = 0;
  nodes.fixtureSource.textContent = `${payload.source} · ${payload.count} matches`;
  renderFixtureList();
  selectFixture(0);
}

function renderFixtureList() {
  nodes.fixtureList.innerHTML = state.fixtures.map((fixture, index) => `
    <button class="fixtureItem ${index === state.activeIndex ? 'active' : ''}" type="button" data-index="${index}">
      <b>${fixture.home.name} vs ${fixture.away.name}</b>
      <span>${formatDate(fixture.kickoff)} · ${fixture.competition}</span>
    </button>
  `).join('');
  nodes.fixtureList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => selectFixture(Number(button.dataset.index)));
  });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function selectFixture(index) {
  state.activeIndex = index;
  state.activeFixture = deepClone(state.fixtures[index]);
  renderFixtureList();
  fillForm(state.activeFixture);
  runForecast();
}

function fillForm(fixture) {
  $('#homeName').value = fixture.home.name;
  $('#awayName').value = fixture.away.name;
  $('#homeElo').value = fixture.home.elo;
  $('#awayElo').value = fixture.away.elo;
  $('#homeRank').value = fixture.home.fifaRank;
  $('#awayRank').value = fixture.away.fifaRank;
  $('#homeMarket').value = Math.round((fixture.market?.home || 0.33) * 100);
  $('#drawMarket').value = Math.round((fixture.market?.draw || 0.33) * 100);
  $('#awayMarket').value = Math.round((fixture.market?.away || 0.33) * 100);
  $('#totalGoals').value = fixture.market?.totalGoals || 2.5;
  nodes.activeMatchName.textContent = `${fixture.home.name} vs ${fixture.away.name}`;
  nodes.homeTilt.value = 0;
  nodes.tempoTilt.value = 0;
  nodes.drawTilt.value = 0;
  renderSliderOutputs();
  renderFactorEditor(fixture);
}

function renderFactorEditor(fixture) {
  nodes.factorEditor.innerHTML = FACTORS.map(([key, label]) => `
    <div class="factorRow">
      <span>${label}</span>
      <input data-factor="${key}" data-side="home" type="range" min="0" max="100" value="${fixture.home.factors[key] ?? 50}">
      <input data-factor="${key}" data-side="away" type="range" min="0" max="100" value="${fixture.away.factors[key] ?? 50}">
      <span class="factorValue" data-value="${key}">${fixture.home.factors[key] ?? 50}/${fixture.away.factors[key] ?? 50}</span>
    </div>
  `).join('');
  nodes.factorEditor.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      updateFactorValues();
      updateActiveFixtureFromForm();
    });
  });
}

function updateFactorValues() {
  for (const [key] of FACTORS) {
    const home = nodes.factorEditor.querySelector(`[data-factor="${key}"][data-side="home"]`).value;
    const away = nodes.factorEditor.querySelector(`[data-factor="${key}"][data-side="away"]`).value;
    nodes.factorEditor.querySelector(`[data-value="${key}"]`).textContent = `${home}/${away}`;
  }
}

function updateActiveFixtureFromForm() {
  const fixture = state.activeFixture || deepClone(state.fixtures[0]);
  fixture.home.name = $('#homeName').value.trim() || 'Home';
  fixture.away.name = $('#awayName').value.trim() || 'Away';
  fixture.home.elo = Number($('#homeElo').value || 1500);
  fixture.away.elo = Number($('#awayElo').value || 1500);
  fixture.home.fifaRank = Number($('#homeRank').value || 99);
  fixture.away.fifaRank = Number($('#awayRank').value || 99);
  fixture.market = {
    home: Number($('#homeMarket').value || 33) / 100,
    draw: Number($('#drawMarket').value || 33) / 100,
    away: Number($('#awayMarket').value || 33) / 100,
    totalGoals: Number($('#totalGoals').value || 2.5),
  };
  for (const [key] of FACTORS) {
    fixture.home.factors[key] = Number(nodes.factorEditor.querySelector(`[data-factor="${key}"][data-side="home"]`).value);
    fixture.away.factors[key] = Number(nodes.factorEditor.querySelector(`[data-factor="${key}"][data-side="away"]`).value);
  }
  state.activeFixture = fixture;
  nodes.activeMatchName.textContent = `${fixture.home.name} vs ${fixture.away.name}`;
  return fixture;
}

function applyScenario(fixture) {
  const next = deepClone(fixture);
  const homeTilt = Number(nodes.homeTilt.value || 0);
  const tempoTilt = Number(nodes.tempoTilt.value || 0);
  const drawTilt = Number(nodes.drawTilt.value || 0);
  for (const key of ['strength', 'attackDefense', 'squad']) {
    next.home.factors[key] = clamp(next.home.factors[key] + homeTilt, 0, 100);
    next.away.factors[key] = clamp(next.away.factors[key] - homeTilt, 0, 100);
  }
  next.market.totalGoals = clamp(Number(next.market.totalGoals || 2.5) + tempoTilt * 0.07, 1.2, 4.8);
  if (drawTilt !== 0) {
    next.market.draw = clamp(next.market.draw + drawTilt / 100, 0.05, 0.65);
    const remaining = 1 - next.market.draw;
    const nonDraw = next.market.home + next.market.away || 1;
    next.market.home = (next.market.home / nonDraw) * remaining;
    next.market.away = (next.market.away / nonDraw) * remaining;
  }
  return next;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function runForecast() {
  const base = updateActiveFixtureFromForm();
  const fixture = applyScenario(base);
  const marketWeight = Number(nodes.marketWeight.value || 50) / 100;
  const payload = await postJson('/api/forecast', { fixture, marketWeight });
  state.forecast = payload.forecast;
  state.activeFixture = base;
  renderForecast(payload.fixture, payload.forecast);
}

function renderForecast(fixture, forecast) {
  nodes.modelVersion.textContent = forecast.model;
  nodes.confidenceBadge.textContent = forecast.confidence;
  nodes.forecastSummary.textContent = `${fixture.home.name} ${pct(forecast.probabilities.home)} / 平 ${pct(forecast.probabilities.draw)} / ${fixture.away.name} ${pct(forecast.probabilities.away)}`;
  nodes.xgHome.textContent = forecast.expectedGoals.home.toFixed(2);
  nodes.xgAway.textContent = forecast.expectedGoals.away.toFixed(2);
  nodes.teamDelta.textContent = forecast.teamScores.delta.toFixed(1);
  nodes.marketAgreement.textContent = pct(forecast.marketAgreement);
  renderProbabilityBars(fixture, forecast);
  renderScorePaths(forecast);
  renderDrivers(forecast);
  renderRadar(forecast);
  renderMatrix(forecast);
  renderPreview(fixture, forecast);
}

function renderProbabilityBars(fixture, forecast) {
  const rows = [
    ['probHome', fixture.home.name, forecast.probabilities.home],
    ['probDraw', '平局', forecast.probabilities.draw],
    ['probAway', fixture.away.name, forecast.probabilities.away],
  ];
  nodes.probabilityBars.innerHTML = rows.map(([cls, label, value]) => `
    <div class="probRow ${cls}">
      <span>${label}</span>
      <div class="barTrack"><i style="width:${pct(value)}"></i></div>
      <b>${pct(value)}</b>
    </div>
  `).join('');
}

function renderScorePaths(forecast) {
  nodes.scorePaths.innerHTML = forecast.scorePaths.slice(0, 8).map((path) => `
    <article class="scoreCard">
      <b>${path.score}</b>
      <span>${path.label} · ${pct(path.probability)}</span>
    </article>
  `).join('');
}

function renderDrivers(forecast) {
  nodes.driverList.innerHTML = forecast.drivers.map((driver) => `
    <div class="driverRow">
      <span>${driver.label} · ${driver.side === 'home' ? '主队' : '客队'}</span>
      <em>${driver.impact.toFixed(2)}</em>
    </div>
  `).join('');
}

function renderRadar(forecast) {
  const canvas = nodes.factorRadar;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2 + 4;
  const radius = Math.min(width, height) * 0.34;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#d7deea';
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring += 1) {
    drawPolygon(ctx, forecast.factorBreakdown.map(() => ring * 25), cx, cy, radius, false);
  }
  drawPolygon(ctx, forecast.factorBreakdown.map((item) => item.away), cx, cy, radius, true, 'rgba(159,29,47,.18)', '#9f1d2f');
  drawPolygon(ctx, forecast.factorBreakdown.map((item) => item.home), cx, cy, radius, true, 'rgba(36,87,214,.16)', '#2457d6');
  ctx.fillStyle = '#6a7386';
  ctx.font = '700 10px system-ui';
  ctx.textAlign = 'center';
  forecast.factorBreakdown.forEach((item, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / forecast.factorBreakdown.length;
    ctx.fillText(item.label.split(' ')[0], cx + Math.cos(angle) * (radius + 26), cy + Math.sin(angle) * (radius + 26));
  });
}

function drawPolygon(ctx, values, cx, cy, radius, fill, fillStyle = 'transparent', strokeStyle = '#d7deea') {
  ctx.beginPath();
  values.forEach((value, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / values.length;
    const r = radius * value / 100;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = fill ? 2 : 1;
  if (fill) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  ctx.stroke();
}

function renderMatrix(forecast) {
  nodes.matrixGrid.innerHTML = forecast.scoreMatrix.slice(0, 18).map((cell) => {
    const alpha = clamp(cell.probability * 9, 0.08, 0.9);
    return `<div class="matrixCell" style="background:rgba(36,87,214,${alpha})"><b>${cell.score}</b>${pct(cell.probability)}</div>`;
  }).join('');
}

function renderPreview(fixture, forecast) {
  const outcomeNames = { home: fixture.home.name, draw: '平局', away: fixture.away.name };
  nodes.previewMatch.textContent = `${fixture.home.name} vs ${fixture.away.name}`;
  nodes.previewPick.textContent = forecast.predictedOutcomes.map((key) => outcomeNames[key]).join(' / ');
  nodes.previewScores.innerHTML = forecast.scorePaths.slice(0, 3).map((path) => `
    <div><b>${path.score}</b><span>${pct(path.probability)}</span></div>
  `).join('');
}

async function explainWithAi() {
  if (!state.forecast) await runForecast();
  nodes.aiSource.textContent = 'pending';
  nodes.aiText.textContent = '正在生成解读...';
  const payload = await postJson('/api/ai/explain', {
    fixture: applyScenario(updateActiveFixtureFromForm()),
    forecast: state.forecast,
  });
  nodes.aiSource.textContent = payload.source || 'local-template';
  nodes.aiText.textContent = payload.explanation || state.forecast.summary;
}

async function runBacktest() {
  const fixture = applyScenario(updateActiveFixtureFromForm());
  const result = {
    id: fixture.id,
    homeScore: Number(nodes.actualHome.value || 0),
    awayScore: Number(nodes.actualAway.value || 0),
  };
  const payload = await postJson('/api/backtest', {
    fixtures: [fixture],
    results: [result],
    marketWeight: Number(nodes.marketWeight.value || 50) / 100,
  });
  renderBacktest(payload);
}

function renderBacktest(report) {
  const s = report.summary;
  nodes.backtestMetrics.innerHTML = [
    ['样本', s.completed],
    ['方向', `${s.directionHits}/${s.completed}`],
    ['Top3', `${s.top3ScoreHits}/${s.completed}`],
    ['Brier', s.avgBrier.toFixed(3)],
  ].map(([label, value]) => `<div><b>${value}</b><span>${label}</span></div>`).join('');
  nodes.backtestRows.innerHTML = report.rows.map((row) => `
    <div class="tableRow">
      <b>${row.match || row.id}</b>
      <span>${row.actualScore || '-'}</span>
      <span>${row.directionHit ? '方向覆盖' : '方向未覆盖'}</span>
      <span>${row.top3ScoreHit ? 'Top3覆盖' : 'Top3未覆盖'}</span>
    </div>
  `).join('');
}

function importJson() {
  const payload = JSON.parse(nodes.jsonInput.value);
  const fixtures = Array.isArray(payload) ? payload : payload.fixtures;
  if (!Array.isArray(fixtures) || !fixtures.length) throw new Error('JSON must contain fixtures');
  state.fixtures = fixtures;
  state.activeIndex = 0;
  renderFixtureList();
  selectFixture(0);
}

function exportJson() {
  const payload = {
    fixtures: state.fixtures,
    activeFixture: updateActiveFixtureFromForm(),
    forecast: state.forecast,
  };
  nodes.jsonInput.value = JSON.stringify(payload, null, 2);
}

function renderSliderOutputs() {
  nodes.marketWeightOut.textContent = `${nodes.marketWeight.value}%`;
  nodes.homeTiltOut.textContent = nodes.homeTilt.value;
  nodes.tempoTiltOut.textContent = nodes.tempoTilt.value;
  nodes.drawTiltOut.textContent = nodes.drawTilt.value;
}

function bindEvents() {
  nodes.refreshFixtures.addEventListener('click', loadFixtures);
  nodes.runForecast.addEventListener('click', runForecast);
  nodes.fixtureForm.addEventListener('input', (event) => {
    if (event.target.matches('input')) updateActiveFixtureFromForm();
  });
  [nodes.marketWeight, nodes.homeTilt, nodes.tempoTilt, nodes.drawTilt].forEach((input) => {
    input.addEventListener('input', () => {
      renderSliderOutputs();
      runForecast();
    });
  });
  nodes.importJson.addEventListener('click', () => {
    try {
      importJson();
    } catch (error) {
      nodes.jsonInput.value = `Import error: ${error.message}`;
    }
  });
  nodes.exportJson.addEventListener('click', exportJson);
  nodes.aiExplain.addEventListener('click', explainWithAi);
  nodes.runBacktest.addEventListener('click', runBacktest);
}

bindEvents();
renderSliderOutputs();
loadFixtures().catch((error) => {
  nodes.fixtureSource.textContent = 'Load failed';
  nodes.aiText.textContent = error.message;
});
