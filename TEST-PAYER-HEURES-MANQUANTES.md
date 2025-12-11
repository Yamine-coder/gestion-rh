# 🧪 Test : Option "Payer les heures manquantes"

## ✅ Fonctionnalité implémentée

### Frontend (AnomalieActionModal.jsx)

**Nouveaux états :**
```javascript
const [payerHeuresManquantes, setPayerHeuresManquantes] = useState(false);
```

**Calcul automatique :**
```javascript
const heuresManquantes = details?.ecartMinutes ? Math.abs(details.ecartMinutes) / 60 : 0;
```

**Payload envoyé au backend :**
```javascript
{
  action: 'valider',
  commentaire: '...',
  payerHeuresManquantes: true,
  heuresARecuperer: 0.42  // Calculé automatiquement
}
```

**Interface utilisateur :**
- Case à cocher visible uniquement lors de la validation
- Affichée uniquement si `heuresManquantes > 0`
- Affichage clair des heures perdues (ex: "0.42h (25 minutes)")
- Indicateur visuel de l'impact sur la paie :
  - ✅ Coché : "Heures complètes payées"
  - ℹ️ Non coché : "Heures réelles payées (retard déduit)"

### Backend (anomaliesController.js)

**Nouveaux paramètres :**
```javascript
const { payerHeuresManquantes, heuresARecuperer } = req.body;
```

**Logs de traçabilité :**
```javascript
console.log('💰 Payer heures manquantes:', heuresARecuperer, 'heures');
```

**Mise à jour dans la base :**
```javascript
if (payerHeuresManquantes && heuresARecuperer > 0) {
  updateData.payerHeuresManquantes = true;
  updateData.heuresARecuperer = heuresARecuperer;
}
```

**Audit trail enrichi :**
```javascript
metadata: {
  shiftModifie,
  payerHeuresManquantes: payerHeuresManquantes || false,
  heuresARecuperer: heuresARecuperer || 0
}
```

**Réponse API :**
```javascript
res.json({
  success: true,
  anomalie: anomalieMAJ,
  shiftModifie,
  payerHeuresManquantes: payerHeuresManquantes || false,
  heuresARecuperer: heuresARecuperer || 0,
  message: '...'
});
```

### Base de données (schema.prisma)

**Nouveaux champs ajoutés au modèle Anomalie :**
```prisma
model Anomalie {
  // ... champs existants ...
  payerHeuresManquantes   Boolean  @default(false) // 💰 Payer les heures manquantes
  heuresARecuperer        Decimal? // 💰 Nombre d'heures à récupérer/payer
  // ...
}
```

**Migration créée :**
`20251130034054_add_payer_heures_manquantes/migration.sql`

---

## 📋 Scénarios de test

### Scénario 1 : Retard avec certificat médical (À PAYER)

**Contexte :**
- Employé : Pierre Martin
- Date : 28/11/2025
- Type : Retard de 25 minutes (arrivée 9h25 au lieu de 9h00)
- Justification : Certificat médical (rendez-vous médecin)

**Heures calculées :**
- Heures travaillées : 7h35
- Heures prévues : 8h00
- Heures manquantes : **0.42h (25 minutes)**

**Action manager :**
1. Ouvrir le modal de traitement
2. Sélectionner "VALIDER"
3. **Cocher** "💰 Payer les heures manquantes"
4. Commentaire : "Certificat médical vérifié du 28/11/2025"
5. Confirmer

**Résultat attendu :**
```json
{
  "statut": "validee",
  "payerHeuresManquantes": true,
  "heuresARecuperer": 0.42,
  "shiftModifie": false
}
```

**Message Toast :**
```
✅ Anomalie validée avec succès ! 💰 0.42h seront payées (justification acceptée).
```

**Impact paie :**
- Heures pointées : 7h35
- Heures payées : **8h00** ✅ (heures complètes)
- Motif : Certificat médical

---

### Scénario 2 : Retard sans justification valable (NE PAS PAYER)

**Contexte :**
- Employé : Sophie Bernard
- Date : 29/11/2025
- Type : Retard de 45 minutes (arrivée 9h45 au lieu de 9h00)
- Justification : "J'ai oublié de mettre mon réveil"

**Heures calculées :**
- Heures travaillées : 7h15
- Heures prévues : 8h00
- Heures manquantes : **0.75h (45 minutes)**

**Action manager :**
1. Ouvrir le modal de traitement
2. Sélectionner "VALIDER" (justification recevable mais pas de paiement)
3. **NE PAS cocher** "💰 Payer les heures manquantes"
4. Commentaire : "Justification acceptée mais heures non rémunérées"
5. Confirmer

**Résultat attendu :**
```json
{
  "statut": "validee",
  "payerHeuresManquantes": false,
  "heuresARecuperer": 0,
  "shiftModifie": false
}
```

