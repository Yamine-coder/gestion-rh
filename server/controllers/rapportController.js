// server/controllers/rapportController.js

const prisma = require('../prisma/client');
const { toLocalDateString } = require('../utils/dateUtils');
const { isEntree, isSortie } = require('../utils/pointageTypeUtils');
const { parseSegments } = require('../utils/segmentUtils');
const { getBusinessDay } = require('../utils/businessDayUtils');

// Récupérer le rapport d'heures pour un employé
const getRapportEmploye = async (req, res) => {
  try {
    const { employeId } = req.params;
    const { periode = 'mois', mois } = req.query;
    
    // Définir les dates de début et fin selon la période
    let dateDebut, dateFin;
    const maintenant = new Date();
    
    switch (periode) {
      case 'semaine':
        // Début de la semaine (lundi)
        dateDebut = new Date(maintenant);
        dateDebut.setDate(maintenant.getDate() - ((maintenant.getDay() + 6) % 7));
        dateDebut.setHours(0, 0, 0, 0);
        
        // Fin de la semaine (dimanche)
        dateFin = new Date(dateDebut);
        dateFin.setDate(dateDebut.getDate() + 6);
        dateFin.setHours(23, 59, 59, 999);
        break;
        
      case 'mois':
        if (mois) {
          // Mois spécifique (format YYYY-MM)
          const [annee, moisNum] = mois.split('-').map(Number);
          dateDebut = new Date(annee, moisNum - 1, 1);
          dateFin = new Date(annee, moisNum, 0, 23, 59, 59, 999);
        } else {
          // Mois actuel
          dateDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
          dateFin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59, 999);
        }
        break;
        
      case 'trimestre':
        // Trimestre actuel
        const trimestreActuel = Math.floor(maintenant.getMonth() / 3);
        dateDebut = new Date(maintenant.getFullYear(), trimestreActuel * 3, 1);
        dateFin = new Date(maintenant.getFullYear(), (trimestreActuel + 1) * 3, 0, 23, 59, 59, 999);
        break;
        
      default:
        throw new Error('Période non supportée');
    }

    // Récupérer les shifts (planifications)
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: parseInt(employeId),
        date: {
          gte: dateDebut,
          lte: dateFin
        }
      }
      // segments est un champ Json, pas une relation, donc on ne l'inclut pas
    });

    // Récupérer les pointages réels (+6h pour sorties post-minuit night shifts)
    const dateFinEtendue = new Date(dateFin);
    dateFinEtendue.setHours(dateFinEtendue.getHours() + 6);
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: parseInt(employeId),
        horodatage: {
          gte: dateDebut,
          lte: dateFinEtendue
        }
      }
    });

    // Récupérer les congés
    const conges = await prisma.conge.findMany({
      where: {
        userId: parseInt(employeId),
        statut: 'approuvé',
        OR: [
          {
            dateDebut: {
              gte: dateDebut,
              lte: dateFin
            }
          },
          {
            dateFin: {
              gte: dateDebut,
              lte: dateFin
            }
          },
          {
            AND: [
              { dateDebut: { lte: dateDebut } },
              { dateFin: { gte: dateFin } }
            ]
          }
        ]
      }
    });

    // Afficher les premiers shifts pour debug
    if (shifts.length > 0) {
      
      // Test du calcul pour le premier shift
      if (shifts[0].segments && Array.isArray(shifts[0].segments)) {
        shifts[0].segments.forEach((segment, idx) => {
          const heureDebut = segment.heureDebut || segment.start;
          const heureFin = segment.heureFin || segment.end;
        });
      }
    } else {
    }

    // Calculer les statistiques
    let heuresPreveues = 0;
    let heuresTravaillees = 0;
    let nombreRetards = 0;
    let retards = [];
    let heuresSupplementaires = 0;
    let heuresParJour = [];

    // Calculer les heures prévues à partir des shifts
    shifts.forEach((shift, index) => {      
      const segments = parseSegments(shift.segments);
      
      if (segments.length > 0) {
        segments.forEach((segment, segIndex) => {
          // Vérifier les deux formats possibles : heureDebut/heureFin et start/end
          const heureDebut = segment.heureDebut || segment.start;
          const heureFin = segment.heureFin || segment.end;
          
          if (heureDebut && heureFin) {
            try {
              const [heuresDebut, minutesDebut] = heureDebut.split(':').map(Number);
              const [heuresFin, minutesFin] = heureFin.split(':').map(Number);
              
              const debut = heuresDebut + minutesDebut / 60;
              let fin = heuresFin + minutesFin / 60;
              
              // Gestion des shifts de nuit (ex: 22:00 → 06:00)
              if (fin <= debut) {
                fin += 24;
              }
              
              const duree = fin - debut;
              heuresPreveues += duree;
              
            } catch (error) {
              console.error(`    -> Erreur parsing:`, error);
            }
          } else {
          }
        });
      } else {
      }
    });
    
    // Calculer les heures travaillées et retards à partir des pointages
    // Grouper par jour business (cutoff 05:00 Paris) — remplace grouperPointagesAvecNuit
    const pointagesParDate = {};
    pointages.forEach(p => {
      if (!p.horodatage) return;
      const businessDay = getBusinessDay(p.horodatage);
      if (!pointagesParDate[businessDay]) pointagesParDate[businessDay] = [];
      pointagesParDate[businessDay].push(p);
    });

    // Analyser chaque jour — CALCUL PAR PAIRES entrée/sortie (soustrait les pauses)
    Object.entries(pointagesParDate).forEach(([date, pointagesJour]) => {
      const shiftJour = shifts.find(s => toLocalDateString(s.date) === date);
      
      let heuresJour = 0;
      let retardJour = 0;
      
      if (pointagesJour.length >= 2) {
        // Trier par horodatage
        pointagesJour.sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage));
        
        // Calculer les heures par paires ENTRÉE→SORTIE (exclut les pauses automatiquement)
        let i = 0;
        while (i < pointagesJour.length - 1) {
          const p1 = pointagesJour[i];
          const p2 = pointagesJour[i + 1];
          
          if (isEntree(p1.type) && isSortie(p2.type)) {
            const debut = new Date(p1.horodatage);
            const fin = new Date(p2.horodatage);
            const dureeH = (fin - debut) / (1000 * 60 * 60);
            if (dureeH > 0 && dureeH < 16) { // Sanity: max 16h par bloc
              heuresJour += dureeH;
            }
            i += 2; // Passer à la paire suivante
          } else {
            i += 1; // Avancer d'un cran (pointage orphelin)
          }
        }
        
        heuresTravaillees += heuresJour;
        
        // Calculer le retard si il y a un shift prévu
        if (shiftJour && shiftJour.segments && Array.isArray(shiftJour.segments) && shiftJour.segments.length > 0) {
          const premierSegment = shiftJour.segments[0];
          const heureDebutSegment = premierSegment.heureDebut || premierSegment.start;
          if (premierSegment && heureDebutSegment) {
            const premierPointageEntree = pointagesJour.find(p => isEntree(p.type));
            if (premierPointageEntree) {
              const heureDebut = new Date(premierPointageEntree.horodatage);
              const [heures, minutes] = heureDebutSegment.split(':').map(Number);
              const heurePreveueDebut = new Date(heureDebut);
              heurePreveueDebut.setHours(heures, minutes, 0, 0);
              
              if (heureDebut > heurePreveueDebut) {
                retardJour = (heureDebut - heurePreveueDebut) / (1000 * 60);
                nombreRetards++;
                retards.push({
                  date,
                  duree: Math.round(retardJour)
                });
              }
            }
          }
        }
      }
      
      // Données pour le graphique
      const heuresPreveuesJour = shiftJour && Array.isArray(shiftJour.segments) ? 
        shiftJour.segments.reduce((total, segment) => {
          const heureDebut = segment.heureDebut || segment.start;
          const heureFin = segment.heureFin || segment.end;
          if (segment && heureDebut && heureFin) {
            const [heuresDebut, minutesDebut] = heureDebut.split(':').map(Number);
            const [heuresFin, minutesFin] = heureFin.split(':').map(Number);
            
            const debut = heuresDebut + minutesDebut / 60;
            let fin = heuresFin + minutesFin / 60;
            if (fin <= debut) fin += 24; // Nuit: 22:00→06:00 = 8h
            
            return total + (fin - debut);
          }
          return total;
        }, 0) : 0;
        
      heuresParJour.push({
        jour: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        prevues: Math.round(heuresPreveuesJour * 10) / 10,
        travaillees: Math.round(heuresJour * 10) / 10
      });
    });

    // Calculer les heures supplémentaires
    heuresSupplementaires = Math.max(0, heuresTravaillees - heuresPreveues);

    // Calculer le taux de ponctualité
    const totalJoursTravailles = Object.keys(pointagesParDate).length;
    const tauxPonctualite = totalJoursTravailles > 0 ? 
      Math.round(((totalJoursTravailles - nombreRetards) / totalJoursTravailles) * 100) : 100;

    // Calculer les jours de congés
    let joursConges = 0;
    conges.forEach(conge => {
      const debutConge = new Date(Math.max(conge.dateDebut, dateDebut));
      const finConge = new Date(Math.min(conge.dateFin, dateFin));
      
      // Calculer le nombre de jours ouvrables
      const diffTime = finConge - debutConge;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      joursConges += Math.max(0, diffDays);
    });

    // Calculer les absences
    const joursPreveusTotal = shifts.length;
    const joursPresents = Object.keys(pointagesParDate).length;
    const absencesJustifiees = joursConges;
    const absencesInjustifiees = Math.max(0, joursPreveusTotal - joursPresents - joursConges);

    // Données pour le graphique de répartition des absences
    const repartitionAbsences = [
      { name: 'presence', value: joursPresents, label: 'Présences' },
      { name: 'absence_justifiee', value: absencesJustifiees, label: 'Absences justifiées' },
      { name: 'absence_injustifiee', value: absencesInjustifiees, label: 'Absences injustifiées' }
    ].filter(item => item.value > 0);

    const rapport = {
      heuresPreveues: Math.round(heuresPreveues * 10) / 10,
      heuresTravaillees: Math.round(heuresTravaillees * 10) / 10,
      heuresSupplementaires: Math.round(heuresSupplementaires * 10) / 10,
      tauxPonctualite,
      joursConges,
      nombreRetards,
      absencesJustifiees,
      absencesInjustifiees,
      retards: retards.slice(0, 10), // Limiter à 10 retards max
      repartitionAbsences,
      heuresParJour: heuresParJour.slice(-14) // 14 derniers jours max
    };

    res.json(rapport);
  } catch (error) {
    console.error('Erreur lors de la génération du rapport:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération du rapport',
      error: error.message 
    });
  }
};

// Exporter le rapport en PDF (placeholder - à implémenter avec une lib PDF)
const exporterRapportEmploye = async (req, res) => {
  try {
    // TODO: Implémenter l'export PDF avec une bibliothèque comme puppeteer ou jsPDF
    res.status(501).json({ 
      message: 'Export PDF non encore implémenté' 
    });
  } catch (error) {
    console.error('Erreur lors de l\'export du rapport:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'export du rapport',
      error: error.message 
    });
  }
};

module.exports = {
  getRapportEmploye,
  exporterRapportEmploye
};
