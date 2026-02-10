/**
 * SSE (Server-Sent Events) Manager
 * Gère les connexions SSE pour les notifications temps réel
 */

// Map: employeId → Set<Response>
const clients = new Map();

/**
 * Enregistrer un client SSE
 * @param {number} employeId 
 * @param {import('express').Response} res 
 */
function addClient(employeId, res) {
  if (!clients.has(employeId)) {
    clients.set(employeId, new Set());
  }
  clients.get(employeId).add(res);
  
  // Nettoyage à la déconnexion
  res.on('close', () => {
    const set = clients.get(employeId);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        clients.delete(employeId);
      }
    }
  });
}

/**
 * Envoyer un événement SSE à un employé spécifique
 * @param {number} employeId 
 * @param {string} eventType - Type d'événement SSE (ex: 'notification', 'unread-count')
 * @param {Object} data - Données à envoyer
 */
function sendToEmployee(employeId, eventType, data) {
  const set = clients.get(employeId);
  if (!set || set.size === 0) return;

  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  
  for (const res of set) {
    try {
      res.write(payload);
    } catch (err) {
      // Client déconnecté — nettoyage
      set.delete(res);
    }
  }
}

/**
 * Envoyer un événement SSE à plusieurs employés
 * @param {number[]} employeIds 
 * @param {string} eventType 
 * @param {Object} data 
 */
function sendToEmployees(employeIds, eventType, data) {
  for (const id of employeIds) {
    sendToEmployee(id, eventType, data);
  }
}

/**
 * Nombre de clients connectés (pour monitoring)
 */
function getConnectedCount() {
  let count = 0;
  for (const set of clients.values()) {
    count += set.size;
  }
  return count;
}

module.exports = {
  addClient,
  sendToEmployee,
  sendToEmployees,
  getConnectedCount
};
