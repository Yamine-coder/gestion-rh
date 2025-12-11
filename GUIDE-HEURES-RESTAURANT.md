# 🍽️ Guide complet : Gestion des heures Restaurant

## 📋 Contexte métier identifié

Votre système gère un **restaurant** avec plusieurs catégories d'employés ayant des horaires spécifiques qui **franchissent souvent minuit**.

---

## 🕐 Horaires typiques par catégorie

### 🍳 **Cuisine**
```javascript
// Semaine (Lun-Ven)
segments: [
  { start: '06:00', end: '14:00', commentaire: 'Service matin' },      // 8h
  { start: '18:00', end: '23:00', commentaire: 'Service soir' }        // 5h
]
// Total : 13h/jour

// Weekend (Sam-Dim)
segments: [
  { start: '10:00', end: '15:00', commentaire: 'Service déjeuner' },   // 5h
  { start: '18:00', end: '00:00', commentaire: 'Service dîner' }       // 6h (FRANCHIT MINUIT ❌)
]
// Total : 11h/jour
```

### 🍽️ **Service** (Serveurs)
```javascript
// Semaine (Lun-Ven)
segments: [
  { start: '11:30', end: '15:00', commentaire: 'Service déjeuner' },   // 3.5h
  { start: '19:00', end: '23:30', commentaire: 'Service dîner' }       // 4.5h
]
// Total : 8h/jour

// Weekend (Sam-Dim)
segments: [
  { start: '11:00', end: '16:00', commentaire: 'Service déjeuner' },   // 5h
  { start: '19:00', end: '00:30', commentaire: 'Service dîner' }       // 5.5h (FRANCHIT MINUIT ❌)
]
// Total : 10.5h/jour
```

### 🍷 **Bar**
```javascript
segments: [
  { start: '17:00', end: '02:00', commentaire: 'Service bar' }         // 9h (FRANCHIT MINUIT ❌)
]
// Total : 9h/jour
```

---

## 🚨 Problèmes actuels identifiés

### ❌ **Problème #1 : Shifts franchissant minuit**

**Exemple concret** :
```javascript
// Shift prévu
date: '2025-11-30'
segments: [{ start: '19:00', end: '00:30' }]  // Service dîner weekend

// Pointages réels
IN:  30/11 19:00 ✅ (groupé sous date 30/11)
OUT: 01/12 00:30 ❌ (groupé sous date 01/12)

// Résultat actuel
⚠️ Le système génère DEUX anomalies :
  1. 30/11 : "Départ manquant" (ne trouve pas le OUT)
  2. 01/12 : "Présence non prévue" (trouve un OUT orphelin)
```

### ❌ **Problème #2 : Calcul durée incorrect**

**Code actuel dans `shiftController.js` ligne 88** :
```javascript
if (start >= end) {
  throw new Error(`Heure début >= fin segment ${idx+1}`);
}
```

**Ce code rejette** : `{ start: '19:00', end: '00:30' }` car 19:00 > 00:30 ❌

### ❌ **Problème #3 : Groupage des pointages par date calendaire**

**Code actuel dans `comparisonController.js` ligne 120-127** :
```javascript
pointagesReels.forEach(p => {
  const pointageDateParis = new Date(p.horodatage).toLocaleDateString('en-CA', { 
    timeZone: 'Europe/Paris' 
  });
  
  if (!pointagesByDate[pointageDateParis]) pointagesByDate[pointageDateParis] = [];
  pointagesByDate[pointageDateParis].push(p);
});
```

**Problème** : Un pointage OUT à 01/12 00:30 ne sera JAMAIS associé au shift du 30/11.

---

## ✅ Solution complète (3 étapes)

### **Étape 1 : Correction validation shift** ⏱️ 10 min

**Fichier** : `server/controllers/shiftController.js`

**Remplacer ligne 88-91** :
```javascript
// ❌ AVANT (rejette les shifts de nuit)
if (start >= end) {
  throw new Error(`Heure début >= fin segment ${idx+1}`);
}

// ✅ APRÈS (accepte les shifts de nuit)
// Vérifier si le shift franchit minuit
const startMinutes = startH * 60 + startM;
const endMinutes = endH * 60 + endM;
const spansMultipleDays = endMinutes < startMinutes;

if (spansMultipleDays) {
  console.log(`🌙 Segment ${idx+1} franchit minuit: ${start} → ${end} (OK pour restaurant)`);
}

// Validation : interdire seulement les durées impossibles (>24h ou exactement égales)
if (start === end) {
  throw new Error(`Heure début = fin segment ${idx+1} (durée nulle)`);
}
```

