async function requestAiExplanation({ fixture, forecast, apiConfig = process.env }) {
  const baseUrl = apiConfig.AI_BASE_URL || apiConfig.OPENAI_BASE_URL;
  const apiKey = apiConfig.AI_API_KEY || apiConfig.OPENAI_API_KEY;
  const model = apiConfig.AI_MODEL || apiConfig.OPENAI_MODEL || 'gpt-4o-mini';
  if (!baseUrl || !apiKey) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      messages: [
        {
          role: 'system',
          content: 'You are a football analytics assistant. Explain model output in practical technical terms. Avoid betting, odds, wagering, certainty, or investment language.',
        },
        {
          role: 'user',
          content: JSON.stringify({ fixture, forecast }),
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`AI gateway returned HTTP ${response.status}`);
  const payload = await response.json();
  return payload.choices?.[0]?.message?.content || null;
}

module.exports = {
  requestAiExplanation,
};
