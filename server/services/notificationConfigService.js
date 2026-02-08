/**
 * 📧 Service centralisé de configuration des notifications email
 * 
 * Gère les destinataires pour tous les types de notifications :
 * - Congés (nouvelles demandes, rappels)
 * - Avis Google (alertes négatives)
 * - Anomalies de pointage
 * - Remplacements
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/notificationsConfig.json');

/**
 * Charge la configuration des notifications
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Erreur lecture config notifications:', err.message);
  }
  // Config par défaut
  return {
    conges: { enabled: true, recipients: [], description: 'Demandes de congés' },
    avisGoogle: { enabled: true, recipients: [], alertThreshold: 3, description: 'Avis Google' },
    anomalies: { enabled: false, recipients: [], description: 'Anomalies pointage' },
    remplacements: { enabled: false, recipients: [], description: 'Remplacements' }
  };
}

/**
 * Sauvegarde la configuration
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error('Erreur sauvegarde config notifications:', err.message);
    return false;
  }
}

/**
 * Récupère la config complète
 */
function getConfig() {
  return loadConfig();
}

/**
 * Récupère la config d'un type spécifique
 */
function getTypeConfig(type) {
  const config = loadConfig();
  return config[type] || null;
}

/**
 * Met à jour la config d'un type
 */
function updateTypeConfig(type, updates) {
  const config = loadConfig();
  if (!config[type]) {
    config[type] = { enabled: false, recipients: [] };
  }
  config[type] = { ...config[type], ...updates };
  saveConfig(config);
  return config;
}

/**
 * Récupère les destinataires actifs pour un type
 * Fallback sur les admins si aucun destinataire configuré
 */
function getRecipients(type) {
  const config = loadConfig();
  const typeConfig = config[type];
  
  if (!typeConfig || !typeConfig.enabled) {
    return [];
  }
  
  if (typeConfig.recipients && typeConfig.recipients.length > 0) {
    // Retourne les objets complets (email, name, active) filtrés par active
    return typeConfig.recipients.filter(r => r.active !== false);
  }
  
  // Pas de fallback - retourne vide si pas configuré
  return [];
}

/**
 * Ajoute un destinataire à un type
 */
function addRecipient(type, email, name = '') {
  const config = loadConfig();
  if (!config[type]) {
    config[type] = { enabled: true, recipients: [] };
  }
  if (!config[type].recipients) {
    config[type].recipients = [];
  }
  
  // Vérifier si déjà présent
  if (!config[type].recipients.find(r => r.email === email)) {
    config[type].recipients.push({ email, name, active: true });
    saveConfig(config);
  }
  return config;
}

/**
 * Supprime un destinataire d'un type
 */
function removeRecipient(type, email) {
  const config = loadConfig();
  if (config[type] && config[type].recipients) {
    config[type].recipients = config[type].recipients.filter(r => r.email !== email);
    saveConfig(config);
  }
  return config;
}

/**
 * Active/désactive un destinataire
 */
function toggleRecipient(type, email, active) {
  const config = loadConfig();
  if (config[type] && config[type].recipients) {
    const recipient = config[type].recipients.find(r => r.email === email);
    if (recipient) {
      recipient.active = active;
      saveConfig(config);
    }
  }
  return config;
}

/**
 * Active/désactive un type de notification
 */
function toggleType(type, enabled) {
  const config = loadConfig();
  if (config[type]) {
    config[type].enabled = enabled;
    saveConfig(config);
  }
  return config;
}

/**
 * Vérifie si un type est activé
 */
function isTypeEnabled(type) {
  const config = loadConfig();
  return config[type]?.enabled ?? false;
}

module.exports = {
  getConfig,
  getTypeConfig,
  updateTypeConfig,
  getRecipients,
  addRecipient,
  removeRecipient,
  toggleRecipient,
  toggleType,
  isTypeEnabled
};
