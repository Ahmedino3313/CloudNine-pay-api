import { Router } from "express";
import { body } from "express-validator";
import { buyAirtime, getAirtimeHistory } from "./airtime.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

// All airtime routes require login
router.use(protect);

router.post(
    "/buy",
    [
        body("network")
        .isIn(["MTN", "AIRTEL", "GLO", "NINE_MOBILE"])
        .withMessage("Invalid network. Choose MTN, AIRTEL, GLO or NINE_MOBILE"),
        body("phone")
        .matches(/^0[789][01]\d{8}$/)
        .withMessage("Valid Nigerian phone number is required"),
        body("amount")
        .isFloat({ min: 50 })
        .withMessage("Minimum amount is ₦50"),
    ],
    buyAirtime
);

router.get("/history", getAirtimeHistory);

export default router;