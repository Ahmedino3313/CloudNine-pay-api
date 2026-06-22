import { Response } from "express";
import prisma from "../../config/prisma";
import { sendSuccess, sendError, paginate, buildPaginationMeta,} from "../../utils/response";
import { AuthenticatedRequest } from "../../types";

export const getAnalytics = async (
    _req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const [
            totalUsers,
            activeUsers,
            totalTransactions,
            successfulConversions,
            pendingWithdrawals,
            totalVolumeResult,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.transaction.count(),
            prisma.airtimeConversion.count({ where: { status: "COMPLETED" } }),
            prisma.withdrawal.count({ where: { status: "PENDING" } }),
            prisma.transaction.aggregate({
                where: { status: "SUCCESS" },
                _sum: { amount: true },
        }),
        ]);

        sendSuccess(res, "Analytics fetched.", {
            totalUsers,
            activeUsers,
            totalTransactions,
            successfulConversions, 
            pendingWithdrawals,
            totalVolume: totalVolumeResult._sum.amount ?? 0,
        });
    } catch {
        sendError(res, "Failed to fetch analytics.", 500);
    }
    };

    export const getAllUsers = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 20);
        const search = req.query.search as string;

        const where: any = {};
        if (search) {
        where.OR = [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
        ];
        }

        const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            include: { wallet: true },
            orderBy: { createdAt: "desc" },
            ...paginate(page, limit),
        }),
        prisma.user.count({ where }),
        ]);

        const safeUsers = users.map((u) => ({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            role: u.role,
            isVerified: u.isVerified,
            isActive: u.isActive,
            walletBalance: u.wallet?.balance ?? 0,
            createdAt: u.createdAt,
        }));

        sendSuccess(
        res,
        "Users fetched.",
        safeUsers,
        200,
        buildPaginationMeta(total, page, limit)
        );
    } catch {
        sendError(res, "Failed to fetch users.", 500);
    }
};

export const toggleUserStatus = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
        where: { id: req.params.id as string },
        });

        if (!user) {
        sendError(res, "User not found.", 404);
        return;
        }

        const updated = await prisma.user.update({
        where: { id: req.params.id as string },
        data: { isActive: !user.isActive },
        });

        sendSuccess(
        res,
        `User ${updated.isActive ? "activated" : "deactivated"} successfully.`,
        { isActive: updated.isActive }
        );
    } catch {
        sendError(res, "Failed to update user.", 500);
    }
};

export const getPendingConversions = async (
    _req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const conversions = await prisma.airtimeConversion.findMany({
        where: { status: { in: ["PENDING", "VERIFYING"] } },
        include: {
            user: {
            select: { fullName: true, email: true, phone: true },
            },
        },
        orderBy: { createdAt: "asc" },
        });

        sendSuccess(res, "Pending conversions fetched.", conversions);
    } catch {
        sendError(res, "Failed to fetch conversions.", 500);
    }
};

export const approveConversion = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const conversion = await prisma.airtimeConversion.findUnique({
        where: { id: req.params.id as string },
        });

        if (!conversion) {
        sendError(res, "Conversion not found.", 404);
        return;
        }

        if (conversion.status === "COMPLETED") {
        sendError(res, "Conversion already completed.", 400);
        return;
        }

        await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
            where: { userId: conversion.userId },
            data: { balance: { increment: conversion.cashValue } },
        });

        await tx.airtimeConversion.update({
            where: { id: req.params.id as string },
            data: { status: "COMPLETED", verifiedAt: new Date() },
        });

        await tx.transaction.create({
            data: {
            userId: conversion.userId,
            type: "AIRTIME_CONVERSION",
            amount: conversion.cashValue,
            status: "SUCCESS",
            reference: `ADMIN-CONV-${(req.params.id as string)
                .substring(0, 8)
                .toUpperCase()}`,
            description: `Admin approved airtime conversion — ${conversion.network}`,
            },
        });

        await tx.notification.create({
            data: {
            userId: conversion.userId,
            title: "Conversion Approved! 💰",
            message: `Your ₦${conversion.airtimeAmount.toLocaleString()} ${conversion.network} conversion has been approved. ₦${conversion.cashValue.toLocaleString()} credited to your wallet.`,
            type: "success",
            },
        });
        });

        sendSuccess(res, "Conversion approved and wallet credited.");
    } catch {
        sendError(res, "Failed to approve conversion.", 500);
    }
};

export const rejectConversion = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const conversion = await prisma.airtimeConversion.findUnique({
        where: { id: req.params.id as string },
        });

        if (!conversion) {
        sendError(res, "Conversion not found.", 404);
        return;
        }

        await prisma.$transaction(async (tx) => {
        await tx.airtimeConversion.update({
            where: { id: req.params.id as string },
            data: { status: "REJECTED" },
        });

        await tx.notification.create({
            data: {
            userId: conversion.userId,
            title: "Conversion Rejected!",
            message: `Your airtime conversion of ₦${conversion.airtimeAmount.toLocaleString()} was rejected. Please contact support.`,
            type: "error",
            },
        });
        });

        sendSuccess(res, "Conversion rejected.");
    } catch {
        sendError(res, "Failed to reject conversion.", 500);
    }
};

export const updateConversionRate = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const { network, rate } = req.body;

        if (rate < 0 || rate > 1) {
        sendError(res, "Rate must be between 0 and 1.", 400);
        return;
        }

        const updated = await prisma.conversionRate.update({
        where: { network },
        data: { rate },
        });

        sendSuccess(res, "Conversion rate updated.", updated);
    } catch {
        sendError(res, "Failed to update rate.", 500);
    }
};