import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, baseStyle} from '../theme';
import {FadeIn, Glow} from '../components/Animations';

const KPI: React.FC<{label: string; value: string; color: string; sub: string; subColor: string}> = ({
  label, value, color, sub, subColor,
}) => (
  <div
    style={{
      background: 'white',
      borderRadius: 14,
      padding: '18px 16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      fontFamily: 'Inter, sans-serif',
    }}
  >
    <div style={{fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase'}}>{label}</div>
    <div style={{fontSize: 36, fontWeight: 800, color, marginTop: 4}}>{value}</div>
    <div style={{fontSize: 11, color: subColor, fontWeight: 600, marginTop: 2}}>{sub}</div>
  </div>
);

const FeatureItem: React.FC<{icon: string; text: string; delay: number}> = ({icon, text, delay}) => (
  <FadeIn delay={delay} direction="left" distance={25}>
    <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, fontFamily: 'Inter, sans-serif'}}>
      <div
        style={{
          width: 44,
          height: 44,
          background: 'rgba(207,41,44,0.12)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <span style={{fontSize: 18, color: 'rgba(255,255,255,0.8)', fontWeight: 500}}>{text}</span>
    </div>
  </FadeIn>
);

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const mockScale = spring({frame: frame - 20, fps, config: {damping: 14, stiffness: 60}});
  const mockOpacity = interpolate(frame - 20, [0, 15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Animated bar heights
  const barHeights = [55, 80, 40, 88, 65, 92, 50].map((h, i) => {
    const barGrow = interpolate(frame - 60 - i * 4, [0, 20], [0, h], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return barGrow;
  });

  return (
    <div
      style={{
        ...baseStyle,
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a1a2e, #0f172a)',
        padding: '0 80px',
        gap: 70,
      }}
    >
      <Glow x={-200} y={600} size={500} />

      {/* Left text */}
      <div style={{flex: 1, maxWidth: '42%'}}>
        <FadeIn delay={0}>
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: COLORS.primary,
              letterSpacing: 4,
              textTransform: 'uppercase',
              marginBottom: 18,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Dashboard Manager
          </p>
        </FadeIn>
        <FadeIn delay={10}>
          <h2
            style={{
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: 24,
              background: 'linear-gradient(135deg, #fff, #cbd5e1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Tout voir
            <br />
            en un coup d'œil
          </h2>
        </FadeIn>
        <FadeIn delay={20}>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.55)',
              marginBottom: 36,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Le tableau de bord centralise les KPIs essentiels, alertes du jour et actions à mener.
          </p>
        </FadeIn>
        <FeatureItem icon="📊" text="KPIs temps réel (présents, retards)" delay={35} />
        <FeatureItem icon="🔔" text="Alertes et anomalies prioritaires" delay={45} />
        <FeatureItem icon="📝" text="Consignes d'équipe avec rappels" delay={55} />
        <FeatureItem icon="⭐" text="Widget Avis Google intégré" delay={65} />
      </div>

      {/* Right mockup */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          opacity: mockOpacity,
          transform: `scale(${mockScale})`,
        }}
      >
        <div
          style={{
            width: 620,
            background: '#1e293b',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 30px 100px rgba(0,0,0,0.5)',
          }}
        >
          {/* Browser bar */}
          <div
            style={{
              height: 44,
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 16px',
            }}
          >
            {['#ef4444', '#eab308', '#22c55e'].map((c) => (
              <div key={c} style={{width: 12, height: 12, borderRadius: '50%', background: c}} />
            ))}
            <div
              style={{
                marginLeft: 14,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                padding: '5px 16px',
                fontSize: 12,
                color: 'rgba(255,255,255,0.3)',
                flex: 1,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              gestion-rh-five.vercel.app
            </div>
          </div>

          {/* Dashboard content */}
          <div style={{background: '#f1f5f9', padding: 20}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14}}>
              <KPI label="Présents" value="18" color="#22c55e" sub="/ 22 prévus" subColor="#22c55e" />
              <KPI label="Retards" value="3" color="#f97316" sub="+1 vs hier" subColor="#f97316" />
              <KPI label="Anomalies" value="5" color={COLORS.primary} sub="2 critiques" subColor={COLORS.primary} />
            </div>
            <div
              style={{
                background: 'white',
                borderRadius: 14,
                padding: 20,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 10,
                height: 140,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {barHeights.map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: `linear-gradient(to top, ${COLORS.primary}, #ff6b6b)`,
                    borderRadius: '8px 8px 0 0',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
