import express from "express";
import cors from "cors";
import path from "path";
import "./db"; // run migrations on startup

import companiesRouter from "./routes/companies";
import offersRouter from "./routes/offers";
import paymentsRouter from "./routes/payments";
import withdrawalsRouter from "./routes/withdrawals";
import agentRouter from "./routes/agent";
import adminRouter from "./routes/adminPanel";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*" }));
app.use(express.json());

// Serve company web portal
app.use(express.static(path.join(__dirname, "../../web")));

// API routes
app.use("/api/companies", companiesRouter);
app.use("/api/offers", offersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/withdrawals", withdrawalsRouter);
app.use("/api/agent", agentRouter);
app.use("/admin", adminRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() });
});

// SPA fallback — company portal pages
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../web/index.html"));
});

app.listen(PORT, () => {
  console.log(`PISP Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV ?? "development"}`);
});

export default app;
