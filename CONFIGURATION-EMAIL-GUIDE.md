# 📧 CONFIGURATION EMAIL GMAIL - GUIDE COMPLET

## 🎯 Problème Actuel

Votre fichier `.env` contient des valeurs par défaut :
```
EMAIL_USER="votre-email@gmail.com"
EMAIL_PASS="votre-mot-de-passe-application"
```

**Résultat** : Les emails ne peuvent pas être envoyés ! ❌

---

## ✅ SOLUTION EN 3 ÉTAPES

### Étape 1 : Créer un Mot de Passe d'Application Gmail

#### 1.1 Se connecter à votre compte Gmail
- Allez sur https://myaccount.google.com/
- Connectez-vous avec votre compte Gmail

#### 1.2 Activer la validation en deux étapes (si pas déjà fait)
- Allez dans **Sécurité** (menu gauche)
- Cherchez **Validation en deux étapes**
- Cliquez sur **Activer**
- Suivez les instructions (SMS ou application)

#### 1.3 Créer un mot de passe d'application
- Une fois la validation en deux étapes activée
- Dans **Sécurité**, cherchez **Mots de passe d'application**
- Cliquez dessus
- Sélectionnez **Autre (nom personnalisé)**
- Tapez : `Gestion RH App`
- Cliquez sur **Générer**
- **IMPORTANT** : Copiez le mot de passe généré (16 caractères, format : `xxxx xxxx xxxx xxxx`)

---

### Étape 2 : Modifier le fichier .env

Ouvrez le fichier `server/.env` et modifiez :

```properties
# Configuration Email (Gmail)
EMAIL_USER="votre.email@gmail.com"          # ← Remplacez par votre vrai email
EMAIL_PASS="xxxx xxxx xxxx xxxx"            # ← Collez le mot de passe d'application (16 caractères)
```

**Exemple réel :**
```properties
EMAIL_USER="moussaoui.contact@gmail.com"
EMAIL_PASS="abcd efgh ijkl mnop"
```

⚠️ **ATTENTION** :
- Utilisez votre **email Gmail complet** (avec @gmail.com)
- Utilisez le **mot de passe d'application** (pas votre mot de passe Gmail normal)
- Les espaces dans le mot de passe sont OK

---

### Étape 3 : Tester la Configuration

#### 3.1 Redémarrer le serveur backend
```bash
cd server
npm start
```

#### 3.2 Lancer le test d'email
```bash
# Dans un autre terminal
cd server
node test-email.js
```

**Résultat attendu :**
```
📧 TEST D'ENVOI D'EMAIL
════════════════════════════════════════════════════════

Configuration:
  EMAIL_USER: votre.email@gmail.com
  EMAIL_PASSWORD: [MASQUÉ]

✅ Email envoyé avec succès!
```

#### 3.3 Vérifier votre boîte email
- Ouvrez votre Gmail
- Vous devriez avoir reçu un email de test
- Si oui : ✅ Configuration OK !

---

## 🔍 DIAGNOSTIC DES PROBLÈMES

### Problème 1 : "Invalid login: 535-5.7.8 Username and Password not accepted"

**Cause** : Mot de passe d'application incorrect ou validation en deux étapes non activée

**Solution** :
1. Vérifiez que la validation en deux étapes est activée
2. Générez un nouveau mot de passe d'application
3. Copiez-collez exactement le mot de passe (avec ou sans espaces, les deux fonctionnent)
4. Vérifiez qu'il n'y a pas d'espaces en trop au début/fin

### Problème 2 : "self signed certificate in certificate chain"

**Cause** : Problème SSL (rare)

**Solution** : Ajoutez dans `.env` :
```properties
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Problème 3 : "Connection timeout"

**Cause** : Firewall ou antivirus bloque Gmail

**Solution** :
1. Désactivez temporairement l'antivirus
2. Vérifiez les paramètres du pare-feu
3. Essayez avec un VPN si votre réseau bloque Gmail

### Problème 4 : Email reçu dans SPAM

**Cause** : Gmail considère l'email comme spam

**Solution** :
- C'est normal pour les tests
- Marquez l'email comme "Non spam"
- En production, utilisez un service professionnel (SendGrid, etc.)

---

## 📝 TEMPLATE DE CONFIGURATION COMPLET

Voici votre fichier `.env` complet à modifier :

```properties
# Configuration base de données
DATABASE_URL="postgresql://postgres:1234@localhost:5432/gestion_rh"

