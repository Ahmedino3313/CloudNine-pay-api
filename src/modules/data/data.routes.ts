import { Router } from "express";
import { body } from "express-validator";
import { getDataPlans, buyData, getDataHistory,} from "./data.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

// All data routes require login
router.use(protect);

router.get("/plans/:network", getDataPlans);
router.get("/history", getDataHistory);

router.post(
    "/buy",
    [
        body("network")
        .isIn(["MTN", "AIRTEL", "GLO", "NINE_MOBILE"])
        .withMessage("Invalid network. Choose MTN, AIRTEL, GLO or NINE_MOBILE"),
        body("phone")
        .matches(/^0[789][01]\d{8}$/)
        .withMessage("Valid Nigerian phone number is required"),
        body("planCode")
        .notEmpty()
        .withMessage("Please select a data plan"),
    ],
    buyData
);

export default router;