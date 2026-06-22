import { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../../config/prisma";
import { verifyMonnifyTransaction } from "../../config/monnify";

export const monnifyWebhook = async (
    req: Request,
    res: Response
    ): Promise<void> => {
    try {
        // Step 1 — Verify the webhook is genuinely from Monnify
        const monnifySignature = req.headers["monnify-signature"] as string;
        const computedHash = crypto
        .createHmac("sha512", process.env.MONNIFY_SECRET_KEY as string)
        .update(JSON.stringify(req.body))
        .digest("hex");

        if (monnifySignature !== computedHash) {
        res.status(401).json({ success: false, message: "Invalid signature." });
        return;
        }

        const { transactionReference, paymentStatus } = req.body;

        // Step 2 — Only process paid transactions
        if (paymentStatus !== "PAID") {
        res.status(200).json({ success: true, message: "Event ignored." });
        return;
        }

        // Step 3 — Verify transaction with Monnify API
        const { isValid, amount, customerEmail } =
        await verifyMonnifyTransaction(transactionReference);

        if (!isValid) {
        res.status(400).json({ success: false, message: "Transaction not valid." });
        return;
        }

        // Step 4 — Check transaction has not been processed before
        const existing = await prisma.transaction.findUnique({
        where: { reference: transactionReference },
        });

        if (existing) {
        res.status(200).json({ success: true, message: "Already processed." });
        return;
        }

        // Step 5 — Find user by email
        const user = await prisma.user.findUnique({
        where: { email: customerEmail },
        });

        if (!user) {
        res.status(404).json({ success: false, message: "User not found." });
        return;
        }

        // Step 6 — Credit wallet and record transaction
        await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
            where: { userId: user.id },
            data: { balance: { increment: amount } },
        });

        await tx.transaction.create({
            data: {
            userId: user.id,
            type: "WALLET_FUNDING",
            amount,
            status: "SUCCESS",
            reference: transactionReference,
            description: `Wallet funded via virtual account transfer`,
            },
        });

        await tx.notification.create({
            data: {
            userId: user.id,
            title: "Wallet Funded",
            message: `₦${amount.toLocaleString()} has been added to your wallet.`,
            type: "success",
            },
        });
        });

        // Step 7 — Tell Monnify we received the webhook
        res.status(200).json({ success: true, message: "Webhook processed." });
    } catch (err) {
        console.error("Monnify webhook error:", err);
        res.status(500).json({ success: false, message: "Webhook processing failed." });
    }
};