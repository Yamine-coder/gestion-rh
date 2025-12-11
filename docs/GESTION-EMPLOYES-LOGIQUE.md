# 📋 Logique de gestion des employés - Documentation

## 🎯 Vue d'ensemble

Ce document décrit la logique cohérente et sécurisée de gestion des employés, incluant les différentes actions disponibles selon leur statut (actif vs parti).

---

## 📊 États des employés

### 1. **Employé ACTIF**
- `dateSortie` = null
- Peut se connecter et pointer
- Visible dans l'onglet "Actifs"

### 2. **Employé PARTI**
- `dateSortie` != null
- `motifDepart` renseigné
- `statut` = "parti"
- Visible dans l'onglet "Partis"
- Données conservées pour statistiques

---

## 🔧 Actions disponibles par statut

### ✅ **Onglet "ACTIFS"** (employés en poste)

| Action | Icône | Disponibilité | Description |
|--------|-------|---------------|-------------|
| **Modifier** | ✏️ | Tous | Éditer infos personnelles, rôle, catégorie |
| **Marquer le départ** | 🚪 | Employés uniquement | Enregistrer démission/licenciement/etc. |
| **QR Code** | 📱 | Employés uniquement | Générer QR pour pointage |
| **Supprimer** | 🚫 | **BLOQUÉ** | Message : "Marquez d'abord le départ" |

### 🚪 **Onglet "PARTIS"** (employés ayant quitté)

| Action | Icône | Disponibilité | Description |
|--------|-------|---------------|-------------|
| **Voir détails** | 👁️ | Tous | Modal avec date, motif, commentaire |
| **Supprimer** | 🗑️ | **AUTORISÉ** | Suppression définitive avec double confirmation |

---

## 🛡️ Règles de sécurité

### 1. **Protection contre suppression accidentelle**

```javascript
// ❌ BLOQUÉ : Suppression d'un employé actif
if (!employe.dateSortie) {
  alertService.error(
    "Action non autorisée", 
    "Marquez d'abord le départ de l'employé"
  );
  return; // Aucune suppression possible
}
```

### 2. **Confirmation renforcée pour suppression**

Lorsqu'un employé parti est supprimé :
- ⚠️ Message d'avertissement explicite
- Liste des données qui seront perdues
- Bouton "Supprimer définitivement" (pas juste "OK")
- Recommandation d'utiliser "Marquer le départ" à la place

### 3. **Conservation des données**

```sql
-- Au lieu de DELETE, on fait UPDATE
UPDATE users 
SET statut = 'parti',
    dateSortie = '2024-11-02',
    motifDepart = 'demission',
    commentaireDepart = 'Nouvel emploi'
WHERE id = 123;
```

---

## 📝 Workflow de départ d'un employé

### Étape 1 : Enregistrement du départ
1. Admin clique sur 🚪 "Marquer le départ"
2. Renseigne :
   - Date de départ (obligatoire)
   - Motif (obligatoire) : démission, licenciement, fin CDD, etc.
   - Commentaire (optionnel)
3. Confirmation
4. Statut passe à "parti"

### Étape 2 : Consultation
- Employé apparaît dans l'onglet "Partis"
- Clic sur 👁️ pour voir les détails
- Données conservées pour calcul du turnover

### Étape 3 : Suppression (cas exceptionnels)
**Uniquement pour** :
- Doublons
- Erreurs de saisie
- Après période de rétention légale (5-10 ans)

---

## 🎨 Interface utilisateur

### Tab "Actifs" - Desktop
```
┌─────────────────────────────────────────────┐
│ Email              │ Role   │ Actions       │
├─────────────────────────────────────────────┤
│ john@rest.fr       │ 👨‍🍳     │ ✏️ 🚪 📱 🚫    │
│ admin@rest.fr      │ 👑     │ ✏️ 🚫         │
└─────────────────────────────────────────────┘
```

