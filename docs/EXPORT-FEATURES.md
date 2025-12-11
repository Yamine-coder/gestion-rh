# 📤 Fonctionnalités d'Export - Rapports d'Heures

## ✅ Fonctionnalités Implémentées

### 1. Export Global (Tous les employés)

**Route Backend** : `GET /api/stats/rapports/export-all`

**Emplacement** : Bouton "Exporter en Excel" sur la page principale `RapportsHeures.jsx`

**Paramètres** :
- `periode` : semaine / mois / trimestre
- `format` : csv (par défaut)

**Contenu du fichier CSV** :
```csv
RAPPORT D'HEURES - TOUS LES EMPLOYÉS
Période: 01/11/2025 au 30/11/2025
Généré le: 03/11/2025 10:30:45

Nom,Prénom,Email,Rôle,Heures Prévues,Heures Travaillées,Heures Supplémentaires,Heures Manquantes,Absences Justifiées,Absences Injustifiées,Nombre de Retards,Jours Planifiés,Jours Présents,Taux de Présence (%),Taux de Ponctualité (%),Moyenne h/jour
Dupont,Jean,jean.dupont@email.com,Employé,154.00,148.50,5.00,5.50,2,0,3,20,18,90,83,8.25
...

TOTAUX
Employés,,25
Heures Prévues,,3850.00
Heures Travaillées,,3720.50
Heures Supplémentaires,,120.00
Heures Manquantes,,129.50
Absences Justifiées,,45
Absences Injustifiées,,12
Retards Total,,67

MOYENNES
Taux de Présence Moyen,,88.5%
Taux de Ponctualité Moyen,,85.3%
Moyenne h/jour (équipe),,8.12
```

**Fonctionnalités** :
- ✅ Export de tous les employés en un seul fichier
- ✅ Filtrage par période (semaine/mois/trimestre)
- ✅ Calcul automatique des totaux et moyennes
- ✅ Format CSV compatible Excel (UTF-8 BOM)
- ✅ Notification de succès avec nombre d'employés exportés
- ✅ Bouton désactivé pendant le chargement
- ✅ Gestion des erreurs avec message utilisateur

---

### 2. Export Individuel (Par employé)

**Route Backend** : `GET /api/stats/employe/:employeId/export`

**Emplacement** : Menu déroulant dans le modal `RapportHeuresEmploye.jsx`

**Formats disponibles** :

#### 📊 Format CSV (Excel)
**Paramètres** : `format=csv`

**Contenu** :
```csv
Date,Heures Prévues,Heures Travaillées,Écart,Type,Motif
2025-11-01,8.00,8.25,+0.25,présence,
2025-11-02,8.00,7.50,-0.50,présence,
2025-11-03,0.00,0.00,0.00,absence,Congé payé
...

RÉSUMÉ
Employé,Jean Dupont
Email,jean.dupont@email.com
Période,2025-11-01 à 2025-11-30
Heures Prévues Total,154.00
Heures Travaillées Total,148.50
Écart Total,-5.50
```

**Avantages** :
- ✅ Ouvrable directement dans Excel
- ✅ Détail jour par jour
- ✅ Résumé de la période
- ✅ Écarts calculés automatiquement
- ✅ Types et motifs d'absence inclus

#### 📋 Format JSON (API)
**Paramètres** : `format=json`

**Structure** :
```json
{
  "employe": {
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@email.com"
  },
  "periode": {
    "type": "mois",
    "debut": "2025-11-01T00:00:00.000Z",
    "fin": "2025-11-30T23:59:59.999Z"
  },
  "donnees": [
    {
      "date": "2025-11-01",
      "heuresPrevues": "8.00",
      "heuresTravaillees": "8.25",
      "ecart": "+0.25",
      "type": "présence",
      "motif": null
    },
    ...
  ],
  "resume": {
    "totalPrevues": "154.00",
    "totalTravaillees": "148.50",
    "ecartTotal": "-5.50"
  },
  "genere": "2025-11-03T10:30:45.123Z"
}
```

**Avantages** :
- ✅ Format structuré pour intégrations
- ✅ Compatible avec APIs externes
- ✅ Parsing facile pour analyses personnalisées
- ✅ Horodatage de génération inclus

#### 📄 Format PDF (En développement)
**Statut** : 🚧 Non implémenté

**Raison** : Nécessite une bibliothèque de génération PDF (pdfkit, puppeteer, jsPDF)

**Retour actuel** : HTTP 501 (Not Implemented) avec message explicatif

**Affichage frontend** : Option grisée avec mention "Bientôt disponible"

---

## 🎨 Interface Utilisateur

### Bouton Export Global
**Emplacement** : Page principale, en haut à droite

**États** :
- 🟢 **Normal** : Icône download + texte "Exporter en Excel"
- ⚪ **Chargement** : Spinner animé, bouton désactivé
- ✅ **Succès** : Notification verte en bas à droite (3s)
- ❌ **Erreur** : Alert avec message d'erreur

