import { Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { sendError } from "../utils/response";
import { AuthenticatedRequest } from "../types";

export const protect = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
    ): void => {
    try {
        let token: string | undefined;

        // Check Authorization header first (mobile)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
        }

        // If no Bearer token check cookies (web)
        if (!token && req.cookies?.accessToken) {
        token = req.cookies.accessToken;
        }

        if (!token) {
        sendError(res, "No token provided. Please log in.", 401);
        return;
        }

        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch {
        sendError(res, "Invalid or expired token. Please log in again.", 401);
    }
};

export const requireRole = (...roles: string[]) => {
    return (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): void => {
        if (!req.user) {
        sendError(res, "Unauthorized.", 401);
        return;
        }

        if (!roles.includes(req.user.role)) {
        sendError(
            res,
            "You do not have permission to access this resource.",
            403
        );
        return;
        }

        next();
    };
};