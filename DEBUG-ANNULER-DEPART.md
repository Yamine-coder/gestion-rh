# 🔍 Checklist Debug - Annulation de départ

## 1️⃣ Vérifier le serveur backend

### Redémarrer le serveur
```bash
cd server
# Arrêter le serveur (Ctrl+C)
npm start
```

### Vérifier les logs au démarrage
Vous devriez voir dans la console :
```
Server listening on port 5000
```

### Tester la route manuellement
Ouvrez PowerShell et testez :
```powershell
# Remplacez YOUR_TOKEN et :id par des valeurs réelles
$headers = @{
    "Authorization" = "Bearer YOUR_TOKEN"
    "Content-Type" = "application/json"
}

Invoke-WebRequest -Uri "http://localhost:5000/admin/employes/1/annuler-depart" -Method PUT -Headers $headers
```

---

## 2️⃣ Vérifier le frontend

### Redémarrer le client
```bash
cd client
# Arrêter le serveur (Ctrl+C)
npm start
```

### Ouvrir la console du navigateur (F12)
1. Allez sur ListeEmployes
2. Passez dans l'onglet "Partis"
3. Cliquez sur le bouton vert "🔄 Annuler départ"
4. Regardez la console :

**Logs attendus :**
```
🔄 Annulation départ employé: 1
✅ Réponse annulation: {id: 1, statut: 'actif', dateSortie: null, ...}
```

**Erreurs possibles :**
- `404 Not Found` → Route backend non trouvée (serveur pas redémarré)
- `401 Unauthorized` → Token invalide
- `400 Bad Request` → Employé n'a pas de départ enregistré

---

## 3️⃣ Vérifier qu'un employé a bien un départ

### Dans la base de données
```sql
SELECT id, prenom, nom, statut, dateSortie, motifDepart 
FROM User 
WHERE dateSortie IS NOT NULL;
```

### Via l'interface
1. Allez sur "Actifs"
2. Cliquez "Marquer départ" sur un employé
3. Remplissez le formulaire
4. **Vérifiez** : Badge passe à "🔴 Parti"
5. **Maintenant** : Cliquez "🔄 Annuler départ"

---

## 4️⃣ Test étape par étape

### Test complet
1. ✅ Employé actif → Marquer départ
   - Badge devient "🔴 Parti"
   - Statut devient "inactif"
   
2. ✅ Employé parti → Annuler départ
   - Modal de confirmation s'affiche
   - Cliquez "Annuler le départ"
   - Console affiche logs
   - Badge devient "✅ Actif"
   - Statut devient "actif"
   
3. ✅ Vérifier dans base de données
   - dateSortie = null
   - motifDepart = null
   - statut = 'actif'

---

## 5️⃣ Problèmes courants

### Le bouton n'apparaît pas
**Cause** : Employé n'a pas de `dateSortie`  
**Solution** : Marquez d'abord le départ

### Le modal ne s'ouvre pas
**Cause** : Erreur JavaScript  
**Solution** : Ouvrez console F12, regardez les erreurs

### Erreur 404
**Cause** : Serveur backend pas redémarré  
**Solution** : 
```bash
cd server
# Ctrl+C pour arrêter
npm start
```

### Erreur 401
**Cause** : Token invalide ou expiré  
**Solution** : Déconnectez-vous et reconnectez-vous

### Rien ne se passe
**Cause** : Fonction pas appelée  
**Solution** : 
1. Vérifiez console F12
2. Ajoutez un `console.log` dans handleAnnulerDepart
3. Vérifiez que `onClick={() => handleAnnulerDepart(e)}` est bien présent

---

## 6️⃣ Script de test automatique

Utilisez le fichier `test-annuler-depart.js` :

1. **Mettez à jour le token** :
   ```javascript
   const TEST_CONFIG = {
     token: 'VOTRE_TOKEN_ADMIN',
     employeId: 1 // ID d'un employé avec dateSortie
   };
   ```

2. **Exécutez** :
   ```bash
   node test-annuler-depart.js
   ```

3. **Résultat attendu** :
   ```
   🧪 Test annulation départ
   
   1️⃣ Récupération état initial...
   État initial: { statut: 'inactif', dateSortie: '2024-10-15', ... }
   
   2️⃣ Annulation du départ...
   ✅ Réponse annulation: { statut: 'actif', dateSortie: null, ... }
   
   3️⃣ Vérification état final...
   
   📊 Vérifications:
   ✅ Statut = actif
   ✅ dateSortie = null
   ✅ motifDepart = null
   
   🎉 Test RÉUSSI
   ```

---

## 📞 Support

Si le problème persiste après ces vérifications :

1. **Envoyez-moi** :
   - Les logs de la console navigateur (F12)
   - Les logs du serveur backend
   - Une capture d'écran

2. **Vérifiez** que :
   - Backend tourne sur port 5000
   - Frontend tourne sur port 3000
   - Pas d'erreurs dans les terminaux
