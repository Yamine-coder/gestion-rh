# 🔄 WORKFLOW COMPLET DE GESTION DES ANOMALIES

## 📋 RÈGLE D'OR

**95% des cas : SHIFT NON MODIFIÉ** - On garde la trace de l'écart
**5% des cas : SHIFT MODIFIÉ** - Uniquement erreur administrative prouvée

---

## 🎯 LES 3 ACTIONS POSSIBLES

### 1️⃣ VALIDER (Anomalie légitime mais excusée)

**Quand ?**
- Retard justifié (transport, urgence familiale)
- Heures supplémentaires autorisées
- Départ anticipé avec accord préalable

**Workflow :**
```javascript
1. Manager examine justification (certificat, ticket transport)
2. Décision: ACCEPTER la justification
3. Anomalie → statut "validée"
4. ❌ Shift NON modifié (9h00 reste 9h00)
5. ✅ Pointage garde heure réelle (9h25)
6. Impact employé: -5 points score
7. Impact paye: Retenue proportionnelle OU indulgence
8. Historique conservé pour audit
```

**Résultat :**
- Écart documenté ✅
- Employé excusé partiellement ✅
- Stats réalistes ✅
- Pénalité légère ⚠️

---

### 2️⃣ REFUSER (Anomalie non justifiée)

**Quand ?**
- Retard sans justification valable
- Justificatif falsifié ou douteux
- Heures sup non autorisées
- Récidive abusive

**Workflow :**
```javascript
1. Manager examine justification
2. Décision: REJETER la justification
3. Anomalie → statut "refusée"
4. ❌ Shift NON modifié
5. ✅ Pointage garde heure réelle
6. Impact employé: -15 points score (DOUBLE pénalité)
7. Impact paye: Retenue + sanction possible
8. Déclenchement process disciplinaire si récidive
```

**Résultat :**
- Sanction renforcée 🚨
- Signal fort envoyé ⚠️
- Peut déclencher entretien/avertissement 📝

---

### 3️⃣ CORRIGER (Erreur administrative)

**Quand ?**
- Erreur de saisie du planning
- Formation/réunion oubliée dans le shift
- Changement de planning non communiqué
- Problème technique prouvé (badge HS, système en panne)

**Workflow :**
```javascript
1. Manager/RH détecte erreur de planning
2. Vérification: Y a-t-il eu changement non saisi ?
3. Preuve: Email, convocation, ticket support
4. Décision: CORRIGER le shift
5. ✅ SHIFT MODIFIÉ (9h00 → 9h30)
6. ✅ Pointage 9h35 devient acceptable (5min = OK)
7. Anomalie → statut "corrigée"
8. Impact employé: 0 points (pas sa faute)
9. Impact paye: Aucun
10. Création version shift dans historique
```

**Résultat :**
- Justice restaurée ⚖️
- Shift = nouvelle vérité ✅
- Employé non pénalisé ✅
- Traçabilité correction 📊

---

## 🗂️ STRUCTURE BASE DE DONNÉES

