# 🏢 GUIDE DE MIGRATION - STRUCTURE RESTAURANT

**Date**: 1er décembre 2024

---

## 📋 CATÉGORIES DU RESTAURANT

### Employés (role: `employee`)
1. **Pizzaiolo** (`pizzaiolo`) - Spécialiste des pizzas
2. **Pastaiolo** (`pastaiolo`) - Spécialiste des pâtes
3. **Agent d'entretien** (`agent_entretien`) - Nettoyage et maintenance
4. **Employé polyvalent** (`employe_polyvalent`) - Caisse et service

### Management (role: `manager`)
1. **Développeur/Manager** (`dev_manager`) - Moussa (vous)
2. **Gérante** (`gerante`) - Leila

### RH (role: `rh`)
1. **Assistante RH** (`assistante_rh`) - Gestion administrative

### Admin (role: `admin`)
- Compte système uniquement

---

## 🔄 CORRESPONDANCE ACTUELLE → NOUVELLE

### Structure actuelle (à nettoyer):
```
❌ Catégories actuelles incohérentes:
   - Service (6 personnes)
   - Management (3 personnes)
   - Cuisine (2 personnes)
   - Bar (2 personnes)
   - employe (3 personnes)
   - cadre (2 personnes)
   - technicien (2 personnes)
   - Administration (1 personne)
   - Entretien (1 personne)
   - non défini (2 personnes)

❌ Comptes de test à nettoyer:
   - test TEST
   - TEST TEST
   - TestComplet Validation
   - TestDouble Segment
   - deoe frefez
   - eezfezfvfdvf frfe
```

### Nouvelle structure (à implémenter):
```
✅ 4 catégories d'employés claires
✅ 2 managers identifiés
✅ 1 assistante RH
✅ Suppression des comptes de test
```

---

## 📝 TEMPLATE DE SCRIPT DE MIGRATION

