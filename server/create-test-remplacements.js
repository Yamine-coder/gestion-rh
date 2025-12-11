/**
 * Script pour créer des demandes de remplacement de test
 * Usage: node create-test-remplacements.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Création de demandes de remplacement de test...\n');

  try {
    // Récupérer quelques employés actifs
    const employes = await prisma.user.findMany({
      where: { 
        role: 'employee',
        statut: 'actif'
      },
      take: 5,
      orderBy: { id: 'asc' }
    });

    if (employes.length < 2) {
      console.log('❌ Il faut au moins 2 employés actifs pour créer des remplacements');
      return;
    }

    console.log(`📋 Employés trouvés: ${employes.map(e => `${e.prenom} ${e.nom}`).join(', ')}`);

    // Créer des shifts futurs pour les employés qui n'en ont pas
    const today = new Date();
    const demain = new Date(today);
    demain.setDate(demain.getDate() + 1);
    const aprèsDemain = new Date(today);
    aprèsDemain.setDate(aprèsDemain.getDate() + 2);
    const dans3Jours = new Date(today);
    dans3Jours.setDate(dans3Jours.getDate() + 3);

    // Supprimer les anciennes demandes de test
    await prisma.candidatureRemplacement.deleteMany({});
    await prisma.demandeRemplacement.deleteMany({});
    console.log('🧹 Anciennes demandes supprimées');

    // Créer des shifts futurs si nécessaire
    const shiftsACreer = [
      { employeId: employes[0].id, date: demain, type: 'matin', segments: JSON.stringify([{ type: 'travail', start: '06:00', end: '14:00' }]) },
      { employeId: employes[1].id, date: aprèsDemain, type: 'soir', segments: JSON.stringify([{ type: 'travail', start: '14:00', end: '22:00' }]) },
      { employeId: employes[0].id, date: dans3Jours, type: 'coupure', segments: JSON.stringify([{ type: 'travail', start: '10:00', end: '14:00' }, { type: 'pause', start: '14:00', end: '18:00' }, { type: 'travail', start: '18:00', end: '22:00' }]) },
    ];

    const shiftsCreés = [];
    for (const shiftData of shiftsACreer) {
      // Vérifier si le shift existe déjà
      const existant = await prisma.shift.findFirst({
        where: {
          employeId: shiftData.employeId,
          date: {
            gte: new Date(shiftData.date.toISOString().split('T')[0] + 'T00:00:00Z'),
            lt: new Date(shiftData.date.toISOString().split('T')[0] + 'T23:59:59Z')
          }
        }
      });

      if (existant) {
        shiftsCreés.push(existant);
        console.log(`  ✓ Shift existant utilisé: ${existant.id}`);
      } else {
        const nouveau = await prisma.shift.create({
          data: shiftData
        });
        shiftsCreés.push(nouveau);
        console.log(`  ✓ Shift créé: ${nouveau.id}`);
      }
    }

    // Créer des demandes de remplacement
    const demandes = [
      {
        shiftId: shiftsCreés[0].id,
        employeAbsentId: employes[0].id,
        type: 'besoin',
        motif: 'Rendez-vous médical urgent',
        priorite: 'urgente',
        dateExpiration: demain
      },
      {
        shiftId: shiftsCreés[1].id,
        employeAbsentId: employes[1].id,
        type: 'besoin',
        motif: 'Événement familial',
        priorite: 'normale',
        dateExpiration: aprèsDemain
      },
      {
        shiftId: shiftsCreés[2].id,
        employeAbsentId: employes[0].id,
        type: 'besoin',
        motif: 'Formation externe',
        priorite: 'haute',
        dateExpiration: dans3Jours
      }
    ];

    for (const demandeData of demandes) {
      const demande = await prisma.demandeRemplacement.create({
        data: demandeData,
        include: {
          shift: true,
          employeAbsent: { select: { prenom: true, nom: true } }
        }
      });
      console.log(`  ✓ Demande créée: ${demande.employeAbsent.prenom} ${demande.employeAbsent.nom} - ${demande.motif} (${demande.priorite})`);
    }

    console.log('\n✅ Données de test créées avec succès!');
    console.log('\n📌 Pour voir les remplacements:');
    console.log('   1. Connectez-vous en tant qu\'un employé autre que ceux qui ont créé les demandes');
    console.log('   2. Allez sur l\'accueil > Onglet "Rempl."');
    console.log(`\n👥 Employés ayant des demandes: ${employes[0].prenom}, ${employes[1].prenom}`);
    console.log(`👤 Autres employés pouvant candidater: ${employes.slice(2).map(e => e.prenom).join(', ') || 'Créez plus d\'employés'}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
