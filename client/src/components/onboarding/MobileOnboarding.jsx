import React, { useState } from 'react';

/**
 * 🎯 Onboarding Mobile - Illustrations Popsy (style Storyset)
 * Contexte RH : planning, pointage, échange
 */

// Import des illustrations Storyset
import scheduleImg from '../../assets/onboarding/A whole year-pana.svg';
import timeImg from '../../assets/onboarding/QR Code-pana.svg';
import exchangeImg from '../../assets/onboarding/brand loyalty-pana.svg';
import vacationImg from '../../assets/onboarding/travel selfie-pana.svg';
import badgesImg from '../../assets/onboarding/Success factors-pana.svg';

const slides = [
  {
    id: 1,
    title: "Consultez votre planning",
    description: "Visualisez vos shifts de la semaine en un coup d'œil. Service midi, soir ou journée complète, tout est clairement indiqué.",
    image: scheduleImg
  },
  {
    id: 2,
    title: "Scannez pour pointer", 
    description: "Scannez le QR code à votre arrivée et départ. Simple, rapide et précis.",
    image: timeImg
  },
  {
    id: 3,
    title: "Échangez vos shifts",
    description: "Besoin de changer un créneau ? Proposez un échange à vos collègues directement depuis l'application.",
    image: exchangeImg
  },
  {
    id: 4,
    title: "Faites vos demandes",
    description: "Congés, absences, récupérations... Soumettez vos demandes en quelques clics et suivez leur validation.",
    image: vacationImg
  },
  {
    id: 5,
    title: "Gagnez des badges",
    description: "Ponctualité, assiduité, esprit d'équipe... Collectionnez des badges et améliorez votre score !",
    image: badgesImg
  }
];

export default function MobileOnboarding({ onComplete, userName }) {
  const [current, setCurrent] = useState(0);
  
  const isLast = current === slides.length - 1;
  const isFirst = current === 0;
  const slide = slides[current];

  const next = () => {
    if (isLast) {
      localStorage.setItem('onboarding_done', '1');
      onComplete?.();
    } else {
      setCurrent(c => c + 1);
    }
  };

  const prev = () => {
    if (!isFirst) {
      setCurrent(c => c - 1);
    }
  };

  const skip = () => {
    localStorage.setItem('onboarding_done', '1');
    onComplete?.();
  };

  // Titre personnalisé pour le premier slide
  const title = current === 0 && userName 
    ? `${userName}, consultez votre planning`
    : slide.title;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <div className="text-sm">
          <span className="font-semibold text-gray-900">{current + 1}</span>
          <span className="text-gray-400">/{slides.length}</span>
        </div>
        <button
          onClick={skip}
          className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Illustration */}
      <div 
        className="flex-1 flex items-center justify-center px-6 py-4"
        key={slide.id}
        style={{ animation: 'fadeIn 0.4s ease-out' }}
      >
        <div className="w-full max-w-[280px] aspect-square flex items-center justify-center">
          <img 
            src={slide.image} 
            alt={slide.title}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Contenu texte */}
      <div 
        className="px-8 pb-6"
        key={`text-${slide.id}`}
        style={{ animation: 'slideUp 0.4s ease-out' }}
      >
        <h1 className="text-[22px] font-bold text-gray-900 text-center mb-3 leading-tight">
          {title}
        </h1>
        <p className="text-[15px] text-gray-500 text-center leading-relaxed">
          {slide.description}
        </p>
      </div>

      {/* Footer - Navigation */}
      <div className="flex items-center justify-between px-6 pb-10">
        {/* Prev button */}
        <button
          onClick={prev}
          disabled={isFirst}
          className={`text-sm font-medium transition-colors min-w-[60px] ${
            isFirst 
              ? 'text-transparent pointer-events-none' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Prev
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <div 
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current 
                  ? 'w-6 bg-primary-600' 
                  : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Next / Get Started button */}
        <button
          onClick={next}
          className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors min-w-[60px] text-right"
        >
          {isLast ? 'Commencer' : 'Next'}
        </button>
      </div>

      {/* Animations CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Hook pour vérifier si l'onboarding doit être affiché
// Utilise l'ID utilisateur pour que chaque nouvel employé ait son propre tutoriel
export function useOnboarding() {
  const [show, setShow] = useState(() => {
    // Récupérer l'ID utilisateur depuis le token ou localStorage
    const userId = localStorage.getItem('userId');
    const onboardingKey = userId ? `onboarding_done_${userId}` : 'onboarding_done';
    
    // Vérifier si ce user spécifique a déjà fait l'onboarding
    return !localStorage.getItem(onboardingKey);
  });

  const completeOnboarding = () => {
    const userId = localStorage.getItem('userId');
    const onboardingKey = userId ? `onboarding_done_${userId}` : 'onboarding_done';
    localStorage.setItem(onboardingKey, 'true');
    setShow(false);
  };

  const resetOnboarding = () => {
    const userId = localStorage.getItem('userId');
    const onboardingKey = userId ? `onboarding_done_${userId}` : 'onboarding_done';
    localStorage.removeItem(onboardingKey);
    setShow(true);
  };

  return {
    showOnboarding: show,
    completeOnboarding,
    resetOnboarding
  };
}
