import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
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
  MoonIcon,
  CameraIcon,
  TrashIcon,
  EnvelopeIcon,
  CreditCardIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  TicketIcon,
  FolderIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import BottomNav from '../components/BottomNav';
import UploadPhotoProfil from '../components/UploadPhotoProfil';
import { getToken, isTokenValid, setupTokenExpirationCheck, clearToken } from '../utils/tokenManager';
import API_URL from '../config/api';

// ============================================
// LISTE DES PAYS AVEC INDICATIFS (triés par usage fréquent)
// ============================================
const COUNTRY_CODES = [
  // Europe de l'Ouest
  { code: 'FR', flag: '🇫🇷', dial: '+33', name: 'France' },
  { code: 'BE', flag: '🇧🇪', dial: '+32', name: 'Belgique' },
  { code: 'CH', flag: '🇨🇭', dial: '+41', name: 'Suisse' },
  { code: 'LU', flag: '🇱🇺', dial: '+352', name: 'Luxembourg' },
  { code: 'DE', flag: '🇩🇪', dial: '+49', name: 'Allemagne' },
  { code: 'ES', flag: '🇪🇸', dial: '+34', name: 'Espagne' },
  { code: 'IT', flag: '🇮🇹', dial: '+39', name: 'Italie' },
  { code: 'PT', flag: '🇵🇹', dial: '+351', name: 'Portugal' },
  { code: 'GB', flag: '🇬🇧', dial: '+44', name: 'Royaume-Uni' },
  { code: 'NL', flag: '🇳🇱', dial: '+31', name: 'Pays-Bas' },
  // Afrique du Nord
  { code: 'MA', flag: '🇲🇦', dial: '+212', name: 'Maroc' },
  { code: 'DZ', flag: '🇩🇿', dial: '+213', name: 'Algérie' },
  { code: 'TN', flag: '🇹🇳', dial: '+216', name: 'Tunisie' },
  { code: 'EG', flag: '🇪🇬', dial: '+20', name: 'Égypte' },
  { code: 'LY', flag: '🇱🇾', dial: '+218', name: 'Libye' },
  // Afrique Sub-saharienne
  { code: 'SN', flag: '🇸🇳', dial: '+221', name: 'Sénégal' },
  { code: 'CI', flag: '🇨🇮', dial: '+225', name: 'Côte d\'Ivoire' },
  { code: 'ML', flag: '🇲🇱', dial: '+223', name: 'Mali' },
  { code: 'CM', flag: '🇨🇲', dial: '+237', name: 'Cameroun' },
  { code: 'CD', flag: '🇨🇩', dial: '+243', name: 'RD Congo' },
  { code: 'MG', flag: '🇲🇬', dial: '+261', name: 'Madagascar' },
  { code: 'MU', flag: '🇲🇺', dial: '+230', name: 'Maurice' },
  // Asie du Sud
  { code: 'BD', flag: '🇧🇩', dial: '+880', name: 'Bangladesh' },
  { code: 'IN', flag: '🇮🇳', dial: '+91', name: 'Inde' },
  { code: 'PK', flag: '🇵🇰', dial: '+92', name: 'Pakistan' },
  { code: 'LK', flag: '🇱🇰', dial: '+94', name: 'Sri Lanka' },
  { code: 'NP', flag: '🇳🇵', dial: '+977', name: 'Népal' },
  // Asie du Sud-Est
  { code: 'PH', flag: '🇵🇭', dial: '+63', name: 'Philippines' },
  { code: 'VN', flag: '🇻🇳', dial: '+84', name: 'Vietnam' },
  { code: 'TH', flag: '🇹🇭', dial: '+66', name: 'Thaïlande' },
  { code: 'MY', flag: '🇲🇾', dial: '+60', name: 'Malaisie' },
  { code: 'ID', flag: '🇮🇩', dial: '+62', name: 'Indonésie' },
  // Moyen-Orient
  { code: 'TR', flag: '🇹🇷', dial: '+90', name: 'Turquie' },
  { code: 'SA', flag: '🇸🇦', dial: '+966', name: 'Arabie Saoudite' },
  { code: 'AE', flag: '🇦🇪', dial: '+971', name: 'Émirats Arabes' },
  { code: 'QA', flag: '🇶🇦', dial: '+974', name: 'Qatar' },
  { code: 'LB', flag: '🇱🇧', dial: '+961', name: 'Liban' },
  // Europe de l'Est
  { code: 'PL', flag: '🇵🇱', dial: '+48', name: 'Pologne' },
  { code: 'RO', flag: '🇷🇴', dial: '+40', name: 'Roumanie' },
  { code: 'RU', flag: '🇷🇺', dial: '+7', name: 'Russie' },
  { code: 'UA', flag: '🇺🇦', dial: '+380', name: 'Ukraine' },
  // Amériques
  { code: 'US', flag: '🇺🇸', dial: '+1', name: 'États-Unis' },
  { code: 'CA', flag: '🇨🇦', dial: '+1', name: 'Canada' },
  { code: 'BR', flag: '🇧🇷', dial: '+55', name: 'Brésil' },
  { code: 'MX', flag: '🇲🇽', dial: '+52', name: 'Mexique' },
  // Asie de l'Est
  { code: 'CN', flag: '🇨🇳', dial: '+86', name: 'Chine' },
  { code: 'JP', flag: '🇯🇵', dial: '+81', name: 'Japon' },
  { code: 'KR', flag: '🇰🇷', dial: '+82', name: 'Corée du Sud' },
];

// Fonction pour formater l'affichage du téléphone
const formatTelephone = (phone) => {
  if (!phone) return '';
  return phone; // Déjà formaté avec espaces
};

