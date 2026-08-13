import { Request, Response } from "express";
import prisma from "../../config/prisma";
import { signAccessToken, signRefreshToken } from "../../utils/jwt";
import { sendSuccess, sendError } from "../../utils/response";
import { sendEmail, welcomeEmailTemplate } from "../../config/email";

export const verifyEmailOtp = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            sendError(res, "User ID and OTP are required.", 400);
            return;
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            sendError(res, "User not found.", 404);
            return;
        }

        if (user.isVerified) {
            sendError(res, "Account is already verified.", 400);
            return;
        }

        // Check OTP
        if (user.emailOtp !== otp) {
            sendError(res, "Invalid verification code.", 400);
            return;
        }

        // Check OTP expiry
        if (!user.emailOtpExpiry || user.emailOtpExpiry < new Date()) {
            sendError(
                res,
                "Verification code has expired. Please request a new one.",
                400
            );
            return;
        }

        // Mark as verified and clear OTP
        await prisma.user.update({
        where: { id: userId },
        data: {
            isVerified: true,
            emailOtp: null,
            emailOtpExpiry: null,
        },
        });

        // Create welcome notification
        await prisma.notification.create({
        data: {
            userId: user.id,
            title: "Welcome to CloudNine Pay!",
            message:
            "Your account is verified. Start by converting airtime to cash!",
            type: "success",
        },
        });

        // Send welcome email
        try {
        await sendEmail(
            user.email,
            "Welcome to CloudNine Pay! 🎉",
            welcomeEmailTemplate(user.fullName)
        );
        } catch (emailErr) {
        console.error("Welcome email failed:", emailErr);
        }

        // Now issue tokens
        const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        };
        const accessToken = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken(tokenPayload);

        await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
        });

        const wallet = await prisma.wallet.findUnique({
        where: { userId: user.id },
        });

        sendSuccess(res, "Email verified successfully! Welcome to CloudNine Pay.", {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: true,
            hasPin: false,
            walletBalance: wallet?.balance ?? 0,
        },
        });
    } catch (err) {
        console.error("Verify OTP error:", err);
        sendError(res, "Verification failed. Please try again.", 500);
    }
    };

    export const resendOtp = async (
    req: Request,
    res: Response
    ): Promise<void> => {
    try {
        const { userId } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            sendError(res, "User not found.", 404);
            return;
        }

        if (user.isVerified) {
            sendError(res, "Account is already verified.", 400);
            return;
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
        where: { id: userId },
        data: { emailOtp: otp, emailOtpExpiry: otpExpiry },
        });

        // Resend OTP email
        try {
        const { otpEmailTemplate } = await import("../../config/email");
        await sendEmail(
            user.email,
            "Your new CloudNine Pay verification code",
            otpEmailTemplate(user.fullName, otp)
        );
        } catch (emailErr) {
        console.error("Resend OTP email failed:", emailErr);
        }

        sendSuccess(res, "New verification code sent to your email.");
    } catch (err) {
        console.error("Resend OTP error:", err);
        sendError(res, "Failed to resend code. Please try again.", 500);
    }
};