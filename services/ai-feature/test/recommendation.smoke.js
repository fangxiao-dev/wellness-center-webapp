const assert = require("node:assert/strict");
const http = require("node:http");

const {
  buildRecommendationResponse,
  coerceRecommendationPayload,
} = require("../src/recommendation");

function httpRequest(app, method, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const port = server.address().port;
        const request = http.request({
          host: "127.0.0.1",
          port,
          method,
          path,
          headers: body ? { "Content-Type": "application/json" } : undefined,
        }, (response) => {
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => {
            resolve({
              status: response.statusCode,
              payload: JSON.parse(Buffer.concat(chunks).toString()),
            });
            server.close();
          });
        });

        request.on("error", reject);
        if (body) request.write(JSON.stringify(body));
        request.end();
      } catch (error) {
        server.close();
        reject(error);
      }
    });
  });
}

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

function clearServerModuleCache() {
  delete require.cache[require.resolve("../src/server")];
}

const validConfigurationContext = [
  {
    package: { slug: "stress-reset-massage", name: "Stress Reset Massage" },
    duration: { minutes: 60, label: "60 min" },
    intensity: { slug: "medium", label: "Medium" },
    addOns: [{ slug: "aroma-oil", name: "Aroma Oil" }],
  },
];

const aftercareProductContext = [
  { id: 1, slug: "heated-neck-wrap", name: "Heated Neck Wrap", price: 34.9 },
];

function validGeminiPayload(overrides = {}) {
  const { packageRecommendation: packageRecommendationOverrides, ...topLevelOverrides } = overrides;
  return {
    text: "Try the valid stress reset package.",
    packageRecommendation: {
      package: "stress-reset-massage",
      duration: 60,
      intensity: "medium",
      addOns: ["aroma-oil"],
      reason: "Matches shoulder tension with a calmer pace.",
      ...(packageRecommendationOverrides || {}),
    },
    aftercareItems: [{ id: 1, reason: "Keeps warmth after the session." }],
    ...topLevelOverrides,
  };
}

