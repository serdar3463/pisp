"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET = process.env.JWT_SECRET ?? "pisp-dev-secret-change-in-production";
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, SECRET, { expiresIn: "30d" });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, SECRET);
}
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Yetkisiz erişim" });
        return;
    }
    try {
        const payload = verifyToken(header.slice(7));
        req.company = payload;
        next();
    }
    catch {
        res.status(401).json({ error: "Geçersiz oturum" });
    }
}
