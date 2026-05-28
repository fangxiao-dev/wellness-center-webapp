const express = require("express");
const cartRoutes = require("./cartRoutes");

const app = express();
const port = process.env.PORT || 4106;

app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/cart", cartRoutes);

if (require.main === module) {
  app.listen(port, () => console.log(`shopping-cart listening on port ${port}`));
}

module.exports = app;
