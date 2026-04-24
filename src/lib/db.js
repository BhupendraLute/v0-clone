import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});


const db = globalThis.prisma || new PrismaClient({
    adapter,
    log: ['query', 'info', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = db;
}

export default db;