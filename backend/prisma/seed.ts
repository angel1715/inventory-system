import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    // =========================
    // 1. GET OR CREATE BUSINESS
    // =========================
    let business = await prisma.business.findFirst({ where: { slug: "my-store" } });

    if (!business) {
        business = await prisma.business.create({
            data: {
                name: "OGAdmin",
                slug: "OGAdmin",
                phone: "809-747-0508",
                address: "Santo Domingo",
                email: "angelgarci310@gmail.com",
            },
        });
    }

    // =========================
    // 2. CREATE DEFAULT SETTINGS
    // =========================
    const settings = await prisma.businessSettings.findFirst({
        where: { businessId: business.id },
    });

    if (!settings) {
        await prisma.businessSettings.create({
            data: {
                businessName: "My Store",
                phone: "809-000-0000",
                address: "Santo Domingo",
                currency: "DOP",
                taxRate: 18,
                invoiceFooter: "Thank you for your purchase",
                businessId: business.id,
            },
        });
    }

    // =========================
    // 3. CREATE OWNER USER
    // =========================
    const hashedPassword = await bcrypt.hash("123456", 10);

    const existingUser = await prisma.user.findUnique({
        where: {
            email: "admin@store.com",
        },
    });

    if (!existingUser) {
        await prisma.user.create({
            data: {
                name: "Admin",
                email: "admin@store.com",
                password: hashedPassword,
                role: "OWNER",
                businessId: business.id,
                active: true,
            },
        });
    }

    console.log("✅ Seed completed successfully");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });