import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function DatePickerCustom({ value, onChange, min, label, error, placeholder = "Sélectionner une date", position = "left" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value);
    if (min) return new Date(min);
    return new Date();
  });
  
  const containerRef = useRef(null);
  const mobileCalendarRef = useRef(null);
  
  // Fermer si clic en dehors (mais pas pour le calendrier mobile qui est dans un portal)
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Si le calendrier mobile est ouvert et le clic est dedans, ne rien faire
      if (mobileCalendarRef.current && mobileCalendarRef.current.contains(e.target)) {
        return;
      }
      // Si le clic est dans le container principal, ne rien faire
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
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
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
          {label}
        </label>
      )}
      
      {/* Bouton trigger - responsive */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 border rounded-xl text-left transition-all bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 ${
          error 
            ? 'border-rose-400 dark:border-rose-600' 
            : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
        <span className={`flex-1 text-sm ${value ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
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

          {/* ========== DESKTOP: Dropdown compact ========== */}
          <div className="hidden lg:block">
            {/* Backdrop invisible pour fermer */}
            <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
            
            {/* Dropdown positionné */}
            <div className={`absolute w-[280px] top-full mt-2 z-[101] animate-in fade-in slide-in-from-top-2 duration-200 ${
              position === 'right' 
                ? 'left-auto right-0' 
                : 'left-0 right-auto'
            }`}>
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header navigation */}
                <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {MOIS[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Jours de la semaine */}
                <div className="grid grid-cols-7 px-2 py-2 border-b border-slate-100 dark:border-slate-800">
                  {JOURS.map(jour => (
                    <div key={jour} className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      {jour}
                    </div>
                  ))}
                </div>

                {/* Grille des jours - compact */}
                <div className="grid grid-cols-7 gap-0.5 p-2">
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
                          relative aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all active:scale-95
                          ${!item.isCurrentMonth ? 'text-slate-300 dark:text-slate-600' : ''}
                          ${item.isCurrentMonth && !disabled && !selected ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800' : ''}
                          ${disabled ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'cursor-pointer'}
                          ${selected ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30' : ''}
                          ${today && !selected ? 'ring-2 ring-primary-500/50 ring-inset' : ''}
                        `}
                      >
                        {item.day}
                      </button>
                    );
                  })}
                </div>

                {/* Footer compact */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      if (!isDateDisabled(today)) {
                        setViewDate(today);
                        handleSelect(today);
                      }
                    }}
                    className="text-xs font-medium text-primary-600 dark:text-primary-400 px-2.5 py-1 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2.5 py-1 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DatePickerCustom;
