import { Router } from "express";
import { body } from "express-validator";
import { listBanks, verifyAccount } from "./bank.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);

router.get("/", listBanks);

router.post(
    "/verify",
    [
        body("accountNumber")
        .matches(/^\d{10}$/)
        .withMessage("Account number must be exactly 10 digits"),
        body("bankCode").notEmpty().withMessage("Bank code is required"),
    ],
    verifyAccount
);

export default router;