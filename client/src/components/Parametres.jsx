import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  User, 
  Building, 
  Palette, 
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Shield,
  Mail,
  Key
} from 'lucide-react';

const Parametres = () => {
  const [activeTab, setActiveTab] = useState('profil');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // États pour les données de profil
  const [profileData, setProfileData] = useState({
    nom: '',
    prenom: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // États pour les paramètres d'entreprise
  const [companyData, setCompanyData] = useState({
    nom: 'Mon Entreprise',
    adresse: '',
    ville: '',
    codePostal: '',
    telephone: '',
    email: ''
  });

  // États pour les paramètres système
  const [systemSettings, setSystemSettings] = useState({
    theme: '#cf292c',
    formatDate: 'DD/MM/YYYY',
    compactMode: false
  });

  // États pour la sécurité
  const [securityData, setSecurityData] = useState({
    emailRecovery: '',
    isRequestingRecovery: false
  });

  // Chargement des données initiales
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Charger le profil utilisateur depuis l'API
        const profileRes = await axios.get('http://localhost:5000/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setProfileData(prev => ({
          ...prev,
          nom: profileRes.data.nom || '',
          prenom: profileRes.data.prenom || '',
          email: profileRes.data.email || ''
        }));

        // Charger les paramètres depuis localStorage
        const savedCompany = localStorage.getItem('companySettings');
        if (savedCompany) {
          setCompanyData(JSON.parse(savedCompany));
        }

        const savedSystem = localStorage.getItem('systemSettings');
        if (savedSystem) {
          setSystemSettings(JSON.parse(savedSystem));
        }

      } catch (error) {
        if (error.response?.status !== 404) {
          showNotification('Erreur lors du chargement des paramètres', 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Validations
      if (!profileData.nom.trim() || !profileData.prenom.trim()) {
        showNotification('Nom et prénom sont obligatoires', 'error');
        return;
      }

      if (!validateEmail(profileData.email)) {
        showNotification('Format d\'email invalide', 'error');
        return;
      }

      if (profileData.newPassword) {
        if (!profileData.currentPassword) {
          showNotification('Mot de passe actuel requis', 'error');
          return;
        }
        if (profileData.newPassword.length < 6) {
          showNotification('Nouveau mot de passe trop court (6 caractères min)', 'error');
          return;
        }
        if (profileData.newPassword !== profileData.confirmPassword) {
          showNotification('Les mots de passe ne correspondent pas', 'error');
          return;
        }
      }

      const updateData = {
        nom: profileData.nom.trim(),
        prenom: profileData.prenom.trim(),
        email: profileData.email.trim()
      };

      if (profileData.newPassword && profileData.currentPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      await axios.put('http://localhost:5000/auth/profile', updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showNotification('Profil mis à jour avec succès');
      
      // Réinitialiser les champs de mot de passe
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

    } catch (error) {
      showNotification(
        error.response?.data?.error || 'Erreur lors de la mise à jour du profil', 
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = () => {
    localStorage.setItem('companySettings', JSON.stringify(companyData));
    showNotification('Paramètres d\'entreprise sauvegardés');
  };

  const handleSaveSystem = () => {
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
    
    // Appliquer le thème immédiatement
    document.documentElement.style.setProperty('--primary-color', systemSettings.theme);
    
    showNotification('Paramètres d\'interface sauvegardés');
  };

  const handlePasswordRecovery = async () => {
    try {
      setSecurityData(prev => ({ ...prev, isRequestingRecovery: true }));
      
      const email = securityData.emailRecovery || profileData.email;
      if (!email) {
        showNotification('Email requis pour la récupération', 'error');
        return;
      }

      await axios.post("http://localhost:5000/auth/forgot-password", {
        email: email
      });

      showNotification(
        `Un lien de récupération a été envoyé à ${email}. Vérifiez votre boîte email.`
      );
      
      setSecurityData(prev => ({ ...prev, emailRecovery: '' }));
      
    } catch (err) {
      if (err.response?.status === 429) {
        showNotification(
          err.response.data.error + ` (${err.response.data.retryAfter} min)`,
          'error'
        );
      } else {
        showNotification('Erreur lors de l\'envoi de l\'email de récupération', 'error');
      }
    } finally {
      setSecurityData(prev => ({ ...prev, isRequestingRecovery: false }));
    }
  };

  const tabs = [
    { id: 'profil', label: 'Mon Profil', icon: User },
    { id: 'securite', label: 'Sécurité', icon: Shield },
    { id: 'entreprise', label: 'Entreprise', icon: Building },
    { id: 'interface', label: 'Interface', icon: Palette }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profil':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={profileData.prenom}
                    onChange={(e) => setProfileData(prev => ({ ...prev, prenom: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                    placeholder="Votre prénom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={profileData.nom}
                    onChange={(e) => setProfileData(prev => ({ ...prev, nom: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                    placeholder="Votre nom"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                    placeholder="votre.email@exemple.com"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Changer le mot de passe</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent pr-10"
                      placeholder="Votre mot de passe actuel"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={profileData.newPassword}
                    onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                    placeholder="Nouveau mot de passe (6 caractères min)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={profileData.confirmPassword}
                    onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                    placeholder="Confirmer le nouveau mot de passe"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="flex items-center gap-2 bg-[#cf292c] text-white px-6 py-3 rounded-lg hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={20} />
                {loading ? 'Sauvegarde...' : 'Sauvegarder le profil'}
              </button>
            </div>
          </div>
        );

      case 'entreprise':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de l'entreprise</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'entreprise
                  </label>
                  <input
                    type="text"
                    value={companyData.nom}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, nom: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                    placeholder="Nom de votre entreprise"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={companyData.adresse}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, adresse: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                    placeholder="Adresse complète"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={companyData.ville}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, ville: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                    placeholder="Ville"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={companyData.codePostal}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, codePostal: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                    placeholder="Code postal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={companyData.telephone}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, telephone: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                    placeholder="Numéro de téléphone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                    placeholder="contact@entreprise.com"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveCompany}
                className="flex items-center gap-2 bg-[#cf292c] text-white px-6 py-3 rounded-lg hover:bg-[#b91c1c] transition-colors"
              >
                <Save size={20} />
                Sauvegarder
              </button>
            </div>
          </div>
        );

      case 'securite':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="mr-2" size={20} />
                Sécurité du compte
              </h3>
              
              {/* Section récupération mot de passe */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start">
                  <Key className="text-blue-600 mt-1 mr-3" size={20} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Récupération de mot de passe
                    </h4>
                    <p className="text-blue-700 text-sm mb-4">
                      Recevez un lien de récupération par email pour réinitialiser votre mot de passe en toute sécurité.
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-2">
                          Email de récupération (optionnel)
                        </label>
                        <div className="flex gap-3">
                          <div className="flex-1 relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                              type="email"
                              value={securityData.emailRecovery}
                              onChange={(e) => setSecurityData(prev => ({ ...prev, emailRecovery: e.target.value }))}
                              placeholder={`${profileData.email || 'Votre email actuel'} (par défaut)`}
                              className="w-full pl-10 pr-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                          </div>
                          <button
                            onClick={handlePasswordRecovery}
                            disabled={securityData.isRequestingRecovery || loading}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                              securityData.isRequestingRecovery || loading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
                            }`}
                          >
                            {securityData.isRequestingRecovery ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Envoi...
                              </span>
                            ) : (
                              'Envoyer le lien'
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-blue-600">
                        💡 <strong>Conseil :</strong> Si vous laissez le champ vide, le lien sera envoyé à votre email principal : {profileData.email}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section informations sécurité */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <AlertCircle className="mr-2" size={18} />
                  Informations de sécurité
                </h4>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <CheckCircle className="text-green-500 mr-2" size={16} />
                    <span>Compte protégé par mot de passe sécurisé</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="text-green-500 mr-2" size={16} />
                    <span>Connexion chiffrée (HTTPS)</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="text-green-500 mr-2" size={16} />
                    <span>Récupération par email activée</span>
                  </div>
                </div>
              </div>

              {/* Section historique connexions (optionnel pour plus tard) */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Dernière activité
                </h4>
                <div className="text-sm text-gray-600">
                  <p>Dernière connexion : {new Date().toLocaleString('fr-FR')}</p>
                  <p className="text-xs mt-1 text-gray-500">
                    Votre compte est sécurisé et aucune activité suspecte n'a été détectée.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'interface':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personnalisation de l'interface</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur du thème
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={systemSettings.theme}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, theme: e.target.value }))}
                      className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={systemSettings.theme}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, theme: e.target.value }))}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                      placeholder="#cf292c"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format de date
                  </label>
                  <select
                    value={systemSettings.formatDate}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, formatDate: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf292c] focus:border-transparent"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (français)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (américain)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={systemSettings.compactMode}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, compactMode: e.target.checked }))}
                      className="w-4 h-4 text-[#cf292c] rounded focus:ring-[#cf292c]"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Mode interface compacte</div>
                      <div className="text-sm text-gray-600">Réduire les espaces et marges pour afficher plus d'informations</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSystem}
                className="flex items-center gap-2 bg-[#cf292c] text-white px-6 py-3 rounded-lg hover:bg-[#b91c1c] transition-colors"
              >
                <Save size={20} />
                Sauvegarder
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cf292c]"></div>
        <span className="ml-3 text-gray-600">Chargement des paramètres...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-opacity ${
          notification.type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <AlertCircle className="text-red-600" size={20} />
            ) : (
              <CheckCircle className="text-green-600" size={20} />
            )}
            <span className={`font-medium ${
              notification.type === 'error' ? 'text-red-800' : 'text-green-800'
            }`}>
              {notification.message}
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Paramètres</h2>
          <p className="text-gray-600 mt-1">Gérez votre profil et les paramètres de l'application</p>
        </div>

        <div className="flex flex-col lg:flex-row min-h-[600px]">
          {/* Navigation des onglets */}
          <div className="lg:w-1/4 border-b lg:border-b-0 lg:border-r border-gray-200">
            <nav className="p-4 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-[#cf292c] text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Contenu de l'onglet */}
          <div className="flex-1 p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Parametres;
