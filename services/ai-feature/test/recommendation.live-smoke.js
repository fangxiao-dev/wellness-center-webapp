const assert = require("node:assert/strict");

const AI_RECOMMEND_URL = process.env.AI_RECOMMEND_URL || "http://localhost:4105/recommend";

async function run() {
  const response = await fetch(AI_RECOMMEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "My shoulders feel tense and I want a calming after-work session.",
    }),
  });
  const body = await response.text();
  assert.equal(response.ok, true, `${AI_RECOMMEND_URL} returned ${response.status}: ${body}`);
  const recommendation = JSON.parse(body);
  assert.equal(typeof recommendation.text, "string");
  assert.ok(recommendation.packageLink || recommendation.aftercareLinks.length > 0);
  console.log("live recommendation smoke test passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
