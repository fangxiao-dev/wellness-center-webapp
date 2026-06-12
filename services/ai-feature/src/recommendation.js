const { Type } = require("@google/genai");

const recommendationSchema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    packageRecommendation: {
      type: Type.OBJECT,
      properties: {
        package: { type: Type.STRING },
        duration: { type: Type.INTEGER },
        intensity: { type: Type.STRING },
        addOns: { type: Type.ARRAY, items: { type: Type.STRING } },
        reason: { type: Type.STRING },
      },
      required: ["package", "duration", "intensity", "addOns", "reason"],
    },
    aftercareItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          reason: { type: Type.STRING },
        },
        required: ["id", "reason"],
      },
    },
  },
  required: ["text", "packageRecommendation", "aftercareItems"],
};

function coerceRecommendationPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Gemini response is not a JSON object");
  }
  if (typeof payload.text !== "string" || !payload.text.trim()) {
    throw new Error("Gemini response text is missing");
  }

  const packageRecommendation = payload.packageRecommendation;
  if (!packageRecommendation || typeof packageRecommendation !== "object") {
    throw new Error("Gemini packageRecommendation is invalid");
  }
  const duration = coerceIntegralDuration(packageRecommendation.duration);
  if (
    typeof packageRecommendation.package !== "string" ||
    duration === null ||
    typeof packageRecommendation.intensity !== "string" ||
    !Array.isArray(packageRecommendation.addOns)
  ) {
    throw new Error("Gemini packageRecommendation is incomplete");
  }

  const aftercareItems = payload.aftercareItems || payload.aftercareLinks;
  if (!Array.isArray(aftercareItems)) {
    throw new Error("Gemini aftercareItems is invalid");
  }

  const seenIds = new Set();
  const normalizedAftercareItems = [];
  for (const item of aftercareItems) {
    if (!item || typeof item !== "object" || !Number.isInteger(item.id)) {
      throw new Error("Gemini aftercareItems is invalid");
    }
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    normalizedAftercareItems.push({
      id: item.id,
      reason: typeof item.reason === "string" && item.reason.trim()
        ? item.reason.trim()
        : "Supports your visit goals.",
    });
  }
  if (normalizedAftercareItems.length < 1 || normalizedAftercareItems.length > 3) {
    throw new Error("Gemini aftercareItems must contain one to three products");
  }

  return {
    text: payload.text.trim(),
    packageRecommendation: {
      package: packageRecommendation.package.trim(),
      duration,
      intensity: packageRecommendation.intensity.trim(),
      addOns: packageRecommendation.addOns
        .filter((addOn) => typeof addOn === "string" && addOn.trim())
        .map((addOn) => addOn.trim()),
      reason: typeof packageRecommendation.reason === "string"
        ? packageRecommendation.reason.trim()
        : "",
    },
    aftercareItems: normalizedAftercareItems,
  };
}

function coerceIntegralDuration(value) {
  if (Number.isInteger(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && Number.isInteger(number) ? number : null;
}

function buildPackageLink(packageRecommendation) {
  if (!packageRecommendation) return null;
  const addOnPath = packageRecommendation.addOns.length > 0
    ? `/${packageRecommendation.addOns.map(encodeURIComponent).join(",")}`
    : "/none";
  return `/package-configurator/${encodeURIComponent(packageRecommendation.package)}/${encodeURIComponent(packageRecommendation.duration)}/${encodeURIComponent(packageRecommendation.intensity)}${addOnPath}`;
}

function buildRecommendationResponse(recommendation, products = []) {
  const productById = new Map(products.map((product) => [product.id, product]));
  return {
    text: recommendation.text,
    packageLink: buildPackageLink(recommendation.packageRecommendation),
    packageRecommendation: recommendation.packageRecommendation,
    aftercareLinks: recommendation.aftercareItems.map((item) => {
      const product = productById.get(item.id);
      return {
        id: item.id,
        href: `/aftercare-shop#product-${product?.slug || item.id}`,
        title: product?.name || `Aftercare product #${item.id}`,
        imageUrl: product?.imageUrl || "",
        price: product?.price ?? null,
        reason: item.reason,
      };
    }),
  };
}

function validateRecommendationContext(recommendation, { validConfigurations = [], products = [] } = {}) {
  const packageRecommendation = recommendation.packageRecommendation;
  const matchingConfiguration = validConfigurations.find((configuration) => (
    configuration.package?.slug === packageRecommendation.package &&
    configuration.duration?.minutes === packageRecommendation.duration &&
    configuration.intensity?.slug === packageRecommendation.intensity
  ));
  const allowedAddOns = new Set((matchingConfiguration?.addOns || []).map((addOn) => addOn.slug));
  if (!matchingConfiguration || packageRecommendation.addOns.some((addOn) => !allowedAddOns.has(addOn))) {
    throw new Error("Gemini packageRecommendation is not in valid configurations");
  }

  const productIds = new Set(products.map((product) => product.id));
  if (recommendation.aftercareItems.some((item) => !productIds.has(item.id))) {
    throw new Error("Gemini aftercareItems contain unknown product id");
  }

  return recommendation;
}

module.exports = {
  buildRecommendationResponse,
  coerceRecommendationPayload,
  recommendationSchema,
  validateRecommendationContext,
};
