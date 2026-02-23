const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const a = await prisma.anomalie.findUnique({ where: { id: 185 }, include: { employe: true } });
    if (!a) { console.log('Not found'); return; }
    console.log('ID:', a.id);
    console.log('Type:', a.type);
    console.log('Date:', a.date);
    console.log('Description:', a.description);
    console.log('Details (raw):', JSON.stringify(a.details, null, 2));
    console.log('Employe:', a.employe?.prenom, a.employe?.nom);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
