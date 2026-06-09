const assert = require("node:assert/strict");

const {
  buildRecommendationResponse,
  coerceRecommendationPayload,
} = require("../src/recommendation");
const app = require("../src/server");

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const port = server.address().port;
        const response = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        resolve({ status: response.status, payload: await response.json() });
      } catch (error) {
        reject(error);
      } finally {
        server.close();
      }
    });
  });
}

async function run() {
  const payload = coerceRecommendationPayload({
    text: "A concise recommendation explanation.",
    packageRecommendation: {
      package: "neck-shoulder-relief",
      duration: 60,
      intensity: "medium",
      addOns: ["aroma-oil"],
      reason: "Matches shoulder tension and a calming after-work visit.",
    },
    aftercareItems: [
      { id: 1, reason: "Supports warmth after the session." },
      { id: 1, reason: "Duplicate should be removed." },
    ],
  });

  assert.deepEqual(payload, {
    text: "A concise recommendation explanation.",
    packageRecommendation: {
      package: "neck-shoulder-relief",
      duration: 60,
      intensity: "medium",
      addOns: ["aroma-oil"],
      reason: "Matches shoulder tension and a calming after-work visit.",
    },
    aftercareItems: [
      { id: 1, reason: "Supports warmth after the session." },
    ],
  });

  const response = buildRecommendationResponse(payload, [
    {
      id: 1,
      slug: "heated-neck-wrap",
      name: "Heated Neck Wrap",
      imageUrl: "/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png",
      price: 34.9,
    },
  ]);

  assert.equal(response.packageLink, "/package-configurator/neck-shoulder-relief/60/medium/aroma-oil");
  assert.deepEqual(response.aftercareLinks, [{
    id: 1,
    href: "/aftercare-shop#product-heated-neck-wrap",
    title: "Heated Neck Wrap",
    imageUrl: "/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png",
    price: 34.9,
    reason: "Supports warmth after the session.",
  }]);
  assert.throws(() => coerceRecommendationPayload({ text: "x", aftercareItems: [] }), /packageRecommendation/);
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "replace_me";
  const unavailable = await request("POST", "/recommend", { prompt: "My shoulders feel tense." });
  assert.equal(unavailable.status, 503);
  process.env.GEMINI_API_KEY = previousKey;
  console.log("recommendation smoke test passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
