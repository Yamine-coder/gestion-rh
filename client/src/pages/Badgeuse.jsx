import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QrReader } from 'react-qr-reader';
import axios from 'axios';
import { ScanLine, Check, X, Clock, Wifi, WifiOff, Camera, CameraOff, RefreshCw, Maximize2, Minimize2, CloudOff, Upload, UserCheck, AlertTriangle, WifiOff as WifiOffIcon, ShieldAlert } from 'lucide-react';

const brand = '#cf292c';

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_TIMEOUT = 10000; // 10 secondes
const BLOCK_DURATION_MS = 30000; // 30 secondes par QR code

// Durées d'affichage par état (en ms)
const DURATION_SUCCESS = 5000;    // Succès : 5s (temps de lire et s'éloigner)
const DURATION_ERROR = 4000;      // Erreur : 4s
const DURATION_OFFLINE = 5000;    // Hors-ligne : 5s (rassurer l'utilisateur)
const DURATION_ALREADY = 3000;    // Déjà pointé : 3s (rappel court)

const OFFLINE_QUEUE_KEY = 'badgeuse_offline_queue'; // Clé localStorage
const SYNC_RETRY_INTERVAL_MS = 10000; // Retry sync toutes les 10s

// Instance Axios configurée
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔊 FEEDBACK SONORE
// ═══════════════════════════════════════════════════════════════════════════
const playSound = (type) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'success') {
      // Deux bips courts aigus
      oscillator.frequency.value = 1200;
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => oscillator.stop(), 150);
    } else if (type === 'pending') {
      // Bip moyen pour "en attente"
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => oscillator.stop(), 200);
    } else if (type === 'warning') {
      // Double bip court pour "déjà pointé"
      oscillator.frequency.value = 600;
      gainNode.gain.value = 0.25;
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        // Deuxième bip
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 600;
        gain2.gain.value = 0.25;
        osc2.start();
        setTimeout(() => osc2.stop(), 100);
      }, 150);
    } else {
      // Un bip long grave pour erreur
      oscillator.frequency.value = 400;
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => oscillator.stop(), 400);
    }
  } catch (e) {
    console.warn('Audio non supporté:', e);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDATION JWT (format uniquement, pas la signature)
// ═══════════════════════════════════════════════════════════════════════════
const isValidJWTFormat = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Vérifier que les parties sont du base64 valide
    parts.forEach(part => {
      atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    });
    return true;
  } catch {
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 📦 GESTION QUEUE HORS-LIGNE (localStorage)
// ═══════════════════════════════════════════════════════════════════════════
const getOfflineQueue = () => {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveOfflineQueue = (queue) => {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Erreur sauvegarde queue:', e);
  }
};

const addToOfflineQueue = (token, timestamp, employeInfo) => {
  const queue = getOfflineQueue();
  queue.push({
    token,
    timestamp: timestamp.toISOString(),
    employeInfo,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  });
  saveOfflineQueue(queue);
  return queue.length;
};

const removeFromOfflineQueue = (id) => {
  const queue = getOfflineQueue().filter(item => item.id !== id);
  saveOfflineQueue(queue);
  return queue;
};

const clearExpiredFromQueue = () => {
  // Pas d'expiration - tablette fixe, pas de risque de fraude
  // Les pointages hors-ligne sont gardés jusqu'à synchronisation
  return getOfflineQueue();
};

const Badgeuse = () => {
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(null);
  const [employeInfo, setEmployeInfo] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationDuration, setConfirmationDuration] = useState(DURATION_SUCCESS);
  const [animationKey, setAnimationKey] = useState(0); // Clé pour relancer l'animation de jauge
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraChecking, setCameraChecking] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0); // Nombre de pointages en attente
  const [isSyncing, setIsSyncing] = useState(false); // En cours de synchronisation
  
  // Refs pour éviter les memory leaks
  const blockedQRCodes = useRef(new Map());
  const confirmationTimeoutRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const isDisplayingRef = useRef(false); // Protection synchrone contre les scans pendant l'affichage

  // Cleanup au démontage
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔄 SYNCHRONISATION DES POINTAGES EN ATTENTE
  // ═══════════════════════════════════════════════════════════════════════════
  const syncOfflineQueue = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    
    // Nettoyer les pointages expirés (> 30 min)
    const queue = clearExpiredFromQueue();
    if (queue.length === 0) {
      setPendingCount(0);
      return;
    }
    
    setIsSyncing(true);
    console.log(`🔄 Synchronisation de ${queue.length} pointage(s) en attente...`);
    
    let syncedCount = 0;
    
    for (const item of queue) {
      try {
        await apiClient.post(
          '/pointage/auto',
          { offlineTimestamp: item.timestamp }, // Envoyer l'heure originale
          { headers: { Authorization: `Bearer ${item.token}` } }
        );
        
        removeFromOfflineQueue(item.id);
        syncedCount++;
        console.log(`✅ Sync réussi pour pointage ${item.id}`);
        
      } catch (err) {
        // Si erreur "trop récent" ou déjà enregistré, on supprime quand même
        if (err.response?.status === 409) {
          removeFromOfflineQueue(item.id);
          console.log(`⚠️ Pointage ${item.id} déjà enregistré, supprimé de la queue`);
        } else {
          console.warn(`❌ Échec sync pointage ${item.id}:`, err.message);
        }
      }
    }
    
    const remainingQueue = getOfflineQueue();
    setPendingCount(remainingQueue.length);
    setIsSyncing(false);
    
    if (syncedCount > 0) {
      console.log(`✅ ${syncedCount} pointage(s) synchronisé(s)`);
    }
  }, [isSyncing]);

  // Charger le compteur au démarrage
  useEffect(() => {
    const queue = clearExpiredFromQueue();
    setPendingCount(queue.length);
  }, []);

  // Sync automatique quand on revient en ligne
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncOfflineQueue();
    }
  }, [isOnline, pendingCount, syncOfflineQueue]);

  // Retry sync toutes les 10 secondes si pointages en attente
  useEffect(() => {
    if (pendingCount > 0) {
      syncIntervalRef.current = setInterval(() => {
        if (navigator.onLine) {
          syncOfflineQueue();
        }
      }, SYNC_RETRY_INTERVAL_MS);
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    }
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [pendingCount, syncOfflineQueue]);

  // Horloge temps réel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Status connexion
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Gestion plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Vérification caméra
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('API caméra non disponible');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }  // Caméra avant pour tablette murale
        });
        
        stream.getTracks().forEach(track => track.stop());
        setCameraError('');
        setCameraReady(true);
        
      } catch (err) {
        console.error('Erreur caméra:', err);
        let errorMessage = '';
        
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Autorisez l\'accès à la caméra';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'Aucune caméra détectée';
        } else {
          errorMessage = err.message || 'Caméra indisponible';
        }
        
        setCameraError(errorMessage);
        setCameraReady(false);
      } finally {
        setCameraChecking(false);
      }
    };

    checkCameraSupport();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 HELPER: Afficher l'écran de confirmation avec protection synchrone
  // ═══════════════════════════════════════════════════════════════════════════
  const showConfirmationScreen = useCallback((duration, resetProcessing = false) => {
    // Activer la protection IMMÉDIATEMENT (synchrone via ref)
    isDisplayingRef.current = true;
    
    // Mettre à jour les states pour l'affichage
    setConfirmationDuration(duration);
    setAnimationKey(prev => prev + 1); // Nouvelle clé = nouvelle animation
    setShowConfirmation(true);
    
    // Nettoyer le timeout précédent si existant
    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
    }
    
    // Programmer la fermeture
    confirmationTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        // Désactiver la protection
        isDisplayingRef.current = false;
        setShowConfirmation(false);
        setMessage('');
        setEmployeInfo(null);
        if (resetProcessing) {
          setIsProcessing(false);
        }
      }
    }, duration);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📷 HANDLER DE SCAN - avec toutes les protections + mode hors-ligne
  // ═══════════════════════════════════════════════════════════════════════════
  const handleScan = useCallback(async (result) => {
    // Protection 0: Ignorer TOUS les scans si un écran de confirmation est affiché
    // Utilisation d'une REF pour une vérification synchrone (pas de stale closure)
    if (isDisplayingRef.current) return;
    
    // Protection 1: Résultat vide ou invalide
    if (!result) return;
    
    const now = Date.now();
    const scanTime = new Date(); // Heure exacte du scan
    
    // Protection 2: Ce QR code est encore bloqué (anti-spam 30s par personne)
    // IMPORTANT: Ce check est AVANT isProcessing pour afficher le message même pendant la confirmation
    const blockedUntil = blockedQRCodes.current.get(result);
    if (blockedUntil && now < blockedUntil) {
      const remainingSeconds = Math.ceil((blockedUntil - now) / 1000);
      console.log(`🚫 QR bloqué encore ${remainingSeconds}s`);
      
      // Extraire les infos pour afficher le nom
      let blockedEmployeInfo = { prenom: 'Employé', nom: '' };
      try {
        const payload = JSON.parse(atob(result.split('.')[1]));
        blockedEmployeInfo = {
          prenom: payload.prenom || payload.email?.split('@')[0] || 'Employé',
          nom: payload.nom || ''
        };
      } catch { /* ignore */ }
      
      // Afficher l'écran "déjà pointé"
      setSuccess('already');
      setEmployeInfo(blockedEmployeInfo);
      setMessage(`Pointage déjà effectué`);
      playSound('warning');
      showConfirmationScreen(DURATION_ALREADY);
      return;
    }
    
    // Protection 3: Déjà en train de traiter un AUTRE scan (pas le même QR)
    if (isProcessing) return;
    
    // Protection 4: Valider le format JWT
    if (!isValidJWTFormat(result)) {
      console.warn('🚫 QR Code invalide (pas un JWT)');
      setSuccess(false);
      setMessage('QR Code non reconnu');
      playSound('error');
      blockedQRCodes.current.set(result, now + 5000);
      showConfirmationScreen(DURATION_ERROR);
      return;
    }

    // ═══ TRAITEMENT DU SCAN ═══
    setIsProcessing(true);
    blockedQRCodes.current.set(result, now + BLOCK_DURATION_MS);

    // Extraire les infos du JWT pour l'affichage (fallback si hors-ligne)
    let jwtEmployeInfo = { prenom: 'Employé', nom: '' };
    try {
      const payload = JSON.parse(atob(result.split('.')[1]));
      jwtEmployeInfo = {
        prenom: payload.prenom || payload.email?.split('@')[0] || 'Employé',
        nom: payload.nom || ''
      };
    } catch { /* ignore */ }

    // ═══════════════════════════════════════════════════════════════════════
    // 📴 MODE HORS-LIGNE : Sauvegarder localement pour sync ultérieure
    // ═══════════════════════════════════════════════════════════════════════
    if (!navigator.onLine) {
      const queueLength = addToOfflineQueue(result, scanTime, jwtEmployeInfo);
      setPendingCount(queueLength);
      
      setSuccess(null); // État "pending"
      setEmployeInfo(jwtEmployeInfo);
      setMessage('Pointage enregistré localement');
      playSound('pending');
      showConfirmationScreen(DURATION_OFFLINE, true); // true = resetProcessing
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🌐 MODE EN LIGNE : Appel API normal
    // ═══════════════════════════════════════════════════════════════════════
    try {
      const res = await apiClient.post(
        '/pointage/auto',
        {},
        { headers: { Authorization: `Bearer ${result}` } }
      );

      // ✅ BONNE PRATIQUE: Utiliser les données du SERVEUR
      const serverData = res.data;
      const employe = serverData.employe || serverData.user || {};
      
      setSuccess(true);
      setEmployeInfo({
        prenom: employe.prenom || 'Employé',
        nom: employe.nom || ''
      });
      setMessage(serverData.message || 'Pointage enregistré');
      playSound('success');
      showConfirmationScreen(DURATION_SUCCESS, true);
      
    } catch (err) {
      // ═══════════════════════════════════════════════════════════════════════
      // 📴 FALLBACK HORS-LIGNE : Si erreur réseau, sauvegarder localement
      // ═══════════════════════════════════════════════════════════════════════
      if (!err.response || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        const queueLength = addToOfflineQueue(result, scanTime, jwtEmployeInfo);
        setPendingCount(queueLength);
        
        setSuccess(null); // État "pending"
        setEmployeInfo(jwtEmployeInfo);
        setMessage('Connexion perdue - Pointage sauvegardé');
        playSound('pending');
        showConfirmationScreen(DURATION_OFFLINE, true);
      } else {
        // Vraie erreur serveur
        setSuccess(false);
        setEmployeInfo(null);
        playSound('error');
        
        const errorMsg = err.response?.data?.message || 'QR Code invalide';
        setMessage(errorMsg);
        
        // Si erreur "trop récent", garder le blocage complet
        if (!errorMsg.includes('récent')) {
          blockedQRCodes.current.set(result, now + 5000);
        }
        showConfirmationScreen(DURATION_ERROR, true);
      }
    }
  }, [isProcessing, showConfirmationScreen]);
  
  // Nettoyer les anciens QR codes bloqués toutes les minutes
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      blockedQRCodes.current.forEach((expiry, qr) => {
        if (now > expiry) blockedQRCodes.current.delete(qr);
      });
    }, 60000);
    return () => clearInterval(cleanup);
  }, []);

  const retryCamera = () => {
    setCameraError('');
    setCameraReady(false);
    window.location.reload();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      
      {/* Header - optimisé tablette */}
      <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: brand }}>
            <ScanLine className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Badgeuse</h1>
            <p className="text-xs md:text-sm text-white/60">Scanner QR Code</p>
          </div>
        </div>
        
        {/* Status indicators + Fullscreen */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Indicateur pointages en attente */}
          {pendingCount > 0 && (
            <div className={`flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium ${
              isSyncing ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isSyncing ? (
                <Upload className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
              ) : (
                <CloudOff className="w-4 h-4 md:w-5 md:h-5" />
              )}
              <span>{pendingCount} en attente</span>
            </div>
          )}
          
          <div className={`flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium ${
            isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isOnline ? <Wifi className="w-4 h-4 md:w-5 md:h-5" /> : <WifiOff className="w-4 h-4 md:w-5 md:h-5" />}
            <span className="hidden sm:inline">{isOnline ? 'Connecté' : 'Hors ligne'}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium ${
            cameraReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {cameraReady ? <Camera className="w-4 h-4 md:w-5 md:h-5" /> : <CameraOff className="w-4 h-4 md:w-5 md:h-5" />}
            <span className="hidden sm:inline">{cameraReady ? 'Caméra OK' : 'Caméra...'}</span>
          </div>
          
          {/* Bouton plein écran */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
            title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 md:w-5 md:h-5" /> : <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />}
            <span className="hidden md:inline">{isFullscreen ? 'Quitter' : 'Plein écran'}</span>
          </button>
        </div>
      </header>

      {/* Main content - adapté à tous les écrans */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-between lg:justify-center gap-4 lg:gap-12 xl:gap-20 p-3 sm:p-4 md:p-6 lg:p-10 overflow-hidden">
        
        {/* Top/Left - Clock */}
        <div className="flex flex-col items-center lg:items-start shrink-0">
          <div className="text-center lg:text-left">
            <div className="hidden sm:flex items-center justify-center lg:justify-start gap-2 mb-1">
              <Clock className="w-4 h-4 lg:w-6 lg:h-6 text-white/60" />
              <span className="text-white/60 text-[10px] sm:text-xs uppercase tracking-wider">Heure actuelle</span>
            </div>
            <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white tracking-tight">
              {formatTime(currentTime)}
            </p>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/60 mt-0.5 sm:mt-1 capitalize">
              {formatDate(currentTime)}
            </p>
          </div>
          
          {/* Instructions - desktop/tablette paysage seulement */}
          <div className="hidden lg:block mt-6 bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <ScanLine className="w-4 h-4" style={{ color: brand }} />
              Instructions
            </h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs flex-shrink-0" style={{ color: brand }}>1</span>
                Présentez votre QR Code
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs flex-shrink-0" style={{ color: brand }}>2</span>
                Attendez la confirmation
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs flex-shrink-0" style={{ color: brand }}>3</span>
                Pointage enregistré !
              </li>
            </ul>
          </div>
        </div>

        {/* Center - Scanner */}
        <div className="w-full max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl flex-1 flex items-center">
          <div className="relative w-full">
            {/* Scanner frame */}
            <div className="relative aspect-square rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden border-2 sm:border-4 border-white/20 shadow-2xl shadow-black/50">
              
              {cameraChecking ? (
                // État de chargement initial
                <div className="absolute inset-0 bg-slate-800 flex flex-col items-center justify-center text-center p-4 sm:p-6 md:p-10">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white/10 flex items-center justify-center mb-3 sm:mb-4 md:mb-6">
                    <ScanLine className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white/40" />
                  </div>
                  <p className="text-lg md:text-2xl font-semibold text-white mb-2">Initialisation...</p>
                  <p className="text-sm md:text-base text-white/60">Vérification de la caméra</p>
                  <div className="mt-4 md:mt-6 flex items-center gap-1.5 md:gap-2">
                    <div className="w-2 h-2 md:w-3 md:h-3 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 md:w-3 md:h-3 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 md:w-3 md:h-3 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              ) : !cameraError && cameraReady ? (
                <>
                  <QrReader
                    constraints={{ facingMode: 'user' }}  // Caméra avant pour tablette murale
                    onResult={(result, error) => {
                      if (error && error.name !== 'NotFoundException') {
                        console.warn('Scanner:', error);
                      }
                      if (result && !isProcessing) {
                        handleScan(result?.text);
                      }
                    }}
                    videoId="video"
                    scanDelay={300}
                    containerStyle={{ width: '100%', height: '100%' }}
                    videoStyle={{ objectFit: 'cover' }}
                  />
                  
                  {/* Overlay pendant le traitement d'un scan */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                      <div className="text-center">
                        <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                        <p className="text-white text-lg md:text-xl font-medium">Traitement...</p>
                        <p className="text-white/60 text-sm mt-1">Veuillez patienter</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Corner markers */}
                    <div className="absolute top-4 left-4 md:top-8 md:left-8 w-12 h-12 md:w-16 md:h-16 border-t-4 border-l-4 rounded-tl-lg" style={{ borderColor: !isProcessing ? brand : '#666' }} />
                    <div className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 md:w-16 md:h-16 border-t-4 border-r-4 rounded-tr-lg" style={{ borderColor: !isProcessing ? brand : '#666' }} />
                    <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 w-12 h-12 md:w-16 md:h-16 border-b-4 border-l-4 rounded-bl-lg" style={{ borderColor: !isProcessing ? brand : '#666' }} />
                    <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 w-12 h-12 md:w-16 md:h-16 border-b-4 border-r-4 rounded-br-lg" style={{ borderColor: !isProcessing ? brand : '#666' }} />
                    
                    {/* Scan line animation - seulement si scanner actif */}
                    {!isProcessing && (
                      <div className="absolute left-4 right-4 md:left-8 md:right-8 h-0.5 md:h-1 animate-scan-line" style={{ backgroundColor: brand, boxShadow: `0 0 15px ${brand}` }} />
                    )}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 bg-slate-800 flex flex-col items-center justify-center text-center p-6 md:p-10">
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-white/10 flex items-center justify-center mb-4 md:mb-6">
                    <CameraOff className="w-10 h-10 md:w-14 md:h-14 text-white/40" />
                  </div>
                  <p className="text-lg md:text-2xl font-semibold text-white mb-2">Caméra indisponible</p>
                  <p className="text-sm md:text-base text-white/60 mb-4 md:mb-6">{cameraError || 'Vérification en cours...'}</p>
                  <button
                    onClick={retryCamera}
                    className="flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-xl text-white text-base md:text-lg font-semibold transition-all hover:scale-105 active:scale-95"
                    style={{ backgroundColor: brand }}
                  >
                    <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
                    Réessayer
                  </button>
                </div>
              )}

              {/* Status badge - visible uniquement quand caméra prête */}
              {cameraReady && !cameraError && !cameraChecking && (
                <div className="absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm md:text-base font-medium flex items-center gap-2 md:gap-3">
                  {!isProcessing ? (
                    <>
                      <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-400 animate-pulse" />
                      Prêt à scanner
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-amber-400" />
                      Traitement...
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom - Instructions mobile (iPhone/tablette portrait) */}
        <div className="lg:hidden w-full shrink-0">
          <div className="flex items-center justify-center gap-4 sm:gap-6 text-[10px] sm:text-xs text-white/60">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] sm:text-[10px]" style={{ color: brand }}>1</span>
              <span>Présentez QR</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] sm:text-[10px]" style={{ color: brand }}>2</span>
              <span>Confirmation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] sm:text-[10px]" style={{ color: brand }}>3</span>
              <span>Enregistré !</span>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Overlay - Design moderne et épuré */}
      {showConfirmation && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-300 ${
          success === true ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700' : 
          success === false ? 'bg-gradient-to-br from-red-500 via-red-600 to-rose-700' : 
          success === 'already' ? 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800' : 
          'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600'
        }`}>
          {/* Cercles décoratifs en arrière-plan */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10 ${
              success === true ? 'bg-white' : success === false ? 'bg-white' : success === 'already' ? 'bg-white' : 'bg-white'
            }`} />
            <div className={`absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10 ${
              success === true ? 'bg-white' : success === false ? 'bg-white' : success === 'already' ? 'bg-white' : 'bg-white'
            }`} />
          </div>

          {/* Contenu principal */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Icône avec animation */}
            <div className={`relative mb-8 md:mb-12`}>
              {/* Anneau extérieur animé */}
              <div className={`absolute inset-0 w-32 h-32 md:w-44 md:h-44 lg:w-52 lg:h-52 rounded-full border-4 ${
                success === true ? 'border-white/30' : 
                success === false ? 'border-white/30' : 
                success === 'already' ? 'border-white/20' : 
                'border-white/30 animate-pulse'
              }`} />
              
              {/* Cercle principal avec icône */}
              <div className={`w-32 h-32 md:w-44 md:h-44 lg:w-52 lg:h-52 rounded-full flex items-center justify-center ${
                success === true ? 'bg-white/20 backdrop-blur-sm' : 
                success === false ? 'bg-white/20 backdrop-blur-sm' : 
                success === 'already' ? 'bg-white/10 backdrop-blur-sm' : 
                'bg-white/20 backdrop-blur-sm'
              }`}>
                {success === true ? (
                  <div className="relative">
                    <div className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full bg-white/30 flex items-center justify-center">
                      <Check className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-white" strokeWidth={3} />
                    </div>
                  </div>
                ) : success === false ? (
                  <div className="relative">
                    <div className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full bg-white/30 flex items-center justify-center">
                      <X className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-white" strokeWidth={3} />
                    </div>
                  </div>
                ) : success === 'already' ? (
                  <div className="relative">
                    <div className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full bg-white/20 flex items-center justify-center">
                      <ShieldAlert className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-white/90" strokeWidth={1.5} />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full bg-white/30 flex items-center justify-center">
                      <WifiOffIcon className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-white" strokeWidth={1.5} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Texte de statut */}
            <div className="text-center px-6">
              {/* Label de statut */}
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm md:text-base font-medium mb-4 ${
                success === true ? 'bg-white/20 text-white' : 
                success === false ? 'bg-white/20 text-white' : 
                success === 'already' ? 'bg-white/10 text-white/80' : 
                'bg-white/20 text-white'
              }`}>
                {success === true ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Pointage enregistré</span>
                  </>
                ) : success === false ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Échec du pointage</span>
                  </>
                ) : success === 'already' ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Déjà pointé récemment</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-4 h-4" />
                    <span>Sauvegardé hors ligne</span>
                  </>
                )}
              </div>
              
              {/* Nom de l'employé */}
              {employeInfo && (
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-3 md:mb-4 tracking-tight">
                  {`${employeInfo.prenom} ${employeInfo.nom}`.trim()}
                </h2>
              )}
              
              {/* Message */}
              {!employeInfo && (
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4">
                  {success === true ? 'Succès' : success === false ? 'Erreur' : success === 'already' ? 'Déjà scanné' : 'En attente'}
                </h2>
              )}
              
              <p className="text-lg md:text-xl lg:text-2xl text-white/80 max-w-md mx-auto">
                {message}
              </p>
              
              {/* Heure */}
              <div className="mt-6 md:mt-8 flex items-center justify-center gap-2 text-white/60">
                <Clock className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-base md:text-lg font-mono">{formatTime(currentTime)}</span>
              </div>
              
              {/* Info sync pour mode hors-ligne */}
              {success === null && (
                <div className="mt-4 flex items-center justify-center gap-2 text-white/50 text-sm md:text-base">
                  <Upload className="w-4 h-4 animate-pulse" />
                  <span>Synchronisation automatique dès reconnexion</span>
                </div>
              )}
            </div>
          </div>

          {/* Barre de progression en bas - synchronisée avec la durée réelle */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
            <div 
              key={animationKey}
              className="h-full bg-white/50"
              style={{ 
                width: '100%',
                animation: `shrink ${confirmationDuration}ms linear forwards`
              }}
            />
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes scan-line {
          0%, 100% { top: 8%; }
          50% { top: 88%; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default Badgeuse;
