import React, { useState } from 'react';
import axios from 'axios';
import { 
  DocumentArrowUpIcon, 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  DocumentIcon,
  TrashIcon 
} from '@heroicons/react/24/outline';

const UploadDocument = ({ 
  documentType, // 'domicile', 'rib', 'navigo'
  currentFile, // Chemin du fichier actuel (ou null)
  onUpdate, // Callback après upload/delete
  onClose, // Callback pour fermer le modal
  mois, // Pour Navigo seulement
  annee // Pour Navigo seulement
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const documentLabels = {
    domicile: 'Justificatif de domicile',
    rib: 'RIB bancaire',
    navigo: 'Pass Navigo'
  };

  const documentHints = {
    domicile: 'Facture, bail, quittance de loyer (moins de 3 mois)',
    rib: 'Relevé d\'identité bancaire (format PDF ou image)',
    navigo: 'Justificatif mensuel Pass Navigo'
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setError('');

    if (!file) return;

    // Validation du type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('❌ Format non autorisé. Utilisez PDF, JPG, PNG ou WEBP.');
      return;
    }

    // Validation de la taille (5 MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('❌ Le fichier est trop volumineux (max 5 MB).');
      return;
    }

    setSelectedFile(file);

    // Prévisualisation si image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview('pdf');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('❌ Veuillez sélectionner un fichier.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('type', documentType);
      
      if (documentType === 'navigo' && mois && annee) {
        formData.append('mois', mois);
        formData.append('annee', annee);
      }

      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Upload réussi:', response.data);

      // Attendre 1 seconde puis fermer
      setTimeout(() => {
        onUpdate(); // Rafraîchir les données du parent
        onClose(); // Fermer le modal
      }, 1000);

    } catch (error) {
      console.error('❌ Erreur upload:', error);
      setError(error.response?.data?.error || 'Erreur lors de l\'upload du document');
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setUploading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/documents/delete/${documentType}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Document supprimé');
      onUpdate(); // Rafraîchir les données du parent
      onClose(); // Fermer le modal
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      setError(error.response?.data?.error || 'Erreur lors de la suppression');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <DocumentArrowUpIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{documentLabels[documentType]}</h3>
              <p className="text-sm text-white/80">{documentHints[documentType]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Document actuel */}
          {currentFile && !selectedFile && (
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500 flex-shrink-0">
                  <DocumentIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-emerald-900">Document actuel</p>
                  <p className="text-sm text-emerald-700 truncate">{currentFile.split('/').pop()}</p>
                  <div className="flex gap-2 mt-2">
                    <a
                      href={`http://localhost:5000${currentFile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-800 underline"
                    >
                      📄 Voir le document
                    </a>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={uploading}
                      className="text-xs font-medium text-rose-600 hover:text-rose-800 underline disabled:opacity-50"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation de suppression */}
          {showDeleteConfirm && (
            <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 border-2 border-rose-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-rose-500 flex-shrink-0">
                  <ExclamationCircleIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-rose-900">Confirmer la suppression ?</p>
                  <p className="text-sm text-rose-700 mt-1">Cette action est irréversible.</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleDelete}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Supprimer
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload zone */}
          <div className="space-y-4">
            <label className="block">
              <div className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${uploading ? 'border-gray-300 bg-gray-50 cursor-not-allowed' : 'border-primary-300 bg-primary-50/30 hover:bg-primary-50 hover:border-primary-400'}
              `}>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                />
                <DocumentArrowUpIcon className="w-12 h-12 mx-auto text-primary-600 mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  {selectedFile ? selectedFile.name : 'Cliquez pour sélectionner un fichier'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPG, PNG ou WEBP • Max 5 MB
                </p>
              </div>
            </label>

            {/* Prévisualisation */}
            {preview && (
              <div className="relative rounded-xl overflow-hidden bg-gray-100">
                {preview === 'pdf' ? (
                  <div className="flex items-center justify-center p-12">
                    <DocumentIcon className="w-20 h-20 text-primary-600" />
                  </div>
                ) : (
                  <img
                    src={preview}
                    alt="Aperçu"
                    className={`w-full h-auto transition-all duration-300 ${
                      uploading ? 'opacity-30 blur-sm scale-105' : 'opacity-100'
                    }`}
                  />
                )}

                {/* Animation d'upload */}
                {uploading && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-600/90 to-primary-700/90 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 border-[3px] border-white/30 rounded-full"></div>
                      <div className="absolute inset-0 border-[3px] border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <span className="text-white text-sm font-semibold">Upload en cours...</span>
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 border-2 border-rose-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-rose-500 flex-shrink-0">
                  <ExclamationCircleIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-rose-900">Erreur</p>
                  <p className="text-sm text-rose-700 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bouton Upload */}
          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {uploading ? 'Upload en cours...' : '📤 Valider et envoyer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadDocument;
