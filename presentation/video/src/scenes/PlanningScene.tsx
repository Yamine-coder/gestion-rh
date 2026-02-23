import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, baseStyle} from '../theme';
import {FadeIn, Glow} from '../components/Animations';

const days = ['Lun 17', 'Mar 18', 'Mer 19', 'Jeu 20', 'Ven 21', 'Sam 22', 'Dim 23'];

interface ShiftData {
  text: string;
  color: string;
}

const employees: {name: string; shifts: ShiftData[]}[] = [
  {
    name: 'S. Ahmed',
    shifts: [
      {text: '11-15 / 19-00', color: '#3b82f6'},
      {text: '11-15 / 19-00', color: '#3b82f6'},
      {text: 'Repos', color: '#94a3b8'},
      {text: '11-15 / 19-00', color: '#3b82f6'},
      {text: '19-01', color: '#8b5cf6'},
      {text: '19-01', color: '#8b5cf6'},
      {text: 'Repos', color: '#94a3b8'},
    ],
  },
  {
    name: 'R. Haque',
    shifts: [
      {text: '9-14 / 18-22', color: '#22c55e'},
      {text: '9-14 / 18-22', color: '#22c55e'},
      {text: '9-14', color: '#22c55e'},
      {text: 'Repos', color: '#94a3b8'},
      {text: '9-14 / 18-22', color: '#22c55e'},
      {text: '9-14 / 18-22', color: '#22c55e'},
      {text: 'Repos', color: '#94a3b8'},
    ],
  },
  {
    name: 'A. Fandino',
    shifts: [
      {text: '18-23', color: '#f97316'},
      {text: '18-23', color: '#f97316'},
      {text: '18-23', color: '#f97316'},
      {text: '18-23', color: '#f97316'},
      {text: '18-23', color: '#f97316'},
      {text: 'Repos', color: '#94a3b8'},
      {text: 'Repos', color: '#94a3b8'},
    ],
  },
  {
    name: 'M. Alam',
    shifts: [
      {text: '11-15 / 19-23', color: '#3b82f6'},
      {text: 'Repos', color: '#94a3b8'},
      {text: '11-15 / 19-23', color: '#3b82f6'},
      {text: '11-15 / 19-23', color: '#3b82f6'},
      {text: '11-15 / 19-23', color: '#3b82f6'},
      {text: '11-23', color: COLORS.primary},
      {text: 'Repos', color: '#94a3b8'},
    ],
  },
  {
    name: 'S. Marquez',
    shifts: [
      {text: '11-15 / 19-23', color: '#3b82f6'},
      {text: '11-15 / 19-23', color: '#3b82f6'},
      {text: 'Repos', color: '#94a3b8'},
      {text: '11-15', color: '#3b82f6'},
      {text: '18-23', color: '#f97316'},
      {text: '18-23', color: '#f97316'},
      {text: 'Repos', color: '#94a3b8'},
    ],
  },
];

export const PlanningScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const mockScale = spring({frame: frame - 20, fps, config: {damping: 14, stiffness: 60}});
  const mockOp = interpolate(frame - 20, [0, 15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div
      style={{
        ...baseStyle,
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        padding: '0 80px',
        gap: 60,
      }}
    >
      <Glow x={1400} y={-50} size={500} color="rgba(59,130,246,0.06)" />

      {/* Left text */}
      <div style={{flex: 1, maxWidth: '38%'}}>
        <FadeIn delay={0}>
          <p style={{fontSize: 14, fontWeight: 700, color: COLORS.primary, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 18, fontFamily: 'Inter, sans-serif'}}>
            Planning RH
          </p>
        </FadeIn>
        <FadeIn delay={10}>
          <h2 style={{fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, background: 'linear-gradient(135deg, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'Inter, sans-serif'}}>
            Planification<br />intelligente
          </h2>
        </FadeIn>
        <FadeIn delay={20}>
          <p style={{fontSize: 18, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', marginBottom: 36, fontFamily: 'Inter, sans-serif'}}>
            Créez et gérez les shifts en quelques clics. Vue jour, semaine ou mois avec comparaison planning/réalité.
          </p>
        </FadeIn>
        {[
          {icon: '📅', text: 'Vues Jour / Semaine / Mois', d: 35},
          {icon: '🔄', text: 'Comparaison Planning vs Réalité', d: 45},
          {icon: '✂️', text: 'Multi-segments (coupures, pauses)', d: 55},
          {icon: '🌙', text: 'Shifts de nuit (passage minuit)', d: 65},
        ].map(({icon, text, d}) => (
          <FadeIn key={text} delay={d} direction="left" distance={25}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, fontFamily: 'Inter, sans-serif'}}>
              <div style={{width: 44, height: 44, background: 'rgba(207,41,44,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0}}>{icon}</div>
              <span style={{fontSize: 18, color: 'rgba(255,255,255,0.8)', fontWeight: 500}}>{text}</span>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Right - Planning grid mockup */}
      <div style={{flex: 1, display: 'flex', justifyContent: 'center', opacity: mockOp, transform: `scale(${mockScale})`}}>
        <div style={{width: 680, background: '#1e293b', borderRadius: 20, overflow: 'hidden', boxShadow: '0 30px 100px rgba(0,0,0,0.5)'}}>
          {/* Browser bar */}
          <div style={{height: 40, background: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px'}}>
            {['#ef4444', '#eab308', '#22c55e'].map((c) => (
              <div key={c} style={{width: 11, height: 11, borderRadius: '50%', background: c}} />
            ))}
            <div style={{marginLeft: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 7, padding: '4px 14px', fontSize: 11, color: 'rgba(255,255,255,0.3)', flex: 1, fontFamily: 'Inter, sans-serif'}}>
              gestion-rh-five.vercel.app/planning
            </div>
          </div>
          {/* Planning grid */}
          <div style={{background: '#f8fafc', padding: 14}}>
            {/* Header */}
            <div style={{display: 'flex'}}>
              <div style={{width: 90, padding: '8px 0', fontSize: 10, fontWeight: 700, color: '#64748b', textAlign: 'center', background: 'white', border: '1px solid #e2e8f0', fontFamily: 'Inter, sans-serif'}}>Employé</div>
              {days.map((d) => (
                <div key={d} style={{flex: 1, padding: '8px 0', fontSize: 10, fontWeight: 700, color: '#64748b', textAlign: 'center', background: 'white', border: '1px solid #e2e8f0', fontFamily: 'Inter, sans-serif'}}>{d}</div>
              ))}
            </div>
            {/* Rows */}
            {employees.map((emp, ri) => {
              const rowDelay = 50 + ri * 8;
              const rowOp = interpolate(frame - rowDelay, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
              return (
                <div key={emp.name} style={{display: 'flex', opacity: rowOp}}>
                  <div style={{width: 90, padding: '10px 8px', fontSize: 10, fontWeight: 600, color: '#334155', background: 'white', border: '1px solid #e2e8f0', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden'}}>{emp.name}</div>
                  {emp.shifts.map((s, ci) => (
                    <div key={ci} style={{flex: 1, height: 38, border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2}}>
                      <div style={{width: '90%', height: '72%', borderRadius: 5, fontSize: 8, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.color, fontFamily: 'Inter, sans-serif'}}>{s.text}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
