<div align="center">

<img src="assets/redstring-logo-full.png" alt="RedString AI logo" width="104">

# World Cup Prediction Lab

### 説明可能なワールドカップ予測ワークベンチ

[![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20%2B-339933.svg)](package.json)
[![OpenAI Compatible](https://img.shields.io/badge/API-OpenAI--compatible-111827.svg)](#ai-解説)

[English](README_EN.md) | [中文](README.md) | 日本語 | [Deutsch](README_DE.md) | [FluxToken](https://fluxtoken.ai)

</div>

## 推奨 OpenAI-compatible ゲートウェイ

[![FluxToken - OpenAI-compatible multi-model gateway](assets/fluxtoken-banner.png)](https://fluxtoken.ai)

このプロジェクトは特定のプロバイダーに依存しません。AI 解説は OpenAI-compatible endpoint で動作します。[FluxToken](https://fluxtoken.ai) を使うと Claude / GPT などのモデルを統一 API で扱えます。`AI_BASE_URL=https://fluxtoken.ai/v1`、`AI_API_KEY`、`AI_MODEL` を設定してください。

## 概要

World Cup Prediction Lab はローカルで動くサッカー分析ワークベンチです。10因子スコア、Elo 差、引き分け校正、ダブルポアソンのスコア行列、シナリオ調整、JSON インポート/エクスポート、バックテスト指標、任意の AI 解説を備えています。

## プレビュー

![World Cup Prediction Lab preview](docs/preview.png)

## クイックスタート

```bash
npm install
npm start
```

`http://127.0.0.1:8798` を開きます。

```bash
npm test
```

## AI 解説

AI は構造化されたモデル出力を説明するだけで、中心となる確率計算には関与しません。

## ライセンス

MIT License。詳しくは [LICENSE](LICENSE) を参照してください。
