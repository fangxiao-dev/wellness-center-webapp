const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const {
  buildRecommendationResponse,
  coerceRecommendationPayload,
  recommendationSchema,
} = require("./recommendation");

const app = express();
const port = process.env.PORT || 4105;

const CONFIGURATOR_URL = process.env.CONFIGURATOR_URL || "http://package-configurator:4103";
const AFTERCARE_URL = process.env.AFTERCARE_URL || "http://aftercare-shop:4104";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite";

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai-feature" });
});

app.post("/recommend", async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "replace_me") {
    return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const [packagesRes, configurationsRes, productsRes] = await Promise.all([
      fetch(`${CONFIGURATOR_URL}/packages`),
      fetch(`${CONFIGURATOR_URL}/configurations`),
      fetch(`${AFTERCARE_URL}/products`),
    ]);
    const packages = await packagesRes.json();
    const configurations = await configurationsRes.json();
    const products = await productsRes.json();

    const systemPrompt = [
      "You are a massage-focused wellness consultation assistant.",
      "Return one valid wellness package recommendation and one to three aftercare products.",
      "Use only package slugs, durations, intensities, add-on slugs, and product ids present in this context.",
      `Packages: ${JSON.stringify(packages)}`,
      `Configurations: ${JSON.stringify(configurations)}`,
      `Aftercare products: ${JSON.stringify(products)}`,
    ].join("\n");

    const ai = new GoogleGenAI({ apiKey });
    const recommendation = await generateRecommendation(ai, systemPrompt, prompt, [
      GEMINI_MODEL,
      GEMINI_FALLBACK_MODEL,
    ]);
    res.json(buildRecommendationResponse(recommendation, products));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function generateRecommendation(ai, systemPrompt, userPrompt, models) {
  let lastError;
  for (const modelName of models) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: recommendationSchema,
        },
      });
      return coerceRecommendationPayload(JSON.parse(response.text));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

if (require.main === module) {
  app.listen(port, () => console.log(`ai-feature listening on port ${port}`));
}

module.exports = app;
