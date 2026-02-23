import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, baseStyle} from '../theme';
import {FadeIn, Glow} from '../components/Animations';

export const RapportsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const cardScale = spring({frame: frame - 25, fps, config: {damping: 14, stiffness: 60}});
  const cardOp = interpolate(frame - 25, [0, 15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div style={{
      ...baseStyle, display: 'flex', alignItems: 'center',
      background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '0 80px', gap: 70,
    }}>
      <Glow x={-100} y={300} size={400} color="rgba(34,197,94,0.05)" />

      {/* Left */}
      <div style={{flex: 1, maxWidth: '42%'}}>
        <FadeIn delay={0}>
          <p style={{fontSize: 14, fontWeight: 700, color: COLORS.primary, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 18, fontFamily: 'Inter, sans-serif'}}>Rapports & Exports</p>
        </FadeIn>
        <FadeIn delay={10}>
          <h2 style={{fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, background: 'linear-gradient(135deg, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'Inter, sans-serif'}}>
            Rapports<br />en 1 clic
          </h2>
        </FadeIn>
        <FadeIn delay={20}>
          <p style={{fontSize: 18, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', marginBottom: 36, fontFamily: 'Inter, sans-serif'}}>
            Générez les fiches de présence, rapports d'heures et exports Excel pour la paie en quelques secondes.
          </p>
        </FadeIn>
        {[
          {icon: '📄', text: 'Fiche de présence mensuelle', d: 35},
          {icon: '📊', text: 'Rapport d\'heures détaillé par employé', d: 45},
          {icon: '📥', text: 'Export Excel pour la comptabilité', d: 55},
          {icon: '🚇', text: 'Justificatifs Navigo intégrés', d: 65},
          {icon: '📦', text: 'Export ZIP (Excel + justificatifs)', d: 75},
        ].map(({icon, text, d}) => (
          <FadeIn key={text} delay={d} direction="left" distance={25}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, fontFamily: 'Inter, sans-serif'}}>
              <div style={{width: 44, height: 44, background: 'rgba(207,41,44,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0}}>{icon}</div>
              <span style={{fontSize: 18, color: 'rgba(255,255,255,0.8)', fontWeight: 500}}>{text}</span>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Right - Export card */}
      <div style={{flex: 1, display: 'flex', justifyContent: 'center', opacity: cardOp, transform: `scale(${cardScale})`}}>
        <div style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24, padding: 40, maxWidth: 480, width: '100%', fontFamily: 'Inter, sans-serif',
        }}>
          {/* Header */}
          <div style={{display: 'flex', alignItems: 'center', gap: 18, marginBottom: 30}}>
            <div style={{fontSize: 40}}>📊</div>
            <div>
              <div style={{fontSize: 20, fontWeight: 700, color: 'white'}}>Export Fiche de Présence</div>
              <div style={{fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4}}>Février 2026 • 22 employés</div>
            </div>
          </div>
          {/* Stats */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, marginBottom: 20,
          }}>
            {[
              {label: 'Heures planifiées', value: '3 420h', color: 'white'},
              {label: 'Heures travaillées', value: '3 285h', color: '#22c55e'},
              {label: 'Écart', value: '-135h (3.9%)', color: '#f97316'},
            ].map(({label, value, color}, i) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 16,
                color: 'rgba(255,255,255,0.6)', marginBottom: i < 2 ? 14 : 0,
              }}>
                <span>{label}</span>
                <span style={{color, fontWeight: 700}}>{value}</span>
              </div>
            ))}
          </div>
          {/* Buttons */}
          <div style={{display: 'flex', gap: 12}}>
            <div style={{
              flex: 1, background: '#22c55e', color: 'white', fontSize: 15, fontWeight: 700,
              textAlign: 'center', padding: 16, borderRadius: 12,
            }}>📥 Excel</div>
            <div style={{
              flex: 1, background: COLORS.primary, color: 'white', fontSize: 15, fontWeight: 700,
              textAlign: 'center', padding: 16, borderRadius: 12,
            }}>📦 ZIP</div>
          </div>
        </div>
      </div>
    </div>
  );
};
