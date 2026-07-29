import { Response } from "express";
import { sendSuccess, sendError } from "../../utils/response";
import { getBankList, resolveAccountNumber } from "../../config/paystack";
import { AuthenticatedRequest } from "../../types";

export const listBanks = async (
    _req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const banks = await getBankList();
        sendSuccess(res, "Banks fetched.", banks);
    } catch (err) {
        console.error("List banks error:", err);
        sendError(res, "Failed to fetch banks.", 500);
    }
};

// FOR PRODUCTION:

// export const verifyAccount = async (
//     req: AuthenticatedRequest,
//     res: Response
//     ): Promise<void> => {
//     try {
//         const { accountNumber, bankCode } = req.body;

//         if (!accountNumber || !bankCode) {
//         sendError(res, "Account number and bank code are required.", 400);
//         return;
//         }

//         const result = await resolveAccountNumber(accountNumber, bankCode);
//         sendSuccess(res, "Account verified.", result);
//     } catch (err) {
//         console.error("Verify account error:", err);
//         sendError(
//         res,
//         "Could not verify this account. Please check the details.",
//         400
//         );
//     }
// };


// FOR TESTING
export const verifyAccount = async (
    req: AuthenticatedRequest,
    res: Response
    ): Promise<void> => {
    try {
        const { accountNumber, bankCode } = req.body;

        if (!accountNumber || !bankCode) {
        sendError(res, "Account number and bank code are required.", 400);
        return;
        }

        // Development mock — bypasses Paystack's daily test limit
        if (process.env.NODE_ENV === "development" && process.env.MOCK_BANK_VERIFY === "true") {
        sendSuccess(res, "Account verified (mock).", {
            accountName: "Ahmed Tajudeen (Test Account)",
            accountNumber,
        });
        return;
        }

        const result = await resolveAccountNumber(accountNumber, bankCode);
        sendSuccess(res, "Account verified.", result);
    } catch (err: any) {
        console.error(
        "Verify account error:",
        err?.response?.data ?? err.message
        );
        sendError(
        res,
        err?.response?.data?.message ??
            "Could not verify this account. Please check the details.",
        400
        );
    }
};