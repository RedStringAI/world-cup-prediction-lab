---
name: world-cup-prediction
description: Use when forecasting World Cup or football matches from team factors, Elo, public consensus probabilities, expected goals, scoreline paths, backtesting results, or when producing explainable FLUX-10 style match analysis.
---

# World Cup Prediction

## Overview

Use this skill to run an explainable FLUX-10 style football forecast from structured match inputs. It is for technical sports analytics, model explanation, and backtesting.

For public product UX, keep match selection menu-driven: users should choose a fixture from a match menu and click to forecast. JSON is a developer automation interface for CLI scripts, batch imports, tests, and integrations.

## Quick Start

For developer automation, pipe a fixture payload into the forecast CLI:

```bash
node scripts/forecast.cjs < match.json
```

For developer automation with actual scores, pipe fixtures and results into the backtest CLI:

```bash
node scripts/backtest.cjs < backtest.json
```

Read `references/input-format.md` when you need the developer JSON schema or examples.

## Workflow

1. For normal users, load or provide a fixture list, let them choose from the menu-driven match list, then forecast the selected match.
2. For developer automation, collect a fixture with `home`, `away`, `elo`, ten factor scores, optional public consensus probabilities, and optional total goals center.
3. Run `scripts/forecast.cjs` for deterministic probability, xG, score paths, drivers, and risk flags.
4. If actual scores exist, run `scripts/backtest.cjs` to compute direction coverage, top score coverage, Brier Score, and RPS.
5. Explain outputs with model language: probability surface, draw-floor tier, xG contour, top score paths, factor drivers, and risk flags.

## Public-Safe Language

Use neutral analytics phrasing:

- "model forecast", "probability surface", "score paths", "public consensus", "risk flags";
- "technical demonstration", "sports analytics research", "not a certainty claim".

Avoid certainty or action-oriented language. Do not present outputs as financial or real-world instructions.

## Files

- `scripts/forecast.cjs`: deterministic forecast engine and CLI.
- `scripts/backtest.cjs`: backtesting CLI using the same forecast engine.
- `references/input-format.md`: developer automation JSON examples and field notes.
