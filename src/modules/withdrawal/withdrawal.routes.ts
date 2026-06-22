import { Router } from "express";
import { body } from "express-validator";
import { requestWithdrawal, getWithdrawals, setTransactionPin,} from "./withdrawal.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

// All withdrawal routes require login
router.use(protect);

router.get("/", getWithdrawals);

router.post(
    "/",
    [
        body("amount")
        .isFloat({ min: 500 })
        .withMessage("Minimum withdrawal is ₦500"),
        body("bankName")
        .notEmpty()
        .withMessage("Bank name is required"),
        body("accountNumber")
        .matches(/^\d{10}$/)
        .withMessage("Account number must be exactly 10 digits"),
        body("accountName")
        .notEmpty()
        .withMessage("Account name is required"),
        body("transactionPin")
        .notEmpty()
        .withMessage("Transaction PIN is required"),
    ],
    requestWithdrawal
);

router.post(
    "/set-pin",
    [
        body("pin")
        .matches(/^\d{4}$/)
        .withMessage("PIN must be exactly 4 digits"),
    ],
    setTransactionPin
);

export default router;