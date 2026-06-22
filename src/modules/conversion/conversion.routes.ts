import { Router } from "express";
import { body } from "express-validator";
import { getRates, initiateConversion, verifyConversion, getConversions,} from "./conversion.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

// All conversion routes require login
router.use(protect);

router.get("/rates", getRates);
router.get("/", getConversions);

router.post(
    "/initiate",
    [
        body("network")
        .isIn(["MTN", "AIRTEL", "GLO", "NINE_MOBILE"])
        .withMessage("Invalid network. Choose MTN, AIRTEL, GLO or NINE_MOBILE"),
        body("airtimeAmount")
        .isFloat({ min: 500 })
        .withMessage("Minimum conversion amount is ₦500"),
    ],
    initiateConversion
);

router.post("/verify/:conversionId", verifyConversion);

export default router;