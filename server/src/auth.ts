import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const SECRET = process.env.JWT_SECRET ?? "pisp-dev-secret-change-in-production";

export function signToken(payload: { companyId: string; email: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { companyId: string; email: string } {
  return jwt.verify(token, SECRET) as { companyId: string; email: string };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Yetkisiz erişim" });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    (req as Request & { company: typeof payload }).company = payload;
    next();
  } catch {
    res.status(401).json({ error: "Geçersiz oturum" });
  }
}
