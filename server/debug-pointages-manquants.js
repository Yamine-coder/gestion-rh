// Debug: Vérifier pourquoi certains pointages ne sont pas comptabilisés
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPointages() {
  console.log('🔍 DEBUG: Analyse des pointages manquants\n');

  try {
    const employe = await prisma.user.findFirst({
      where: { email: 'test.complet@restaurant.com' }
    });

    if (!employe) {
      console.log('❌ Employé non trouvé');
      return;
    }

    console.log(`Employé: ${employe.prenom} ${employe.nom} (ID: ${employe.id})\n`);

    // Récupérer tous les pointages de novembre
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employe.id,
        horodatage: {
          gte: new Date('2025-11-01T00:00:00Z'),
          lte: new Date('2025-11-30T23:59:59Z')
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`Total pointages: ${pointages.length}\n`);

    // Grouper par jour
    const parJour = new Map();
    pointages.forEach(p => {
      const date = p.horodatage.toISOString().split('T')[0];
      if (!parJour.has(date)) {
        parJour.set(date, []);
      }
      parJour.get(date).push(p);
    });

    console.log('Pointages par jour:\n');
    console.log('─'.repeat(100));

    // Analyser chaque jour
    for (const [date, pts] of Array.from(parJour.entries()).sort()) {
      console.log(`\n📅 ${date} (${pts.length} pointages):`);
      
      pts.forEach((p, idx) => {
        const heure = p.horodatage.toISOString().split('T')[1].substring(0, 8);
        const typeDisplay = p.type === 'arrivée' ? '→ ARRIVÉE' : '← DÉPART';
        console.log(`   ${idx + 1}. ${heure} ${typeDisplay} (type: "${p.type}")`);
      });

      // Vérifier l'appairage
      let heuresCalculees = 0;
      for (let i = 0; i < pts.length - 1; i += 2) {
        const arrivee = pts[i];
        const depart = pts[i + 1];
        
        const isArrivee = arrivee.type === 'arrivee' || arrivee.type === 'arrivée' || arrivee.type === 'ENTRÉE';
        const isDepart = depart && (depart.type === 'depart' || depart.type === 'départ' || depart.type === 'SORTIE');
        
        if (isArrivee && isDepart) {
          const diffMs = new Date(depart.horodatage) - new Date(arrivee.horodatage);
          const heures = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
          heuresCalculees += heures;
          console.log(`   ✅ Paire ${Math.floor(i/2) + 1}: ${heures}h`);
        } else {
          console.log(`   ❌ Paire ${Math.floor(i/2) + 1}: NON VALIDE`);
          console.log(`      - arrivee.type="${arrivee.type}" isArrivee=${isArrivee}`);
          console.log(`      - depart.type="${depart?.type}" isDepart=${isDepart}`);
        }
      }

      console.log(`   📊 Total journée: ${heuresCalculees}h`);
    }

    // Récupérer les shifts pour comparaison
    console.log('\n\n' + '='.repeat(100));
    console.log('📅 COMPARAISON AVEC LES SHIFTS PRÉVUS\n');

    const shifts = await prisma.shift.findMany({
      where: {
        employeId: employe.id,
        date: {
          gte: new Date('2025-11-01T00:00:00Z'),
          lte: new Date('2025-11-30T23:59:59Z')
        }
      },
      orderBy: { date: 'asc' }
    });

    shifts.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0];
      const pointagesJour = parJour.get(dateKey) || [];
      
      if (shift.type === 'présence' && shift.segments) {
        let heuresPrevues = 0;
        shift.segments.forEach(seg => {
          if (!seg.isExtra) {
            const [startH, startM] = seg.start.split(':').map(Number);
            const [endH, endM] = seg.end.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            let diffMinutes = endMinutes - startMinutes;
            if (diffMinutes < 0) diffMinutes += 24 * 60;
            heuresPrevues += diffMinutes / 60;
          }
        });

        const hasPointages = pointagesJour.length > 0;
        const statut = hasPointages ? '✅ Pointages présents' : '❌ AUCUN POINTAGE';
        
        console.log(`${dateKey} | Prévu: ${heuresPrevues.toFixed(1)}h | Pointages: ${pointagesJour.length} | ${statut}`);
      }
    });

    console.log('\n' + '='.repeat(100));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugPointages();
