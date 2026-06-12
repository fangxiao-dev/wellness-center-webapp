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

function normalizePackageObjectKey(key) {
  const objectKey = normalizeObjectKey(key);
  if (!objectKey.startsWith("package-configurator/")) {
    throw new Error("invalid object key");
  }
  return objectKey;
}

function toPublicPackageImageUrl(key) {
  return `/api/configurator/assets/${normalizePackageObjectKey(key)}`;
}

module.exports = {
  normalizeObjectKey,
  normalizePackageObjectKey,
  toPublicPackageImageUrl,
};
