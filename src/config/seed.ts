import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

async function seed() {
    console.log("🌱 Seeding CloudNine Pay database...");

    // ─── Conversion Rates ────────────────────────
    const rates = [
        { network: "MTN" as const, rate: 0.72 },
        { network: "AIRTEL" as const, rate: 0.70 },
        { network: "GLO" as const, rate: 0.68 },
        { network: "NINE_MOBILE" as const, rate: 0.65 },
    ];

    for (const r of rates) {
        await prisma.conversionRate.upsert({
        where: { network: r.network },
        update: { rate: r.rate },
        create: { network: r.network, rate: r.rate },
        });
    }
    console.log("Conversion rates seeded");

    // ─── Super Admin ─────────────────────────────
    const adminPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD!,
        12
    );

    const admin = await prisma.user.upsert({
        where: { email: process.env.ADMIN_EMAIL! },
        update: {},
        create: {
        fullName: "CloudNine Admin",
        email: process.env.ADMIN_EMAIL!,
        phone: process.env.ADMIN_PHONE!,
        password: adminPassword,
        role: "SUPER_ADMIN",
        isVerified: true,
        },
    });

    await prisma.wallet.upsert({
        where: { userId: admin.id },
        update: {},
        create: { userId: admin.id, balance: 0 },
    });

    console.log("Super admin created");
    console.log(`Email: ${process.env.ADMIN_EMAIL}`);

    // ─── Demo Customer ───────────────────────────
    const customerPassword = await bcrypt.hash(
        process.env.DEMO_PASSWORD!,
        12
    );

    const customer = await prisma.user.upsert({
        where: { email: process.env.DEMO_EMAIL! },
        update: {},
        create: {
        fullName: "Demo User",
        email: process.env.DEMO_EMAIL!,
        phone: process.env.DEMO_PHONE!,
        password: customerPassword,
        role: "CUSTOMER",
        isVerified: true,
        },
    });

    await prisma.wallet.upsert({
        where: { userId: customer.id },
        update: {},
        create: { userId: customer.id, balance: 24500 },
    });

    console.log("Demo customer created");
    console.log(`Email: ${process.env.DEMO_EMAIL}`);

    // Promote demo user to ADMIN for testing
    await prisma.user.update({
    where: { email: process.env.DEMO_EMAIL! },
    data: { role: "ADMIN" },
    });
    console.log("Demo user promoted to ADMIN");

    console.log("\n🎉 Seeding complete!");
}

seed()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });