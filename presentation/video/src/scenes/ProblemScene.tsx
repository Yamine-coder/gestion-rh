import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {COLORS, baseStyle, columnFlex} from '../theme';
import {FadeIn} from '../components/Animations';

const StatCard: React.FC<{icon: string; value: string; label: string; delay: number}> = ({
  icon, value, label, delay,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const y = interpolate(frame - delay, [0, 15], [30, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '40px 32px',
        textAlign: 'center',
        opacity,
        transform: `translateY(${y}px)`,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{fontSize: 48, marginBottom: 16}}>{icon}</div>
      <div style={{fontSize: 56, fontWeight: 800, color: 'white'}}>{value}</div>
      <div style={{fontSize: 16, color: 'rgba(255,255,255,0.5)', marginTop: 10, fontWeight: 500, lineHeight: 1.4}}>
        {label}
      </div>
    </div>
  );
};

export const ProblemScene: React.FC = () => {
  return (
    <div
      style={{
        ...baseStyle,
        ...columnFlex,
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        padding: 80,
      }}
    >
      <FadeIn delay={0}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: COLORS.primary,
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginBottom: 20,
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Le constat
        </p>
      </FadeIn>

      <FadeIn delay={10}>
        <h2
          style={{
            fontSize: 52,
            fontWeight: 800,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #fff, #cbd5e1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 16,
            lineHeight: 1.15,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Les défis de la gestion RH
          <br />
          en restauration
        </h2>
      </FadeIn>

      <FadeIn delay={20}>
        <p
          style={{
            fontSize: 20,
            color: 'rgba(255,255,255,0.55)',
            textAlign: 'center',
            marginBottom: 50,
            maxWidth: 750,
            lineHeight: 1.6,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Planning papier, pointages manuels, anomalies non détectées,
          rapports Excel interminables...
        </p>
      </FadeIn>

      <div style={{display: 'flex', gap: 30}}>
        <StatCard icon="📋" value="3h" label="perdues / semaine en planification" delay={35} />
        <StatCard icon="⚠️" value="40%" label="anomalies non détectées sur papier" delay={50} />
        <StatCard icon="💰" value="2h" label="pour générer les rapports mensuels" delay={65} />
      </div>
    </div>
  );
};
