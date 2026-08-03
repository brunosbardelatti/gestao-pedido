import * as argon2 from 'argon2';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser(login, name, password, role) {
  const normalizedLogin = login.normalize('NFKC').trim().toLowerCase();
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { normalizedLogin },
    update: { name, login, role, active: true },
    create: { name, login, normalizedLogin, passwordHash, role },
  });
}

async function main() {
  const adminLogin = process.env.INITIAL_ADMIN_LOGIN ?? 'admin';
  const adminName = process.env.INITIAL_ADMIN_NAME ?? 'Administrador';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (!adminPassword || adminPassword.length < 8) {
    throw new Error('INITIAL_ADMIN_PASSWORD must contain at least 8 characters.');
  }

  const adminNormalized = adminLogin.normalize('NFKC').trim().toLowerCase();
  const adminHash = await argon2.hash(adminPassword, { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { normalizedLogin: adminNormalized },
    update: { name: adminName, login: adminLogin, role: UserRole.ADMIN, active: true },
    create: { name: adminName, login: adminLogin, normalizedLogin: adminNormalized, passwordHash: adminHash, role: UserRole.ADMIN },
  });

  await upsertUser('silvana', 'Silvana', 'silvana@2026', UserRole.ADMIN);
  await upsertUser('andre', 'André', 'andre@2026', UserRole.ADMIN);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
