import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Required for Neon serverless in Node.js environment
neonConfig.webSocketConstructor = ws;

declare global {
  // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
    const connectionString = process.env.DATABASE_URL!;
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter });
};

const prisma = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    global.__prisma = prisma;
}

export default prisma;