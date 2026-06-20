const FACTOR_WEIGHTS = {
  strength: 0.18,
  attackDefense: 0.15,
  motivation: 0.12,
  marketValue: 0.12,
  squad: 0.10,
  venue: 0.08,
  history: 0.08,
  climate: 0.07,
  altitude: 0.05,
  referee: 0.05,
};

const FACTOR_KEYS = Object.keys(FACTOR_WEIGHTS);

const FACTOR_LABELS = {
  strength: 'Strength',
  attackDefense: 'Attack / Defense',
  motivation: 'Motivation',
  marketValue: 'Market Value',
  squad: 'Squad',
  venue: 'Venue',
  history: 'History',
  climate: 'Climate',
  altitude: 'Altitude',
  referee: 'Referee',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function normalizeProbabilities(values) {
  const home = Number(values?.home ?? values?.homeWin ?? 0);
  const draw = Number(values?.draw ?? 0);
  const away = Number(values?.away ?? values?.awayWin ?? 0);
  const total = home + draw + away;
  if (!Number.isFinite(total) || total <= 0) {
    return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 };
  }
  return {
    home: home / total,
    draw: draw / total,
    away: away / total,
  };
}

function weightedScore(team) {
  const factors = team.factors || {};
  return FACTOR_KEYS.reduce((sum, key) => {
    const value = Number(factors[key] ?? 50);
    return sum + clamp(value, 0, 100) * FACTOR_WEIGHTS[key];
  }, 0);
}

function factorBreakdown(match) {
  const homeFactors = match.home.factors || {};
  const awayFactors = match.away.factors || {};
  return FACTOR_KEYS.map((key) => {
    const home = clamp(Number(homeFactors[key] ?? 50), 0, 100);
    const away = clamp(Number(awayFactors[key] ?? 50), 0, 100);
    const delta = (home - away) * FACTOR_WEIGHTS[key];
    return {
      key,
      label: FACTOR_LABELS[key],
      weight: FACTOR_WEIGHTS[key],
      home,
      away,
      delta: round(delta, 3),
    };
  });
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
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
  return {
    home: (p.home / nonDraw) * remaining,
    draw: floor,
    away: (p.away / nonDraw) * remaining,
  };
}

function blendProbabilities(model, market, marketWeight) {
  const m = normalizeProbabilities(model);
  if (!market || marketWeight <= 0) return m;
  const mk = normalizeProbabilities(market);
  const w = clamp(marketWeight, 0, 0.9);
  return normalizeProbabilities({
    home: m.home * (1 - w) + mk.home * w,
    draw: m.draw * (1 - w) + mk.draw * w,
    away: m.away * (1 - w) + mk.away * w,
  });
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
  const wdl = cells.reduce(
    (acc, cell) => {
      if (cell.home > cell.away) acc.home += cell.probability;
      else if (cell.home < cell.away) acc.away += cell.probability;
      else acc.draw += cell.probability;
      return acc;
    },
    { home: 0, draw: 0, away: 0 },
  );
  cells.sort((a, b) => b.probability - a.probability);
  return { cells, wdl: normalizeProbabilities(wdl) };
}

function tuneXgToProbabilities(baseHomeXg, baseAwayXg, target) {
  const targetP = normalizeProbabilities(target);
  let best = {
    home: baseHomeXg,
    away: baseAwayXg,
    error: Number.POSITIVE_INFINITY,
  };
  for (let hm = -16; hm <= 16; hm += 1) {
    for (let am = -16; am <= 16; am += 1) {
      const home = clamp(baseHomeXg + hm * 0.045, 0.2, 4.2);
      const away = clamp(baseAwayXg + am * 0.045, 0.2, 4.2);
      const matrix = scoreMatrix(home, away, 8);
      const error =
        Math.abs(matrix.wdl.home - targetP.home) +
        Math.abs(matrix.wdl.draw - targetP.draw) +
        Math.abs(matrix.wdl.away - targetP.away);
      if (error < best.error) best = { home, away, error };
    }
  }
  return { home: round(best.home, 2), away: round(best.away, 2) };
}

