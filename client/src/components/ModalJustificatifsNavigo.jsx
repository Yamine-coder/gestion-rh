import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function ModalJustificatifsNavigo({ onClose, onEmployesUpdate }) {
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    chargerEmployes();
  }, []);

  const chargerEmployes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/navigo/liste`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployes(response.data);
    } catch (error) {
      console.error('Erreur chargement employés:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des employés' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (employeId, file, eligibleNavigo) => {
    try {
      setUploading(employeId);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employeId', employeId);
      formData.append('eligibleNavigo', eligibleNavigo);

      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/navigo/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage({ type: 'success', text: '✅ Justificatif uploadé avec succès !' });
      chargerEmployes();
      if (onEmployesUpdate) onEmployesUpdate();
    } catch (error) {
      console.error('Erreur upload:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Erreur lors de l\'upload' });
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (employeId) => {
    if (!window.confirm('Supprimer le justificatif Navigo ?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/navigo/${employeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: '✅ Justificatif supprimé' });
      chargerEmployes();
      if (onEmployesUpdate) onEmployesUpdate();
    } catch (error) {
      console.error('Erreur suppression:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  const handleFileSelect = (employeId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Format non supporté. Utilisez JPG, PNG ou PDF.' });
      return;
    }

    // Vérifier la taille (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Fichier trop volumineux (5MB maximum)' });
      return;
    }

    const employe = employes.find(e => e.id === employeId);
    handleUpload(employeId, file, employe.eligibleNavigo || true);
  };

  const toggleEligible = async (employeId, currentValue) => {
    setEmployes(prev => prev.map(e => 
      e.id === employeId ? { ...e, eligibleNavigo: !currentValue } : e
    ));
  };

  const filteredEmployes = employes.filter(emp => {
    const term = searchTerm.toLowerCase();
    return emp.nom.toLowerCase().includes(term) || 
           emp.prenom.toLowerCase().includes(term) ||
           emp.email.toLowerCase().includes(term);
  });

  const stats = {
    total: employes.length,
    withJustificatif: employes.filter(e => e.justificatifNavigo).length,
    eligible: employes.filter(e => e.eligibleNavigo).length,
    pending: employes.filter(e => e.eligibleNavigo && !e.justificatifNavigo).length
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                🚇 Justificatifs Navigo
              </h2>
              <p className="text-blue-100 mt-1 text-sm">
                Gérez les justificatifs de transport avant l'export Excel
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-blue-100">Total employés</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.withJustificatif}</div>
              <div className="text-xs text-blue-100">Avec justificatif</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.eligible}</div>
              <div className="text-xs text-blue-100">Éligibles</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-300">{stats.pending}</div>
              <div className="text-xs text-blue-100">En attente</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-lg flex items-center justify-between ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <span className="text-sm">{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-lg font-bold hover:opacity-70">×</button>
          </div>
        )}

        {/* Recherche */}
        <div className="px-6 pt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un employé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Liste des employés */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">Chargement...</div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEmployes.map((employe) => (
                <div 
                  key={employe.id} 
                  className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                    employe.justificatifNavigo ? 'bg-green-50 border-green-200' : 
                    employe.eligibleNavigo ? 'bg-yellow-50 border-yellow-200' : 
                    'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Info employé */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                            {employe.prenom[0]}{employe.nom[0]}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {employe.nom} {employe.prenom}
                          </div>
                          <div className="text-sm text-gray-500 truncate">{employe.email}</div>
                        </div>
                      </div>
                    </div>

                    {/* Éligibilité */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => toggleEligible(employe.id, employe.eligibleNavigo)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          employe.eligibleNavigo
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {employe.eligibleNavigo ? '✓ Éligible' : 'Non éligible'}
                      </button>
                    </div>

                    {/* Statut justificatif */}
                    <div className="flex-shrink-0 w-32">
                      {employe.justificatifNavigo ? (
                        <a
                          href={`${API_URL}${employe.justificatifNavigo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          <span>📎</span>
                          <span>Voir fichier</span>
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">Aucun fichier</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <label className={`cursor-pointer inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium transition-all ${
                        uploading === employe.id 
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
                          : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}>
                        {uploading === employe.id ? (
                          <>🔄 Upload...</>
                        ) : (
                          <>📤 {employe.justificatifNavigo ? 'Remplacer' : 'Ajouter'}</>
                        )}
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileSelect(employe.id, e)}
                          disabled={uploading === employe.id}
                          className="hidden"
                        />
                      </label>
                      {employe.justificatifNavigo && (
                        <button
                          onClick={() => handleDelete(employe.id)}
                          className="inline-flex items-center px-3 py-2 border border-red-300 bg-red-50 rounded-md text-sm font-medium text-red-700 hover:bg-red-100 transition-all"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <div className="font-medium mb-1">ℹ️ Informations</div>
              <div className="text-xs space-y-1">
                <div>• Formats acceptés : JPG, PNG, PDF (5MB max)</div>
                <div>• Les justificatifs apparaîtront dans l'Excel exporté</div>
                <div>• {stats.pending} employé(s) éligible(s) sans justificatif</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm"
            >
              Terminé
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