**Résultat** :
- ✅ `19:00 → 00:30` accepté (shift de nuit valide)
- ✅ `17:00 → 02:00` accepté (shift de nuit bar)
- ❌ `14:00 → 14:00` rejeté (durée nulle)

---

### **Étape 2 : Détection automatique des shifts de nuit** ⏱️ 30 min

**Fichier** : `server/controllers/comparisonController.js`

**Ajouter AVANT la ligne 119** (avant le groupage des pointages) :

```javascript
// 🌙 DÉTECTION DES SHIFTS DE NUIT (RESTAURANT)
const shiftNightMapping = new Map(); // shiftId -> { dates où chercher pointages }

console.log('\n🌙 === DÉTECTION SHIFTS DE NUIT RESTAURANT ===');

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
        
        // 🌙 SHIFT DE NUIT : fin < début (ex: 19:00 → 00:30)
        const spansMultipleDays = endMinutes < startMinutes;
        
        if (spansMultipleDays) {
          // Ce shift franchit minuit (typique restaurant)
          const shiftKey = `${shift.id}_seg${idx}`;
          
          // Calculer le jour suivant (où se trouve le OUT)
          const nextDay = new Date(shift.date);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayParis = nextDay.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
          
          const durationHours = ((24 * 60) - startMinutes + endMinutes) / 60;
          
          console.log(`🌙 SHIFT NUIT RESTAURANT détecté:`);
          console.log(`   → Shift ${shift.id} segment ${idx}`);
          console.log(`   → Horaire: ${segment.start} → ${segment.end} (${durationHours.toFixed(1)}h)`);
          console.log(`   → Date shift: ${shiftDateParis}`);
          console.log(`   → Date OUT attendue: ${nextDayParis}`);
          console.log(`   → Type: ${segment.commentaire || 'Service'}`);
          
          shiftNightMapping.set(shiftKey, {
            shiftId: shift.id,
            shiftDate: shiftDateParis,
            nextDate: nextDayParis,
            segment,
            segmentIndex: idx,
            durationHours
          });
        }
      }
    });
  }
});

console.log(`🌙 Total shifts de nuit détectés: ${shiftNightMapping.size}`);
console.log('========================================\n');
```

**Ensuite, MODIFIER le groupage des pointages (lignes 119-128)** :