### Table Anomalie (Immuable)
```sql
CREATE TABLE Anomalie (
  id INT PRIMARY KEY,
  employeId INT,
  date DATE,
  type VARCHAR(50),
  gravite ENUM('info', 'attention', 'critique'),
  statut ENUM('en_attente', 'validee', 'refusee', 'corrigee'),
  
  -- DONNÉES ORIGINALES (jamais modifiées)
  shiftPrevu JSON, -- Planning initial
  pointageReel JSON, -- Ce qui s'est passé
  ecartMinutes INT,
  
  -- TRAITEMENT
  description TEXT,
  commentaireManager TEXT,
  justificationEmploye TEXT,
  fichierJustificatif VARCHAR(255),
  
  -- AUDIT
  traiteAt TIMESTAMP,
  traitePar INT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Table ShiftCorrection (Traçabilité)
```sql
CREATE TABLE ShiftCorrection (
  id INT PRIMARY KEY,
  shiftId INT,
  anomalieId INT,
  
  -- VERSIONS
  ancienneVersion JSON, -- Shift avant correction
  nouvelleVersion JSON, -- Shift après correction
  
  -- JUSTIFICATION
  raison TEXT,
  typeCorrection ENUM('erreur_admin', 'changement_planning', 'incident_technique'),
  preuves JSON, -- URLs documents justificatifs
  
  -- APPROBATION
  auteurId INT, -- Qui a fait la correction
  approuvePar INT, -- Manager/RH qui a validé
  
  -- AUDIT
  dateCorrection TIMESTAMP,
  ipAddress VARCHAR(45)
);
```

### Table AnomalieAudit (Log complet)
```sql
CREATE TABLE AnomalieAudit (
  id INT PRIMARY KEY,
  anomalieId INT,
  action ENUM('creation', 'validation', 'refus', 'correction', 'modification'),
  
  -- ÉTAT AVANT/APRÈS
  etatAvant JSON,
  etatApres JSON,
  
  -- AUTEUR
  userId INT,
  userRole VARCHAR(20),
  
  -- CONTEXTE
  commentaire TEXT,
  metadata JSON,
  
  -- TRAÇABILITÉ
  timestamp TIMESTAMP,
  ipAddress VARCHAR(45),
  userAgent TEXT
);
```

---

## 💻 IMPLÉMENTATION BACKEND

### Endpoint: PUT /api/anomalies/:id/traiter

```javascript
const traiterAnomalie = async (req, res) => {
  const { id } = req.params;
  const { action, commentaire, justification, shiftCorrection } = req.body;
  const userId = req.userId;
  const userRole = req.userRole;

  try {
    const anomalie = await prisma.anomalie.findUnique({
      where: { id: parseInt(id) },
      include: {
        employe: true,
        shift: true
      }
    });

    if (!anomalie) {
      return res.status(404).json({ error: 'Anomalie non trouvée' });
    }

    if (anomalie.statut !== 'en_attente') {
      return res.status(400).json({ 
        error: 'Anomalie déjà traitée',
        statut: anomalie.statut 
      });
    }

    // LOG AUDIT - État avant
    const etatAvant = { ...anomalie };

    let nouveauStatut;
    let impactScore = 0;
    let shiftModifie = false;

    switch (action) {
      case 'valider':
        // ✅ VALIDATION - Pas de modif shift
        nouveauStatut = 'validee';
        impactScore = calculerPenaliteValidation(anomalie);
        
        await prisma.anomalie.update({
          where: { id: parseInt(id) },
          data: {
            statut: nouveauStatut,
            commentaireManager: commentaire,
            traiteAt: new Date(),
            traitePar: userId
          }
        });

        // Appliquer pénalité score
        await appliquerPenaliteScore(anomalie.employeId, impactScore, 'validation_anomalie');
        
        // Notifier RH pour paye
        await notifierRHRetenue(anomalie);
        
        break;

      case 'refuser':
        // ❌ REFUS - Double pénalité, pas de modif shift
        nouveauStatut = 'refusee';
        impactScore = calculerPenaliteRefus(anomalie); // Double pénalité
        
        await prisma.anomalie.update({
          where: { id: parseInt(id) },
          data: {
            statut: nouveauStatut,
            commentaireManager: commentaire,
            traiteAt: new Date(),
            traitePar: userId
          }
        });

        // Double pénalité
        await appliquerPenaliteScore(anomalie.employeId, impactScore, 'refus_anomalie');
        
        // Vérifier si sanction nécessaire
        await verifierSanction(anomalie.employeId);
        
        break;

      case 'corriger':
        // 🔧 CORRECTION - SEUL CAS où on modifie le shift
        
        // Vérifier droits (RH ou Admin uniquement)
        if (!['admin', 'rh'].includes(userRole)) {
          return res.status(403).json({ 
            error: 'Seuls RH/Admin peuvent corriger un shift' 
          });
        }

        // Vérifier justification correction
        if (!shiftCorrection || !shiftCorrection.raison) {
          return res.status(400).json({ 
            error: 'Raison de correction requise' 
          });
        }

        nouveauStatut = 'corrigee';
        impactScore = 0; // Pas de pénalité (erreur admin)
        shiftModifie = true;

        // Sauvegarder ancienne version shift
        const ancienShift = await prisma.shift.findUnique({
          where: { id: anomalie.shiftId }
        });

        // MODIFIER LE SHIFT
        const nouveauShift = await prisma.shift.update({
          where: { id: anomalie.shiftId },
          data: {
            segments: shiftCorrection.nouveauxSegments,
            motif: 'Correction administrative',
            version: ancienShift.version + 1
          }
        });

        // Logger la correction
        await prisma.shiftCorrection.create({
          data: {
            shiftId: anomalie.shiftId,
            anomalieId: parseInt(id),
            ancienneVersion: ancienShift,
            nouvelleVersion: nouveauShift,
            raison: shiftCorrection.raison,
            typeCorrection: shiftCorrection.type,
            preuves: shiftCorrection.preuves,
            auteurId: userId,
            approuvePar: userId,
            dateCorrection: new Date(),
            ipAddress: req.ip
          }
        });

        // Marquer anomalie comme corrigée
        await prisma.anomalie.update({
          where: { id: parseInt(id) },
          data: {
            statut: nouveauStatut,
            commentaireManager: commentaire,
            traiteAt: new Date(),
            traitePar: userId,
            details: {
              ...anomalie.details,
              shiftCorrige: true,
              correctionId: nouveauShift.id
            }
          }
        });

        break;

      default:
        return res.status(400).json({ 
          error: 'Action invalide (valider, refuser, corriger)' 
        });
    }

    // LOG AUDIT - État après
    const anomalieMAJ = await prisma.anomalie.findUnique({
      where: { id: parseInt(id) },
      include: { employe: true, traiteur: true }
    });

    await prisma.anomalieAudit.create({
      data: {
        anomalieId: parseInt(id),
        action: action,
        etatAvant: etatAvant,
        etatApres: anomalieMAJ,
        userId: userId,
        userRole: userRole,
        commentaire: commentaire,
        metadata: {
          impactScore,
          shiftModifie,
          ipAddress: req.ip
        },
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    // Notification employé
    await notifierEmploye(anomalie.employeId, {
      type: 'anomalie_traitee',
      anomalieId: parseInt(id),
      statut: nouveauStatut,
      commentaire: commentaire
    });

    res.json({
      success: true,
      anomalie: anomalieMAJ,
      impactScore,
      shiftModifie,
      message: `Anomalie ${nouveauStatut} avec succès`
    });

  } catch (error) {
    console.error('Erreur traitement anomalie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
```

---

## 🎨 COMPOSANT REACT

```jsx
// AnomalieActionModal.jsx
import React, { useState } from 'react';
import { Check, X, Edit, AlertTriangle } from 'lucide-react';

export default function AnomalieActionModal({ anomalie, onClose, onSuccess }) {
  const [action, setAction] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [shiftCorrection, setShiftCorrection] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/anomalies/${anomalie.id}/traiter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action,
          commentaire,
          shiftCorrection: action === 'corriger' ? shiftCorrection : null
        })
      });

      if (!response.ok) throw new Error('Erreur traitement');

      const data = await response.json();
      onSuccess(data);
      onClose();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du traitement de l\'anomalie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Traiter l'anomalie</h2>

        {/* Détails anomalie */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Employé:</span> {anomalie.employe.prenom} {anomalie.employe.nom}
            </div>
            <div>
              <span className="font-medium">Date:</span> {new Date(anomalie.date).toLocaleDateString('fr-FR')}
            </div>
            <div>
              <span className="font-medium">Type:</span> {anomalie.type}
            </div>
            <div>
              <span className="font-medium">Gravité:</span> 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                anomalie.gravite === 'critique' ? 'bg-red-100 text-red-700' :
                anomalie.gravite === 'attention' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {anomalie.gravite}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-medium">Description:</span>
            <p className="text-gray-700 mt-1">{anomalie.description}</p>
          </div>
        </div>

        {/* Choix action */}
        {!action ? (
          <div className="space-y-3">
            <button
              onClick={() => setAction('valider')}
              className="w-full flex items-center gap-3 p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition"
            >
              <Check className="h-6 w-6 text-green-600" />
              <div className="text-left flex-1">
                <div className="font-semibold text-green-700">✅ VALIDER</div>
                <div className="text-sm text-gray-600">
                  Anomalie légitime mais justifiée. Pénalité légère (-5pts). 
                  <strong className="text-red-600"> Shift NON modifié.</strong>
                </div>
              </div>
            </button>

            <button
              onClick={() => setAction('refuser')}
              className="w-full flex items-center gap-3 p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 transition"
            >
              <X className="h-6 w-6 text-red-600" />
              <div className="text-left flex-1">
                <div className="font-semibold text-red-700">❌ REFUSER</div>
                <div className="text-sm text-gray-600">
                  Justification non acceptable. Double pénalité (-15pts). 
                  <strong className="text-red-600"> Shift NON modifié.</strong>
                </div>
              </div>
            </button>

            <button
              onClick={() => setAction('corriger')}
              className="w-full flex items-center gap-3 p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition"
            >
              <Edit className="h-6 w-6 text-blue-600" />
              <div className="text-left flex-1">
                <div className="font-semibold text-blue-700">🔧 CORRIGER</div>
                <div className="text-sm text-gray-600">
                  Erreur administrative. Aucune pénalité. 
                  <strong className="text-green-600"> Shift MODIFIÉ.</strong>
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Alert selon action */}
            {action === 'corriger' && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Attention:</strong> Cette action va modifier le shift original. 
                  À n'utiliser QUE pour les erreurs administratives avérées. 
                  L'ancienne version sera conservée dans l'historique.
                </div>
              </div>
            )}

            {/* Formulaire correction shift */}
            {action === 'corriger' && (
              <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900">Correction du shift</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Type d'erreur</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => setShiftCorrection({
                      ...shiftCorrection,
                      type: e.target.value
                    })}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="erreur_admin">Erreur de saisie administrative</option>
                    <option value="changement_planning">Changement planning non saisi</option>
                    <option value="incident_technique">Incident technique (badge, système)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Nouvelle heure prévue</label>
                  <input 
                    type="time"
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => setShiftCorrection({
                      ...shiftCorrection,
                      nouvelleHeure: e.target.value
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Justification détaillée *</label>
                  <textarea 
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="3"
                    placeholder="Ex: Email de convocation à réunion du 25/11, formation inscrite dans système RH..."
                    value={shiftCorrection?.raison || ''}
                    onChange={(e) => setShiftCorrection({
                      ...shiftCorrection,
                      raison: e.target.value
                    })}
                  />
                </div>
              </div>
            )}

            {/* Commentaire */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Commentaire {action === 'corriger' ? '(optionnel)' : '*'}
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="4"
                placeholder={
                  action === 'valider' ? "Ex: Justificatif médical accepté" :
                  action === 'refuser' ? "Ex: Pas de justificatif fourni malgré relance" :
                  "Détails de la correction..."
                }
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={() => setAction(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || (action === 'corriger' && !shiftCorrection?.raison)}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-medium ${
                  action === 'valider' ? 'bg-green-600 hover:bg-green-700' :
                  action === 'refuser' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Traitement...' : `Confirmer ${
                  action === 'valider' ? 'validation' :
                  action === 'refuser' ? 'refus' :
                  'correction'
                }`}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
```

---

## 📊 FONCTIONS UTILITAIRES

```javascript
// utils/anomalieCalculs.js

/**
 * Calculer pénalité validation (modérée)
 */
export function calculerPenaliteValidation(anomalie) {
  switch(anomalie.type) {
    case 'retard_simple': return -2;
    case 'retard_modere': return -5;
    case 'retard_critique': return -10;
    case 'depart_anticipe': return -3;
    case 'heures_sup': return 0; // Pas de pénalité si validé
    default: return -5;
  }
}

/**
 * Calculer pénalité refus (sévère - double)
 */
export function calculerPenaliteRefus(anomalie) {
  return calculerPenaliteValidation(anomalie) * 2;
}

/**
 * Appliquer pénalité au score employé
 */
export async function appliquerPenaliteScore(employeId, points, raison) {
  const scoreActuel = await prisma.employeScore.findUnique({
    where: { employeId }
  });

  const nouveauScore = Math.max(0, Math.min(100, (scoreActuel?.score || 100) + points));

  await prisma.employeScore.upsert({
    where: { employeId },
    update: { 
      score: nouveauScore,
      historiqueModifications: {
        push: {
          date: new Date(),
          ancienScore: scoreActuel?.score,
          nouveauScore,
          delta: points,
          raison
        }
      }
    },
    create: {
      employeId,
      score: nouveauScore
    }
  });
}

/**
 * Vérifier si sanction nécessaire (3 refus = entretien)
 */
export async function verifierSanction(employeId) {
  const refusRecents = await prisma.anomalie.count({
    where: {
      employeId,
      statut: 'refusee',
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 jours
      }
    }
  });

  if (refusRecents >= 3) {
    // Créer alerte RH
    await prisma.alerteRH.create({
      data: {
        employeId,
        type: 'sanction_requise',
        gravite: 'haute',
        message: `${refusRecents} anomalies refusées en 30 jours`,
        recommandation: 'Entretien disciplinaire recommandé'
      }
    });
  }
}

/**
 * Notifier RH pour retenue salaire
 */
export async function notifierRHRetenue(anomalie) {
  const montantRetenue = calculerMontantRetenue(anomalie);
  
  await prisma.notification.create({
    data: {
      destinataireRole: 'rh',
      type: 'retenue_salaire',
      titre: 'Retenue salaire à appliquer',
      message: `Anomalie validée pour ${anomalie.employe.nom}`,
      metadata: {
        anomalieId: anomalie.id,
        employeId: anomalie.employeId,
        montant: montantRetenue,
        periodeePaye: getCurrentPayPeriod()
      }
    }
  });
}

/**
 * Calculer montant retenue
 */
function calculerMontantRetenue(anomalie) {
  const tauxHoraire = anomalie.employe.salaireHoraire || 12.50;
  const minutesRetard = anomalie.ecartMinutes || 0;
  const heures = minutesRetard / 60;
  
  return heures * tauxHoraire;
}
```

---

## ✅ CHECKLIST IMPLÉMENTATION

- [ ] Modifier table `Anomalie` (ajouter champs audit)
- [ ] Créer table `ShiftCorrection`
- [ ] Créer table `AnomalieAudit`
- [ ] Créer table `EmployeScore` (si pas existe)
- [ ] Implémenter endpoint `PUT /api/anomalies/:id/traiter`
- [ ] Créer fonctions utilitaires calculs
- [ ] Créer composant `AnomalieActionModal.jsx`
- [ ] Intégrer dans interface principale
- [ ] Tester workflow validation
- [ ] Tester workflow refus
- [ ] Tester workflow correction avec audit trail
- [ ] Implémenter notifications (email/push)
- [ ] Créer dashboard RH pour suivre sanctions
- [ ] Documentation utilisateur

---

## 🎯 RÉSUMÉ FINAL

| Action | Shift modifié ? | Score | Paye | Cas d'usage |
|--------|----------------|-------|------|-------------|
| **VALIDER** | ❌ NON | -5 pts | Retenue légère | Justification acceptée |
| **REFUSER** | ❌ NON | -15 pts | Retenue + sanction | Justification rejetée |
| **CORRIGER** | ✅ OUI | 0 pts | Aucun impact | Erreur admin uniquement |

**Principe clé:** Le shift = contrat de travail. On ne le modifie QUE si erreur de notre côté.
