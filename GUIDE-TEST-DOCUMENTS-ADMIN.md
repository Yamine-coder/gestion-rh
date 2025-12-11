# Guide de Test - Section Documents Administratifs

## ✅ Fonctionnalités Implémentées

### Backend
- **Routes créées** : `/api/documents/upload` et `/api/documents/delete/:type`
- **Types supportés** : `domicile`, `rib`, `navigo`
- **Formats acceptés** : PDF, JPG, PNG, WEBP
- **Taille max** : 5 MB par fichier
- **Stockage** : `/server/uploads/documents/`
- **Remplacement automatique** : L'ancien fichier est supprimé lors d'un nouvel upload

### Frontend
- **Composant réutilisable** : `UploadDocument.jsx`
- **Section dédiée** : "Documents administratifs" dans `ProfilEmploye.jsx`
- **3 types de documents** :
  - 🏠 Justificatif de domicile
  - 🏦 RIB bancaire
  - 🚇 Pass Navigo
- **Animations harmonisées** : Même style que l'upload photo
- **Toasts de confirmation** : Messages de succès après upload/suppression

### Base de données
- **Champs ajoutés** :
  - `justificatifDomicile` (String?)
  - `justificatifRIB` (String?)
  - `justificatifNavigo` (String?) - existait déjà
- **Migration SQL** : Exécutée avec succès
- **Prisma client** : Régénéré (v6.15.0)

---

## 📋 Scénarios de Test

### Test 1 : Upload Justificatif de Domicile
1. Se connecter avec un compte employé
2. Aller sur "Mon Profil"
3. Scroller jusqu'à "Documents administratifs"
4. Cliquer sur "Ajouter" pour le justificatif de domicile
5. **Vérifier** :
   - Modal s'ouvre avec animation
   - Titre : "Justificatif de domicile"
   - Hint : "Facture, bail, quittance de loyer (moins de 3 mois)"
6. Sélectionner un fichier PDF ou image
7. **Vérifier** :
   - Prévisualisation s'affiche (image) ou icône PDF
   - Bouton "Valider et envoyer" apparaît
8. Cliquer sur "Valider et envoyer"
9. **Vérifier** :
   - Animation d'upload (spinner + blur)
   - Message "Upload en cours..."
   - Modal se ferme après 1 seconde
   - Toast de succès : "✅ Document de domicile mis à jour avec succès"
   - Badge "Document ajouté" avec ✅ vert
10. Rafraîchir la page
11. **Vérifier** : Le badge "Document ajouté" est toujours présent

### Test 2 : Remplacer un Document Existant
1. Avec un document déjà uploadé, cliquer sur "Modifier"
2. **Vérifier** :
   - Encadré vert "Document actuel" visible
   - Nom du fichier affiché (ex: `domicile-110-1733090123456.pdf`)
   - Lien "📄 Voir le document" (cliquable)
   - Bouton "🗑️ Supprimer"
3. Sélectionner un nouveau fichier
4. **Vérifier** :
   - L'encadré "Document actuel" reste visible
   - Nouvelle prévisualisation s'affiche en dessous
5. Cliquer sur "Valider et envoyer"
6. **Vérifier** :
   - Upload réussi
   - Ancien fichier supprimé du serveur
   - Nouveau fichier visible

### Test 3 : Supprimer un Document
1. Cliquer sur "Modifier" pour un document existant
2. Cliquer sur "🗑️ Supprimer"
3. **Vérifier** :
   - Encadré rouge de confirmation apparaît
   - Message : "Confirmer la suppression ?"
   - "Cette action est irréversible."
4. Cliquer sur "Annuler"
5. **Vérifier** : Encadré de confirmation disparaît
6. Re-cliquer sur "🗑️ Supprimer"
7. Cliquer sur "Supprimer" (bouton rouge)
8. **Vérifier** :
   - Modal se ferme
   - Badge devient "Aucun document" (ambre)
   - Toast de succès (selon implémentation)