### Menu Export Individuel
**Emplacement** : Modal rapport employé, header à droite

**Interaction** :
1. Clic sur "Exporter" → Menu déroulant s'affiche
2. Choix du format → Export déclenché automatiquement
3. Menu se ferme après sélection
4. Notification de succès affichée

**Design** :
- 📊 CSV : Icône document + texte vert
- 📋 JSON : Icône code + texte bleu
- 📄 PDF : Icône document + texte gris (désactivé)

---

## 🔧 Fonctionnalités Techniques

### Côté Backend

#### Calculs Automatiques
```javascript
// Heures prévues
shift.segments.forEach(segment => {
  if (segment.start && segment.end && !segment.isExtra) {
    heuresPrevues += calculateSegmentHours(segment);
  }
});

// Heures travaillées réelles
heuresTravaillees = calculateRealHours(pointagesJour);

// Heures supplémentaires
if (segment.isExtra) {
  heuresSupplementaires += calculateSegmentHours(segment);
}

// Retards
const retardInfo = analyserRetard(segment, pointagesJour, shift.date);
if (retardInfo.retard > 0) {
  nombreRetards++;
}
```

#### Gestion des Absences
```javascript
if (shift.type === 'absence') {
  const motif = shift.motif?.toLowerCase() || '';
  if (motif.includes('congé') || motif.includes('rtt') || motif.includes('maladie')) {
    absencesJustifiees++;
  } else {
    absencesInjustifiees++;
  }
}
```

#### Performance
- **Requêtes optimisées** : Récupération groupée des shifts et pointages
- **Traitement en lot** : Map pour regroupement par employé/jour
- **Pagination implicite** : Limitée par période sélectionnée
- **Cache** : Pas de cache actuellement (à implémenter)

### Côté Frontend

#### Gestion des fichiers
```javascript
// Création du blob
const url = window.URL.createObjectURL(new Blob([response.data]));

// Création du lien de téléchargement
const link = document.createElement('a');
link.href = url;
link.setAttribute('download', fileName);
document.body.appendChild(link);
link.click();

// Nettoyage
link.remove();
window.URL.revokeObjectURL(url);
```

#### Gestion des états
```javascript
const [showExportMenu, setShowExportMenu] = useState(false);

// Fermeture au clic extérieur
<div 
  className="fixed inset-0 z-40" 
  onClick={() => setShowExportMenu(false)}
/>
```

#### Notifications
```javascript
const notification = document.createElement('div');
notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
notification.innerHTML = `✓ Export ${format.toUpperCase()} réussi !`;
document.body.appendChild(notification);

setTimeout(() => {
  notification.style.opacity = '0';
  notification.style.transition = 'opacity 0.5s';
  setTimeout(() => notification.remove(), 500);
}, 2500);
```

---

## 📊 Métriques Exportées

### Pour chaque employé

| Métrique | Description | Calcul |
|----------|-------------|--------|
| **Heures Prévues** | Total planifié | Somme des segments de shifts |
| **Heures Travaillées** | Total réalisé | Somme des pointages (arrivée→départ) |
| **Heures Supplémentaires** | Heures extra | Segments marqués `isExtra` |
| **Heures Manquantes** | Déficit | `prévues - travaillées` (si positif) |
| **Absences Justifiées** | Jours congés/maladie | Type absence + motif |
| **Absences Injustifiées** | Jours absents sans motif | Type absence sans motif valide |
| **Nombre de Retards** | Occurrences | Arrivée > heure prévue |
| **Jours Planifiés** | Total dans planning | Shifts de type "présence" |
| **Jours Présents** | Avec pointages | Jours avec au moins 1 pointage |
| **Taux de Présence** | % présent/planifié | `(présents / planifiés) × 100` |
| **Taux de Ponctualité** | % jours à l'heure | `((présents - retards) / présents) × 100` |
| **Moyenne h/jour** | Heures par jour présent | `travaillées / jours présents` |

---

## 🚀 Améliorations Futures

### Court terme (Sprint 1-2)

#### 1. Export PDF avec génération HTML → PDF
**Bibliothèque suggérée** : `puppeteer` ou `pdfkit`

**Implémentation** :
```javascript
const puppeteer = require('puppeteer');

const generatePDF = async (rapportData) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const html = generateHTMLTemplate(rapportData);
  await page.setContent(html);
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true
  });
  
  await browser.close();
  return pdf;
};
```

#### 2. Export Excel natif (XLSX)
**Bibliothèque** : `exceljs` ou `xlsx`

**Avantages** :
- Formatage avancé (couleurs, bordures)
- Formules Excel natives
- Graphiques intégrés
- Multi-feuilles

```javascript
const ExcelJS = require('exceljs');

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Rapport');

// Styles et données
worksheet.columns = [...];
worksheet.addRows(data);

// Export
const buffer = await workbook.xlsx.writeBuffer();
```

