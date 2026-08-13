import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../config/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthenticatedRequest, RegisterDto } from "../../types";
import { sendEmail, otpEmailTemplate } from "../../config/email";
import { createAuditLog } from "../../middleware/audit.middleware";
import { sendSmsOtp } from "../../config/termii";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
} as const;

const setTokenCookies = (res: Response, accessToken: string, refreshToken: string) => {
    res.cookie("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

const clearTokenCookies = (res: Response) => {
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fullName, email, phone, password }: RegisterDto = req.body;

        // Check if user already exists
        const existing = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] },
        });

        if (existing) {
        sendError(res, "Email or phone number already registered.", 409);
        return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(
        password,
        Number(process.env.BCRYPT_SALT_ROUNDS ?? 12)
        );

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create user — not verified yet
        const user = await prisma.user.create({
            data: {
                fullName,
                email,
                phone,
                password: hashedPassword,
                isVerified: false,
                emailOtp: otp,
                emailOtpExpiry: otpExpiry,
            },
        });

        // Auto create wallet
        await prisma.wallet.create({ data: { userId: user.id } });

        // Send OTP email
        try {
            await sendEmail(
                user.email,
                "Verify your CloudNine Pay account",
                otpEmailTemplate(user.fullName, otp)
            );
        } catch (emailErr) {
                console.error("OTP email failed:", emailErr);
        }

        // Send OTP SMS
        try {
            await sendSmsOtp(user.phone, otp);
        } catch (smsErr) {
            console.error("OTP SMS failed:", smsErr);
            // Don't fail registration if SMS fails
        }

        // Log the registration
        await createAuditLog(
            user.id,
            "REGISTER",
            "User",
            user.id,
            req.ip,
            req.headers["user-agent"]
        );

        // Send back userId only — no tokens yet
        // Tokens are issued after OTP verification
        sendSuccess(
        res,
        "Account created. Please check your email for the verification code.",
        { userId: user.id, email: user.email },
        201
        );
    } catch (err) {
        console.error("Register error:", err);
        sendError(res, "Registration failed. Please try again.", 500);
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { emailOrPhone, password } = req.body;

        // Find user by email or phone
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                { email: emailOrPhone },
                { phone: emailOrPhone },
                ],
            },
        });

// Temporary debug log
// console.log("Login attempt:", emailOrPhone);
// console.log("User found:", user ? "yes" : "no");
// console.log("User active:", user?.isActive);
// console.log("User verified:", user?.isVerified);

        if (!user || !user.isActive) {
            sendError(res, "Invalid email/phone or password.", 401);
            return;
        }

        if (!user.isVerified) {
            res.status(403).json({
                success: false,
                message: "Please verify your email first. Check your inbox for the verification code.",
                data: {
                    userId: user.id,
                    email: user.email,
                    isVerified: false,
                },
            });
            return;
        }

        // Check password
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
        sendError(res, "Invalid email/phone or password.", 401);
        return;
        }

        // Sign tokens
        const tokenPayload = { userId: user.id, email: user.email, role: user.role };
        const accessToken = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken(tokenPayload);

        // Save refresh token
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken },
        });

        // Get wallet balance
        const wallet = await prisma.wallet.findUnique({
        where: { userId: user.id },
        });

        // Set cookies for web
        setTokenCookies(res, accessToken, refreshToken);

        // Log the login
        await createAuditLog(
            user.id,
            "LOGIN",
            "User",
            user.id,
            req.ip,
            req.headers["user-agent"]
        );

        // Also send in response body for mobile
        sendSuccess(res, "Login successful.", {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isVerified: user.isVerified,
                walletBalance: wallet?.balance ?? 0,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        sendError(res, "Login failed. Please try again.", 500);
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check cookie first (web) then body (mobile)
        const token = req.cookies?.refreshToken ?? req.body.refreshToken;

        if (!token) {
        sendError(res, "Refresh token required.", 400);
        return;
        }

        const decoded = verifyRefreshToken(token);
        const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        });

        if (!user || user.refreshToken !== token) {
        sendError(res, "Invalid refresh token.", 401);
        return;
        }

        const tokenPayload = { userId: user.id, email: user.email, role: user.role };
        const accessToken = signAccessToken(tokenPayload);
        const newRefreshToken = signRefreshToken(tokenPayload);

        await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken },
        });

        // Set cookies for web
        setTokenCookies(res, accessToken, newRefreshToken);

        // Also send in response body for mobile
        sendSuccess(res, "Token refreshed.", {
        accessToken,
        refreshToken: newRefreshToken,
        });
    } catch {
        sendError(res, "Invalid or expired refresh token.", 401);
    }
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        await prisma.user.update({
        where: { id: req.user!.userId },
        data: { refreshToken: null },
        });

        // Clear cookies for web
        clearTokenCookies(res);

        sendSuccess(res, "Logged out successfully.");
    } catch {
        sendError(res, "Logout failed.", 500);
    }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            include: { wallet: true },
        });

        if (!user) {
            sendError(res, "User not found.", 404);
            return;
        }

    sendSuccess(res, "Profile fetched.", {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        walletBalance: user.wallet?.balance ?? 0,
        createdAt: user.createdAt,
    });
    } catch {
        sendError(res, "Failed to fetch profile.", 500);
    }
};