**Message Toast :**
```
✅ Anomalie validée avec succès ! Justification acceptée.
```

**Impact paie :**
- Heures pointées : 7h15
- Heures payées : **7h15** ⚠️ (heures réelles)
- Motif : Retard personnel

---

### Scénario 3 : Retard avec urgence familiale (À PAYER)

**Contexte :**
- Employé : Marc Dupont
- Date : 30/11/2025
- Type : Retard de 1h30 (arrivée 10h30 au lieu de 9h00)
- Justification : Urgence médicale enfant (certificat école + justificatif hôpital)

**Heures calculées :**
- Heures travaillées : 6h30
- Heures prévues : 8h00
- Heures manquantes : **1.50h (90 minutes)**

**Action manager :**
1. Ouvrir le modal de traitement
2. Sélectionner "VALIDER"
3. **Cocher** "💰 Payer les heures manquantes"
4. Commentaire : "Urgence médicale enfant. Certificat école + facture urgences pédiatriques"
5. Confirmer

**Résultat attendu :**
```json
{
  "statut": "validee",
  "payerHeuresManquantes": true,
  "heuresARecuperer": 1.50,
  "shiftModifie": false
}
```

**Message Toast :**
```
✅ Anomalie validée avec succès ! 💰 1.50h seront payées (justification acceptée).
```

**Impact paie :**
- Heures pointées : 6h30
- Heures payées : **8h00** ✅ (heures complètes)
- Motif : Urgence familiale justifiée

---

### Scénario 4 : Refus (PAS DE CASE À COCHER)

**Contexte :**
- Employé : Julie Petit
- Date : 28/11/2025
- Type : Retard de 50 minutes
- Justification : Aucune

**Action manager :**
1. Ouvrir le modal de traitement
2. Sélectionner "REFUSER"
3. **Pas de case à cocher** (option visible uniquement pour validation)
4. Commentaire : "Aucun justificatif fourni malgré 2 relances"
5. Confirmer

**Résultat attendu :**
```json
{
  "statut": "refusee",
  "payerHeuresManquantes": false,
  "heuresARecuperer": 0,
  "shiftModifie": false
}
```

---

### Scénario 5 : Correction (PAS DE CASE À COCHER)

**Contexte :**
- Employé : Jean Dubois
- Date : 29/11/2025
- Type : Missing_in (pas de pointage entrée)
- Réalité : L'employé était en formation

**Action manager :**
1. Ouvrir le modal de traitement
2. Sélectionner "CORRIGER"
3. **Pas de case à cocher** (option visible uniquement pour validation)
4. Remplir le formulaire de correction
5. Confirmer

**Résultat attendu :**
```json
{
  "statut": "corrigee",
  "payerHeuresManquantes": false,
  "heuresARecuperer": 0,
  "shiftModifie": true
}
```

**Impact :**
- Shift modifié (formation ajoutée)
- Heures complètes payées (correction administrative)
- Aucune pénalité

---

## 🔍 Points de vérification

### Interface utilisateur
- [ ] Case à cocher visible uniquement lors de VALIDATION
- [ ] Case à cocher affichée uniquement si `heuresManquantes > 0`
- [ ] Affichage correct des heures (ex: "0.42h (25 minutes)")
- [ ] Indicateur visuel change selon l'état de la case
- [ ] Design cohérent (bordure verte, icône 💰)

### Comportement frontend
- [ ] État `payerHeuresManquantes` initialisé à `false`
- [ ] Calcul automatique de `heuresManquantes`
- [ ] Payload correcte envoyée au backend
- [ ] Message Toast adapté selon le choix

### Backend
- [ ] Paramètres correctement extraits du body
- [ ] Logs de traçabilité présents
- [ ] Mise à jour correcte dans la base
- [ ] Audit trail enrichi avec les bonnes données
- [ ] Réponse API complète

### Base de données
- [ ] Migration appliquée
- [ ] Champs `payerHeuresManquantes` et `heuresARecuperer` créés
- [ ] Valeurs par défaut correctes
- [ ] Données persistées correctement

### Audit et traçabilité
- [ ] Metadata contient `payerHeuresManquantes` et `heuresARecuperer`
- [ ] AnomalieAudit créé avec toutes les infos
- [ ] Logs console affichent les bonnes informations

---

## 🚀 Comment tester

1. **Démarrer le serveur :**
   ```bash
   npm run dev
   ```

2. **Créer des anomalies de test :**
   ```bash
   node create-anomalies-test-front.js
   ```

3. **Accéder à l'interface :**
   - Aller sur http://localhost:3000
   - Se connecter en tant qu'admin
   - Ouvrir le panneau "Administration des anomalies"

