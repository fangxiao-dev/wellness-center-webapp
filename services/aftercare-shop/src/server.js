const express = require("express");
const mysql = require("mysql2/promise");
const { normalizeAftercareObjectKey, toPublicProductImageUrl } = require("./asset-paths");

const app = express();
const port = process.env.PORT || 4104;
const MINIO_BUCKET = process.env.MINIO_BUCKET || "wellness-media";
const MINIO_BASE = `http://${process.env.MINIO_ENDPOINT || "minio"}:${process.env.MINIO_PORT || 9000}`;

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || "mysql-aftercare",
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || "DBE_CLOUDDEV_AFTERCARE",
      password: process.env.MYSQL_PASSWORD || "DBE_CLOUDDEV_AFTERCARE_PASSWORD",
      database: "wellness_aftercare_shop",
      waitForConnections: true,
      connectionLimit: 10,
      charset: "utf8mb4",
    });
  }
  return pool;
}

function mapProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    price: Number.parseFloat(row.price),
    description: row.description,
    usageNote: row.usage_note,
    imageUrl: toPublicProductImageUrl(row.minio_object),
  };
}

async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

function sendError(res, status, error) {
  return res.status(status).json({ error });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "aftercare-shop" });
});

app.get("/products", async (_req, res) => {
  try {
    const rows = await query("SELECT * FROM products ORDER BY id");
    res.json(rows.map(mapProduct));
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.get("/products/:productId", async (req, res) => {
  const productId = req.params.productId;
  const numericId = Number.parseInt(productId, 10);
  const isNumeric = String(numericId) === productId;
  try {
    const rows = await query(
      `SELECT * FROM products WHERE ${isNumeric ? "id" : "slug"} = ? LIMIT 1`,
      [isNumeric ? numericId : productId]
    );
    if (!rows[0]) return sendError(res, 404, "product not found");
    res.json(mapProduct(rows[0]));
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.get(/^\/assets\/(.+)$/, async (req, res) => {
  let objectKey;
  try {
    objectKey = normalizeAftercareObjectKey(req.params[0]);
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
  app.listen(port, () => console.log(`aftercare-shop listening on port ${port}`));
}

module.exports = app;
