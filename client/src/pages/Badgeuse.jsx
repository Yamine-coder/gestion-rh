import React, { useState, useRef, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Badgeuse = () => {
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(null);
  const [prenom, setPrenom] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [showManualMode, setShowManualMode] = useState(false);
  const scannedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier la compatibilité complète de l'API MediaDevices
    const checkCameraSupport = async () => {
      try {
        // Vérifications de base
        if (!navigator.mediaDevices) {
          throw new Error('navigator.mediaDevices non disponible');
        }
        
        if (!navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia non supporté');
        }

        // Test pratique de l'accès caméra
        console.log('🔍 Test d\'accès caméra...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: 'environment' 
          } 
        });
        
        console.log('✅ Caméra accessible');
        stream.getTracks().forEach(track => track.stop()); // Arrêter le stream de test
        setCameraError('');
        setShowManualMode(false);
        
      } catch (err) {
        console.error('❌ Erreur caméra complète:', err);
        let errorMessage = 'Caméra indisponible: ';
        
        if (err.name === 'NotAllowedError') {
          errorMessage += 'Accès refusé par l\'utilisateur';
        } else if (err.name === 'NotFoundError') {
          errorMessage += 'Aucune caméra trouvée';
        } else if (err.name === 'NotSupportedError') {
          errorMessage += 'Caméra non supportée';
        } else if (err.message.includes('getUserMedia')) {
          errorMessage += 'API caméra non disponible sur ce navigateur';
        } else {
          errorMessage += err.message || 'Erreur inconnue';
        }
        
        setCameraError(errorMessage);
        setShowManualMode(true);
      }
    };

    checkCameraSupport();
  }, []);

  const handleScan = async (result) => {
    if (result && !scannedRef.current) {
      scannedRef.current = true;

      try {
        const decoded = jwtDecode(result);
        const userEmail = decoded.email || '';
        const userPrenom = userEmail.split('@')[0] || 'Utilisateur';
        setPrenom(userPrenom);

        const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
        const res = await axios.post(
          `${apiUrl}/pointage/auto`,
          {},
          {
            headers: {
              Authorization: `Bearer ${result}`,
            },
          }
        );

        setSuccess(true);
        setMessage(res.data.message || 'Pointage réussi');
      } catch (err) {
        setSuccess(false);
        setMessage(err?.response?.data?.message || 'Erreur lors du pointage');
      } finally {
        setShowConfirmation(true);
        setTimeout(() => {
          setShowConfirmation(false);
          setMessage('');
          scannedRef.current = false;
        }, 3000);
      }
    }
  };

  const handleManualScan = async () => {
    if (!manualToken || !manualToken.includes('.')) {
      setMessage('Token JWT invalide (doit contenir des points)');
      setSuccess(false);
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
      return;
    }

    await handleScan(manualToken);
    setManualToken('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-6 space-y-6 relative">
      {/* Bouton retour */}
      <button
        onClick={() => navigate('/pointage')}
        className="absolute top-4 left-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
        aria-label="Retour au pointage"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      <h1 className="text-3xl font-bold">Scanner votre QR Code</h1>

      {/* Mode test manuel - toujours visible en bas */}
      <div className="w-full max-w-md bg-blue-900 p-4 rounded-lg">
        <h3 className="text-lg font-bold text-center mb-3">🧪 Mode Test Manuel</h3>
        <p className="text-sm text-gray-300 mb-3 text-center">
          Collez votre token JWT pour tester le pointage
        </p>
        
        <div className="space-y-3">
          <textarea 
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Coller le token JWT ici... (eyJ...)"
            className="w-full px-3 py-2 text-black text-sm rounded h-20 resize-none"
            rows="3"
          />
          
          <button 
            onClick={handleManualScan}
            disabled={!manualToken || !manualToken.includes('.')}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 
                       text-white font-bold py-3 px-4 rounded transition-colors"
          >
            {manualToken ? '✅ Pointer avec ce token' : '📋 Collez d\'abord un token'}
          </button>
          
          <div className="text-xs text-gray-400 text-center">
            <p>💡 Pour obtenir un token :</p>
            <p>1. Connectez-vous sur l'app principale</p>
            <p>2. Ouvrez la console (F12)</p>
            <p>3. Tapez: localStorage.getItem('token')</p>
          </div>
        </div>
      </div>

      {cameraError && (
        <div className="bg-red-600 text-white p-4 rounded-lg mb-4 text-center">
          <p className="font-bold">⚠️ Problème de caméra</p>
          <p className="text-sm mt-2">{cameraError}</p>
          <p className="text-xs mt-1">Utilisez le mode test manuel ci-dessus</p>
        </div>
      )}

      <div className="w-full max-w-md border-4 border-blue-500 rounded-lg overflow-hidden shadow-lg relative">
        {!cameraError && !showManualMode ? (
          <QrReader
            constraints={{ 
              facingMode: 'environment',
              video: { 
                width: { ideal: 640 },
                height: { ideal: 480 }
              }
            }}
            onResult={(result, error) => {
              if (error) {
                console.log('🔍 QR Scanner Error:', error);
                
                // Gestion spécifique des erreurs getUserMedia
                if (error.message && error.message.includes('getUserMedia')) {
                  setCameraError('Erreur d\'accès caméra: ' + error.message);
                  setShowManualMode(true);
                  return;
                }
                
                // Filtrer les erreurs pour éviter "undefined"
                if (error.name && error.message && error.name !== 'NotFoundException') {
                  const errorMsg = `Scanner: ${error.name} - ${error.message}`;
                  console.warn('❌', errorMsg);
                  // Ne pas afficher toutes les erreurs de scan, seulement les critiques
                  if (error.name.includes('NotFound') === false) {
                    setCameraError(errorMsg);
                    setShowManualMode(true);
                  }
                } else if (error && typeof error === 'string' && !error.includes('NotFoundException')) {
                  console.warn('❌ Erreur scanner string:', error);
                  setCameraError(`Scanner: ${error}`);
                  setShowManualMode(true);
                }
                // Ignorer les erreurs "undefined", "NotFoundException" ou sans contenu
              }
              if (!!result) {
                console.log('🎯 QR Code détecté:', result?.text?.substring(0, 50) + '...');
                handleScan(result?.text);
              }
            }}
            videoId="video"
            scanDelay={100}
            containerStyle={{ width: '100%' }}
          />
        ) : (
          // Fallback si pas de caméra
          <div className="aspect-square bg-gray-800 flex items-center justify-center text-center p-8">
            <div>
              <div className="text-6xl mb-4">📷</div>
              <p className="text-sm text-gray-300">Caméra indisponible</p>
              <p className="text-xs text-gray-400 mt-2">
                Utilisez le mode manuel ou changez de navigateur
              </p>
            </div>
          </div>
        )}
        
        {scannedRef.current && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-20">
            <span className="text-lg">Scan en pause...</span>
          </div>
        )}
        
        {/* Indicateur de statut */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          {cameraError || showManualMode ? '❌ Caméra' : '✅ Prêt'}
        </div>
      </div>

      {showConfirmation && (
        <div className={`fixed inset-0 z-50 ${success ? 'bg-green-500' : 'bg-red-600'}
                        flex flex-col items-center justify-center text-white animate-fade-in`}>
          <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={
              success ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"
            } />
          </svg>
          <h2 className="text-3xl font-bold">
            {success ? `Bonjour ${prenom} !` : 'Erreur'}
          </h2>
          <p className="mt-2 text-lg">{message}</p>
        </div>
      )}
    </div>
  );
};

export default Badgeuse;
