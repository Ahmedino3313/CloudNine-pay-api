import { Response } from "express";
import { ApiResponse, PaginationMeta } from "../types";

export const sendSuccess = <T>(
    res: Response,
    message: string,
    data?: T,
    statusCode = 200,
    meta?: PaginationMeta
): Response => {
    const response: ApiResponse<T> = { success: true, message, data, meta };
    return res.status(statusCode).json(response);
};

export const sendError = (
    res: Response,
    message: string,
    statusCode = 400
): Response => {
    const response: ApiResponse = { success: false, message };
    return res.status(statusCode).json(response);
};

export const generateReference = (prefix = "C9"): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
};

export const paginate = (page = 1, limit = 10) => ({
    skip: (page - 1) * limit,
    take: limit,
});

export const buildPaginationMeta = (
    total: number,
    page: number,
    limit: number
): PaginationMeta => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
});