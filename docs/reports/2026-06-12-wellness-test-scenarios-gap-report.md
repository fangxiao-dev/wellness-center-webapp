# Wellness Center Test Scenarios And Business Gap Report

Date: 2026-06-12

## Summary

This report documents business-level test scenarios for the Wellness Center solo project by comparing it with the completed BMW group project.

The investigation covered:

- group project source code at `D:\CodeSpace\dbe-cloud-groupproject`
- solo project source code at `D:\CodeSpace\dbe-cloud-soloproject`
- running group app at `http://localhost:3000`
- running solo app at `http://localhost:4100`

The solo project has migrated the group project's core business loop into the Wellness Center domain:

```text
AI consultation -> package configurator -> aftercare shop -> shopping cart -> visit preparation
```

The main business gaps are not architectural. They are product-flow and demo-depth gaps:

- AI requires a configured Gemini key for a successful recommendation flow.
- AI aftercare recommendations currently link mostly to shop anchors rather than direct product detail pages.
- Visit context is mostly informational and does not yet include a user-driven route planner.
- Checkout is a demo review/confirmation flow, not an order or payment flow.
- Some cart UI copy still has German wording inherited from the group project.

## Group Project User Stories

### 1. Home / BMW Experience

User-facing functions:

- Open the BMW landing page.
- Navigate to configurator, merchandise shop, AI consultation, shopping cart, and Impressum.
- Click vehicle hotspots that deep-link into the configurator.
- Browse merchandise highlights and open merchandise detail pages.
- Use the route planner section to calculate a route to BMW Welt with Google Maps in the browser.

Business linkage:

- Home links into the main shopping and configuration flows.
- Home route planner calls the backend destination API and then uses Google Maps client-side routing.

### 2. Car Configurator

User-facing functions:

- Choose a BMW model.
- Choose exterior color.
- Choose interior.
- Choose wheels.
- See recalculated price, selected configuration, and preview images.
- Use a URL that reflects the selected configuration.
- Add the completed car configuration to the shopping cart.

Business linkage:

- The configurator owns valid model and option data.
- The cart stores a snapshot of the selected car configuration.
- The cart does not need to query the configurator again to display the item.

### 3. Merchandise Shop

User-facing functions:

- Browse merchandise products.
- Open a merchandise product detail page.
- Select quantity and optional product choices such as size.
- Add the product to the shopping cart.
- Use direct checkout from a product detail page, which adds the item and redirects to the cart checkout view.

Business linkage:

- Product detail pages write `merch` item snapshots into the cart.
- Cart totals update when product quantities change.

### 4. AI Beratung

User-facing functions:

- Enter a natural-language lifestyle prompt.
- Request a recommendation.
- Receive recommendation text, a car configuration link, and merchandise recommendations.
- Open the recommended configurator state.
- Open recommended merchandise items.

Business linkage:

- The AI service gathers context through configurator and merchandise APIs.
- The AI service returns links into the configurator and merchandise shop rather than creating cart items directly.

### 5. Shopping Cart

User-facing functions:

- View mixed car and merchandise cart items.
- Increase and decrease item quantities.
- Delete individual items.
- Clear the cart.
- Open a checkout-style UI.
- Submit a demo checkout form and see confirmation.

Business linkage:

- Cart state is session-scoped.
- Cart item snapshots are stored in Redis.
- The checkout UI is a demo confirmation and does not create an order.

### 6. Route Service / Destinations

User-facing functions:

- Use home page route planning.
- Fetch a destination list through the application API.
- Calculate route distance and duration in the browser when Google Maps is available.

Business linkage:

- The route service owns destination data.
- Google Maps performs the interactive route calculation in browser code.

## Solo Project Current Coverage

### 1. Home

Current state:

- The Wellness Center home page is available at `/`.
- Navigation reaches packages, aftercare, visit context, AI consultation, cart, and Impressum.
- The home page frames the product as a massage-focused wellness center.

Coverage assessment:

- Business entry points are present.
- The page is usable as the starting point for the main demo flows.

### 2. Package Configurator

Current state:

- Page routes exist:
  - `/package-configurator`
  - `/package-configurator/:package/:duration/:intensity/:addon`
- The package catalog currently contains:
  - 3 packages
  - 3 durations
  - 3 intensities
  - 4 add-ons
