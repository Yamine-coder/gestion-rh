import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  UserIcon,
  LockClosedIcon,
  ArrowLeftOnRectangleIcon,
  CalendarIcon,
  BriefcaseIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import BottomNav from '../components/BottomNav';

// Styles d'animation personnalisés pour les modals et toasts
const customStyles = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-1rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

// Injection des styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = customStyles;
  document.head.appendChild(styleSheet);
}

const ProfilEmploye = () => {
  const navigate = useNavigate();
  const [employe, setEmploye] = useState({});
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmMotDePasse, setConfirmMotDePasse] = useState('');
  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [isLoading, setIsLoading] = useState(false); // password change loading
  const [profilLoading, setProfilLoading] = useState(true); // initial profile loading
  const { theme, toggleTheme, setTheme } = useContext(require('../context/ThemeContext').ThemeContext);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false); // for better loading states
  const location = useLocation();

  // Initialiser le thème depuis paramètre URL (?theme=dark)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paramTheme = params.get('theme');
    if (paramTheme) setTheme(paramTheme.toLowerCase()==='dark' ? 'dark':'light');
  }, [location.search, setTheme]);

  const token = localStorage.getItem('token');

  // Auto-fermeture des messages après 5 secondes
  useEffect(() => {
    if (erreur) {
      const timer = setTimeout(() => setErreur(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [erreur]);

  useEffect(() => {
    if (succes) {
      const timer = setTimeout(() => setSucces(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [succes]);

  // Calculateur de force du mot de passe
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  const getPasswordStrengthColor = (strength) => {
    if (strength < 30) return 'bg-red-500';
    if (strength < 60) return 'bg-yellow-500';
    if (strength < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (strength) => {
    if (strength < 30) return 'Faible';
    if (strength < 60) return 'Moyen';
    if (strength < 80) return 'Bon';
    return 'Très sûr';
  };

  // Charger les informations de l'employé
  useEffect(() => {
    const fetchProfil = async () => {
      setProfilLoading(true);
      try {
        const res = await axios.get('http://localhost:5000/user/profil', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmploye(res.data);
      } catch (err) {
        console.error('Erreur chargement profil:', err);
        setErreur('Impossible de charger votre profil');
      } finally {
        setProfilLoading(false);
      }
    };

    fetchProfil();
  }, [token]);

  // Fonction de déconnexion
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('prenom');
    navigate('/');
    window.location.reload();
  };

  // Changement de mot de passe avec UX améliorée
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErreur('');
    setSucces('');

    // Validation avec messages spécifiques
    if (!ancienMotDePasse.trim()) {
      setErreur('Veuillez saisir votre mot de passe actuel');
      return;
    }

    if (nouveauMotDePasse.length < 8) {
      setErreur('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (nouveauMotDePasse !== confirmMotDePasse) {
      setErreur('La confirmation ne correspond pas au nouveau mot de passe');
      return;
    }

    if (nouveauMotDePasse === ancienMotDePasse) {
      setErreur('Le nouveau mot de passe doit être différent de l\'ancien');
      return;
    }

    setIsLoading(true);
    setIsSubmitting(true);

    try {
      await axios.put('http://localhost:5000/user/change-password', {
        ancienMotDePasse,
        nouveauMotDePasse
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSucces('🎉 Mot de passe modifié avec succès ! Votre compte est désormais plus sécurisé.');
      
      // Attendre un peu avant de fermer le modal pour que l'utilisateur voie le succès
      setTimeout(() => {
        setShowChangePassword(false);
        setNouveauMotDePasse('');
        setConfirmMotDePasse('');
        setAncienMotDePasse('');
        setPasswordStrength(0);
      }, 1500);
      
    } catch (err) {
      const errorMessage = err.response?.data?.error;
      if (errorMessage?.includes('incorrect')) {
        setErreur('Le mot de passe actuel est incorrect');
      } else if (errorMessage?.includes('format')) {
        setErreur('Le nouveau mot de passe ne respecte pas le format requis');
      } else {
        setErreur('Une erreur est survenue lors de la modification. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non renseigné';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Calcul du score de complétion du profil
  const profileFields = [employe.prenom, employe.nom, employe.email, employe.telephone, employe.categorie, employe.dateEmbauche];
  const filledFields = profileFields.filter(field => field && String(field).trim() !== '').length;
  const completionScore = Math.round((filledFields / profileFields.length) * 100);

  // Fonction pour afficher le statut des champs
  const getFieldStatus = (value) => {
    if (!value || String(value).trim() === '') return 'incomplete';
    return 'complete';
  };

  // Skeleton loader for main profile header
  const HeaderSkeleton = () => (
    <div className="animate-pulse flex gap-6">
      <div className="w-24 h-24 rounded-2xl bg-slate-200" />
      <div className="flex-1 space-y-4 pt-2">
        <div className="h-6 w-1/3 bg-slate-200 rounded" />
        <div className="h-4 w-1/2 bg-slate-200 rounded" />
        <div className="h-3 w-full bg-slate-200 rounded" />
      </div>
    </div>
  );

  const FieldSkeleton = () => (
    <div className="animate-pulse flex flex-col sm:flex-row gap-2 sm:gap-4 p-3">
      <div className="h-3 w-24 bg-slate-200 rounded" />
      <div className="flex-1 h-3 bg-slate-200 rounded" />
    </div>
  );

  const Badge = ({ children, variant = 'default' }) => {
    const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide';
    const variants = {
      default: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      warning: 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
      success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
      accent: 'bg-primary-50 text-primary-700 dark:bg-primary-800/40 dark:text-primary-200'
    };
    return <span className={`${base} ${variants[variant]}`}>{children}</span>;
  };

  const Card = ({ title, icon: Icon, children, actions }) => (
    <div className="group rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-colors overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/70 bg-white/80 dark:bg-slate-800/70">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium text-sm">
          {Icon && <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
          <span className="tracking-wide">{title}</span>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-5 sm:p-6 text-slate-800 dark:text-slate-200">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-900 pb-28 lg:pt-14 relative transition-colors">

      {/* Main container */}
  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
          {/* Left column (summary) */}
          <div className="w-full lg:w-72 xl:w-80 space-y-6 lg:sticky lg:top-6 self-start">
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-sm p-6 relative transition-colors">
              <button
                onClick={toggleTheme}
                className="group absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50/80 dark:bg-slate-700/50 border border-slate-200/70 dark:border-slate-600/50 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/60"
                aria-label="Basculer le thème"
                title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                <div className="relative">
                  {theme === 'dark' ? (
                    <SunIcon className="w-5 h-5 transform group-hover:rotate-12 transition-transform duration-200" />
                  ) : (
                    <MoonIcon className="w-5 h-5 transform group-hover:-rotate-12 transition-transform duration-200" />
                  )}
                </div>
              </button>
              {profilLoading ? (
                <HeaderSkeleton />
              ) : (
                <>
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-3xl font-semibold shadow-sm ring-2 ring-slate-200 dark:ring-slate-600">
                        {(employe.prenom?.[0] || '?')}{(employe.nom?.[0] || '')}
                      </div>
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-white dark:bg-slate-800 shadow ring-1 ring-slate-200 dark:ring-slate-600 px-2 py-1 text-[10px] font-medium flex items-center gap-1 text-slate-600 dark:text-slate-300">{completionScore === 100 ? (<><CheckCircleIcon className="w-3 h-3 text-emerald-500" />100%</>) : (<>{completionScore}%</>)}</div>
                    </div>
                    <div className="space-y-1 flex-1">
                      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 leading-snug tracking-tight">
                        {employe.prenom} {employe.nom}
                      </h1>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {employe.categorie && <Badge accent>{employe.categorie}</Badge>}
                        {completionScore < 80 && <Badge variant="warning">Profil incomplet</Badge>}
                        {completionScore === 100 && <Badge variant="success">Complet</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <span>Complétion du profil</span>
                      <span>{completionScore}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary-600 dark:bg-primary-500 transition-all duration-500" style={{ width: `${completionScore}%` }} />
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <BriefcaseIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span>{employe.categorie || 'Poste non défini'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <CalendarIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span>Depuis {formatDate(employe.dateEmbauche)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick actions removed to avoid duplication with dedicated cards */}
          </div>

          {/* Right column (content) */}
          <div className="flex-1 space-y-10">
            <Card title="Informations personnelles" icon={UserIcon}>
              {profilLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <FieldSkeleton key={i} />)}
                </div>
              ) : (
                <dl className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {[
                    { label: 'Email', value: employe.email || '—', field: 'email' },
                    { label: 'Téléphone', value: employe.telephone || 'Non renseigné', field: 'telephone' },
                    { label: 'Poste', value: employe.categorie || '—', field: 'categorie' },
                    { label: "Date d'embauche", value: formatDate(employe.dateEmbauche), field: 'dateEmbauche' }
                  ].map((item) => (
                    <div key={item.label} className="py-4 first:pt-0 last:pb-0 grid grid-cols-12 gap-4 items-start">
                      <dt className="col-span-4 md:col-span-3 text-[10px] uppercase tracking-wide font-medium text-slate-500 dark:text-slate-400 pt-1">
                        {item.label}
                      </dt>
                      <dd className="col-span-8 md:col-span-9 flex items-center gap-3 min-w-0">
                        <span className="text-sm font-normal text-slate-800 dark:text-slate-200 break-all flex-1">{item.value}</span>
                        {getFieldStatus(employe[item.field]) === 'complete' ? (
                          <Badge variant="success"><CheckCircleIcon className="w-3.5 h-3.5" /> OK</Badge>
                        ) : (
                          <Badge variant="warning"><ExclamationTriangleIcon className="w-3.5 h-3.5" /> Manquant</Badge>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
              <Card title="Sécurité" icon={LockClosedIcon}>
                <div className="space-y-4">
                  <div className="group flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                       onClick={() => setShowChangePassword(true)}>
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-all">
                      <LockClosedIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-primary-900 dark:group-hover:text-primary-100 transition-colors">
                        Changer le mot de passe
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Protégez votre compte avec un nouveau mot de passe sécurisé.
                      </p>
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 group-hover:bg-primary-100 dark:group-hover:bg-primary-800/30 transition-colors">
                          <PencilIcon className="w-3.5 h-3.5" /> 
                          Modifier
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-slate-500 dark:text-slate-400 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                    💡 <span className="font-medium">Conseil :</span> Utilisez un mot de passe d'au moins 8 caractères avec des lettres, chiffres et symboles.
                  </div>
                </div>
              </Card>

              <Card title="Session" icon={ArrowLeftOnRectangleIcon}>
                <div className="space-y-4">
                  <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 mt-0.5">
                        🔐
                      </div>
                      <div>
                        <p className="font-medium mb-1">Sécurité de session</p>
                        <p className="text-xs opacity-75">
                          Pour votre sécurité, déconnectez-vous toujours après utilisation, surtout sur un appareil partagé.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="group w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500/60 transition-all duration-200 hover:shadow-md"
                  >
                    <ArrowLeftOnRectangleIcon className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /> 
                    Se déconnecter
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Toast messages avec animations améliorées */}
    <div className="fixed top-4 inset-x-0 flex flex-col items-center gap-2 px-4 z-50 pointer-events-none">
        {erreur && (
      <div className="w-full max-w-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-800 dark:text-red-200 rounded-xl shadow-lg px-4 py-3 text-sm flex items-start gap-3 animate-[slideDown_0.3s_ease-out] backdrop-blur-sm pointer-events-auto">
            <ExclamationTriangleIcon className="w-5 h-5 mt-0.5 text-red-500" />
            <div className="flex-1">
              <span className="font-medium">Erreur</span>
              <p className="mt-0.5 opacity-90">{erreur}</p>
            </div>
            <button 
              onClick={() => setErreur('')} 
              className="opacity-60 hover:opacity-100 text-xs p-1 rounded transition-opacity hover:bg-red-100 dark:hover:bg-red-800/30"
              aria-label="Fermer le message"
            >
              ✕
            </button>
          </div>
        )}
        {succes && (
      <div className="w-full max-w-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-200 rounded-xl shadow-lg px-4 py-3 text-sm flex items-start gap-3 animate-[slideDown_0.3s_ease-out] backdrop-blur-sm pointer-events-auto">
            <CheckCircleIcon className="w-5 h-5 mt-0.5 text-emerald-500" />
            <div className="flex-1">
              <span className="font-medium">Succès</span>
              <p className="mt-0.5 opacity-90">{succes}</p>
            </div>
            <button 
              onClick={() => setSucces('')} 
              className="opacity-60 hover:opacity-100 text-xs p-1 rounded transition-opacity hover:bg-emerald-100 dark:hover:bg-emerald-800/30"
              aria-label="Fermer le message"
            >
              ✕
            </button>
          </div>
        )}
      </div>

  {/* Modal changement mot de passe amélioré */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 sm:mx-0 border border-slate-200 dark:border-slate-700 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                <LockClosedIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Changer le mot de passe</h3>
            </div>
            
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  value={ancienMotDePasse}
                  onChange={(e) => setAncienMotDePasse(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500 dark:focus:border-primary-400 transition-colors"
                  placeholder="Saisissez votre mot de passe actuel"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={nouveauMotDePasse}
                  onChange={(e) => {
                    setNouveauMotDePasse(e.target.value);
                    setPasswordStrength(calculatePasswordStrength(e.target.value));
                  }}
                  className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500 dark:focus:border-primary-400 transition-colors"
                  placeholder="Saisissez un nouveau mot de passe"
                  required
                />
                {nouveauMotDePasse && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Force du mot de passe</span>
                      <span className={`font-medium ${passwordStrength < 60 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {getPasswordStrengthText(passwordStrength)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`} 
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmMotDePasse}
                  onChange={(e) => setConfirmMotDePasse(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500 dark:focus:border-primary-400 transition-colors"
                  placeholder="Confirmez le nouveau mot de passe"
                  required
                />
                {confirmMotDePasse && nouveauMotDePasse && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {confirmMotDePasse === nouveauMotDePasse ? (
                      <>
                        <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Les mots de passe correspondent</span>
                      </>
                    ) : (
                      <>
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-600 dark:text-amber-400">Les mots de passe ne correspondent pas</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setNouveauMotDePasse('');
                    setConfirmMotDePasse('');
                    setAncienMotDePasse('');
                    setPasswordStrength(0);
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/60"
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isSubmitting || !ancienMotDePasse || !nouveauMotDePasse || !confirmMotDePasse || nouveauMotDePasse !== confirmMotDePasse}
                  className="flex-1 px-4 py-3 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/60 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Modification...
                    </>
                  ) : (
                    'Modifier'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

  {/* Modal confirmation déconnexion amélioré */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 sm:mx-0 border border-slate-200 dark:border-slate-700 animate-[scaleIn_0.2s_ease-out]">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ArrowLeftOnRectangleIcon className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">
                Confirmer la déconnexion
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Vous allez être déconnecté de votre session. Vous devrez vous reconnecter pour accéder à votre compte.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/60"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-3 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/60 flex items-center justify-center gap-2"
                >
                  <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                  Se déconnecter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

  <BottomNav />
    </div>
  );
};

export default ProfilEmploye;
