<div align="center">

<img src="assets/redstring-logo-full.png" alt="RedString AI logo" width="104">

# World Cup Prediction Lab

### Erklärbare World-Cup-Prognosen als lokales Workbench

[![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20%2B-339933.svg)](package.json)
[![OpenAI Compatible](https://img.shields.io/badge/API-OpenAI--compatible-111827.svg)](#ai-erklärungen)

[English](README_EN.md) | [中文](README.md) | [日本語](README_JA.md) | Deutsch | [FluxToken](https://fluxtoken.ai)

</div>

## Empfohlenes OpenAI-compatible Gateway

[![FluxToken - OpenAI-compatible multi-model gateway](assets/fluxtoken-banner.png)](https://fluxtoken.ai)

Das Projekt ist provider-neutral. Die optionale AI-Erklärung funktioniert mit jedem OpenAI-compatible endpoint. [FluxToken](https://fluxtoken.ai) ist ein praktisches Multi-Modell-Gateway für Claude, GPT und weitere Modelle. Setze `AI_BASE_URL=https://fluxtoken.ai/v1`, `AI_API_KEY` und `AI_MODEL`.

## Überblick

World Cup Prediction Lab ist ein lokales Fußball-Analyse-Workbench mit menügesteuerter Spielauswahl, zehn Faktoren, Elo-Differenz, kalibrierten Remis-Untergrenzen, Double-Poisson-Scorematrix, Szenario-Slidern, Backtesting, Entwickler-JSON-Tools und optionaler AI-Erklärung.

Normale Nutzer wählen ein Spiel im Match-Menü und starten die Prognose per Klick. JSON Import/Export bleibt im erweiterten Entwicklerbereich für Batch-Daten, Tests und Automatisierung.

## Vorschau

![World Cup Prediction Lab preview](docs/preview.png)

## Schnellstart

```bash
npm install
npm start
```

Öffne `http://127.0.0.1:8798`.

```bash
npm test
```

## AI-Erklärungen

AI erklärt nur die strukturierten Modellergebnisse. Die Kernwahrscheinlichkeiten werden vorher berechnet.

## Lizenz

MIT License. Siehe [LICENSE](LICENSE).