- Users can choose package, duration, intensity, and add-ons.
- The service calculates price and summary.
- Users can add a configured package to the cart as `type: "package"`.

Verified example:

```text
Package: Neck & Shoulder Relief
Duration: 60 min
Intensity: medium
Add-on: Aroma Oil
Expected calculated price: EUR 92
Expected summary: a 60-minute Neck & Shoulder Relief at medium pressure with Aroma Oil
```

Coverage assessment:

- The core package configuration flow is covered.
- The flow is strong enough for P0 testing.

### 3. Aftercare Shop

Current state:

- Page routes exist:
  - `/aftercare-shop`
  - `/aftercare-shop/:productId`
- The aftercare catalog currently contains 6 products.
- Users can browse product cards.
- Users can open product details such as `/aftercare-shop/heated-neck-wrap`.
- Users can adjust quantity and add products to the cart as `type: "aftercare"`.

Coverage assessment:

- Shop browsing, detail, quantity, and add-to-cart are covered.
- The module maps cleanly to the group project's merchandise shop flow.

### 4. AI Consultation

Current state:

- Page route exists at `/ai-feature`.
- API route exists at `/api/ai/recommend`.
- The current running instance can return:
  - recommendation text
  - `packageLink`
  - `aftercareLinks`
- The implementation requires Gemini configuration for successful recommendations.
- Without a valid Gemini key, the service returns an unavailable response.

Verified example output shape:

```json
{
  "text": "For your tense shoulders...",
  "packageLink": "/package-configurator/neck-shoulder-relief/60/medium/aroma-oil,warm-towel",
  "aftercareLinks": [
    {
      "title": "Heated Neck Wrap",
      "href": "/aftercare-shop#product-heated-neck-wrap"
    }
  ]
}
```

Coverage assessment:

- The AI-to-configurator flow is present.
- The AI-to-aftercare flow is present but less precise than direct product detail links.
- Test plans must distinguish configured AI environments from no-key environments.

### 5. Shopping Cart

Current state:

- Page route exists at `/shopping-cart`.
- API routes support:
  - list cart
  - add item
  - update quantity
  - delete item
  - clear cart
- Cart supports mixed `package` and `aftercare` items.
- Quantities and totals update correctly.
- Cart checkout is a demo review/confirmation flow.

Verified cart linkage:

```text
1. Add Neck & Shoulder Relief package at EUR 92.
2. Add Heated Neck Wrap aftercare product at EUR 34.90.
3. Cart total becomes EUR 126.90.
4. Increase Heated Neck Wrap quantity to 2.
5. Cart total becomes EUR 161.80.
6. Delete package item.
7. Cart total becomes EUR 69.80.
8. Clear cart.
9. Cart total becomes EUR 0.
```

Coverage assessment:

- Cart linkage is strong and testable.
- Checkout must be tested and described as demo review only.

### 6. Visit Context

Current state:

- Page route exists at `/visit-context`.
- API routes exist:
  - `/api/visit-context/locations`
  - `/api/visit-context/weather/current`
  - `/api/visit-context/visit-summary`
- Page displays:
  - center name
  - address
  - opening note
  - arrival tip
  - weather-aware summary
- Google Maps integration depends on a configured maps key.
- Without a maps key, the page falls back to text context.

Verified example:

```text
Serenity Wellness Center
Konrad-Zuse-Strasse 5, 71034 Boeblingen, Germany
Open today for massage appointments from 09:00 to 20:00.
Arrive 10 minutes early and bring comfortable clothing for after your session.
Mild weather is suitable for a calm visit.
```

Coverage assessment:

- Visit preparation is covered as an information page.
- It does not yet match the group project's route planner depth.

## Business Gaps

| Area | Current gap | Business impact | Suggested handling |
|---|---|---|---|
| AI availability | Gemini key is required for success | Demo can fail in unconfigured environments | Add tests for both configured and no-key states |
| AI aftercare links | Recommendations often link to shop anchors | Users may not land on a full detail page | Prefer `/aftercare-shop/:slug` links in a future improvement |
| Visit context | No user-entered route planning | Less interactive than group route planner | Treat current scope as visit preparation, not route planning |
| Checkout | Demo confirmation only | No order/payment claim should be made | Name tests and UI as demo review |
| UI wording | Some cart text remains German | Polish issue for English Wellness Center theme | Track as copy cleanup |

## Suggested Test Scenarios

