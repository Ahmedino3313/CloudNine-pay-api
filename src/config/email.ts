import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: Number(process.env.SMTP_PORT ?? 587),
//     secure: false,
//     auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS,
//     },
// });

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

// export const sendEmail = async (
//     to: string,
//     subject: string,
//     html: string
//     ): Promise<void> => {
//     await transporter.sendMail({
//         from: `CloudNine Pay <${process.env.EMAIL_FROM}>`,
//         to,
//         subject,
//         html,
//     });
// };

export const sendEmail = async (
    to: string,
    subject: string,
    html: string
    ): Promise<void> => {
    try {
        const info = await transporter.sendMail({
        from: `CloudNine Pay <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html,
        });
        console.log("✅ Email sent to:", to);
        console.log("📧 Message ID:", info.messageId);
    } catch (err) {
        console.error("❌ Email send failed:", err);
        throw err;
    }
};

// ─── Email Templates ─────────────────────────────────

export const welcomeEmailTemplate = (fullName: string): string => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#E11D48,#BE123C);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;">CloudNine<span style="opacity:0.8;">Pay</span></h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Recharge. Convert. Withdraw.</p>
        </div>
        <!-- Body -->
        <div style="padding:32px;">
        <h2 style="color:#0F172A;font-size:20px;margin:0 0 12px;">Welcome, ${fullName}!</h2>
        <p style="color:#94A3B8;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Your CloudNine Pay account is ready. You can now buy airtime, purchase data and convert excess airtime to cash instantly.
        </p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#E11D48,#BE123C);color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">
            Go to Dashboard →
        </a>
        </div>
        <!-- Footer -->
        <div style="padding:24px 32px;border-top:1px solid #E2E8F0;text-align:center;">
        <p style="color:#94A3B8;font-size:12px;margin:0;">
            © ${new Date().getFullYear()} CloudNine Pay · Powered by CloudNine Technology
        </p>
        </div>
    </div>
</body>
</html>
`;

// resetPasswordEmailTemplate
export const resetPasswordEmailTemplate = (
    fullName: string,
    resetLink: string
): string => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#E11D48,#BE123C);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;">CloudNine<span style="opacity:0.8;">Pay</span></h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Password Reset Request</p>
        </div>
        <!-- Body -->
        <div style="padding:32px;">
        <h2 style="color:#0F172A;font-size:20px;margin:0 0 12px;">Hi ${fullName},</h2>
        <p style="color:#94A3B8;font-size:15px;line-height:1.6;margin:0 0 8px;">
            We received a request to reset your CloudNine Pay password.
            Click the button below to set a new password.
        </p>
        <p style="color:#94A3B8;font-size:14px;line-height:1.6;margin:0 0 24px;">
            This link expires in <strong style="color:#0F172A;">1 hour</strong>.
            If you did not request this, please ignore this email.
        </p>
        <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#E11D48,#BE123C);color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">
            Reset Password →
        </a>
        <p style="color:#94A3B8;font-size:13px;margin:24px 0 0;">
            Or copy this link: <br/>
            <span style="color:#E11D48;word-break:break-all;">${resetLink}</span>
        </p>
        </div>
        <!-- Footer -->
        <div style="padding:24px 32px;border-top:1px solid #E2E8F0;text-align:center;">
        <p style="color:#94A3B8;font-size:12px;margin:0;">
            © ${new Date().getFullYear()} CloudNine Pay · If you did not request this, ignore this email.
        </p>
        </div>
    </div>
    </body>
</html>
`;

// conversionApprovedEmailTemplate
export const conversionApprovedEmailTemplate = (
    fullName: string,
    cashValue: number,
    network: string
): string => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
        <div style="background:linear-gradient(135deg,#E11D48,#BE123C);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;">CloudNinePay</h1>
        </div>
        <div style="padding:32px;">
        <h2 style="color:#0F172A;font-size:20px;margin:0 0 12px;">Conversion Approved!</h2>
        <p style="color:#94A3B8;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Hi ${fullName}, your ${network} airtime conversion has been approved.
            <strong style="color:#22C55E;">₦${cashValue.toLocaleString()}</strong> has been credited to your wallet.
        </p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#E11D48,#BE123C);color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">
            View Wallet →
        </a>
        </div>
        <div style="padding:24px 32px;border-top:1px solid #E2E8F0;text-align:center;">
        <p style="color:#94A3B8;font-size:12px;margin:0;">© ${new Date().getFullYear()} CloudNine Pay</p>
        </div>
    </div>
    </body>
</html>
`;

// Verify connection on startup
transporter.verify((error) => {
    if (error) {
        console.error("❌ SMTP connection failed:", error);
    } else {
        console.log("✅ SMTP server ready");
    }
    });

    // otpEmailTemplate
export const otpEmailTemplate = (
    fullName: string,
    otp: string
): string => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#E11D48,#BE123C);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;">CloudNine<span style="opacity:0.8;">Pay</span></h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Email Verification</p>
        </div>
        <!-- Body -->
        <div style="padding:32px;text-align:center;">
        <h2 style="color:#0F172A;font-size:20px;margin:0 0 12px;">Hi ${fullName},</h2>
        <p style="color:#94A3B8;font-size:15px;line-height:1.6;margin:0 0 32px;">
            Use the code below to verify your email address.
            This code expires in <strong style="color:#0F172A;">10 minutes</strong>.
        </p>
        <!-- OTP Code -->
        <div style="background:#F8FAFC;border:2px dashed #E11D48;border-radius:16px;padding:24px;margin:0 0 32px;">
            <p style="color:#94A3B8;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Your verification code</p>
            <p style="color:#E11D48;font-size:48px;font-weight:900;margin:0;letter-spacing:12px;">${otp}</p>
        </div>
        <p style="color:#94A3B8;font-size:13px;margin:0;">
            If you did not create a CloudNine Pay account, ignore this email.
        </p>
        </div>
        <!-- Footer -->
        <div style="padding:24px 32px;border-top:1px solid #E2E8F0;text-align:center;">
        <p style="color:#94A3B8;font-size:12px;margin:0;">
            © ${new Date().getFullYear()} CloudNine Pay · Do not share this code with anyone.
        </p>
        </div>
    </div>
    </body>
</html>
`;