const fs = require('fs');
const http = require('http');
const https = require('https');

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (options.binary) {
          resolve(Buffer.from(data, 'binary'));
        } else {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function fetchBinary(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = protocol.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testExport() {
  try {
    // Récupérer le token admin
    console.log('🔐 Connexion admin...');
    const loginData = await fetchJSON('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gestionrh.com', password: 'Admin123!' })
    });
    const { token } = loginData;
    console.log('✅ Token récupéré');
    
    // Exporter le rapport
    console.log('\n📊 Export du rapport novembre 2025...');
    const buffer = await fetchBinary('http://localhost:5000/rapports/export-all?periode=mois&mois=2025-11&format=excel', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    fs.writeFileSync('rapport-nov-2025.xlsx', buffer);
    console.log(`✅ Rapport généré: ${buffer.length} bytes`);
    
    // Récupérer les données brutes pour vérification
    console.log('\n📋 Récupération données brutes...');
    const stats = await fetchJSON('http://localhost:5000/rapports/heures-globale?periode=mois&mois=2025-11', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`\n✅ Données récupérées pour ${stats.rapports.length} employés`);
    console.log(`   Période: ${stats.periode.debut} → ${stats.periode.fin}`);
    
    // Vérifier quelques employés en détail
    console.log('\n' + '='.repeat(80));
    console.log('VÉRIFICATION DÉTAILLÉE DES EMPLOYÉS');
    console.log('='.repeat(80));
    
    stats.rapports.slice(0, 5).forEach((emp, i) => {
      console.log(`\n👤 Employé ${i+1}: ${emp.nom} ${emp.prenom}`);
      console.log(`   Email: ${emp.email}`);
      console.log(`   Rôle: ${emp.role}`);
      console.log(`   ---`);
      console.log(`   Jours planifiés: ${emp.joursPlanifies}`);
      console.log(`   Jours présents: ${emp.joursPresents}`);
      console.log(`   Taux présence: ${emp.tauxPresence?.toFixed(1) || 0}%`);
      console.log(`   ---`);
      console.log(`   H. prévues: ${emp.heuresPrevues?.toFixed(1) || 0}h`);
      console.log(`   H. travaillées: ${emp.heuresTravaillees?.toFixed(1) || 0}h`);
      console.log(`   H. supp: ${emp.heuresSupplementaires?.toFixed(1) || 0}h`);
      console.log(`   H. manquantes: ${emp.heuresManquantes?.toFixed(1) || 0}h`);
      console.log(`   Moyenne h/j: ${emp.joursPresents > 0 ? (emp.heuresTravaillees / emp.joursPresents).toFixed(1) : 0}h`);
      console.log(`   ---`);
      console.log(`   Abs. justifiées: ${emp.absencesJustifiees || 0}`);
      console.log(`   Abs. injustifiées: ${emp.absencesInjustifiees || 0}`);
      console.log(`   Retards: ${emp.retards || 0}`);
      console.log(`   Taux ponctualité: ${emp.joursPresents > 0 ? ((emp.joursPresents - (emp.retards || 0)) / emp.joursPresents * 100).toFixed(1) : 100}%`);
      console.log(`   ---`);
      console.log(`   CP: ${emp.congesPayes?.length || 0} jour(s)${emp.congesPayes?.length > 0 ? ' - ' + emp.congesPayes.map(d => d.split('T')[0]).join(', ') : ''}`);
      console.log(`   RTT: ${emp.rtt?.length || 0} jour(s)${emp.rtt?.length > 0 ? ' - ' + emp.rtt.map(d => d.split('T')[0]).join(', ') : ''}`);
      console.log(`   Maladie: ${emp.maladie?.length || 0} jour(s)${emp.maladie?.length > 0 ? ' - ' + emp.maladie.map(d => d.split('T')[0]).join(', ') : ''}`);
      
      // Vérifications de cohérence
      const absTotal = (emp.congesPayes?.length || 0) + (emp.rtt?.length || 0) + (emp.maladie?.length || 0);
      const coherence = [];
      if (absTotal !== emp.absencesJustifiees) {
        coherence.push(`⚠️ INCOHÉRENCE: Total absences typées (${absTotal}) ≠ Absences justifiées (${emp.absencesJustifiees})`);
      }
      if (emp.heuresTravaillees > emp.heuresPrevues && emp.heuresSupplementaires === 0) {
        coherence.push(`⚠️ INCOHÉRENCE: H.travaillées > H.prévues mais H.supp = 0`);
      }
      if (emp.joursPresents > emp.joursPlanifies) {
        coherence.push(`⚠️ INCOHÉRENCE: Jours présents > Jours planifiés`);
      }
      
      if (coherence.length > 0) {
        console.log(`\n   🔴 ALERTES:`);
        coherence.forEach(msg => console.log(`   ${msg}`));
      } else {
        console.log(`\n   ✅ Données cohérentes`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('TOTAUX GLOBAUX (25 employés)');
    console.log('='.repeat(80));
    
    const totaux = stats.rapports.reduce((acc, emp) => {
      acc.heuresPrevues += emp.heuresPrevues || 0;
      acc.heuresTravaillees += emp.heuresTravaillees || 0;
      acc.heuresSupp += emp.heuresSupplementaires || 0;
      acc.heuresManquantes += emp.heuresManquantes || 0;
      acc.absJustifiees += emp.absencesJustifiees || 0;
      acc.absInjustifiees += emp.absencesInjustifiees || 0;
      acc.retards += emp.retards || 0;
      acc.joursPlanifies += emp.joursPlanifies || 0;
      acc.joursPresents += emp.joursPresents || 0;
      acc.cp += emp.congesPayes?.length || 0;
      acc.rtt += emp.rtt?.length || 0;
      acc.maladie += emp.maladie?.length || 0;
      return acc;
    }, {
      heuresPrevues: 0,
      heuresTravaillees: 0,
      heuresSupp: 0,
      heuresManquantes: 0,
      absJustifiees: 0,
      absInjustifiees: 0,
      retards: 0,
      joursPlanifies: 0,
      joursPresents: 0,
      cp: 0,
      rtt: 0,
      maladie: 0
    });
    
    console.log(`\n📊 HEURES:`);
    console.log(`   Heures prévues: ${totaux.heuresPrevues.toFixed(1)}h`);
    console.log(`   Heures travaillées: ${totaux.heuresTravaillees.toFixed(1)}h`);
    console.log(`   Heures supp: ${totaux.heuresSupp.toFixed(1)}h`);
    console.log(`   Heures manquantes: ${totaux.heuresManquantes.toFixed(1)}h`);
    console.log(`   Écart: ${(totaux.heuresTravaillees - totaux.heuresPrevues).toFixed(1)}h`);
    
    console.log(`\n👥 PRÉSENCE:`);
    console.log(`   Jours planifiés: ${totaux.joursPlanifies}`);
    console.log(`   Jours présents: ${totaux.joursPresents}`);
    console.log(`   Taux présence moyen: ${(totaux.joursPresents / totaux.joursPlanifies * 100).toFixed(1)}%`);
    
    console.log(`\n🚫 ABSENCES:`);
    console.log(`   Abs. justifiées: ${totaux.absJustifiees}`);
    console.log(`   Abs. injustifiées: ${totaux.absInjustifiees}`);
    console.log(`   CP: ${totaux.cp} jour(s)`);
    console.log(`   RTT: ${totaux.rtt} jour(s)`);
    console.log(`   Maladie: ${totaux.maladie} jour(s)`);
    console.log(`   Total abs typées: ${totaux.cp + totaux.rtt + totaux.maladie}`);
    
    console.log(`\n⏰ PONCTUALITÉ:`);
    console.log(`   Retards: ${totaux.retards}`);
    console.log(`   Taux ponctualité moyen: ${((totaux.joursPresents - totaux.retards) / totaux.joursPresents * 100).toFixed(1)}%`);
    
    // Vérifications globales
    console.log('\n' + '='.repeat(80));
    console.log('VÉRIFICATIONS DE COHÉRENCE GLOBALE');
    console.log('='.repeat(80));
    
    const totalAbsTypees = totaux.cp + totaux.rtt + totaux.maladie;
    if (totalAbsTypees !== totaux.absJustifiees) {
      console.log(`⚠️ INCOHÉRENCE: Total abs. typées (${totalAbsTypees}) ≠ Abs. justifiées (${totaux.absJustifiees})`);
    } else {
      console.log(`✅ Absences cohérentes: ${totalAbsTypees} = ${totaux.absJustifiees}`);
    }
    
    if (Math.abs(totaux.heuresTravaillees - totaux.heuresPrevues - totaux.heuresSupp + totaux.heuresManquantes) > 1) {
      console.log(`⚠️ INCOHÉRENCE: Écart heures > 1h`);
    } else {
      console.log(`✅ Heures cohérentes`);
    }
    
    if (totaux.joursPlanifies < totaux.joursPresents) {
      console.log(`⚠️ INCOHÉRENCE: Jours présents > Jours planifiés`);
    } else {
      console.log(`✅ Jours cohérents`);
    }
    
    console.log('\n✅ Vérification terminée!');
    console.log(`📄 Fichier généré: rapport-nov-2025.xlsx (${buffer.byteLength} bytes)`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

testExport();
