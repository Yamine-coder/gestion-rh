const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifierDonneesSurveillance() {
    try {
        console.log('🔍 Vérification des données pour la section "À surveiller"...\n');
        
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        // 1. Nombre total d'employés
        const totalEmployes = await prisma.user.count({ where: { role: 'employee' } });
        console.log(`👥 Total employés: ${totalEmployes}`);
        
        // 2. Début de la semaine
        const debutSemaine = new Date();
        debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());
        debutSemaine.setHours(0, 0, 0, 0);
        
        console.log(`📅 Période analysée: ${debutSemaine.toLocaleDateString()} au ${today.toLocaleDateString()}`);
        
        // 3. Pointages cette semaine
        const pointagesSemaine = await prisma.pointage.findMany({
            where: {
                horodatage: { gte: debutSemaine, lte: today },
                type: 'arrivee'
            },
            include: { user: true }
        });
        
        console.log(`\n📊 Pointages d'arrivée cette semaine: ${pointagesSemaine.length}`);
        
        // 4. Employés qui ont pointé cette semaine
        const employesAyantPointe = new Set(pointagesSemaine.map(p => p.userId));
        console.log(`✅ Employés ayant pointé: ${employesAyantPointe.size}`);
        console.log(`❌ Employés n'ayant pas pointé: ${totalEmployes - employesAyantPointe.size}`);
        
        // 5. Calcul des employés "en retard" (simulation)
        const joursOuvresSemaine = Math.min(5, Math.ceil((today - debutSemaine) / (1000 * 60 * 60 * 24)));
        const pointagesAttendus = totalEmployes * joursOuvresSemaine;
        const employesEnRetard = Math.max(0, Math.min(totalEmployes, Math.ceil((pointagesAttendus - pointagesSemaine.length) / joursOuvresSemaine)));
        
        console.log(`\n📈 Calculs pour "À surveiller":`);
        console.log(`📊 Jours ouvrés cette semaine: ${joursOuvresSemaine}`);
        console.log(`🎯 Pointages attendus: ${pointagesAttendus}`);
        console.log(`⚠️ Employés estimés en retard: ${employesEnRetard}`);
        
        // 6. Shifts cette semaine pour estimer les heures < 20h
        const shiftsEmployes = await prisma.shift.findMany({
            where: {
                date: { gte: debutSemaine, lte: today }
            },
            include: { employe: true }
        });
        
        console.log(`📋 Shifts cette semaine: ${shiftsEmployes.length}`);
        
        // Grouper par employé pour calculer les heures
        const heuresParEmploye = {};
        shiftsEmployes.forEach(shift => {
            if (!heuresParEmploye[shift.employeId]) {
                heuresParEmploye[shift.employeId] = { nom: shift.employe?.nom || 'Inconnu', totalMinutes: 0 };
            }
            
            // Calculer les heures du shift
            if (shift.segments && Array.isArray(shift.segments)) {
                shift.segments.forEach(segment => {
                    if (segment.debut && segment.fin) {
                        const debut = new Date(`1970-01-01T${segment.debut}:00`);
                        const fin = new Date(`1970-01-01T${segment.fin}:00`);
                        const minutes = (fin - debut) / (1000 * 60);
                        heuresParEmploye[shift.employeId].totalMinutes += minutes;
                    }
                });
            }
        });
        
        console.log(`\n⏰ Analyse des heures travaillées:`);
        let employesMoinsDe20h = 0;
        
        Object.entries(heuresParEmploye).forEach(([employeId, data]) => {
            const heures = Math.floor(data.totalMinutes / 60);
            const minutes = data.totalMinutes % 60;
            const heuresFormatees = `${heures}h${minutes.toString().padStart(2, '0')}`;
            
            console.log(`👤 Employé ${data.nom}: ${heuresFormatees}`);
            
            if (data.totalMinutes < 1200) { // Moins de 20h (20 * 60 = 1200 minutes)
                employesMoinsDe20h++;
            }
        });
        
        console.log(`\n🔍 Résultats finaux pour "À surveiller":`);
        console.log(`⚠️ Employés en retard: ${employesEnRetard}`);
        console.log(`⏰ Employés avec moins de 20h: ${employesMoinsDe20h}`);
        console.log(`📊 Total éléments à surveiller: ${employesEnRetard + employesMoinsDe20h}`);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifierDonneesSurveillance();
