#!/usr/bin/env node

const FACTOR_WEIGHTS = {
  strength: 0.18,
  attackDefense: 0.15,
  motivation: 0.12,
  marketValue: 0.12,
  squad: 0.1,
  venue: 0.08,
  history: 0.08,
  climate: 0.07,
  altitude: 0.05,
  referee: 0.05,
};

const FACTOR_KEYS = Object.keys(FACTOR_WEIGHTS);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

function normalizeProbabilities(values) {
  const home = Number(values?.home ?? values?.homeWin ?? 0);
  const draw = Number(values?.draw ?? 0);
  const away = Number(values?.away ?? values?.awayWin ?? 0);
  const total = home + draw + away;
  if (!Number.isFinite(total) || total <= 0) return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 };
  return { home: home / total, draw: draw / total, away: away / total };
}

function weightedScore(team) {
  return FACTOR_KEYS.reduce((sum, key) => sum + clamp(Number(team.factors?.[key] ?? 50), 0, 100) * FACTOR_WEIGHTS[key], 0);
}

function drawFloorForEloGap(gap) {
  const abs = Math.abs(gap);
  if (abs < 40) return { floor: 0.24, tier: 'even' };
  if (abs < 90) return { floor: 0.31, tier: 'small-gap' };
  if (abs < 150) return { floor: 0.28, tier: 'medium-gap' };
  return { floor: 0.18, tier: 'large-gap' };
}

function applyDrawFloor(probabilities, floor) {
  const p = normalizeProbabilities(probabilities);
  if (p.draw >= floor) return p;
  const remaining = 1 - floor;
  const nonDraw = p.home + p.away || 1;
  return { home: (p.home / nonDraw) * remaining, draw: floor, away: (p.away / nonDraw) * remaining };
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

function poisson(lambda, goals) {
  return Math.exp(-lambda) * lambda ** goals / factorial(goals);
}

function scoreMatrix(homeXg, awayXg, maxGoals = 8) {
  const cells = [];
  let rawTotal = 0;
  for (let home = 0; home <= maxGoals; home += 1) {
    for (let away = 0; away <= maxGoals; away += 1) {
      const probability = poisson(homeXg, home) * poisson(awayXg, away);
      rawTotal += probability;
      cells.push({ home, away, score: `${home}-${away}`, probability });
    }
  }
  for (const cell of cells) cell.probability /= rawTotal;
  cells.sort((a, b) => b.probability - a.probability);
  return cells;
}

function scoreLabel(home, away) {
  const diff = home - away;
  if (diff === 0) return home + away <= 1 ? 'low draw branch' : 'draw protection';
  if (Math.abs(diff) === 1) return 'narrow margin';
  if (Math.abs(diff) === 2) return 'breakaway path';
  return 'tail-risk path';
}

function topScorePaths(cells, count = 8) {
  return cells.slice(0, count).map((cell, index) => ({
    rank: index + 1,
    score: cell.score,
    probability: round(cell.probability),
    label: scoreLabel(cell.home, cell.away),
  }));
}

function factorBreakdown(match) {
  return FACTOR_KEYS.map((key) => {
    const home = clamp(Number(match.home.factors?.[key] ?? 50), 0, 100);
    const away = clamp(Number(match.away.factors?.[key] ?? 50), 0, 100);
    return { key, home, away, delta: round((home - away) * FACTOR_WEIGHTS[key], 3) };
  });
}

function forecastMatch(match, options = {}) {
  const marketWeight = clamp(Number(options.marketWeight ?? 0.5), 0, 0.9);
  const homeScore = weightedScore(match.home);
  const awayScore = weightedScore(match.away);
  const scoreDelta = homeScore - awayScore;
  const eloDelta = Number(match.home.elo || 1500) - Number(match.away.elo || 1500);
  const signal = scoreDelta / 16 + eloDelta / 210;
  const homeRaw = sigmoid(signal);
  const drawBase = clamp(0.22 + (1 - Math.min(Math.abs(signal), 2.2) / 2.2) * 0.12, 0.16, 0.35);
  const floor = drawFloorForEloGap(eloDelta);
  const model = applyDrawFloor({
    home: homeRaw * (1 - drawBase),
    draw: drawBase,
    away: (1 - homeRaw) * (1 - drawBase),
  }, floor.floor);
  const market = match.market ? normalizeProbabilities(match.market) : model;
  const probabilities = normalizeProbabilities({
    home: model.home * (1 - marketWeight) + market.home * marketWeight,
    draw: model.draw * (1 - marketWeight) + market.draw * marketWeight,
    away: model.away * (1 - marketWeight) + market.away * marketWeight,
  });
  const totalGoals = clamp(Number(match.market?.totalGoals || 2.5) + Math.abs(scoreDelta) / 90, 1.5, 4.2);
  const share = clamp(0.5 + scoreDelta / 120 + eloDelta / 1200, 0.23, 0.77);
  const expectedGoals = {
    home: round(totalGoals * share, 2),
    away: round(totalGoals * (1 - share), 2),
  };
  const cells = scoreMatrix(expectedGoals.home, expectedGoals.away, Number(options.maxGoals || 8));
  const drivers = factorBreakdown(match)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);
  const topEntries = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  const predictedOutcomes = [topEntries[0][0]];
  if (topEntries[1][1] >= topEntries[0][1] - 0.08 || topEntries[1][1] >= 0.29) predictedOutcomes.push(topEntries[1][0]);

  return {
    matchId: match.id,
    model: 'FLUX-10 Open Baseline',
    generatedAt: new Date().toISOString(),
    probabilities: Object.fromEntries(Object.entries(probabilities).map(([key, value]) => [key, round(value)])),
    predictedOutcomes,
    expectedGoals,
    scorePaths: topScorePaths(cells),
    drivers,
    calibration: {
      drawFloor: floor.floor,
      drawFloorTier: floor.tier,
      marketWeight,
      teamScoreDelta: round(scoreDelta, 2),
      eloDelta,
    },
    summary: `${match.home.name} vs ${match.away.name}: ${Math.round(probabilities.home * 100)} / ${Math.round(probabilities.draw * 100)} / ${Math.round(probabilities.away * 100)}, xG ${expectedGoals.home}:${expectedGoals.away}.`,
  };
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let body = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { body += chunk; });
    process.stdin.on('end', () => resolve(body));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const raw = await readStdin();
  const payload = raw.trim() ? JSON.parse(raw) : {};
  const fixture = payload.fixture || payload.match;
  if (!fixture) throw new Error('Expected JSON with fixture or match');
  const forecast = forecastMatch(fixture, payload);
  process.stdout.write(`${JSON.stringify({ fixture, forecast }, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  FACTOR_KEYS,
  FACTOR_WEIGHTS,
  forecastMatch,
  normalizeProbabilities,
};
