import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, baseStyle, columnFlex} from '../theme';
import {FadeIn, Glow} from '../components/Animations';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const logoScale = spring({frame, fps, config: {damping: 10, stiffness: 60}});
  const logoY = interpolate(frame, [0, 40], [20, 0], {extrapolateRight: 'clamp'});
  const logoRotate = interpolate(frame, [0, 30], [-5, 0], {extrapolateRight: 'clamp'});

  return (
    <div
      style={{
        ...baseStyle,
        ...columnFlex,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      <Glow x={1400} y={-100} size={600} />
      <Glow x={-100} y={700} size={500} />

      {/* Logo */}
      <div
        style={{
          width: 130,
          height: 130,
          background: COLORS.primary,
          borderRadius: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 64,
          fontWeight: 900,
          color: 'white',
          marginBottom: 40,
          boxShadow: '0 25px 80px rgba(207, 41, 44, 0.4)',
          transform: `scale(${logoScale}) translateY(${logoY}px) rotate(${logoRotate}deg)`,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        A
      </div>

      {/* Title */}
      <FadeIn delay={15} duration={25}>
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #fff, #e2e8f0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            lineHeight: 1.1,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Gestion RH
        </h1>
      </FadeIn>

      {/* Subtitle */}
      <FadeIn delay={30} duration={25}>
        <p
          style={{
            fontSize: 26,
            color: 'rgba(255,255,255,0.6)',
            textAlign: 'center',
            marginTop: 20,
            fontWeight: 400,
            lineHeight: 1.5,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          La solution complète de gestion des ressources humaines
          <br />
          pour la restauration
        </p>
      </FadeIn>

      {/* Tagline */}
      <FadeIn delay={50} duration={20}>
        <p
          style={{
            fontSize: 18,
            color: COLORS.primary,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginTop: 50,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Chez Antoine • Depuis 1970
        </p>
      </FadeIn>
    </div>
  );
};