async function requestRecommendationWithGeminiPayloads(payloads) {
  const genai = require("@google/genai");
  const originalGoogleGenAI = genai.GoogleGenAI;
  const originalFetch = global.fetch;
  const previousEnv = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    CONFIGURATOR_URL: process.env.CONFIGURATOR_URL,
    AFTERCARE_URL: process.env.AFTERCARE_URL,
  };
  let callCount = 0;

  genai.GoogleGenAI = class FakeGoogleGenAI {
    constructor() {
      this.models = {
        generateContent: async () => {
          const payload = payloads[Math.min(callCount, payloads.length - 1)];
          callCount += 1;
          return { text: JSON.stringify(payload) };
        },
      };
    }
  };

  global.fetch = async (url) => {
    if (String(url) === "http://configurator.test/configurations") {
      return new Response(JSON.stringify(validConfigurationContext), { headers: { "content-type": "application/json" } });
    }
    if (String(url) === "http://aftercare.test/products") {
      return new Response(JSON.stringify(aftercareProductContext), { headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };

  process.env.GEMINI_API_KEY = "test-key";
  process.env.CONFIGURATOR_URL = "http://configurator.test";
  process.env.AFTERCARE_URL = "http://aftercare.test";
  clearServerModuleCache();
  const app = require("../src/server");

  try {
    const response = await httpRequest(app, "POST", "/recommend", {
      prompt: "My shoulders feel tense.",
    });
    response.geminiCallCount = callCount;
    return response;
  } finally {
    genai.GoogleGenAI = originalGoogleGenAI;
    global.fetch = originalFetch;
    clearServerModuleCache();
    restoreEnv("GEMINI_API_KEY", previousEnv.GEMINI_API_KEY);
    restoreEnv("CONFIGURATOR_URL", previousEnv.CONFIGURATOR_URL);
    restoreEnv("AFTERCARE_URL", previousEnv.AFTERCARE_URL);
  }
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
  assert.throws(() => coerceRecommendationPayload({
    text: "A recommendation with no aftercare.",
    packageRecommendation: {
      package: "neck-shoulder-relief",
      duration: 60,
      intensity: "medium",
      addOns: [],
      reason: "Matches shoulder tension.",
    },
    aftercareItems: [],
  }), /Gemini aftercareItems must contain one to three products/);
  assert.throws(() => coerceRecommendationPayload({
    text: "A recommendation with too much aftercare.",
    packageRecommendation: {
      package: "neck-shoulder-relief",
      duration: 60,
      intensity: "medium",
      addOns: [],
      reason: "Matches shoulder tension.",
    },
    aftercareItems: [
      { id: 1, reason: "One." },
      { id: 2, reason: "Two." },
      { id: 3, reason: "Three." },
      { id: 4, reason: "Four." },
    ],
  }), /Gemini aftercareItems must contain one to three products/);
  assert.throws(() => coerceRecommendationPayload({ text: "x", aftercareItems: [] }), /packageRecommendation/);

  const genai = require("@google/genai");
  const originalGoogleGenAI = genai.GoogleGenAI;
  const originalFetch = global.fetch;
  const requestedUrls = [];
  let capturedSystemPrompt = "";

  genai.GoogleGenAI = class FakeGoogleGenAI {
    constructor() {
      this.models = {
        generateContent: async ({ config }) => {
          capturedSystemPrompt = config.systemInstruction;
          return {
            text: JSON.stringify({
              text: "Try the valid stress reset package.",
              packageRecommendation: {
                package: "stress-reset-massage",
                duration: 60,
                intensity: "medium",
                addOns: ["aroma-oil"],
                reason: "Matches shoulder tension with a calmer pace.",
              },
              aftercareItems: [{ id: 1, reason: "Keeps warmth after the session." }],
            }),
          };
        },
      };
    }
  };

  global.fetch = async (url) => {
    requestedUrls.push(String(url));
    if (String(url) === "http://configurator.test/configurations") {
      return new Response(JSON.stringify([
        {
          package: { slug: "stress-reset-massage", name: "Stress Reset Massage" },
          duration: { minutes: 60, label: "60 min" },
          intensity: { slug: "medium", label: "Medium" },
          addOns: [{ slug: "aroma-oil", name: "Aroma Oil" }],
        },
      ]), { headers: { "content-type": "application/json" } });
    }
    if (String(url) === "http://aftercare.test/products") {
      return new Response(JSON.stringify([
        { id: 1, slug: "heated-neck-wrap", name: "Heated Neck Wrap", price: 34.9 },
      ]), { headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };

  const previousEnv = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    CONFIGURATOR_URL: process.env.CONFIGURATOR_URL,
    AFTERCARE_URL: process.env.AFTERCARE_URL,
  };
  process.env.GEMINI_API_KEY = "test-key";
  process.env.CONFIGURATOR_URL = "http://configurator.test";
  process.env.AFTERCARE_URL = "http://aftercare.test";
  clearServerModuleCache();
  const app = require("../src/server");

  try {
    const recommended = await httpRequest(app, "POST", "/recommend", {
      prompt: "My shoulders feel tense.",
    });

    assert.equal(recommended.status, 200);
    assert.deepEqual(requestedUrls, [
      "http://configurator.test/configurations",
      "http://aftercare.test/products",
    ]);
    assert.match(capturedSystemPrompt, /Valid package configurations:/);
    assert.match(capturedSystemPrompt, /stress-reset-massage/);
    assert.match(capturedSystemPrompt, /aroma-oil/);
    assert.doesNotMatch(capturedSystemPrompt, /Durations:/);
    assert.doesNotMatch(capturedSystemPrompt, /Intensities:/);
    assert.doesNotMatch(capturedSystemPrompt, /Add-ons:/);
  } finally {
    genai.GoogleGenAI = originalGoogleGenAI;
    global.fetch = originalFetch;
    clearServerModuleCache();
    restoreEnv("GEMINI_API_KEY", previousEnv.GEMINI_API_KEY);
    restoreEnv("CONFIGURATOR_URL", previousEnv.CONFIGURATOR_URL);
    restoreEnv("AFTERCARE_URL", previousEnv.AFTERCARE_URL);
  }

  genai.GoogleGenAI = class FakeGoogleGenAI {
    constructor() {
      this.models = {
        generateContent: async () => {
          throw new Error("Gemini should not be called when context fetch fails");
        },
      };
    }
  };
  global.fetch = async (url) => {
    if (String(url) === "http://configurator.test/configurations") {
      return new Response("service unavailable", { status: 503 });
    }
    if (String(url) === "http://aftercare.test/products") {
      return new Response(JSON.stringify([]), { headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };
  process.env.GEMINI_API_KEY = "test-key";
  process.env.CONFIGURATOR_URL = "http://configurator.test";
  process.env.AFTERCARE_URL = "http://aftercare.test";
  clearServerModuleCache();
  const appWithFailedContext = require("../src/server");

  try {
    const failedContext = await httpRequest(appWithFailedContext, "POST", "/recommend", {
      prompt: "My shoulders feel tense.",
    });

    assert.equal(failedContext.status, 500);
    assert.equal(failedContext.payload.error, "context fetch failed: configurations returned 503");
  } finally {
    genai.GoogleGenAI = originalGoogleGenAI;
    global.fetch = originalFetch;
    clearServerModuleCache();
    restoreEnv("GEMINI_API_KEY", previousEnv.GEMINI_API_KEY);
    restoreEnv("CONFIGURATOR_URL", previousEnv.CONFIGURATOR_URL);
    restoreEnv("AFTERCARE_URL", previousEnv.AFTERCARE_URL);
  }

  const unknownPackage = await requestRecommendationWithGeminiPayloads([
    validGeminiPayload({ packageRecommendation: { package: "unknown-package" } }),
    validGeminiPayload({ packageRecommendation: { package: "unknown-package" } }),
  ]);

  assert.equal(unknownPackage.status, 500);
  assert.equal(unknownPackage.payload.error, "Gemini packageRecommendation is not in valid configurations");
  assert.equal(unknownPackage.geminiCallCount, 2);

  const invalidDuration = await requestRecommendationWithGeminiPayloads([
    validGeminiPayload({ packageRecommendation: { duration: 90 } }),
    validGeminiPayload({ packageRecommendation: { duration: 90 } }),
  ]);

  assert.equal(invalidDuration.status, 500);
  assert.equal(invalidDuration.payload.error, "Gemini packageRecommendation is not in valid configurations");
  assert.equal(invalidDuration.geminiCallCount, 2);

  const invalidIntensity = await requestRecommendationWithGeminiPayloads([
    validGeminiPayload({ packageRecommendation: { intensity: "firm" } }),
    validGeminiPayload({ packageRecommendation: { intensity: "firm" } }),
  ]);

  assert.equal(invalidIntensity.status, 500);
  assert.equal(invalidIntensity.payload.error, "Gemini packageRecommendation is not in valid configurations");
  assert.equal(invalidIntensity.geminiCallCount, 2);

  const disallowedAddOn = await requestRecommendationWithGeminiPayloads([
    validGeminiPayload({ packageRecommendation: { addOns: ["hot-stones"] } }),
    validGeminiPayload({ packageRecommendation: { addOns: ["hot-stones"] } }),
  ]);

  assert.equal(disallowedAddOn.status, 500);
  assert.equal(disallowedAddOn.payload.error, "Gemini packageRecommendation is not in valid configurations");
  assert.equal(disallowedAddOn.geminiCallCount, 2);

  const unknownProduct = await requestRecommendationWithGeminiPayloads([
    validGeminiPayload({ aftercareItems: [{ id: 999, reason: "Unknown product." }] }),
    validGeminiPayload({ aftercareItems: [{ id: 999, reason: "Unknown product." }] }),
  ]);

  assert.equal(unknownProduct.status, 500);
  assert.equal(unknownProduct.payload.error, "Gemini aftercareItems contain unknown product id");
  assert.equal(unknownProduct.geminiCallCount, 2);

  const repairedStringDuration = await requestRecommendationWithGeminiPayloads([
    validGeminiPayload({ packageRecommendation: { duration: "60" } }),
  ]);

  assert.equal(repairedStringDuration.status, 200);
  assert.equal(repairedStringDuration.payload.packageRecommendation.duration, 60);
  assert.equal(repairedStringDuration.payload.packageLink, "/package-configurator/stress-reset-massage/60/medium/aroma-oil");

  const unknownStringDuration = await requestRecommendationWithGeminiPayloads([
    validGeminiPayload({ packageRecommendation: { duration: "90" } }),
    validGeminiPayload({ packageRecommendation: { duration: "90" } }),
  ]);

  assert.equal(unknownStringDuration.status, 500);
  assert.equal(unknownStringDuration.payload.error, "Gemini packageRecommendation is not in valid configurations");
  assert.equal(unknownStringDuration.geminiCallCount, 2);

  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "replace_me";
  const unavailable = await httpRequest(app, "POST", "/recommend", { prompt: "My shoulders feel tense." });
  assert.equal(unavailable.status, 503);
  restoreEnv("GEMINI_API_KEY", previousKey);
  console.log("recommendation smoke test passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
