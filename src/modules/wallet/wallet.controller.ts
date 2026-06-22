import { Response } from "express";
import prisma from "../../config/prisma";
import { sendSuccess, sendError, generateReference } from "../../utils/response";
import { createVirtualAccount } from "../../config/monnify";
import { AuthenticatedRequest } from "../../types";

export const getWallet = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: { wallet: true },
        });

        if (!user) {
        sendError(res, "User not found.", 404);
        return;
        }

        sendSuccess(res, "Wallet fetched.", {
        balance: user.wallet?.balance ?? 0,
        currency: user.wallet?.currency ?? "NGN",
        virtualAccount: {
            accountNumber: user.virtualAccountNumber ?? null,
            bankName: user.virtualAccountBank ?? null,
        },
        });
    } catch {
        sendError(res, "Failed to fetch wallet.", 500);
    }
};

export const getVirtualAccount = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        });

        if (!user) {
        sendError(res, "User not found.", 404);
        return;
        }

        // If user already has a virtual account return it
        if (user.virtualAccountNumber) {
        sendSuccess(res, "Virtual account fetched.", {
            accountNumber: user.virtualAccountNumber,
            bankName: user.virtualAccountBank,
            accountName: user.fullName,
        });
        return;
        }

        // Otherwise create one for them on Monnify
        const { accountNumber, bankName, accountRef } =
        await createVirtualAccount(
            user.email,
            user.fullName,
            user.id
        );

        // Save to database
        await prisma.user.update({
        where: { id: user.id },
        data: {
            virtualAccountNumber: accountNumber,
            virtualAccountBank: bankName,
            virtualAccountRef: accountRef,
        },
        });

        sendSuccess(res, "Virtual account created.", {
        accountNumber,
        bankName,
        accountName: user.fullName,
        });
    } catch (err) {
        console.error("Virtual account error:", err);
        sendError(res, "Failed to create virtual account.", 500);
    }
};

// Used internally by other modules to add money to wallet
export const creditWallet = async (
    userId: string,
    amount: number,
    description: string
    ): Promise<void> => {
    await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: amount } },
        });

        await tx.transaction.create({
        data: {
            userId,
            type: "WALLET_FUNDING",
            amount,
            status: "SUCCESS",
            reference: generateReference("FUND"),
            description,
        },
        });
    });
};

// Used internally by other modules to remove money from wallet
export const debitWallet = async (
    userId: string,
    amount: number,
    description: string,
    type: "AIRTIME_PURCHASE" | "DATA_PURCHASE" | "WITHDRAWAL" | "AIRTIME_CONVERSION"
    ): Promise<string> => {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });

    if (!wallet || wallet.balance < amount) {
        throw new Error("Insufficient wallet balance.");
    }

    const reference = generateReference("C9");

    await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: amount } },
        });

        await tx.transaction.create({
        data: {
            userId,
            type,
            amount,
            status: "SUCCESS",
            reference,
            description,
        },
        });
    });

    return reference;
};