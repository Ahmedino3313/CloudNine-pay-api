import { Response } from "express";
import prisma from "../../config/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { debitWallet } from "../wallet/wallet.controller";
import { AuthenticatedRequest, BuyAirtimeDto } from "../../types";

export const buyAirtime = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const { network, phone, amount }: BuyAirtimeDto = req.body;
        const userId = req.user!.userId;

        if (amount < 50) {
        sendError(res, "Minimum airtime purchase is ₦50.", 400);
        return;
        }

        // Debit wallet — throws if balance is insufficient
        const reference = await debitWallet(
        userId,
        amount,
        `Airtime purchase — ${network} — ${phone}`,
        "AIRTIME_PURCHASE"
        );

        // Save airtime purchase record
        await prisma.airtimePurchase.create({
            data: {
                userId,
                network: network as any,
                phone,
                amount,
                status: "SUCCESS",
                reference,
            },
        });

        // Notify user
        await prisma.notification.create({
            data: {
                userId,
                title: "Airtime Purchase Successful",
                message: `₦${amount.toLocaleString()} ${network} airtime sent to ${phone}`,
                type: "success",
            },
        });

        sendSuccess(res, "Airtime purchased successfully.", {
            reference,
            network,
            phone,
            amount,
            status: "SUCCESS",
        });
    } catch (err: any) {
        if (err.message === "Insufficient wallet balance.") {
        sendError(res, err.message, 400);
        return;
        }
        console.error("Buy airtime error:", err);
        sendError(res, "Airtime purchase failed. Please try again.", 500);
    }
};

export const getAirtimeHistory = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const purchases = await prisma.airtimePurchase.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        });

        sendSuccess(res, "Airtime history fetched.", purchases);
    } catch {
        sendError(res, "Failed to fetch airtime history.", 500);
    }
};