```javascript
// GROUPAGE INTELLIGENT DES POINTAGES (avec rattachement shifts de nuit)
const pointagesByDate = {};
const pointagesNightShiftsUsed = new Set(); // Pour éviter les doublons

pointagesReels.forEach(p => {
  const pointageDateParis = new Date(p.horodatage).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
  const pointageTime = new Date(p.horodatage).toLocaleTimeString('fr-FR', { 
    timeZone: 'Europe/Paris',
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  // Groupage standard
  if (!pointagesByDate[pointageDateParis]) pointagesByDate[pointageDateParis] = [];
  pointagesByDate[pointageDateParis].push(p);
  
  console.log(`⏰ Pointage ${p.id}: ${p.type} à ${pointageDateParis} ${pointageTime}`);
  
  // 🌙 LOGIQUE SPÉCIALE : Départs après minuit (shifts de nuit restaurant)
  const isDepartType = p.type === 'depart' || p.type === 'départ' || p.type === 'SORTIE';
  
  if (isDepartType) {
    // Ce départ pourrait correspondre à un shift de nuit commencé J-1
    
    // Calculer J-1
    const prevDay = new Date(p.horodatage);
    prevDay.setDate(prevDay.getDate() - 1);
    const prevDayParis = prevDay.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    
    // Chercher si un shift de nuit de J-1 attend ce départ
    let nightShiftFound = false;
    
    for (const [shiftKey, nightShift] of shiftNightMapping.entries()) {
      if (nightShift.shiftDate === prevDayParis && nightShift.nextDate === pointageDateParis) {
        // BINGO ! Ce départ correspond à un shift de nuit de J-1
        console.log(`   🌙 → Rattaché au shift nuit ${nightShift.shiftId} du ${prevDayParis}`);
        console.log(`      Shift prévu: ${nightShift.segment.start} → ${nightShift.segment.end}`);
        console.log(`      ${nightShift.segment.commentaire || 'Service restaurant'}`);
        
        // Ajouter ce pointage AUSSI au jour précédent (pour la comparaison)
        if (!pointagesByDate[prevDayParis]) pointagesByDate[prevDayParis] = [];
        
        // Marquer pour éviter duplication
        if (!pointagesNightShiftsUsed.has(p.id)) {
          pointagesByDate[prevDayParis].push({
            ...p,
            _nightShiftCandidate: true,
            _originalDate: pointageDateParis,
            _nightShiftKey: shiftKey
          });
          pointagesNightShiftsUsed.add(p.id);
          nightShiftFound = true;
        }
        
        break; // Un pointage ne peut correspondre qu'à un seul shift de nuit
      }
    }
    
    if (!nightShiftFound && pointageDateParis !== prevDayParis) {
      // Départ après minuit mais aucun shift de nuit trouvé
      const [hh, mm] = pointageTime.split(':').map(Number);
      if (hh < 6) { // Entre 00:00 et 06:00
        console.log(`   ⚠️ Départ après minuit (${pointageTime}) sans shift de nuit correspondant`);
      }
    }
  }
});

console.log(`\n📊 Résumé groupage:`);
console.log(`   - ${shiftNightMapping.size} shifts de nuit détectés`);
console.log(`   - ${pointagesNightShiftsUsed.size} pointages OUT rattachés à J-1`);
console.log(`   - Jours avec pointages: ${Object.keys(pointagesByDate).join(', ')}`);
console.log('');
```

---

### **Étape 3 : Calcul durée avec gestion minuit** ⏱️ 15 min

**Fichiers à modifier** : Toutes les fonctions qui calculent la durée d'un segment

#### 📄 `server/routes/statsRoutes.js` ligne 246

```javascript
// ✅ FONCTION AMÉLIORÉE (gestion minuit restaurant)
function calculateSegmentHours(segment) {
  if (!segment.start || !segment.end) return 0;
  
  const [startH, startM] = segment.start.split(':').map(Number);
  const [endH, endM] = segment.end.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  let diffMinutes = endMinutes - startMinutes;
  
  // 🌙 Gérer le passage à minuit (shifts de nuit restaurant)
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
    console.log(`   🌙 Shift franchit minuit: ${segment.start}→${segment.end} = ${(diffMinutes/60).toFixed(1)}h`);
  }
  
  return Math.round((diffMinutes / 60) * 100) / 100;
}
```

#### 📄 `client/src/components/PlanningRH.jsx` ligne 59

```javascript
function resumeCell(conge, shift) {
  if (conge) {
    return `Congé ${conge.type || 'non défini'} - ${conge.statut || 'en attente'}`;
  }
  if (shift && shift.type === "présence" && shift.segments) {
    const totalMinutes = shift.segments.reduce((acc, seg) => {
      if (!seg.start || !seg.end) return acc;
      const start = seg.start.split(':').map(Number);
      const end = seg.end.split(':').map(Number);
      const startMin = start[0] * 60 + start[1];
      const endMin = end[0] * 60 + end[1];
      
      // 🌙 Gestion shifts de nuit restaurant
      let duration = endMin - startMin;
      if (duration < 0) duration += 24 * 60; // Franchit minuit
      
      return acc + Math.max(0, duration);
    }, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `Présence - ${hours}h${minutes.toString().padStart(2, '0')}`;
  }
  // ... reste du code
}
```

---

## 🧪 Tests à effectuer après implémentation

### Test 1 : Service dîner weekend (franchit minuit)

**Créer le shift** :
```javascript
// Via l'interface planning RH
date: '30/11/2025'
segments: [
  { start: '19:00', end: '00:30', commentaire: 'Service dîner weekend' }
]
```

**Créer les pointages** :
```javascript
// Via l'interface pointage
30/11/2025 19:05  ← Arrivée (retard 5 min)
01/12/2025 00:35  ← Départ (5 min heures sup)
```

