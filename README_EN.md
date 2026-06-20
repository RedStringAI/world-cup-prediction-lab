<div align="center">

<img src="assets/redstring-logo-full.png" alt="RedString AI logo" width="104">

# World Cup Prediction Lab

### An explainable World Cup prediction workbench

[![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20%2B-339933.svg)](package.json)
[![OpenAI Compatible](https://img.shields.io/badge/API-OpenAI--compatible-111827.svg)](#ai-explanations)

English | [中文](README.md) | [日本語](README_JA.md) | [Deutsch](README_DE.md) | [FluxToken](https://fluxtoken.ai)

</div>

## Recommended OpenAI-compatible Gateway

[![FluxToken - OpenAI-compatible multi-model gateway](assets/fluxtoken-banner.png)](https://fluxtoken.ai)

The app is provider-neutral. Its optional AI explanation layer works with any OpenAI-compatible endpoint. [FluxToken](https://fluxtoken.ai) is a convenient multi-model gateway for Claude, GPT, and other mainstream models. Set `AI_BASE_URL=https://fluxtoken.ai/v1`, `AI_API_KEY`, and `AI_MODEL` to enable AI explanations.

## What It Does

World Cup Prediction Lab is a local football analytics workbench: menu-driven match selection, ten-factor scoring, Elo delta, calibrated draw floors, double-Poisson score matrix, scenario sliders, backtest metrics, developer JSON tools, and optional AI explanations.

Normal users choose a fixture from the match menu and click to forecast. JSON import/export is kept inside the advanced developer tools area for batch fixtures, automation, and integrations.

## Preview

![World Cup Prediction Lab preview](docs/preview.png)

## Quick Start

```bash
npm install
npm start
```

Open `http://127.0.0.1:8798`.

Run tests:

```bash
npm test
```

## Codex Skill

This repository includes an installable Codex skill:

```text
skills/world-cup-prediction
```

Copy it into your local Codex skills folder:

```powershell
Copy-Item -Recurse skills/world-cup-prediction "$env:USERPROFILE\.codex\skills\world-cup-prediction"
```

Then ask Codex:

```text
Use $world-cup-prediction to analyze a selected match; for automation, forecast this match JSON and backtest the result.
```

The bundled scripts also run standalone:

```bash
node skills/world-cup-prediction/scripts/forecast.cjs < match.json
node skills/world-cup-prediction/scripts/backtest.cjs < backtest.json
```

## AI Explanations

```bash
AI_BASE_URL=https://fluxtoken.ai/v1
AI_API_KEY=ft-your-key
AI_MODEL=gpt-4o-mini
```

AI explains the structured model output only. Core probabilities are calculated before the AI layer.

## Model

See [docs/model.md](docs/model.md).

## License

MIT License. See [LICENSE](LICENSE).
