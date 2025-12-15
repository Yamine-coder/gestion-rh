const prisma = require('./prisma/client');

async function findAllReferences() {
  const userId = 110;
  
  console.log(`\n=== RECHERCHE EXHAUSTIVE DES RÉFÉRENCES À USER ${userId} ===\n`);
  
  // Liste de toutes les requêtes possibles
  const checks = [
    // Relations directes où l'employé est le sujet
    ['Conge', () => prisma.conge.count({ where: { userId } })],
    ['Pointage', () => prisma.pointage.count({ where: { userId } })],
    ['Shift', () => prisma.shift.count({ where: { employeId: userId } })],
    ['Anomalie (employeId)', () => prisma.anomalie.count({ where: { employeId: userId } })],
    ['PasswordReset', () => prisma.passwordReset.count({ where: { userId } })],
    ['notifications', () => prisma.notifications.count({ where: { employe_id: userId } })],
    ['historique_modifications', () => prisma.historique_modifications.count({ where: { employe_id: userId } })],
    ['demandes_modification (employe)', () => prisma.demandes_modification.count({ where: { employe_id: userId } })],
    ['EmployeScore', () => prisma.employeScore.count({ where: { employeId: userId } })],
    ['PaiementExtra (employeId)', () => prisma.paiementExtra.count({ where: { employeId: userId } })],
    ['ExtraPaymentLog (employeId)', () => prisma.extraPaymentLog.count({ where: { employeId: userId } })],
    ['JustificatifNavigo (userId)', () => prisma.justificatifNavigo.count({ where: { userId } })],
    ['DemandeRemplacement (absent)', () => prisma.demandeRemplacement.count({ where: { employeAbsentId: userId } })],
    ['DemandeRemplacement (remplacant)', () => prisma.demandeRemplacement.count({ where: { employeRemplacantId: userId } })],
    ['CandidatureRemplacement', () => prisma.candidatureRemplacement.count({ where: { employeId: userId } })],
    
    // Relations où l'employé est acteur/valideur (FK secondaires)
    ['Anomalie (traitePar)', () => prisma.anomalie.count({ where: { traitePar: userId } })],
    ['PaiementExtra (creePar)', () => prisma.paiementExtra.count({ where: { creePar: userId } })],
    ['PaiementExtra (payePar)', () => prisma.paiementExtra.count({ where: { payePar: userId } })],
    ['ExtraPaymentLog (changedByUserId)', () => prisma.extraPaymentLog.count({ where: { changedByUserId: userId } })],
    ['demandes_modification (valide_par)', () => prisma.demandes_modification.count({ where: { valide_par: userId } })],
    ['DemandeRemplacement (validePar)', () => prisma.demandeRemplacement.count({ where: { validePar: userId } })],
    ['JustificatifNavigo (validePar)', () => prisma.justificatifNavigo.count({ where: { validePar: userId } })],
    ['AnomalieAudit (userId)', () => prisma.anomalieAudit.count({ where: { userId } })],
    ['ShiftCorrection (auteurId)', () => prisma.shiftCorrection.count({ where: { auteurId: userId } })],
    ['ShiftCorrection (approuvePar)', () => prisma.shiftCorrection.count({ where: { approuvePar: userId } })],
    
    // Consignes créées par l'utilisateur
    ['Consigne (createdBy)', () => prisma.consigne.count({ where: { createdBy: userId } })],
  ];
  
  let foundAny = false;
  
  for (const [name, query] of checks) {
    try {
      const count = await query();
      if (count > 0) {
        console.log(`⚠️  ${name}: ${count} enregistrement(s)`);
        foundAny = true;
      }
    } catch (e) {
      // Ignorer les erreurs (champ inexistant, etc)
    }
  }
  
  if (!foundAny) {
    console.log('Aucune référence trouvée dans les tables vérifiées.');
    console.log('\n🔍 Vérification des FK au niveau PostgreSQL...');
    
    // Requête SQL brute pour trouver les FK
    const fks = await prisma.$queryRaw`
      SELECT 
        tc.table_name, 
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'User'
    `;
    
    console.log('\nFK pointant vers User:');
    for (const fk of fks) {
      console.log(`  - ${fk.table_name}.${fk.column_name}`);
      
      // Vérifier si cette table a des données pour cet user
      try {
        const sql = `SELECT COUNT(*) as count FROM "${fk.table_name}" WHERE "${fk.column_name}" = ${userId}`;
        const result = await prisma.$queryRawUnsafe(sql);
        if (result[0].count > 0) {
          console.log(`    ⚠️  ${result[0].count} enregistrement(s) trouvé(s)!`);
        }
      } catch (e) {
        console.log(`    (erreur: ${e.message})`);
      }
    }
  }
  
  await prisma.$disconnect();
}

findAllReferences();
