import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client';
import { initializeSubscriptionPlan } from '../src/shared/infra/db/prisma/initial-plan';
import { initializeSubscriptionOptions } from '../src/shared/infra/db/prisma/initialize-subscription-options';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be configured');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const plan = await prisma.$transaction(async (transaction) => {
      const initialPlan = await initializeSubscriptionPlan(transaction);
      await initializeSubscriptionOptions(transaction);
      const ownerEmail =
        process.env.DENTCARE_PLATFORM_OWNER_EMAIL?.trim().toLowerCase() ||
        'luiscaputo.dev@gmail.com';
      const ownerRole = await transaction.role.upsert({
        where: { slug: 'platform_owner' },
        create: {
          name: 'Platform owner',
          slug: 'platform_owner',
          description: 'Global DentCare platform administrator',
          isSystem: true,
        },
        update: {},
      });
      let owner = await transaction.user.findFirst({
        where: { email: ownerEmail, deletedAt: null },
        select: { id: true },
      });
      if (!owner) {
        const ownerPassword = process.env.DENTCARE_PLATFORM_OWNER_PASSWORD;
        if (!ownerPassword || ownerPassword.length < 12) {
          throw new Error(
            'Set DENTCARE_PLATFORM_OWNER_PASSWORD to a password of at least 12 characters to create the platform owner',
          );
        }
        owner = await transaction.user.create({
          data: {
            email: ownerEmail,
            username: ownerEmail,
            password: await hash(ownerPassword, 12),
            roleId: ownerRole.id,
            branchId: null,
            isActive: true,
            isEmailVerified: true,
            UserRole: { create: { roleId: ownerRole.id } },
          },
          select: { id: true },
        });
      } else {
        await transaction.user.update({
          where: { id: owner.id },
          data: {
            roleId: ownerRole.id,
            branchId: null,
            isActive: true,
            isEmailVerified: true,
          },
        });
        await transaction.userRole.upsert({
          where: { userId_roleId: { userId: owner.id, roleId: ownerRole.id } },
          create: { userId: owner.id, roleId: ownerRole.id },
          update: { deletedAt: null },
        });
      }
      return initialPlan;
    });
    console.log(`Clinic registration plan configured: ${plan.name}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (
    error instanceof Error &&
    error.message.startsWith('Set DENTCARE_PLATFORM_OWNER_PASSWORD')
  ) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  console.error(
    'Could not configure the initial subscription plan. Check database connectivity, applied migrations, and whether the initial plan or currency was removed.',
  );
  process.exitCode = 1;
});
