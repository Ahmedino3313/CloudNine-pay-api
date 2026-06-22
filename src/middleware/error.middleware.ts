import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (
    err: AppError | Error,
    _req: Request,
    res: Response,
    _next: NextFunction
    ): void => {
    const statusCode = (err as AppError).statusCode ?? 500;
    const message = (err as AppError).isOperational
        ? err.message
        : "Something went wrong. Please try again.";

    if (process.env.NODE_ENV === "development") {
        console.error("❌ Error:", err);
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
};

export const notFound = (_req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
};