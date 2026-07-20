// client/src/hooks/usePushNotifications.js
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config/api';

// Conversion de la clé VAPID base64-url en Uint8Array (requis par pushManager.subscribe)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

const isSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

// Garantit un Service Worker ENREGISTRÉ et ACTIVÉ avant de souscrire.
// Évite l'erreur "Subscription failed - no active Service Worker".
async function getActiveRegistration() {
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js');
  }
  if (reg.active) return reg;

  // Attendre l'activation du worker en cours d'installation
  const worker = reg.installing || reg.waiting;
  if (worker) {
    await new Promise((resolve) => {
      const onChange = () => {
        if (worker.state === 'activated') {
          worker.removeEventListener('statechange', onChange);
          resolve();
        }
      };
      worker.addEventListener('statechange', onChange);
      onChange();
    });
  }

  // Filet de sécurité : navigator.serviceWorker.ready résout une fois actif
  await navigator.serviceWorker.ready;
  return (await navigator.serviceWorker.getRegistration()) || reg;
}

export default function usePushNotifications() {
  const [supported] = useState(isSupported());
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = () => localStorage.getItem('token');

  // État initial : déjà abonné ?
  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, [supported]);
  const subscribe = useCallback(async () => {
    if (!supported) {
      setError('Notifications non supportées sur cet appareil');
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Permission (doit être déclenchée par un geste utilisateur)
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Permission refusée');
        return false;
      }

      // 2. Clé publique VAPID
      const keyRes = await fetch(`${API_BASE}/api/push/vapid-public-key`);
      if (!keyRes.ok) throw new Error('Serveur push indisponible');
      const { publicKey } = await keyRes.json();

      // 3. Abonnement via le service worker (garanti actif)
      const reg = await getActiveRegistration();
      if (!reg || !reg.active) throw new Error('Service Worker indisponible, recharge la page');
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      // 4. Envoi de l'abonnement au backend
      const res = await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ subscription: sub }),
      });
      if (!res.ok) throw new Error('Échec enregistrement abonnement');

      setSubscribed(true);
      return true;
    } catch (e) {
      setError(e.message || 'Erreur activation');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    setError(null);
    try {
      const reg = await getActiveRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${API_BASE}/api/push/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setError(e.message || 'Erreur désactivation');
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const sendTest = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/push/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!data.success || data.sent === 0) {
        setError(data.sent === 0 ? 'Aucun appareil abonné' : 'Échec du test');
        return false;
      }
      return true;
    } catch (e) {
      setError(e.message || 'Erreur test');
      return false;
    }
  }, []);

  return { supported, permission, subscribed, loading, error, subscribe, unsubscribe, sendTest };
}
