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

function toPublicPackageImageUrl(key) {
  return `/api/configurator/assets/${normalizeObjectKey(key)}`;
}

module.exports = {
  normalizeObjectKey,
  toPublicPackageImageUrl,
};
