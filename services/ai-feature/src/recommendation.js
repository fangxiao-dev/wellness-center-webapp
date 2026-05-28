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
  if (
    typeof packageRecommendation.package !== "string" ||
    !Number.isInteger(packageRecommendation.duration) ||
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

  return {
    text: payload.text.trim(),
    packageRecommendation: {
      package: packageRecommendation.package.trim(),
      duration: packageRecommendation.duration,
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
        href: `/aftercare-shop/${product?.slug || item.id}`,
        title: product?.name || `Aftercare product #${item.id}`,
        imageUrl: product?.imageUrl || "",
        price: product?.price ?? null,
        reason: item.reason,
      };
    }),
  };
}

module.exports = {
  buildRecommendationResponse,
  coerceRecommendationPayload,
  recommendationSchema,
};
