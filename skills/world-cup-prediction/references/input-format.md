# Input Format

## Forecast

Pass JSON to `scripts/forecast.cjs` through stdin:

```json
{
  "marketWeight": 0.5,
  "fixture": {
    "id": "ned-swe",
    "home": {
      "name": "Netherlands",
      "elo": 1908,
      "factors": {
        "strength": 84,
        "attackDefense": 80,
        "motivation": 78,
        "marketValue": 86,
        "squad": 81,
        "venue": 54,
        "history": 79,
        "climate": 55,
        "altitude": 50,
        "referee": 55
      }
    },
    "away": {
      "name": "Sweden",
      "elo": 1848,
      "factors": {
        "strength": 72,
        "attackDefense": 74,
        "motivation": 83,
        "marketValue": 72,
        "squad": 73,
        "venue": 54,
        "history": 61,
        "climate": 55,
        "altitude": 50,
        "referee": 55
      }
    },
    "market": {
      "home": 0.48,
      "draw": 0.31,
      "away": 0.21,
      "totalGoals": 2.55
    }
  }
}
```

## Backtest

```json
{
  "fixtures": [{ "...": "same fixture shape as above" }],
  "results": [
    { "id": "ned-swe", "homeScore": 1, "awayScore": 1 }
  ]
}
```

## Factor Scores

All factor scores are 0-100. Missing factors default to 50.

Weights:

- strength 18%
- attackDefense 15%
- motivation 12%
- marketValue 12%
- squad 10%
- venue 8%
- history 8%
- climate 7%
- altitude 5%
- referee 5%
