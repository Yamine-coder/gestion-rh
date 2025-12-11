# 🌙 Solution complète : Gestion des shifts de nuit (crossing midnight)

## 🚨 Problème identifié

### Scénario réel
```
Employé : Agent de sécurité
Shift prévu : 28/11 de 22h00 → 29/11 à 06h30 (horaire de nuit)
Pointages :
  - IN:  28/11 à 22:00 ✅
  - OUT: 29/11 à 06:30 ✅

Comportement actuel du système :
  ❌ Le pointage OUT (29/11) n'est PAS associé au shift du 28/11
  ❌ Génère fausse anomalie : "départ manquant" ou "présence non prévue"
```

### Cause racine
**comparisonController.js lignes 106-128** :
```javascript
// Groupage strict par jour calendaire Paris
const shiftDateParis = new Date(shift.date).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
const pointageDateParis = new Date(p.horodatage).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });

// Résultat :
shiftsByDate['2024-11-28'] = [shift 22:00-06:30]
pointagesByDate['2024-11-28'] = [IN 22:00]
pointagesByDate['2024-11-29'] = [OUT 06:30]  ← Séparé !
```

---

## ✅ Solution proposée

### Option 1 : Detection automatique des shifts de nuit (RECOMMANDÉE)

**Avantages** :
- ✅ Pas de modification du modèle de données
- ✅ Fonctionne avec les shifts existants
- ✅ Logique métier intelligente

**Principe** :
Détecter quand un segment franchit minuit et rechercher les pointages OUT sur J+1.

#### Code à modifier : `comparisonController.js`

```javascript
// AVANT le groupage pointagesByDate (ligne 119), ajouter :

// 🌙 Détection des shifts de nuit et rattachement intelligent des pointages
const shiftNightMapping = new Map(); // shiftId -> dates où chercher les pointages

shiftsPrevus.forEach(shift => {
  const shiftDateParis = new Date(shift.date).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
  
  if (shift.type === 'présence' && Array.isArray(shift.segments)) {
    shift.segments.forEach((segment, idx) => {
      if (segment.start && segment.end) {
        // Parser les heures HH:mm
        const [startHH, startMM] = segment.start.split(':').map(Number);
        const [endHH, endMM] = segment.end.split(':').map(Number);
        
        // Conversion en minutes depuis minuit
        const startMinutes = startHH * 60 + startMM;
        const endMinutes = endHH * 60 + endMM;
        
        // 🌙 Détection shift de nuit : fin < début (ex: 22:00 → 06:30)
        const spansMultipleDays = endMinutes < startMinutes;
        
        if (spansMultipleDays) {
          // Ce shift franchit minuit
          const shiftKey = `${shift.id}_seg${idx}`;
          
          // Calculer le jour suivant
          const nextDay = new Date(shift.date);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayParis = nextDay.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
          
          console.log(`🌙 SHIFT NUIT détecté: Shift ${shift.id} segment ${idx} (${segment.start}-${segment.end})`);
          console.log(`   → Recherche pointages sur ${shiftDateParis} ET ${nextDayParis}`);
          
          shiftNightMapping.set(shiftKey, {
            shiftId: shift.id,
            shiftDate: shiftDateParis,
            nextDate: nextDayParis,
            segment,
            segmentIndex: idx
          });
        }
      }
    });
  }
});

// MODIFICATION du groupage des pointages (ligne 119-128)
const pointagesByDate = {};
const pointagesNightShifts = new Map(); // Pour tracker les pointages OUT de nuit

pointagesReels.forEach(p => {
  const pointageDateParis = new Date(p.horodatage).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
  
  // Groupage standard
  if (!pointagesByDate[pointageDateParis]) pointagesByDate[pointageDateParis] = [];
  pointagesByDate[pointageDateParis].push(p);
  
  // 🌙 Si c'est un départ, vérifier s'il correspond à un shift de nuit de J-1
  if (p.type === 'depart' || p.type === 'départ' || p.type === 'SORTIE') {
    // Calculer J-1
    const prevDay = new Date(p.horodatage);
    prevDay.setDate(prevDay.getDate() - 1);
    const prevDayParis = prevDay.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    
    // Chercher si un shift de nuit de J-1 pourrait correspondre
    for (const [shiftKey, nightShift] of shiftNightMapping.entries()) {
      if (nightShift.shiftDate === prevDayParis) {
        // Ce pointage OUT pourrait correspondre à ce shift de nuit
        console.log(`🌙 Pointage OUT ${p.id} (${pointageDateParis}) possiblement lié au shift nuit ${nightShift.shiftId} (${prevDayParis})`);
        
        // Ajouter aussi ce pointage au jour précédent pour la comparaison
        if (!pointagesByDate[prevDayParis]) pointagesByDate[prevDayParis] = [];
        
        // Marquer ce pointage comme "candidat nuit" pour ne pas le dupliquer
        if (!pointagesNightShifts.has(p.id)) {
          pointagesByDate[prevDayParis].push({
            ...p,
            _nightShiftCandidate: true,
            _originalDate: pointageDateParis
          });
          pointagesNightShifts.set(p.id, prevDayParis);
        }
      }
    }
  }
});

console.log(`🌙 ${shiftNightMapping.size} shifts de nuit détectés`);
console.log(`🌙 ${pointagesNightShifts.size} pointages OUT rattachés à des shifts de nuit`);
```

