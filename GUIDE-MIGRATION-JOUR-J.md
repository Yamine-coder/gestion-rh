# 🚀 GUIDE DE MIGRATION - JOUR J
## Passer de données factices aux vrais employés

> **DEADLINE**: Présentation à la patronne demain ✅
> **OBJECTIF**: Système HR fonctionnel avec vrais employés, vrais plannings, vrais emails, vrais rôles

---

## 📋 CHECKLIST PRÉ-MIGRATION

### ✅ 1. PRÉPARER LES VRAIES DONNÉES
```bash
cd c:\Users\Yamine\Documents\gestion-rh\server\scripts
```

**ÉTAPE CRITIQUE**: Remplir `config-vraies-donnees.js` avec les VRAIES informations:

- [ ] **Noms et prénoms réels** de tous les employés
- [ ] **Emails professionnels** (format: prenom.nom@entreprise.com)
- [ ] **Téléphones réels**
- [ ] **Postes exacts** et départements
- [ ] **Dates d'embauche** correctes
- [ ] **Rôles appropriés** (admin/employee/manager)
- [ ] **Horaires de travail** par catégorie
- [ ] **Salaires/taux horaires** réels

### ✅ 2. VALIDER LA CONFIGURATION
```bash
node valider-config.js
```
**OBLIGATOIRE**: Ce script doit retourner "CONFIGURATION PARFAITE" ou "ACCEPTABLE"

Si erreurs → Corriger le fichier config et re-valider

### ✅ 3. SAUVEGARDER L'EXISTANT
```bash
node sauvegarde-avant-migration.js
```
**SÉCURITÉ**: Crée une sauvegarde complète au cas où

---

## 🔄 MIGRATION (Jour J)

### Phase 1: Validation finale
```bash
# Terminal dans server/scripts/
node valider-config.js
```
→ Doit être ✅ avant de continuer

### Phase 2: Sauvegarde de sécurité
```bash
node sauvegarde-avant-migration.js
```
→ Note l'emplacement de la sauvegarde

### Phase 3: Migration des données
```bash
node migration-vraies-donnees.js
```

**CE QUE LE SCRIPT VA FAIRE:**
1. 🧹 Nettoyer toutes les données factices
2. 👥 Créer les vrais employés avec leurs vraies infos
3. 📅 Générer les plannings initiaux
4. 🔐 Configurer les accès et rôles
5. ⚙️ Paramétrer le système pour la production

### Phase 4: Vérification post-migration
```bash
cd ../
npm start
```
→ Démarrer le serveur et tester l'interface

---

## 🎯 POINTS DE CONTRÔLE

### À vérifier après migration:
- [ ] **Connexion admin** fonctionne avec le vrai compte administrateur
- [ ] **Liste employés** affiche les vrais noms
- [ ] **Emails** sont corrects (pour envoi notifications)
- [ ] **Rôles** sont bien assignés (admin/employee/manager)
- [ ] **Plannings** apparaissent pour chaque employé
- [ ] **Horaires de travail** correspondent à la réalité
- [ ] **Interface** affiche les vraies données

### Démonstration pour la patronne:
1. **Connexion admin** → Tableau de bord
2. **Vue d'ensemble** → Statistiques réelles
3. **Gestion employés** → Liste complète avec vrais noms
4. **Plannings** → Horaires de travail configurés
5. **Fonctionnalités** → Congés, pointages, rapports

---

## 🚨 EN CAS DE PROBLÈME

### Si la migration échoue:
```bash
# Aller dans le dossier de sauvegarde créé
cd ../sauvegardes/backup-[timestamp]
node restaurer.js
```

### Si données partiellement migrées:
```bash
# Re-nettoyer et recommencer
node migration-vraies-donnees.js --force
```

### Si validation échoue:
```bash
# Voir les exemples de configuration
node valider-config.js --exemple
```

---

## 📞 CONTACTS D'URGENCE

### Problèmes techniques:
- Vérifier les logs: `server/logs/`
- Redémarrer serveur: `npm restart`
- Base de données: Prisma Studio `npx prisma studio`

### Avant présentation:
- [ ] Serveur démarré: `npm start`
- [ ] Interface accessible: http://localhost:3001
- [ ] Compte admin fonctionnel
- [ ] Données visibles et cohérentes

---

## 🎉 SUCCÈS DE LA MIGRATION

**Indicateurs de réussite:**
- ✅ Tous les vrais employés sont dans le système
- ✅ Emails professionnels configurés
- ✅ Rôles et permissions fonctionnent
- ✅ Plannings générés automatiquement
- ✅ Interface affiche les vraies données
- ✅ Système prêt pour utilisation quotidienne

**Démonstration réussie = Mission accomplie! 🚀**

---

## 📝 NOTES IMPORTANTES

### Données à avoir sous la main:
- **Liste complète employés** (noms, prénoms, emails, postes)
- **Structure organisationnelle** (départements, hiérarchie)
- **Horaires de travail** par catégorie/poste
- **Informations contact** (téléphones, adresses)
- **Dates d'embauche** et statuts

### Configuration système:
- **Nom entreprise** et informations légales
- **Paramètres RH** (congés, heures sup, etc.)
- **Notifications email** activées
- **Sécurité** et accès configurés

### Tests pré-présentation:
1. Connexion admin ✅
2. Navigation interface ✅
3. Création planning ✅
4. Gestion employés ✅
5. Rapports fonctionnels ✅

> **RAPPEL**: Ce guide vous accompagne pour transformer votre système de test en solution RH professionnelle prête pour la production. Suivez chaque étape dans l'ordre pour garantir le succès de votre présentation demain! 💪
