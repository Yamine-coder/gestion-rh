import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, baseStyle} from '../theme';
import {FadeIn, Glow} from '../components/Animations';

export const PointageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Badge button pulse
  const pulse = interpolate(frame % 60, [0, 30, 60], [1, 1.06, 1]);
  const phoneScale = spring({frame: frame - 15, fps, config: {damping: 12, stiffness: 50}});
  const phoneOp = interpolate(frame - 15, [0, 15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div
      style={{
        ...baseStyle,
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        padding: '0 80px',
        gap: 80,
      }}
    >
      <Glow x={-150} y={200} size={400} color="rgba(34,197,94,0.06)" />

      {/* Left text */}
      <div style={{flex: 1, maxWidth: '42%'}}>
        <FadeIn delay={0}>
          <p style={{fontSize: 14, fontWeight: 700, color: COLORS.primary, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 18, fontFamily: 'Inter, sans-serif'}}>
            Pointage
          </p>
        </FadeIn>
        <FadeIn delay={10}>
          <h2 style={{fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, background: 'linear-gradient(135deg, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'Inter, sans-serif'}}>
            Badgeage<br />en 1 clic
          </h2>
        </FadeIn>
        <FadeIn delay={20}>
          <p style={{fontSize: 18, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', marginBottom: 36, fontFamily: 'Inter, sans-serif'}}>
            L'employé pointe son arrivée et son départ depuis une tablette ou son téléphone. Détection instantanée des anomalies.
          </p>
        </FadeIn>
        {[
          {icon: '📱', text: 'Interface tactile (tablette restaurant)', d: 35},
          {icon: '⚡', text: 'Détection temps réel des retards', d: 45},
          {icon: '🔒', text: 'Anti-doublon automatique (5s)', d: 55},
          {icon: '🌙', text: 'Shifts de nuit (passage minuit)', d: 65},
          {icon: '📊', text: 'Score de ponctualité automatique', d: 75},
        ].map(({icon, text, d}) => (
          <FadeIn key={text} delay={d} direction="left" distance={25}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, fontFamily: 'Inter, sans-serif'}}>
              <div style={{width: 44, height: 44, background: 'rgba(207,41,44,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0}}>{icon}</div>
              <span style={{fontSize: 18, color: 'rgba(255,255,255,0.8)', fontWeight: 500}}>{text}</span>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Right - Phone mockup */}
      <div style={{flex: 1, display: 'flex', justifyContent: 'center', opacity: phoneOp, transform: `scale(${phoneScale})`}}>
        <div style={{width: 300, background: '#0f172a', borderRadius: 44, padding: 16, boxShadow: '0 30px 80px rgba(0,0,0,0.5)'}}>
          <div style={{background: '#1e293b', borderRadius: 30, overflow: 'hidden'}}>
            {/* App header bar */}
            <div style={{height: 44, background: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Inter, sans-serif'}}>
              Chez Antoine
            </div>
            {/* Content */}
            <div style={{padding: '36px 24px', textAlign: 'center'}}>
              <div style={{fontSize: 14, color: '#94a3b8', fontFamily: 'Inter, sans-serif'}}>Bonjour</div>
              <div style={{fontSize: 24, fontWeight: 700, color: 'white', marginTop: 4, marginBottom: 30, fontFamily: 'Inter, sans-serif'}}>
                Suhel Ahmed
              </div>
              {/* Badge button */}
              <div
                style={{
                  width: 110,
                  height: 110,
                  margin: '0 auto 28px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 44,
                  boxShadow: '0 12px 40px rgba(34,197,94,0.35)',
                  transform: `scale(${pulse})`,
                }}
              >
                👆
              </div>
              <div style={{fontSize: 16, fontWeight: 700, color: '#22c55e', marginBottom: 8, fontFamily: 'Inter, sans-serif'}}>
                Pointer mon arrivée
              </div>
              <div style={{fontSize: 12, color: '#64748b', fontFamily: 'Inter, sans-serif'}}>Shift prévu : 19:30 - 00:30</div>
              <div style={{marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)'}}>
                <div style={{fontSize: 11, color: '#64748b', fontFamily: 'Inter, sans-serif'}}>Aujourd'hui</div>
                <div style={{fontSize: 14, color: 'white', fontWeight: 600, marginTop: 4, fontFamily: 'Inter, sans-serif'}}>0h00 travaillées</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
