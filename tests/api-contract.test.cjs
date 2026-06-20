const test = require('node:test');
const assert = require('node:assert/strict');

const { demoFixtures, demoResults } = require('../src/data/demo.cjs');
const { forecastMatch } = require('../src/model/forecast.cjs');
const { evaluateForecasts } = require('../src/model/backtest.cjs');

test('demo fixtures are public-safe, complete, and model-ready', () => {
  assert.ok(demoFixtures.length >= 4);
  for (const fixture of demoFixtures) {
    assert.ok(fixture.id);
    assert.ok(fixture.home.name);
    assert.ok(fixture.away.name);
    assert.ok(fixture.market.home + fixture.market.draw + fixture.market.away > 0.95);
    assert.equal(Object.keys(fixture.home.factors).length, 10);
    assert.equal(Object.keys(fixture.away.factors).length, 10);
    const text = JSON.stringify(fixture);
    const bannedTerms = [
      '\u6295\u6ce8',
      '\u4e0b\u6ce8',
      '\u8d54\u7387',
      '\u76d8\u53e3',
      '\u6296\u97f3',
      'vibe' + 'coding',
      '\u4e8c\u521b',
    ];
    for (const banned of bannedTerms) {
      assert.equal(text.includes(banned), false, `fixture should not contain ${banned}`);
    }
  }
});

test('batch forecast and backtest contract mirrors API payload shape', () => {
  const rows = demoFixtures.map((fixture) => ({
    id: fixture.id,
    fixture,
    forecast: forecastMatch(fixture),
  }));
  const report = evaluateForecasts(rows.map((row) => ({
    id: row.id,
    match: row.fixture,
    forecast: row.forecast,
  })), demoResults);

  assert.equal(rows.length, demoFixtures.length);
  assert.ok(rows[0].forecast.summary.includes(rows[0].fixture.home.name));
  assert.equal(report.summary.completed, demoResults.length);
  assert.equal(report.rows.every((row) => typeof row.directionHit === 'boolean'), true);
});