4. **Tester une validation avec paiement heures :**
   - Sélectionner une anomalie de type "retard"
   - Cliquer sur "Traiter"
   - Choisir "VALIDER"
   - Vérifier que la case "💰 Payer les heures manquantes" apparaît
   - Cocher la case
   - Observer le changement du message d'impact
   - Ajouter un commentaire
   - Confirmer
   - Vérifier le message Toast

5. **Vérifier dans la base de données :**
   ```sql
   SELECT id, employeId, type, statut, 
          payerHeuresManquantes, heuresARecuperer,
          commentaireManager
   FROM "Anomalie"
   WHERE statut = 'validee'
   ORDER BY traiteAt DESC
   LIMIT 5;
   ```

6. **Vérifier l'audit trail :**
   ```sql
   SELECT a.id, a.action, a.metadata
   FROM "AnomalieAudit" a
   WHERE a.action = 'valider'
   ORDER BY a.createdAt DESC
   LIMIT 5;
   ```

---

## 📊 Cas d'usage métier

### Quand cocher "Payer les heures manquantes" ?

✅ **À COCHER :**
- Certificat médical (rendez-vous médecin, urgences)
- Urgence familiale justifiée (enfant malade, décès proche)
- Accident de trajet avec preuve (constat, dépannage)
- Convocation administrative (tribunal, préfecture, etc.)
- Incident transport public majeur (attestation RATP/SNCF)

❌ **NE PAS COCHER :**
- Retard "réveil", "oubli", sans justification
- Problème personnel non urgent
- Retard récurrent sans raison valable
- Justification non recevable ou douteuse

### Responsabilité RH

Cette option doit être utilisée avec **discernement** :
- Vérifier l'authenticité des justificatifs
- Documenter dans le commentaire la raison du paiement
- Être cohérent dans les décisions (équité)
- Respecter le droit du travail (absences pour raisons médicales/familiales)

---

## 🎯 Avantages de cette solution

1. **Simplicité** : Une case à cocher, pas de calculs manuels
2. **Clarté** : Impact paie affiché clairement
3. **Flexibilité** : Manager décide au cas par cas
4. **Traçabilité** : Audit trail complet avec justification
5. **Légalité** : Permet de respecter les obligations légales (arrêts maladie, etc.)
6. **Équité** : Transparence des décisions pour tous les employés

---

## 📝 Documentation technique

### Flux de données

```
┌─────────────────────┐
│  AnomalieActionModal│
│  (Frontend React)   │
└──────────┬──────────┘
           │ 1. Calcul heuresManquantes
           │ 2. Affichage case à cocher
           │ 3. User coche/décoche
           ▼
┌─────────────────────┐
│   API Request       │
│   PUT /anomalies/:id│
└──────────┬──────────┘
           │ Payload:
           │ { payerHeuresManquantes, heuresARecuperer }
           ▼
┌─────────────────────┐
│ traiterAnomalie     │
│ (Backend Controller)│
└──────────┬──────────┘
           │ 1. Validation action='valider'
           │ 2. Maj Anomalie (payerHeuresManquantes)
           │ 3. Création AnomalieAudit
           ▼
┌─────────────────────┐
│  PostgreSQL         │
│  Table: Anomalie    │
└──────────┬──────────┘
           │ Données persistées
           ▼
┌─────────────────────┐
│  Système Paie       │
│  (Future intégration)
└─────────────────────┘
```

### Intégration future avec système de paie

Les données sont prêtes pour une intégration :
```javascript
// Récupérer les anomalies validées avec paiement heures
const anomaliesAPayer = await prisma.anomalie.findMany({
  where: {
    statut: 'validee',
    payerHeuresManquantes: true,
    date: {
      gte: debutMois,
      lte: finMois
    }
  },
  include: {
    employe: true
  }
});

// Pour chaque employé, calculer les heures à ajouter
const heuresParEmploye = {};
anomaliesAPayer.forEach(anom => {
  if (!heuresParEmploye[anom.employeId]) {
    heuresParEmploye[anom.employeId] = 0;
  }
  heuresParEmploye[anom.employeId] += parseFloat(anom.heuresARecuperer);
});

// Génération paie avec ajustements
// ...
```

---

## ✅ Checklist finale

- [x] Champs ajoutés au schéma Prisma
- [x] Migration créée et appliquée
- [x] Frontend : état `payerHeuresManquantes` ajouté
- [x] Frontend : calcul automatique `heuresManquantes`
- [x] Frontend : case à cocher avec design
- [x] Frontend : indicateur visuel impact paie
- [x] Frontend : payload enrichie
- [x] Frontend : message Toast adapté
- [x] Backend : paramètres extraits
- [x] Backend : mise à jour Anomalie
- [x] Backend : audit trail enrichi
- [x] Backend : logs de traçabilité
- [x] Backend : réponse API complète

**Prêt pour les tests ! 🎉**
