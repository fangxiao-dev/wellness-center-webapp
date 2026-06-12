const express = require("express");
const mysql = require("mysql2/promise");
const { normalizePackageObjectKey, toPublicPackageImageUrl } = require("./asset-paths");

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

function mapConfigurationRows(rows) {
  const configurationsById = new Map();

  for (const row of rows) {
    if (!configurationsById.has(row.configuration_id)) {
      configurationsById.set(row.configuration_id, {
        id: row.configuration_id,
        package: {
          id: row.package_id,
          slug: row.package_slug,
          name: row.package_name,
          goal: row.package_goal,
          description: row.package_description,
          basePrice: asMoney(row.package_base_price),
          baseMinutes: Number(row.package_base_minutes),
          imageUrl: toPublicPackageImageUrl(row.package_minio_object),
        },
        duration: {
          id: row.duration_id,
          minutes: Number(row.duration_minutes),
          label: row.duration_label,
          priceDelta: asMoney(row.duration_price_delta),
        },
        intensity: {
          id: row.intensity_id,
          slug: row.intensity_slug,
          label: row.intensity_label,
          description: row.intensity_description,
          priceDelta: asMoney(row.intensity_price_delta),
        },
        addOns: [],
      });
    }

    if (row.addon_id != null) {
      configurationsById.get(row.configuration_id).addOns.push({
        id: row.addon_id,
        slug: row.addon_slug,
        name: row.addon_name,
        description: row.addon_description,
        priceDelta: asMoney(row.addon_price_delta),
        imageUrl: toPublicPackageImageUrl(row.addon_minio_object),
      });
    }
  }

  return [...configurationsById.values()];
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

app.get("/configurations", async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        c.id AS configuration_id,
        p.id AS package_id,
        p.slug AS package_slug,
        p.name AS package_name,
        p.goal AS package_goal,
        p.description AS package_description,
        p.base_price AS package_base_price,
        p.base_minutes AS package_base_minutes,
        p.minio_object AS package_minio_object,
        d.id AS duration_id,
        d.minutes AS duration_minutes,
        d.label AS duration_label,
        d.price_delta AS duration_price_delta,
        i.id AS intensity_id,
        i.slug AS intensity_slug,
        i.label AS intensity_label,
        i.description AS intensity_description,
        i.price_delta AS intensity_price_delta,
        a.id AS addon_id,
        a.slug AS addon_slug,
        a.name AS addon_name,
        a.description AS addon_description,
        a.price_delta AS addon_price_delta,
        a.minio_object AS addon_minio_object
      FROM configurations c
      JOIN packages p ON p.id = c.package_id
      JOIN durations d ON d.id = c.duration_id
      JOIN intensities i ON i.id = c.intensity_id
      LEFT JOIN configuration_addons ca ON ca.configuration_id = c.id AND ca.enabled = TRUE
      LEFT JOIN add_ons a ON a.id = ca.add_on_id
      WHERE c.enabled = TRUE
      ORDER BY p.id, d.minutes, i.id, a.id
    `);
    res.json(mapConfigurationRows(rows));
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

    const configurationRows = await query(
      "SELECT id FROM configurations WHERE package_id = ? AND duration_id = ? AND intensity_id = ? AND enabled = TRUE LIMIT 1",
      [packageRows[0].id, durationRows[0].id, intensityRows[0].id]
    );
    if (!configurationRows[0]) return sendError(res, 400, "configuration is not available");

    let selectedAddOns = [];
    if (addOns.length > 0) {
      selectedAddOns = await query("SELECT * FROM add_ons WHERE slug IN (?) ORDER BY id", [addOns]);
      if (selectedAddOns.length !== addOns.length) {
        return sendError(res, 404, "add-on not found");
      }

      const allowedAddOns = await query(
        `
          SELECT a.*
          FROM configuration_addons ca
          JOIN add_ons a ON a.id = ca.add_on_id
          WHERE ca.configuration_id = ?
            AND ca.enabled = TRUE
            AND a.slug IN (?)
          ORDER BY a.id
        `,
        [configurationRows[0].id, addOns]
      );
      if (allowedAddOns.length !== selectedAddOns.length) {
        return sendError(res, 400, "add-on is not available for configuration");
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
    objectKey = normalizePackageObjectKey(req.params[0]);
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
