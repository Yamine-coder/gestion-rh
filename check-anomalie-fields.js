const prisma = require('./server/prisma/client');

async function checkFields() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Anomalie' 
      AND column_name IN ('commentaireManager', 'justificationEmploye', 'fichierJustificatif', 'traitePar', 'traiteAt')
    `;
    console.log('✅ Colonnes trouvées dans Anomalie:', result);
    
    // Vérifier aussi si les tables existent
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ShiftCorrection', 'AnomalieAudit', 'EmployeScore')
    `;
    console.log('✅ Tables supplémentaires:', tables);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkFields();
