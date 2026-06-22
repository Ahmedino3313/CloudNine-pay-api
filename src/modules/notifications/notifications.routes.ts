import { Router } from "express";
import { getNotifications, markAllRead, markOneRead, } from "./notifications.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

// All notification routes require login
router.use(protect);

router.get("/", getNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markOneRead);

export default router;