// Script de diagnostic des tables et relations DB PostgreSQL via Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyseDatabase() {
  console.log('🔍 ANALYSE COMPLÈTE DES TABLES ET RELATIONS\n');
  
  try {
    // 1. Lister toutes les tables via une requête PostgreSQL brute
    console.log('📋 TABLES EXISTANTES:');
    const tables = await prisma.$queryRaw`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    tables.forEach(table => {
      console.log(`   • ${table.table_name} (${table.table_type})`);
    });

    // 2. Analyser les contraintes FK (tables de liaison potentielles)
    console.log('\n🔗 CONTRAINTES DE CLÉS ÉTRANGÈRES:');
    const foreignKeys = await prisma.$queryRaw`
      SELECT 
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `;

    foreignKeys.forEach(fk => {
      console.log(`   ${fk.source_table}.${fk.source_column} → ${fk.target_table}.${fk.target_column}`);
    });

    // 3. Examiner les index (peuvent révéler des liaisons)
    console.log('\n📊 INDEX (non-PRIMARY):');
    const indexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname;
    `;

    indexes.forEach(idx => {
      console.log(`   ${idx.tablename}: ${idx.indexname}`);
      console.log(`      ${idx.indexdef}`);
    });

    // 4. Compter les enregistrements par table
    console.log('\n🔢 NOMBRE D\'ENREGISTREMENTS PAR TABLE:');
    
    const userCount = await prisma.user.count();
    console.log(`   User: ${userCount}`);
    
    const pointageCount = await prisma.pointage.count();
    console.log(`   Pointage: ${pointageCount}`);
    
    const shiftCount = await prisma.shift.count();
    console.log(`   Shift: ${shiftCount}`);
    
    const anomalieCount = await prisma.anomalie.count();
    console.log(`   Anomalie: ${anomalieCount}`);
    
    const congeCount = await prisma.conge.count();
    console.log(`   Conge: ${congeCount}`);

    // Essayer d'autres tables potentielles
    try {
      const planningCount = await prisma.planning?.count() || 0;
      console.log(`   Planning: ${planningCount}`);
    } catch (e) {
      console.log(`   Planning: n/a (${e.message.split('\n')[0]})`);
    }

    // 5. Analyser spécifiquement les anomalies sans pointages
    console.log('\n⚠️  ANOMALIES SANS POINTAGES CORRESPONDANTS:');
    const anomaliesSansPointages = await prisma.$queryRaw`
      SELECT 
        a.id,
        a."employeId",
        a.type,
        a.date::date as jour,
        u.nom,
        u.prenom
      FROM "Anomalie" a
      JOIN "User" u ON u.id = a."employeId"
      WHERE NOT EXISTS (
        SELECT 1 
        FROM "Pointage" p 
        WHERE p."userId" = a."employeId" 
          AND p.horodatage::date = a.date::date
      )
      ORDER BY a.date DESC, a.type;
    `;

    anomaliesSansPointages.forEach(anom => {
      console.log(`   ID ${anom.id}: ${anom.type} - ${anom.prenom} ${anom.nom} (${anom.jour})`);
    });

    // 6. Vérifier les anomalies qui DEVRAIENT avoir des pointages
    console.log('\n❌ ANOMALIES INCOHÉRENTES (types nécessitant pointages):');
    const anomaliesIncohérentes = await prisma.$queryRaw`
      SELECT 
        a.id,
        a."employeId",
        a.type,
        a.date::date as jour,
        u.nom,
        u.prenom
      FROM "Anomalie" a
      JOIN "User" u ON u.id = a."employeId"
      WHERE a.type IN ('retard', 'depart_anticipe', 'heures_sup', 'hors_plage')
        AND NOT EXISTS (
          SELECT 1 
          FROM "Pointage" p 
          WHERE p."userId" = a."employeId" 
            AND p.horodatage::date = a.date::date
        )
      ORDER BY a.date DESC, a.type;
    `;

    if (anomaliesIncohérentes.length === 0) {
      console.log('   ✅ Aucune anomalie incohérente trouvée');
    } else {
      anomaliesIncohérentes.forEach(anom => {
        console.log(`   ⚠️  ID ${anom.id}: ${anom.type} - ${anom.prenom} ${anom.nom} (${anom.jour})`);
      });
    }

    // 7. Statistiques des relations
    console.log('\n📈 STATISTIQUES DE COHÉRENCE:');
    
    const statsAnomaliesPointages = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_anomalies,
        COUNT(CASE WHEN EXISTS(
          SELECT 1 FROM "Pointage" p 
          WHERE p."userId" = a."employeId" 
            AND p.horodatage::date = a.date::date
        ) THEN 1 END) as avec_pointages,
        COUNT(CASE WHEN NOT EXISTS(
          SELECT 1 FROM "Pointage" p 
          WHERE p."userId" = a."employeId" 
            AND p.horodatage::date = a.date::date
        ) THEN 1 END) as sans_pointages
      FROM "Anomalie" a;
    `;

    const stats = statsAnomaliesPointages[0];
    console.log(`   Anomalies totales: ${stats.total_anomalies}`);
    console.log(`   Avec pointages: ${stats.avec_pointages}`);
    console.log(`   Sans pointages: ${stats.sans_pointages}`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyseDatabase();
