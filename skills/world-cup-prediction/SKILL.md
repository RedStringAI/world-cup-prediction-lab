---
name: world-cup-prediction
description: Use when forecasting World Cup or football matches from team factors, Elo, public consensus probabilities, expected goals, scoreline paths, backtesting results, or when producing explainable FLUX-10 style match analysis.
---

# World Cup Prediction

## Overview

Use this skill to run an explainable FLUX-10 style football forecast from structured match inputs. It is for technical sports analytics, model explanation, and backtesting.

## Quick Start

Run a single forecast from JSON:

```bash
node scripts/forecast.cjs < match.json
```

Run a backtest from fixtures and actual scores:

```bash
node scripts/backtest.cjs < backtest.json
```

Read `references/input-format.md` when you need the JSON schema or examples.

## Workflow

1. Collect a fixture with `home`, `away`, `elo`, ten factor scores, optional public consensus probabilities, and optional total goals center.
2. Run `scripts/forecast.cjs` for deterministic probability, xG, score paths, drivers, and risk flags.
3. If actual scores exist, run `scripts/backtest.cjs` to compute direction coverage, top score coverage, Brier Score, and RPS.
4. Explain outputs with model language: probability surface, draw-floor tier, xG contour, top score paths, factor drivers, and risk flags.

## Public-Safe Language

Use neutral analytics phrasing:

- "model forecast", "probability surface", "score paths", "public consensus", "risk flags";
- "technical demonstration", "sports analytics research", "not a certainty claim".

Avoid certainty or action-oriented language. Do not present outputs as financial or real-world instructions.

## Files

- `scripts/forecast.cjs`: deterministic forecast engine and CLI.
- `scripts/backtest.cjs`: backtesting CLI using the same forecast engine.
- `references/input-format.md`: JSON input examples and field notes.
