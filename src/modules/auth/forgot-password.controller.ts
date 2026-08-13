import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../../config/prisma";
import { sendEmail, resetPasswordEmailTemplate } from "../../config/email";
import { sendSuccess, sendError } from "../../utils/response";

// forgetpassword
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always send success even if user not found
    // This prevents email enumeration attacks
    if (!user) {
      sendSuccess(
        res,
        "If this email exists we have sent a reset link."
      );
      return;
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Token expires in 1 hour
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // Build reset link
    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    // Send email
    await sendEmail(
      user.email,
      "Reset Your CloudNine Pay Password",
      resetPasswordEmailTemplate(user.fullName, resetLink)
    );

    sendSuccess(
      res,
      "If this email exists we have sent a reset link."
    );
  } catch (err) {
    console.error("Forgot password error:", err);
    sendError(res, "Failed to process request. Please try again.", 500);
  }
};


// resetPassword
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      sendError(res, "Token and new password are required.", 400);
      return;
    }

    // Find user with this token that hasn't expired
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      sendError(
        res,
        "Invalid or expired reset token. Please request a new one.",
        400
      );
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        refreshToken: null, // Log out all devices
      },
    });

    sendSuccess(
      res,
      "Password reset successfully. Please log in with your new password."
    );
  } catch (err) {
    console.error("Reset password error:", err);
    sendError(res, "Failed to reset password. Please try again.", 500);
  }
};