import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

function TimePickerCustom({ 
  value, 
  onChange, 
  placeholder = "Heure",
  compact = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, openUp: false });
  
  // Parser la valeur (format HH:MM)
  const parseTime = (timeStr) => {
    if (!timeStr) {
      // Arrondir à l'heure la plus proche
      const now = new Date();
      const mins = now.getMinutes();
      const roundedMins = mins < 30 ? 0 : 30;
      return { hours: now.getHours(), minutes: roundedMins };
    }
    const [h, m] = timeStr.split(':').map(Number);
    return { hours: h || 0, minutes: m || 0 };
  };
  
  const { hours: selectedHours, minutes: selectedMinutes } = parseTime(value);
  
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  
  // Calculer la position du dropdown
  const calculatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 280;
    const dropdownWidth = 180;
    const margin = 8;
    
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < dropdownHeight + margin && spaceAbove > spaceBelow;
    
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 16) {
      left = window.innerWidth - dropdownWidth - 16;
    }
    if (left < 16) left = 16;
    
    setDropdownPosition({
      top: openUp ? rect.top - dropdownHeight - margin : rect.bottom + margin,
      left,
      openUp
    });
  }, []);
  
  // Scroller vers les valeurs sélectionnées
  const scrollToSelected = useCallback(() => {
    setTimeout(() => {
      if (hoursRef.current) {
        const hourElement = hoursRef.current.querySelector(`[data-hour="${selectedHours}"]`);
        if (hourElement) {
          hourElement.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      }
      if (minutesRef.current) {
        const minElement = minutesRef.current.querySelector(`[data-minute="${selectedMinutes}"]`);
        if (minElement) {
          minElement.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      }
    }, 50);
  }, [selectedHours, selectedMinutes]);
  
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      scrollToSelected();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
      return () => {
        window.removeEventListener('scroll', calculatePosition, true);
        window.removeEventListener('resize', calculatePosition);
      };
    }
  }, [isOpen, calculatePosition, scrollToSelected]);
  
  // Fermer si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      if (containerRef.current && containerRef.current.contains(e.target)) return;
      setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  const handleSelect = (hours, minutes) => {
    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };
  
  const formatDisplay = () => {
    if (!value) return null;
    return value;
  };
  
  // Générer les heures (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Générer les minutes (0, 5, 10, ..., 55)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="relative" ref={containerRef}>
      {/* Bouton trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-left transition-all bg-white hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20 ${
          value 
            ? 'border-slate-300 text-slate-700' 
            : 'border-slate-200 text-slate-400'
        }`}
      >
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-medium whitespace-nowrap">
          {formatDisplay() || placeholder}
        </span>
      </button>

      {/* Dropdown via Portal */}
      {isOpen && createPortal(
        <div ref={dropdownRef}>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown */}
          <div 
            className={`fixed z-[9999] transition-all duration-200 ease-out ${
              dropdownPosition.openUp 
                ? 'animate-in fade-in slide-in-from-bottom-2' 
                : 'animate-in fade-in slide-in-from-top-2'
            }`}
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: 180,
            }}
          >
            <div 
              className="bg-white rounded-xl overflow-hidden border border-slate-200"
              style={{ boxShadow: '0 20px 40px -12px rgba(0,0,0,0.25)' }}
            >
              {/* Header */}
              <div className="px-3 py-2 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
                <div className="text-center">
                  <span className="text-lg font-bold text-[#cf292c]">
                    {String(selectedHours).padStart(2, '0')}:{String(selectedMinutes).padStart(2, '0')}
                  </span>
                </div>
              </div>
              
              {/* Sélecteurs */}
              <div className="flex divide-x divide-slate-100">
                {/* Heures */}
                <div className="flex-1 flex flex-col">
                  <div className="text-center text-[10px] font-semibold text-slate-400 uppercase py-1 bg-slate-50">
                    Heure
                  </div>
                  <div 
                    ref={hoursRef}
                    className="h-[180px] overflow-y-auto scrollbar-thin"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {hours.map(h => (
                      <button
                        key={h}
                        type="button"
                        data-hour={h}
                        onClick={() => handleSelect(h, selectedMinutes)}
                        className={`w-full py-2 text-sm font-medium transition-all ${
                          h === selectedHours
                            ? 'bg-[#cf292c] text-white'
                            : 'text-slate-600 hover:bg-red-50'
                        }`}
                      >
                        {String(h).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Minutes */}
                <div className="flex-1 flex flex-col">
                  <div className="text-center text-[10px] font-semibold text-slate-400 uppercase py-1 bg-slate-50">
                    Min.
                  </div>
                  <div 
                    ref={minutesRef}
                    className="h-[180px] overflow-y-auto scrollbar-thin"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {minutes.map(m => (
                      <button
                        key={m}
                        type="button"
                        data-minute={m}
                        onClick={() => handleSelect(selectedHours, m)}
                        className={`w-full py-2 text-sm font-medium transition-all ${
                          m === selectedMinutes
                            ? 'bg-[#cf292c] text-white'
                            : 'text-slate-600 hover:bg-red-50'
                        }`}
                      >
                        {String(m).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Footer avec raccourcis */}
              <div className="flex items-center justify-center gap-2 px-2 py-2 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSelect(9, 0)}
                  className="px-2 py-1 text-[10px] font-medium text-[#cf292c] hover:bg-red-50 rounded transition-colors"
                >
                  9h
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect(12, 0)}
                  className="px-2 py-1 text-[10px] font-medium text-[#cf292c] hover:bg-red-50 rounded transition-colors"
                >
                  12h
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect(14, 0)}
                  className="px-2 py-1 text-[10px] font-medium text-[#cf292c] hover:bg-red-50 rounded transition-colors"
                >
                  14h
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect(18, 0)}
                  className="px-2 py-1 text-[10px] font-medium text-[#cf292c] hover:bg-red-50 rounded transition-colors"
                >
                  18h
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default TimePickerCustom;
