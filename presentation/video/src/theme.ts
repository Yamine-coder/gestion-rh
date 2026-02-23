import React from 'react';

// ═══ BRAND COLORS ═══
export const COLORS = {
  primary: '#cf292c',
  primaryDark: '#a01e21',
  primaryLight: '#f8d7d8',
  dark: '#1a1a2e',
  darkAlt: '#0f172a',
  darkCard: '#16213e',
  surface: '#1e293b',
  surfaceLight: '#334155',
  gray: '#64748b',
  grayLight: '#94a3b8',
  light: '#f8fafc',
  white: '#ffffff',
  green: '#22c55e',
  greenDark: '#16a34a',
  orange: '#f97316',
  yellow: '#eab308',
  blue: '#3b82f6',
  blueDark: '#2563eb',
  purple: '#8b5cf6',
  red: '#ef4444',
};

// ═══ VIDEO SETTINGS ═══
export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
};

// ═══ SCENE DURATIONS (in frames at 30fps) ═══
export const SCENE_FRAMES = {
  intro: 180,       // 6s
  problem: 240,     // 8s
  dashboard: 300,   // 10s
  planning: 300,    // 10s
  pointage: 270,    // 9s
  anomalies: 300,   // 10s
  rapports: 270,    // 9s
  features: 270,    // 9s
  techStack: 210,   // 7s
  outro: 180,       // 6s
};

export const TOTAL_FRAMES = Object.values(SCENE_FRAMES).reduce((a, b) => a + b, 0);

// ═══ SHARED STYLES ═══
export const FONTS = {
  base: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
};

export const baseStyle: React.CSSProperties = {
  width: VIDEO.width,
  height: VIDEO.height,
  fontFamily: FONTS.base,
  overflow: 'hidden',
  position: 'relative',
};

export const centerFlex: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const columnFlex: React.CSSProperties = {
  ...centerFlex,
  flexDirection: 'column',
};
