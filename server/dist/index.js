"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
require("./db"); // run migrations on startup
const companies_1 = __importDefault(require("./routes/companies"));
const offers_1 = __importDefault(require("./routes/offers"));
const payments_1 = __importDefault(require("./routes/payments"));
const withdrawals_1 = __importDefault(require("./routes/withdrawals"));
const agent_1 = __importDefault(require("./routes/agent"));
const adminPanel_1 = __importDefault(require("./routes/adminPanel"));
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT ?? "3001", 10);
app.use((0, cors_1.default)({ origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*" }));
app.use(express_1.default.json());
// Serve company web portal
app.use(express_1.default.static(path_1.default.join(__dirname, "../../web")));
// API routes
app.use("/api/companies", companies_1.default);
app.use("/api/offers", offers_1.default);
app.use("/api/payments", payments_1.default);
app.use("/api/withdrawals", withdrawals_1.default);
app.use("/api/agent", agent_1.default);
app.use("/admin", adminPanel_1.default);
// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", version: "1.0.5-admin", timestamp: new Date().toISOString() });
});
// SPA fallback — company portal pages
app.get("*", (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../../web/index.html"));
});
app.listen(PORT, () => {
    console.log(`PISP Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV ?? "development"}`);
});
exports.default = app;
