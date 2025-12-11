# Améliorations Planning & Mode Comparaison

## Date: 18 Décembre 2024

---

## 🎯 Vue d'ensemble

Le mode comparaison du Planning RH a été entièrement refondu pour offrir une expérience utilisateur intuitive et professionnelle. Les cellules de shift affichent maintenant visuellement tous les types d'anomalies avec des codes couleurs cohérents.

---

## 📊 Statistiques de Comparaison (comparaisonStats)

### Métriques calculées automatiquement :
```javascript
{
  total: 0,        // Total des écarts détectés
  retards: 0,      // Arrivées tardives
  absences: 0,     // Absences / segments non pointés
  heuresSup: 0,    // Heures supplémentaires
  nonPlanifies: 0, // Présences sans planning (nouveau!)
  nonTraitees: 0   // Anomalies en attente de traitement
}
```

---

## 🔘 Bouton Comparaison Dynamique

### États visuels :
| État | Couleur | Description |
|------|---------|-------------|
| Inactif | Gris | Mode comparaison désactivé |
| Actif sans anomalie | Bleu clair | RAS, tout va bien |
| Actif avec écarts | Bleu | Écarts détectés mais traités |
| Actif avec non-traités | Orange pulsant | Action requise (badge rouge) |

### Fonctionnalités :
- Badge animé affichant le nombre d'anomalies à traiter
- Tooltip détaillé avec breakdown des écarts
- Chargement automatique à l'activation

---

## 📋 Légende Mode Comparaison

Barre fixe en haut avec :
- Codes couleurs visuels
- Compteurs par catégorie (badges colorés)
- Bouton de fermeture rapide

### Couleurs de la légende :
| Type | Couleur | Hex |
|------|---------|-----|
| OK | Vert | `bg-emerald-500` |
| Retard | Orange | `bg-amber-400` |
| Absence | Rouge | `bg-red-400` |
| Heures Sup | Indigo | `bg-indigo-500` |
| Non planifié | Orange foncé | `bg-amber-500` |

---

## 🎨 Cellules de Shift - Refonte Visuelle Complète

### Types d'anomalies gérés :

#### 1. **OK / Validé** 
- Couleur: `bg-emerald-500` (vert)
- Icône: ✓
- Description: L'employé a respecté ses horaires planifiés

#### 2. **Retard Modéré** (< 15 min)
- Couleur: `bg-amber-400` (orange)
- Icône: ⏰
- Badge: `+XX min` (orange)
- Action: Non bloquant

#### 3. **Retard Critique** (≥ 15 min)
- Couleur: `bg-red-500` (rouge)
- Icône: ⏰
- Badge: `+XX min` (rouge pulsant)
- Action: Modale de traitement à l'ouverture

#### 4. **Départ Anticipé**
- Couleur: `bg-orange-400` (orange)
- Icône: 🏃
- Badge: `-XX min` (orange)
- Description: Départ avant l'heure prévue

#### 5. **Heures Supplémentaires**
- Couleur: `bg-indigo-500` (violet/indigo)
- Icône: ⏱️
- Badge: `+XX min` (indigo)
- Description: Travail au-delà des horaires prévus

#### 6. **Absent / Non Pointé**
- Couleur: `bg-red-400` avec texte barré
- Icône: ❌
- Badge: "Absent"
- Action: Modale de traitement à l'ouverture

#### 7. **Présence Non Planifiée** (NOUVEAU!)
- Couleur: `bg-amber-500` → `bg-orange-600`
- Icône: ❗
- Sous-titre: Horaires réels de pointage (`⏰ 09:30 → 17:45`)
- Badge: "TRAITER"
- Action: Modale de traitement à l'ouverture

---

## 🖱️ Interactions

### Cellules avec écarts :
- **Hover** : `scale-[1.02]` + ombre accrue
- **Click** : Ouvre la modale de traitement d'anomalie
- **Tooltip** : Détails complets + indication "Cliquer pour traiter"

### Indicateur visuel :
- Flèche `→` en haut à droite pour les cellules cliquables
- Badge "TRAITER" pour les anomalies nécessitant action admin

---

## 📱 Structure d'Affichage d'une Cellule

```
┌─────────────────────────────────────┐
│  09:00 → 18:00 (prévu)         → │  <- Indicateur cliquable
│  ─────────────────────────────────  │
│  ⏰ Retard                  +12min  │  <- Icône + Label + Badge
│  09:12 → 18:00 (réel)              │  <- Horaires réels
└─────────────────────────────────────┘
```

---

## 🔧 Code Technique

### Détection du statut :
```javascript
const getStatut = () => {
  if (isAbsent) return 'absent';
  if (minutesRetard >= 15) return 'retard_critique';
  if (minutesRetard > 0) return 'retard_modere';
  if (minutesDepartAnticipe > 0) return 'depart_premature';
  if (minutesHeuresSup > 0) return 'heures_sup';
  if (ecart.type === 'presence_non_prevue') return 'presence_non_prevue';
  return 'ok';
};
```

### Mapping couleurs :
```javascript
const colorMapping = {
  ok: 'bg-emerald-500',
  retard_modere: 'bg-amber-400',
  retard_critique: 'bg-red-500',
  depart_premature: 'bg-orange-400',
  heures_sup: 'bg-indigo-500',
  absent: 'bg-red-400'
};
```

---

## ✅ Résumé des Améliorations

1. **comparaisonStats** : Ajout compteur `nonPlanifies`
2. **Bouton Comparaison** : États dynamiques colorés
3. **Légende** : Badges colorés avec compteurs
4. **Cellules Shift** : 
   - Refonte visuelle complète
   - Tous types d'anomalies gérés
   - Horaires prévu vs réel affichés
   - Badges +/- minutes
   - Icônes distinctives
5. **Présences non planifiées** :
   - Affichage distinct avec horaires réels
   - Détection et comptage séparés
   - Style visuel orange/amber

---

## 📁 Fichiers Modifiés

- `client/src/components/PlanningRH.jsx`
  - Lignes 600-830 : Rendu des cellules de shift
  - Lignes 4469-4497 : comparaisonStats useMemo
  - Lignes 5956-6000 : Bouton Comparaison
  - Lignes 6151-6185 : Légende mode comparaison