# Configuration JWT
JWT_SECRET="your-secret-key-here"

# Configuration Email (Gmail) - ⚠️ À MODIFIER ⚠️
EMAIL_USER="VOTRE_EMAIL@gmail.com"           # ← Votre vrai email Gmail
EMAIL_PASS="xxxx xxxx xxxx xxxx"             # ← Mot de passe d'application (16 caractères)

# URL du frontend (pour les liens dans les emails)
FRONTEND_URL="http://localhost:3000"

# Port serveur
PORT=5000
```

---

## 🧪 SCRIPT DE TEST RAPIDE

Créez un fichier `test-email-rapide.js` :

```javascript
require('dotenv').config();

console.log('\n📧 VÉRIFICATION CONFIGURATION EMAIL\n');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '[DÉFINI]' : '❌ NON DÉFINI');

if (process.env.EMAIL_USER === 'votre-email@gmail.com') {
  console.log('\n❌ ERREUR: Vous devez modifier EMAIL_USER dans le fichier .env');
  console.log('   Remplacez "votre-email@gmail.com" par votre vrai email Gmail\n');
  process.exit(1);
}

if (process.env.EMAIL_PASS === 'votre-mot-de-passe-application') {
  console.log('\n❌ ERREUR: Vous devez modifier EMAIL_PASS dans le fichier .env');
  console.log('   Remplacez par le mot de passe d\'application Gmail (16 caractères)\n');
  process.exit(1);
}

console.log('\n✅ Configuration semble OK!');
console.log('   Lancez maintenant: node test-email.js\n');
```

Lancez-le :
```bash
node test-email-rapide.js
```

---

## 🔐 SÉCURITÉ

### ⚠️ NE JAMAIS FAIRE :
- ❌ Commiter le fichier `.env` sur Git
- ❌ Partager votre mot de passe d'application
- ❌ Utiliser votre mot de passe Gmail normal (utilisez le mot de passe d'application)

### ✅ BONNES PRATIQUES :
- ✅ Le fichier `.env` est dans `.gitignore`
- ✅ Utilisez un mot de passe d'application unique
- ✅ Révoqué le mot de passe d'application si compromis
- ✅ En production, utilisez des variables d'environnement du serveur

---

## 🚀 ALTERNATIVE : MODE TEST (Sans Email)

Si vous ne voulez pas configurer Gmail immédiatement, vous pouvez activer le mode test :

```properties
# Mode test : les emails ne sont PAS envoyés, mais l'app fonctionne
EMAIL_PASS="test-mode-disabled"
```

**Comportement** :
- ✅ Création d'employés fonctionne
- ✅ Mot de passe temporaire généré
- ✅ Mot de passe affiché dans la console et sur la carte employé
- ❌ Aucun email réellement envoyé
- ⚠️ L'admin doit copier manuellement le mot de passe et le transmettre

---

## 📞 BESOIN D'AIDE ?

### Étapes de Diagnostic :

1. **Vérifier la configuration**
   ```bash
   node test-email-rapide.js
   ```

2. **Tester l'envoi**
   ```bash
   node test-email.js
   ```

3. **Vérifier les logs du serveur**
   - Cherchez les erreurs dans la console du serveur
   - Les erreurs d'email sont préfixées par `❌ Erreur email:`

4. **Vérifier le code dans emailService.js**
   - Le service vérifie automatiquement la configuration
   - Les erreurs sont loggées en détail

---

## ✅ CHECKLIST DE CONFIGURATION

- [ ] Compte Gmail existant
- [ ] Validation en deux étapes activée sur Gmail
- [ ] Mot de passe d'application généré (16 caractères)
- [ ] Fichier `.env` modifié avec votre email
- [ ] Fichier `.env` modifié avec le mot de passe d'application
- [ ] Serveur backend redémarré
- [ ] Test `node test-email.js` réussi
- [ ] Email de test reçu dans votre Gmail

---

**Après configuration, les emails seront automatiquement envoyés lors de :**
1. ✅ Création d'un nouvel employé
2. ✅ Envoi manuel depuis la carte employé
3. ✅ Réinitialisation de mot de passe (si implémenté)

---

**Date :** 3 novembre 2025  
**Auteur :** Guide de configuration  
**Status :** À configurer pour activer l'envoi d'emails
