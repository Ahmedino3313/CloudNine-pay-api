import { Router } from "express";
import { body } from "express-validator";
import { getProfile, updateProfile, changePassword, deleteAccount, } from "./users.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

// All user routes require login
router.use(protect);

router.get("/profile", getProfile);

router.patch(
    "/profile",
    [
        body("fullName")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Full name cannot be empty"),
        body("phone")
        .optional()
        .matches(/^0[789][01]\d{8}$/)
        .withMessage("Valid Nigerian phone number is required"),
    ],
    updateProfile
);

router.patch(
    "/change-password",
    [
        body("currentPassword")
        .notEmpty()
        .withMessage("Current password is required"),
        body("newPassword")
        .isLength({ min: 8 })
        .withMessage("New password must be at least 8 characters")
        .matches(/[A-Z]/)
        .withMessage("New password must contain an uppercase letter")
        .matches(/[0-9]/)
        .withMessage("New password must contain a number"),
    ],
    changePassword
);

router.delete(
    "/",
    [
        body("password")
        .notEmpty()
        .withMessage("Password is required to delete account"),
    ],
    deleteAccount
);

export default router;