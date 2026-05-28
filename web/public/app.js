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
    `<option value="${item.slug || item.id}">${item.name}</option>`
  ).join("");
  durationSelect.innerHTML = durations.map((item) =>
    `<option value="${item.minutes || item.duration || item}">${item.label || item.minutes || item}</option>`
  ).join("");
  intensitySelect.innerHTML = intensities.map((item) =>
    `<option value="${item.slug || item.id || item}">${item.label || item.name || item}</option>`
  ).join("");
  addonOptions.insertAdjacentHTML("beforeend", addOns.map((item) => {
    const value = item.slug || item.id || item;
    return `<label><input type="checkbox" name="addOns" value="${value}"> ${item.name || item.label || item}</label>`;
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

    result.innerHTML = `
      <h2>${configured.name || configured.package || "Configured package"}</h2>
      <p>${configured.description || configured.summary || ""}</p>
      <strong>${money(configured.price || configured.totalPrice)}</strong>
      <button id="add-package-button" type="button">Add package to cart</button>
    `;
    result.querySelector("#add-package-button").addEventListener("click", () => {
      requestJson("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({
          type: "package",
          name: configured.name || configured.package,
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
        <p>${body.text || ""}</p>
        ${body.packageLink ? `<a class="button" href="${body.packageLink}">Open package</a>` : ""}
        ${(body.aftercareLinks || []).map((link) => `
          <article>
            <h3><a href="${link.href}">${link.title}</a></h3>
            <p>${link.reason || ""}</p>
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
        <span>${item.name} x ${item.quantity}</span>
        <strong>${money(Number(item.price) * Number(item.quantity || 1))}</strong>
        <button data-remove="${item.id}" type="button">Remove</button>
      </div>
    `).join("") || "<p>Your cart is empty.</p>";
    total.textContent = `Total: ${money(cart.total || items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0))}`;
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

async function initVisitContext() {
  const summary = document.querySelector("#visit-summary");
  if (!summary) return;
  try {
    const data = await requestJson("/api/visit-context/visit-summary");
    const location = data.location || data.center || {};
    summary.innerHTML = `
      <h2>${location.name || "Serenity Wellness Center"}</h2>
      <p>${location.address || data.address || ""}</p>
      <p>${data.arrivalTip || data.tip || ""}</p>
      <p>${data.weather?.summary || data.weatherSummary || ""}</p>
    `;
    document.querySelector("#map").textContent = window.SERENITY_MAPS_KEY
      ? "Map loads with Google Maps when configured."
      : `${location.address || "Map unavailable until Google Maps key is configured."}`;
  } catch (err) {
    summary.textContent = err.message;
  }
}

initConfigurator().catch(console.error);
initAftercareButtons();
initAi();
initCart().catch(console.error);
initVisitContext().catch(console.error);
