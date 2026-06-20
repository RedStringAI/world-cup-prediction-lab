const test = require('node:test');
const assert = require('node:assert/strict');

const {
  FACTOR_KEYS,
  forecastMatch,
  normalizeProbabilities,
  scoreMatrix,
} = require('../src/model/forecast.cjs');

const {
  evaluateForecasts,
  classifyOutcome,
} = require('../src/model/backtest.cjs');

function sampleMatch(overrides = {}) {
  return {
    id: 'ned-swe',
    competition: 'World Cup 2026',
    kickoff: '2026-06-21T01:00:00+08:00',
    neutral: true,
    home: {
      name: 'Netherlands',
      shortName: 'NED',
      elo: 1908,
      fifaRank: 6,
      factors: {
        strength: 84,
        attackDefense: 80,
        motivation: 78,
        marketValue: 86,
        squad: 81,
        venue: 54,
        history: 79,
        climate: 55,
        altitude: 50,
        referee: 55,
      },
    },
    away: {
      name: 'Sweden',
      shortName: 'SWE',
      elo: 1848,
      fifaRank: 38,
      factors: {
        strength: 72,
        attackDefense: 74,
        motivation: 83,
        marketValue: 72,
        squad: 73,
        venue: 54,
        history: 61,
        climate: 55,
        altitude: 50,
        referee: 55,
      },
    },
    market: {
      home: 0.48,
      draw: 0.31,
      away: 0.21,
      totalGoals: 2.55,
    },
    dataQuality: 0.86,
    ...overrides,
  };
}

test('normalizes probability maps and preserves ratio order', () => {
  const p = normalizeProbabilities({ home: 48, draw: 31, away: 21 });
  assert.equal(Math.round((p.home + p.draw + p.away) * 1000), 1000);
  assert.ok(p.home > p.draw);
  assert.ok(p.draw > p.away);
});

test('forecastMatch returns normalized WDL probabilities, xG, top score paths, drivers, and risk flags', () => {
  const forecast = forecastMatch(sampleMatch());
  const total = forecast.probabilities.home + forecast.probabilities.draw + forecast.probabilities.away;
  assert.ok(Math.abs(total - 1) < 1e-9);
  assert.equal(forecast.factorBreakdown.length, FACTOR_KEYS.length);
  assert.equal(forecast.scorePaths.length, 8);
  assert.ok(forecast.scorePaths[0].probability >= forecast.scorePaths[1].probability);
  assert.ok(forecast.expectedGoals.home > 0);
  assert.ok(forecast.expectedGoals.away > 0);
  assert.ok(forecast.drivers.length >= 4);
  assert.ok(Array.isArray(forecast.riskFlags));
});

test('small Elo gaps keep the calibrated draw floor visible', () => {
  const forecast = forecastMatch(sampleMatch({
    market: null,
    home: { ...sampleMatch().home, elo: 1860 },
    away: { ...sampleMatch().away, elo: 1810 },
  }), { marketWeight: 0 });
  assert.ok(forecast.probabilities.draw >= 0.30);
  assert.equal(forecast.calibration.drawFloorTier, 'small-gap');
});

test('marketWeight controls how strongly market consensus pulls WDL probabilities', () => {
  const match = sampleMatch({
    market: { home: 0.20, draw: 0.25, away: 0.55, totalGoals: 2.7 },
  });
  const modelOnly = forecastMatch(match, { marketWeight: 0 });
  const marketHeavy = forecastMatch(match, { marketWeight: 0.75 });
  assert.ok(marketHeavy.probabilities.away > modelOnly.probabilities.away);
  assert.ok(marketHeavy.marketAgreement < 1);
});

test('scoreMatrix produces a normalized matrix and WDL summary', () => {
  const matrix = scoreMatrix(1.7, 1.1, 7);
  const sum = matrix.cells.reduce((acc, cell) => acc + cell.probability, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.ok(matrix.wdl.home > 0);
  assert.ok(matrix.wdl.draw > 0);
  assert.ok(matrix.wdl.away > 0);
});

test('evaluateForecasts computes direction, top score, Brier, and RPS metrics', () => {
  const forecast = forecastMatch(sampleMatch());
  const report = evaluateForecasts([
    { id: 'ned-swe', match: sampleMatch(), forecast },
  ], [
    { id: 'ned-swe', homeScore: 1, awayScore: 1 },
  ]);

  assert.equal(classifyOutcome(1, 1), 'draw');
  assert.equal(report.rows.length, 1);
  assert.equal(report.summary.completed, 1);
  assert.equal(report.summary.directionHits, forecast.predictedOutcomes.includes('draw') ? 1 : 0);
  assert.ok(report.summary.avgBrier >= 0);
  assert.ok(report.summary.avgRps >= 0);
  assert.equal(typeof report.rows[0].top3ScoreHit, 'boolean');
});
