// Fichier pour contrôler les logs de debug
// Mettre DEBUG_MODE à false pour désactiver tous les console.log de debug

export const DEBUG_MODE = false; // Changer à true pour activer les logs

export const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

export const debugWarn = (...args) => {
  if (DEBUG_MODE) {
    console.warn(...args);
  }
};

export const debugError = (...args) => {
  // Les erreurs sont toujours affichées
  console.error(...args);
};
