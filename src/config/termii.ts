import axios from "axios";

const TERMII_BASE_URL =
    process.env.TERMII_BASE_URL ?? "https://v4.api.termii.com";
const TERMII_API_KEY = process.env.TERMII_API_KEY as string;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID ?? "CloudNine";

// Convert Nigerian local format to international format
// 09012345677 → 2349012345677
const formatNigerianPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("234")) return cleaned;
    if (cleaned.startsWith("0")) return `234${cleaned.slice(1)}`;
    return `234${cleaned}`;
};

export const sendSmsOtp = async (
    phone: string,
    otp: string
    ): Promise<void> => {
    const internationalPhone = formatNigerianPhone(phone);
    const message = `Your CloudNine Pay verification code is: ${otp}. It expires in 10 minutes. Do not share this code with anyone.`;

    try {
        const response = await axios.post(`${TERMII_BASE_URL}/api/sms/send`, {
        to: internationalPhone,
        from: TERMII_SENDER_ID,
        sms: message,
        type: "plain",
        api_key: TERMII_API_KEY,
        channel: "generic",
        });
        console.log("✅ SMS OTP sent to:", internationalPhone);
        console.log("📱 Termii response:", response.data);
    } catch (err: any) {
        console.error("❌ Termii SMS error:", err?.response?.data ?? err.message);
        throw err;
    }
};

export const sendSmsOtpDND = async (
    phone: string,
    otp: string
    ): Promise<void> => {
    const internationalPhone = formatNigerianPhone(phone);
    const message = `Your CloudNine Pay verification code is: ${otp}. Expires in 10 minutes.`;

    try {
        await axios.post(`${TERMII_BASE_URL}/api/sms/send`, {
        to: internationalPhone,
        from: TERMII_SENDER_ID,
        sms: message,
        type: "plain",
        api_key: TERMII_API_KEY,
        channel: "dnd",
        });
        console.log("✅ SMS OTP sent via DND to:", internationalPhone);
    } catch (err: any) {
        console.error("❌ Termii DND SMS error:", err?.response?.data ?? err.message);
        throw err;
    }
};