#### 3. Export planifié automatique
**Fonctionnalité** : Envoi automatique par email

```javascript
// Planification hebdomadaire/mensuelle
const schedule = require('node-schedule');

schedule.scheduleJob('0 8 * * 1', async () => {
  // Générer rapport semaine précédente
  const rapport = await genererRapportGlobal('semaine');
  await envoyerEmail(managerEmail, rapport);
});
```

### Moyen terme (Sprint 3-4)

#### 4. Templates personnalisables
- Choix des colonnes à exporter
- Ordre des colonnes
- Filtres personnalisés
- Sauvegarder préférences

#### 5. Exports conditionnels
- Export seulement employés en retard
- Export employés avec absences > seuil
- Export par service/équipe

#### 6. Compression et archivage
- ZIP pour exports volumineux
- Archivage automatique après 30 jours
- Historique des exports

### Long terme (Sprint 5+)

#### 7. Intégration avec outils externes
- Export vers Google Sheets
- Synchronisation Slack/Teams
- Webhook sur génération rapport
- API REST publique

#### 8. Visualisations avancées
- Graphiques dans Excel
- Dashboard PDF interactif
- PowerBI / Tableau connector

---

## 🔒 Sécurité

### Authentification
- ✅ Token JWT requis pour tous les exports
- ✅ Middleware `authenticateToken` vérifie validité
- ✅ Middleware `isAdmin` vérifie permissions

### Audit
- ⚠️ **À implémenter** : Logs des exports
```javascript
await prisma.auditLog.create({
  data: {
    action: 'EXPORT_RAPPORT',
    userId: req.user.id,
    ressource: `employe:${employeId}`,
    format,
    periode,
    timestamp: new Date()
  }
});
```

### Limitations
- ⚠️ **À implémenter** : Rate limiting
```javascript
const rateLimit = require('express-rate-limit');

const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // 10 exports max par fenêtre
});

router.get('/export', exportLimiter, ...);
```

### RGPD
- ✅ Données anonymisables sur demande
- ⚠️ **À implémenter** : Consentement export données personnelles
- ⚠️ **À implémenter** : Suppression automatique exports après délai

---

## 📝 Documentation Utilisateur

### Comment exporter tous les rapports ?

1. Aller sur la page **Rapports d'heures**
2. Sélectionner la **période** (semaine/mois/trimestre)
3. Cliquer sur **"Exporter en Excel"** (bouton rouge en haut à droite)
4. Le fichier CSV est téléchargé automatiquement
5. Ouvrir avec Excel ou LibreOffice

### Comment exporter un rapport individuel ?

1. Sur la page **Rapports d'heures**, cliquer sur **"Voir rapport"** d'un employé
2. Dans le modal qui s'ouvre, cliquer sur **"Exporter"** (en haut à droite)
3. Choisir le format :
   - **Excel / CSV** : Pour ouvrir dans Excel
   - **JSON** : Pour intégrer dans un système externe
   - ~~**PDF**~~ : Bientôt disponible
4. Le fichier est téléchargé automatiquement

### Que contient le fichier exporté ?

#### Export global (tous employés)
- Données de tous les employés
- Totaux et moyennes d'équipe
- Période et date de génération

#### Export individuel
- Détail jour par jour
- Heures prévues vs travaillées
- Absences et retards
- Résumé de la période

---

## 🐛 Problèmes Connus

### 1. Format PDF non disponible
**Symptôme** : Erreur "Échec de chargement du document PDF"

**Cause** : Fonctionnalité non implémentée (retourne HTTP 501)

**Solution** : Utiliser CSV ou JSON en attendant

**Fix** : Implémenté, l'option est maintenant grisée dans le menu

### 2. Excel affiche des caractères bizarres
**Symptôme** : Accents mal affichés dans Excel

**Cause** : Encodage UTF-8 non détecté par Excel

**Solution déjà implémentée** : BOM UTF-8 ajouté (`\ufeff`)

### 3. Performances avec beaucoup d'employés
**Symptôme** : Export lent avec > 100 employés

**Cause** : Pas de pagination/streaming

**Solution temporaire** : Exporter période plus courte

**Fix futur** : Stream CSV ligne par ligne

---

## 📈 Statistiques d'Usage (à implémenter)

### Métriques à tracker
- Nombre d'exports par jour/mois
- Formats les plus utilisés
- Périodes les plus exportées
- Temps de génération moyen
- Taille moyenne des fichiers

### Dashboard admin
```javascript
// Exemple de requête analytics
const statsExports = await prisma.auditLog.groupBy({
  by: ['action', 'format'],
  where: {
    action: 'EXPORT_RAPPORT',
    timestamp: { gte: debut, lte: fin }
  },
  _count: true
});
```

---

**Version** : 1.0.0  
**Date** : 3 novembre 2025  
**Auteur** : Assistant GitHub Copilot
