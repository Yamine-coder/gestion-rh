/**
 * Analyse approfondie des anomalies restantes
 * Croise chaque anomalie avec les shifts et pointages réels
 * pour identifier les faux positifs et comprendre les patterns
 */

const { PrismaClient } = require('@prisma/client');
const { isEntree, isSortie } = require('../utils/pointageTypeUtils');

const prisma = new PrismaClient();

function getBusinessDayBoundsUTC(dateStr) {
  const CUTOFF = 5;
  const midday = new Date(`${dateStr}T12:00:00Z`);
  const parisStr = midday.toLocaleString('en-US', { timeZone: 'Europe/Paris', hour12: false });
  const parisHour = new Date(parisStr).getHours();
  const utcHour = midday.getUTCHours();
  const offsetHours = parisHour - utcHour;
  const start = new Date(`${dateStr}T${String(CUTOFF).padStart(2, '0')}:00:00.000Z`);
  start.setUTCHours(start.getUTCHours() - offsetHours);
  const nextDay = new Date(`${dateStr}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];
  const end = new Date(`${nextDayStr}T${String(CUTOFF).padStart(2, '0')}:00:00.000Z`);
  end.setUTCHours(end.getUTCHours() - offsetHours);
  end.setUTCMilliseconds(-1);
  return { start, end };
}

function toParisTime(d) {
  return new Date(d).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false });
}

function toParisDateTime(d) {
  return new Date(d).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}

function parseSegments(shift) {
  let segments = shift?.segments || [];
  if (typeof segments === 'string') {
    try { segments = JSON.parse(segments); } catch { segments = []; }
  }
  return Array.isArray(segments) ? segments : [];
}

async function analyzeAnomalie(a) {
  const dateStr = a.date.toISOString().split('T')[0];
  const { start, end } = getBusinessDayBoundsUTC(dateStr);
  
  // Get shift
  const shift = await prisma.shift.findFirst({
    where: {
      employeId: a.employeId,
      date: new Date(`${dateStr}T00:00:00.000Z`),
    }
  });
  
  // Get pointages for the business day
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: a.employeId,
      horodatage: { gte: start, lte: end }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  const entrees = pointages.filter(p => isEntree(p.type));
  const sorties = pointages.filter(p => isSortie(p.type));
  
  const segments = parseSegments(shift);
  
  return {
    anomalie: a,
    dateStr,
    shift,
    segments,
    pointages,
    entrees,
    sorties,
    nom: `${a.employe?.prenom} ${a.employe?.nom}`,
  };
}

async function main() {
  const anomalies = await prisma.anomalie.findMany({
    where: { statut: 'en_attente' },
    include: { employe: { select: { nom: true, prenom: true } } },
    orderBy: [{ type: 'asc' }, { date: 'asc' }]
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`  ANALYSE APPROFONDIE - ${anomalies.length} ANOMALIES RESTANTES`);
  console.log(`${'='.repeat(80)}\n`);

  // Group by type
  const byType = {};
  anomalies.forEach(a => {
    if (!byType[a.type]) byType[a.type] = [];
    byType[a.type].push(a);
  });

  const fauxPositifs = [];
  const vrais = [];
  const douteux = [];

  for (const [type, list] of Object.entries(byType)) {
    console.log(`\n${'━'.repeat(80)}`);
    console.log(`  ${type.toUpperCase()} (${list.length})`);
    console.log(`${'━'.repeat(80)}`);

    for (const a of list) {
      const data = await analyzeAnomalie(a);
      const { dateStr, shift, segments, pointages, entrees, sorties, nom } = data;
      
      const ptStr = pointages.map(p => `${isEntree(p.type) ? '→' : '←'}${toParisTime(p.horodatage)}`).join(' ');
      const segStr = segments.map(s => `${s.debut || s.start}-${s.fin || s.end}`).join(', ');
      
      let verdict = '?';
      let reason = '';

      // ═══════════════════════════════════════════════════════════
      // ANALYSE PAR TYPE
      // ═══════════════════════════════════════════════════════════
      
      switch (type) {
        case 'extra_potentiel': {
          // Check: "Départ Xh après la fin" — souvent faux pour shifts de nuit
          // Le scheduler compare au segment end, mais pour un shift 18:00-00:00,
          // "fin" = 00:00 et le départ à 23:43 calcule 23h43 de sup au lieu de 17min avant
          const desc = a.description || '';
          const details = a.details || {};
          
          // Extraire les heures depuis la description
          const matchDepart = desc.match(/Départ (\d+)h(\d+)?min? après la fin/);
          const matchArrivee = desc.match(/Arrivée (\d+)h?(\d+)?min? en avance/);
          
          if (matchDepart) {
            const heuresSup = parseInt(matchDepart[1]) + (parseInt(matchDepart[2] || 0) / 60);
            
            // Si >10h de "sup", c'est forcément un bug de calcul
            if (heuresSup > 10) {
              verdict = 'FAUX';
              reason = `${heuresSup.toFixed(1)}h de sup impossible - bug calcul nuit`;
            } else {
              // Recalculer manuellement
              const lastSeg = segments[segments.length - 1];
              if (lastSeg) {
                const finPrevue = lastSeg.fin || lastSeg.end;
                const [fh, fm] = finPrevue.split(':').map(Number);
                const finMin = fh * 60 + fm;
                
                // Trouver le dernier pointage de sortie
                const lastSortie = sorties[sorties.length - 1];
                if (lastSortie) {
                  const sortieParisStr = toParisTime(lastSortie.horodatage);
                  const [sh, sm] = sortieParisStr.split(':').map(Number);
                  let sortieMin = sh * 60 + sm;
                  
                  // Si shift de nuit (fin <= début ou fin < 06:00)
                  const debutPremierSeg = segments[0]?.debut || segments[0]?.start || '00:00';
                  const [dh] = debutPremierSeg.split(':').map(Number);
                  const isNuit = fh < dh || fh < 6;
                  
                  // Calcul correct de l'écart
                  let ecart;
                  if (isNuit && sortieMin > finMin + 720) {
                    // Sortie avant minuit, fin après minuit → sortie est AVANT la fin
                    ecart = -(finMin + 1440 - sortieMin);
                  } else if (finMin === 0 && sortieMin > 720) {
                    // fin = 00:00 (minuit), sortie à 23:xx → en fait -Xmin
                    ecart = sortieMin - 1440; // négatif = parti avant
                  } else if (sortieMin < finMin && finMin - sortieMin > 720) {
                    // sortie après minuit (ex 00:07), fin = 00:00 → +7min
                    ecart = sortieMin + 1440 - finMin;
                  } else {
                    ecart = sortieMin - finMin;
                  }
                  
                  const ecartH = Math.abs(ecart) / 60;
                  
                  if (Math.abs(ecart) < 30) {
                    verdict = 'FAUX';
                    reason = `Écart réel: ${ecart > 0 ? '+' : ''}${ecart}min (quasi ponctuel)`;
                  } else if (heuresSup > 5 && ecartH < 2) {
                    verdict = 'FAUX';
                    reason = `Annoncé ${heuresSup.toFixed(1)}h mais écart réel: ${ecart > 0 ? '+' : ''}${ecart}min`;
                  } else if (ecart <= 0) {
                    verdict = 'FAUX';
                    reason = `Parti ${Math.abs(ecart)}min AVANT la fin, pas après`;
                  } else if (ecartH > 2) {
                    verdict = 'DOUTEUX';
                    reason = `Écart réel: +${ecart}min (${ecartH.toFixed(1)}h) — vérifier manuellement`;
                  } else {
                    verdict = 'VRAI';
                    reason = `Extra réel: +${ecart}min`;
                  }
                } else {
                  verdict = 'DOUTEUX';
                  reason = 'Pas de pointage sortie trouvé';
                }
              }
            }
          } else if (matchArrivee) {
            const minutesAvance = parseInt(matchArrivee[1]) * 60 + parseInt(matchArrivee[2] || 0);
            if (minutesAvance >= 30 && minutesAvance <= 120) {
              verdict = 'VRAI';
              reason = `Arrivée ${minutesAvance}min en avance — extra légitime`;
            } else if (minutesAvance < 30) {
              verdict = 'FAUX';
              reason = `Seulement ${minutesAvance}min en avance — tolérance normale`;
            } else {
              verdict = 'DOUTEUX';
              reason = `${minutesAvance}min en avance — vérifier si pas erreur pointage`;
            }
          }
          break;
        }
        
        case 'cloture_auto_journee': {
          // Clôture auto = sortie jamais pointée
          // FAUX si un pointage de sortie existe réellement
          if (sorties.length >= entrees.length && entrees.length > 0) {
            verdict = 'FAUX';
            reason = `${entrees.length}in/${sorties.length}out — sortie bien pointée`;
          } else if (entrees.length === 0) {
            // Pas de pointage du tout — doublon avec absence_injustifiee probablement  
            verdict = 'DOUBLON';
            reason = `Aucun pointage — déjà couvert par absence_injustifiee`;
          } else {
            verdict = 'VRAI';
            reason = `${entrees.length}in/${sorties.length}out — sortie manquante`;
          }
          break;
        }
        
        case 'missing_out': {
          // Sortie manquante — déjà nettoyé les complets, mais re-vérifier
          if (sorties.length >= entrees.length && entrees.length > 0) {
            verdict = 'FAUX';
            reason = `${entrees.length}in/${sorties.length}out complet`;
          } else {
            verdict = 'VRAI';
            reason = `${entrees.length}in/${sorties.length}out`;
          }
          break;
        }
        
        case 'missing_out_prolonge': {
          // Même logique que missing_out
          if (sorties.length >= entrees.length && entrees.length > 0) {
            verdict = 'FAUX';
            reason = `${entrees.length}in/${sorties.length}out complet`;
          } else {
            // Vérifier si cloture_auto_journee existe aussi → doublon
            const hasCloture = anomalies.find(x => 
              x.type === 'cloture_auto_journee' && 
              x.employeId === a.employeId && 
              x.date.toISOString().split('T')[0] === dateStr
            );
            if (hasCloture) {
              verdict = 'DOUBLON';
              reason = `${entrees.length}in/${sorties.length}out — doublon avec cloture_auto_journee`;
            } else {
              verdict = 'VRAI';
              reason = `${entrees.length}in/${sorties.length}out`;
            }
          }
          break;
        }
        
        case 'pause_excessive': {
          // Pause excessive entre 2 blocs de pointage
          // Souvent faux pour les shifts coupés (11-15 puis 18-23)
          const details = a.details || {};
          
          // Si le shift a 2 segments → la "pause" est la coupure prévue
          if (segments.length >= 2) {
            // Calculer la pause prévue
            const seg1End = segments[0].fin || segments[0].end;
            const seg2Start = segments[1].debut || segments[1].start;
            const [e1h, e1m] = seg1End.split(':').map(Number);
            const [s2h, s2m] = seg2Start.split(':').map(Number);
            const pausePrevue = (s2h * 60 + s2m) - (e1h * 60 + e1m);
            
            // La durée de pause dans l'anomalie
            const pauseDesc = (a.description || '').match(/Pause excessive de (\d+) min/);
            const pauseReelle = pauseDesc ? parseInt(pauseDesc[1]) : 0;
            
            if (pauseReelle <= pausePrevue + 30) {
              verdict = 'FAUX';
              reason = `Pause ${pauseReelle}min ≈ coupure prévue ${pausePrevue}min`;
            } else {
              verdict = 'VRAI';
              reason = `Pause ${pauseReelle}min > coupure prévue ${pausePrevue}min (+${pauseReelle - pausePrevue}min)`;
            }
          } else {
            // Shift 1 segment: vérifier si le calcul est correct
            // Beaucoup de "pauses" sont en fait le temps entre arrivée et sortie
            // d'un employé qui n'a qu'un seul pointage (il travaille en continu)
            if (entrees.length === 1 && sorties.length === 1) {
              // Un seul bloc → pas de pause possible
              verdict = 'FAUX';
              reason = `1 seul bloc arrivée/départ — pas de pause réelle`;
            } else if (entrees.length >= 2) {
              // Multi-blocs → pause entre blocs
              verdict = 'VRAI';
              reason = `${entrees.length} blocs de travail — pause entre blocs`;
            } else {
              verdict = 'DOUTEUX';
              reason = `Vérifier manuellement`;
            }
          }
          break;
        }
        
        case 'hors_plage_in_critique':
        case 'hors_plage_out_critique': {
          // Vérifier si le pointage correspond à un shift d'un autre jour (veille/lendemain)
          if (!shift) {
            verdict = 'VRAI';
            reason = 'Pas de shift ce jour';
          } else {
            const desc = a.description || '';
            const matchMin = desc.match(/(\d+) min trop/);
            const ecartMin = matchMin ? parseInt(matchMin[1]) : 0;
            
            if (ecartMin > 300) {
              // >5h d'écart → probablement shift d'un autre jour ou erreur
              verdict = 'DOUTEUX';
              reason = `Écart ${ecartMin}min — peut-être shift d'un autre jour`;
            } else {
              verdict = 'VRAI';
              reason = `Écart ${ecartMin}min`;
            }
          }
          break;
        }
        
        case 'segment_non_pointe': {
          // Segment d'un shift non pointé — vrai absence partielle
          if (pointages.length > 0) {
            verdict = 'DOUTEUX';
            reason = `${pointages.length} pointages existent mais segment spécifique manqué`;
          } else {
            verdict = 'VRAI';
            reason = 'Aucun pointage ce jour';
          }
          break;
        }
        
        default:
          verdict = 'VRAI';
          reason = 'Type non analysé automatiquement';
      }

      // Affichage
      const icon = verdict === 'FAUX' ? '❌' : verdict === 'DOUBLON' ? '🔄' : verdict === 'DOUTEUX' ? '❓' : '✅';
      console.log(`\n  ${icon} ${verdict} — ${nom} ${dateStr}`);
      console.log(`     Anomalie: ${(a.description || '').substring(0, 90)}`);
      console.log(`     Shift: ${shift ? `${shift.type} [${segStr}]` : 'AUCUN'}`);
      console.log(`     Pointages: ${ptStr || 'AUCUN'}`);
      console.log(`     Raison: ${reason}`);

      if (verdict === 'FAUX' || verdict === 'DOUBLON') fauxPositifs.push({ ...data, verdict, reason });
      else if (verdict === 'DOUTEUX') douteux.push({ ...data, verdict, reason });
      else vrais.push({ ...data, verdict, reason });
    }
  }

  // ═══════════════════ RÉSUMÉ ═══════════════════
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`  RÉSUMÉ DE L'ANALYSE`);
  console.log(`${'='.repeat(80)}`);
  console.log(`  Total analysé: ${anomalies.length}`);
  console.log(`  ❌ FAUX POSITIFS: ${fauxPositifs.filter(x => x.verdict === 'FAUX').length}`);
  console.log(`  🔄 DOUBLONS: ${fauxPositifs.filter(x => x.verdict === 'DOUBLON').length}`);
  console.log(`  ❓ DOUTEUX: ${douteux.length}`);
  console.log(`  ✅ VRAIS: ${vrais.length}`);

  // Détail des faux par type
  console.log(`\n  Faux par type:`);
  const fpByType = {};
  fauxPositifs.forEach(f => {
    const t = f.anomalie.type;
    if (!fpByType[t]) fpByType[t] = 0;
    fpByType[t]++;
  });
  Object.entries(fpByType).forEach(([t, c]) => console.log(`    ${t}: ${c}`));

  // IDs à supprimer
  const idsToDelete = fauxPositifs.map(f => f.anomalie.id);
  console.log(`\n  IDs faux/doublons: [${idsToDelete.join(', ')}]`);
  
  // Douteux details
  if (douteux.length > 0) {
    console.log(`\n  DOUTEUX à vérifier manuellement:`);
    douteux.forEach(d => {
      console.log(`    #${d.anomalie.id} ${d.anomalie.type} — ${d.nom} ${d.dateStr}: ${d.reason}`);
    });
  }
  
  console.log('');
}

main()
  .catch(err => { console.error('Erreur:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
