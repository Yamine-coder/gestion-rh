# 🤖 Scheduler d'Anomalies - Documentation Complète

## Vue d'ensemble

Le scheduler d'anomalies (`server/services/anomalyScheduler.js`) est un service automatique qui tourne en arrière-plan et détecte les anomalies de pointage en temps réel.

---

## ⚙️ Configuration

| Paramètre | Valeur |
|-----------|--------|
| Intervalle de vérification | 60 secondes |
| Fichier | `server/services/anomalyScheduler.js` |
| Démarrage | Automatique au lancement du serveur |

---

## 📋 Types d'Anomalies Détectées

### 1. 🚨 `absence_injustifiee` (Gravité: CRITIQUE)
**Condition:** Aucun pointage d'entrée pour un shift prévu
**Détection:** Fin du shift
**Détails enregistrés:**
- `shiftId`: ID du shift manqué
- `heurePrevueDebut`: Heure de début prévue
- `heurePrevueFin`: Heure de fin prévue
- `pointagesJour`: 0

---

### 2. ⏰ `retard_modere` (Gravité: MOYENNE)
**Condition:** Arrivée entre 10 et 30 minutes après l'heure prévue
**Détection:** Fin du shift
**Détails enregistrés:**
- `shiftId`: ID du shift
- `heurePrevue`: Heure de début prévue
- `heureReelle`: Heure d'arrivée réelle
- `ecartMinutes`: Nombre de minutes de retard

---

### 3. 🔴 `retard_critique` (Gravité: HAUTE)
**Condition:** Arrivée >30 minutes après l'heure prévue
**Détection:** Fin du shift
**Détails enregistrés:**
- `shiftId`: ID du shift
- `heurePrevue`: Heure de début prévue
- `heureReelle`: Heure d'arrivée réelle
- `ecartMinutes`: Nombre de minutes de retard

---

### 4. ❓ `missing_out` (Gravité: MOYENNE)
**Condition:** Plus d'entrées que de sorties (oubli de pointer la sortie)
**Détection:** Fin du shift
**Détails enregistrés:**
- `shiftId`: ID du shift
- `heurePrevueFin`: Heure de fin prévue
- `derniereEntree`: Horodatage de la dernière entrée

---

### 5. 🚪 `depart_anticipe` (Gravité: MOYENNE/HAUTE)
**Condition:** Sortie >15 minutes avant l'heure prévue
- HAUTE si >60 minutes avant
- MOYENNE sinon

**Détection:** Fin du shift
**Détails enregistrés:**
- `shiftId`: ID du shift
- `heurePrevue`: Heure de fin prévue
- `heureReelle`: Heure de sortie réelle
- `ecartMinutes`: Minutes de départ anticipé

---

### 6. ⏱️ `heures_sup_a_valider` (Gravité: BASSE)
**Condition:** Sortie >15 minutes après l'heure prévue (heures supplémentaires)
**Détection:** Fin du shift
**Détails enregistrés:**
- `shiftId`: ID du shift
- `heurePrevue`: Heure de fin prévue
- `heureReelle`: Heure de sortie réelle
- `ecartMinutes`: Minutes supplémentaires
- `heuresSupp`: Heures supplémentaires en décimales

---

### 7. ⚡ `pointage_hors_planning` (Gravité: MOYENNE)
**Condition:** Pointages effectués sans aucun shift prévu ce jour
**Détection:** Toutes les 5 minutes + au démarrage
**Détails enregistrés:**
- `pointages`: Liste des pointages avec types et heures
- `heuresTravaillees`: Total d'heures travaillées calculé

---

### 8. ☕ `pause_non_prise` (Gravité: MOYENNE/HAUTE)
**Condition:** Une pause était prévue dans le planning mais l'employé n'a pas interrompu son travail
**Exemple:** Shift 9h-13h + 14h-17h mais employé pointe 9h-17h sans coupure
- HAUTE si travail continu >6h
- MOYENNE sinon

**Détection:** Fin du shift
**Détails enregistrés:**
- `pausePrevue`: Créneau de pause prévu (ex: "13:00 - 14:00")
- `pauseDureeMinutes`: Durée de pause prévue en minutes
- `dureeTravailContinuMinutes`: Durée réelle travaillée sans pause
- `heuresTravailleesSansPause`: Heures de travail continu

---

### 9. ⚠️🔴 `depassement_amplitude` (Gravité: CRITIQUE)
**Condition:** Travail continu >6h sans pause (violation du code du travail français)
**Détection:** Fin du shift
**Détails enregistrés:**
- `dureeTravailContinuMinutes`: Durée de travail continu
- `seuilLegal`: 360 minutes (6h)

**Note légale:** En France, tout salarié doit bénéficier d'une pause d'au moins 20 minutes après 6h de travail consécutif.

---

## 🔄 Cycle de Vie du Scheduler

```
DÉMARRAGE DU SERVEUR
         │
         ▼
   start() appelé
         │
         ├──► catchUpMissedShifts()  ── Rattrapage des shifts terminés
         │    └─► checkPointagesSansShift()
         │
         ▼
   setInterval (60s)
         │
         ▼
   checkEndedShifts()
         │
         ├──► Pour chaque shift terminé dans les 2 dernières minutes:
         │    └─► checkForAbsence(shift) ── Détecte TOUS les types d'anomalies
         │
         └──► Si minute % 5 == 0:
              └─► checkPointagesSansShift() ── Pointages sans planning
```

---

## 📊 Seuils de Détection

| Type | Seuil | Résultat |
|------|-------|----------|
| Retard modéré | >10 min | ⏰ retard_modere |
| Retard critique | >30 min | 🔴 retard_critique |
| Départ anticipé | >15 min | 🚪 depart_anticipe |
| Heures sup | >15 min après | ⏱️ heures_sup_a_valider |
| Absence | 0 pointage | 🚨 absence_injustifiee |
| Missing out | entrées > sorties | ❓ missing_out |
| Pause non prise | 1 entrée + 1 sortie avec pause prévue | ☕ pause_non_prise |
| Dépassement amplitude | >6h travail continu | ⚠️🔴 depassement_amplitude |

---

## 🛡️ Anti-Doublons

Le scheduler utilise `createAnomalieIfNotExists()` qui vérifie:
- `employeId`
- `date` (même jour)
- `type` (même type d'anomalie)

**→ Une seule anomalie par type par jour par employé**

---

## 📝 Métadonnées

Chaque anomalie créée contient:
```json
{
  "detecteAutomatiquement": true,
  "detectePar": "scheduler"
}
```

---

## 🧪 Test Manuel

Pour forcer une vérification:
```javascript
const scheduler = require('./services/anomalyScheduler');
await scheduler.forceCheck();
```

Pour vérifier le statut:
```javascript
scheduler.getStatus();
// { isRunning: true, lastCheck: Date, checkIntervalMs: 60000 }
```

---

## ✅ Résumé des Garanties

1. **Temps réel**: Anomalies détectées à la fin de chaque shift
2. **Rattrapage**: Si serveur redémarre, les shifts manqués sont rattrapés
3. **Anti-doublons**: Pas d'anomalies dupliquées
4. **Hors planning**: Détecté toutes les 5 minutes
5. **Coût**: 0€ (pas d'API externe, tout en local)

---

*Document généré automatiquement - Dernière mise à jour: 2025*
