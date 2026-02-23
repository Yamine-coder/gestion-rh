import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, baseStyle, columnFlex} from '../theme';
import {FadeIn, Glow} from '../components/Animations';

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const logoScale = spring({frame, fps, config: {damping: 10, stiffness: 60}});

  return (
    <div style={{
      ...baseStyle, ...columnFlex,
      background: `linear-gradient(135deg, ${COLORS.primaryDark}, ${COLORS.primary}, #e74c3c)`,
    }}>
      <Glow x={800} y={200} size={600} color="rgba(255,255,255,0.05)" />

      {/* Logo */}
      <div style={{
        width: 120, height: 120, background: 'rgba(255,255,255,0.2)', borderRadius: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 58, fontWeight: 900, color: 'white', marginBottom: 40,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        transform: `scale(${logoScale})`,
        fontFamily: 'Inter, sans-serif',
      }}>
        A
      </div>

      <FadeIn delay={15}>
        <h1 style={{fontSize: 64, fontWeight: 800, color: 'white', textAlign: 'center', marginBottom: 20, fontFamily: 'Inter, sans-serif'}}>
          Merci !
        </h1>
      </FadeIn>

      <FadeIn delay={30}>
        <p style={{fontSize: 24, color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontWeight: 500, fontFamily: 'Inter, sans-serif'}}>
          Gestion RH — Simplifiez votre quotidien
        </p>
      </FadeIn>

      <FadeIn delay={45}>
        <p style={{
          fontSize: 18, color: 'rgba(255,255,255,0.6)', textAlign: 'center',
          marginTop: 40, fontWeight: 500, letterSpacing: 1, fontFamily: 'Inter, sans-serif',
        }}>
          gestion-rh-five.vercel.app
        </p>
      </FadeIn>
    </div>
  );
};
