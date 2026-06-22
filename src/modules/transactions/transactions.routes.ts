import { Router } from "express";
import { getTransactions, getTransactionById,} from "./transactions.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

// All transaction routes require login
router.use(protect);

router.get("/", getTransactions);
router.get("/:id", getTransactionById);

export default router;