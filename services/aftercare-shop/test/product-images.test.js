const assert = require("node:assert/strict");
const test = require("node:test");
const { toPublicProductImageUrl } = require("../src/asset-paths");

test("aftercare image keys become API asset URLs", () => {
  assert.equal(
    toPublicProductImageUrl("aftercare-shop/heated-neck-wrap.png"),
    "/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png"
  );
});

test("unsafe image keys are rejected", () => {
  assert.throws(() => toPublicProductImageUrl("../secret.png"), /invalid/i);
});
