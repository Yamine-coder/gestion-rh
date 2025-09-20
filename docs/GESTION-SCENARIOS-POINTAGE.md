# 🎯 Gestion Complète des Scénarios de Pointage

Ce document décrit le système avancé de gestion des différents scénarios de travail dans l'application de pointage.

## 📋 Vue d'ensemble

Le système de pointage a été amélioré pour gérer intelligemment tous les cas d'usage possibles dans un restaurant :

### 🔄 Scénarios Gérés

| Scénario | Description | Interface | Comportement |
|----------|-------------|-----------|--------------|
| **🔵 Présence Planifiée** | Employé avec shift de présence et segments définis | Planning détaillé avec badges horaires | Calcul précis des écarts vs planning |
| **🚫 Absence Planifiée** | Employé avec shift d'absence (congé, maladie, etc.) | Interface d'absence avec motif | Détection d'anomalies si pointage malgré absence |
| **⚡ Travail Extra** | Employé sans planning qui pointe quand même | Interface "travail non planifié" | Toutes les heures comptées comme extra |
| **😴 Repos** | Employé sans planning, aucun pointage | Interface de repos | Message de repos, pas de progression |
| **📋 Planning Vide** | Shift de présence mais sans segments détaillés | Planning sans détail horaire | Objectif par défaut (7h restaurant) |

## 🛠️ Implémentation Technique

### Composant Principal : `Pointage.jsx`

#### Système de Détection des Scénarios
```javascript
const getWorkingScenario = () => {
  // Cas 1: Shift d'absence planifiée
  if (plannedShift && plannedShift.type === 'absence') {
    return {
      type: 'absence_planifiee',
      title: 'Absence planifiée',
      icon: '🚫',
      color: 'text-red-600 dark:text-red-400',
      motif: plannedShift.motif || 'Non spécifié'
    };
  }
  
  // Cas 2: Shift de présence planifié avec segments
  if (plannedShift && plannedShift.type === 'présence' && plannedShift.segments?.length > 0) {
    // Calcul des heures à partir des segments
    return {
      type: 'planifie',
      title: 'Selon planning',
      icon: '📅',
      segments: segmentDetails
    };
  }
  
  // Cas 3: Travail sans planning (extra/imprévu)
  if (!plannedShift && totalHeures > 0) {
    return {
      type: 'extra_non_planifie',
      title: 'Travail non planifié',
      icon: '⚡',
      isExtra: true
    };
  }
  
  // ... autres cas
};
```

#### Interface Adaptative
- **Couleurs dynamiques** : Progression adaptée au contexte
- **Messages contextuels** : Statut intelligent selon le scénario
- **Badges d'anomalie** : Détection automatique des incohérences
- **Calculs personnalisés** : Écarts et variances adaptés au type de shift

### Types de Shifts dans la Base de Données

```sql
-- Shift de présence avec segments détaillés
type: 'présence'
segments: [
  {
    start: '11:00',
    end: '14:30',
    commentaire: 'Service midi',
    isExtra: false
  },
  {
    start: '18:00',
    end: '22:00', 
    commentaire: 'Service soir',
    isExtra: false
  },
  {
    start: '22:00',
    end: '23:30',
    commentaire: 'Heures supplémentaires',
    isExtra: true,
    extraMontant: '25'
  }
]

-- Shift d'absence
type: 'absence'
motif: 'Congé maladie'
segments: []
```

## 🧪 Scénarios de Test Créés

### Comptes de Test Disponibles

| Email | Mot de Passe | Scénario | Date | Description |
|-------|--------------|----------|------|-------------|
| `marie.durand@test.com` | `test123` | **Présence Normale** | Demain | 7h planifiées (9h-12h + 14h-18h) |
| `yjordan496@gmail.com` | `test123` | **Absence Planifiée** | Demain | Congé maladie |
| `jean.leroy@test.com` | `test123` | **Présence avec Extra** | Après-demain | 9h dont 1h30 supplémentaires |
| `marie.dupont@entreprise.com` | `test123` | **Planning Vide** | Dans 3 jours | Présence sans détail horaire |

