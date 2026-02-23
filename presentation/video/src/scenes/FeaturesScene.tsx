import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {COLORS, baseStyle, columnFlex} from '../theme';
import {FadeIn} from '../components/Animations';

const features = [
  {icon: '👥', title: 'Gestion des employés', desc: 'Fiches complètes, documents, statuts, catégories'},
  {icon: '🏖️', title: 'Congés & Absences', desc: 'Demandes, validation, solde CP automatique'},
  {icon: '⭐', title: 'Avis Google', desc: 'Widget intégré, analyse IA, réponses générées'},
  {icon: '📧', title: 'Notifications email', desc: 'Alertes anomalies, rappels congés auto'},
  {icon: '🔐', title: 'Multi-rôles', desc: 'Admin, manager, employé — permissions granulaires'},
  {icon: '📱', title: '100% Responsive', desc: 'Tablette, mobile, desktop — partout'},
];

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{
      ...baseStyle, ...columnFlex,
      background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
      padding: 80,
    }}>
      <FadeIn delay={0}>
        <p style={{fontSize: 14, fontWeight: 700, color: COLORS.primary, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 18, textAlign: 'center', fontFamily: 'Inter, sans-serif'}}>
          Et bien plus encore
        </p>
      </FadeIn>
      <FadeIn delay={10}>
        <h2 style={{
          fontSize: 52, fontWeight: 800, textAlign: 'center', marginBottom: 50,
          background: 'linear-gradient(135deg, #fff, #cbd5e1)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontFamily: 'Inter, sans-serif',
        }}>
          Fonctionnalités complètes
        </h2>
      </FadeIn>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900, width: '100%'}}>
        {features.map((f, i) => {
          const delay = 25 + i * 10;
          const op = interpolate(frame - delay, [0, 15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const y = interpolate(frame - delay, [0, 15], [25, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

          return (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 18, padding: '28px 24px', display: 'flex', gap: 20, alignItems: 'flex-start',
              opacity: op, transform: `translateY(${y}px)`, fontFamily: 'Inter, sans-serif',
            }}>
              <div style={{
                width: 56, height: 56, background: 'rgba(207,41,44,0.12)', borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 6}}>{f.title}</div>
                <div style={{fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5}}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
