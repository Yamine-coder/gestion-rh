import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
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
  FileText,
  Bell,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Star,
  Send,
  Calendar,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  Users,
  ClipboardCheck
} from 'lucide-react';
import FichePosteEditor from './FichePosteEditor';

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

  // États pour les alertes avis (ancien - gardé pour compatibilité)
  const [alertConfig, setAlertConfig] = useState({
    enabled: true,
    recipients: [],
    alertThreshold: 3,
    sendDailyReport: true
  });
  
  // États pour la config centralisée des notifications
  const [notifConfig, setNotifConfig] = useState({});
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [selectedNotifType, setSelectedNotifType] = useState('conges');

  // Chargement des données initiales
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        
        const profileRes = await api.get(`/auth/profile`);
        
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

        // Charger la config centralisée des notifications (admin seulement)
        if (profileRes.data.role === 'admin') {
          try {
            const notifRes = await api.get(`/api/notifications-config/config`);
            setNotifConfig(notifRes.data);
            // Mettre aussi à jour alertConfig pour compatibilité
            if (notifRes.data.avisGoogle) {
              setAlertConfig(notifRes.data.avisGoogle);
            }
          } catch (e) {
            console.log('Config notifications non disponible');
          }
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

  // Fonctions de gestion des alertes
  // Fonctions de gestion des notifications (système centralisé)
  const handleToggleNotifType = async (type, enabled) => {
    try {
      const res = await api.patch(`/api/notifications-config/config/${type}/toggle`, { enabled });
      if (res.data.config) {
        setNotifConfig(res.data.config);
      }
    } catch (err) {
      toast.error('Erreur de mise à jour');
    }
  };

  const handleAddRecipient = async (type = selectedNotifType) => {
    if (!newRecipientEmail || !validateEmail(newRecipientEmail)) {
      toast.error('Email valide requis');
      return;
    }
    try {
      setAlertsLoading(true);
      const res = await api.post(`/api/notifications-config/recipients/${type}`, {
        email: newRecipientEmail,
        name: newRecipientName
      });
      if (res.data.config) {
        setNotifConfig(res.data.config);
        setNewRecipientEmail('');
        setNewRecipientName('');
        toast.success('Destinataire ajouté');
      }
    } catch (err) {
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleRemoveRecipient = async (type, email) => {
    try {
      setAlertsLoading(true);
      const res = await api.delete(`/api/notifications-config/recipients/${type}/${encodeURIComponent(email)}`);
      if (res.data.config) {
        setNotifConfig(res.data.config);
        toast.success('Destinataire supprimé');
      }
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleToggleRecipient = async (type, email, active) => {
    try {
      const res = await api.patch(`/api/notifications-config/recipients/${type}/${encodeURIComponent(email)}`, { active });
      if (res.data.config) {
        setNotifConfig(res.data.config);
      }
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const handleTestAlert = async () => {
    try {
      setAlertsLoading(true);
      const res = await api.post(`/api/avis/test-alert`);
      toast.success(res.data?.message || 'Email de test envoyé !');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur lors de l\'envoi';
      toast.error(msg);
    } finally {
      setAlertsLoading(false);
    }
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Labels et icônes pour les types de notifications (charte unifiée #cf292c)
  const notifTypes = {
    conges: { label: 'Demandes de congés', Icon: Calendar },
    avisGoogle: { label: 'Avis Google négatifs', Icon: Star },
    anomalies: { label: 'Anomalies de pointage', Icon: AlertTriangle },
    remplacements: { label: 'Demandes de remplacement', Icon: RefreshCw }
  };

  const handleSaveProfile = async () => {
    // Validations synchrones avant le try
    if (!profileData.nom.trim() || !profileData.prenom.trim()) {
      toast.error('Nom et prénom obligatoires');
      return;
    }

    if (!validateEmail(profileData.email)) {
      toast.error('Email invalide');;
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

      const updateData = {
        nom: profileData.nom.trim(),
        prenom: profileData.prenom.trim(),
        email: profileData.email.trim()
      };

      if (profileData.newPassword && profileData.currentPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      const response = await api.put(`/auth/profile`, updateData);

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

      const response = await api.post(`/auth/forgot-password`, { email });
      
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
    { id: 'fiches', label: 'Fiches de poste', icon: FileText },
    { id: 'alertes', label: 'Notifications Email', icon: Mail, adminOnly: true }
  ].filter(tab => !tab.adminOnly || userRole === 'admin');

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

      case 'alertes':
        const currentTypeConfig = notifConfig[selectedNotifType] || { enabled: false, recipients: [] };
        const currentRecipients = currentTypeConfig.recipients || [];
        const SelectedIcon = notifTypes[selectedNotifType]?.Icon;
        
        return (
          <div className="space-y-4">
            {/* Sélection du type de notification */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                <div className="p-1 rounded bg-[#cf292c]/10">
                  <Mail size={14} className="text-[#cf292c]" />
                </div>
                <h3 className="font-medium text-gray-900 text-sm">Notifications par email</h3>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(notifTypes).map(([type, info]) => {
                    const TypeIcon = info.Icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedNotifType(type)}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border-2 transition-all ${
                          selectedNotifType === type
                            ? 'border-[#cf292c] bg-[#cf292c]/5'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${selectedNotifType === type ? 'bg-[#cf292c]/10' : 'bg-gray-100'}`}>
                          <TypeIcon size={16} className={selectedNotifType === type ? 'text-[#cf292c]' : 'text-gray-500'} />
                        </div>
                        <div className="text-left flex-1">
                          <p className={`text-sm font-medium ${selectedNotifType === type ? 'text-[#cf292c]' : 'text-gray-800'}`}>
                            {info.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            {notifConfig[type]?.recipients?.length || 0} destinataire(s)
                          </p>
                        </div>
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          notifConfig[type]?.enabled ? 'bg-[#cf292c]' : 'bg-gray-300'
                        }`}></div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Configuration du type sélectionné */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#cf292c]/10">
                    {SelectedIcon && <SelectedIcon size={14} className="text-[#cf292c]" />}
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm">{notifTypes[selectedNotifType]?.label}</h3>
                </div>
                <button
                  onClick={() => handleToggleNotifType(selectedNotifType, !currentTypeConfig.enabled)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    currentTypeConfig.enabled 
                      ? 'bg-[#cf292c]/10 text-[#cf292c]' 
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {currentTypeConfig.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {currentTypeConfig.enabled ? 'Activé' : 'Désactivé'}
                </button>
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-600 mb-3">
                  {selectedNotifType === 'conges' && 'Recevez un email lors de chaque nouvelle demande de congé.'}
                  {selectedNotifType === 'avisGoogle' && `Recevez un email immédiat quand un avis ≤${currentTypeConfig.alertThreshold || 3}⭐ est publié sur Google.`}
                  {selectedNotifType === 'anomalies' && 'Recevez des alertes pour les anomalies de pointage détectées.'}
                  {selectedNotifType === 'remplacements' && 'Recevez un email lors des demandes et candidatures de remplacement.'}
                </p>
                
                {/* Options spécifiques aux CONGÉS */}
                {selectedNotifType === 'conges' && (
                  <div className="space-y-2 mb-3 pb-3 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-700 mb-2">Notifications à envoyer :</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentTypeConfig.notifyOnNew !== false}
                        onChange={async (e) => {
                          try {
                            const res = await api.put(`/api/notifications-config/config/${selectedNotifType}`, { notifyOnNew: e.target.checked });
                            if (res.data.config) setNotifConfig(res.data.config);
                          } catch (err) { toast.error('Erreur'); }
                        }}
                        className="w-4 h-4 rounded border-gray-300 accent-[#cf292c] focus:ring-[#cf292c]"
                      />
                      <span className="text-sm text-gray-700">Nouvelle demande de congé</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentTypeConfig.notifyOnStatus !== false}
                        onChange={async (e) => {
                          try {
                            const res = await api.put(`/api/notifications-config/config/${selectedNotifType}`, { notifyOnStatus: e.target.checked });
                            if (res.data.config) setNotifConfig(res.data.config);
                          } catch (err) { toast.error('Erreur'); }
                        }}
                        className="w-4 h-4 rounded border-gray-300 accent-[#cf292c] focus:ring-[#cf292c]"
                      />
                      <span className="text-sm text-gray-700">Changement de statut (validé/refusé)</span>
                    </label>
                  </div>
                )}

                {/* Options spécifiques aux AVIS GOOGLE */}
                {selectedNotifType === 'avisGoogle' && (
                  <div className="space-y-3 mb-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-gray-600">Seuil d'alerte :</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map(n => (
                          <button
                            key={n}
                            onClick={async () => {
                              try {
                                const res = await api.put(`/api/notifications-config/config/${selectedNotifType}`, { alertThreshold: n });
                                if (res.data.config) setNotifConfig(res.data.config);
                              } catch (err) { toast.error('Erreur'); }
                            }}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              (currentTypeConfig.alertThreshold || 3) === n
                                ? 'bg-[#cf292c] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            ≤{n}⭐
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentTypeConfig.sendDailyReport !== false}
                        onChange={async (e) => {
                          try {
                            const res = await api.put(`/api/notifications-config/config/${selectedNotifType}`, { sendDailyReport: e.target.checked });
                            if (res.data.config) setNotifConfig(res.data.config);
                          } catch (err) { toast.error('Erreur'); }
                        }}
                        className="w-4 h-4 rounded border-gray-300 accent-[#cf292c] focus:ring-[#cf292c]"
                      />
                      <span className="text-sm text-gray-700">Rapport quotidien (9h)</span>
                    </label>
                  </div>
                )}

                {/* Options spécifiques aux ANOMALIES */}
                {selectedNotifType === 'anomalies' && (
                  <div className="space-y-3 mb-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-gray-600">Gravité minimum :</label>
                      <div className="flex items-center gap-1">
                        {['basse', 'moyenne', 'haute'].map(g => (
                          <button
                            key={g}
                            onClick={async () => {
                              try {
                                const res = await api.put(`/api/notifications-config/config/${selectedNotifType}`, { graviteMin: g });
                                if (res.data.config) setNotifConfig(res.data.config);
                              } catch (err) { toast.error('Erreur'); }
                            }}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              (currentTypeConfig.graviteMin || 'moyenne') === g
                                ? 'bg-[#cf292c] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {g.charAt(0).toUpperCase() + g.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentTypeConfig.alertUrgent !== false}
                        onChange={async (e) => {
                          try {
                            const res = await api.put(`/api/notifications-config/config/${selectedNotifType}`, { alertUrgent: e.target.checked });
                            if (res.data.config) setNotifConfig(res.data.config);
                          } catch (err) { toast.error('Erreur'); }
                        }}
                        className="w-4 h-4 rounded border-gray-300 accent-[#cf292c] focus:ring-[#cf292c]"
                      />
                      <span className="text-sm text-gray-700">Alerte immédiate (gravité haute)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentTypeConfig.sendDailyRecap !== false}
                        onChange={async (e) => {
                          try {
                            const res = await api.put(`/api/notifications-config/config/${selectedNotifType}`, { sendDailyRecap: e.target.checked });
                            if (res.data.config) setNotifConfig(res.data.config);
                          } catch (err) { toast.error('Erreur'); }
                        }}
                        className="w-4 h-4 rounded border-gray-300 accent-[#cf292c] focus:ring-[#cf292c]"
                      />
                      <span className="text-sm text-gray-700">Récapitulatif quotidien (8h)</span>
                    </label>
                  </div>
                )}

                {/* Options spécifiques aux REMPLACEMENTS */}
                {selectedNotifType === 'remplacements' && (
                  <div className="space-y-2 mb-3 pb-3 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-700 mb-2">Notifications à envoyer :</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentTypeConfig.notifyOnDemande !== false}
                        onChange={async (e) => {
                          try {
                            const res = await api.put(`/api/notifications-config/config/${selectedNotifType}`, { notifyOnDemande: e.target.checked });
                            if (res.data.config) setNotifConfig(res.data.config);
                          } catch (err) { toast.error('Erreur'); }
                        }}
                        className="w-4 h-4 rounded border-gray-300 accent-[#cf292c] focus:ring-[#cf292c]"
                      />
                      <span className="text-sm text-gray-700">Nouvelle demande de remplacement</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentTypeConfig.notifyOnCandidature !== false}
                        onChange={async (e) => {
                          try {
                            const res = await api.put(`/api/notifications-config/config/${selectedNotifType}`, { notifyOnCandidature: e.target.checked });
                            if (res.data.config) setNotifConfig(res.data.config);
                          } catch (err) { toast.error('Erreur'); }
                        }}
                        className="w-4 h-4 rounded border-gray-300 accent-[#cf292c] focus:ring-[#cf292c]"
                      />
                      <span className="text-sm text-gray-700">Nouvelle candidature reçue</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentTypeConfig.notifyOnValidation !== false}
                        onChange={async (e) => {
                          try {
                            const res = await api.put(`/api/notifications-config/config/${selectedNotifType}`, { notifyOnValidation: e.target.checked });
                            if (res.data.config) setNotifConfig(res.data.config);
                          } catch (err) { toast.error('Erreur'); }
                        }}
                        className="w-4 h-4 rounded border-gray-300 accent-[#cf292c] focus:ring-[#cf292c]"
                      />
                      <span className="text-sm text-gray-700">Validation d'un remplacement</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Destinataires */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                <div className="p-1 rounded bg-blue-100">
                  <Mail size={14} className="text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900 text-sm">
                  Destinataires - {notifTypes[selectedNotifType]?.label}
                </h3>
              </div>
              <div className="p-3 space-y-3">
                {/* Liste des destinataires */}
                {currentRecipients.length > 0 ? (
                  <div className="space-y-2">
                    {currentRecipients.map((recipient, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            recipient.active ? 'bg-[#cf292c]' : 'bg-gray-400'
                          }`}>
                            {(recipient.name || recipient.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{recipient.name || 'Sans nom'}</p>
                            <p className="text-xs text-gray-500">{recipient.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleRecipient(selectedNotifType, recipient.email, !recipient.active)}
                            className={`p-1.5 rounded transition-colors ${
                              recipient.active 
                                ? 'text-[#cf292c] hover:bg-[#cf292c]/10' 
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={recipient.active ? 'Désactiver' : 'Activer'}
                          >
                            {recipient.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => handleRemoveRecipient(selectedNotifType, recipient.email)}
                            className="p-1.5 text-gray-400 hover:text-[#cf292c] hover:bg-[#cf292c]/10 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500 mb-1">Aucun destinataire configuré</p>
                    <p className="text-xs text-gray-400">Les notifications iront aux admins par défaut</p>
                  </div>
                )}

                {/* Ajouter un destinataire */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-2">Ajouter un destinataire</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRecipientName}
                      onChange={(e) => setNewRecipientName(e.target.value)}
                      placeholder="Nom"
                      className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                    />
                    <input
                      type="email"
                      value={newRecipientEmail}
                      onChange={(e) => setNewRecipientEmail(e.target.value)}
                      placeholder="email@exemple.com"
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#cf292c] focus:border-transparent"
                    />
                    <button
                      onClick={() => handleAddRecipient(selectedNotifType)}
                      disabled={!newRecipientEmail || alertsLoading}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#cf292c] text-white rounded text-sm hover:bg-[#b91c1c] transition-colors disabled:opacity-50"
                    >
                      <Plus size={14} />
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Test d'envoi - uniquement pour avis Google */}
            {selectedNotifType === 'avisGoogle' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <div className="p-1 rounded bg-[#cf292c]/10">
                    <Send size={14} className="text-[#cf292c]" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm">Tester les alertes</h3>
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-600 mb-3">
                    Envoyez un email de test pour vérifier que tout fonctionne.
                  </p>
                  <button
                    onClick={handleTestAlert}
                    disabled={alertsLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#cf292c] text-white rounded text-sm hover:bg-[#b91c1c] transition-colors disabled:opacity-50"
                  >
                    <Send size={14} />
                    {alertsLoading ? 'Envoi...' : 'Envoyer un test'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );

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