### Tab "Partis" - Desktop
```
┌─────────────────────────────────────────────┐
│ Email              │ Départ     │ Actions  │
├─────────────────────────────────────────────┤
│ marie@rest.fr      │ 01/10/24   │ 👁️ 🗑️    │
└─────────────────────────────────────────────┘
```

---

## 📱 Responsive mobile

Même logique, mais actions en boutons pleine largeur :

**Actif** :
```
[✏️ Modifier] [🚪 Départ] [📱 QR Code]
```

**Parti** :
```
[👁️ Voir détails] [🗑️ Supprimer]
```

---

## 🔄 Flux de données

### Backend - Route de départ
```javascript
PUT /admin/employes/:id/depart
```

**Validations** :
- ✅ Employé existe
- ✅ Role = 'employee' (pas admin)
- ✅ Pas déjà parti
- ✅ Date et motif obligatoires

**Réponse** :
```json
{
  "id": 123,
  "statut": "parti",
  "dateSortie": "2024-11-02T00:00:00.000Z",
  "motifDepart": "demission",
  "commentaireDepart": "Nouvel emploi à Paris"
}
```

---

## 📊 Impact sur les statistiques

### Calcul du turnover
```javascript
const employesPartis = employes.filter(e => 
  e.dateSortie && 
  e.dateSortie >= startDate && 
  e.dateSortie <= endDate
);

const tauxTurnover = (employesPartis.length / effectifMoyen) * 100;
```

### Exclusion des partis
Les employés partis sont **exclus** de :
- Taux de présence
- Taux de ponctualité
- Répartition par catégorie (effectif actif)

Mais **inclus** dans :
- Évolution de l'effectif
- Calcul du turnover
- Historique des pointages

---

## 🎯 Avantages de cette approche

### 1. **Conformité légale** ✅
- Conservation des données (obligation 5-10 ans)
- Traçabilité des départs
- Preuve en cas de litige

### 2. **Statistiques fiables** 📊
- Turnover calculé sur vraies dates de départ
- Analyse des motifs de départ
- Tendances RH

### 3. **Sécurité** 🛡️
- Impossible de supprimer un actif par erreur
- Double confirmation pour suppressions
- Messages explicites

### 4. **UX claire** 🎨
- Séparation visuelle actifs/partis
- Actions adaptées au contexte
- Pas de confusion possible

---

## 🔮 Évolutions futures possibles

1. **Archivage automatique**
   - Après X années, déplacer dans table `users_archives`
   - Libérer la base de données principale

2. **Export des départs**
   - Rapport mensuel des départs
   - Export CSV pour RH

3. **Réembauche**
   - Bouton "Réembaucher" pour un parti
   - Réinitialise dateSortie, réactive le compte

4. **Workflow d'approbation**
   - Demande de départ nécessite validation N+2
   - Historique des validations

---

## ⚙️ Configuration

### Variables d'environnement
```env
# Durée de conservation (années)
DATA_RETENTION_YEARS=10

# Activer suppression automatique après rétention
AUTO_DELETE_AFTER_RETENTION=false
```

### Permissions
- **Admin** : Peut marquer les départs, supprimer les partis
- **Super Admin** : Peut supprimer n'importe qui (avec confirmation)

---

## 📚 Ressources complémentaires

- [RGPD et conservation des données RH](https://www.cnil.fr/fr/duree-de-conservation)
- [Code du travail - Article L1234-19](https://www.legifrance.gouv.fr/)
- [Calcul du turnover](https://www.economie.gouv.fr/entreprises/taux-rotation-personnel)

---

## 📞 Support

En cas de question sur la gestion des employés :
1. Consulter cette documentation
2. Vérifier les logs serveur (`console.log` avec emoji 🚪)
3. Contacter l'équipe technique

---

**Dernière mise à jour** : 2 novembre 2024  
**Version** : 2.0  
**Auteur** : Équipe Gestion RH