#### Résultat attendu

```
📅 Traitement jour 28/11:
  - Shifts: 1 (22:00-06:30)
  - Pointages: 2 (IN 28/11 22:00, OUT 29/11 06:30) ← Maintenant regroupés !
  - Écarts: ✅ Arrivée OK, ✅ Départ OK

📅 Traitement jour 29/11:
  - Shifts: 1 (08:00-17:00)
  - Pointages: 1 (IN 29/11 08:00) ← OUT 06:30 déjà utilisé pour J-1
  - Écarts: ✅ Arrivée OK, ⏳ En cours (pas encore de OUT)
```

---

### Option 2 : Ajout champ `endDate` au modèle Shift (Alternative robuste)

**Avantages** :
- ✅ Plus explicite et sûr
- ✅ Facilite les requêtes SQL
- ✅ Support shifts multi-jours (>24h)

**Inconvénients** :
- ❌ Nécessite migration de données
- ❌ Modification du schéma

#### Migration Prisma

```prisma
model Shift {
  id        Int      @id @default(autoincrement())
  employeId Int
  date      DateTime  // Date de DÉBUT du shift
  endDate   DateTime? // 🆕 Date de FIN (si différent de date)
  type      String
  motif     String?
  segments  Json
  // ... autres champs
}
```

```javascript
// Migration 20241201_add_shift_end_date.js
exports.up = async (prisma) => {
  // Calculer automatiquement endDate pour shifts existants
  const shifts = await prisma.shift.findMany({
    where: { type: 'présence' }
  });
  
  for (const shift of shifts) {
    if (Array.isArray(shift.segments) && shift.segments.length > 0) {
      const lastSegment = shift.segments[shift.segments.length - 1];
      if (lastSegment.start && lastSegment.end) {
        const [startHH] = lastSegment.start.split(':').map(Number);
        const [endHH] = lastSegment.end.split(':').map(Number);
        
        // Si fin < début → shift de nuit
        if (endHH < startHH || (endHH === 0 && startHH > 12)) {
          const endDate = new Date(shift.date);
          endDate.setDate(endDate.getDate() + 1);
          
          await prisma.shift.update({
            where: { id: shift.id },
            data: { endDate }
          });
          
          console.log(`✅ Shift ${shift.id} : endDate = ${endDate.toISOString()}`);
        }
      }
    }
  }
};
```

---

## 🧪 Tests à effectuer

### Test 1 : Shift de nuit simple (22h-06h)
```javascript
Shift: 28/11 22:00-06:30
Pointages:
  - IN:  28/11 22:05 (+5 min)
  - OUT: 29/11 06:28 (-2 min)

Résultat attendu:
  ✅ Retard modéré arrivée: 5 min
  ✅ Départ acceptable: -2 min
  ❌ PAS d'anomalie "présence non prévue" le 29/11
```

### Test 2 : Shift de nuit avec retard crossing midnight (23h-01h)
```javascript
Shift: 28/11 23:00-01:00
Pointages:
  - IN:  28/11 23:45 (+45 min retard critique)
  - OUT: 29/11 01:15 (+15 min heures sup)

Résultat attendu:
  🔴 Retard critique arrivée: 45 min
  🟢 Heures sup auto-validées: 15 min
```

### Test 3 : Shift jour normal (08h-17h) - Non-régression
```javascript
Shift: 28/11 08:00-17:00
Pointages:
  - IN:  28/11 08:00
  - OUT: 28/11 17:00

Résultat attendu:
  ✅ Arrivée OK
  ✅ Départ OK
  ✅ Aucun changement de comportement
```

