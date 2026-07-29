import { Response } from "express";
import prisma from "../../config/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { debitWallet } from "../wallet/wallet.controller";
import { AuthenticatedRequest, BuyDataDto } from "../../types";

// Data plans per network we'll swap it later
const DATA_PLANS: Record<string, { code: string; name: string; amount: number }[]> = {
    MTN: [
        { code: "mtn-100mb-1day", name: "100MB - 1 Day", amount: 100 },
        { code: "mtn-1gb-1day", name: "1GB - 1 Day", amount: 300 },
        { code: "mtn-2gb-7days", name: "2GB - 7 Days", amount: 500 },
        { code: "mtn-5gb-30days", name: "5GB - 30 Days", amount: 1500 },
        { code: "mtn-10gb-30days", name: "10GB - 30 Days", amount: 2500 },
    ],
    AIRTEL: [
        { code: "airtel-100mb-1day", name: "100MB - 1 Day", amount: 100 },
        { code: "airtel-1gb-1day", name: "1GB - 1 Day", amount: 300 },
        { code: "airtel-2gb-7days", name: "2GB - 7 Days", amount: 500 },
        { code: "airtel-5gb-30days", name: "5GB - 30 Days", amount: 1500 },
        { code: "airtel-10gb-30days", name: "10GB - 30 Days", amount: 2500 },
    ],
    GLO: [
        { code: "glo-100mb-1day", name: "100MB - 1 Day", amount: 100 },
        { code: "glo-1gb-1day", name: "1GB - 1 Day", amount: 300 },
        { code: "glo-2gb-7days", name: "2GB - 7 Days", amount: 500 },
        { code: "glo-5gb-30days", name: "5GB - 30 Days", amount: 1500 },
        { code: "glo-10gb-30days", name: "10GB - 30 Days", amount: 2500 },
    ],
    NINE_MOBILE: [
        { code: "9mobile-100mb-1day", name: "100MB - 1 Day", amount: 100 },
        { code: "9mobile-1gb-1day", name: "1GB - 1 Day", amount: 300 },
        { code: "9mobile-2gb-7days", name: "2GB - 7 Days", amount: 500 },
        { code: "9mobile-5gb-30days", name: "5GB - 30 Days", amount: 1500 },
        { code: "9mobile-10gb-30days", name: "10GB - 30 Days", amount: 2500 },
    ],
};

export const getDataPlans = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const network = req.params.network as string;

        const plans = DATA_PLANS[network.toUpperCase()];

        if (!plans) {
        sendError(res, "Invalid network.", 400);
        return;
        }

        sendSuccess(res, "Data plans fetched.", plans);
    } catch {
        sendError(res, "Failed to fetch data plans.", 500);
    }
};

export const buyData = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const { network, phone, planCode }: BuyDataDto = req.body;
        const userId = req.user!.userId;

        // Find the plan to get name and amount
        const networkPlans = DATA_PLANS[network.toUpperCase()];
        const plan = networkPlans?.find((p) => p.code === planCode);

        if (!plan) {
        sendError(res, "Invalid data plan selected.", 400);
        return;
        }

        // Debit wallet
        const reference = await debitWallet(
        userId,
        plan.amount,
        `Data purchase — ${network} — ${plan.name} — ${phone}`,
        "DATA_PURCHASE"
        );

        // Save data purchase record
        await prisma.dataPurchase.create({
        data: {
            userId,
            network: network as any,
            phone,
            planCode,
            planName: plan.name,
            amount: plan.amount,
            status: "SUCCESS",
            reference,
        },
        });

        // Notify user
        await prisma.notification.create({
        data: {
            userId,
            title: "Data Purchase Successful",
            message: `${plan.name} ${network} data sent to ${phone}`,
            type: "success",
        },
        });

        sendSuccess(res, "Data purchased successfully.", {
            reference,
            network,
            phone,
            plan: plan.name,
            amount: plan.amount,
            status: "SUCCESS",
        });
    } catch (err: any) {
        if (err.message === "Insufficient wallet balance.") {
        sendError(res, err.message, 400);
        return;
        }
        console.error("Buy data error:", err);
        sendError(res, "Data purchase failed. Please try again.", 500);
    }
};

export const getDataHistory = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const purchases = await prisma.dataPurchase.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        });

        sendSuccess(res, "Data history fetched.", purchases);
    } catch {
        sendError(res, "Failed to fetch data history.", 500);
    }
};