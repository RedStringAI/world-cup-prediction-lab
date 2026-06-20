const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const skillDir = path.join(root, 'skills', 'world-cup-prediction');

test('world-cup-prediction skill metadata is valid and searchable', () => {
  const skill = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: world-cup-prediction\n/m);
  assert.match(skill, /description: Use when/m);
  assert.match(skill, /FLUX-10/);
  assert.match(skill, /scripts\/forecast\.cjs/);
  assert.doesNotMatch(skill, /\[TODO/);
});

test('skill docs frame JSON as developer automation, not the public product flow', () => {
  const skill = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
  const inputFormat = fs.readFileSync(path.join(skillDir, 'references', 'input-format.md'), 'utf8');
  const docs = `${skill}\n${inputFormat}`;

  assert.match(docs, /menu-driven/i);
  assert.match(docs, /developer/i);
  assert.match(docs, /automation/i);
  assert.doesNotMatch(skill, /Run a single forecast from JSON/);
});

test('skill forecast script returns probabilities and score paths from JSON stdin', () => {
  const fixture = {
    id: 'skill-demo',
    home: {
      name: 'Netherlands',
      elo: 1908,
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
      elo: 1848,
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
    market: { home: 0.48, draw: 0.31, away: 0.21, totalGoals: 2.55 },
  };
  const result = spawnSync(process.execPath, [path.join(skillDir, 'scripts', 'forecast.cjs')], {
    input: JSON.stringify({ fixture, marketWeight: 0.5 }),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.forecast.model, 'FLUX-10 Open Baseline');
  assert.ok(payload.forecast.probabilities.home > payload.forecast.probabilities.away);
  assert.ok(payload.forecast.scorePaths.length >= 3);
});

test('skill backtest script evaluates actual scores from JSON stdin', () => {
  const result = spawnSync(process.execPath, [path.join(skillDir, 'scripts', 'backtest.cjs')], {
    input: JSON.stringify({
      fixtures: [
        {
          id: 'demo-1',
          home: { name: 'France', elo: 1990, factors: { strength: 91, attackDefense: 87, motivation: 81, marketValue: 94, squad: 90, venue: 52, history: 86, climate: 55, altitude: 50, referee: 55 } },
          away: { name: 'Iraq', elo: 1714, factors: { strength: 55, attackDefense: 59, motivation: 88, marketValue: 48, squad: 54, venue: 52, history: 44, climate: 55, altitude: 50, referee: 55 } },
          market: { home: 0.74, draw: 0.18, away: 0.08, totalGoals: 2.9 },
        },
      ],
      results: [{ id: 'demo-1', homeScore: 3, awayScore: 0 }],
    }),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.summary.completed, 1);
  assert.equal(payload.rows[0].directionHit, true);
});
