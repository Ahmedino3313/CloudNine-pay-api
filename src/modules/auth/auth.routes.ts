import { Router } from "express";
import { body } from "express-validator";
import { register, login, refreshToken, logout, getMe } from "./auth.controller";
import { protect } from "../../middleware/auth.middleware";

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
        .normalizeEmail()
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

export default router;