# 🔄 Refonte complète de la logique métier - Gestion des employés

**Date**: 3 novembre 2025  
**Objectif**: Clarifier et corriger la logique de gestion du cycle de vie des employés (actif → parti → suppression)

---

## 📋 Problèmes identifiés

### ❌ Avant la refonte

| Problème | Impact |
|----------|---------|
| **Confusion statut/départ** | Le champ `statut` ('actif'/'inactif') et `dateSortie` créaient des incohérences |
| **Suppression d'employés actifs** | Possible de supprimer un employé toujours en poste |
| **Pas de réembauche** | Impossible d'annuler un départ (erreur de saisie ou nouveau contrat) |
| **Actions groupées incohérentes** | Activer/désactiver des employés partis |
| **Badges confus** | Affichage non clair du véritable statut |

---

## ✅ Règles métier implémentées

### 1. **États d'un employé**

```
┌─────────────────────────────────────────────────────────────┐
│                    CYCLE DE VIE                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🟢 ACTIF                                                   │
│  • dateSortie: null                                         │
│  • statut: 'actif'                                          │
│  • Peut se connecter: ✅                                    │
│  • Actions: Modifier, QR Code, Marquer départ              │
│  • Suppression: ❌ INTERDITE                                │
│                                                             │
│  🟠 COMPTE DÉSACTIVÉ (temporaire)                           │
│  • dateSortie: null                                         │
│  • statut: 'inactif'                                        │
│  • Peut se connecter: ❌                                    │
│  • Usage: Congé longue durée, suspension                    │
│  • Actions: Modifier, Réactiver                             │
│  • Suppression: ❌ INTERDITE                                │
│                                                             │
│  🔴 PARTI (définitif)                                       │
│  • dateSortie: Date                                         │
│  • statut: 'inactif' (automatique)                          │
│  • Peut se connecter: ❌                                    │
│  • Motifs: démission, licenciement, fin_cdd, etc.           │
│  • Actions: Voir départ, Annuler départ, Supprimer         │
│  • Suppression: ✅ AUTORISÉE (après 2 ans recommandé)      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. **Règles de suppression**

```javascript
// ❌ INTERDIT : Employé actif (dateSortie === null)
if (!employe.dateSortie) {
  throw "Suppression interdite - Employé actif";
}

// ⚠️ AVERTISSEMENT : Avant 2 ans (RGPD - conservation pour litiges)
const deuxAns = 2 * 365 * 24 * 60 * 60 * 1000;
const delai = Date.now() - new Date(employe.dateSortie);
if (delai < deuxAns) {
  console.warn(`Suppression avant délai RGPD recommandé`);
}

// ✅ AUTORISÉ : Après 2 ans (ou avant si nécessaire avec avertissement)
```

### 3. **Règles de réembauche**

#### Option A : Annuler le départ (erreur de saisie)
```javascript
// Réinitialise dateSortie, motifDepart, commentaireDepart
// Réactive automatiquement le compte (statut: 'actif')
PUT /admin/employes/:id/annuler-depart
```

#### Option B : Nouveau contrat (personne revenue)
```javascript
// Créer un nouvel employé avec nouveau compte
POST /admin/employes
```

---

## 🔧 Modifications techniques

### Backend (Node.js + Prisma)

#### 1. `marquerDepart()` - Mise à jour
```javascript
// ✅ AVANT: statut: 'parti' (valeur inexistante)
// ✅ APRÈS: statut: 'inactif' (désactivation automatique)

const updated = await prisma.user.update({
  where: { id: parseInt(id) },
  data: {
    statut: 'inactif',        // 🔒 Désactivation auto
    dateSortie: new Date(dateSortie),
    motifDepart,
    commentaireDepart
  }
});
```

#### 2. `annulerDepart()` - Nouvelle fonction
```javascript
const annulerDepart = async (req, res) => {
  const updated = await prisma.user.update({
    where: { id: parseInt(id) },
    data: {
      statut: 'actif',         // ✅ Réactivation auto
      dateSortie: null,
      motifDepart: null,
      commentaireDepart: null
    }
  });
};
```

#### 3. `supprimerEmploye()` - Validation renforcée
```javascript
// 🔒 Bloquer suppression employé actif
if (!employe.dateSortie) {
  return res.status(400).json({
    error: "Suppression interdite",
    code: "EMPLOYEE_ACTIVE"
  });
}

