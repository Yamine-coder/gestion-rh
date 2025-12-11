# 📋 Résumé de la Configuration des Champs Modifiables

**Date**: 2 décembre 2024  
**Status**: ✅ Configuration complète et alignée

---

## 🎯 Configuration Finale Appliquée

### 📱 Modification DIRECTE (sans validation admin)
Ces champs sont modifiables immédiatement par l'employé :

1. **telephone** - Numéro de téléphone personnel
   - Format accepté : `+33612345678` ou `06 12 34 56 78`
   - Validation : 8 à 15 chiffres (+ optionnel au début)
   - Regex backend : `/^\+?\d{8,15}$/`
   - Regex frontend : `/^\+?\d{8,15}$/` (après nettoyage)

2. **adresse** - Adresse postale complète
   - Format accepté : Texte libre
   - Validation : Minimum 10 caractères
   - Exemple : "123 Rue de la Paix, 75000 Paris"

3. **photo** - Photo de profil
   - Upload direct via interface
   - Formats : JPG, PNG, WEBP
   - Taille max : 2MB
   - Stockage : `/uploads/photos-profil/`

---

### ⏳ Nécessite VALIDATION ADMIN
Ces champs créent une demande de modification qui doit être approuvée par un administrateur :

1. **nom** - Nom de famille
   - Format : Texte libre
   - Raison : Changement d'identité (nécessite justificatif)

2. **prenom** - Prénom
   - Format : Texte libre
   - Raison : Changement d'identité (nécessite justificatif)

3. **email** - Adresse email
   - Format : `exemple@domaine.fr`
   - Validation : `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
   - Raison : Affecte la connexion (normalisé en lowercase)

4. **iban** - Coordonnées bancaires RIB/IBAN
   - Format : `FR76XXXXXXXXXXXXXXXXXXXXXX`
   - Validation : `/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/`
   - Exemple : `FR7612345678901234567890123`
   - Raison : Données bancaires sensibles

5. **date_naissance** - Date de naissance
   - Format : Date
   - Raison : Nécessite document d'identité

---

### 🔒 Modifiable UNIQUEMENT par ADMIN
Ces champs ne peuvent être modifiés que par un administrateur/RH :

1. **categorie** - Catégorie/Poste
   - Raison : Détermine les droits et le salaire

2. **dateEmbauche** - Date d'embauche
   - Raison : Contractuel, non modifiable

3. **salaire** - Salaire de base
   - Raison : Contractuel, modifiable uniquement par RH/Admin

4. **statut** - Statut du contrat
   - Valeurs : actif/inactif/suspendu
   - Raison : Statut contractuel

5. **role** - Rôle dans l'application
   - Valeurs : admin/manager/employee
   - Raison : Détermine les droits d'accès

---

## 🔄 Workflow de Modification

### Pour les champs DIRECTS (telephone, adresse)
```
Employé modifie → Validation format frontend → API /modification-directe → DB mise à jour ✅
```

### Pour les champs VALIDATION (nom, prenom, email, iban, date_naissance)
```
Employé modifie → Validation format frontend → API /demande-modification → 
Demande créée (statut: en_attente) → Admin approuve/rejette → 
Si approuvé: DB mise à jour ✅
```

### Pour les champs VERROUILLES (categorie, dateEmbauche, salaire, statut, role)
```
Seul l'admin peut modifier via l'interface d'administration
```

---

## 📊 Statistics

- **Total champs configurés** : 13
- **Modification directe** : 3 champs (23%)
- **Validation admin** : 5 champs (38%)
- **Admin uniquement** : 5 champs (38%)

---

## 🛠️ Implémentation Technique

### Backend (server/)

**Routes** : `server/routes/modificationsRoutes.js`
- `PUT /api/modifications/modification-directe` - Modifications directes
- `POST /api/modifications/demande-modification` - Créer demande
- `GET /api/modifications/mes-demandes` - Voir ses demandes
- `GET /api/modifications/demandes-en-attente` - (Admin) Demandes en attente
- `PUT /api/modifications/traiter-demande/:id` - (Admin) Approuver/Rejeter
- `GET /api/modifications/config/champs-modifiables` - Configuration

**Validations Backend** :
```javascript
// Téléphone
const isValidPhoneNumber = (phone) => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return /^\+?\d{8,15}$/.test(cleaned);
};

