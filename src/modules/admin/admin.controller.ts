import { Response } from "express";
import prisma from "../../config/prisma";
import { sendSuccess, sendError, paginate, buildPaginationMeta,} from "../../utils/response";
import { AuthenticatedRequest } from "../../types";
import axios from "axios";
import { createAuditLog } from "../../middleware/audit.middleware";

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

        await createAuditLog(
            req.user!.userId,
            updated.isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
            "User",
            req.params.id as string,
            req.ip,
            req.headers["user-agent"] as string
        );

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
                title: "Conversion Approved!",
                message: `Your ₦${conversion.airtimeAmount.toLocaleString()} ${conversion.network} conversion has been approved. ₦${conversion.cashValue.toLocaleString()} credited to your wallet.`,
                type: "success",
                },
        });

        await createAuditLog(
            req.user!.userId,
            "APPROVE_CONVERSION",
            "AirtimeConversion",
            req.params.id as string,
            req.ip,
            req.headers["user-agent"] as string
        );
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

            await createAuditLog(
                req.user!.userId,
                "REJECT_CONVERSION",
                "AirtimeConversion",
                req.params.id as string,
                req.ip,
                req.headers["user-agent"] as string
            );
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

        await createAuditLog(
            req.user!.userId,
            "UPDATE_CONVERSION_RATE",
            "ConversionRate",
            network,
            req.ip,
            req.headers["user-agent"] as string
        );

        sendSuccess(res, "Conversion rate updated.", updated);
    } catch {
        sendError(res, "Failed to update rate.", 500);
    }
};
// revenue analytics
export const getRevenueAnalytics = async (
    _req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
    const now = new Date();

    // Start of today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Start of this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Last 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
        revenueToday,
        revenueThisMonth,
        revenueByType,
        dailyRevenue,
        newUsersToday,
        newUsersThisMonth,
        totalWalletBalance,
    ] = await Promise.all([
      // Revenue today
        prisma.transaction.aggregate({
            where: {
            status: "SUCCESS",
            createdAt: { gte: todayStart },
            type: { in: ["AIRTIME_PURCHASE", "DATA_PURCHASE", "WITHDRAWAL"] },
            },
            _sum: { amount: true },
        }),

        // Revenue this month
        prisma.transaction.aggregate({
            where: {
            status: "SUCCESS",
            createdAt: { gte: monthStart },
            type: { in: ["AIRTIME_PURCHASE", "DATA_PURCHASE", "WITHDRAWAL"] },
            },
            _sum: { amount: true },
        }),

      // Revenue by transaction type
        prisma.transaction.groupBy({
            by: ["type"],
            where: {
            status: "SUCCESS",
            createdAt: { gte: monthStart },
            },
            _sum: { amount: true },
            _count: true,
        }),

        // Daily revenue for last 30 days
        prisma.transaction.findMany({
            where: {
            status: "SUCCESS",
            createdAt: { gte: thirtyDaysAgo },
            type: { in: ["AIRTIME_PURCHASE", "DATA_PURCHASE", "WITHDRAWAL"] },
            },
            select: { amount: true, createdAt: true },
            orderBy: { createdAt: "asc" },
        }),

        // New users today
        prisma.user.count({
            where: { createdAt: { gte: todayStart } },
        }),

        // New users this month
        prisma.user.count({
            where: { createdAt: { gte: monthStart } },
        }),

        // Total wallet balance across all users
        prisma.wallet.aggregate({
            _sum: { balance: true },
        }),
        ]);

    // Group daily revenue by date
        const dailyMap: Record<string, number> = {};
        dailyRevenue.forEach((txn) => {
        const date = txn.createdAt.toISOString().split("T")[0];
        dailyMap[date] = (dailyMap[date] ?? 0) + txn.amount;
        });

        // Fill in missing days with 0
        const dailyData = [];
        for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        dailyData.push({
            date: dateStr,
            revenue: dailyMap[dateStr] ?? 0,
        });
        }

        sendSuccess(res, "Revenue analytics fetched.", {
        revenueToday: revenueToday._sum.amount ?? 0,
        revenueThisMonth: revenueThisMonth._sum.amount ?? 0,
        revenueByType,
        dailyRevenue: dailyData,
        newUsersToday,
        newUsersThisMonth,
        totalWalletBalance: totalWalletBalance._sum.balance ?? 0,
        });
    } catch (err) {
        console.error("Revenue analytics error:", err);
        sendError(res, "Failed to fetch revenue analytics.", 500);
    }
};

