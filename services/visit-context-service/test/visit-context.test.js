const assert = require("node:assert/strict");
const test = require("node:test");
const { buildWeatherFallback } = require("../src/visitContext");

test("weather fallback uses seeded context", () => {
  const fallback = buildWeatherFallback({
    fallback_condition: "mild",
    fallback_temperature_c: "19.0",
    fallback_summary: "Mild weather is suitable for a calm visit.",
  });

  assert.equal(fallback.provider, "fallback");
  assert.equal(fallback.condition, "mild");
  assert.equal(fallback.temperatureC, 19);
  assert.match(fallback.summary, /calm visit/);
});
