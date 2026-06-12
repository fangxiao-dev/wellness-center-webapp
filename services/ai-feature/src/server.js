const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const {
  buildRecommendationResponse,
  coerceRecommendationPayload,
  recommendationSchema,
  validateRecommendationContext,
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
    const [configurationsRes, productsRes] = await Promise.all([
      fetchJsonContext("configurations", `${CONFIGURATOR_URL}/configurations`),
      fetchJsonContext("products", `${AFTERCARE_URL}/products`),
    ]);
    const configurations = configurationsRes;
    const products = productsRes;
    const validConfigurations = (Array.isArray(configurations) ? configurations : []).map((configuration) => ({
      package: {
        slug: configuration.package?.slug,
        name: configuration.package?.name,
      },
      duration: {
        minutes: configuration.duration?.minutes,
        label: configuration.duration?.label,
      },
      intensity: {
        slug: configuration.intensity?.slug,
        label: configuration.intensity?.label,
      },
      addOns: (Array.isArray(configuration.addOns) ? configuration.addOns : []).map((addOn) => ({
        slug: addOn.slug,
        name: addOn.name,
      })),
    }));

    const systemPrompt = [
      "You are a massage-focused wellness consultation assistant.",
      "Return one valid wellness package recommendation and one to three aftercare products.",
      "The package, duration, intensity, and add-ons must match one valid package configuration from this context.",
      "Use add-on slugs only from the selected valid configuration's addOns list.",
      "Use only product ids present in this context.",
      `Valid package configurations: ${JSON.stringify(validConfigurations)}`,
      `Aftercare products: ${JSON.stringify(products)}`,
    ].join("\n");

    const ai = new GoogleGenAI({ apiKey });
    const recommendation = await generateRecommendation(ai, systemPrompt, prompt, [
      GEMINI_MODEL,
      GEMINI_FALLBACK_MODEL,
    ], { validConfigurations, products });
    res.json(buildRecommendationResponse(recommendation, products));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function fetchJsonContext(name, url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`context fetch failed: ${name} returned ${response.status}`);
  }
  return response.json();
}

async function generateRecommendation(ai, systemPrompt, userPrompt, models, context) {
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
      const recommendation = coerceRecommendationPayload(JSON.parse(response.text));
      return validateRecommendationContext(recommendation, context);
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
