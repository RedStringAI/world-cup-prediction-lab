const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('frontend exposes a usable product workbench, not a static landing page', () => {
  const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
  const all = `${html}\n${css}\n${js}`;

  [
    'fixtureList',
    'fixtureForm',
    'marketWeight',
    'runForecast',
    'importJson',
    'exportJson',
    'probabilityBars',
    'scorePaths',
    'factorRadar',
    'backtestPanel',
    'aiExplain',
    'cardPreview',
    'fluxtoken-banner.png',
  ].forEach((token) => assert.ok(all.includes(token), `missing frontend token: ${token}`));

  assert.ok(js.includes('/api/fixtures'));
  assert.ok(js.includes('/api/forecast'));
  assert.ok(js.includes('/api/backtest'));
  assert.ok(js.includes('/api/ai/explain'));
  assert.ok(css.includes('@media'));
  assert.ok(html.includes('lang="zh-CN"'));

  const bannedTerms = [
    '\u6296\u97f3',
    '\u5c0f\u7ea2\u4e66',
    'vibe' + 'coding',
    '\u4e8c\u521b',
    '\u6295\u6ce8',
    '\u4e0b\u6ce8',
    '\u8d54\u7387',
    '\u76d8\u53e3',
  ];
  for (const banned of bannedTerms) {
    assert.equal(all.includes(banned), false, `frontend should not contain private/sensitive term: ${banned}`);
  }
});