function deriveExpectedGoals(match, modelProbabilities, options) {
  const homeScore = weightedScore(match.home);
  const awayScore = weightedScore(match.away);
  const scoreDelta = homeScore - awayScore;
  const eloDelta = Number(match.home.elo || 1500) - Number(match.away.elo || 1500);
  const totalFromMarket = Number(match.market?.totalGoals);
  const baseTotal = Number.isFinite(totalFromMarket) && totalFromMarket > 0
    ? totalFromMarket
    : clamp(2.45 + Math.abs(scoreDelta) / 65 + Math.abs(eloDelta) / 1200, 1.55, 3.75);
  const share = clamp(0.5 + scoreDelta / 120 + eloDelta / 1200, 0.23, 0.77);
  const tuned = tuneXgToProbabilities(baseTotal * share, baseTotal * (1 - share), modelProbabilities);
  if (!options.forceMarketTotal || !Number.isFinite(totalFromMarket)) return tuned;
  const current = tuned.home + tuned.away;
  const scale = current > 0 ? totalFromMarket / current : 1;
  return {
    home: round(clamp(tuned.home * scale, 0.2, 4.4), 2),
    away: round(clamp(tuned.away * scale, 0.2, 4.4), 2),
  };
}

function topScorePaths(matrix, count = 8) {
  return matrix.cells.slice(0, count).map((cell, index) => ({
    rank: index + 1,
    score: cell.score,
    homeGoals: cell.home,
    awayGoals: cell.away,
    probability: round(cell.probability, 4),
    label: scoreLabel(cell.home, cell.away),
  }));
}

function scoreLabel(home, away) {
  const diff = home - away;
  if (diff === 0) return home + away <= 1 ? 'low draw branch' : 'draw protection';
  if (Math.abs(diff) === 1) return 'narrow margin';
  if (Math.abs(diff) === 2) return 'breakaway path';
  return 'tail-risk path';
}

function topDrivers(breakdown, count = 5) {
  return breakdown
    .slice()
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, count)
    .map((item) => ({
      key: item.key,
      label: item.label,
      side: item.delta >= 0 ? 'home' : 'away',
      impact: round(Math.abs(item.delta), 3),
      home: item.home,
      away: item.away,
    }));
}

function pickOutcomes(probabilities) {
  const entries = [
    ['home', probabilities.home],
    ['draw', probabilities.draw],
    ['away', probabilities.away],
  ].sort((a, b) => b[1] - a[1]);
  const picked = [entries[0][0]];
  if (entries[1][1] >= entries[0][1] - 0.08 || entries[1][1] >= 0.29) picked.push(entries[1][0]);
  return picked;
}

function riskFlags(match, probabilities, calibration, marketAgreement) {
  const flags = [];
  const entropy = -Object.values(probabilities).reduce((sum, p) => sum + p * Math.log2(p), 0);
  if (entropy > 1.48) flags.push({ key: 'high-entropy', label: 'High outcome entropy' });
  if (calibration.drawFloorTier === 'small-gap') flags.push({ key: 'small-gap-draw', label: 'Small Elo gap draw risk' });
  if (marketAgreement < 0.78) flags.push({ key: 'market-model-divergence', label: 'Model and consensus diverge' });
  if (Number(match.dataQuality ?? 1) < 0.7) flags.push({ key: 'data-quality', label: 'Lower data quality' });
  return flags;
}

function confidenceLabel(probabilities, riskCount) {
  const top = Math.max(probabilities.home, probabilities.draw, probabilities.away);
  if (top >= 0.68 && riskCount <= 1) return 'High';
  if (top >= 0.56 && riskCount <= 2) return 'Medium+';
  if (top >= 0.45) return 'Medium';
  return 'Low';
}

function marketAgreementScore(model, final) {
  const distance =
    Math.abs(model.home - final.home) +
    Math.abs(model.draw - final.draw) +
    Math.abs(model.away - final.away);
  return round(clamp(1 - distance / 2, 0, 1), 3);
}

