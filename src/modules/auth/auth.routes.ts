import { Router } from "express";
import { body } from "express-validator";
import { register, login, refreshToken, logout, getMe } from "./auth.controller";
import { protect } from "../../middleware/auth.middleware";
import { forgotPassword, resetPassword } from "./forgot-password.controller";
import { verifyEmailOtp, resendOtp } from "./verify-otp.controller";

const router = Router();

const registerValidation = [
    body("fullName")
        .trim()
        .escape()
        .notEmpty()
        .withMessage("Full name is required"),
    body("email")
        .trim()
        .isEmail()
        .normalizeEmail({ gmail_remove_dots: false })
        .withMessage("Valid email is required"),
    body("phone")
        .trim()
        .matches(/^0[789][01]\d{8}$/)
        .withMessage("Valid Nigerian phone number is required"),
    body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters")
        .matches(/[A-Z]/)
        .withMessage("Password must contain an uppercase letter")
        .matches(/[0-9]/)
        .withMessage("Password must contain a number"),
];

const loginValidation = [
    body("emailOrPhone")
        .notEmpty()
        .withMessage("Email or phone number is required"),
    body("password")
        .notEmpty()
        .withMessage("Password is required"),
];

// Public routes
router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.post("/refresh", refreshToken);

// Protected routes
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

// Forgot password routes
router.post(
    "/forgot-password",
    [body("email").isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage("Valid email is required")],
    forgotPassword
    );

    router.post(
    "/reset-password",
    [
        body("token").notEmpty().withMessage("Token is required"),
        body("newPassword")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters")
        .matches(/[A-Z]/)
        .withMessage("Password must contain an uppercase letter")
        .matches(/[0-9]/)
        .withMessage("Password must contain a number"),
    ],
    resetPassword
);

// OTP verification routes
router.post(
    "/verify-otp",
    [
        body("userId").notEmpty().withMessage("User ID is required"),
        body("otp")
        .isLength({ min: 6, max: 6 })
        .withMessage("OTP must be 6 digits")
        .matches(/^\d{6}$/)
        .withMessage("OTP must be numbers only"),
    ],
    verifyEmailOtp
    );

    router.post(
    "/resend-otp",
    [body("userId").notEmpty().withMessage("User ID is required")],
    resendOtp
);

export default router;