// MODE DEBUG GLOBAL - Mettre à false pour désactiver tous les logs
const DEBUG_ENABLED = false;

// Wrapper pour les logs conditionnels
const debugLog = (...args) => {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
};

const debugWarn = (...args) => {
  if (DEBUG_ENABLED) {
    console.warn(...args);
  }
};

const debugError = (...args) => {
  // Les erreurs sont toujours affichées
  console.error(...args);
};

module.exports = {
  DEBUG_ENABLED,
  debugLog,
  debugWarn,
  debugError
};
