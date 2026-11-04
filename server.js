const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { config, check } = require("./src/config");

const problems = check();
if (problems.length) {
  console.error("\nThe server did not start. Please fix your .env file:\n - " + problems.join("\n - ") + "\n");
  process.exit(1);
}

require("./src/db");
const app = express();
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 0);
app.disable("x-powered-by");

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cookieParser());
app.use(express.json({ limit: "50kb", verify: (req, res, buf) => { req.rawBody = buf; } }));

app.use("/api", (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
app.use("/api", require("./src/routes/public"));
app.use("/api", require("./src/routes/payments"));
app.use("/api/admin", require("./src/routes/admin"));
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"], maxAge: config.isProd ? "1h" : 0 }));
app.get("/healthz", (req, res) => res.json({ ok: true }));

// Errors: validation problems are shown to the visitor, everything else is logged and hidden.
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") return res.status(400).json({ error: "Bad request." });
  if (err && err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side. Please try again." });
});

app.listen(config.port, () => {
  console.log(`AMBI TECH is running at http://localhost:${config.port}`);
  console.log(`Admin dashboard: http://localhost:${config.port}/admin/`);
});
