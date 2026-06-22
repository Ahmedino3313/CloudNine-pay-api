import { Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../config/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthenticatedRequest } from "../../types";

export const getProfile = async (
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

        sendSuccess(res, "Profile fetched.", {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified,
            isActive: user.isActive,
            walletBalance: user.wallet?.balance ?? 0,
            createdAt: user.createdAt,
        });
    } catch {
        sendError(res, "Failed to fetch profile.", 500);
    }
};

export const updateProfile = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const { fullName, phone } = req.body;

        // Check if phone is already taken by another user
        if (phone) {
        const existing = await prisma.user.findFirst({
            where: {
            phone,
            NOT: { id: req.user!.userId },
            },
        });

        if (existing) {
            sendError(res, "Phone number already in use.", 409);
            return;
        }
        }

        const updated = await prisma.user.update({
        where: { id: req.user!.userId },
        data: {
            ...(fullName && { fullName }),
            ...(phone && { phone }),
        },
        });

        sendSuccess(res, "Profile updated successfully.", {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        });
    } catch {
        sendError(res, "Failed to update profile.", 500);
    }
};

export const changePassword = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        });

        if (!user) {
        sendError(res, "User not found.", 404);
        return;
        }

        // Verify current password
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
        sendError(res, "Current password is incorrect.", 401);
        return;
        }

        // Hash new password
        const hashed = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
        where: { id: req.user!.userId },
        data: { password: hashed },
        });

        sendSuccess(res, "Password changed successfully.");
    } catch {
        sendError(res, "Failed to change password.", 500);
    }
};

export const deleteAccount = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const { password } = req.body;

        const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        });

        if (!user) {
        sendError(res, "User not found.", 404);
        return;
        }

        // Verify password before deleting
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
        sendError(res, "Incorrect password.", 401);
        return;
        }

        await prisma.user.delete({
        where: { id: req.user!.userId },
        });

        sendSuccess(res, "Account deleted successfully.");
    } catch {
        sendError(res, "Failed to delete account.", 500);
    }
};