Créez un fichier `appliquer-migration-restaurant.js` avec vos données réelles :

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrer() {
  console.log('🏢 Migration vers structure restaurant...\n');

  try {
    // 1. MANAGERS
    console.log('👔 Mise à jour des managers...');
    
    // Moussa (développeur/manager)
    await prisma.user.update({
      where: { email: "VOTRE_EMAIL@restaurant.com" }, // ← Remplacer
      data: {
        role: "manager",
        categorie: "dev_manager",
        statut: "actif"
      }
    });
    console.log('   ✅ Moussa (dev/manager)');

    // Leila (gérante)
    await prisma.user.update({
      where: { email: "leila@restaurant.com" }, // ← Remplacer
      data: {
        role: "manager",
        categorie: "gerante",
        statut: "actif"
      }
    });
    console.log('   ✅ Leila (gérante)');

    // 2. RH
    console.log('\n👥 Mise à jour RH...');
    await prisma.user.update({
      where: { email: "rh@restaurant.com" }, // ← Remplacer
      data: {
        role: "rh",
        categorie: "assistante_rh",
        statut: "actif"
      }
    });
    console.log('   ✅ Assistante RH');

    // 3. PIZZAIOLOS
    console.log('\n🍕 Mise à jour des pizzaiolos...');
    await prisma.user.updateMany({
      where: {
        email: {
          in: [
            "pizzaiolo1@restaurant.com", // ← Remplacer par vrais emails
            "pizzaiolo2@restaurant.com",
          ]
        }
      },
      data: {
        role: "employee",
        categorie: "pizzaiolo",
        statut: "actif"
      }
    });
    console.log('   ✅ Pizzaiolos mis à jour');

    // 4. PASTAIOLOS
    console.log('\n🍝 Mise à jour des pastaiolos...');
    await prisma.user.updateMany({
      where: {
        email: {
          in: [
            "pastaiolo1@restaurant.com", // ← Remplacer par vrais emails
            "pastaiolo2@restaurant.com",
          ]
        }
      },
      data: {
        role: "employee",
        categorie: "pastaiolo",
        statut: "actif"
      }
    });
    console.log('   ✅ Pastaiolos mis à jour');

    // 5. AGENTS D'ENTRETIEN
    console.log('\n🧹 Mise à jour des agents d\'entretien...');
    await prisma.user.updateMany({
      where: {
        email: {
          in: [
            "entretien1@restaurant.com", // ← Remplacer par vrais emails
          ]
        }
      },
      data: {
        role: "employee",
        categorie: "agent_entretien",
        statut: "actif"
      }
    });
    console.log('   ✅ Agents d\'entretien mis à jour');

    // 6. EMPLOYÉS POLYVALENTS (caisse + service)
    console.log('\n🔄 Mise à jour des employés polyvalents...');
    await prisma.user.updateMany({
      where: {
        email: {
          in: [
            "polyvalent1@restaurant.com", // ← Remplacer par vrais emails
            "polyvalent2@restaurant.com",
            // ... tous les autres
          ]
        }
      },
      data: {
        role: "employee",
        categorie: "employe_polyvalent",
        statut: "actif"
      }
    });
    console.log('   ✅ Employés polyvalents mis à jour');

    // 7. NETTOYER LES COMPTES DE TEST
    console.log('\n🗑️  Suppression des comptes de test...');
    const testsASupprimer = [
      "test@gmail.com",
      "TEST@GMAIL.COM",
      "test.complet@restaurant.com",
      "yjordan496@gmail.com",
      "ezfezfez@dj.com"
    ];
    
    await prisma.user.deleteMany({
      where: {
        email: { in: testsASupprimer }
      }
    });
    console.log(`   ✅ ${testsASupprimer.length} comptes de test supprimés`);

    // 8. VÉRIFICATION
    console.log('\n📊 Vérification finale...');
    const stats = await prisma.user.groupBy({
      by: ['role', 'categorie'],
      where: { role: { not: 'admin' } },
      _count: true
    });

    console.log('\n   RÉSULTAT:');
    stats.forEach(s => {
      console.log(`   ${s.role} / ${s.categorie}: ${s._count} personne(s)`);
    });

    console.log('\n✅ Migration terminée avec succès!\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrer();
```

---

## 🎯 ÉTAPES À SUIVRE

### 1. Identifier les emails réels
Créez un fichier texte avec la liste de vos employés :

```
MANAGERS:
- Moussa (dev/manager): _______________@restaurant.com
- Leila (gérante): _______________@restaurant.com

RH:
- Assistante RH: _______________@restaurant.com

PIZZAIOLOS:
- Employé 1: _______________@restaurant.com
- Employé 2: _______________@restaurant.com
...

PASTAIOLOS:
- Employé 1: _______________@restaurant.com
...

AGENTS D'ENTRETIEN:
- Employé 1: _______________@restaurant.com
...

EMPLOYÉS POLYVALENTS:
- Employé 1: _______________@restaurant.com
- Employé 2: _______________@restaurant.com
...
```

### 2. Adapter le script
Remplacez tous les emails dans le template ci-dessus par les vrais emails.

### 3. Tester en mode dry-run
Avant d'exécuter, vérifiez les emails :

```bash
cd server
node verifier-emails-migration.js
```

### 4. Exécuter la migration
```bash
cd server
node appliquer-migration-restaurant.js
```

### 5. Vérifier le résultat
```bash
cd server
node verifier-structure-finale.js
```

---

## 🔐 MISE À JOUR DES PERMISSIONS

Après la migration, vérifiez que les permissions sont correctes :

### Accès par rôle:
```
ADMIN:
✅ Accès complet au système
✅ Gestion des utilisateurs
✅ Configuration système

MANAGER (Moussa + Leila):
✅ Tableau de bord complet
✅ Gestion des employés
✅ Validation des pointages
✅ Gestion des congés
✅ Rapports et statistiques
✅ Planning
✅ Anomalies

RH (Assistante):
✅ Gestion des employés (CRUD)
✅ Gestion des congés
✅ Rapports RH
✅ Statistiques employés
❌ Planning (lecture seule)
❌ Pointages (lecture seule)

EMPLOYEE (Pizzaiolo, Pastaiolo, etc.):
✅ Pointage entrée/sortie
✅ Demande de congés
✅ Voir son planning
✅ Voir ses anomalies
❌ Voir les autres employés
❌ Validation
❌ Rapports
```

---

## 📊 RAPPORTS APRÈS MIGRATION

Les rapports Excel devront afficher :
- **Catégorie** de chaque employé
- **Filtrage par catégorie** possible
- **Statistiques par catégorie**:
  - Heures travaillées par catégorie
  - Taux de présence par catégorie
  - Anomalies par catégorie

---

## ⚠️ POINTS D'ATTENTION

### Comptes à nettoyer:
```
❌ test TEST (test@gmail.com)
❌ TEST TEST (TEST@GMAIL.COM)
❌ TestComplet Validation (test.complet@restaurant.com)
❌ TestDouble Segment (rôle "employe" typo)
❌ deoe frefez (yjordan496@gmail.com)
❌ eezfezfvfdvf frfe (ezfezfez@dj.com - inactif)
❌ Nathan Moreau (inactif)
```

### Comptes réels à identifier:
```
✅ 20 employés actifs restants
✅ 1 gérante (Leila)
✅ 1 assistante RH
✅ 1 dev/manager (vous)
```

---

## 💾 SCRIPTS FOURNIS

1. **migration-structure-restaurant.js** - Analyse de la structure actuelle
2. **appliquer-migration-restaurant.js** - Template à personnaliser
3. **verifier-structure-finale.js** - Vérification post-migration

---

## 📞 BESOIN D'AIDE ?

Pour générer le script de migration personnalisé, fournissez-moi :

1. Votre email (Moussa)
2. Email de Leila
3. Email de l'assistante RH
4. Liste des 20 employés avec leurs catégories :
   - Nom, Prénom, Email, Catégorie (pizzaiolo/pastaiolo/agent_entretien/employe_polyvalent)

Et je générerai le script complet prêt à exécuter ! 🚀
