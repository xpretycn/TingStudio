import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getPermissionsByRoleId } from "../services/permissionService.js";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    roleId?: string;
    permissions: string[];
  };
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

interface JwtPayload {
  sub?: string;
  userId?: string;
  username?: string;
  role?: string;
  roleId?: string | null;
  permissions?: string[];
}

function decodeUserFromToken(decoded: JwtPayload): AuthenticatedRequest["user"] {
  return {
    userId: (decoded.userId || decoded.sub || "unknown") as string,
    role: (decoded.role || "user") as string,
    roleId: (decoded.roleId || undefined) as string | undefined,
    permissions: (decoded.permissions || []) as string[],
  };
}

export async function generateToken(payload: { userId: string; username: string; role: string; roleId?: string }): Promise<string> {
  const permissions = payload.role === "admin"
    ? ["*"]
    : payload.roleId
      ? await getPermissionsByRoleId(payload.roleId).catch(() => [] as string[])
      : [];

  return jwt.sign(
    {
      sub: payload.userId,
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      roleId: payload.roleId || null,
      permissions,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export type AuthRequest = AuthenticatedRequest;

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
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decodeUserFromToken(decoded);
    next();
  } catch (error) {
    const code = (error as Record<string, unknown>).name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
    const message = code === "TOKEN_EXPIRED" ? "Token has expired" : "Invalid token";
    res.status(401).json({
      success: false,
      error: { message, code },
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
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      req.user = decodeUserFromToken(decoded);
    } catch {
      // Token invalid but continue anyway
    }
  }

  next();
}