function forecastMatch(match, options = {}) {
  const marketWeight = options.marketWeight ?? 0.5;
  const breakdown = factorBreakdown(match);
  const homeScore = weightedScore(match.home);
  const awayScore = weightedScore(match.away);
  const scoreDelta = homeScore - awayScore;
  const eloDelta = Number(match.home.elo || 1500) - Number(match.away.elo || 1500);
  const strengthSignal = scoreDelta / 16 + eloDelta / 210;
  const homeRaw = sigmoid(strengthSignal);
  const drawBase = clamp(0.22 + (1 - Math.min(Math.abs(strengthSignal), 2.2) / 2.2) * 0.12, 0.16, 0.35);
  const modelBeforeFloor = normalizeProbabilities({
    home: homeRaw * (1 - drawBase),
    draw: drawBase,
    away: (1 - homeRaw) * (1 - drawBase),
  });
  const floor = drawFloorForEloGap(eloDelta);
  const modelProbabilities = applyDrawFloor(modelBeforeFloor, floor.floor);
  const blended = blendProbabilities(modelProbabilities, match.market, marketWeight);
  const finalProbabilities = normalizeProbabilities(blended);
  const expectedGoals = deriveExpectedGoals(match, finalProbabilities, {
    forceMarketTotal: marketWeight > 0,
  });
  const matrix = scoreMatrix(expectedGoals.home, expectedGoals.away, options.maxGoals || 8);
  const scorePaths = topScorePaths(matrix, 8);
  const drivers = topDrivers(breakdown, 5);
  const marketAgreement = marketAgreementScore(modelProbabilities, finalProbabilities);
  const calibration = {
    drawFloor: floor.floor,
    drawFloorTier: floor.tier,
    marketWeight: match.market ? clamp(marketWeight, 0, 0.9) : 0,
    modelProbabilities: Object.fromEntries(Object.entries(modelProbabilities).map(([k, v]) => [k, round(v, 4)])),
  };
  const flags = riskFlags(match, finalProbabilities, calibration, marketAgreement);

  return {
    matchId: match.id,
    generatedAt: new Date().toISOString(),
    model: 'FLUX-10 Open Baseline',
    teamScores: {
      home: round(homeScore, 2),
      away: round(awayScore, 2),
      delta: round(scoreDelta, 2),
      eloDelta: round(eloDelta, 1),
    },
    probabilities: Object.fromEntries(Object.entries(finalProbabilities).map(([k, v]) => [k, round(v, 4)])),
    predictedOutcomes: pickOutcomes(finalProbabilities),
    confidence: confidenceLabel(finalProbabilities, flags.length),
    expectedGoals,
    scorePaths,
    scoreMatrix: matrix.cells.slice(0, 30).map((cell) => ({
      score: cell.score,
      probability: round(cell.probability, 4),
    })),
    factorBreakdown: breakdown,
    drivers,
    riskFlags: flags,
    calibration,
    marketAgreement,
    summary: buildSummary(match, finalProbabilities, expectedGoals, scorePaths, flags),
  };
}

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

function buildSummary(match, probabilities, expectedGoals, scorePaths, flags) {
  const outcomeName = {
    home: match.home.name,
    draw: 'draw',
    away: match.away.name,
  };
  const main = pickOutcomes(probabilities).map((key) => outcomeName[key]).join(' / ');
  const riskText = flags.length ? ` Key risks: ${flags.map((flag) => flag.label).join(', ')}.` : '';
  return `${match.home.name} vs ${match.away.name}: model leans ${main}. WDL surface is ${pct(probabilities.home)} / ${pct(probabilities.draw)} / ${pct(probabilities.away)}, xG ${expectedGoals.home}:${expectedGoals.away}, with top score paths ${scorePaths.slice(0, 3).map((item) => item.score).join(', ')}.${riskText}`;
}

module.exports = {
  FACTOR_KEYS,
  FACTOR_LABELS,
  FACTOR_WEIGHTS,
  applyDrawFloor,
  drawFloorForEloGap,
  factorBreakdown,
  forecastMatch,
  normalizeProbabilities,
  scoreMatrix,
  weightedScore,
};
