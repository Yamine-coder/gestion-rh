# 🎭 SYSTÈME DE GESTION COMPLET DES SCÉNARIOS DE POINTAGE

## 📋 Vue d'ensemble

Le système de pointage a été étendu pour gérer **TOUS** les scénarios possibles dans un restaurant, y compris les situations non planifiées et les anomalies. Voici la documentation complète.

## 🔍 Scénarios Implémentés

### 1. 😴 JOURNÉE DE REPOS
**Situation :** Aucun shift planifié, aucun pointage
- **Interface :** Icône 😴, message "Profitez bien de votre repos !"
- **Couleur :** Gris
- **Comportement :** Pas de barre de progression, interface centrée sur le repos

### 2. ⚡ TRAVAIL NON PLANIFIÉ - EN COURS
**Situation :** Aucun shift prévu mais l'employé a pointé (arrivée seulement)
- **Interface :** Icône ⚡, titre "Travail non planifié"
- **Badge :** "Anomalie" (rouge)
- **Encadré :** Orange avec message "Ce travail sera comptabilisé comme heures supplémentaires"
- **Timeline :** Session en cours avec animation
- **Calcul :** Tout le temps comptabilisé comme extra

### 3. ⚡ TRAVAIL NON PLANIFIÉ - SESSION TERMINÉE
**Situation :** Aucun shift prévu mais session complète d'arrivée/départ
- **Interface :** Identique au scénario 2
- **Barre de progression :** Peut dépasser 100% (objectif par défaut 7h)
- **Détails :** "Tout extra +Xh" au lieu d'écart planning

### 4. 📅 PRÉSENCE PLANIFIÉE - NORMALE
**Situation :** Shift de présence avec segments détaillés
- **Interface :** Icône 📅, titre "Selon planning"
- **Segments :** Affichage des créneaux planifiés avec badges Extra si applicable
- **Progression :** Basée sur l'objectif calculé depuis les segments
- **Messages :** Adaptatifs selon l'avancement

### 5. 📋 PRÉSENCE PLANIFIÉE SANS DÉTAIL
**Situation :** Shift de présence mais sans segments horaires
- **Interface :** Icône 📋, titre "Planning sans détail"
- **Couleur :** Violet
- **Objectif :** 7h par défaut
- **Message :** "Planning prévu sans détail horaire"

### 6. 🚫 ABSENCE PLANIFIÉE
**Situation :** Shift d'absence (congé maladie, etc.)
- **Interface :** Icône 🚫, titre "Absence planifiée"
- **Encadré :** Rouge avec motif d'absence
- **Comportement :** Pas de barre de progression si pas de pointage

### 7. 🚨 ANOMALIE - ABSENCE + POINTAGE
**Situation :** Shift d'absence mais employé pointe quand même
- **Interface :** Identique absence mais avec badge "Anomalie"
- **Message :** "Pointage inattendu (absence prévue: motif)"
- **Couleur :** Rouge (alerte)
- **Traitement :** Pointages comptabilisés mais signalés comme anormaux

### 8. 😴➡️⚡ REPOS + POINTAGE INATTENDU
**Situation :** Jour de repos mais employé pointe
- **Interface :** Bascule vers "Travail sur jour de repos"
- **Couleur :** Orange
- **Message :** "Travail détecté sur jour de repos"
- **Traitement :** Toutes les heures comptées comme extra

## 🛠️ Script de Test

Utilisez `switch-scenario.js` pour tester tous les scénarios :

```bash
# Dans le répertoire server
node switch-scenario.js 1  # Repos complet
node switch-scenario.js 2  # Travail non planifié en cours
node switch-scenario.js 3  # Travail non planifié terminé
node switch-scenario.js 4  # Présence planifiée normale
node switch-scenario.js 5  # Absence planifiée
node switch-scenario.js 6  # Anomalie absence + pointage
```

## 🎯 Points Clés d'Implémentation

### Interface Adaptive
- **Titre dynamique** : Change selon le contexte (planning/non planifié/absence)
- **Icônes contextuelles** : 📅📋🚫⚡😴 selon la situation
- **Couleurs adaptées** : Bleu (normal), Orange (extra), Rouge (anomalie), Gris (repos)
- **Badges d'alerte** : "Anomalie" pour situations non conformes

### Calculs Intelligents
- **Objectifs dynamiques** : Calculés depuis les segments ou valeur par défaut
- **Détection automatique** : Des situations non planifiées
- **Gestion des extras** : Distinction segments normaux vs heures supplémentaires
- **Variance contextuelle** : Écart planning vs "tout extra"

### Gestion des Anomalies
- **Détection automatique** : Travail pendant absence, repos non respecté
- **Signalement visuel** : Badges et messages d'alerte
- **Traçabilité** : Tous les pointages conservés pour audit
- **Flexibilité** : Système permet les exceptions tout en les signalant

### Timeline Enrichie
- **Sessions en cours** : Animation et badge temporel
- **Durées calculées** : Automatiques entre arrivée/départ
- **Statuts visuels** : Points colorés selon type de pointage
- **Contexte temporel** : "En cours depuis X heures"

## 🔧 Configuration Technique

### Backend
- **shiftRoutes.js** : Endpoint `/mes-shifts` pour récupération employé
- **Prisma** : Schémas Shift (type, segments, motif) et Pointage
- **Authentication** : JWT avec mapping userId/employeId

### Frontend
- **workingHoursSystem** : Logique complète de détection de scénarios
- **Interface responsive** : Adaptation desktop/mobile
- **Composants dynamiques** : Rendu conditionnel selon contexte

## 📊 Comptes de Test

Pour tester tous les scénarios :
- **Email** : test@Mouss.com
- **Password** : password123
- **Utilisateur ID** : 86 (configuré dans les scripts)

## 🚀 Utilisation en Production

1. **Planification** : Créer les shifts via l'interface admin
2. **Pointage normal** : Employés pointent selon planning
3. **Gestion des extras** : Système détecte et signale automatiquement
4. **Audit des anomalies** : Interface admin pour vérifier les situations non conformes
5. **Rapports** : Distinction planning/extra pour paie et statistiques

## ✅ Avantages du Système

- **Exhaustif** : Couvre tous les cas d'usage restaurant
- **Intelligent** : Détection automatique des situations
- **Flexible** : Permet les exceptions tout en les traçant
- **User-friendly** : Interface intuitive et informative
- **Audit-ready** : Traçabilité complète pour contrôles

Le système est maintenant complet et prêt pour un usage en production dans un environnement restauration avec toutes les complexités réelles du terrain !
