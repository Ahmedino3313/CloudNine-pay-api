import prisma from "../config/prisma";

export const createAuditLog = async (
    userId: string | null,
    action: string,
    entity: string,
    entityId?: string | null,
    ip?: string | null,
    userAgent?: string | null
    ): Promise<void> => {
    try {
        await prisma.auditLog.create({
        data: {
            userId,
            action,
            entity,
            entityId: entityId ?? null,
            ip: ip ?? null,
            userAgent: userAgent ?? null,
        },
        });
    } catch (err) {
        console.error("Audit log error:", err);
    }
};