export const getAppHealth = async (
    _req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const checks = await Promise.allSettled([
        // Check database
        prisma.$queryRaw`SELECT 1`,

        // Check Paystack
        axios.get("https://api.paystack.co/bank?country=nigeria&perPage=1", {
            headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
            timeout: 5000,
        }),

        // Check Monnify
        axios.get(`${process.env.MONNIFY_BASE_URL}/api/v1/auth/login`, {
            timeout: 5000,
        }),
        ]);

        const [dbCheck, paystackCheck, monnifyCheck] = checks;

        sendSuccess(res, "App health fetched.", {
        status: "operational",
        timestamp: new Date().toISOString(),
        services: {
            database: {
            name: "Neon PostgreSQL",
            status: dbCheck.status === "fulfilled" ? "operational" : "down",
            },
            paystack: {
            name: "Paystack",
            status:
                paystackCheck.status === "fulfilled" ? "operational" : "down",
            },
            monnify: {
            name: "Monnify",
            status:
                monnifyCheck.status === "fulfilled" ? "operational" : "down",
            },
        },
        });
    } catch (err) {
        console.error("Health check error:", err);
        sendError(res, "Failed to fetch app health.", 500);
    }
};

export const getAllWithdrawals = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 20);
        const status = req.query.status as string;

        const where: any = {};
        if (status) where.status = status;

        const [withdrawals, total] = await Promise.all([
        prisma.withdrawal.findMany({
            where,
            include: {
            user: {
                select: { fullName: true, email: true, phone: true },
            },
            },
            orderBy: { createdAt: "desc" },
            ...paginate(page, limit),
        }),
        prisma.withdrawal.count({ where }),
        ]);

        sendSuccess(
            res,
            "Withdrawals fetched.",
            withdrawals,
            200,
            buildPaginationMeta(total, page, limit)
        );
    } catch {
        sendError(res, "Failed to fetch withdrawals.", 500);
    }
};

export const updateWithdrawalStatus = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: id as string },
        });

        if (!withdrawal) {
        sendError(res, "Withdrawal not found.", 404);
        return;
        }

        await prisma.$transaction(async (tx) => {
            await tx.withdrawal.update({
                where: { id: id as string },
                data: { status, processedAt: new Date() },
            });

            // Update the transaction record too
            await tx.transaction.updateMany({
                where: { reference: withdrawal.reference },
                data: {
                status: status === "COMPLETED" ? "SUCCESS" : "FAILED",
                },
            });

            // If failed refund the wallet
            if (status === "FAILED") {
                await tx.wallet.update({
                where: { userId: withdrawal.userId },
                data: { balance: { increment: withdrawal.amount } },
                });

                await tx.notification.create({
                data: {
                    userId: withdrawal.userId,
                    title: "Withdrawal Failed ❌",
                    message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} failed. Your wallet has been refunded.`,
                    type: "error",
                },
                });
            }

            if (status === "COMPLETED") {
                await tx.notification.create({
                data: {
                    userId: withdrawal.userId,
                    title: "Withdrawal Successful",
                    message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} to ${withdrawal.bankName} has been processed.`,
                    type: "success",
                },
                });
            }

            await createAuditLog(
                req.user!.userId,
                `WITHDRAWAL_${status.toUpperCase()}`,
                "Withdrawal",
                req.params.id as string,
                req.ip,
                req.headers["user-agent"] as string
            );
        });

    sendSuccess(res, `Withdrawal marked as ${status}.`);
    } catch {
        sendError(res, "Failed to update withdrawal.", 500);
    }
};

export const getAuditLogs = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 20);

        const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            include: {
            user: {
                select: { fullName: true, email: true },
            },
            },
            orderBy: { createdAt: "desc" },
            ...paginate(page, limit),
        }),
        prisma.auditLog.count(),
        ]);

        sendSuccess(
        res,
        "Audit logs fetched.",
        logs,
        200,
        buildPaginationMeta(total, page, limit)
        );
    } catch {
        sendError(res, "Failed to fetch audit logs.", 500);
    }
};