// ⚠️ Warning RGPD si < 2 ans
const deuxAns = 2 * 365 * 24 * 60 * 60 * 1000;
const delai = Date.now() - new Date(employe.dateSortie);
if (delai < deuxAns) {
  const joursRestants = Math.ceil((deuxAns - delai) / (24 * 60 * 60 * 1000));
  console.warn(`Suppression avant délai RGPD (${joursRestants}j restants)`);
}
```

#### 4. Route ajoutée
```javascript
// adminRoutes.js
router.put('/employes/:id/annuler-depart', authenticateToken, isAdmin, annulerDepart);
```

---

### Frontend (React)

#### 1. Filtrage Actifs/Partis - Basé sur `dateSortie`
```javascript
// ✅ AVANT: basé sur statut (incorrect)
// ✅ APRÈS: basé sur dateSortie (correct)

const estParti = e.dateSortie !== null && e.dateSortie !== undefined;

if (filtreStatut === 'actifs' && estParti) return false;
if (filtreStatut === 'partis' && !estParti) return false;
```

#### 2. Actions groupées - Validation métier
```javascript
const handleBulkChangeStatus = async (newStatus) => {
  // 🔒 Vérifier qu'aucun employé sélectionné n'est parti
  const employesPartis = employesSelectionnes.filter(e => e.dateSortie);
  
  if (employesPartis.length > 0) {
    alertService.error(
      'Action non autorisée',
      'Impossible de modifier des employés partis'
    );
    return;
  }
  
  // Continuer avec la modification...
};
```

#### 3. Nouvelle fonction - Annuler départ
```javascript
const handleAnnulerDepart = (employe) => {
  setConfirmModal({
    isOpen: true,
    title: "Annuler le départ",
    message: `Réactiver ${employe.prenom} ${employe.nom} ?`,
    onConfirm: async () => {
      await axios.put(
        `http://localhost:5000/admin/employes/${employe.id}/annuler-depart`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alertService.success("Départ annulé - Compte réactivé");
    }
  });
};
```

#### 4. Badges améliorés - Statut clair
```jsx
{/* Badge basé sur dateSortie ET statut */}
{e.dateSortie ? (
  <span className="bg-red-50 text-red-700">
    🔴 Parti
  </span>
) : e.statut === 'inactif' ? (
  <button onClick={() => handleToggleStatut(e)} className="bg-orange-50 text-orange-700">
    ⏸️ Compte désactivé
  </button>
) : (
  <button onClick={() => handleToggleStatut(e)} className="bg-green-50 text-green-700">
    ✅ Actif
  </button>
)}
```

#### 5. Actions par employé
```jsx
{!e.dateSortie ? (
  // ✅ ACTIF - Actions complètes
  <>
    <button>Modifier</button>
    <button>Marquer départ</button>
    <button>QR Code</button>
    <button disabled>Suppression bloquée</button>
  </>
) : (
  // 🔴 PARTI - Actions limitées
  <>
    <button>Voir détails départ</button>
    <button onClick={handleAnnulerDepart}>🔄 Annuler départ</button>
    <button onClick={handleDelete}>🗑️ Supprimer</button>
  </>
)}
```

---

## 🎯 Bénéfices

### Conformité métier
- ✅ Logique claire et cohérente
- ✅ Impossible de supprimer un employé actif
- ✅ Gestion des erreurs de saisie (annulation départ)
- ✅ Respect du cycle de vie d'un employé

### Conformité légale (RGPD)
- ✅ Conservation des données 2 ans (litiges)
- ✅ Avertissements lors de suppression anticipée
- ✅ Traçabilité des départs

### UX améliorée
- ✅ Badges clairs (Actif / Compte désactivé / Parti)
- ✅ Actions contextuelles selon le statut
- ✅ Messages d'erreur explicites
- ✅ Workflow intuitif

### Sécurité
- ✅ Validations backend ET frontend
- ✅ Actions groupées sécurisées
- ✅ Blocage des suppressions dangereuses

---

## 🧪 Tests recommandés

### Scénario 1 : Employé actif
1. ✅ Peut modifier les infos
2. ✅ Peut générer QR code
3. ✅ Peut marquer le départ
4. ❌ **Ne peut PAS** être supprimé

### Scénario 2 : Marquer un départ
1. Cliquer "Marquer départ"
2. Remplir date, motif, commentaire
3. **Vérifier** : Badge passe à "Parti"
4. **Vérifier** : Actions changent (Voir/Annuler/Supprimer)
5. **Vérifier** : Compte automatiquement désactivé (statut: 'inactif')

### Scénario 3 : Annuler un départ
1. Sur employé parti, cliquer "🔄 Annuler départ"
2. Confirmer
3. **Vérifier** : Badge passe à "Actif"
4. **Vérifier** : Actions reviennent (Modifier/QR/Marquer départ)
5. **Vérifier** : Employé peut se reconnecter

### Scénario 4 : Suppression
1. Employé actif : **Bloquer** avec message explicite
2. Employé parti < 2 ans : **Autoriser** avec warning backend
3. Employé parti > 2 ans : **Autoriser** normalement

### Scénario 5 : Actions groupées
1. Sélectionner 3 employés actifs + 2 partis
2. Cliquer "Désactiver"
3. **Vérifier** : Message d'erreur (partis inclus)
4. Désélectionner les partis
5. Réessayer : **Succès** (uniquement actifs)

---

## 📊 Impact sur la base de données

### Pas de migration nécessaire
- ✅ Schéma Prisma inchangé
- ✅ Les champs existent déjà (`dateSortie`, `statut`)
- ⚠️ **Attention** : Données existantes avec `statut: 'parti'` doivent être nettoyées

### Script de nettoyage (optionnel)
```javascript
// Mettre à jour les anciens statuts 'parti' → 'inactif'
await prisma.user.updateMany({
  where: { statut: 'parti' },
  data: { statut: 'inactif' }
});
```

---

## 🚀 Déploiement

### Checklist
- [x] Backend : Fonctions mises à jour
- [x] Backend : Route ajoutée
- [x] Backend : Validations renforcées
- [x] Frontend : Filtrage corrigé
- [x] Frontend : Actions groupées sécurisées
- [x] Frontend : Bouton "Annuler départ"
- [x] Frontend : Badges améliorés
- [ ] Tests manuels (scénarios 1-5)
- [ ] Nettoyage données existantes (si nécessaire)
- [ ] Documentation utilisateur

### Commandes
```bash
# Redémarrer le serveur backend
cd server
npm start

# Redémarrer le client frontend
cd client
npm start
```

---

## 📝 Notes

### Différence Désactiver vs Parti

| Critère | Compte désactivé | Parti |
|---------|------------------|-------|
| **dateSortie** | `null` | Date renseignée |
| **statut** | `inactif` | `inactif` |
| **Connexion** | ❌ | ❌ |
| **Usage** | Temporaire (congé, suspension) | Définitif (démission, etc.) |
| **Réactivation** | Badge cliquable | Bouton "Annuler départ" |
| **Suppression** | ❌ Interdite | ✅ Autorisée |
| **Turnover stats** | Non compté | ✅ Compté |

### Cas d'usage réels

**Compte désactivé** :
- Employé en congé maladie longue durée
- Suspension disciplinaire temporaire
- Compte en attente de régularisation

**Parti** :
- Démission
- Licenciement
- Fin de CDD
- Retraite
- Mutation vers autre entité
- Décès

---

**Auteur**: AI Assistant  
**Validation**: Mouss  
**Version**: 1.0 - Refonte complète
