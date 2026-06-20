const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { demoFixtures, demoResults } = require('./src/data/demo.cjs');
const { forecastMatch } = require('./src/model/forecast.cjs');
const { evaluateForecasts } = require('./src/model/backtest.cjs');
const { requestAiExplanation } = require('./src/server/ai.cjs');

const PORT = Number(process.env.PORT || 8798);
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(payload, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error(`invalid JSON body: ${error.message}`));
      }
    });
    req.on('error', reject);
  });
}

function findFixture(id) {
  return demoFixtures.find((fixture) => fixture.id === id) || demoFixtures[0];
}

async function handleForecast(req, res) {
  const body = await readBody(req);
  const fixture = body.fixture || findFixture(body.fixtureId);
  const forecast = forecastMatch(fixture, {
    marketWeight: Number(body.marketWeight ?? 0.5),
    maxGoals: Number(body.maxGoals || 8),
  });
  sendJson(res, 200, { fixture, forecast });
}

async function handleBatchForecast(req, res) {
  const body = await readBody(req);
  const fixtures = Array.isArray(body.fixtures) ? body.fixtures : demoFixtures;
  const marketWeight = Number(body.marketWeight ?? 0.5);
  const rows = fixtures.map((fixture) => ({
    id: fixture.id,
    fixture,
    forecast: forecastMatch(fixture, { marketWeight }),
  }));
  sendJson(res, 200, { count: rows.length, rows });
}

async function handleBacktest(req, res) {
  const body = await readBody(req);
  const fixtures = Array.isArray(body.fixtures) ? body.fixtures : demoFixtures;
  const results = Array.isArray(body.results) ? body.results : demoResults;
  const marketWeight = Number(body.marketWeight ?? 0.5);
  const items = fixtures.map((fixture) => ({
    id: fixture.id,
    match: fixture,
    forecast: forecastMatch(fixture, { marketWeight }),
  }));
  sendJson(res, 200, evaluateForecasts(items, results));
}

async function handleAi(req, res) {
  const body = await readBody(req);
  const fixture = body.fixture || findFixture(body.fixtureId);
  const forecast = body.forecast || forecastMatch(fixture);
  try {
    const explanation = await requestAiExplanation({ fixture, forecast });
    sendJson(res, 200, {
      source: explanation ? 'openai-compatible' : 'local-template',
      explanation: explanation || forecast.summary,
    });
  } catch (error) {
    sendJson(res, 200, {
      source: 'local-template',
      warning: error.message,
      explanation: forecast.summary,
    });
  }
}

function serveStatic(req, res, url) {
  const pathname = decodeURIComponent(url.pathname === '/' ? '/public/index.html' : url.pathname);
  const staticPath = pathname.startsWith('/assets/') ? pathname : pathname.startsWith('/public/') ? pathname : `/public${pathname}`;
  const filePath = path.resolve(ROOT, `.${staticPath}`);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/fixtures') {
      sendJson(res, 200, {
        source: 'demo',
        count: demoFixtures.length,
        fixtures: demoFixtures,
        providerConfig: {
          ai: Boolean(process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL),
        },
      });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/forecast') return handleForecast(req, res);
    if (req.method === 'POST' && url.pathname === '/api/forecast/batch') return handleBatchForecast(req, res);
    if (req.method === 'POST' && url.pathname === '/api/backtest') return handleBacktest(req, res);
    if (req.method === 'POST' && url.pathname === '/api/ai/explain') return handleAi(req, res);
    serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`World Cup Prediction Lab listening on http://127.0.0.1:${PORT}`);
});
