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

function mapPackage(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    goal: row.goal,
    description: row.description,
    basePrice: asMoney(row.base_price),
    baseMinutes: Number(row.base_minutes),
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
  };
}

function sendError(res, status, error) {
  return res.status(status).json({ error });
}

async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function getConfigurationById(id) {
  const rows = await query(
    `SELECT c.id, c.summary,
            p.slug AS package_slug, p.name AS package_name, p.base_price,
            d.minutes, d.label AS duration_label, d.price_delta AS duration_delta,
            i.slug AS intensity_slug, i.label AS intensity_label, i.price_delta AS intensity_delta,
            ci.image_key
       FROM configurations c
       JOIN packages p ON p.id = c.package_id
       JOIN durations d ON d.id = c.duration_id
       JOIN intensities i ON i.id = c.intensity_id
       LEFT JOIN configuration_images ci ON ci.configuration_id = c.id
      WHERE c.id = ?
      LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;

  const addons = await query(
    `SELECT a.id, a.slug, a.name, a.description, a.price_delta
       FROM configuration_addons ca
       JOIN add_ons a ON a.id = ca.addon_id
      WHERE ca.configuration_id = ?
      ORDER BY a.id`,
    [id]
  );

  return mapConfiguration(rows[0], addons);
}

function mapConfiguration(row, addons = []) {
  const price = asMoney(row.base_price) + asMoney(row.duration_delta) +
    asMoney(row.intensity_delta) + addons.reduce((sum, addon) => sum + asMoney(addon.price_delta), 0);
  return {
    id: row.id,
    package: {
      slug: row.package_slug,
      name: row.package_name,
    },
    duration: {
      minutes: Number(row.minutes),
      label: row.duration_label,
    },
    intensity: {
      slug: row.intensity_slug,
      label: row.intensity_label,
    },
    addOns: addons.map((addon) => ({
      slug: addon.slug,
      name: addon.name,
    })),
    price,
    imageUrl: row.image_key ? toPublicPackageImageUrl(row.image_key) : null,
    summary: row.summary,
  };
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
    const rows = await query("SELECT id FROM configurations ORDER BY id");
    res.json(await Promise.all(rows.map((row) => getConfigurationById(row.id))));
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.get("/configurations/:id", async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return sendError(res, 400, "configuration id must be a positive integer");
  }
  try {
    const configuration = await getConfigurationById(id);
    if (!configuration) return sendError(res, 404, "configuration not found");
    res.json(configuration);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.post("/configuration/calculate", async (req, res) => {
  const body = req.body || {};
  if (!body.package) {
    return res.status(400).json({ error: "package is required" });
  }

  const minutes = Number.parseInt(body.duration, 10);
  const addOns = Array.isArray(body.addOns) ? body.addOns : [];

  try {
    const rows = await query(
      `SELECT c.id
         FROM configurations c
         JOIN packages p ON p.id = c.package_id
         JOIN durations d ON d.id = c.duration_id
         JOIN intensities i ON i.id = c.intensity_id
        WHERE p.slug = ? AND d.minutes = ? AND i.slug = ?
        ORDER BY c.id
        LIMIT 1`,
      [body.package, minutes, body.intensity]
    );
    if (!rows[0]) return sendError(res, 404, "configuration not found");

    const configuration = await getConfigurationById(rows[0].id);
    if (addOns.length > 0) {
      const selected = await query(
        `SELECT id, slug, name, description, price_delta
           FROM add_ons
          WHERE slug IN (?)
          ORDER BY id`,
        [addOns]
      );
      configuration.addOns = selected.map((addon) => ({ slug: addon.slug, name: addon.name }));
      configuration.price += selected.reduce((sum, addon) => sum + asMoney(addon.price_delta), 0);
    }
    res.json(configuration);
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
