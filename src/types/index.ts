import { Request } from "express";

// Auth
export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}

// API Response 
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    meta?: PaginationMeta;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Auth DTOs 
export interface RegisterDto {
    fullName: string;
    email: string;
    phone: string;
    password: string;
}

export interface LoginDto {
    emailOrPhone: string;
    password: string;
}

// Airtime 
export interface BuyAirtimeDto {
    network: "MTN" | "AIRTEL" | "GLO" | "NINE_MOBILE";
    phone: string;
    amount: number;
}

// Data 
export interface BuyDataDto {
    network: "MTN" | "AIRTEL" | "GLO" | "NINE_MOBILE";
    phone: string;
    planCode: string;
}

// Conversion
export interface InitiateConversionDto {
    network: "MTN" | "AIRTEL" | "GLO" | "NINE_MOBILE";
    airtimeAmount: number;
}

// Withdrawal 
export interface WithdrawDto {
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
    transactionPin: string;
}

// Transactions 
export interface TransactionFilter {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}