### Test 4 : Upload RIB Bancaire
1. Cliquer sur "Ajouter" pour le RIB bancaire
2. **Vérifier** :
   - Titre : "RIB bancaire"
   - Hint : "Relevé d'identité bancaire (format PDF ou image)"
3. Uploader un fichier
4. **Vérifier** : Même flux que domicile

### Test 5 : Upload Pass Navigo
1. Cliquer sur "Ajouter" pour le Pass Navigo
2. **Vérifier** :
   - Titre : "Pass Navigo"
   - Hint : "Justificatif mensuel Pass Navigo"
3. Uploader un fichier
4. **Vérifier** : Même flux que domicile

### Test 6 : Validation des Formats
1. Tenter d'uploader un fichier .txt ou .docx
2. **Vérifier** :
   - Message d'erreur : "❌ Format non autorisé. Utilisez PDF, JPG, PNG ou WEBP."
   - Encadré rouge avec icône d'erreur
   - Bouton d'upload désactivé

### Test 7 : Validation de la Taille
1. Tenter d'uploader un fichier > 5 MB
2. **Vérifier** :
   - Message d'erreur : "❌ Le fichier est trop volumineux (max 5 MB)."

### Test 8 : Responsive Design
1. Ouvrir sur mobile (ou DevTools mode mobile)
2. **Vérifier** :
   - Modal prend toute la largeur (avec padding)
   - Spinner et boutons bien proportionnés
   - Textes lisibles
3. Ouvrir sur desktop
4. **Vérifier** :
   - Modal centré avec max-width
   - Animations fluides

### Test 9 : Persistence de Données
1. Uploader un document de chaque type
2. Se déconnecter
3. Se reconnecter
4. Aller sur "Mon Profil"
5. **Vérifier** : Les 3 badges "Document ajouté" sont présents

### Test 10 : Accès Fichiers
1. Avec un document uploadé, cliquer sur "📄 Voir le document"
2. **Vérifier** :
   - Fichier s'ouvre dans un nouvel onglet
   - URL : `http://localhost:5000/uploads/documents/[type]-[userId]-[timestamp].[ext]`
   - Contenu correct (PDF ou image)

---

## 🔍 Points de Vérification Backend

### Logs Serveur
- Rechercher les logs suivants après upload :
  ```
  🗑️  Ancien document supprimé: /uploads/documents/...
  ✅ Document domicile uploadé pour l'utilisateur 110
  ```

### Base de Données
- Vérifier avec Prisma Studio ou SQL :
  ```sql
  SELECT id, nom, prenom, justificatifDomicile, justificatifRIB, justificatifNavigo 
  FROM "User" 
  WHERE id = 110;
  ```
- **Vérifier** : Les chemins sont bien enregistrés (ex: `/uploads/documents/domicile-110-1733090123456.pdf`)

### Système de Fichiers
- Naviguer vers `server/uploads/documents/`
- **Vérifier** :
  - Fichiers nommés correctement : `[type]-[userId]-[timestamp].[ext]`
  - Anciens fichiers supprimés après remplacement
  - Permissions de lecture correctes

---

## ❌ Bugs Potentiels à Surveiller

### Frontend
- [ ] Modal ne s'ouvre pas → Vérifier `showDocumentModal` state
- [ ] Prévisualisation ne s'affiche pas → Vérifier FileReader
- [ ] Toast ne s'affiche pas → Vérifier callback `onUpdate`
- [ ] Animation saccadée → Vérifier classes Tailwind

### Backend
- [ ] 401 Unauthorized → Vérifier token dans localStorage
- [ ] 400 Bad Request → Vérifier FormData (type, document)
- [ ] 500 Server Error → Vérifier logs console backend
- [ ] Fichier non supprimé → Vérifier permissions dossier uploads
- [ ] CORS error → Vérifier configuration CORS

### Base de Données
- [ ] Champs null après upload → Vérifier Prisma update
- [ ] Ancien chemin non écrasé → Vérifier logique updateData

