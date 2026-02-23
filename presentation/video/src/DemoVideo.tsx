import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {SCENE_FRAMES, TOTAL_FRAMES, VIDEO} from './theme';
import {ProgressBar} from './components/Animations';
import {IntroScene} from './scenes/IntroScene';
import {ProblemScene} from './scenes/ProblemScene';
import {DashboardScene} from './scenes/DashboardScene';
import {PlanningScene} from './scenes/PlanningScene';
import {PointageScene} from './scenes/PointageScene';
import {AnomaliesScene} from './scenes/AnomaliesScene';
import {RapportsScene} from './scenes/RapportsScene';
import {FeaturesScene} from './scenes/FeaturesScene';
import {TechStackScene} from './scenes/TechStackScene';
import {OutroScene} from './scenes/OutroScene';

// ═══ TRANSITION WRAPPER ═══
const SceneTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
}> = ({children, durationInFrames}) => {
  const frame = useCurrentFrame();
  const fadeIn = Math.min(1, frame / 15);
  const fadeOut = Math.min(1, (durationInFrames - frame) / 15);
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{opacity}}>
      {children}
    </AbsoluteFill>
  );
};

export const DemoVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = frame / TOTAL_FRAMES;

  // Calculate scene offsets
  const scenes = [
    {Component: IntroScene, duration: SCENE_FRAMES.intro},
    {Component: ProblemScene, duration: SCENE_FRAMES.problem},
    {Component: DashboardScene, duration: SCENE_FRAMES.dashboard},
    {Component: PlanningScene, duration: SCENE_FRAMES.planning},
    {Component: PointageScene, duration: SCENE_FRAMES.pointage},
    {Component: AnomaliesScene, duration: SCENE_FRAMES.anomalies},
    {Component: RapportsScene, duration: SCENE_FRAMES.rapports},
    {Component: FeaturesScene, duration: SCENE_FRAMES.features},
    {Component: TechStackScene, duration: SCENE_FRAMES.techStack},
    {Component: OutroScene, duration: SCENE_FRAMES.outro},
  ];

  let offset = 0;

  return (
    <AbsoluteFill style={{background: '#1a1a2e'}}>
      {scenes.map(({Component, duration}, i) => {
        const from = offset;
        offset += duration;
        return (
          <Sequence key={i} from={from} durationInFrames={duration}>
            <SceneTransition durationInFrames={duration}>
              <Component />
            </SceneTransition>
          </Sequence>
        );
      })}

      {/* Global progress bar */}
      <ProgressBar progress={progress} />
    </AbsoluteFill>
  );
};
