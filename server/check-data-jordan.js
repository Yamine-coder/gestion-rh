const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jordan = await prisma.user.findUnique({ where: { email: 'yjordan496@gmail.com' } });
  console.log('Jordan ID:', jordan.id);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  console.log('\n📅 Recherche shifts entre:', today.toISOString(), 'et', tomorrow.toISOString());
  
  const shifts = await prisma.shift.findMany({
    where: {
      employeId: jordan.id,
      date: { gte: today, lt: tomorrow }
    }
  });
  
  console.log('\n🗓️ Shifts trouvés:', shifts.length);
  shifts.forEach(s => {
    console.log('  - ID:', s.id);
    console.log('    Date:', s.date);
    console.log('    Type:', s.type);
    console.log('    Segments:', JSON.stringify(s.segments, null, 2));
  });
  
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: jordan.id,
      horodatage: { gte: today, lt: tomorrow }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log('\n⏰ Pointages trouvés:', pointages.length);
  pointages.forEach(p => {
    console.log('  -', p.type, ':', p.horodatage.toLocaleString('fr-FR'));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
