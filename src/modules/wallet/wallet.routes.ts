import { Router } from "express";
import { getWallet, getVirtualAccount } from "./wallet.controller";
import { monnifyWebhook } from "./webhook.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

// ─── Webhook (no auth — Monnify calls this) ──
router.post("/webhook/monnify", monnifyWebhook);

// ─── All routes below require login ──────────
router.use(protect);

router.get("/", getWallet);
router.get("/virtual-account", getVirtualAccount);

export default router;