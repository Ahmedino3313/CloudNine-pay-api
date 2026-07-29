import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import cookieParser from "cookie-parser";

// Middleware
import { errorHandler, notFound } from "./middleware/error.middleware";

// Routes
import authRoutes from "./modules/auth/auth.routes";
import walletRoutes from "./modules/wallet/wallet.routes";
import airtimeRoutes from "./modules/airtime/airtime.routes";
import dataRoutes from "./modules/data/data.routes";
import conversionRoutes from "./modules/conversion/conversion.routes";
import withdrawalRoutes from "./modules/withdrawal/withdrawal.routes";
import transactionRoutes from "./modules/transactions/transactions.routes";
import notificationRoutes from "./modules/notifications/notifications.routes";
import adminRoutes from "./modules/admin/admin.routes";
import userRoutes from "./modules/users/users.routes";
import bankRoutes from "./modules/bank/bank.routes";

const app = express();

// ─── Security ────────────────────────────────
app.use(helmet());
app.set("trust proxy", 1);

// ─── CORS ────────────────────────────────────
const allowedOrigins = (
    process.env.CORS_ORIGINS ?? "http://localhost:3000"
)
    .split(",")
    .map((o) => o.trim());

app.use(
    cors({
        origin: (origin, callback) => {
        // Allow requests with no origin like mobile apps and Postman
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked: ${origin}`));
        }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// ─── Rate Limiting ───────────────────────────
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "development" ? 1000 : 100,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "development" ? 100 : 10,
    message: {
        success: false,
        message: "Too many attempts. Please wait 15 minutes.",
    },
});
app.use(globalLimiter);

// ─── Body Parsing ────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Health Check ────────────────────────────
app.get("/health", (_req, res) => {
    res.json({
        success: true,
        message: "CloudNine Pay API is running",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
    });
});

// ─── Routes ──────────────────────────────────
const API = "/api/v1";

app.use(`${API}/auth`, authLimiter, authRoutes);
app.use(`${API}/wallet`, walletRoutes);
app.use(`${API}/airtime`, airtimeRoutes);
app.use(`${API}/data`, dataRoutes);
app.use(`${API}/conversions`, conversionRoutes);
app.use(`${API}/withdrawals`, withdrawalRoutes);
app.use(`${API}/transactions`, transactionRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/banks`, bankRoutes);

// ─── 404 and Error Handler ───────────────────
app.use(notFound);
app.use(errorHandler);

export default app;