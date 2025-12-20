import React, { useState, useRef } from 'react';
import axios from 'axios';
import { CameraIcon, TrashIcon, XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import API_URL from '../config/api';
import { getImageUrl } from '../utils/imageUtils';

const UploadPhotoProfil = ({ employe, onUpdate, onClose, onDeleteRequest }) => {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const token = localStorage.getItem('token');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation côté client
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ 
        type: 'error', 
        text: 'Format non autorisé. Utilisez JPG, PNG ou WEBP.' 
      });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ 
        type: 'error', 
        text: 'La photo ne doit pas dépasser 2 MB.' 
      });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    // Créer une preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload automatique
    handleUpload(file);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    setMessage(null);
    
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await axios.post(
        `${API_URL}/api/profil/upload-photo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setPreview(null);
      
      // Afficher un message de succès pendant 1 seconde
      setMessage({ 
        type: 'success', 
        text: '✅ Photo mise à jour avec succès !' 
      });
      
      // Attendre 1 seconde pour que l'utilisateur voie le message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fermer la modal
      if (onClose) onClose();
      
      // Callback pour mettre à jour les données du parent (affichera le toast)
      if (onUpdate) {
        await onUpdate();
      }

    } catch (error) {
      console.error('Erreur upload photo:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Erreur lors de l\'upload' 
      });
      setPreview(null);
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setUploading(false);
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteClick = () => {
    if (onDeleteRequest) {
      onDeleteRequest();
    }
  };

  const currentPhoto = preview || getImageUrl(employe.photoProfil);
  const hasPhoto = !!employe.photoProfil;

  return (
    <div>
      {/* Message de feedback */}
      {message && (
        <div className={`rounded-xl p-4 mb-4 border-2 text-sm shadow-lg animate-[slideDown_0.3s_ease-out] ${
          message.type === 'success' 
            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-300 text-emerald-900 dark:from-emerald-900/30 dark:to-emerald-800/20 dark:border-emerald-700 dark:text-emerald-100' 
            : 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-300 text-rose-900 dark:from-rose-900/30 dark:to-rose-800/20 dark:border-rose-700 dark:text-rose-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              message.type === 'success'
                ? 'bg-emerald-500 dark:bg-emerald-600'
                : 'bg-rose-500 dark:bg-rose-600'
            }`}>
              {message.type === 'success' ? (
                <CheckCircleIcon className="w-5 h-5 text-white flex-shrink-0" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-white flex-shrink-0" />
              )}
            </div>
            <span className="font-medium">{message.text}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Preview de la photo */}
        <div className="relative mx-auto sm:mx-0 flex-shrink-0">
          <div className="w-32 h-32 sm:w-24 sm:h-24 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden border-2 border-slate-200 dark:border-slate-600 transition-all duration-300 shadow-lg">
            {currentPhoto ? (
              <img 
                src={currentPhoto} 
                alt="Photo de profil" 
                className="w-full h-full object-cover transition-all duration-500 ease-out"
                style={{ 
                  opacity: uploading ? 0.3 : 1,
                  transform: uploading ? 'scale(1.05)' : 'scale(1)',
                  filter: uploading ? 'blur(2px)' : 'blur(0)'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                <CameraIcon className="w-12 h-12 sm:w-10 sm:h-10" />
              </div>
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600/90 to-primary-700/90 rounded-xl flex items-center justify-center backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-12 h-12 sm:w-10 sm:h-10">
                  <div className="absolute inset-0 border-[3px] border-white/30 rounded-full"></div>
                  <div className="absolute inset-0 border-[3px] border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-white text-sm font-semibold tracking-wide">Upload...</span>
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-1 w-full space-y-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p className="flex items-center gap-1.5">
              <span>📸</span>
              <span className="hidden sm:inline">Formats acceptés : JPG, PNG, WEBP</span>
              <span className="sm:hidden">JPG, PNG, WEBP</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span>📏</span>
              <span>Taille max : 2 MB</span>
            </p>
            <p className="hidden sm:flex items-center gap-1.5">
              <span>🎨</span>
              <span>Résolution : 400x400 px</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Bouton Upload/Modifier */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm hover:shadow-md"
            >
              <CameraIcon className="w-4 h-4" />
              {hasPhoto ? 'Modifier' : 'Ajouter'}
            </button>

            {/* Bouton Supprimer */}
            {hasPhoto && (
              <button
                onClick={handleDeleteClick}
                disabled={uploading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 active:bg-rose-200 dark:active:bg-rose-900/40 text-rose-700 dark:text-rose-400 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-rose-200 dark:border-rose-800"
              >
                <TrashIcon className="w-4 h-4" />
                Supprimer
              </button>
            )}
          </div>

          {/* Input file caché */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Info supplémentaire */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
        💡 <span className="font-medium">Conseil :</span> Utilisez une photo claire avec un fond uni pour un meilleur rendu.
      </div>

      {/* Bouton Fermer */}
      {onClose && (
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={uploading}
            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadPhotoProfil;
