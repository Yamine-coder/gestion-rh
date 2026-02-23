import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, baseStyle} from '../theme';
import {FadeIn, Glow} from '../components/Animations';

interface AnomalyRowProps {
  severity: 'CRITIQUE' | 'ATTENTION' | 'INFO';
  color: string;
  bgColor: string;
  borderColor: string;
  title: string;
  detail: string;
  badge: string;
  delay: number;
}

const AnomalyRow: React.FC<AnomalyRowProps> = ({severity, color, bgColor, borderColor, title, detail, badge, delay}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame - delay, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const x = interpolate(frame - delay, [0, 12], [20, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div style={{
      background: 'white', borderRadius: 10, padding: '14px 16px', marginBottom: 8,
      borderLeft: `4px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      opacity: op, transform: `translateX(${x}px)`, fontFamily: 'Inter, sans-serif',
    }}>
      <div>
        <div style={{fontSize: 10, fontWeight: 700, color: borderColor}}>{severity}</div>
        <div style={{fontSize: 12, color: '#334155', fontWeight: 600, marginTop: 2}}>{title}</div>
        <div style={{fontSize: 10, color: '#94a3b8', marginTop: 1}}>{detail}</div>
      </div>
      <div style={{fontSize: 10, background: bgColor, color, padding: '4px 12px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap'}}>
        {badge}
      </div>
    </div>
  );
};

export const AnomaliesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const mockScale = spring({frame: frame - 20, fps, config: {damping: 14, stiffness: 60}});
  const mockOp = interpolate(frame - 20, [0, 15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div style={{
      ...baseStyle, display: 'flex', alignItems: 'center',
      background: 'linear-gradient(135deg, #1a1a2e, #0f172a)', padding: '0 80px', gap: 60,
    }}>
      <Glow x={1300} y={600} size={500} color="rgba(239,68,68,0.05)" />

      {/* Left */}
      <div style={{flex: 1, maxWidth: '40%'}}>
        <FadeIn delay={0}>
          <p style={{fontSize: 14, fontWeight: 700, color: COLORS.primary, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 18, fontFamily: 'Inter, sans-serif'}}>Anomalies</p>
        </FadeIn>
        <FadeIn delay={10}>
          <h2 style={{fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, background: 'linear-gradient(135deg, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'Inter, sans-serif'}}>
            Détection<br />automatique
          </h2>
        </FadeIn>
        <FadeIn delay={20}>
          <p style={{fontSize: 18, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', marginBottom: 36, fontFamily: 'Inter, sans-serif'}}>
            Le système détecte les anomalies et les classe par gravité. Le manager valide ou corrige en un clic.
          </p>
        </FadeIn>
        {[
          {icon: '🔴', text: 'Absences non justifiées', d: 35},
          {icon: '🟡', text: 'Retards / Départs anticipés', d: 45},
          {icon: '🟠', text: 'Pointage hors planning', d: 55},
          {icon: '⏰', text: 'Heures supplémentaires à valider', d: 65},
          {icon: '✅', text: 'Validation managériale en 1 clic', d: 75},
        ].map(({icon, text, d}) => (
          <FadeIn key={text} delay={d} direction="left" distance={25}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, fontFamily: 'Inter, sans-serif'}}>
              <div style={{width: 44, height: 44, background: 'rgba(207,41,44,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0}}>{icon}</div>
              <span style={{fontSize: 18, color: 'rgba(255,255,255,0.8)', fontWeight: 500}}>{text}</span>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Right mockup */}
      <div style={{flex: 1, display: 'flex', justifyContent: 'center', opacity: mockOp, transform: `scale(${mockScale})`}}>
        <div style={{width: 560, background: '#1e293b', borderRadius: 20, overflow: 'hidden', boxShadow: '0 30px 100px rgba(0,0,0,0.5)'}}>
          <div style={{height: 40, background: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px'}}>
            {['#ef4444', '#eab308', '#22c55e'].map((c) => (
              <div key={c} style={{width: 11, height: 11, borderRadius: '50%', background: c}} />
            ))}
            <div style={{marginLeft: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 7, padding: '4px 14px', fontSize: 11, color: 'rgba(255,255,255,0.3)', flex: 1, fontFamily: 'Inter, sans-serif'}}>
              gestion-rh-five.vercel.app/anomalies
            </div>
          </div>
          <div style={{background: '#f1f5f9', padding: 18}}>
            <div style={{fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 14, fontFamily: 'Inter, sans-serif'}}>
              5 anomalies en attente
            </div>
            <AnomalyRow severity="CRITIQUE" borderColor="#ef4444" color="#ef4444" bgColor="#fef2f2" title="Absence totale - R. Haque" detail="17/02 • Shift 9h-14h / 18h-22h" badge="À traiter" delay={50} />
            <AnomalyRow severity="ATTENTION" borderColor="#f97316" color="#f97316" bgColor="#fff7ed" title="Extra potentiel - M. Alam (+1h15)" detail="18/02 • Départ 00:15 au lieu de 23:00" badge="À valider" delay={60} />
            <AnomalyRow severity="INFO" borderColor="#eab308" color="#ca8a04" bgColor="#fefce8" title="Missing OUT - S. Marquez" detail="18/02 • Entrée 18:38 sans sortie" badge="À vérifier" delay={70} />
            <AnomalyRow severity="ATTENTION" borderColor="#f97316" color="#f97316" bgColor="#fff7ed" title="Retard - A. Fandino (+22 min)" detail="19/02 • Arrivée 18:22 au lieu de 18:00" badge="À valider" delay={80} />
          </div>
        </div>
      </div>
    </div>
  );
};