// IBAN
const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

// Adresse
if (valeurFinale.length < 10) {
  return res.status(400).json({ error: 'Adresse trop courte' });
}
```

### Frontend (client/)

**Page** : `client/src/pages/ProfilEmploye.jsx`

**Validations Frontend** :
```javascript
// Téléphone
const phoneClean = telephone.replace(/[^\d+]/g, '');
if (!/^\+?\d{8,15}$/.test(phoneClean)) {
  setErreur('Format invalide');
}

// Email
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  setErreur('Format d\'email invalide');
}

// IBAN
const ibanClean = iban.replace(/\s/g, '').toUpperCase();
if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(ibanClean)) {
  setErreur('Format IBAN invalide');
}

// Adresse
if (adresse.trim().length < 10) {
  setErreur('Minimum 10 caractères');
}
```

### Database

**Tables** : `server/prisma/schema.prisma`
```prisma
model champs_modifiables_config {
  nom_champ         String   @id @db.VarChar(100)
  type_modification String   @db.VarChar(20)  // 'direct', 'validation', 'verrouille'
  description       String?
  actif             Boolean? @default(true)
}

model demandes_modification {
  id                     Int       @id @default(autoincrement())
  employe_id             Int
  champ_modifie          String    @db.VarChar(100)
  ancienne_valeur        String?
  nouvelle_valeur        String
  motif                  String?
  statut                 String?   @default("en_attente")
  date_demande           DateTime? @default(now())
  date_traitement        DateTime?
  valide_par             Int?
  commentaire_validation String?
}
```

---

## 📝 Scripts de Maintenance

### Vérifier la configuration
```bash
node server/check-champs-config.js
```

### Mettre à jour la configuration
```bash
node server/update-champs-config.js
```

---

## ✅ Tests à Effectuer

### Test 1 : Modification directe (téléphone)
1. ✅ Se connecter en tant qu'employé
2. ✅ Aller sur "Mon profil"
3. ✅ Cliquer sur "Modifier"
4. ✅ Changer le téléphone : `+33612345678`
5. ✅ Sauvegarder
6. ✅ Vérifier que le changement est immédiat (pas de demande créée)

### Test 2 : Modification avec validation (nom)
1. ✅ Se connecter en tant qu'employé
2. ✅ Aller sur "Mon profil"
3. ✅ Cliquer sur "Modifier"
4. ✅ Changer le nom
5. ✅ Sauvegarder
6. ✅ Vérifier qu'une demande a été créée (statut: en_attente)
7. ⏳ Admin approuve/rejette la demande
8. ⏳ Vérifier que le changement est appliqué si approuvé

### Test 3 : Format invalide
1. ✅ Téléphone invalide : `123` → Erreur
2. ✅ Email invalide : `testtest` → Erreur
3. ✅ IBAN invalide : `FR123` → Erreur
4. ✅ Adresse trop courte : `Test` → Erreur

---

## 🔮 Prochaines Étapes

### Interface Admin
- [ ] Créer page `/admin/demandes-modifications`
- [ ] Afficher toutes les demandes en attente
- [ ] Boutons Approuver/Rejeter
- [ ] Champ commentaire pour justifier le rejet
- [ ] Notifications aux employés

### Notifications Employé
- [ ] Afficher les demandes en attente dans le profil
- [ ] Badge "Demande en cours" sur les champs
- [ ] Notification quand demande approuvée/rejetée

### Historique
- [ ] Créer table `historique_modifications`
- [ ] Enregistrer toutes les modifications
- [ ] Afficher l'historique dans le profil admin

---

## 📞 Contact

Pour toute question sur cette configuration :
- Documentation technique : Ce fichier
- Scripts : `server/check-champs-config.js` et `server/update-champs-config.js`
- Routes API : `server/routes/modificationsRoutes.js`
- Interface : `client/src/pages/ProfilEmploye.jsx`
