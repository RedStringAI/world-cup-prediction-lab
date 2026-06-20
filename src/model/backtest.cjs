const { normalizeProbabilities } = require('./forecast.cjs');

const OUTCOMES = ['home', 'draw', 'away'];

function classifyOutcome(homeScore, awayScore) {
  if (homeScore > awayScore) return 'home';
  if (homeScore < awayScore) return 'away';
  return 'draw';
}

function brierScore(probabilities, actualOutcome) {
  const p = normalizeProbabilities(probabilities);
  return OUTCOMES.reduce((sum, key) => {
    const observed = key === actualOutcome ? 1 : 0;
    return sum + (p[key] - observed) ** 2;
  }, 0);
}

function rpsScore(probabilities, actualOutcome) {
  const p = normalizeProbabilities(probabilities);
  const observed = {
    home: actualOutcome === 'home' ? 1 : 0,
    draw: actualOutcome === 'draw' ? 1 : 0,
    away: actualOutcome === 'away' ? 1 : 0,
  };
  let cp = 0;
  let co = 0;
  let score = 0;
  for (const key of OUTCOMES.slice(0, -1)) {
    cp += p[key];
    co += observed[key];
    score += (cp - co) ** 2;
  }
  return score / 2;
}

function evaluateForecasts(items, results) {
  const byId = new Map(results.map((result) => [result.id, result]));
  const rows = items.map((item) => {
    const result = byId.get(item.id || item.match?.id || item.forecast?.matchId);
    if (!result) {
      return {
        id: item.id,
        completed: false,
        status: 'missing-result',
      };
    }
    const actualOutcome = classifyOutcome(result.homeScore, result.awayScore);
    const actualScore = `${result.homeScore}-${result.awayScore}`;
    const forecast = item.forecast;
    const top3 = (forecast.scorePaths || []).slice(0, 3).map((path) => path.score);
    return {
      id: item.id || forecast.matchId,
      completed: true,
      match: `${item.match?.home?.name || ''} vs ${item.match?.away?.name || ''}`.trim(),
      actualScore,
      actualOutcome,
      predictedOutcomes: forecast.predictedOutcomes,
      directionHit: forecast.predictedOutcomes.includes(actualOutcome),
      top1ScoreHit: top3[0] === actualScore,
      top3ScoreHit: top3.includes(actualScore),
      actualOutcomeProbability: normalizeProbabilities(forecast.probabilities)[actualOutcome],
      brier: brierScore(forecast.probabilities, actualOutcome),
      rps: rpsScore(forecast.probabilities, actualOutcome),
      xgTotal: forecast.expectedGoals.home + forecast.expectedGoals.away,
      actualTotal: result.homeScore + result.awayScore,
    };
  });
  const completed = rows.filter((row) => row.completed);
  const summary = {
    total: rows.length,
    completed: completed.length,
    pending: rows.length - completed.length,
    directionHits: completed.filter((row) => row.directionHit).length,
    top1ScoreHits: completed.filter((row) => row.top1ScoreHit).length,
    top3ScoreHits: completed.filter((row) => row.top3ScoreHit).length,
    avgActualOutcomeProbability: average(completed.map((row) => row.actualOutcomeProbability)),
    avgBrier: average(completed.map((row) => row.brier)),
    avgRps: average(completed.map((row) => row.rps)),
    avgXgTotal: average(completed.map((row) => row.xgTotal)),
    avgActualTotal: average(completed.map((row) => row.actualTotal)),
  };
  return { rows, summary };
}

function average(values) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

module.exports = {
  brierScore,
  classifyOutcome,
  evaluateForecasts,
  rpsScore,
};
