import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function DatePickerCustom({ value, onChange, min, label, error, placeholder = "Sélectionner une date", position = "left", compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value);
    if (min) return new Date(min);
    return new Date();
  });
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, openUp: false });
  
  const containerRef = useRef(null);
  const mobileCalendarRef = useRef(null);
  const desktopCalendarRef = useRef(null);
  
  // Calculer la position optimale du dropdown
  const calculatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 320; // Hauteur estimée du calendrier
    const dropdownWidth = 260;
    const margin = 8;
    
    // Vérifier si on a assez d'espace en bas
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < dropdownHeight + margin && spaceAbove > spaceBelow;
    
    // Calculer la position horizontale
    let left = rect.left;
    if (position === 'right') {
      left = rect.right - dropdownWidth;
    }
    // S'assurer que le dropdown ne dépasse pas à droite
    if (left + dropdownWidth > window.innerWidth - 16) {
      left = window.innerWidth - dropdownWidth - 16;
    }
    // S'assurer que le dropdown ne dépasse pas à gauche
    if (left < 16) left = 16;
    
    setDropdownPosition({
      top: openUp ? rect.top - dropdownHeight - margin : rect.bottom + margin,
      left,
      openUp
    });
  };
  
  // Recalculer la position à l'ouverture et au scroll
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
      return () => {
        window.removeEventListener('scroll', calculatePosition, true);
        window.removeEventListener('resize', calculatePosition);
      };
    }
  }, [isOpen]);
  
  // Fermer si clic en dehors (mais pas pour les calendriers qui sont dans des portals)
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Si le clic est dans le calendrier mobile, ne rien faire
      if (mobileCalendarRef.current && mobileCalendarRef.current.contains(e.target)) {
        return;
      }
      // Si le clic est dans le calendrier desktop, ne rien faire
      if (desktopCalendarRef.current && desktopCalendarRef.current.contains(e.target)) {
        return;
      }
      // Si le clic est dans le container principal (bouton trigger), ne rien faire
      if (containerRef.current && containerRef.current.contains(e.target)) {
        return;
      }
      // Sinon fermer
      setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Générer les jours du mois
  const getDaysInMonth = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Ajuster pour commencer le lundi (0 = lundi, 6 = dimanche)
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    
    const days = [];
    
    // Jours du mois précédent
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }
    
    // Jours du mois actuel
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // Jours du mois suivant (compléter jusqu'à 35 max pour 5 lignes)
    const totalDays = days.length <= 35 ? 35 : 42;
    const remainingDays = totalDays - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  };

  const isDateDisabled = (date) => {
    if (!min) return false;
    const minDate = new Date(min);
    minDate.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < minDate;
  };

  const isSelected = (date) => {
    if (!value) return false;
    const selected = new Date(value);
    return date.getDate() === selected.getDate() &&
           date.getMonth() === selected.getMonth() &&
           date.getFullYear() === selected.getFullYear();
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const handleSelect = (date) => {
    if (isDateDisabled(date)) return;
    // Formater en local (évite le décalage UTC de toISOString)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const formatDisplayDate = () => {
    if (!value) return null;
    const date = new Date(value);
    if (compact) {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short'
      });
    }
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className={`relative ${compact ? '' : 'space-y-2'}`} ref={containerRef}>
      {label && !compact && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
          {label}
        </label>
      )}
      
      {/* Bouton trigger - responsive ou compact */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={compact 
          ? `flex items-center gap-2 px-2.5 py-1.5 border rounded-lg text-left transition-all bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500/50 ${
            value 
              ? 'border-slate-300 text-slate-700' 
              : 'border-slate-200 text-slate-400'
          } ${error ? 'border-rose-400' : ''}`
          : `w-full flex items-center gap-3 px-3 sm:px-4 py-3 border rounded-xl text-left transition-all bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 ${
            error 
              ? 'border-rose-400 dark:border-rose-600' 
              : 'border-slate-300 dark:border-slate-600'
          }`
        }
      >
        <Calendar className={compact ? "w-3.5 h-3.5 text-slate-400 flex-shrink-0" : "w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0"} />
        <span className={compact 
          ? `text-xs ${value ? 'text-slate-700 font-medium' : 'text-slate-400'}`
          : `flex-1 text-sm ${value ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-400 dark:text-slate-500'}`
        }>
          {formatDisplayDate() || placeholder}
        </span>
      </button>

      {/* Calendrier en overlay */}
      {isOpen && (
        <>
          {/* ========== MOBILE: Bottom Sheet (rendu via Portal) ========== */}
          {createPortal(
            <div className="lg:hidden" ref={mobileCalendarRef}>
              {/* Backdrop sombre - couvre TOUT l'écran */}
              <div 
                className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" 
                onClick={() => setIsOpen(false)} 
              />
              
              {/* Bottom Sheet */}
              <div className="fixed inset-x-0 bottom-0 z-[101] animate-in slide-in-from-bottom duration-300">
                <div className="bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden">
                  {/* Poignée de drag */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>
                
                {/* Header avec titre et fermer */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-base font-semibold text-slate-900 dark:text-white">
                    {label || 'Choisir une date'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Navigation mois */}
                <div className="flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-slate-800/50">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-sm text-slate-600 dark:text-slate-300 active:scale-95"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {MOIS[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-sm text-slate-600 dark:text-slate-300 active:scale-95"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Jours de la semaine */}
                <div className="grid grid-cols-7 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  {JOURS.map(jour => (
                    <div key={jour} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      {jour}
                    </div>
                  ))}
                </div>

                {/* Grille des jours - Grande taille tactile (44px min) */}
                <div className="grid grid-cols-7 gap-1 p-4">
                  {getDaysInMonth().map((item, idx) => {
                    const disabled = isDateDisabled(item.date);
                    const selected = isSelected(item.date);
                    const today = isToday(item.date);
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelect(item.date)}
                        disabled={disabled}
                        className={`
                          min-h-[44px] flex items-center justify-center rounded-xl text-base font-medium transition-all active:scale-95
                          ${!item.isCurrentMonth ? 'text-slate-300 dark:text-slate-600' : ''}
                          ${item.isCurrentMonth && !disabled && !selected ? 'text-slate-700 dark:text-slate-200 active:bg-slate-100 dark:active:bg-slate-800' : ''}
                          ${disabled ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'cursor-pointer'}
                          ${selected ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : ''}
                          ${today && !selected ? 'ring-2 ring-primary-500 font-bold text-primary-600 dark:text-primary-400' : ''}
                        `}
                      >
                        {item.day}
                      </button>
                    );
                  })}
                </div>

                {/* Footer avec bouton Aujourd'hui */}
                <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 safe-area-inset-bottom">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      if (!isDateDisabled(today)) {
                        setViewDate(today);
                        handleSelect(today);
                      }
                    }}
                    className="w-full py-3 text-base font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-xl active:scale-[0.98] transition-transform"
                  >
                    Aujourd'hui
                  </button>
                </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* ========== DESKTOP: Dropdown via Portal ========== */}
          {createPortal(
            <div className="hidden lg:block" ref={desktopCalendarRef}>
              {/* Backdrop invisible pour fermer */}
              <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
              
              {/* Dropdown positionné dynamiquement */}
              <div 
                className={`fixed z-[9999] transition-all duration-200 ease-out ${
                  dropdownPosition.openUp 
                    ? 'animate-in fade-in slide-in-from-bottom-2' 
                    : 'animate-in fade-in slide-in-from-top-2'
                }`}
                style={{
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: 260,
                }}
              >
                <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                  style={{ boxShadow: '0 20px 40px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)' }}
                >
                  {/* Header navigation - design premium */}
                  <div className="flex items-center justify-between px-2 py-2 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all active:scale-90"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-slate-800 tracking-tight">
                      {MOIS[viewDate.getMonth()]} {viewDate.getFullYear()}
                    </span>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all active:scale-90"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Jours de la semaine */}
                  <div className="grid grid-cols-7 px-2 py-1.5">
                    {JOURS.map(jour => (
                      <div key={jour} className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {jour}
                      </div>
                    ))}
                  </div>

                  {/* Grille des jours - optimisée */}
                  <div className="grid grid-cols-7 gap-0.5 px-2 pb-2">
                    {getDaysInMonth().map((item, idx) => {
                      const disabled = isDateDisabled(item.date);
                      const selected = isSelected(item.date);
                      const today = isToday(item.date);
                      
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelect(item.date)}
                          disabled={disabled}
                          className={`
                            w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all
                            ${!item.isCurrentMonth ? 'text-slate-300' : ''}
                            ${item.isCurrentMonth && !disabled && !selected ? 'text-slate-700 hover:bg-slate-100 active:scale-95' : ''}
                            ${disabled ? 'text-slate-200 cursor-not-allowed' : 'cursor-pointer'}
                            ${selected ? 'bg-[#cf292c] text-white shadow-lg shadow-red-500/25 scale-105' : ''}
                            ${today && !selected ? 'bg-red-50 text-[#cf292c] font-bold ring-1 ring-[#cf292c]/30' : ''}
                          `}
                        >
                          {item.day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer minimaliste */}
                  <div className="flex items-center justify-center px-2 py-2 bg-slate-50 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        if (!isDateDisabled(today)) {
                          setViewDate(today);
                          handleSelect(today);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-[#cf292c] hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Aujourd'hui
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}

export default DatePickerCustom;
