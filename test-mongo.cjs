const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const users = await prisma.user.findMany();
    console.log('Users:', JSON.stringify(users));
  } catch (err) {
    console.error('DB Error:', err.message);
    console.error('Code:', err.code);
  } finally {
    await prisma.$disconnect();
  }
}
test();
