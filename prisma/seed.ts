import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { initializeSubscriptionPlan } from '../src/shared/infra/db/prisma/initial-plan';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be configured');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const plan = await prisma.$transaction((transaction) =>
      initializeSubscriptionPlan(transaction),
    );
    console.log(`Clinic registration plan configured: ${plan.name}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error(
    'Could not configure the initial subscription plan. Check database connectivity, applied migrations, and whether the initial plan or currency was removed.',
  );
  process.exitCode = 1;
});
