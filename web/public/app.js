async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function money(value) {
  return `${Number(value || 0).toFixed(2)} EUR`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeHref(value, fallback = "#") {
  const href = String(value || "");
  return href.startsWith("/") ? href : fallback;
}

function packageDisplayName(configured) {
  if (configured.name) return configured.name;
  if (typeof configured.package === "string") return configured.package;
  return configured.package?.name || configured.package?.slug || "Configured package";
}

function addAftercareItem(product) {
  return requestJson("/api/cart/items", {
    method: "POST",
    body: JSON.stringify({
      type: "aftercare",
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl || null,
      details: {
        productId: product.id,
        slug: product.slug,
      },
    }),
  });
}

async function initConfigurator() {
  const form = document.querySelector("#configurator-form");
  if (!form) return;

  const packageSelect = form.querySelector("#package-select");
  const durationSelect = form.querySelector("#duration-select");
  const intensitySelect = form.querySelector("#intensity-select");
  const addonOptions = form.querySelector("#addon-options");
  const result = document.querySelector("#configuration-result");
  const initial = window.SERENITY_INITIAL_SELECTION || {};

  const [packages, durations, intensities, addOns] = await Promise.all([
    requestJson("/api/configurator/packages"),
    requestJson("/api/configurator/options/durations"),
    requestJson("/api/configurator/options/intensities"),
    requestJson("/api/configurator/options/add-ons"),
  ]);

  packageSelect.innerHTML = packages.map((item) =>
    `<option value="${escapeHtml(item.slug || item.id)}">${escapeHtml(item.name)}</option>`
  ).join("");
  durationSelect.innerHTML = durations.map((item) =>
    `<option value="${escapeHtml(item.minutes || item.duration || item)}">${escapeHtml(item.label || item.minutes || item)}</option>`
  ).join("");
  intensitySelect.innerHTML = intensities.map((item) =>
    `<option value="${escapeHtml(item.slug || item.id || item)}">${escapeHtml(item.label || item.name || item)}</option>`
  ).join("");
  addonOptions.insertAdjacentHTML("beforeend", addOns.map((item) => {
    const value = item.slug || item.id || item;
    return `<label><input type="checkbox" name="addOns" value="${escapeHtml(value)}"> ${escapeHtml(item.name || item.label || item)}</label>`;
  }).join(""));

  if (initial.package) packageSelect.value = initial.package;
  if (initial.duration) durationSelect.value = String(initial.duration);
  if (initial.intensity) intensitySelect.value = initial.intensity;
  if (initial.addon) {
    const checkbox = addonOptions.querySelector(`[value="${CSS.escape(initial.addon)}"]`);
    if (checkbox) checkbox.checked = true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const addOns = [...form.querySelectorAll("input[name='addOns']:checked")].map((input) => input.value);
    const configured = await requestJson("/api/configurator/configuration/calculate", {
      method: "POST",
      body: JSON.stringify({
        package: packageSelect.value,
        duration: Number(durationSelect.value),
        intensity: intensitySelect.value,
        addOns,
      }),
    });

    const packageName = packageDisplayName(configured);
    result.innerHTML = `
      <h2>${escapeHtml(packageName)}</h2>
      <p>${escapeHtml(configured.description || configured.summary || "")}</p>
      <strong>${money(configured.price || configured.totalPrice)}</strong>
      <button id="add-package-button" type="button">Add package to cart</button>
    `;
    result.querySelector("#add-package-button").addEventListener("click", () => {
      requestJson("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({
          type: "package",
          name: packageName,
          price: configured.price || configured.totalPrice,
          quantity: 1,
          imageUrl: configured.imageUrl || null,
          details: configured,
        }),
      });
    });
  });
}

function initAftercareButtons() {
  document.querySelectorAll(".add-aftercare-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const product = JSON.parse(button.dataset.product);
      await addAftercareItem(product);
      button.textContent = "Added";
    });
  });
}

async function initAi() {
  const form = document.querySelector("#ai-form");
  if (!form) return;
  const result = document.querySelector("#ai-result");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    result.textContent = "Preparing recommendation...";
    try {
      const body = await requestJson("/api/ai/recommend", {
        method: "POST",
        body: JSON.stringify({ prompt: form.querySelector("#ai-prompt").value }),
      });
      result.innerHTML = `
        <h2>Recommendation</h2>
        <p>${escapeHtml(body.text || "")}</p>
        ${body.packageLink ? `<a class="button" href="${escapeHtml(safeHref(body.packageLink))}">Open package</a>` : ""}
        ${(body.aftercareLinks || []).map((link) => `
          <article>
            <h3><a href="${escapeHtml(safeHref(link.href))}">${escapeHtml(link.title)}</a></h3>
            <p>${escapeHtml(link.reason || "")}</p>
          </article>
        `).join("")}
      `;
    } catch (err) {
      result.textContent = err.message;
    }
  });
}

async function initCart() {
  const container = document.querySelector("#cart-items");
  if (!container) return;
  const total = document.querySelector("#cart-total");
  const clear = document.querySelector("#clear-cart-button");

  async function render() {
    const cart = await requestJson("/api/cart");
    const items = cart.items || [];
    container.innerHTML = items.map((item) => `
      <div class="cart-row">
        <span>${escapeHtml(item.name)}</span>
        <input
          aria-label="Quantity for ${escapeHtml(item.name)}"
          data-quantity="${escapeHtml(item.id)}"
          min="1"
          type="number"
          value="${escapeHtml(item.quantity || 1)}"
        >
        <strong>${money(Number(item.price) * Number(item.quantity || 1))}</strong>
        <button data-remove="${escapeHtml(item.id)}" type="button">Remove</button>
      </div>
    `).join("") || "<p>Your cart is empty.</p>";
    total.textContent = `Total: ${money(cart.total || items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0))}`;
    container.querySelectorAll("[data-quantity]").forEach((input) => {
      input.addEventListener("change", async () => {
        const quantity = Math.max(1, Number(input.value || 1));
        await requestJson(`/api/cart/items/${encodeURIComponent(input.dataset.quantity)}`, {
          method: "PATCH",
          body: JSON.stringify({ quantity }),
        });
        render();
      });
    });
    container.querySelectorAll("[data-remove]").forEach((button) => {
      button.addEventListener("click", async () => {
        await fetch(`/api/cart/items/${encodeURIComponent(button.dataset.remove)}`, { method: "DELETE" });
        render();
      });
    });
  }

  clear.addEventListener("click", async () => {
    await fetch("/api/cart", { method: "DELETE" });
    render();
  });
  render();
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
      <p>${escapeHtml(data.arrivalTip || data.tip || "")}</p>
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
      map.textContent = location.address || "Map unavailable until Google Maps key is configured.";
    }
  } catch (err) {
    summary.textContent = err.message;
  }
}

initConfigurator().catch(console.error);
initAftercareButtons();
initAi();
initCart().catch(console.error);
initVisitContext().catch(console.error);
