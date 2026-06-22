import { Response } from "express";
import prisma from "../../config/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthenticatedRequest, InitiateConversionDto } from "../../types";

// The number users send airtime to per network
const TRANSFER_NUMBERS: Record<string, string> = {
    MTN: "09012345678",
    AIRTEL: "09098765432",
    GLO: "09011112222",
    NINE_MOBILE: "09033334444",
};

export const getRates = async (
    _req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const rates = await prisma.conversionRate.findMany({
        where: { isActive: true },
        });

        sendSuccess(res, "Conversion rates fetched.", rates);
    } catch {
        sendError(res, "Failed to fetch rates.", 500);
    }
};

export const initiateConversion = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const { network, airtimeAmount }: InitiateConversionDto = req.body;
        const userId = req.user!.userId;

        if (airtimeAmount < 500) {
        sendError(res, "Minimum airtime conversion is ₦500.", 400);
        return;
        }

        // Get the conversion rate for this network
        const rateRecord = await prisma.conversionRate.findUnique({
        where: { network: network as any },
        });

        if (!rateRecord || !rateRecord.isActive) {
        sendError(res, "Conversion not available for this network.", 400);
        return;
        }

        // Calculate how much cash they will receive
        const cashValue = Math.floor(airtimeAmount * rateRecord.rate);

        // Create a pending conversion record
        const conversion = await prisma.airtimeConversion.create({
        data: {
            userId,
            network: network as any,
            airtimeAmount,
            conversionRate: rateRecord.rate,
            cashValue,
            status: "PENDING",
            transferNumber: TRANSFER_NUMBERS[network],
        },
        });

        // Notify user
        await prisma.notification.create({
        data: {
            userId,
            title: "Conversion Initiated!",
            message: `Transfer ₦${airtimeAmount.toLocaleString()} ${network} airtime to ${TRANSFER_NUMBERS[network]}. You will receive ₦${cashValue.toLocaleString()}.`,
            type: "info",
        },
        });

        sendSuccess(
            res,
            "Conversion initiated. Please transfer airtime now.",
            {
                conversionId: conversion.id,
                network,
                airtimeAmount,
                cashValue,
                rate: rateRecord.rate,
                transferNumber: TRANSFER_NUMBERS[network],
                expiresIn: "10 minutes",
            },
            201
        );
    } catch (err) {
        console.error("Initiate conversion error:", err);
        sendError(res, "Failed to initiate conversion.", 500);
    }
};

export const verifyConversion = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const conversionId = req.params.conversionId as string;
        const userId = req.user!.userId;

        // Find the conversion and make sure it belongs to this user
        const conversion = await prisma.airtimeConversion.findFirst({
        where: { id: conversionId, userId },
        });

        if (!conversion) {
        sendError(res, "Conversion not found.", 404);
        return;
        }

        if (conversion.status !== "PENDING") {
        sendError(
            res,
            `Conversion is already ${conversion.status.toLowerCase()}.`,
            400
        );
        return;
        }

        // Mark as verifying while we check
        await prisma.airtimeConversion.update({
        where: { id: conversionId },
        data: { status: "VERIFYING" },
        });

    // TODO: Call Recharge2Cash API here to verify the transfer
    // For now we simulate a successful verification
    const isVerified = true;

        if (isVerified) {
        // Credit wallet, complete conversion and record transaction all at once
        await prisma.$transaction(async (tx) => {
            await tx.wallet.update({
            where: { userId },
            data: { balance: { increment: conversion.cashValue } },
            });

            await tx.airtimeConversion.update({
            where: { id: conversionId },
            data: { status: "COMPLETED", verifiedAt: new Date() },
            });

            await tx.transaction.create({
            data: {
                userId,
                type: "AIRTIME_CONVERSION",
                amount: conversion.cashValue,
                status: "SUCCESS",
                reference: `CONV-${conversionId.substring(0, 8).toUpperCase()}`,
                description: `Airtime conversion — ${conversion.network} — ₦${conversion.airtimeAmount}`,
                metadata: {
                conversionId,
                airtimeAmount: conversion.airtimeAmount,
                network: conversion.network,
                rate: conversion.conversionRate,
                },
            },
            });

            await tx.notification.create({
            data: {
                userId,
                title: "Conversion Successful!",
                message: `₦${conversion.cashValue.toLocaleString()} has been credited to your wallet.`,
                type: "success",
            },
            });
        });

        sendSuccess(res, "Conversion verified and wallet credited.", {
            conversionId,
            cashValue: conversion.cashValue,
            status: "COMPLETED",
        });
    } else {
        await prisma.airtimeConversion.update({
            where: { id: conversionId },
            data: { status: "FAILED" },
        });

        sendError(
            res,
            "Airtime transfer could not be verified. Please contact support.",
            400
        );
    }
    } catch (err) {
        console.error("Verify conversion error:", err);
        sendError(res, "Verification failed. Please try again.", 500);
    }
};

export const getConversions = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const conversions = await prisma.airtimeConversion.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        });

        sendSuccess(res, "Conversions fetched.", conversions);
    } catch {
        sendError(res, "Failed to fetch conversions.", 500);
    }
};