const express = require("express");
const mysql = require("mysql2/promise");
const { normalizeObjectKey, toPublicPackageImageUrl } = require("./asset-paths");

const app = express();
const port = process.env.PORT || 4103;
const MINIO_BUCKET = process.env.MINIO_BUCKET || "wellness-media";
const MINIO_BASE = `http://${process.env.MINIO_ENDPOINT || "minio"}:${process.env.MINIO_PORT || 9000}`;

app.use(express.json());

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || "mysql-configurator",
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || "DBE_CLOUDDEV_CONFIGURATOR",
      password: process.env.MYSQL_PASSWORD || "DBE_CLOUDDEV_CONFIGURATOR_PASSWORD",
      database: "wellness_package_configurator",
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

function asMoney(value) {
  return Number.parseFloat(value || 0);
}

function computePackagePrice({ basePrice, durationDelta, intensityDelta, addOnDeltas }) {
  return asMoney(basePrice) +
    asMoney(durationDelta) +
    asMoney(intensityDelta) +
    (Array.isArray(addOnDeltas) ? addOnDeltas : []).reduce((sum, delta) => sum + asMoney(delta), 0);
}

function baseImageKey(slug) {
  return `package-configurator/base/${slug}.png`;
}

function joinNames(names) {
  const list = (Array.isArray(names) ? names : []).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

function buildConfigurationSummary({ packageName, minutes, intensityLabel, addOnNames }) {
  const base = `A ${Number(minutes)}-minute ${packageName} at ${String(intensityLabel).toLowerCase()} pressure`;
  const addOns = Array.isArray(addOnNames) && addOnNames.length > 0
    ? ` with ${joinNames(addOnNames)}`
    : "";
  return `${base}${addOns}.`;
}

function mapPackage(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    goal: row.goal,
    description: row.description,
    basePrice: asMoney(row.base_price),
    baseMinutes: Number(row.base_minutes),
    imageUrl: toPublicPackageImageUrl(baseImageKey(row.slug)),
  };
}

function mapDuration(row) {
  return {
    id: row.id,
    minutes: Number(row.minutes),
    label: row.label,
    priceDelta: asMoney(row.price_delta),
  };
}

function mapIntensity(row) {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    description: row.description,
    priceDelta: asMoney(row.price_delta),
  };
}

function mapAddon(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceDelta: asMoney(row.price_delta),
    imageUrl: toPublicPackageImageUrl(row.minio_object),
  };
}

function sendError(res, status, error) {
  return res.status(status).json({ error });
}

async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "package-configurator" });
});

app.get("/packages", async (_req, res) => {
  try {
    res.json((await query("SELECT * FROM packages ORDER BY id")).map(mapPackage));
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.get("/options/durations", async (_req, res) => {
  try {
    res.json((await query("SELECT * FROM durations ORDER BY minutes")).map(mapDuration));
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.get("/options/intensities", async (_req, res) => {
  try {
    res.json((await query("SELECT * FROM intensities ORDER BY id")).map(mapIntensity));
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.get("/options/add-ons", async (_req, res) => {
  try {
    res.json((await query("SELECT * FROM add_ons ORDER BY id")).map(mapAddon));
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.post("/configuration/calculate", async (req, res) => {
  const body = req.body || {};
  if (!body.package) {
    return sendError(res, 400, "package is required");
  }
  if (!body.duration) {
    return sendError(res, 400, "duration is required");
  }
  if (!body.intensity) {
    return sendError(res, 400, "intensity is required");
  }

  const minutes = Number.parseInt(body.duration, 10);
  if (!Number.isInteger(minutes) || minutes <= 0) {
    return sendError(res, 400, "duration must be a positive number of minutes");
  }

  if (body.addOns !== undefined && !Array.isArray(body.addOns)) {
    return sendError(res, 400, "addOns must be an array");
  }

  const addOns = Array.isArray(body.addOns) ? body.addOns : [];

  try {
    const packageRows = await query("SELECT * FROM packages WHERE slug = ? LIMIT 1", [body.package]);
    if (!packageRows[0]) return sendError(res, 404, "package not found");

    const durationRows = await query("SELECT * FROM durations WHERE minutes = ? LIMIT 1", [minutes]);
    if (!durationRows[0]) return sendError(res, 404, "duration not found");

    const intensityRows = await query("SELECT * FROM intensities WHERE slug = ? LIMIT 1", [body.intensity]);
    if (!intensityRows[0]) return sendError(res, 404, "intensity not found");

    let selectedAddOns = [];
    if (addOns.length > 0) {
      selectedAddOns = await query("SELECT * FROM add_ons WHERE slug IN (?) ORDER BY id", [addOns]);
      if (selectedAddOns.length !== addOns.length) {
        return sendError(res, 404, "add-on not found");
      }
    }

    const pkg = mapPackage(packageRows[0]);
    const duration = mapDuration(durationRows[0]);
    const intensity = mapIntensity(intensityRows[0]);
    const mappedAddOns = selectedAddOns.map(mapAddon);
    const price = computePackagePrice({
      basePrice: pkg.basePrice,
      durationDelta: duration.priceDelta,
      intensityDelta: intensity.priceDelta,
      addOnDeltas: mappedAddOns.map((addOn) => addOn.priceDelta),
    });

    res.json({
      package: {
        slug: pkg.slug,
        name: pkg.name,
        baseImageUrl: pkg.imageUrl,
      },
      duration: {
        minutes: duration.minutes,
        label: duration.label,
      },
      intensity: {
        slug: intensity.slug,
        label: intensity.label,
      },
      addOns: mappedAddOns.map((addOn) => ({
        slug: addOn.slug,
        name: addOn.name,
        imageUrl: addOn.imageUrl,
        priceDelta: addOn.priceDelta,
      })),
      price,
      summary: buildConfigurationSummary({
        packageName: pkg.name,
        minutes: duration.minutes,
        intensityLabel: intensity.label,
        addOnNames: mappedAddOns.map((addOn) => addOn.name),
      }),
    });
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.get(/^\/assets\/(.+)$/, async (req, res) => {
  let objectKey;
  try {
    objectKey = normalizeObjectKey(req.params[0]);
  } catch (_error) {
    return sendError(res, 400, "invalid asset key");
  }

  try {
    const upstream = await fetch(`${MINIO_BASE}/${encodeURIComponent(MINIO_BUCKET)}/${objectKey}`);
    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    sendError(res, 502, error.message);
  }
});

if (require.main === module) {
  app.listen(port, () => console.log(`package-configurator listening on port ${port}`));
}

module.exports = app;
module.exports.computePackagePrice = computePackagePrice;
module.exports.joinNames = joinNames;
module.exports.buildConfigurationSummary = buildConfigurationSummary;
module.exports.baseImageKey = baseImageKey;
