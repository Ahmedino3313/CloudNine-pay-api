import axios from "axios";

const MONNIFY_BASE_URL = process.env.MONNIFY_BASE_URL ?? "https://sandbox.monnify.com";
const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY as string;
const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY as string;
const MONNIFY_CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE as string;

// Get Monnify access token
const getAccessToken = async (): Promise<string> => {
    const credentials = Buffer.from(
        `${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`
    ).toString("base64");

    const { data } = await axios.post(
        `${MONNIFY_BASE_URL}/api/v1/auth/login`,
        {},
        {
        headers: {
            Authorization: `Basic ${credentials}`,
        },
        }
    );

    return data.responseBody.accessToken;
};

// Create a virtual account for a user
export const createVirtualAccount = async (
    email: string,
    fullName: string,
    userId: string
    ): Promise<{
    accountNumber: string;
    bankName: string;
    accountRef: string;
    }> => {
    const token = await getAccessToken();

    const { data } = await axios.post(
        `${MONNIFY_BASE_URL}/api/v2/bank-transfer/reserved-accounts`,
        {
        accountReference: userId,
        accountName: fullName,
        currencyCode: "NGN",
        contractCode: MONNIFY_CONTRACT_CODE,
        customerEmail: email,
        customerName: fullName,
        getAllAvailableBanks: false,
        preferredBanks: ["035"], // Wema Bank (ALAT)
        },
        {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        }
    );

    const account = data.responseBody.accounts[0];

    return {
        accountNumber: account.accountNumber,
        bankName: account.bankName,
        accountRef: data.responseBody.accountReference,
    };
};

// Verify a webhook transaction from Monnify
export const verifyMonnifyTransaction = async (
    transactionReference: string
    ): Promise<{
    isValid: boolean;
    amount: number;
    customerEmail: string;
    }> => {
    const token = await getAccessToken();

    const { data } = await axios.get(
        `${MONNIFY_BASE_URL}/api/v2/transactions/${encodeURIComponent(
        transactionReference
        )}`,
        {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        }
    );

    const txn = data.responseBody;

    return {
        isValid: txn.paymentStatus === "PAID",
        amount: txn.amountPaid,
        customerEmail: txn.customer.email,
    };
};