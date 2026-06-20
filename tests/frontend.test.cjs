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
    'matchMenu',
    'competitionFilter',
    'dateFilter',
    'fixtureForm',
    'marketWeight',
    'runForecast',
    'developerTools',
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

test('frontend makes menu-driven match selection the primary user flow', () => {
  const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');

  assert.match(html, /id="matchMenu"/);
  assert.match(html, /id="competitionFilter"/);
  assert.match(html, /id="dateFilter"/);
  assert.match(html, /选择赛事/);
  assert.match(html, /分析预测/);
  assert.match(js, /renderFixtureFilters/);
  assert.match(js, /filterFixtures/);
  assert.match(js, /selectFixture/);
  assert.match(css, /\.matchMenu/);

  const developerToolsStart = html.indexOf('<details id="developerTools"');
  const jsonInputAt = html.indexOf('id="jsonInput"');
  const developerToolsEnd = html.indexOf('</details>', developerToolsStart);

  assert.ok(developerToolsStart > -1, 'JSON tools must be inside an advanced developer details panel');
  assert.ok(jsonInputAt > developerToolsStart, 'jsonInput should come after developerTools starts');
  assert.ok(jsonInputAt < developerToolsEnd, 'jsonInput should be nested inside developerTools');
  assert.ok(html.indexOf('id="matchMenu"') < developerToolsStart, 'match menu should appear before JSON developer tools');
  assert.equal(html.includes('<label for="jsonInput">JSON 导入 / 导出</label>'), false, 'JSON import/export should not be a primary visible sidebar block');
});
