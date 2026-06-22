import { Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../config/prisma";
import { sendSuccess, sendError, generateReference } from "../../utils/response";
import { AuthenticatedRequest, WithdrawDto } from "../../types";

export const requestWithdrawal = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const {
            amount,
            bankName,
            accountNumber,
            accountName,
            transactionPin,
        }: WithdrawDto = req.body;

        const userId = req.user!.userId;

        if (amount < 500) {
        sendError(res, "Minimum withdrawal amount is ₦500.", 400);
        return;
        }

        // Get user and check if they have a transaction PIN set
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
        sendError(res, "User not found.", 404);
        return;
        }

        if (user.transactionPin) {
        const pinValid = await bcrypt.compare(
            String(transactionPin),
            user.transactionPin
        );
        if (!pinValid) {
            sendError(res, "Invalid transaction PIN.", 401);
            return;
        }
        }

        // Check wallet balance
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet || wallet.balance < amount) {
        sendError(res, "Insufficient wallet balance.", 400);
        return;
        }

        const reference = generateReference("WD");

        // Debit wallet, create withdrawal and transaction record all at once
        await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
            where: { userId },
            data: { balance: { decrement: amount } },
        });

        await tx.withdrawal.create({
            data: {
            userId,
            amount,
            bankName,
            accountNumber,
            accountName,
            status: "PENDING",
            reference,
            },
        });

        await tx.transaction.create({
            data: {
            userId,
            type: "WITHDRAWAL",
            amount,
            status: "PENDING",
            reference,
            description: `Withdrawal to ${bankName} — ${accountNumber}`,
            },
        });

        await tx.notification.create({
            data: {
            userId,
            title: "Withdrawal Initiated",
            message: `₦${amount.toLocaleString()} withdrawal to ${bankName} is being processed.`,
            type: "info",
            },
        });
        });

        sendSuccess(
        res,
        "Withdrawal initiated. Processing within 30 minutes.",
        {
            reference,
            amount,
            bankName,
            accountNumber,
            accountName,
            status: "PENDING",
        },
        201
        );
    } catch (err) {
        console.error("Withdrawal error:", err);
        sendError(res, "Withdrawal failed. Please try again.", 500);
    }
    };

    export const getWithdrawals = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const withdrawals = await prisma.withdrawal.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        });

        sendSuccess(res, "Withdrawals fetched.", withdrawals);
    } catch {
        sendError(res, "Failed to fetch withdrawals.", 500);
    }
    };

    export const setTransactionPin = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const { pin } = req.body;

        if (!/^\d{4}$/.test(pin)) {
        sendError(res, "PIN must be exactly 4 digits.", 400);
        return;
        }

        const hashed = await bcrypt.hash(pin, 12);

        await prisma.user.update({
        where: { id: req.user!.userId },
        data: { transactionPin: hashed },
        });

        sendSuccess(res, "Transaction PIN set successfully.");
    } catch {
        sendError(res, "Failed to set PIN.", 500);
    }
    };