import { Response } from "express";
import prisma from "../../config/prisma";
import { sendSuccess, sendError, paginate, buildPaginationMeta,} from "../../utils/response";
import { AuthenticatedRequest, TransactionFilter } from "../../types";

export const getTransactions = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const {
            page = 1,
            limit = 10,
            type,
            status,
            startDate,
            endDate,
        } = req.query as unknown as TransactionFilter;

        // Build filters dynamically
        const where: any = { userId: req.user!.userId };

        if (type) where.type = type;
        if (status) where.status = status;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { createdAt: "desc" },
                ...paginate(Number(page), Number(limit)),
            }),
            prisma.transaction.count({ where }),
        ]);

        sendSuccess(
            res,
            "Transactions fetched.",
            transactions,
            200,
            buildPaginationMeta(total, Number(page), Number(limit))
        );
    } catch {
        sendError(res, "Failed to fetch transactions.", 500);
    }
    };

    export const getTransactionById = async (
        req: AuthenticatedRequest,
        res: Response
        ): Promise<void> => {
        try {
            const txn = await prisma.transaction.findFirst({
            where: {
                id: req.params.id as string,
                userId: req.user!.userId,
            },
            });

            if (!txn) {
            sendError(res, "Transaction not found.", 404);
            return;
            }

            sendSuccess(res, "Transaction fetched.", txn);
        } catch {
            sendError(res, "Failed to fetch transaction.", 500);
    }
};