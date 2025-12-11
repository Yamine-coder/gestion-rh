const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🧪 Test direct de checkPauseNonPrise pour Jordan\n');
    
    // Récupérer le shift de Jordan
    const shift = await prisma.shift.findFirst({
      where: {
        employeId: 110,
        date: {
          gte: new Date('2025-12-05T00:00:00Z'),
          lt: new Date('2025-12-06T00:00:00Z')
        }
      }
    });
    
    if (!shift) {
      console.log('❌ Aucun shift trouvé pour Jordan le 5 décembre');
      return;
    }
    
    console.log('✅ Shift trouvé:', shift.id);
    console.log('   Segments:', JSON.stringify(shift.segments));
    
    // Récupérer les pointages
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: 110,
        horodatage: {
          gte: new Date('2025-12-05T00:00:00Z'),
          lt: new Date('2025-12-06T00:00:00Z')
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    const entrees = pointages.filter(p => p.type === 'entree' || p.type === 'arrivee');
    const sorties = pointages.filter(p => p.type === 'sortie' || p.type === 'depart');
    
    console.log('\n📍 Pointages:');
    console.log('   Entrées:', entrees.map(e => new Date(e.horodatage).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })));
    console.log('   Sorties:', sorties.map(s => new Date(s.horodatage).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })));
    
    // Simuler la logique de checkPauseNonPrise
    const segments = shift.segments || [];
    const pauseSegments = segments.filter(seg => {
      const segType = seg.type?.toLowerCase();
      return segType === 'pause' || segType === 'break';
    });
    
    console.log('\n🔍 Analyse pause:');
    console.log('   Segments de pause trouvés:', pauseSegments.length);
    
    if (pauseSegments.length === 0) {
      console.log('   Pas de pause prévue');
      return;
    }
    
    if (entrees.length === 1 && sorties.length === 1) {
      const entree = new Date(entrees[0].horodatage);
      const sortie = new Date(sorties[0].horodatage);
      
      const dureeMinutes = Math.round((sortie - entree) / (1000 * 60));
      console.log(`   ✅ 1 entrée + 1 sortie = probable pause non prise`);
      console.log(`   Durée travaillée: ${dureeMinutes} minutes (${(dureeMinutes/60).toFixed(1)}h)`);
      
      const pausePrevue = pauseSegments[0];
      const pauseDebut = pausePrevue.start || pausePrevue.debut;
      const pauseFin = pausePrevue.end || pausePrevue.fin;
      
      console.log(`   Pause prévue: ${pauseDebut} - ${pauseFin}`);
      
      if (pauseDebut && pauseFin) {
        const [pStartH, pStartM] = pauseDebut.split(':').map(Number);
        const [pEndH, pEndM] = pauseFin.split(':').map(Number);
        const pauseDureeMinutes = (pEndH * 60 + pEndM) - (pStartH * 60 + pStartM);
        
        console.log(`   Durée pause: ${pauseDureeMinutes} minutes`);
        
        // Recréer les dates de pause pour le même jour que l'entrée
        const pauseDebutDate = new Date(entree);
        pauseDebutDate.setHours(pStartH, pStartM, 0, 0);
        const pauseFinDate = new Date(entree);
        pauseFinDate.setHours(pEndH, pEndM, 0, 0);
        
        console.log('\n📊 Comparaison:');
        console.log(`   Entrée: ${entree.toISOString()}`);
        console.log(`   Sortie: ${sortie.toISOString()}`);
        console.log(`   Pause début: ${pauseDebutDate.toISOString()}`);
        console.log(`   Pause fin: ${pauseFinDate.toISOString()}`);
        console.log(`   entree <= pauseDebut? ${entree <= pauseDebutDate}`);
        console.log(`   sortie >= pauseFin? ${sortie >= pauseFinDate}`);
        
        if (entree <= pauseDebutDate && sortie >= pauseFinDate) {
          console.log('\n🚨 PAUSE NON PRISE DÉTECTÉE !');
          console.log(`   => Anomalie pause_non_prise à créer`);
          console.log(`   => ${(pauseDureeMinutes/60).toFixed(1)}h supplémentaires à comptabiliser`);
          
          // Créer les anomalies maintenant
          const dateStr = '2025-12-05';
          
          // Supprimer d'abord les anciennes anomalies
          await prisma.anomalie.deleteMany({
            where: {
              employeId: 110,
              date: {
                gte: new Date('2025-12-05T00:00:00Z'),
                lt: new Date('2025-12-06T00:00:00Z')
              }
            }
          });
          
          // Créer pause_non_prise
          await prisma.anomalie.create({
            data: {
              employeId: 110,
              date: new Date('2025-12-05T11:00:00.000Z'),
              type: 'pause_non_prise',
              gravite: dureeMinutes > 360 ? 'haute' : 'moyenne',
              statut: 'en_attente',
              details: {
                shiftId: shift.id,
                pausePrevue: `${pauseDebut} - ${pauseFin}`,
                pauseDureeMinutes,
                dureeTravailContinuMinutes: dureeMinutes,
                detecteAutomatiquement: true
              },
              description: `Pause non prise - ${(dureeMinutes / 60).toFixed(1)}h de travail continu`
            }
          });
          console.log('   ✅ pause_non_prise créée');
          
          // Créer depassement_amplitude si > 6h
          if (dureeMinutes > 360) {
            await prisma.anomalie.create({
              data: {
                employeId: 110,
                date: new Date('2025-12-05T11:00:00.000Z'),
                type: 'depassement_amplitude',
                gravite: 'critique',
                statut: 'en_attente',
                details: {
                  shiftId: shift.id,
                  dureeTravailContinuMinutes: dureeMinutes,
                  seuilLegal: 360,
                  detecteAutomatiquement: true
                },
                description: `⚠️ Violation code du travail - ${(dureeMinutes / 60).toFixed(1)}h continu sans pause`
              }
            });
            console.log('   ✅ depassement_amplitude créée');
          }
          
          // Créer heures_sup_a_valider
          if (pauseDureeMinutes > 0) {
            const heuresSupp = (pauseDureeMinutes / 60).toFixed(1);
            await prisma.anomalie.create({
              data: {
                employeId: 110,
                date: new Date('2025-12-05T11:00:00.000Z'),
                type: 'heures_sup_a_valider',
                gravite: 'basse',
                statut: 'en_attente',
                details: {
                  shiftId: shift.id,
                  pauseNonPrise: `${pauseDebut} - ${pauseFin}`,
                  pauseDureeMinutes,
                  heuresSupp,
                  raison: 'pause_non_prise',
                  detecteAutomatiquement: true
                },
                description: `+${heuresSupp}h supplémentaires - Pause de ${pauseDureeMinutes}min non prise (travaillée)`
              }
            });
            console.log('   ✅ heures_sup_a_valider créée');
          }
          
          // Afficher le résumé
          console.log('\n📋 Anomalies créées:');
          const anomalies = await prisma.anomalie.findMany({
            where: {
              employeId: 110,
              date: {
                gte: new Date('2025-12-05T00:00:00Z'),
                lt: new Date('2025-12-06T00:00:00Z')
              }
            }
          });
          anomalies.forEach(a => {
            console.log(`   - ${a.type}: ${a.description}`);
          });
          
        } else {
          console.log('\n✅ Pause probablement prise (horaires ok)');
        }
      }
    } else {
      console.log(`   ${entrees.length} entrées, ${sorties.length} sorties - cas complexe`);
    }
    
  } catch (error) {
    console.error('Erreur:', error.message, error.stack);
  } finally {
    await prisma.$disconnect();
  }
})();
