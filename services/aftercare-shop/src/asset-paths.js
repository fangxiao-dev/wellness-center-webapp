function normalizeObjectKey(key) {
  if (typeof key !== "string" || key.trim() === "") {
    throw new Error("invalid object key");
  }

  const segments = key.split("/");
  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || segment.includes("\\")) {
      throw new Error("invalid object key");
    }
  }

  return segments.map(encodeURIComponent).join("/");
}

function normalizeAftercareObjectKey(key) {
  const objectKey = normalizeObjectKey(key);
  if (!objectKey.startsWith("aftercare-shop/")) {
    throw new Error("invalid object key");
  }
  return objectKey;
}

function toPublicProductImageUrl(key) {
  return `/api/aftercare/assets/${normalizeAftercareObjectKey(key)}`;
}

module.exports = {
  normalizeObjectKey,
  normalizeAftercareObjectKey,
  toPublicProductImageUrl,
};
