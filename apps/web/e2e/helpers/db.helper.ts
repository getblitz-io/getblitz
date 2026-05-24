import { prisma } from "@getblitz/database";

export async function resetDatabase() {
  // Query all tables in public schema except migrations
  const tablenames = await prisma.$queryRaw<
    { tablename: string }[]
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';`;

  const tables = tablenames
    .map(({ tablename }) => `"public"."${tablename}"`)
    .join(", ");

  if (tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    } catch (error) {
      console.error("Failed to truncate database tables:", error);
    }
  }
}

export async function closeDatabaseConnection() {
  await prisma.$disconnect();
}
