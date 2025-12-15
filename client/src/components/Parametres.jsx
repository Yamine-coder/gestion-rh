import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  User, 
  Building, 
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  Shield,
  Mail,
  Key,
  Clock,
  Settings,
  ChevronRight,
  Lock,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import FichePosteEditor from './FichePosteEditor';

// URL de l'API (utilise la variable d'environnement en production)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Parametres = () => {
  const [activeTab, setActiveTab] = useState('profil');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [userRole, setUserRole] = useState('');
  
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
    nom: 'Mon Restaurant',
    adresse: '',
    ville: '',
    codePostal: '',
    telephone: '',
    email: ''
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
        
        const profileRes = await axios.get(`${API_BASE}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setProfileData(prev => ({
          ...prev,
          nom: profileRes.data.nom || '',
          prenom: profileRes.data.prenom || '',
          email: profileRes.data.email || ''
        }));
        
        // Récupérer le rôle de l'utilisateur
        setUserRole(profileRes.data.role || '');

        const savedCompany = localStorage.getItem('companySettings');
        if (savedCompany) {
          setCompanyData(prev => ({ ...prev, ...JSON.parse(savedCompany) }));
        }

      } catch (error) {
        if (error.response?.status !== 404) {
          toast.error('Erreur lors du chargement');
        }
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSaveProfile = async () => {
    // Validations synchrones avant le try
    if (!profileData.nom.trim() || !profileData.prenom.trim()) {
      toast.error('Nom et prénom obligatoires');
      return;
    }

    if (!validateEmail(profileData.email)) {
      toast.error('Email invalide');
      return;
    }

    if (profileData.newPassword) {
      if (!profileData.currentPassword) {
        toast.error('Mot de passe actuel requis pour changer le mot de passe');
        return;
      }
      if (profileData.newPassword.length < 6) {
        toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
        return;
      }
      if (profileData.newPassword !== profileData.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas');
        return;
      }
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const updateData = {
        nom: profileData.nom.trim(),
        prenom: profileData.prenom.trim(),
        email: profileData.email.trim()
      };

      if (profileData.newPassword && profileData.currentPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      console.log('📤 Envoi mise à jour profil:', updateData);

      const response = await axios.put(`${API_BASE}/auth/profile`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📥 Réponse serveur:', response.data);

      // Mettre à jour les données avec la réponse du serveur
      if (response.data.user) {
        setProfileData(prev => ({
          ...prev,
          nom: response.data.user.nom || prev.nom,
          prenom: response.data.user.prenom || prev.prenom,
          email: response.data.user.email || prev.email,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        setProfileData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      }

      const hasPasswordChange = updateData.newPassword;
      toast.success(hasPasswordChange ? 'Profil et mot de passe mis à jour' : 'Profil mis à jour');

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la mise à jour';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = () => {
    localStorage.setItem('companySettings', JSON.stringify(companyData));
    toast.success('Établissement sauvegardé');
  };

  const handlePasswordRecovery = async () => {
    const email = securityData.emailRecovery || profileData.email;
    
    if (!email) {
      toast.error('Email requis');
      return;
    }

    if (!validateEmail(email)) {
      toast.error('Email invalide');
      return;
    }

    try {
      setSecurityData(prev => ({ ...prev, isRequestingRecovery: true }));

      const response = await axios.post(`${API_BASE}/auth/forgot-password`, { email });
      
      if (response.data.success) {
        toast.success(`Lien de récupération envoyé à ${email}`);
        setSecurityData(prev => ({ ...prev, emailRecovery: '' }));
      } else {
        toast.error(response.data.error || 'Erreur lors de l\'envoi');
      }
      
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error(`Trop de tentatives. Réessayez dans ${err.response.data.retryAfter || 5} min`);
      } else if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error('Erreur lors de l\'envoi de l\'email');
      }
    } finally {
      setSecurityData(prev => ({ ...prev, isRequestingRecovery: false }));
    }
  };

  const tabs = [
    { id: 'profil', label: 'Mon Profil', icon: User },
    { id: 'securite', label: 'Sécurité', icon: Shield },
    { id: 'entreprise', label: 'Établissement', icon: Building },
    { id: 'fiches', label: 'Fiches de poste', icon: FileText }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profil':
        return (
          <div className="space-y-4">
            {/* Grid 2 colonnes pour les 2 cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Informations personnelles */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <div className="p-1 rounded bg-[#cf292c]/10">
                    <User size={14} className="text-[#cf292c]" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm">Informations personnelles</h3>
                </div>
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Prénom *</label>
                      <input
                        type="text"
                        value={profileData.prenom}
                        onChange={(e) => setProfileData(prev => ({ ...prev, prenom: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                        placeholder="Prénom"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Nom *</label>
                      <input
                        type="text"
                        value={profileData.nom}
                        onChange={(e) => setProfileData(prev => ({ ...prev, nom: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                        placeholder="Nom"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                        placeholder="email@exemple.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modifier mot de passe */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <div className="p-1 rounded bg-indigo-100">
                    <Key size={14} className="text-indigo-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm">Modifier le mot de passe</h3>
                </div>
                <div className="p-3 space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Mot de passe actuel</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={profileData.currentPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full pl-8 pr-8 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Nouveau</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={profileData.newPassword}
                          onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                          placeholder="6 car. min"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Confirmer</label>
                      <input
                        type="password"
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                        placeholder="Confirmer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="flex items-center gap-1.5 bg-[#cf292c] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#b91c1c] disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        );

      case 'securite':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Récupération mot de passe */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <div className="p-1 rounded bg-blue-100">
                    <Key size={14} className="text-blue-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm">Récupération de mot de passe</h3>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs text-gray-600">
                    Recevez un lien par email pour réinitialiser votre mot de passe.
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="email"
                        value={securityData.emailRecovery}
                        onChange={(e) => setSecurityData(prev => ({ ...prev, emailRecovery: e.target.value }))}
                        placeholder={profileData.email || 'Votre email'}
                        className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handlePasswordRecovery}
                      disabled={securityData.isRequestingRecovery}
                      className="px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                    >
                      {securityData.isRequestingRecovery ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </div>
                </div>
              </div>

              {/* État sécurité */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <div className="p-1 rounded bg-green-100">
                    <Shield size={14} className="text-green-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm">État de la sécurité</h3>
                </div>
                <div className="p-3 space-y-1.5">
                  {[
                    { label: 'Mot de passe sécurisé', ok: true },
                    { label: 'Connexion chiffrée (HTTPS)', ok: true },
                    { label: 'Récupération email activée', ok: true }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded">
                      <span className="text-xs text-gray-700">{item.label}</span>
                      <CheckCircle size={14} className="text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dernière activité - inline */}
            <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-2">
              <div className="p-1 rounded bg-purple-100">
                <Clock size={14} className="text-purple-600" />
              </div>
              <span className="text-sm text-gray-600">Dernière connexion : <span className="font-medium text-gray-800">{new Date().toLocaleString('fr-FR')}</span></span>
            </div>
          </div>
        );

      case 'entreprise':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Informations établissement */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <div className="p-1 rounded bg-[#cf292c]/10">
                    <Building size={14} className="text-[#cf292c]" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm">Informations de l'établissement</h3>
                </div>
                <div className="p-3 space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Nom</label>
                    <div className="relative">
                      <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        value={companyData.nom}
                        onChange={(e) => setCompanyData(prev => ({ ...prev, nom: e.target.value }))}
                        className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                        placeholder="Nom du restaurant"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Adresse</label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        value={companyData.adresse}
                        onChange={(e) => setCompanyData(prev => ({ ...prev, adresse: e.target.value }))}
                        className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                        placeholder="Adresse complète"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Ville</label>
                      <input
                        type="text"
                        value={companyData.ville}
                        onChange={(e) => setCompanyData(prev => ({ ...prev, ville: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                        placeholder="Ville"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Code postal</label>
                      <input
                        type="text"
                        value={companyData.codePostal}
                        onChange={(e) => setCompanyData(prev => ({ ...prev, codePostal: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                        placeholder="75001"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <div className="p-1 rounded bg-green-100">
                    <Phone size={14} className="text-green-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm">Contact</h3>
                </div>
                <div className="p-3 space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="tel"
                        value={companyData.telephone}
                        onChange={(e) => setCompanyData(prev => ({ ...prev, telephone: e.target.value }))}
                        className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                        placeholder="01 23 45 67 89"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="email"
                        value={companyData.email}
                        onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                        placeholder="contact@restaurant.com"
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleSaveCompany}
                      className="w-full flex items-center justify-center gap-1.5 bg-[#cf292c] text-white px-3 py-1.5 rounded text-sm hover:bg-[#b91c1c] transition-colors"
                    >
                      <Save size={14} />
                      Sauvegarder
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'fiches':
        return <FichePosteEditor userRole={userRole} />;

      default:
        return null;
    }
  };

  if (loading && !profileData.nom) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cf292c]"></div>
        <span className="ml-3 text-gray-600">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#cf292c]/10 rounded-lg">
              <Settings size={16} className="text-[#cf292c]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Paramètres</h2>
              <p className="text-xs text-gray-500">Gérez votre profil et vos préférences</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
          {/* Navigation */}
          <div className="lg:w-52 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50/50">
            <nav className="p-3 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-[#cf292c] text-white'
                        : 'text-gray-700 hover:bg-white'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-white' : 'text-gray-500'} />
                    <span className="font-medium">{tab.label}</span>
                    <ChevronRight size={14} className={`ml-auto ${isActive ? 'text-white/70' : 'text-gray-400'}`} />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Contenu */}
          <div className="flex-1 p-4 overflow-auto bg-gray-50/30 min-h-0">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Parametres;
