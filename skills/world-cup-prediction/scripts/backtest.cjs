#!/usr/bin/env node

const { forecastMatch, normalizeProbabilities } = require('./forecast.cjs');

function classifyOutcome(homeScore, awayScore) {
  if (homeScore > awayScore) return 'home';
  if (homeScore < awayScore) return 'away';
  return 'draw';
}

function brierScore(probabilities, actualOutcome) {
  const p = normalizeProbabilities(probabilities);
  return ['home', 'draw', 'away'].reduce((sum, key) => {
    const observed = key === actualOutcome ? 1 : 0;
    return sum + (p[key] - observed) ** 2;
  }, 0);
}

function rpsScore(probabilities, actualOutcome) {
  const p = normalizeProbabilities(probabilities);
  const observed = { home: actualOutcome === 'home' ? 1 : 0, draw: actualOutcome === 'draw' ? 1 : 0, away: actualOutcome === 'away' ? 1 : 0 };
  let cp = 0;
  let co = 0;
  let score = 0;
  for (const key of ['home', 'draw']) {
    cp += p[key];
    co += observed[key];
    score += (cp - co) ** 2;
  }
  return score / 2;
}

function evaluateForecasts(fixtures, results, options = {}) {
  const byId = new Map(results.map((result) => [result.id, result]));
  const rows = fixtures.map((fixture) => {
    const forecast = forecastMatch(fixture, options);
    const result = byId.get(fixture.id);
    if (!result) return { id: fixture.id, completed: false, forecast };
    const actualOutcome = classifyOutcome(result.homeScore, result.awayScore);
    const actualScore = `${result.homeScore}-${result.awayScore}`;
    const top3 = forecast.scorePaths.slice(0, 3).map((path) => path.score);
    return {
      id: fixture.id,
      match: `${fixture.home.name} vs ${fixture.away.name}`,
      completed: true,
      actualScore,
      actualOutcome,
      predictedOutcomes: forecast.predictedOutcomes,
      directionHit: forecast.predictedOutcomes.includes(actualOutcome),
      top1ScoreHit: top3[0] === actualScore,
      top3ScoreHit: top3.includes(actualScore),
      brier: brierScore(forecast.probabilities, actualOutcome),
      rps: rpsScore(forecast.probabilities, actualOutcome),
      forecast,
    };
  });
  const completed = rows.filter((row) => row.completed);
  return {
    rows,
    summary: {
      total: rows.length,
      completed: completed.length,
      directionHits: completed.filter((row) => row.directionHit).length,
      top1ScoreHits: completed.filter((row) => row.top1ScoreHit).length,
      top3ScoreHits: completed.filter((row) => row.top3ScoreHit).length,
      avgBrier: average(completed.map((row) => row.brier)),
      avgRps: average(completed.map((row) => row.rps)),
    },
  };
}

function average(values) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
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
  const fixtures = payload.fixtures || (payload.fixture ? [payload.fixture] : []);
  const results = payload.results || [];
  if (!fixtures.length) throw new Error('Expected JSON with fixtures');
  process.stdout.write(`${JSON.stringify(evaluateForecasts(fixtures, results, payload), null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  classifyOutcome,
  evaluateForecasts,
};