### Scenario 1: AI Recommendation To Package Configuration

Preconditions:

- App is running at `http://localhost:4100`.
- Gemini key is configured for the successful AI path.

Steps:

1. Open `/ai-feature`.
2. Enter: `My shoulders feel tense and I want a calming after-work session.`
3. Click `Find Package`.
4. Verify recommendation text is displayed.
5. Verify one `packageLink` is present.
6. Verify 1 to 3 aftercare recommendations are present.
7. Click the package recommendation.
8. Verify the configurator opens with the recommended package, duration, intensity, and add-ons.

Expected result:

- AI produces a wellness package recommendation.
- The user can continue from AI into package configuration.

No-key variant:

1. Run the same request without a valid Gemini key.
2. Verify the service returns an unavailable response.
3. Verify the UI shows a friendly failure state rather than silently succeeding.

### Scenario 2: Configure Package And Add To Cart

Steps:

1. Open `/package-configurator`.
2. Select `Neck & Shoulder Relief`.
3. Select `60 min`.
4. Select `Medium`.
5. Select `Aroma Oil`.
6. Verify calculated price is `EUR 92`.
7. Click `Add package`.
8. Open `/shopping-cart`.

Expected result:

- Cart contains one `package` item.
- Item name is `Neck & Shoulder Relief`.
- Item price matches the configurator calculation.

### Scenario 3: Add Aftercare Product To Cart

Steps:

1. Open `/aftercare-shop`.
2. Open `Heated Neck Wrap`.
3. Increase quantity if needed.
4. Click `Add to cart`.
5. Open `/shopping-cart`.

Expected result:

- Cart contains one `aftercare` item.
- Item name is `Heated Neck Wrap`.
- Quantity and total reflect the selected quantity.

### Scenario 4: Cross-Module Cart Updates

Steps:

1. Add one configured package to cart.
2. Add one aftercare product to cart.
3. Open `/shopping-cart`.
4. Increase the aftercare quantity.
5. Delete the package item.
6. Clear the cart.

Expected result:

- Package and aftercare items appear together.
- Quantity changes update totals.
- Deleting the package leaves the aftercare item.
- Clearing the cart leaves no items and total is zero.

### Scenario 5: Visit Preparation

Steps:

1. Open `/visit-context`.
2. Verify the center name is visible.
3. Verify the address is visible.
4. Verify opening note is visible.
5. Verify arrival tip is visible.
6. Verify weather summary is visible.
7. If Google Maps key is configured, verify the map loads.
8. If Google Maps key is not configured, verify text fallback remains usable.

Expected result:

- User can prepare for a center visit.
- Missing maps credentials do not break the page.

### Scenario 6: Demo Cart Review

Steps:

1. Add at least one package or aftercare item to cart.
2. Open `/shopping-cart`.
3. Click the demo review or checkout action.
4. Verify the page states that no payment or order is created.
5. Confirm the demo review.

Expected result:

- Demo confirmation is displayed.
- Cart is cleared after confirmation.
- Test names and assertions must not describe this as real order placement.

## Evidence

Solo project files:

- `services/web-backend/src/server.js`
- `api-gateway/src/server.js`
- `services/package-configurator/src/server.js`
- `services/aftercare-shop/src/server.js`
- `services/ai-feature/src/server.js`
- `services/shopping-cart/src/cartRoutes.js`
- `web/views/package-configurator.ejs`
- `web/views/shopping-cart.ejs`

Group project reference files:

- `D:\CodeSpace\dbe-cloud-groupproject\services\web-shop-backend\src\server.js`
- `D:\CodeSpace\dbe-cloud-groupproject\api-gateway\src\server.js`
- `D:\CodeSpace\dbe-cloud-groupproject\services\car-configurator\src\server.js`
- `D:\CodeSpace\dbe-cloud-groupproject\services\merch-shop\src\server.js`
- `D:\CodeSpace\dbe-cloud-groupproject\services\ai-feature\src\server.js`
- `D:\CodeSpace\dbe-cloud-groupproject\web\views\shopping-cart.ejs`

Runtime observations:

- Group app exposed 2 car models, 7 merchandise products, and 1 destination.
- Solo app exposed 3 wellness packages, 6 aftercare products, and 1 center location.
- Solo package plus aftercare cart linkage was verified through the running API.
- Solo AI recommendation was verified in the currently running configured instance.