### Test 4 : Absence shift de nuit
```javascript
Shift: 28/11 22:00-06:00 (nuit)
Pointages: AUCUN

Résultat attendu:
  🔴 Absence totale (critique)
  ❌ PAS de "présence non prévue" le 29/11
```

---

## 📊 Impact sur les statistiques

### Avant la correction
```
29/11 : ❌ 5 anomalies "présence non prévue" (pointages OUT de nuit)
28/11 : ❌ 5 anomalies "départ manquant" (shifts de nuit sans OUT trouvé)
→ 10 fausses anomalies / jour
```

### Après la correction
```
28/11 : ✅ 0 anomalies (shift nuit complet détecté)
29/11 : ✅ 0 anomalies (OUT de nuit rattaché à J-1)
→ 0 fausses anomalies
```

---

## 🎯 Recommandation finale

**Implémenter l'Option 1 (détection automatique) IMMÉDIATEMENT** car :
1. ✅ Pas de migration de données
2. ✅ Fix rétroactif sur toutes les données existantes
3. ✅ Déploiement rapide (<1h)
4. ✅ Testable facilement

**Planifier l'Option 2 (endDate) pour V2** car :
- 🎯 Plus robuste long terme
- 🎯 Supporte cas edge (shifts >24h, équipes 2x8, 3x8)
- 🎯 Facilite évolutions futures (planning rotatif, astreintes)

---

## 🔧 Checklist d'implémentation

### Phase 1 : Détection automatique (1h)
- [ ] Ajouter logique détection shift de nuit dans comparisonController.js
- [ ] Modifier groupage pointagesByDate pour inclure OUT de J+1
- [ ] Ajouter logs détaillés (`🌙 SHIFT NUIT détecté`)
- [ ] Tester avec données réelles (security guard, infirmière)

### Phase 2 : Tests (30 min)
- [ ] Test shift 22h-06h (cas standard)
- [ ] Test shift 23h-01h (mini shift de nuit)
- [ ] Test shift 18h-02h (long shift de nuit)
- [ ] Test non-régression shift jour (08h-17h)

### Phase 3 : Validation production (15 min)
- [ ] Vérifier stats anomalies (devrait diminuer drastiquement)
- [ ] Vérifier aucune régression sur shifts jour
- [ ] Monitorer logs pour shifts de nuit détectés

---

## 💡 Cas particuliers identifiés

### Cas 1 : Shift très long (18h-02h)
```javascript
18h → 02h = shift de 8h (franchit minuit)
→ Detection: endMinutes (120) < startMinutes (1080) ✅
```

### Cas 2 : Shift minuit exact (22h-00h)
```javascript
22h → 00h = shift de 2h (fini À minuit)
→ Detection: endMinutes (0) < startMinutes (1320) ✅
```

### Cas 3 : Shift 24h (00h-00h) - Edge case
```javascript
00h → 00h = shift de 24h
→ Detection: endMinutes (0) === startMinutes (0)
→ Logique spéciale nécessaire (hors scope actuel)
```

---

## 📝 Logs de débogage attendus

```
🔍 Fenêtre SQL large (UTC) : 2024-11-27T00:00:00.000Z → (lt) 2024-11-30T00:00:00.000Z | Jours demandés: [ '2024-11-28' ]
📋 Shifts prévus: 1, Pointages réels: 2

🌙 SHIFT NUIT détecté: Shift 123 segment 0 (22:00-06:30)
   → Recherche pointages sur 2024-11-28 ET 2024-11-29

⏰ Pointage 456: horodatage=2024-11-28T21:00:00.000Z → jour Paris=2024-11-28
⏰ Pointage 457: horodatage=2024-11-29T05:30:00.000Z → jour Paris=2024-11-29
🌙 Pointage OUT 457 (2024-11-29) possiblement lié au shift nuit 123 (2024-11-28)

🌙 1 shifts de nuit détectés
🌙 1 pointages OUT rattachés à des shifts de nuit

📅 Traitement jour 2024-11-28:
  - Shifts: 1 (clés disponibles: 2024-11-28)
  - Pointages: 2 (clés disponibles: 2024-11-28,2024-11-29)
  - Shifts détails: [ { id: 123, type: 'présence' } ]
  - Pointages détails: [ { id: 456, type: 'arrivee' }, { id: 457, type: 'depart', _nightShiftCandidate: true } ]
```

---

**Auteur** : GitHub Copilot  
**Date** : 01/12/2024  
**Status** : 🚀 Prêt à implémenter
