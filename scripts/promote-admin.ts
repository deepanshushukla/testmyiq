import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * There is no public admin signup path (docs/PRD.md §4 personas) — the
 * only way to create an admin is this script, run with direct DB access.
 * Usage: npm run admin:promote -- someone@example.com
 */
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run admin:promote -- <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email ${email}. They must register and verify first.`);
    process.exit(1);
  }

  if (user.role === "ADMIN") {
    console.log(`${email} is already an admin.`);
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`Promoted ${email} to ADMIN.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