// ============================================
// COMPOSANT FORMULAIRE COORDONNÉES ISOLÉ
// Isolé du parent pour éviter re-renders
// ============================================
// ============================================
// COMPOSANT FORMULAIRE TÉLÉPHONE SEUL
// ============================================
const FormulaireTelephone = ({ employe, onSave, onCancel, isLoading }) => {
  // Liste complète des indicatifs téléphoniques
  const COUNTRY_CODES = [
    { code: 'FR', flag: '🇫🇷', dial: '+33', name: 'France' },
    { code: 'DZ', flag: '🇩🇿', dial: '+213', name: 'Algérie' },
    { code: 'MA', flag: '🇲🇦', dial: '+212', name: 'Maroc' },
    { code: 'TN', flag: '🇹🇳', dial: '+216', name: 'Tunisie' },
    { code: 'BE', flag: '🇧🇪', dial: '+32', name: 'Belgique' },
    { code: 'CH', flag: '🇨🇭', dial: '+41', name: 'Suisse' },
    { code: 'CA', flag: '🇨🇦', dial: '+1', name: 'Canada' },
    { code: 'US', flag: '🇺🇸', dial: '+1', name: 'États-Unis' },
    { code: 'GB', flag: '🇬🇧', dial: '+44', name: 'Royaume-Uni' },
    { code: 'DE', flag: '🇩🇪', dial: '+49', name: 'Allemagne' },
    { code: 'ES', flag: '🇪🇸', dial: '+34', name: 'Espagne' },
    { code: 'IT', flag: '🇮🇹', dial: '+39', name: 'Italie' },
    { code: 'PT', flag: '🇵🇹', dial: '+351', name: 'Portugal' },
    { code: 'NL', flag: '🇳🇱', dial: '+31', name: 'Pays-Bas' },
    { code: 'LU', flag: '🇱🇺', dial: '+352', name: 'Luxembourg' },
    { code: 'SN', flag: '🇸🇳', dial: '+221', name: 'Sénégal' },
    { code: 'CI', flag: '🇨🇮', dial: '+225', name: 'Côte d\'Ivoire' },
    { code: 'ML', flag: '🇲🇱', dial: '+223', name: 'Mali' },
    { code: 'BF', flag: '🇧🇫', dial: '+226', name: 'Burkina Faso' },
    { code: 'NE', flag: '🇳🇪', dial: '+227', name: 'Niger' },
    { code: 'TD', flag: '🇹🇩', dial: '+235', name: 'Tchad' },
    { code: 'MR', flag: '🇲🇷', dial: '+222', name: 'Mauritanie' },
    { code: 'CM', flag: '🇨🇲', dial: '+237', name: 'Cameroun' },
    { code: 'GA', flag: '🇬🇦', dial: '+241', name: 'Gabon' },
    { code: 'CG', flag: '🇨🇬', dial: '+242', name: 'Congo' },
    { code: 'CD', flag: '🇨🇩', dial: '+243', name: 'RD Congo' },
    { code: 'BJ', flag: '🇧🇯', dial: '+229', name: 'Bénin' },
    { code: 'TG', flag: '🇹🇬', dial: '+228', name: 'Togo' },
    { code: 'GN', flag: '🇬🇳', dial: '+224', name: 'Guinée' },
    { code: 'EG', flag: '🇪🇬', dial: '+20', name: 'Égypte' },
    { code: 'LY', flag: '🇱🇾', dial: '+218', name: 'Libye' },
    { code: 'SA', flag: '🇸🇦', dial: '+966', name: 'Arabie Saoudite' },
    { code: 'AE', flag: '🇦🇪', dial: '+971', name: 'Émirats Arabes Unis' },
    { code: 'TR', flag: '🇹🇷', dial: '+90', name: 'Turquie' },
    { code: 'BD', flag: '🇧🇩', dial: '+880', name: 'Bangladesh' },
    { code: 'IN', flag: '🇮🇳', dial: '+91', name: 'Inde' },
    { code: 'PK', flag: '🇵🇰', dial: '+92', name: 'Pakistan' },
    { code: 'CN', flag: '🇨🇳', dial: '+86', name: 'Chine' },
    { code: 'JP', flag: '🇯🇵', dial: '+81', name: 'Japon' },
    { code: 'KR', flag: '🇰🇷', dial: '+82', name: 'Corée du Sud' },
    { code: 'BR', flag: '🇧🇷', dial: '+55', name: 'Brésil' },
    { code: 'MX', flag: '🇲🇽', dial: '+52', name: 'Mexique' },
    { code: 'AR', flag: '🇦🇷', dial: '+54', name: 'Argentine' },
  ];

  // Détecter l'indicatif existant
  const detectIndicatif = (tel) => {
    if (!tel) return '+33';
    for (const country of COUNTRY_CODES) {
      if (tel.startsWith(country.dial)) return country.dial;
    }
    return '+33';
  };

  const [indicatif, setIndicatif] = useState(() => detectIndicatif(employe.telephone));
  const [telephone, setTelephone] = useState(() => {
    const tel = employe.telephone || '';
    // Retirer l'indicatif détecté
    const detectedDial = detectIndicatif(tel);
    if (tel.startsWith(detectedDial)) return tel.substring(detectedDial.length).replace(/\s/g, '');
    if (tel.startsWith('0')) return tel.substring(1).replace(/\s/g, '');
    return tel.replace(/\s/g, '');
  });
  
  const [searchCountry, setSearchCountry] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [error, setError] = useState('');

  const filteredCountries = COUNTRY_CODES.filter(country => 
    country.name.toLowerCase().includes(searchCountry.toLowerCase()) ||
    country.dial.includes(searchCountry) ||
    country.code.toLowerCase().includes(searchCountry.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCountryDropdown && !event.target.closest('.country-dropdown-container')) {
        setShowCountryDropdown(false);
        setSearchCountry('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCountryDropdown]);

  const formatTelDisplay = (value) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 2) return clean;
    if (clean.length <= 4) return `${clean.slice(0, 2)} ${clean.slice(2)}`;
    if (clean.length <= 6) return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4)}`;
    if (clean.length <= 8) return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6)}`;
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 8)} ${clean.slice(8, 10)}`;
  };

  const handleTelChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setTelephone(value);
      setError('');
    }
  };

  const handleSubmit = () => {
    // Permettre de vider le téléphone (champ optionnel)
    if (telephone && telephone.length > 0 && telephone.length < 9) {
      setError('Numéro invalide (9-10 chiffres) ou laissez vide');
      return;
    }
    const telComplet = telephone ? indicatif + telephone : '';
    onSave(telComplet);
  };

  return (
    <div className="px-3 py-2.5 bg-primary-50/50 dark:bg-primary-900/10 border-l-2 border-primary-500" style={{ overflow: 'visible' }}>
      <div className="flex flex-col gap-2" style={{ overflow: 'visible' }}>
        <label className="text-xs font-medium text-primary-700 dark:text-primary-300">Téléphone</label>
        
        {/* Inputs côte à côte */}
        <div className="flex gap-2" style={{ overflow: 'visible' }}>
          {/* Sélecteur d'indicatif compact */}
          <div className="relative country-dropdown-container w-20 flex-shrink-0" style={{ overflow: 'visible' }}>
            <button
              type="button"
              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              className="w-full h-10 px-1.5 rounded-lg bg-white dark:bg-slate-700 border border-primary-300 dark:border-primary-600 hover:border-primary-400 active:border-primary-500 transition-colors flex items-center gap-1"
            >
              <span className="text-sm">{COUNTRY_CODES.find(c => c.dial === indicatif)?.flag || '🇫🇷'}</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 tabular-nums flex-1">{indicatif}</span>
              <svg className={`w-3 h-3 text-slate-400 transition-transform flex-shrink-0 ${showCountryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showCountryDropdown && (
              <div className="absolute z-[9999] mt-1 left-0 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700" style={{ top: '100%' }}>
                <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-lg sticky top-0 z-10">
                  <input
                    type="text"
                    value={searchCountry}
                    onChange={(e) => setSearchCountry(e.target.value)}
                    placeholder="Rechercher un pays..."
                    className="w-full px-3 py-1.5 text-sm rounded-md bg-slate-50 dark:bg-slate-900 border-0 focus:outline-none text-slate-700 dark:text-slate-200"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setIndicatif(country.dial);
                        setShowCountryDropdown(false);
                        setSearchCountry('');
                      }}
                      className={`w-full px-2 py-1.5 text-left flex items-center gap-2 rounded text-sm ${
                        indicatif === country.dial ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 dark:active:bg-slate-600'
                      }`}
                    >
                      <span className="text-base">{country.flag}</span>
                      <span className="flex-1 text-slate-600 dark:text-slate-300 truncate">{country.name}</span>
                      <span className="text-xs text-slate-400 tabular-nums">{country.dial}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input téléphone - largeur fixe optimale */}
          <input
            type="tel"
            value={formatTelDisplay(telephone)}
            onChange={handleTelChange}
            className={`w-44 h-10 px-3 text-sm rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border tabular-nums ${
              error ? 'border-red-400' : 'border-primary-300 dark:border-primary-600'
            } focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors`}
            placeholder="6 12 34 56 78"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <ExclamationTriangleIcon className="w-3 h-3" />
            {error}
          </p>
        )}

        {/* Boutons */}
        <div className="flex gap-2 justify-end mt-1">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
            <span>Enregistrer</span>
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT FORMULAIRE ADRESSE SEUL
// ============================================
const FormulaireAdresse = ({ employe, onSave, onCancel, isLoading }) => {
  const parseAdresse = (adresseComplete) => {
    if (!adresseComplete) return { rue: '', codePostal: '', ville: '', complement: '' };
    const lines = adresseComplete.split('\n').map(l => l.trim()).filter(l => l);
    const derniereLigne = lines[lines.length - 1] || '';
    const match = derniereLigne.match(/^(\d{5})\s+(.+)$/);
    return {
      rue: lines[0] || '',
      complement: lines.length > 2 ? lines.slice(1, -1).join('\n') : '',
      codePostal: match ? match[1] : '',
      ville: match ? match[2] : (lines.length > 1 ? lines[lines.length - 1] : '')
    };
  };

  const parsed = parseAdresse(employe.adresse);
  const [rue, setRue] = useState(parsed.rue);
  const [complement, setComplement] = useState(parsed.complement);
  const [codePostal, setCodePostal] = useState(parsed.codePostal);
  const [ville, setVille] = useState(parsed.ville);
  const [errors, setErrors] = useState({});

  const handleCodePostalChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 5) {
      setCodePostal(value);
      setErrors(prev => ({ ...prev, codePostal: null }));
    }
  };

  const handleSubmit = () => {
    // Permettre de vider l'adresse (champ optionnel)
    const isEmptying = !rue.trim() && !codePostal && !ville.trim();
    
    if (isEmptying) {
      // L'utilisateur veut supprimer son adresse
      onSave('');
      return;
    }
    
    const newErrors = {};
    if (!rue || rue.trim().length < 5) newErrors.rue = 'Adresse trop courte';
    if (!codePostal || codePostal.length !== 5) newErrors.codePostal = 'Code postal invalide';
    if (!ville || ville.trim().length < 2) newErrors.ville = 'Ville requise';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const adresseComplete = [
      rue.trim(),
      complement.trim(),
      `${codePostal} ${ville.trim()}`
    ].filter(Boolean).join('\n');
    
    onSave(adresseComplete);
  };

  return (
    <div className="px-3 py-2.5 bg-primary-50/50 dark:bg-primary-900/10 border-l-2 border-primary-500">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-primary-700 dark:text-primary-300">Adresse</label>
        
        <div className="space-y-2">
          {/* Rue */}
          <input
            type="text"
            value={rue}
            onChange={(e) => { setRue(e.target.value); setErrors(prev => ({ ...prev, rue: null })); }}
            className={`w-full h-10 px-3 text-sm rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border ${
              errors.rue ? 'border-red-400' : 'border-primary-300 dark:border-primary-600'
            } focus:ring-2 focus:ring-primary-500/50 transition-colors`}
            placeholder="Numéro et nom de rue"
            autoFocus
          />
          
          {/* Complément */}
          <input
            type="text"
            value={complement}
            onChange={(e) => setComplement(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary-500/50 transition-colors"
            placeholder="Complément (optionnel)"
          />
          
          {/* CP + Ville */}
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={codePostal}
              onChange={handleCodePostalChange}
              className={`w-24 h-10 px-3 text-sm rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border tabular-nums ${
                errors.codePostal ? 'border-red-400' : 'border-primary-300 dark:border-primary-600'
              } focus:ring-2 focus:ring-primary-500/50 transition-colors`}
              placeholder="75001"
              maxLength="5"
            />
            <input
              type="text"
              value={ville}
              onChange={(e) => { setVille(e.target.value); setErrors(prev => ({ ...prev, ville: null })); }}
              className={`flex-1 h-10 px-3 text-sm rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border ${
                errors.ville ? 'border-red-400' : 'border-primary-300 dark:border-primary-600'
              } focus:ring-2 focus:ring-primary-500/50 transition-colors`}
              placeholder="Ville"
            />
          </div>
        </div>

        {(errors.rue || errors.codePostal || errors.ville) && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <ExclamationTriangleIcon className="w-3 h-3" />
            {errors.rue || errors.codePostal || errors.ville}
          </p>
        )}

        {/* Boutons */}
        <div className="flex gap-2 justify-end mt-1">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
            <span>Enregistrer</span>
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT FORMULAIRE IDENTITÉ ISOLÉ
// ============================================
const FormulaireIdentite = ({ employe, onSave, onCancel, isLoading }) => {
  const [nom, setNom] = useState(employe.nom || '');
  const [prenom, setPrenom] = useState(employe.prenom || '');
  const [email, setEmail] = useState(employe.email || '');
  const [iban, setIban] = useState((employe.iban || '').replace(/\s/g, ''));
  const [errors, setErrors] = useState({});

  // Formatage IBAN avec espaces tous les 4 caractères
  const formatIbanDisplay = (value) => {
    const clean = value.replace(/\s/g, '').toUpperCase();
    const matches = clean.match(/.{1,4}/g);
    return matches ? matches.join(' ') : clean;
  };

  const handleIbanChange = (e) => {
    const value = e.target.value.replace(/\s/g, '').toUpperCase();
    if (value.length <= 34) { // IBAN max 34 caractères
      setIban(value);
      if (errors.iban) setErrors(prev => ({ ...prev, iban: null }));
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value.toLowerCase().trim());
    if (errors.email) setErrors(prev => ({ ...prev, email: null }));
  };

  const validate = () => {
    const newErrors = {};
    
    // Validation nom
    if (!nom || nom.trim().length < 2) {
      newErrors.nom = 'Nom trop court (min 2 caractères)';
    }
    
    // Validation prénom
    if (!prenom || prenom.trim().length < 2) {
      newErrors.prenom = 'Prénom trop court (min 2 caractères)';
    }
    
    // Validation email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Format email invalide (ex: nom@domaine.fr)';
    }
    
    // Validation IBAN
    if (iban) {
      const ibanClean = iban.replace(/\s/g, '').toUpperCase();
      // IBAN: 2 lettres pays + 2 chiffres clé + 11-30 caractères alphanumériques
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(ibanClean)) {
        newErrors.iban = 'Format IBAN invalide (ex: FR76 1234 5678 9012 3456 7890 123)';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    
    onSave({ 
      nom: nom.trim(), 
      prenom: prenom.trim(), 
      email: email.trim(), 
      iban: iban.replace(/\s/g, '') 
    });
  };

  return (
    <div className="rounded-xl bg-slate-50/50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700/50 overflow-hidden">
      <dl className="divide-y divide-slate-200/60 dark:divide-slate-700/50">
        {/* Nom */}
        <div className="px-3 sm:px-4 py-3 sm:py-3.5">
          <dt className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wide">
            Nom
          </dt>
          <dd>
            <input
              id="input-nom"
              type="text"
              value={nom}
              onChange={(e) => {
                setNom(e.target.value);
                if (errors.nom) setErrors(prev => ({ ...prev, nom: null }));
              }}
              className={`w-full px-3 py-2.5 text-sm rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border ${
                errors.nom 
                  ? 'border-red-500' 
                  : 'border-slate-300 dark:border-slate-600'
              } focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500 transition-colors uppercase`}
              placeholder="DUPONT"
            />
            {errors.nom && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3 h-3" />
                {errors.nom}
              </p>
            )}
          </dd>
        </div>

        {/* Prénom */}
        <div className="px-3 sm:px-4 py-3 sm:py-3.5">
          <dt className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wide">
            Prénom
          </dt>
          <dd>
            <input
              id="input-prenom"
              type="text"
              value={prenom}
              onChange={(e) => {
                setPrenom(e.target.value);
                if (errors.prenom) setErrors(prev => ({ ...prev, prenom: null }));
              }}
              className={`w-full px-3 py-2.5 text-sm rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border ${
                errors.prenom 
                  ? 'border-red-500' 
                  : 'border-slate-300 dark:border-slate-600'
              } focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500 transition-colors capitalize`}
              placeholder="Jean"
            />
            {errors.prenom && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3 h-3" />
                {errors.prenom}
              </p>
            )}
          </dd>
        </div>

        {/* Email */}
        <div className="px-3 sm:px-4 py-3 sm:py-3.5">
          <dt className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wide">
            Email
          </dt>
          <dd className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              id="input-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              className={`w-full pl-10 pr-3 py-2.5 text-sm rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border ${
                errors.email 
                  ? 'border-red-500' 
                  : 'border-slate-300 dark:border-slate-600'
              } focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500 transition-colors`}
              placeholder="jean.dupont@exemple.fr"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3 h-3" />
                {errors.email}
              </p>
            )}
          </dd>
        </div>

        {/* IBAN */}
        <div className="px-3 sm:px-4 py-3 sm:py-3.5">
          <dt className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wide">
            IBAN
          </dt>
          <dd className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <input
              id="input-iban"
              type="text"
              value={formatIbanDisplay(iban)}
              onChange={handleIbanChange}
              className={`w-full pl-10 pr-3 py-2.5 text-sm rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border ${
                errors.iban 
                  ? 'border-red-500' 
                  : 'border-slate-300 dark:border-slate-600'
              } focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500 transition-colors font-mono uppercase`}
              placeholder="FR76 1234 5678 9012 3456 7890 123"
            />
            {errors.iban && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3 h-3" />
                {errors.iban}
              </p>
            )}
          </dd>
        </div>
      </dl>

      {/* Message d'avertissement */}
      <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-900/10 border-t border-slate-200/60 dark:border-slate-700/50">
        <div className="flex items-start gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Modifications soumises à validation administrateur
          </p>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-900/10 border-t border-slate-200/60 dark:border-slate-700/50 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Envoi...' : 'Demander la modification'}
        </button>

        <button
          onClick={onCancel}
          disabled={isLoading}
          type="button"
          className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Annuler
        </button>
      </div>
    </div>
  );
};





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

// ============================================
// COMPOSANTS UTILITAIRES (en dehors pour éviter re-création)
// ============================================
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

const Badge = React.memo(({ children, variant = 'default' }) => {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide';
  const variants = {
    default: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
    success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
    accent: 'bg-primary-50 text-primary-700 dark:bg-primary-800/40 dark:text-primary-200'
  };
  return <span className={`${base} ${variants[variant]}`}>{children}</span>;
});

const Card = React.memo(({ title, icon: Icon, children, actions }) => (
  <div className="group rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 shadow-sm transition-colors overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50">
      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium text-sm">
        {Icon && <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
        <span>{title}</span>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    <div className="p-4 text-slate-800 dark:text-slate-200">{children}</div>
  </div>
));

const ProfilEmploye = React.memo(() => {
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
  
  // États pour l'édition du profil - PAR CHAMP (nouveau système)
  const [editingField, setEditingField] = useState(null); // 'telephone' | 'adresse' | 'nom' | 'prenom' | 'email' | 'iban' | null
  const [fieldLoading, setFieldLoading] = useState(null); // champ en cours de sauvegarde
  const [editValue, setEditValue] = useState(''); // valeur en cours d'édition
  const [demandesEnAttente, setDemandesEnAttente] = useState([]); // demandes de modification en attente
  
  // États pour la photo de profil
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // États pour l'historique des modifications
  const [historique, setHistorique] = useState([]);
  const [showHistorique, setShowHistorique] = useState(false);
  const [historiqueLoading, setHistoriqueLoading] = useState(false);
  
  // État pour le statut Navigo (affichage uniquement, l'upload est sur /home)
  const [navigoStatus, setNavigoStatus] = useState(null);
  const [navigoUploading, setNavigoUploading] = useState(false);
  const [showNavigoDeleteConfirm, setShowNavigoDeleteConfirm] = useState(false);
  
  // États pour le système de justificatifs Navigo mensuels
  const [justificatifsMensuels, setJustificatifsMensuels] = useState([]);
  const [selectedMois, setSelectedMois] = useState(new Date().getMonth() + 1);
  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear());
  const [showMoisSelector, setShowMoisSelector] = useState(false);
  const [justificatifMensuelToDelete, setJustificatifMensuelToDelete] = useState(null);
  
  // État pour highlight depuis notification
  const [highlightedField, setHighlightedField] = useState(null);
  
  // État pour la navigation par onglets
  const [activeTab, setActiveTab] = useState('infos');

  // Initialiser le thème depuis paramètre URL (?theme=dark)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paramTheme = params.get('theme');
    if (paramTheme) setTheme(paramTheme.toLowerCase()==='dark' ? 'dark':'light');
  }, [location.search, setTheme]);

  // 🆕 Gérer la navigation depuis les notifications
  useEffect(() => {
    if (location.state?.fromNotification && location.state?.highlightSection === 'infos-personnelles') {
      // Extraire le champ depuis le type de notification
      const champ = location.state?.highlightField;
      
      if (champ) {
        // Ouvrir l'historique automatiquement
        setShowHistorique(true);
        setHighlightedField(champ);
        
        // Scroll vers la section des infos après un court délai
        setTimeout(() => {
          const section = document.getElementById(`field-${champ}`);
          if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            // Fallback vers section historique
            const histSection = document.getElementById('historique-modifications');
            if (histSection) histSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
        
        // Retirer le highlight après 4 secondes
        setTimeout(() => setHighlightedField(null), 4000);
      }
      
      // Nettoyer le state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Gestion sécurisée du token avec expiration automatique
  const token = getToken();
  
  // Vérification automatique expiration token avec auto-logout
  useEffect(() => {
    if (!isTokenValid()) {
      setErreur('Votre session a expiré. Veuillez vous reconnecter.');
      setTimeout(() => {
        clearToken();
        navigate('/connexion');
      }, 2000);
      return;
    }
    
    const cleanup = setupTokenExpirationCheck(() => {
      setErreur('Votre session a expiré. Veuillez vous reconnecter.');
      setTimeout(() => {
        clearToken();
        navigate('/connexion');
      }, 2000);
    });
    
    return cleanup;
  }, [navigate]);

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

  // Charger les demandes en attente (memoized)
  const fetchDemandesEnAttente = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/modifications/mes-demandes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const enAttente = res.data.filter(d => d.statut === 'en_attente');
      setDemandesEnAttente(enAttente);
    } catch (err) {
      console.error('Erreur récupération demandes:', err);
    }
  }, [token]);

  // Charger l'historique des modifications (memoized)
  const fetchHistorique = useCallback(async () => {
    setHistoriqueLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/modifications/mon-historique`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistorique(res.data);
    } catch (err) {
      console.error('Erreur récupération historique:', err);
    } finally {
      setHistoriqueLoading(false);
    }
  }, [token]);

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUT NAVIGO (affichage uniquement - upload sur page /home)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const fetchNavigoStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/navigo/mon-statut`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNavigoStatus(res.data);
    } catch (err) {
      console.error('Erreur récupération statut Navigo:', err);
    }
  }, [token]);

  // ═══════════════════════════════════════════════════════════════════════════
  // JUSTIFICATIFS NAVIGO MENSUELS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const fetchJustificatifsMensuels = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/navigo/mensuel/mes-justificatifs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJustificatifsMensuels(res.data.justificatifs || []);
      // Mettre à jour aussi le statut d'éligibilité depuis cette réponse
      if (res.data.eligibleNavigo !== undefined) {
        setNavigoStatus(prev => prev ? {...prev, eligibleNavigo: res.data.eligibleNavigo} : {eligibleNavigo: res.data.eligibleNavigo});
      }
    } catch (err) {
      console.error('Erreur récupération justificatifs mensuels:', err);
    }
  }, [token]);

  // Fonction pour obtenir le justificatif d'un mois donné
  const getJustificatifPourMois = useCallback((mois, annee) => {
    return justificatifsMensuels.find(j => j.mois === mois && j.annee === annee);
  }, [justificatifsMensuels]);

  // Upload d'un justificatif mensuel
  const handleJustificatifMensuelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setNavigoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mois', selectedMois.toString());
      formData.append('annee', selectedAnnee.toString());
      
      await axios.post(`${API_URL}/api/navigo/mensuel/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSucces(`Justificatif pour ${getNomMois(selectedMois)} ${selectedAnnee} envoyé avec succès !`);
      fetchJustificatifsMensuels();
      setShowMoisSelector(false);
      // Reset file input
      e.target.value = '';
    } catch (err) {
      console.error('Erreur upload justificatif mensuel:', err);
      setErreur(err.response?.data?.message || 'Erreur lors de l\'envoi du justificatif');
    } finally {
      setNavigoUploading(false);
    }
  };

  // Supprimer un justificatif mensuel
  const handleDeleteJustificatifMensuel = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/navigo/mensuel/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSucces('Justificatif supprimé avec succès');
      fetchJustificatifsMensuels();
      setJustificatifMensuelToDelete(null);
    } catch (err) {
      console.error('Erreur suppression justificatif mensuel:', err);
      setErreur(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // Obtenir les mois disponibles pour l'upload (12 derniers mois)
  const getMoisDisponibles = useMemo(() => {
    const now = new Date();
    const moisActuel = now.getMonth() + 1;
    const anneeActuelle = now.getFullYear();
    const moisList = [];
    
    // Générer les 12 derniers mois (y compris le mois actuel)
    for (let i = 0; i < 12; i++) {
      let mois = moisActuel - i;
      let annee = anneeActuelle;
      
      if (mois <= 0) {
        mois += 12;
        annee -= 1;
      }
      
      moisList.push({ mois, annee });
    }
    
    return moisList;
  }, []);

  // Obtenir le nom du mois
  const getNomMois = (mois) => {
    const noms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return noms[mois] || '';
  };

  // Vérifier si on est dans les 15 premiers jours du mois
  const estDansDelai = useMemo(() => {
    const now = new Date();
    return now.getDate() <= 15;
  }, []);

  // Charger les informations de l'employé
  useEffect(() => {
    const fetchProfil = async () => {
      setProfilLoading(true);
      try {
        const res = await axios.get(`${API_URL}/user/profil`, {
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
    fetchDemandesEnAttente();
    fetchHistorique();
    fetchNavigoStatus();
    fetchJustificatifsMensuels();
  }, [token, fetchDemandesEnAttente, fetchHistorique, fetchNavigoStatus, fetchJustificatifsMensuels]);
  
  // Upload de photo de profil
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErreur('Format non autorisé. Utilisez JPG, PNG ou WEBP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErreur('La photo ne doit pas dépasser 2 MB.');
      return;
    }

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await axios.post(`${API_URL}/api/profil/upload-photo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setEmploye({ ...employe, photoProfil: res.data.photoUrl });
      setSucces('Photo de profil mise à jour avec succès');
      setShowPhotoOptions(false);
    } catch (err) {
      console.error('Erreur upload photo:', err);
      setErreur(err.response?.data?.error || 'Erreur lors de l\'upload');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Supprimer la photo de profil
  const handlePhotoDelete = async () => {
    setShowPhotoOptions(false);
    setShowDeleteConfirm(true);
  };

  const confirmPhotoDelete = async () => {
    try {
      await axios.delete(`${API_URL}/api/profil/delete-photo`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEmploye({ ...employe, photoProfil: null });
      setSucces('Photo de profil supprimée avec succès');
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Erreur suppression photo:', err);
      setErreur(err.response?.data?.error || 'Erreur lors de la suppression');
      setShowDeleteConfirm(false);
    }
  };

  // ============================================
  // GESTION NAVIGO - Upload/Delete justificatif
  // ============================================
  const handleNavigoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifications
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErreur('Format accepté : JPG, PNG ou PDF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErreur('Le fichier ne doit pas dépasser 5 Mo');
      return;
    }

    setNavigoUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API_URL}/api/navigo/mon-justificatif`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setSucces('Justificatif Navigo envoyé avec succès !');
      fetchNavigoStatus();
    } catch (err) {
      console.error('Erreur upload Navigo:', err);
      setErreur(err.response?.data?.error || 'Erreur lors de l\'envoi du justificatif');
    } finally {
      setNavigoUploading(false);
    }
  };

  const handleNavigoDelete = () => {
    setShowNavigoDeleteConfirm(true);
  };

  const confirmNavigoDelete = async () => {
    setShowNavigoDeleteConfirm(false);
    try {
      await axios.delete(`${API_URL}/api/navigo/mon-justificatif`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSucces('Justificatif Navigo supprimé avec succès');
      fetchNavigoStatus();
    } catch (err) {
      console.error('Erreur suppression Navigo:', err);
      setErreur(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  // ============================================
  // ÉDITION PAR CHAMP - Ouvrir l'édition
  // ============================================
  const startEditing = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  // ============================================
  // SAUVEGARDE CHAMP INDIVIDUEL
  // ============================================
  const handleSaveField = async (field, value) => {
    setFieldLoading(field);
    setErreur('');
    
    // Champs à modification directe (coordonnées)
    const directFields = ['telephone', 'adresse'];
    // Champs nécessitant validation admin
    const validationFields = ['nom', 'prenom', 'email', 'iban'];
    
    try {
      // Validation selon le type de champ (téléphone et adresse sont optionnels - peuvent être vidés)
      if (field === 'telephone' && value && value.trim() !== '') {
        const phoneClean = value.replace(/[^\d+]/g, '');
        const digitsOnly = phoneClean.replace(/\D/g, '');
        if (digitsOnly.length < 8 || digitsOnly.length > 15) {
          setErreur('Le numéro de téléphone doit contenir entre 8 et 15 chiffres');
          setFieldLoading(null);
          return;
        }
      }
      
      if (field === 'adresse' && value && value.trim() !== '' && value.trim().length < 10) {
        setErreur('L\'adresse doit contenir au moins 10 caractères');
        setFieldLoading(null);
        return;
      }
      
      if (field === 'nom' && value.trim().length < 2) {
        setErreur('Le nom doit contenir au moins 2 caractères');
        setFieldLoading(null);
        return;
      }
      
      if (field === 'prenom' && value.trim().length < 2) {
        setErreur('Le prénom doit contenir au moins 2 caractères');
        setFieldLoading(null);
        return;
      }
      
      if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setErreur('Format email invalide');
        setFieldLoading(null);
        return;
      }
      
      if (field === 'iban' && value) {
        const ibanClean = value.replace(/\s/g, '').toUpperCase();
        if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(ibanClean)) {
          setErreur('Format IBAN invalide');
          setFieldLoading(null);
          return;
        }
      }

      // Si valeur identique, fermer sans sauvegarder
      if (value === employe[field]) {
        setEditingField(null);
        setEditValue('');
        setFieldLoading(null);
        return;
      }

      if (directFields.includes(field)) {
        // Modification directe
        await axios.put(`${API_URL}/api/modifications/batch-update`, {
          modifications: { [field]: value }
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Rafraîchir le profil
        const res = await axios.get(`${API_URL}/user/profil`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmploye(res.data);
        setSucces('Modification enregistrée');
        
      } else if (validationFields.includes(field)) {
        // Demande de validation admin
        await axios.post(`${API_URL}/api/modifications/demande-modification`, {
          champ: field,
          nouvelle_valeur: value,
          motif: 'Mise à jour des informations personnelles'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSucces('Demande envoyée pour validation administrative');
        
        // 🆕 Rafraîchir les demandes en attente pour afficher le bandeau immédiatement
        await fetchDemandesEnAttente();
      }
      
      setEditingField(null);
      setEditValue('');
      
    } catch (err) {
      console.error('Erreur sauvegarde champ:', err);
      setErreur(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setFieldLoading(null);
    }
  };

  // ============================================
  // SAUVEGARDE TÉLÉPHONE
  // ============================================
  const handleSaveTelephone = async (telephone) => {
    setFieldLoading('telephone');
    setErreur('');
    
    try {
      console.log('🔵 Token:', token ? 'Présent' : 'MANQUANT');
      console.log('🔵 Téléphone à envoyer:', telephone);
      
      const response = await axios.put(`${API_URL}/api/modifications/batch-update`, {
        modifications: { telephone }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Réponse serveur:', response.data);
      
      const res = await axios.get(`${API_URL}/user/profil`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmploye(res.data);
      setSucces('Téléphone mis à jour');
      setEditingField(null);
      
    } catch (err) {
      console.error('❌ Erreur sauvegarde téléphone:', err);
      console.error('❌ Statut:', err.response?.status);
      console.error('❌ Message:', err.response?.data);
      console.error('❌ URL:', err.config?.url);
      setErreur(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setFieldLoading(null);
    }
  };

  // ============================================
  // SAUVEGARDE ADRESSE
  // ============================================
  const handleSaveAdresse = async (adresse) => {
    setFieldLoading('adresse');
    setErreur('');
    
    try {
      console.log('🔵 Adresse à envoyer:', adresse);
      
      const response = await axios.put(`${API_URL}/api/modifications/batch-update`, {
        modifications: { adresse }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Réponse serveur:', response.data);
      
      const res = await axios.get(`${API_URL}/user/profil`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('🔵 Profil rechargé:', res.data.adresse);
      
      setEmploye(res.data);
      setSucces('Adresse mise à jour');
      setEditingField(null);
      
    } catch (err) {
      console.error('❌ Erreur sauvegarde adresse:', err);
      console.error('❌ Statut:', err.response?.status);
      console.error('❌ Message:', err.response?.data);
      setErreur(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setFieldLoading(null);
    }
  };

  // Fonction de déconnexion
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    clearToken(); // Supprime token + timestamp de manière sécurisée
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
      await axios.put(`${API_URL}/user/change-password`, {
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

  // Rafraîchir les données du profil après upload photo (memoized)
  const refreshProfile = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/user/profil`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmploye(res.data);
      setSucces('📸 Photo de profil mise à jour avec succès !');
    } catch (err) {
      console.error('Erreur refresh profil:', err);
    }
  }, [token]);

  // Calcul du score de complétion du profil (memoized avec pondération intelligente)
  const { completionScore, missingFields, completionDetails } = useMemo(() => {
    // Définir les champs avec leur importance (poids) et leur caractère obligatoire
    const fieldsConfig = [
      { key: 'nom', label: 'Nom', weight: 15, required: true, value: employe.nom },
      { key: 'prenom', label: 'Prénom', weight: 15, required: true, value: employe.prenom },
      { key: 'email', label: 'Email', weight: 15, required: true, value: employe.email },
      { key: 'telephone', label: 'Téléphone', weight: 12, required: false, value: employe.telephone },
      { key: 'adresse', label: 'Adresse', weight: 10, required: false, value: employe.adresse },
      { key: 'categorie', label: 'Catégorie', weight: 8, required: false, value: employe.categorie },
      { key: 'dateEmbauche', label: "Date d'embauche", weight: 8, required: false, value: employe.dateEmbauche },
      { key: 'iban', label: 'IBAN', weight: 10, required: false, value: employe.iban },
      { key: 'photoProfil', label: 'Photo de profil', weight: 7, required: false, value: employe.photoProfil },
    ];
    
    let totalWeight = 0;
    let earnedWeight = 0;
    const missing = [];
    const details = [];
    
    for (const field of fieldsConfig) {
      totalWeight += field.weight;
      const isFilled = field.value && String(field.value).trim() !== '';
      
      if (isFilled) {
        earnedWeight += field.weight;
        details.push({ ...field, status: 'complete' });
      } else {
        missing.push(field);
        details.push({ ...field, status: field.required ? 'missing-required' : 'missing-optional' });
      }
    }
    
    const score = Math.round((earnedWeight / totalWeight) * 100);
    
    return {
      completionScore: score,
      missingFields: missing,
      completionDetails: details
    };
  }, [employe.nom, employe.prenom, employe.email, employe.telephone, employe.adresse, employe.categorie, employe.dateEmbauche, employe.iban, employe.photoProfil]);

  // Fonction pour afficher le statut des champs (memoized)
  const getFieldStatus = useCallback((value) => {
    if (!value || String(value).trim() === '') return 'incomplete';
    return 'complete';
  }, []);

  // ============================================
  // COMPOSANT LIGNE ÉDITABLE PAR CHAMP
  // ============================================
  const EditableFieldRow = ({ 
    field, 
    label, 
    value, 
    displayValue,
    type = 'text',
    placeholder = '',
    isEditable = true,
    requiresValidation = false,
    inputMode = 'text'
  }) => {
    const isEditing = editingField === field;
    const isLoading = fieldLoading === field;
    const isEmpty = !value || value === '';
    const demandeEnCours = demandesEnAttente.find(d => d.champ_modifie === field);
    
    // Gérer la soumission avec Enter
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveField(field, editValue);
      }
      if (e.key === 'Escape') {
        cancelEditing();
      }
    };

    if (isEditing) {
      return (
        <div className="px-3 py-2.5 bg-primary-50/50 dark:bg-primary-900/10 border-l-2 border-primary-500">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-primary-700 dark:text-primary-300">{label}</label>
            <div className="flex gap-2">
              {type === 'textarea' ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-primary-300 dark:border-primary-600 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors resize-none"
                  placeholder={placeholder}
                  rows={3}
                  autoFocus
                />
              ) : (
                <input
                  type={type}
                  inputMode={inputMode}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-primary-300 dark:border-primary-600 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors"
                  placeholder={placeholder}
                  autoFocus
                />
              )}
              <button
                onClick={() => handleSaveField(field, editValue)}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={cancelEditing}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                ✕
              </button>
            </div>
            {requiresValidation && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3 h-3" />
                Cette modification nécessite une validation admin
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div 
        id={`field-${field}`}
        className={`px-3 py-2.5 grid grid-cols-12 gap-3 items-start group transition-all duration-300 ${
          highlightedField === field 
            ? 'bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-400 ring-inset animate-pulse' 
            : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/20'
        }`}
      >
        <dt className="col-span-4 md:col-span-3 text-xs font-medium text-slate-500 dark:text-slate-400 pt-0.5">
          {label}
        </dt>
        <dd className="col-span-8 md:col-span-9 flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm flex-1 break-words ${isEmpty ? 'text-slate-400 dark:text-slate-500 italic' : 'text-slate-800 dark:text-slate-200'}`}>
              {displayValue || value || 'Non renseigné'}
            </span>
            {!isEmpty ? (
              <Badge variant="success"><CheckCircleIcon className="w-3.5 h-3.5" /></Badge>
            ) : (
              <Badge variant="warning"><ExclamationTriangleIcon className="w-3.5 h-3.5" /></Badge>
            )}
            {isEditable && !demandeEnCours && (
              <button
                onClick={() => startEditing(field, value)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-[opacity,colors] duration-150"
                title="Modifier"
              >
                <PencilIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {demandeEnCours && (
            <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
              <ClockIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Demande en attente</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 break-words">Nouvelle valeur : <span className="font-medium">{demandeEnCours.nouvelle_valeur}</span></p>
              </div>
            </div>
          )}
        </dd>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 pb-navbar lg:pb-8 lg:pt-16 relative pt-header">

      {/* Main container */}
      <div className="relative max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Left column (summary) */}
          <div className="w-full lg:w-64 xl:w-72 flex-shrink-0 space-y-4 lg:sticky lg:top-20 self-start">
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 shadow-sm p-3.5 relative">
              <button
                onClick={toggleTheme}
                className="group absolute top-2.5 right-2.5 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                aria-label="Basculer le thème"
                title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                {theme === 'dark' ? (
                  <SunIcon className="w-4 h-4" />
                ) : (
                  <MoonIcon className="w-4 h-4" />
                )}
              </button>
              {/* Layout: Horizontal compact desktop */}
              <div className="flex items-start gap-3 sm:gap-4">
                    {/* Photo de profil */}
                    <div className="relative group flex-shrink-0">
                      {employe.photoProfil ? (
                        <img 
                          src={`${API_URL}${employe.photoProfil}`}
                          alt="Photo de profil"
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-sm ring-2 ring-slate-100 dark:ring-slate-700"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 text-primary-700 dark:text-primary-300 flex items-center justify-center text-lg sm:text-xl font-semibold shadow-sm ring-2 ring-primary-100 dark:ring-primary-800/30">
                          {(employe.prenom?.[0] || '?')}{(employe.nom?.[0] || '')}
                        </div>
                      )}
                      
                      {/* Bouton pour changer/supprimer la photo */}
                      <button
                        onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                        className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        aria-label="Modifier la photo"
                      >
                        <CameraIcon className="w-5 h-5 text-white" />
                      </button>

                      {completionScore === 100 && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-800">
                          <CheckCircleIcon className="w-3 h-3 text-white" />
                        </div>
                      )}
                      
                      {/* Menu options photo */}
                      {showPhotoOptions && (
                        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 min-w-[200px]">
                          <label className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors">
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              onChange={handlePhotoUpload}
                              className="hidden"
                              disabled={uploadingPhoto}
                            />
                            <CameraIcon className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-700 dark:text-slate-200">
                              {uploadingPhoto ? 'Upload en cours...' : employe.photoProfil ? 'Changer la photo' : 'Ajouter une photo'}
                            </span>
                          </label>
                          
                          {employe.photoProfil && (
                            <button
                              onClick={handlePhotoDelete}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors w-full text-left"
                            >
                              <TrashIcon className="w-4 h-4 text-red-500" />
                              <span className="text-sm text-red-600 dark:text-red-400">Supprimer</span>
                            </button>
                          )}
                          
                          <button
                            onClick={() => setShowPhotoOptions(false)}
                            className="flex items-center justify-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors w-full mt-1 border-t border-slate-100 dark:border-slate-700"
                          >
                            <span className="text-xs text-slate-500">Annuler</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Colonne info principale */}
                    <div className="flex-1 min-w-0 space-y-1.5 pr-6">
                      {/* Nom complet - Style navbar */}
                      <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-tight truncate">
                        {employe.prenom} {employe.nom}
                      </h1>
                      
                      {/* Catégorie - Style compact */}
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                        {employe.categorie || 'Poste non défini'}
                      </p>

                      {/* Date d'embauche - Discret */}
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Depuis {formatDate(employe.dateEmbauche)}
                      </p>

                      {/* Barre de progression intelligente */}
                      {completionScore < 100 && (
                        <div className="pt-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                                  completionScore >= 80 ? 'bg-emerald-500' :
                                  completionScore >= 50 ? 'bg-amber-500' :
                                  'bg-red-400'
                                }`} 
                                style={{ width: `${completionScore}%` }} 
                              />
                            </div>
                            <span className={`text-[10px] font-semibold tabular-nums ${
                              completionScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                              completionScore >= 50 ? 'text-amber-600 dark:text-amber-400' :
                              'text-red-500 dark:text-red-400'
                            }`}>{completionScore}%</span>
                          </div>
                          {/* Afficher le champ manquant le plus important */}
                          {missingFields.length > 0 && (
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                              {missingFields[0].required ? (
                                <ExclamationTriangleIcon className="w-3 h-3 text-amber-500 flex-shrink-0" />
                              ) : (
                                <LightBulbIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              )}
                              {missingFields[0].label} manquant{missingFields.length > 1 ? ` (+${missingFields.length - 1})` : ''}
                            </p>
                          )}
                        </div>
                      )}
                      {completionScore === 100 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <CheckCircleIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Profil complet</span>
                        </div>
                      )}
                    </div>
                  </div>
            </div>

            {/* Déconnexion - Masqué sur mobile, affiché sur desktop */}
            <div className="hidden lg:block">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200 dark:hover:border-red-800/30 px-3 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-150"
              >
                <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>

          </div>

          {/* Right column (content) */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Navigation par onglets */}
            <div className="flex gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
              {[
                { id: 'infos', label: 'Infos', Icon: UserIcon },
                { id: 'documents', label: 'Documents', Icon: DocumentTextIcon },
                { id: 'securite', label: 'Sécurité', Icon: ShieldCheckIcon },
                { id: 'historique', label: 'Historique', Icon: ClockIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-primary-100 dark:ring-primary-900/50'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <tab.Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Contenu de l'onglet Infos */}
            {activeTab === 'infos' && (
            <Card 
              title="Informations personnelles" 
              icon={UserIcon}
            >
              {profilLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <FieldSkeleton key={i} />)}
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {/* SECTION 1: Coordonnées - Modification directe */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Coordonnées</h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium">
                          Modifiable directement
                        </span>
                      </div>
                      
                      <div className="rounded-lg bg-slate-50/50 dark:bg-slate-700/30 border border-slate-200/50 dark:border-slate-700/40" style={{ overflow: 'visible' }}>
                        <dl className="divide-y divide-slate-200/50 dark:divide-slate-700/40" style={{ overflow: 'visible' }}>
                          {/* Téléphone */}
                          {editingField === 'telephone' ? (
                            <FormulaireTelephone
                              employe={employe}
                              onSave={handleSaveTelephone}
                              onCancel={cancelEditing}
                              isLoading={fieldLoading === 'telephone'}
                            />
                          ) : (
                            <div 
                              id="field-telephone"
                              className={`px-3 py-2.5 grid grid-cols-12 gap-3 items-center group transition-all duration-300 ${
                                highlightedField === 'telephone' 
                                  ? 'bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-400 ring-inset animate-pulse' 
                                  : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/20'
                              }`}
                            >
                              <dt className="col-span-4 md:col-span-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                Téléphone
                              </dt>
                              <dd className="col-span-8 md:col-span-9 flex items-center gap-2 min-w-0">
                                <span className={`text-sm flex-1 ${!employe.telephone ? 'text-slate-400 dark:text-slate-500 italic' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {employe.telephone ? formatTelephone(employe.telephone) : 'Non renseigné'}
                                </span>
                                {employe.telephone ? (
                                  <Badge variant="success"><CheckCircleIcon className="w-3.5 h-3.5" /></Badge>
                                ) : (
                                  <Badge variant="warning"><ExclamationTriangleIcon className="w-3.5 h-3.5" /></Badge>
                                )}
                                <button
                                  onClick={() => startEditing('telephone', employe.telephone)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-150"
                                  title="Modifier"
                                >
                                  <PencilIcon className="w-3.5 h-3.5" />
                                </button>
                              </dd>
                            </div>
                          )}
                          
                          {/* Adresse */}
                          {editingField === 'adresse' ? (
                            <FormulaireAdresse
                              employe={employe}
                              onSave={handleSaveAdresse}
                              onCancel={cancelEditing}
                              isLoading={fieldLoading === 'adresse'}
                            />
                          ) : (
                            <div 
                              id="field-adresse"
                              className={`px-3 py-2.5 grid grid-cols-12 gap-3 items-start group transition-all duration-300 ${
                                highlightedField === 'adresse' 
                                  ? 'bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-400 ring-inset animate-pulse' 
                                  : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/20'
                              }`}
                            >
                              <dt className="col-span-4 md:col-span-3 text-xs font-medium text-slate-500 dark:text-slate-400 pt-0.5">
                                Adresse
                              </dt>
                              <dd className="col-span-8 md:col-span-9 flex items-start gap-2 min-w-0">
                                <span className={`text-sm flex-1 whitespace-pre-line ${!employe.adresse ? 'text-slate-400 dark:text-slate-500 italic' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {employe.adresse || 'Non renseignée'}
                                </span>
                                {employe.adresse ? (
                                  <Badge variant="success"><CheckCircleIcon className="w-3.5 h-3.5" /></Badge>
                                ) : (
                                  <Badge variant="warning"><ExclamationTriangleIcon className="w-3.5 h-3.5" /></Badge>
                                )}
                                <button
                                  onClick={() => startEditing('adresse', employe.adresse)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-150"
                                  title="Modifier"
                                >
                                  <PencilIcon className="w-3.5 h-3.5" />
                                </button>
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>

                    {/* SECTION 2: Identité & Bancaire - Validation admin requise */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                        <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Identité & Bancaire</h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-medium">
                          Validation admin
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-50/50 dark:bg-slate-700/30 border border-slate-200/50 dark:border-slate-700/40 overflow-hidden">
                        <dl className="divide-y divide-slate-200/50 dark:divide-slate-700/40">
                          <EditableFieldRow
                            field="nom"
                            label="Nom"
                            value={employe.nom}
                            placeholder="DUPONT"
                            isEditable={true}
                            requiresValidation={true}
                          />
                          <EditableFieldRow
                            field="prenom"
                            label="Prénom"
                            value={employe.prenom}
                            placeholder="Jean"
                            isEditable={true}
                            requiresValidation={true}
                          />
                          <EditableFieldRow
                            field="email"
                            label="Email"
                            value={employe.email}
                            type="email"
                            inputMode="email"
                            placeholder="jean.dupont@exemple.fr"
                            isEditable={true}
                            requiresValidation={true}
                          />
                          <EditableFieldRow
                            field="iban"
                            label="IBAN"
                            value={employe.iban}
                            placeholder="FR76 1234 5678 9012 3456 7890 123"
                            isEditable={true}
                            requiresValidation={true}
                          />
                        </dl>
                      </div>
                    </div>

                    {/* SECTION 3: Informations RH */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <LockClosedIcon className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Informations RH</h4>
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                          Lecture seule
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-50/50 dark:bg-slate-700/30 border border-slate-200/50 dark:border-slate-700/40 overflow-hidden">
                        <dl className="divide-y divide-slate-200/50 dark:divide-slate-700/40">
                          {[
                            { label: 'Poste', value: employe.categorie || '—', field: 'categorie' },
                            { label: "Date d'embauche", value: formatDate(employe.dateEmbauche), field: 'dateEmbauche' }
                          ].map((item) => (
                            <div key={item.field} className="px-3 py-2.5 grid grid-cols-12 gap-3 items-center">
                              <dt className="col-span-4 md:col-span-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                {item.label}
                              </dt>
                              <dd className="col-span-8 md:col-span-9 flex items-center gap-2 min-w-0">
                                <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">{item.value}</span>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </Card>
            )}

            {/* Contenu de l'onglet Documents */}
            {activeTab === 'documents' && (
              <Card title="Mes Documents" icon={DocumentTextIcon}>
                <div className="space-y-4">
                  {/* Widget Navigo - Système mensuel complet */}
                  <div>
                    {/* Header avec indicateur du mois */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                          <TicketIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Justificatifs Navigo</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Suivi mensuel de vos justificatifs
                          </p>
                        </div>
                      </div>
                      {navigoStatus?.eligibleNavigo && (
                        <span className="px-2 py-1 text-[10px] font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircleIcon className="w-3 h-3" /> Éligible Navigo
                        </span>
                      )}
                    </div>

                    {/* Alerte rappel - visible si pas de justificatif pour le mois en cours et dans les 15 premiers jours */}
                    {(() => {
                      const now = new Date();
                      const justifMoisActuel = getJustificatifPourMois(now.getMonth() + 1, now.getFullYear());
                      if (!justifMoisActuel && now.getDate() <= 15) {
                        return (
                          <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30">
                            <div className="flex items-start gap-2">
                              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                  Rappel : Justificatif à déposer
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                                  Pensez à envoyer votre justificatif Navigo pour {getNomMois(now.getMonth() + 1).toLowerCase()} avant le 15 du mois.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      if (!justifMoisActuel && now.getDate() > 15) {
                        return (
                          <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30">
                            <div className="flex items-start gap-2">
                              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                  Délai dépassé pour {getNomMois(now.getMonth() + 1).toLowerCase()}
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                                  Vous pouvez toujours déposer votre justificatif pour régularisation.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Zone d'upload - Mois en cours */}
                    <div className="rounded-xl bg-gradient-to-br from-primary-50 to-rose-50 dark:from-primary-900/20 dark:to-rose-900/20 border border-primary-200/50 dark:border-primary-800/30 p-4">
                      {(() => {
                        const now = new Date();
                        const justifMoisActuel = getJustificatifPourMois(now.getMonth() + 1, now.getFullYear());
                        
                        if (justifMoisActuel) {
                          return (
                            <div className="space-y-3">
                              {/* Aperçu du justificatif */}
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                                  {getNomMois(now.getMonth() + 1)} {now.getFullYear()}
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full flex items-center gap-1 ${
                                  justifMoisActuel.statut === 'valide' 
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                    : justifMoisActuel.statut === 'refuse'
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                }`}>
                                  {justifMoisActuel.statut === 'valide' && <><CheckCircleIcon className="w-3 h-3" /> Validé</>}
                                  {justifMoisActuel.statut === 'refuse' && <><ExclamationTriangleIcon className="w-3 h-3" /> Refusé</>}
                                  {justifMoisActuel.statut === 'en_attente' && <><ClockIcon className="w-3 h-3" /> En attente</>}
                                </span>
                              </div>
                              
                              <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-primary-100 dark:border-primary-800/50">
                                  <TicketIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Justificatif déposé
                                  </p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                    Envoyé le {new Date(justifMoisActuel.dateUpload).toLocaleDateString('fr-FR', {
                                      day: '2-digit', month: 'long', year: 'numeric'
                                    })}
                                  </p>
                                  {justifMoisActuel.motifRefus && (
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                      Motif: {justifMoisActuel.motifRefus}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex gap-2">
                                <a
                                  href={`${API_URL}${justifMoisActuel.fichier}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300 bg-white dark:bg-slate-800 rounded-lg border border-primary-200 dark:border-primary-700/50 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                                >
                                  <EyeIcon className="w-4 h-4" /> Voir
                                </a>
                                {justifMoisActuel.statut !== 'valide' && (
                                  <button
                                    onClick={() => setJustificatifMensuelToDelete(justifMoisActuel)}
                                    className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-700/50 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                    title="Supprimer et renvoyer"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                                  {getNomMois(now.getMonth() + 1)} {now.getFullYear()}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
                                  <ArrowUpTrayIcon className="w-6 h-6 text-primary-500 dark:text-primary-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Déposez votre justificatif
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Attestation employeur, photo du pass ou justificatif d'achat
                                  </p>
                                </div>
                              </div>
                              
                              <label className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700 bg-white dark:bg-slate-800/50 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-400 dark:hover:border-primary-600 transition-all ${navigoUploading ? 'opacity-50 cursor-wait' : ''}`}>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                                  onChange={(e) => {
                                    setSelectedMois(now.getMonth() + 1);
                                    setSelectedAnnee(now.getFullYear());
                                    handleJustificatifMensuelUpload(e);
                                  }}
                                  disabled={navigoUploading}
                                  className="hidden"
                                />
                                {navigoUploading ? (
                                  <>
                                    <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Envoi en cours...</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowUpTrayIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Choisir un fichier</span>
                                  </>
                                )}
                              </label>
                              
                              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                                JPG, PNG ou PDF • Max 5 Mo
                              </p>
                            </div>
                          );
                        }
                      })()}
                    </div>

                    {/* Bouton pour envoyer un justificatif pour un ancien mois */}
                    <button
                      onClick={() => setShowMoisSelector(true)}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ClockIcon className="w-4 h-4" />
                      Envoyer pour un mois précédent
                    </button>

                    {/* Historique des justificatifs */}
                    {/* Timeline verticale de l'historique */}
                    {justificatifsMensuels.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                            Historique
                          </h5>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {justificatifsMensuels.filter(j => j.statut === 'valide').length}/{justificatifsMensuels.length} validés
                          </span>
                        </div>
                        
                        {/* Timeline container */}
                        <div className="relative max-h-72 overflow-y-auto pr-1">
                          {/* Ligne verticale de la timeline */}
                          <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-full" />
                          
                          <div className="space-y-3">
                            {justificatifsMensuels.map((justif, index) => {
                              const now = new Date();
                              const isMoisActuel = justif.mois === (now.getMonth() + 1) && justif.annee === now.getFullYear();
                              const isLast = index === justificatifsMensuels.length - 1;
                              
                              return (
                                <div
                                  key={justif.id}
                                  className="relative flex items-start gap-3"
                                >
                                  {/* Point de la timeline - plus petit */}
                                  <div className={`relative z-10 flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 ${
                                    justif.statut === 'valide' 
                                      ? 'bg-emerald-500' 
                                      : justif.statut === 'refuse'
                                      ? 'bg-red-500'
                                      : 'bg-amber-500'
                                  }`}>
                                    {justif.statut === 'valide' && <CheckCircleIcon className="w-2.5 h-2.5 text-white" />}
                                    {justif.statut === 'refuse' && <ExclamationTriangleIcon className="w-2.5 h-2.5 text-white" />}
                                    {justif.statut === 'en_attente' && <ClockIcon className="w-2.5 h-2.5 text-white" />}
                                  </div>
                                  
                                  {/* Contenu de l'item - plus compact */}
                                  <div className="flex-1 -mt-0.5">
                                    <div className={`p-2.5 rounded-lg transition-all ${
                                      isMoisActuel 
                                        ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/50' 
                                        : 'bg-slate-50/80 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                    }`}>
                                      {/* En-tête avec mois et actions */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {getNomMois(justif.mois)} {justif.annee}
                                          </span>
                                          {isMoisActuel && (
                                            <span className="px-1 py-0.5 text-[8px] font-bold rounded bg-primary-500 text-white">
                                              ACTUEL
                                            </span>
                                          )}
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                            justif.statut === 'valide' 
                                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                                              : justif.statut === 'refuse'
                                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                          }`}>
                                            {justif.statut === 'valide' ? 'Validé' : justif.statut === 'refuse' ? 'Refusé' : 'En attente'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                          <a
                                            href={`${API_URL}${justif.fichier}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors"
                                            title="Voir"
                                          >
                                            <EyeIcon className="w-3.5 h-3.5 text-slate-400" />
                                          </a>
                                          {justif.statut !== 'valide' && (
                                            <button
                                              onClick={() => setJustificatifMensuelToDelete(justif)}
                                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
                                              title="Supprimer"
                                            >
                                              <TrashIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Date d'upload */}
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                        Envoyé le {new Date(justif.dateUpload).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </p>
                                      
                                      {/* Motif de refus si présent */}
                                      {justif.statut === 'refuse' && justif.motifRefus && (
                                        <p className="text-[10px] text-red-500 dark:text-red-400 mt-1 italic">
                                          Motif : {justif.motifRefus}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Info remboursement */}
                    <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                      <div className="flex items-start gap-2">
                        <LightBulbIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          <p className="font-medium mb-1">Comment ça marche ?</p>
                          <ul className="space-y-0.5 list-disc list-inside">
                            <li>Déposez votre justificatif <strong>chaque mois avant le 15</strong></li>
                            <li>L'administration valide votre document</li>
                            <li>Le remboursement est effectué avec votre salaire</li>
                            <li>Vous pouvez rattraper les mois précédents si besoin</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Autres documents (placeholder pour futurs documents) */}
                  <div className="rounded-lg bg-slate-50/50 dark:bg-slate-700/30 border border-slate-200/50 dark:border-slate-700/40 p-4">
                    <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
                      <FolderIcon className="w-5 h-5" />
                      <p className="text-sm">D'autres documents seront bientôt disponibles ici</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Modal sélection mois pour rattrapage */}
            {showMoisSelector && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                  {/* Header du modal */}
                  <div className="px-5 pt-5 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                        <TicketIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                          Envoyer un justificatif
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Sélectionnez le mois concerné
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Liste des mois */}
                  <div className="p-4 max-h-72 overflow-y-auto">
                    <div className="space-y-1.5">
                      {getMoisDisponibles.map(({ mois, annee }) => {
                        const existant = getJustificatifPourMois(mois, annee);
                        const isSelected = selectedMois === mois && selectedAnnee === annee;
                        const now = new Date();
                        const isMoisActuel = mois === (now.getMonth() + 1) && annee === now.getFullYear();
                        const isFutur = annee > now.getFullYear() || (annee === now.getFullYear() && mois > now.getMonth() + 1);
                        
                        return (
                          <button
                            key={`${mois}-${annee}`}
                            onClick={() => {
                              if (!isFutur && existant?.statut !== 'valide') {
                                setSelectedMois(mois);
                                setSelectedAnnee(annee);
                              }
                            }}
                            disabled={existant?.statut === 'valide' || isFutur}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                              isSelected
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-sm'
                                : isFutur
                                ? 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-40 cursor-not-allowed'
                                : existant?.statut === 'valide'
                                ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 cursor-not-allowed'
                                : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                            }`}
                          >
                            {/* Icône de statut */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              existant?.statut === 'valide'
                                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                : existant?.statut === 'refuse'
                                ? 'bg-red-100 dark:bg-red-900/40'
                                : existant?.statut === 'en_attente'
                                ? 'bg-amber-100 dark:bg-amber-900/40'
                                : isFutur
                                ? 'bg-slate-100 dark:bg-slate-800'
                                : 'bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600'
                            }`}>
                              {existant?.statut === 'valide' && <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                              {existant?.statut === 'refuse' && <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />}
                              {existant?.statut === 'en_attente' && <ClockIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                              {!existant && !isFutur && <ArrowUpTrayIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
                              {isFutur && <LockClosedIcon className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />}
                            </div>
                            
                            {/* Infos du mois */}
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${
                                  isSelected 
                                    ? 'text-primary-700 dark:text-primary-300' 
                                    : isFutur
                                    ? 'text-slate-400 dark:text-slate-600'
                                    : 'text-slate-700 dark:text-slate-200'
                                }`}>
                                  {getNomMois(mois)} {annee}
                                </span>
                                {isMoisActuel && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-primary-500 text-white">
                                    ACTUEL
                                  </span>
                                )}
                              </div>
                              <p className={`text-[10px] ${
                                isFutur ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'
                              }`}>
                                {isFutur 
                                  ? 'Mois futur - non disponible'
                                  : existant?.statut === 'valide' 
                                  ? 'Déjà validé'
                                  : existant?.statut === 'refuse'
                                  ? 'Refusé - Cliquez pour renvoyer'
                                  : existant?.statut === 'en_attente'
                                  ? 'En attente de validation'
                                  : 'Aucun justificatif envoyé'
                                }
                              </p>
                            </div>
                            
                            {/* Badge de statut */}
                            {existant && !isFutur && (
                              <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                                existant.statut === 'valide'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                  : existant.statut === 'refuse'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              }`}>
                                {existant.statut === 'valide' ? 'Validé' : existant.statut === 'refuse' ? 'Refusé' : 'En attente'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Footer avec bouton d'upload */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                    {(() => {
                      const existant = getJustificatifPourMois(selectedMois, selectedAnnee);
                      const canUpload = !existant || existant.statut === 'refuse' || existant.statut === 'en_attente';
                      
                      return (
                        <>
                          {existant?.statut === 'en_attente' && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 text-center">
                              Un justificatif est déjà en attente. L'upload le remplacera.
                            </p>
                          )}
                          {existant?.statut === 'refuse' && (
                            <p className="text-xs text-red-600 dark:text-red-400 mb-2 text-center">
                              Justificatif refusé. Vous pouvez en envoyer un nouveau.
                            </p>
                          )}
                          <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                            canUpload
                              ? 'border-dashed border-primary-300 dark:border-primary-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-400'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-50'
                          } ${navigoUploading ? 'opacity-50 cursor-wait' : ''}`}>
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,application/pdf"
                              onChange={handleJustificatifMensuelUpload}
                              disabled={navigoUploading || !canUpload}
                              className="hidden"
                            />
                            {navigoUploading ? (
                              <>
                                <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Envoi en cours...</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpTrayIcon className={`w-5 h-5 ${canUpload ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                                <span className={`text-sm font-medium ${canUpload ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`}>
                                  {existant?.statut === 'valide' 
                                    ? 'Déjà validé'
                                    : `Envoyer pour ${getNomMois(selectedMois)} ${selectedAnnee}`
                                  }
                                </span>
                              </>
                            )}
                          </label>
                        </>
                      );
                    })()}
                    
                    <button
                      onClick={() => setShowMoisSelector(false)}
                      className="mt-3 w-full py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal confirmation suppression justificatif mensuel */}
            {justificatifMensuelToDelete && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-900/30">
                      <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      Supprimer le justificatif ?
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Voulez-vous vraiment supprimer le justificatif pour {getNomMois(justificatifMensuelToDelete.mois)} {justificatifMensuelToDelete.annee} ? Vous pourrez en renvoyer un nouveau ensuite.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setJustificatifMensuelToDelete(null)}
                      className="flex-1 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleDeleteJustificatifMensuel(justificatifMensuelToDelete.id)}
                      className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Contenu de l'onglet Sécurité */}
            {activeTab === 'securite' && (
              <Card title="Sécurité du compte" icon={ShieldCheckIcon}>
                <div className="space-y-4">
                  {/* Changement de mot de passe */}
                  <div
                    onClick={() => setShowChangePassword(true)}
                    className="group flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/50 dark:border-slate-700/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/20">
                      <LockClosedIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Mot de passe</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Modifiez votre mot de passe pour sécuriser votre compte
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 transition-colors">
                      <PencilIcon className="w-5 h-5 text-slate-400 group-hover:text-primary-500 dark:group-hover:text-primary-400" />
                    </div>
                  </div>
                  
                  {/* Conseils de sécurité */}
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-800/30">
                        <LightBulbIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">Conseils de sécurité</p>
                        <ul className="space-y-1.5 text-xs text-amber-700 dark:text-amber-300">
                          <li className="flex items-center gap-2">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-amber-600" /> Utilisez au moins 8 caractères
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-amber-600" /> Mélangez majuscules, minuscules et chiffres
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-amber-600" /> Ne partagez jamais votre mot de passe
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Contenu de l'onglet Historique */}
            {activeTab === 'historique' && (
              <Card title="Historique des modifications" icon={ClockIcon}>
                <div className="space-y-3">
                  {historiqueLoading ? (
                    <div className="p-8 text-center">
                      <div className="inline-block w-6 h-6 border-2 border-slate-300 dark:border-slate-600 border-t-primary-500 rounded-full animate-spin" />
                    </div>
                  ) : historique.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
                        <ClockIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aucune modification</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">L'historique de vos modifications apparaîtra ici</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200/50 dark:divide-slate-700/40 rounded-lg overflow-hidden border border-slate-200/50 dark:border-slate-700/40">
                      {historique.map((item) => (
                        <div 
                          key={item.id} 
                          className="px-4 py-3 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 flex items-center justify-center">
                              <PencilIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {item.champ_modifie === 'telephone' && 'Téléphone'}
                                  {item.champ_modifie === 'adresse' && 'Adresse'}
                                  {item.champ_modifie === 'nom' && 'Nom'}
                                  {item.champ_modifie === 'prenom' && 'Prénom'}
                                  {item.champ_modifie === 'email' && 'Email'}
                                  {item.champ_modifie === 'iban' && 'IBAN'}
                                  {!['telephone', 'adresse', 'nom', 'prenom', 'email', 'iban'].includes(item.champ_modifie) && item.champ_modifie}
                                </p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                  {new Date(item.date_modification).toLocaleDateString('fr-FR', {
                                    day: '2-digit', month: 'short', year: 'numeric'
                                  })}
                                </span>
                              </div>
                              <div className="space-y-1.5 mt-2">
                                {item.ancienne_valeur && (
                                  <div className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20">
                                    <span className="text-[10px] text-red-500 dark:text-red-400 pt-0.5 flex-shrink-0">Avant:</span>
                                    <span className="text-xs text-red-600 dark:text-red-300 line-through break-words flex-1">
                                      {item.champ_modifie === 'iban' && item.ancienne_valeur ? 
                                        item.ancienne_valeur.replace(/(.{4})/g, '$1 ').trim() : 
                                        item.ancienne_valeur?.substring(0, 60) + (item.ancienne_valeur?.length > 60 ? '...' : '')
                                      }
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20">
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 pt-0.5 flex-shrink-0">Après:</span>
                                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium break-words flex-1">
                                    {item.champ_modifie === 'iban' && item.nouvelle_valeur ? 
                                      item.nouvelle_valeur.replace(/(.{4})/g, '$1 ').trim() : 
                                      item.nouvelle_valeur?.substring(0, 60) + (item.nouvelle_valeur?.length > 60 ? '...' : '')
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Déconnexion - Visible uniquement sur mobile */}
            <div className="lg:hidden">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200 dark:hover:border-red-800/30 px-3 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-150"
              >
                <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                Se déconnecter
              </button>
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

      {/* Modal Confirmation Suppression Photo */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 animate-[scaleIn_0.3s_ease-out]">
            <div className="p-6">
              {/* Header avec icône */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Supprimer la photo de profil
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Cette action est irréversible
                  </p>
                </div>
              </div>

              {/* Message */}
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Êtes-vous sûr de vouloir supprimer définitivement votre photo de profil ?
                </p>
              </div>

              {/* Boutons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-all duration-200 font-medium text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmPhotoDelete}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white rounded-xl transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  <TrashIcon className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression Justificatif Navigo */}
      {showNavigoDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 animate-[scaleIn_0.3s_ease-out]">
            <div className="p-6">
              {/* Header avec icône */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <TicketIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Supprimer le justificatif Navigo
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Cette action est irréversible
                  </p>
                </div>
              </div>

              {/* Message */}
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700/50">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Êtes-vous sûr de vouloir supprimer votre justificatif Navigo ? Vous devrez en déposer un nouveau pour bénéficier du remboursement.
                  </p>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNavigoDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-all duration-200 font-medium text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmNavigoDelete}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white rounded-xl transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  <TrashIcon className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

  <BottomNav />
    </div>
  );
});

export default ProfilEmploye;
