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

module.exports = {
  mapLocation,
  buildWeatherFallback,
};
