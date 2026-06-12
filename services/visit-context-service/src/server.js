const express = require("express");
const { getPool } = require("./db");
const {
  buildGoogleWeatherRequestUrl,
  buildWeatherFallback,
  hasRealGoogleWeatherApiKey,
  mapGoogleWeatherCurrentConditions,
  mapLocation,
} = require("./visitContext");

const app = express();
const port = process.env.PORT || 4107;
const GOOGLE_WEATHER_TIMEOUT_MS = Number(process.env.GOOGLE_WEATHER_TIMEOUT_MS || 1500);

async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function loadActiveLocations(locationId = null) {
  const params = [];
  let where = "WHERE active = TRUE";
  if (locationId) {
    where += " AND id = ?";
    params.push(locationId);
  }
  return query(
    `SELECT id, name, address, destination, label, value, latitude, longitude, opening_note, arrival_tip
       FROM locations
       ${where}
      ORDER BY sort_order, name`,
    params
  );
}

async function loadFallbackWeather(locationId) {
  const rows = await query(
    `SELECT fallback_condition, fallback_temperature_c, fallback_summary
       FROM weather_context
      WHERE location_id = ?
      LIMIT 1`,
    [locationId]
  );
  return rows[0] ? buildWeatherFallback(rows[0]) : null;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function loadGoogleWeather(location) {
  const apiKey = process.env.GOOGLE_WEATHER_API_KEY;
  if (!hasRealGoogleWeatherApiKey(apiKey)) return null;

  try {
    const url = buildGoogleWeatherRequestUrl(location, apiKey);
    const response = await fetchWithTimeout(url, GOOGLE_WEATHER_TIMEOUT_MS);
    if (!response.ok) return null;
    return mapGoogleWeatherCurrentConditions(await response.json(), location);
  } catch (_error) {
    return null;
  }
}

async function loadCurrentWeather(location) {
  const googleWeather = await loadGoogleWeather(location);
  if (googleWeather) return googleWeather;
  return loadFallbackWeather(location.id);
}

function sendError(res, status, error) {
  return res.status(status).json({ error });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "visit-context-service" });
});

app.get("/locations", async (_req, res) => {
  try {
    res.json((await loadActiveLocations()).map(mapLocation));
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.get("/weather/current", async (req, res) => {
  try {
    const locationId = req.query.locationId || "wellness-center-main";
    const locations = await loadActiveLocations(locationId);
    if (!locations[0]) return sendError(res, 404, "location not found");
    const weather = await loadCurrentWeather(mapLocation(locations[0]));
    if (!weather) return sendError(res, 404, "weather context not found");
    res.json(weather);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.get("/visit-summary", async (req, res) => {
  try {
    const locations = await loadActiveLocations(req.query.locationId || null);
    if (!locations[0]) return sendError(res, 404, "location not found");
    const location = mapLocation(locations[0]);
    const weather = await loadCurrentWeather(location);
    res.json({ location, weather });
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

if (require.main === module) {
  app.listen(port, () => console.log(`visit-context-service listening on port ${port}`));
}

module.exports = app;
