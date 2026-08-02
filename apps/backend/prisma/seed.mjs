import * as argon2 from 'argon2';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const login = process.env.INITIAL_ADMIN_LOGIN ?? 'admin';
  const name = process.env.INITIAL_ADMIN_NAME ?? 'Administrador';
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error('INITIAL_ADMIN_PASSWORD must contain at least 8 characters.');
  }

  const normalizedLogin = login.normalize('NFKC').trim().toLowerCase();
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  await prisma.user.upsert({
    where: { normalizedLogin },
    update: {
      name,
      login,
      passwordHash,
      role: UserRole.ADMIN,
      active: true,
    },
    create: {
      name,
      login,
      normalizedLogin,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
