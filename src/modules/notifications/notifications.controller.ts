import { Response } from "express";
import prisma from "../../config/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthenticatedRequest } from "../../types";

export const getNotifications = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const notifications = await prisma.notification.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        });

        const unreadCount = notifications.filter((n) => !n.isRead).length;

        sendSuccess(res, "Notifications fetched.", {
        notifications,
        unreadCount,
        });
    } catch {
        sendError(res, "Failed to fetch notifications.", 500);
    }
    };

    export const markAllRead = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        await prisma.notification.updateMany({
        where: { userId: req.user!.userId, isRead: false },
        data: { isRead: true },
        });

        sendSuccess(res, "All notifications marked as read.");
    } catch {
        sendError(res, "Failed to update notifications.", 500);
    }
};

export const markOneRead = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        await prisma.notification.updateMany({
        where: {
            id: req.params.id as string,
            userId: req.user!.userId,
        },
        data: { isRead: true },
        });

        sendSuccess(res, "Notification marked as read.");
    } catch {
        sendError(res, "Failed to update notification.", 500);
    }
};