**Résultats attendus** :
```
✅ Durée calculée: 5.5h (19:00 → 00:30)
✅ Groupage: Les 2 pointages associés au shift du 30/11
✅ Écarts détectés:
   🟡 Retard modéré: 5 min (arrivée 19:05 au lieu de 19:00)
   🟢 Heures sup auto-validées: 5 min (départ 00:35 au lieu de 00:30)
❌ PAS d'anomalie "présence non prévue" le 01/12
❌ PAS d'anomalie "départ manquant" le 30/11
```

### Test 2 : Service bar (longue nuit)

**Créer le shift** :
```javascript
date: '30/11/2025'
segments: [
  { start: '17:00', end: '02:00', commentaire: 'Service bar' }
]
```

**Créer les pointages** :
```javascript
30/11/2025 17:00  ← Arrivée
01/12/2025 02:00  ← Départ
```

**Résultats attendus** :
```
✅ Durée calculée: 9h (17:00 → 02:00)
✅ Groupage: Les 2 pointages associés au shift du 30/11
✅ Écarts: Aucune anomalie (conforme)
```

### Test 3 : Absence sur shift de nuit

**Créer le shift** :
```javascript
date: '30/11/2025'
segments: [
  { start: '19:00', end: '00:30', commentaire: 'Service dîner' }
]
```

**Pointages** : AUCUN

**Résultats attendus** :
```
🔴 Absence totale: aucun pointage enregistré sur créneau 19:00-00:30
❌ PAS de "présence non prévue" le 01/12
```

### Test 4 : Non-régression shift jour normal

**Créer le shift** :
```javascript
date: '30/11/2025'
segments: [
  { start: '11:30', end: '15:00', commentaire: 'Service déjeuner' }
]
```

**Créer les pointages** :
```javascript
30/11/2025 11:30  ← Arrivée
30/11/2025 15:00  ← Départ
```

**Résultats attendus** :
```
✅ Durée calculée: 3.5h (11:30 → 15:00)
✅ Comportement inchangé (pas de régression)
✅ Aucune anomalie
```

---

## 📊 Impact sur les statistiques

### Avant les corrections

**Problèmes typiques chaque weekend** :
```
❌ Samedi 30/11 :
   - 5 anomalies "départ manquant" (serveurs, bar)
   - 0 heures comptabilisées après 00:00

❌ Dimanche 01/12 :
   - 5 anomalies "présence non prévue" (pointages OUT orphelins)
   - Heures comptabilisées en double

→ 10 fausses anomalies / weekend
→ Statistiques heures faussées
→ Frustration employés + managers
```

### Après les corrections

**Résultat attendu** :
```
✅ Samedi 30/11 :
   - 0 anomalie (shifts de nuit correctement associés)
   - Heures comptabilisées: 19:00 → 00:30 = 5.5h

✅ Dimanche 01/12 :
   - 0 anomalie (pointages OUT rattachés à J-1)
   - Pas de double comptabilisation

→ 0 fausse anomalie / weekend
→ Statistiques heures exactes
→ Système fiable
```

---

## 🎯 Priorités d'implémentation

### Phase 1 : Critique (1h) 🚨
1. ✅ Étape 1 : Correction validation shift (10 min)
2. ✅ Étape 2 : Détection shifts de nuit (30 min)
3. ✅ Étape 3 : Calcul durée minuit (20 min)

### Phase 2 : Tests (30 min) 🧪
4. ✅ Test service dîner weekend (19h → 00h30)
5. ✅ Test service bar (17h → 02h)
6. ✅ Test absence sur shift de nuit
7. ✅ Test non-régression shift jour

### Phase 3 : Monitoring (continu) 📊
8. ✅ Vérifier logs `🌙 SHIFT NUIT RESTAURANT détecté`
9. ✅ Comparer nombre anomalies avant/après
10. ✅ Valider statistiques heures par catégorie

---

## 💡 Cas particuliers restaurant

### Cas 1 : Double service (déjeuner + dîner)

**Exemple cuisine weekend** :
```javascript
segments: [
  { start: '10:00', end: '15:00', commentaire: 'Service déjeuner' },   // 5h (jour)
  { start: '18:00', end: '00:00', commentaire: 'Service dîner' }       // 6h (nuit)
]
```

