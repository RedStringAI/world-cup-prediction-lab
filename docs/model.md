# Model Notes

World Cup Prediction Lab exposes a clean baseline derived from the public-safe parts of the FLUX-10 workflow.

## Pipeline

1. Score both teams across ten factors: strength, attack/defense, motivation, market value, squad, venue, history, climate, altitude, and referee.
2. Combine the weighted factor delta with Elo delta.
3. Convert the signal into a 1X2 probability surface.
4. Apply calibrated draw floors:
   - even Elo gap: 24%;
   - small gap: 31%;
   - medium gap: 28%;
   - large gap: 18%.
5. Optionally blend with public consensus probabilities.
6. Derive expected goals and run a double-Poisson score matrix.
7. Return top score paths, drivers, risk flags, Brier/RPS-ready outputs, and a local explanation.

## Boundaries

The model is for sports analytics research and technical demonstration. It does not claim certainty. It does not require FluxToken or any specific AI provider. The optional AI layer only explains the structured model output.