### Scénario Manuel à Tester
**5️⃣ Travail sur Jour de Repos** : Connectez-vous avec un employé qui n'a pas de shift et faites quand même du pointage.

## 🎨 Fonctionnalités Visuelles

### Adaptation de l'Interface

#### Présence Planifiée
- 🟦 **Arrière-plan bleu** avec planning détaillé
- 🏷️ **Badges horaires** pour chaque segment
- 🟢 **Badge "Extra"** pour les heures supplémentaires
- 📊 **Progression** basée sur les objectifs réels

#### Absence Planifiée
- 🟥 **Arrière-plan rouge** avec motif d'absence
- ⚠️ **Badge "Anomalie"** si pointage détecté
- 🚫 **Message explicatif** sur l'absence prévue

#### Travail Non Planifié
- 🟧 **Arrière-plan orange** "travail extra"
- ⚡ **Indication** que tout sera compté comme supplémentaire
- 🎯 **Pas d'objectif fixe**, toutes les heures sont bonus

#### Repos
- 😴 **Interface de repos** apaisante
- 🌙 **Message** encourageant le repos
- 🟠 **Alerte** si travail détecté sur jour de repos

### Calculs Intelligents

#### Écarts et Variances
```javascript
// Écart normal avec planning
variance = totalHeures - plannedHours

// Travail extra (tout est bonus)
variance = "+${totalHeures}h (Extra)"

// Absence avec pointage (anomalie)  
variance = "${totalHeures}h (Inattendu)"
```

#### Barres de Progression
- **Normale** : Vert → Bleu → Orange selon avancement
- **Extra** : Orange constant (heures supplémentaires)
- **Anomalie** : Rouge (travail pendant absence)
- **Repos** : Grise (pas d'objectif)

## 🔧 Configuration et Maintenance

### Paramètres par Défaut
- **Objectif restaurant** : 7h (si pas de planning détaillé)
- **Seuil variance** : ±15 minutes avant alerte
- **Couleurs thématiques** : Adaptation mode sombre/clair

### Extensions Futures
- **Notifications push** lors d'anomalies détectées
- **Rapports automatiques** des heures extra
- **Validation manager** des pointages anormaux
- **Historique** des patterns de travail par employé

## 🚀 Comment Tester

1. **Démarrer les serveurs**
   ```bash
   # Backend
   cd server && node index.js
   
   # Frontend  
   cd client && npm run dev
   ```

2. **Tester chaque scénario**
   - Se connecter avec les comptes de test
   - Observer l'adaptation de l'interface
   - Faire des pointages et voir les réactions
   - Vérifier les calculs d'écarts

3. **Points de validation**
   - ✅ Interface différente selon le type de shift
   - ✅ Gestion des heures supplémentaires
   - ✅ Détection des anomalies
   - ✅ Calculs d'écarts corrects
   - ✅ Messages contextuels appropriés

## 💡 Cas d'Usage Avancés

### Gestion des Anomalies
- **Travail pendant absence** : Badge rouge + alerte manager
- **Dépassement important** : Notification automatique
- **Shift sans pointage** : Rappel en fin de journée

### Optimisations Restaurant
- **Rush imprévus** : Heures extra automatiquement étiquetées
- **Services courts** : Validation des pauses réglementaires
- **Planning modifié** : Mise à jour temps réel des objectifs

---

## 🎉 Résultat Final

Le système gère maintenant **intelligemment tous les scénarios possibles** dans un restaurant, de la présence normale aux situations exceptionnelles, en passant par les absences planifiées et le travail non prévu. L'interface s'adapte visuellement et fonctionnellement à chaque contexte, offrant une expérience utilisateur optimale et des calculs précis pour la gestion RH.
