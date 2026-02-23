const prisma = require('../prisma/client');

async function main() {
  // Shifts des employés avec pause_excessive
  const empIds = [108, 115, 117, 112, 102, 98, 113];
  const dates = ['2026-02-22', '2026-02-21'];
  
  for (const empId of empIds) {
    for (const d of dates) {
      const shifts = await prisma.shift.findMany({
        where: {
          employeId: empId,
          date: new Date(`${d}T00:00:00.000Z`)
        }
      });
      if (shifts.length > 0) {
        for (const s of shifts) {
          console.log(`emp${empId} ${d} shift#${s.id} type=${s.type}`);
          const segs = typeof s.segments === 'string' ? JSON.parse(s.segments) : s.segments;
          if (Array.isArray(segs)) {
            segs.forEach((seg, i) => console.log(`  seg${i}: ${seg.start||seg.debut}-${seg.end||seg.fin} isExtra=${seg.isExtra||false}`));
          }
        }
      }
    }
  }
  
  // Pointages correspondants
  for (const empId of [108, 113]) {
    for (const d of ['2026-02-22']) {
      const pts = await prisma.pointage.findMany({
        where: {
          userId: empId,
          horodatage: {
            gte: new Date(`${d}T04:00:00.000Z`),
            lt: new Date(`2026-02-23T04:00:00.000Z`)
          }
        },
        orderBy: { horodatage: 'asc' }
      });
      console.log(`\nemp${empId} ${d} pointages:`);
      pts.forEach(p => {
        const h = p.horodatage.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
        console.log(`  ${p.type} ${h}`);
      });
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
