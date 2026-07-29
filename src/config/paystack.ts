import axios from "axios";

const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY as string;

const paystackApi = axios.create({
    baseURL: PAYSTACK_BASE_URL,
    headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
    },
});

export interface Bank {
    name: string;
    code: string;
    slug: string;
}

// Get list of all Nigerian banks
export const getBankList = async (): Promise<Bank[]> => {
    const { data } = await paystackApi.get("/bank?country=nigeria");
    return data.data.map((bank: any) => ({
        name: bank.name,
        code: bank.code,
        slug: bank.slug,
    }));
};

// Verify account number belongs to the right account name
export const resolveAccountNumber = async (
    accountNumber: string,
    bankCode: string
    ): Promise<{ accountName: string; accountNumber: string }> => {
    const { data } = await paystackApi.get(
        `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
    );
    return {
        accountName: data.data.account_name,
        accountNumber: data.data.account_number,
    };
};

// Create a transfer recipient (required before sending money)
export const createTransferRecipient = async (
    accountName: string,
    accountNumber: string,
    bankCode: string
    ): Promise<string> => {
    const { data } = await paystackApi.post("/transferrecipient", {
        type: "nuban",
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
    });
    return data.data.recipient_code;
};

// Initiate the actual transfer
export const initiateTransfer = async (
    recipientCode: string,
    amount: number,
    reason: string
    ): Promise<{ transferCode: string; status: string }> => {
    const { data } = await paystackApi.post("/transfer", {
        source: "balance",
        amount: amount * 100, // Paystack uses kobo
        recipient: recipientCode,
        reason,
    });
    return {
        transferCode: data.data.transfer_code,
        status: data.data.status,
    };
};