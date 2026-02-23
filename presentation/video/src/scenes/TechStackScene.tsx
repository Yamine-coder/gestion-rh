import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {COLORS, baseStyle, columnFlex} from '../theme';
import {FadeIn} from '../components/Animations';

const stack = [
  {icon: '⚛️', name: 'React', desc: 'Frontend • Tailwind CSS'},
  {icon: '🟢', name: 'Node.js', desc: 'Backend • Express • Prisma'},
  {icon: '🐘', name: 'PostgreSQL', desc: 'Base de données • Neon'},
  {icon: '▲', name: 'Vercel', desc: 'Frontend hébergé'},
  {icon: '🚀', name: 'Render', desc: 'Backend hébergé'},
  {icon: '🔄', name: 'CI/CD', desc: 'Déploiement automatique'},
];

export const TechStackScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{
      ...baseStyle, ...columnFlex,
      background: 'linear-gradient(135deg, #0f172a, #1a1a2e)',
      padding: 80,
    }}>
      <FadeIn delay={0}>
        <p style={{fontSize: 14, fontWeight: 700, color: COLORS.primary, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 18, textAlign: 'center', fontFamily: 'Inter, sans-serif'}}>
          Architecture
        </p>
      </FadeIn>
      <FadeIn delay={10}>
        <h2 style={{
          fontSize: 52, fontWeight: 800, textAlign: 'center', marginBottom: 12,
          background: 'linear-gradient(135deg, #fff, #cbd5e1)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontFamily: 'Inter, sans-serif',
        }}>
          Stack technique
        </h2>
      </FadeIn>
      <FadeIn delay={18}>
        <p style={{fontSize: 20, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 50, fontFamily: 'Inter, sans-serif'}}>
          Application web moderne, déployée dans le cloud
        </p>
      </FadeIn>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, maxWidth: 900, width: '100%'}}>
        {stack.map((s, i) => {
          const delay = 30 + i * 10;
          const op = interpolate(frame - delay, [0, 15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const y = interpolate(frame - delay, [0, 15], [30, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

          return (
            <div key={s.name} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20, padding: '36px 24px', textAlign: 'center',
              opacity: op, transform: `translateY(${y}px)`, fontFamily: 'Inter, sans-serif',
            }}>
              <div style={{fontSize: 40, marginBottom: 16}}>{s.icon}</div>
              <div style={{fontSize: 26, fontWeight: 800, color: 'white'}}>{s.name}</div>
              <div style={{fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 8, fontWeight: 500}}>{s.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
