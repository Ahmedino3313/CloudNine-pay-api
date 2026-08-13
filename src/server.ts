import "dotenv/config";
import app from "./app";
import prisma from "./config/prisma";

const PORT = Number(process.env.PORT ?? 5000);

async function main() {
        try {
            // Test database connection
            await prisma.$connect();
            console.log("Connected to Neon PostgreSQL");

            app.listen(PORT, () => {
            console.log(`
        ╔═══════════════════════════════════════╗
        ║      CloudNine Pay API v1.0.0         ║
        ╠═══════════════════════════════════════╣
        ║  Server  → http://localhost:${PORT}   ║
        ║  Health  → http://localhost:${PORT}/health ║
        ║  Env     → ${process.env.NODE_ENV}    ║
        ╚═══════════════════════════════════════╝
            `);
            });
        } catch (err) {
            console.error("❌ Failed to start server:", err);
            await prisma.$disconnect();
            process.exit(1);
        }
    }

    // Graceful shutdown
    process.on("SIGTERM", async () => {
        console.log("Shutting down gracefully...");
        await prisma.$disconnect();
        process.exit(0);
        });

        process.on("SIGINT", async () => {
        console.log("Shutting down...");
        await prisma.$disconnect();
        process.exit(0);
        });

main();