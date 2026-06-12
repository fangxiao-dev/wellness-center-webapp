function mapLocation(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    destination: row.destination,
    label: row.label,
    value: row.value,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    openingNote: row.opening_note,
    arrivalTip: row.arrival_tip,
  };
}

function buildWeatherFallback(row) {
  return {
    provider: "fallback",
    condition: row.fallback_condition,
    temperatureC: Number(row.fallback_temperature_c),
    summary: row.fallback_summary,
  };
}

function hasRealGoogleWeatherApiKey(value) {
  const key = String(value || "").trim();
  const normalized = key.toLowerCase();
  return Boolean(
    key &&
    !normalized.includes("replace_me") &&
    !normalized.includes("placeholder") &&
    normalized !== "your_api_key" &&
    normalized !== "your-weather-api-key"
  );
}

function buildGoogleWeatherRequestUrl(location, apiKey) {
  const url = new URL("https://weather.googleapis.com/v1/currentConditions:lookup");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("location.latitude", String(location.latitude));
  url.searchParams.set("location.longitude", String(location.longitude));
  url.searchParams.set("unitsSystem", "METRIC");
  url.searchParams.set("languageCode", "en");
  return url;
}

function mapGoogleWeatherCurrentConditions(payload, location) {
  const condition = payload?.weatherCondition?.description?.text;
  const temperatureC = Number(payload?.temperature?.degrees);

  if (!condition || !Number.isFinite(temperatureC)) {
    throw new Error("Google Weather response did not include current condition and temperature");
  }

  return {
    provider: "google",
    condition,
    temperatureC,
    summary: `${condition}, ${temperatureC} C near ${location.name}.`,
  };
}

module.exports = {
  mapLocation,
  buildWeatherFallback,
  hasRealGoogleWeatherApiKey,
  buildGoogleWeatherRequestUrl,
  mapGoogleWeatherCurrentConditions,
};
