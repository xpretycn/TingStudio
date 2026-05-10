import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    permissions: string[];
  };
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

export function generateToken(payload: { userId: string; username: string; role: string }): string {
  return jwt.sign(
    {
      sub: payload.userId,
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      permissions: payload.role === "admin" ? ["*"] : [],
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: { message: "Missing or invalid authorization header", code: "UNAUTHORIZED" },
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    req.user = {
      userId: decoded.userId || decoded.sub || "unknown",
      role: decoded.role || "user",
      permissions: decoded.permissions || [],
    };

    next();
  } catch (error) {
    if ((error as any).name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        error: { message: "Token has expired", code: "TOKEN_EXPIRED" },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: { message: "Invalid token", code: "INVALID_TOKEN" },
    });
  }
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Authentication required", code: "UNAUTHORIZED" },
      });
      return;
    }

    if (!req.user.permissions.includes(permission) && req.user.role !== "admin") {
      res.status(403).json({
        success: false,
        error: { message: `Insufficient permissions. Required: ${permission}`, code: "FORBIDDEN" },
      });
      return;
    }

    next();
  };
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        userId: decoded.userId || decoded.sub || "unknown",
        role: decoded.role || "user",
        permissions: decoded.permissions || [],
      };
    } catch {
      // Token invalid but continue anyway
    }
  }

  next();
}