---

## 🚀 Améliorations Futures (Non Implémentées)

### Fonctionnalités Avancées
- **Auto-renaming intelligent** : `NAVIGO_NOM_PRENOM_MOIS_ANNEE.pdf`
- **Sélecteur mois/année** : Pour le Navigo mensuel
- **Compression d'images** : Réduire la taille avant upload
- **Validation côté admin** : Approuver/rejeter les documents
- **Notifications** : Rappels pour documents manquants/expirés
- **Historique** : Archiver les anciens documents
- **Bulk download** : Admin télécharge tous les Navigos de décembre

### Interface Admin
- **Dashboard documents** : Vue globale de tous les employés
- **Filtres** : Par statut (complet/incomplet), par type
- **Export comptabilité** : ZIP avec tous les RIB
- **Fiche navette auto** : Génération PDF automatique

---

## 📝 Notes Techniques

### Différences avec Upload Photo
| Caractéristique | Photo Profil | Documents |
|----------------|--------------|-----------|
| **Route** | `/api/profil/upload` | `/api/documents/upload` |
| **Param** | `photo` | `document` + `type` |
| **Taille max** | 2 MB | 5 MB |
| **Formats** | JPG, PNG, WEBP | PDF, JPG, PNG, WEBP |
| **Stockage** | `/uploads/photos-profil/` | `/uploads/documents/` |
| **Preview** | Circulaire avec crop | Rectangulaire |
| **Remplacement** | 1 photo unique | 3 documents indépendants |

### Architecture des Modals
```
ProfilEmploye.jsx
  └─ showDocumentModal: 'domicile' | 'rib' | 'navigo' | null
      └─ UploadDocument.jsx
          ├─ documentType (prop)
          ├─ currentFile (prop)
          ├─ onUpdate (callback)
          └─ onClose (callback)
```

### Flow de Données
```
1. Clic "Ajouter" → setShowDocumentModal('domicile')
2. Modal s'ouvre → UploadDocument reçoit props
3. Sélection fichier → setSelectedFile + preview
4. Clic "Valider" → FormData envoyé à /api/documents/upload
5. Backend → Supprime ancien + Sauvegarde nouveau + Update DB
6. Succès → onUpdate() → fetchProfil() → setSucces()
7. Modal ferme → setShowDocumentModal(null)
8. Toast visible → Auto-fade après 4s
```

---

## ✅ Checklist Finale

Avant de valider cette feature, vérifier :

- [x] Base de données : Champs `justificatifDomicile` et `justificatifRIB` ajoutés
- [x] Migration SQL : Exécutée avec succès
- [x] Prisma Client : Régénéré
- [x] Routes backend : `documentsRoutes.js` créé et intégré
- [x] Composant : `UploadDocument.jsx` créé
- [x] UI : Section "Documents administratifs" ajoutée
- [x] Imports : `DocumentIcon` ajouté
- [x] State : `showDocumentModal` ajouté
- [x] Callbacks : `onUpdate` et `onClose` configurés
- [x] Validation : Formats et taille de fichiers
- [x] Animations : Harmonisées avec charte app
- [x] Responsive : Mobile et desktop
- [x] Compilation : Aucune erreur
- [ ] Tests manuels : Scénarios 1-10 validés
- [ ] Tests navigateurs : Chrome, Firefox, Safari
- [ ] Tests mobiles : Android, iOS

---

## 🎯 Conclusion

Le système de gestion des documents administratifs est maintenant **complètement implémenté** et suit les mêmes standards de qualité que l'upload photo :

✅ **Backend robuste** : Routes sécurisées, validation, suppression auto des anciens fichiers
✅ **UI harmonisée** : Design cohérent avec la charte de l'application
✅ **UX optimale** : Animations fluides, feedback clair, responsive
✅ **Code maintenable** : Composant réutilisable, architecture claire

**Prochaine étape** : Tester sur l'application en conditions réelles ! 🚀
