(function () {
async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadGoogleMaps(apiKey) {
  if (!apiKey || apiKey === "replace_me") return Promise.resolve(false);
  if (window.google?.maps) return Promise.resolve(true);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.dataset.googleMaps = "true";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.addEventListener("load", () => resolve(true), { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
}

async function initVisitContext() {
  const summary = document.querySelector("#visit-summary");
  if (!summary) return;
  const map = document.querySelector("#map");
  try {
    const data = await requestJson("/api/visit-context/visit-summary");
    const location = data.location || data.center || {};
    const lat = Number(location.latitude || location.lat);
    const lng = Number(location.longitude || location.lng);
    summary.innerHTML = `
      <h2>${escapeHtml(location.name || "Serenity Wellness Center")}</h2>
      <p>${escapeHtml(location.address || data.address || "")}</p>
      <p>${escapeHtml(location.openingNote || data.openingNote || "")}</p>
      <p>${escapeHtml(location.arrivalTip || data.arrivalTip || data.tip || "")}</p>
      <p>${escapeHtml(data.weather?.summary || data.weatherSummary || "")}</p>
    `;
    const hasMaps = await loadGoogleMaps(window.SERENITY_MAPS_KEY);
    if (hasMaps && Number.isFinite(lat) && Number.isFinite(lng)) {
      const center = { lat, lng };
      const googleMap = new window.google.maps.Map(map, {
        center,
        zoom: 14,
      });
      new window.google.maps.Marker({
        map: googleMap,
        position: center,
        title: location.name || "Serenity Wellness Center",
      });
    } else {
      map.innerHTML = `
        <h2>Map unavailable</h2>
        <p>Google Maps key is not configured.</p>
        <p><strong>Address:</strong> ${escapeHtml(location.address || data.address || "See visit details above.")}</p>
        <p><strong>Arrival tip:</strong> ${escapeHtml(location.arrivalTip || data.arrivalTip || data.tip || "See visit details above.")}</p>
      `;
    }
  } catch (err) {
    summary.textContent = err.message;
  }
}

initVisitContext().catch(console.error);
})();