**Pointages attendus** :
```
30/11 10:00  ← IN déjeuner
30/11 15:00  ← OUT déjeuner
30/11 18:00  ← IN dîner
01/12 00:00  ← OUT dîner (RATTACHÉ AU 30/11)
```

**Gestion** :
- ✅ Le système détecte automatiquement que le 2ème segment franchit minuit
- ✅ Le OUT à 01/12 00:00 est rattaché au shift du 30/11
- ✅ Les 2 segments sont comparés indépendamment

### Cas 2 : Coupure longue (pause 3h+)

**Exemple service weekend** :
```javascript
segments: [
  { start: '11:00', end: '16:00', commentaire: 'Service déjeuner' },   // 5h
  { start: '19:00', end: '00:30', commentaire: 'Service dîner' }       // 5.5h (nuit)
]
```

**Gestion** :
- ✅ Coupure 19:00 - 11:00 = 3h (pause normale restaurant)
- ✅ Chaque segment traité indépendamment
- ✅ Total journée: 10.5h (conforme légal)

### Cas 3 : Service continu de nuit

**Exemple bar** :
```javascript
segments: [
  { start: '17:00', end: '02:00', commentaire: 'Service bar' }         // 9h (nuit)
]
```

**Gestion** :
- ✅ Un seul segment, franchit minuit
- ✅ Durée correcte: 9h (17h → 02h = 7h + 2h)
- ✅ Pointages IN/OUT rattachés automatiquement

---

## 🔧 Maintenance et évolution

### Logs de débogage à surveiller

```javascript
// Logs ajoutés dans la solution
console.log(`🌙 SHIFT NUIT RESTAURANT détecté:`);
console.log(`   → Shift ${shift.id} segment ${idx}`);
console.log(`   → Horaire: ${segment.start} → ${segment.end}`);
console.log(`   🌙 → Rattaché au shift nuit ${nightShift.shiftId} du ${prevDayParis}`);
```

**Où les trouver** :
- Backend console lors de l'appel à `/api/comparison/planning-vs-realite`
- Filtrer sur emoji `🌙` pour isoler les shifts de nuit

### Métriques à suivre

```javascript
// Indicateurs de santé du système
{
  shiftsNuitDetectes: 12,        // Nombre de shifts franchissant minuit
  pointagesRattaches: 10,        // OUT rattachés à J-1
  anomaliesFaussesEvitees: 20,   // Anomalies qui auraient été générées avant
  tauxSuccesRattachement: 83%    // (10/12) pointages correctement associés
}
```

### Évolutions futures possibles

1. **Interface admin** : Flag visuel `🌙` pour les shifts de nuit dans le planning
2. **Alerte préventive** : Notifier si un shift de nuit n'a pas de OUT J+1
3. **Statistiques catégorie** : Temps moyen par service (déjeuner vs dîner)
4. **Validation heures sup** : Auto-valider jusqu'à 15 min pour service (clients retardataires)

---

## 📚 Références code

### Fichiers modifiés

| Fichier | Lignes | Modification |
|---------|--------|--------------|
| `server/controllers/shiftController.js` | 88-91 | Validation shift de nuit |
| `server/controllers/comparisonController.js` | 103-180 | Détection + groupage intelligent |
| `server/routes/statsRoutes.js` | 246-262 | Calcul durée minuit |
| `server/routes/rapportRoutes.js` | 346-362 | Calcul durée minuit |
| `client/src/components/PlanningRH.jsx` | 59-77 | Affichage durée minuit |

### Fonctions clés

```javascript
// Détection shift de nuit
const spansMultipleDays = endMinutes < startMinutes;

// Calcul durée avec minuit
let diffMinutes = endMinutes - startMinutes;
if (diffMinutes < 0) diffMinutes += 24 * 60;

// Rattachement pointage OUT à J-1
if (nightShift.shiftDate === prevDayParis && nightShift.nextDate === pointageDateParis) {
  pointagesByDate[prevDayParis].push({ ...p, _nightShiftCandidate: true });
}
```

---

**Auteur** : GitHub Copilot  
**Date** : 30/11/2025  
**Contexte** : Système de gestion RH pour restaurant  
**Problème résolu** : Shifts franchissant minuit (service dîner, bar)  
**Status** : 🚀 Prêt à implémenter (1h de travail)
