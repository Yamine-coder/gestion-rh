import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// ═══ REUSABLE ANIMATION HELPERS ═══

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  style?: React.CSSProperties;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = 20,
  direction = 'up',
  distance = 40,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const opacity = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translate = interpolate(frame - delay, [0, duration], [distance, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const transforms: Record<string, string> = {
    up: `translateY(${translate}px)`,
    down: `translateY(${-translate}px)`,
    left: `translateX(${translate}px)`,
    right: `translateX(${-translate}px)`,
    none: 'none',
  };

  return (
    <div style={{opacity, transform: transforms[direction], ...style}}>
      {children}
    </div>
  );
};

interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}

export const ScaleIn: React.FC<ScaleInProps> = ({children, delay = 0, style = {}}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: {damping: 12, stiffness: 80},
  });

  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{opacity, transform: `scale(${scale})`, ...style}}>
      {children}
    </div>
  );
};

// ═══ BACKGROUND GLOW ═══
interface GlowProps {
  x: number;
  y: number;
  size?: number;
  color?: string;
}

export const Glow: React.FC<GlowProps> = ({x, y, size = 500, color = 'rgba(207,41,44,0.08)'}) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 60) * 10;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + drift,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        pointerEvents: 'none',
      }}
    />
  );
};

// ═══ PROGRESS BAR ═══
interface ProgressBarProps {
  progress: number; // 0 to 1
}

export const ProgressBar: React.FC<ProgressBarProps> = ({progress}) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: `${progress * 100}%`,
      height: 5,
      background: 'linear-gradient(90deg, #cf292c, #ff6b6b)',
      zIndex: 100,
    }}
  />
);
