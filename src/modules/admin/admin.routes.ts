import { Router } from "express";
import { body } from "express-validator";
import { getAnalytics, getAllUsers, toggleUserStatus, getPendingConversions, approveConversion, rejectConversion, updateConversionRate, getRevenueAnalytics, getAppHealth,  getAllWithdrawals, updateWithdrawalStatus, getAuditLogs,} from "./admin.controller";
import { protect, requireRole } from "../../middleware/auth.middleware";


const router = Router();

// All admin routes require login AND admin role
router.use(protect, requireRole("ADMIN", "SUPER_ADMIN"));

// Analytics
router.get("/analytics", getAnalytics);
router.get("/revenue", getRevenueAnalytics);
router.get("/health", getAppHealth);

// Users
router.get("/users", getAllUsers);
router.patch("/users/:id/toggle-status", toggleUserStatus);

// Conversions
router.get("/conversions/pending", getPendingConversions);
router.patch("/conversions/:id/approve", approveConversion);
router.patch("/conversions/:id/reject", rejectConversion);

// Withdrawals
router.get("/withdrawals", getAllWithdrawals);
router.patch(
    "/withdrawals/:id/status",
    [
        body("status")
        .isIn(["PROCESSING", "COMPLETED", "FAILED"])
        .withMessage("Invalid status"),
    ],
    updateWithdrawalStatus
);

// Rates
router.patch(
    "/rates",
    protect,
    requireRole("SUPER_ADMIN"),
    [
        body("network")
        .isIn(["MTN", "AIRTEL", "GLO", "NINE_MOBILE"])
        .withMessage("Invalid network"),
        body("rate")
        .isFloat({ min: 0, max: 1 })
        .withMessage("Rate must be between 0 and 1"),
    ],
    updateConversionRate
);

router.get("/audit-logs", getAuditLogs);

export default router;